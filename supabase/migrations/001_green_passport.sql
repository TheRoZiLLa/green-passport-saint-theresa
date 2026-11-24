-- Apply to the new green-passport-db project, never the original database.
begin;

create table if not exists public.gp_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  first_name text not null default '',
  last_name text not null default '',
  class_name text not null default '',
  student_id text unique,
  household_name text not null default '',
  role text not null default 'student' check (role in ('student','parent','teacher','admin','leader')),
  approved boolean not null default false,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.gp_records (
  row_id bigint generated always as identity primary key,
  id text not null unique default gen_random_uuid()::text,
  kind text not null check (kind in ('waste','score','post','comment','chat','exp','export')),
  owner_id uuid not null references public.gp_profiles(id) on delete cascade,
  room_id text,
  parent_id text references public.gp_records(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','published','hidden','reported')),
  created_at timestamptz not null default now(),
  data jsonb not null check (jsonb_typeof(data) = 'object')
);
create index if not exists gp_records_kind_created on public.gp_records(kind, created_at desc);
create index if not exists gp_records_owner on public.gp_records(owner_id, kind);
create index if not exists gp_records_room_created on public.gp_records(room_id, created_at desc) where kind = 'chat';
create unique index if not exists gp_one_score_per_user on public.gp_records(owner_id) where kind = 'score';
create unique index if not exists gp_exp_once on public.gp_records(owner_id,(data->>'ActivityType'),(data->>'RelatedID')) where kind='exp';
create table if not exists public.gp_likes (
  post_id text references public.gp_records(id) on delete cascade,
  user_id uuid references public.gp_profiles(id) on delete cascade,
  primary key(post_id,user_id)
);
-- Realtime notifications contain no message text or student information.
create table if not exists public.gp_chat_events (
  id bigint generated always as identity primary key,
  room_id text not null,
  changed_at timestamptz not null default now()
);

alter table public.gp_profiles enable row level security;
alter table public.gp_records enable row level security;
alter table public.gp_likes enable row level security;
alter table public.gp_chat_events enable row level security;
revoke all on public.gp_profiles, public.gp_records, public.gp_likes, public.gp_chat_events from anon, authenticated;

create or replace function public.gp_is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.gp_profiles where id=auth.uid() and approved and role in ('teacher','admin'));
$$;
create or replace function public.gp_is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.gp_profiles where id=auth.uid() and approved);
$$;
create or replace function public.gp_room_access(room text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.gp_profiles p where p.id=auth.uid() and p.approved and
    (room='CR-MISSION-01' or (room='CR-CLASS-01' and (p.class_name='ม.1/1' or p.role in ('teacher','admin'))) or
      (room='CR-TEACHER-01' and p.role in ('teacher','admin'))));
$$;
grant select on public.gp_chat_events to authenticated;
drop policy if exists gp_chat_events_room on public.gp_chat_events;
create policy gp_chat_events_room on public.gp_chat_events for select to authenticated using (public.gp_room_access(room_id));

create or replace function public.gp_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data,'{}');
begin
  insert into public.gp_profiles (id, username, display_name, first_name, last_name, class_name, student_id, household_name, role, consent)
  values (new.id, lower(left(coalesce(nullif(m->>'username',''),new.id::text),80)), left(coalesce(nullif(m->>'display_name',''),'Green User'),100),
    left(coalesce(m->>'first_name',''),80), left(coalesce(m->>'last_name',''),80), left(coalesce(m->>'class_name',''),30),
    nullif(left(coalesce(m->>'student_id',''),40),''), left(coalesce(m->>'household_name',''),100),
    case when m->>'role'='parent' then 'parent' else 'student' end, coalesce(m->>'consent','false')='true');
  return new;
end;
$$;
drop trigger if exists gp_on_auth_user on auth.users;
create trigger gp_on_auth_user after insert on auth.users for each row execute function public.gp_new_user();

create or replace function public.gp_chat_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='DELETE' then
    if old.kind='chat' then insert into public.gp_chat_events(room_id) values(old.room_id); end if;
    return old;
  end if;
  if new.kind='chat' then insert into public.gp_chat_events(room_id) values(new.room_id); end if;
  return new;
end;
$$;
drop trigger if exists gp_chat_changes on public.gp_records;
create trigger gp_chat_changes after insert or update or delete on public.gp_records for each row execute function public.gp_chat_changed();
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='gp_chat_events') then
    alter publication supabase_realtime add table public.gp_chat_events;
  end if;
end $$;

-- Private uploads are scoped to their owner; chat files also require room access.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('gp-evidence','gp-evidence',false,5242880,array['image/jpeg','image/png','image/webp']),
       ('gp-chat','gp-chat',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists gp_upload on storage.objects;
create policy gp_upload on storage.objects for insert to authenticated with check (
  public.gp_is_member() and bucket_id in ('gp-evidence','gp-chat') and (storage.foldername(name))[1]=auth.uid()::text and
  (bucket_id='gp-evidence' or public.gp_room_access((storage.foldername(name))[2])));
drop policy if exists gp_download on storage.objects;
create policy gp_download on storage.objects for select to authenticated using (
  (bucket_id='gp-evidence' and public.gp_is_member() and ((storage.foldername(name))[1]=auth.uid()::text or public.gp_is_staff())) or
  (bucket_id='gp-chat' and public.gp_room_access((storage.foldername(name))[2])));

create or replace function public.gp_award(who uuid, activity text, related text, points integer) returns void
language sql security definer set search_path='' as $$
  insert into public.gp_records(kind,owner_id,status,data)
  values('exp',who,'published',jsonb_build_object('LogID',gen_random_uuid(),'Timestamp',now(),'UserID',who,'ActivityType',activity,'RelatedID',related,'EXPAmount',points))
  on conflict do nothing;
$$;

create or replace function public.gp_action(action text, payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.gp_profiles%rowtype; r public.gp_records%rowtype; v jsonb; result jsonb;
  actor uuid := auth.uid(); staff boolean; k text; ident text; room text; par text; stat text; ts text := now()::text;
  factors jsonb := '{"PaperKg":0.92,"PlasticBottleKg":1.45,"CanKg":1.02,"AluminumKg":9.13,"SteelCanKg":1.8,"ScrapIronKg":1.7,"GlassBottleKg":0.31,"CompostFoodKg":0.25,"BioExtractKg":0.2,"FeedAnimalsKg":0.18,"ReducePlasticBagTimes":0.03,"CarryBottleTimes":0.05,"UseLunchBoxTimes":0.08,"RefuseStrawTimes":0.01,"CarryClothBagTimes":0.04,"RepairItemsTimes":1.2,"DonateItemsTimes":0.8,"DisposeBatteriesAmount":0.02,"DisposeBulbsAmount":0.04,"DisposeExpiredMedicineAmount":0.03}';
  total numeric := 0; amount numeric; field text; factor text; i int; total_stars int := 0; stars int;
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

revoke all on function public.gp_action(text,jsonb) from public, anon;
revoke all on function public.gp_award(uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.gp_action(text,jsonb) to authenticated;
revoke all on function public.gp_is_staff(), public.gp_is_member(), public.gp_room_access(text), public.gp_new_user(), public.gp_chat_changed() from public, anon;
grant execute on function public.gp_is_staff(), public.gp_is_member(), public.gp_room_access(text) to authenticated;
commit;
