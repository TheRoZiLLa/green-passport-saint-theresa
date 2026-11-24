-- Allow approved record owners to update or delete their own waste records.
begin;

drop policy if exists gp_delete_evidence on storage.objects;
create policy gp_delete_evidence on storage.objects for delete to authenticated using (
  bucket_id = 'gp-evidence' and public.gp_is_member() and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.gp_action(action text, payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.gp_profiles%rowtype; r public.gp_records%rowtype; v jsonb; result jsonb;
  actor uuid := auth.uid(); staff boolean; k text; ident text; room text; par text; stat text; ts text := now()::text;
  factors jsonb := '{"PaperKg":0.92,"PlasticBottleKg":1.45,"CanKg":1.02,"AluminumKg":9.13,"SteelCanKg":1.8,"ScrapIronKg":1.7,"GlassBottleKg":0.31,"CompostFoodKg":0.25,"BioExtractKg":0.2,"FeedAnimalsKg":0.18,"ReducePlasticBagTimes":0.03,"CarryBottleTimes":0.05,"UseLunchBoxTimes":0.08,"RefuseStrawTimes":0.01,"CarryClothBagTimes":0.04,"RepairItemsTimes":1.2,"DonateItemsTimes":0.8,"DisposeBatteriesAmount":0.02,"DisposeBulbsAmount":0.04,"DisposeExpiredMedicineAmount":0.03}';
  total numeric := 0; amount numeric; field text; factor text; i int; total_stars int := 0; stars int;
  ev_paths jsonb; ev_names text; target_id text; target_row bigint;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload) is distinct from 'object' or length(payload::text)>100000 then raise exception 'Invalid request'; end if;
  select * into p from public.gp_profiles where id=actor;
  if not found then raise exception 'Profile missing'; end if;
  if not p.approved then raise exception 'บัญชีอยู่ระหว่างรอการอนุมัติจากโรงเรียน'; end if;
  staff := p.role in ('teacher','admin');
  if action='me' then
    return jsonb_build_object('user',jsonb_build_object('UserID',p.id,'Username',p.username,'DisplayName',p.display_name,'FirstName',p.first_name,'LastName',p.last_name,'ClassName',p.class_name,'StudentID',p.student_id,'HouseholdName',p.household_name,'Role',p.role,'ConsentStatus',case when p.consent then 'ยินยอม' else '' end));
  elsif action='adminLogin' then
    return jsonb_build_object('ok',staff);
  elsif action='getBootstrapData' then
    select jsonb_build_object(
      'wasteRecords',coalesce((select jsonb_agg(data||jsonb_build_object('_rowNumber',row_id) order by created_at desc) from public.gp_records where kind='waste' and (owner_id=actor or staff)),'[]'),
      'gameScores',coalesce((select jsonb_agg(case when owner_id=actor or staff then data else data-'StudentID'-'FirstName'-'LastName' end order by created_at desc) from public.gp_records where kind='score'),'[]'),
      'communityPosts',coalesce((select jsonb_agg(data order by created_at desc) from public.gp_records where kind='post' and (status='published' or owner_id=actor or staff)),'[]'),
      'postComments',coalesce((select jsonb_agg(c.data order by c.created_at) from public.gp_records c join public.gp_records post on post.id=c.parent_id where c.kind='comment' and (staff or (post.status='published' and (c.status='published' or c.owner_id=actor)))),'[]'),
      'chatMessages',case when staff then coalesce((select jsonb_agg(data order by created_at desc) from (select data,created_at from public.gp_records where kind='chat' order by created_at desc limit 300)t),'[]') else '[]'::jsonb end,
      'userProfiles',coalesce((select jsonb_agg(jsonb_build_object('UserID',id,'DisplayName',display_name,'ClassName',class_name,'Role',case when role in ('teacher','admin') then role else 'student' end)) from public.gp_profiles where approved),'[]'),
      'expLogs',coalesce((select jsonb_agg(data order by created_at desc) from public.gp_records where kind='exp' and (owner_id=actor or staff)),'[]')) into result;
    return result;
  elsif action='pendingMembers' then
    if p.role<>'admin' then raise exception 'Admin access required'; end if;
    return jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('id',id,'username',username,'displayName',display_name,'className',class_name,'studentId',student_id)) from public.gp_profiles where not approved),'[]'));
  elsif action='approveMember' then
    if p.role<>'admin' then raise exception 'Admin access required'; end if;
    update public.gp_profiles set approved=true where id=(payload->>'id')::uuid and not approved;
    return jsonb_build_object('ok',true);
  elsif action='chatHistory' then
    room := payload->>'roomId';
    if not public.gp_room_access(room) then raise exception 'Room not available'; end if;
    return jsonb_build_object('messages',coalesce((select jsonb_agg(t.data order by t.created_at) from (select data,created_at from public.gp_records where kind='chat' and room_id=room and (status='published' or staff) order by created_at desc limit 100) t),'[]'));
  elsif action='appendWasteRecord' then
    v := payload->'record'; k := 'waste'; stat := 'pending'; ident := 'WR-'||gen_random_uuid()::text;
    if not p.consent or jsonb_typeof(v->'EvidencePaths') is distinct from 'array' or jsonb_array_length(v->'EvidencePaths') < 1 then raise exception 'Evidence and consent required'; end if;
    if exists(select 1 from jsonb_array_elements_text(v->'EvidencePaths') x(path) where not exists(select 1 from storage.objects s where s.bucket_id='gp-evidence' and s.name=x.path and split_part(s.name,'/',1)=actor::text)) then raise exception 'Invalid evidence'; end if;
    if coalesce(v->>'ReportMonth','') !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid report month'; end if;
    for field,factor in select key,value from jsonb_each_text(factors) loop
      amount := coalesce(nullif(v->>field,'')::numeric,0);
      if amount<0 or amount>100000 then raise exception 'Invalid quantity'; end if;
      total := total + amount * factor::numeric;
    end loop;
    foreach field in array array['GeneralWasteKg','RecycleWasteKg','OrganicWasteKg','HazardousWasteAmount'] loop
      amount:=coalesce(nullif(v->>field,'')::numeric,0);
      if amount<0 or amount>100000 then raise exception 'Invalid quantity'; end if;
    end loop;
    v := (v-'EvidenceFiles'-'TeacherComment'-'ReviewedBy'-'ReviewedAt'-'EvidenceFolderLink') || jsonb_build_object('UserID',actor,'StudentName',p.display_name,'StudentID',p.student_id,'ClassName',p.class_name,'HouseholdName',p.household_name,'RecordID',ident,'SubmittedAt',ts,'ReviewStatus','รอตรวจสอบ','TotalCO2e',round(total,2),'ConsentStatus','ยินยอม');
  elsif action='updateWasteRecord' then
    if not p.consent then raise exception 'Consent required'; end if;
    target_id := nullif(trim(coalesce(payload->>'recordId','')), '');
    target_row := nullif(trim(coalesce(payload->>'row','')), '')::bigint;
    select * into r from public.gp_records
    where kind='waste' and owner_id=actor
      and ((target_id is not null and id=target_id) or (target_row is not null and row_id=target_row))
    limit 1;
    if not found then raise exception 'ไม่พบรายการบันทึกขยะหรือไม่มีสิทธิ์แก้ไข'; end if;
    v := payload->'record';
    if jsonb_typeof(v) is distinct from 'object' then raise exception 'Invalid request'; end if;
    if coalesce(v->>'ReportMonth','') !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid report month'; end if;
    if jsonb_typeof(v->'EvidencePaths') = 'array' and jsonb_array_length(v->'EvidencePaths') >= 1 then
      if jsonb_array_length(v->'EvidencePaths') > 5 then raise exception 'แนบรูปหลักฐานได้ไม่เกิน 5 รูป'; end if;
      if exists(select 1 from jsonb_array_elements_text(v->'EvidencePaths') x(path) where not exists(select 1 from storage.objects s where s.bucket_id='gp-evidence' and s.name=x.path and split_part(s.name,'/',1)=actor::text)) then raise exception 'Invalid evidence'; end if;
      ev_paths := v->'EvidencePaths';
      ev_names := coalesce(nullif(v->>'EvidenceFileNames',''), r.data->>'EvidenceFileNames', '');
    else
      ev_paths := r.data->'EvidencePaths';
      ev_names := coalesce(r.data->>'EvidenceFileNames', '');
    end if;
    if jsonb_typeof(ev_paths) is distinct from 'array' or jsonb_array_length(ev_paths) < 1 then raise exception 'Evidence required'; end if;
    for field,factor in select key,value from jsonb_each_text(factors) loop
      amount := coalesce(nullif(v->>field,'')::numeric,0);
      if amount<0 or amount>100000 then raise exception 'Invalid quantity'; end if;
      total := total + amount * factor::numeric;
    end loop;
    foreach field in array array['GeneralWasteKg','RecycleWasteKg','OrganicWasteKg','HazardousWasteAmount'] loop
      amount := coalesce(nullif(v->>field,'')::numeric,0);
      if amount<0 or amount>100000 then raise exception 'Invalid quantity'; end if;
    end loop;
    v := (v-'EvidenceFiles'-'TeacherComment'-'ReviewedBy'-'ReviewedAt'-'EvidenceFolderLink') || jsonb_build_object(
      'UserID',actor,
      'StudentName',p.display_name,
      'StudentID',p.student_id,
      'ClassName',p.class_name,
      'HouseholdName',p.household_name,
      'RecordID',r.id,
      'SubmittedAt',coalesce(r.data->>'SubmittedAt',ts),
      'UpdatedAt',ts,
      'EvidencePaths',ev_paths,
      'EvidenceFileNames',ev_names,
      'ReviewStatus','รอตรวจสอบ',
      'TotalCO2e',round(total,2),
      'ConsentStatus','ยินยอม'
    );
    update public.gp_records
    set status='pending', data=v
    where id=r.id and owner_id=actor and kind='waste'
    returning * into r;
    return jsonb_build_object('ok',true,'record',r.data||jsonb_build_object('_rowNumber',r.row_id),'totalCO2e',round(total,2));
  elsif action='deleteWasteRecord' then
    target_id := nullif(trim(coalesce(payload->>'recordId','')), '');
    target_row := nullif(trim(coalesce(payload->>'row','')), '')::bigint;
    delete from public.gp_records
    where kind='waste' and owner_id=actor
      and ((target_id is not null and id=target_id) or (target_row is not null and row_id=target_row))
    returning * into r;
    if not found then raise exception 'ไม่พบรายการบันทึกขยะหรือไม่มีสิทธิ์ลบ'; end if;
    delete from public.gp_records where kind='exp' and owner_id=actor and data->>'ActivityType'='waste-submission' and data->>'RelatedID'=r.id;
    return jsonb_build_object('ok',true,'deletedId',r.id,'row',r.row_id);
  elsif action='appendGameScore' then
    v := payload->'score'; k := 'score'; stat := 'published'; ident:= 'GS-'||gen_random_uuid()::text;
    for i in 1..9 loop
      amount := coalesce((v->>('Stage'||i||'Score'))::numeric,0); stars := coalesce((v->>('Stage'||i||'Stars'))::int,0);
      if amount<0 or amount>100 or stars<0 or stars>3 then raise exception 'Invalid stage score'; end if;
      total:=total+amount; total_stars:=total_stars+stars;
    end loop;
    v:=v||jsonb_build_object('ScoreID',ident,'SavedAt',ts,'UserID',actor,'FullName',p.display_name,'FirstName',p.first_name,'LastName',p.last_name,'StudentID',p.student_id,'ClassName',p.class_name,'TotalScore',total,'TotalStars',total_stars);
  elsif action='appendCommunityPost' then
    v:=payload->'post'; k:='post'; stat:='pending'; ident:='CP-'||gen_random_uuid()::text;
    if length(trim(coalesce(v->>'PostContent',''))) not between 20 and 5000 then raise exception 'Invalid post content'; end if;
    v:=(v-'ApprovedBy'-'ApprovedAt'-'TeacherComment')||jsonb_build_object('PostID',ident,'Timestamp',ts,'UserID',actor,'DisplayName',p.display_name,'ClassName',p.class_name,'Likes',0,'CommentCount',0,'ReviewStatus','รอตรวจสอบ');
  elsif action='appendPostComment' then
    v:=payload->'comment'; k:='comment'; stat:='pending'; ident:='CM-'||gen_random_uuid()::text; par:=v->>'PostID';
    if not exists(select 1 from public.gp_records where id=par and kind='post' and status='published') then raise exception 'Post not available'; end if;
    if length(trim(coalesce(v->>'CommentText',''))) not between 1 and 2000 then raise exception 'Invalid comment'; end if;
    v:=v||jsonb_build_object('CommentID',ident,'Timestamp',ts,'UserID',actor,'DisplayName',p.display_name,'ClassName',p.class_name,'ReviewStatus','รอตรวจสอบ','LikeCount',0,'ReportStatus','');
  elsif action='appendChatMessage' then
    v:=payload->'message'; k:='chat'; stat:='published'; ident:='MSG-'||gen_random_uuid()::text; room:=v->>'ChatRoomID';
    if not public.gp_room_access(room) then raise exception 'Room not available'; end if;
    if length(coalesce(v->>'MessageText',''))>500 or (length(trim(coalesce(v->>'MessageText','')))=0 and coalesce(v->>'ImagePath','')='') then raise exception 'Invalid message'; end if;
    if coalesce(v->>'ImagePath','')<>'' and not exists(select 1 from storage.objects s where s.bucket_id='gp-chat' and s.name=v->>'ImagePath' and split_part(s.name,'/',1)=actor::text and split_part(s.name,'/',2)=room) then raise exception 'Invalid chat attachment'; end if;
    v:=(v-'ImageLink')||jsonb_build_object('MessageID',ident,'Timestamp',ts,'UserID',actor,'DisplayName',p.display_name,'ClassName',p.class_name,'ModerationStatus','ปกติ','ReportStatus','','IsPinned',false);
  elsif action='sendCommunityLike' then
    ident:=payload->>'postId';
    if not exists(select 1 from public.gp_records where id=ident and kind='post' and status='published') then raise exception 'Post not available'; end if;
    insert into public.gp_likes values(ident,actor) on conflict do nothing;
    update public.gp_records set data=data||jsonb_build_object('Likes',(select count(*) from public.gp_likes where post_id=ident)) where id=ident returning * into r;
    return jsonb_build_object('ok',true,'post',r.data);
  elsif action='reportChatMessage' then
    update public.gp_records set status='reported',data=data||jsonb_build_object('ReportStatus','รอตรวจสอบ','ModerationStatus','รอตรวจสอบ') where id=payload->>'messageId' and kind='chat' and status='published' and public.gp_room_access(room_id);
    return jsonb_build_object('ok',true);
  elsif action in ('updateReview','updateCommunityPostReview','updatePostCommentReview','updateChatMessageModeration') then
    if not staff then raise exception 'Staff access required'; end if;
    stat:=case when coalesce(payload->>'status',payload->>'moderationStatus') in ('อนุมัติ','ผ่านการตรวจสอบ','ปกติ','เผยแพร่','เผยแพร่แล้ว','ตรวจสอบแล้ว','ปักหมุด') then 'published' when coalesce(payload->>'status',payload->>'moderationStatus') in ('ซ่อน','ไม่อนุมัติ','ลบ') then 'hidden' else 'pending' end;
    if action='updateReview' then update public.gp_records set status=stat,data=data||jsonb_build_object('ReviewStatus',payload->>'status','TeacherComment',coalesce(payload->>'comment',''),'ReviewedBy',p.display_name,'ReviewedAt',ts) where row_id=(payload->>'row')::bigint and kind='waste';
    elsif action='updateCommunityPostReview' then update public.gp_records set status=stat,data=data||jsonb_build_object('ReviewStatus',payload->>'status','TeacherComment',coalesce(payload->>'comment',''),'ApprovedBy',p.display_name,'ApprovedAt',ts) where id=payload->>'postId' and kind='post' returning * into r;
      if found and stat='published' then perform public.gp_award(r.owner_id,'community-approved',r.id,40); end if;
    elsif action='updatePostCommentReview' then update public.gp_records set status=stat,data=data||jsonb_build_object('ReviewStatus',payload->>'status','ReportStatus',coalesce(payload->>'reportStatus','')) where id=payload->>'commentId' and kind='comment';
    else update public.gp_records set status=stat,data=data||jsonb_build_object('ModerationStatus',payload->>'moderationStatus','ReportStatus',coalesce(payload->>'reportStatus',''),'IsPinned',coalesce((payload->>'isPinned')::boolean,false)) where id=payload->>'messageId' and kind='chat'; end if;
    return jsonb_build_object('ok',true);
  elsif action='logExportReport' then
    if not staff then raise exception 'Staff access required'; end if;
    k:='export'; stat:='published'; ident:='EX-'||gen_random_uuid()::text; v:=payload||jsonb_build_object('ExportedAt',ts,'ExportedBy',p.display_name);
  else raise exception 'Unknown action'; end if;

  if k='score' then
    delete from public.gp_records where owner_id=actor and kind='score';
  end if;
  insert into public.gp_records(id,kind,owner_id,room_id,parent_id,status,data) values(ident,k,actor,room,par,stat,v) returning * into r;
  if k='waste' then perform public.gp_award(actor,'waste-submission',ident,20); end if;
  if k='score' and total>0 then perform public.gp_award(actor,'game-completion','trash-hero-academy',30); end if;
  return jsonb_build_object('ok',true,case k when 'waste' then 'record' when 'score' then 'score' when 'post' then 'post' when 'comment' then 'comment' when 'chat' then 'message' else 'entry' end,r.data||jsonb_build_object('_rowNumber',r.row_id),'totalCO2e',case when k='waste' then round(total,2) else 0 end);
end;
$$;

commit;
