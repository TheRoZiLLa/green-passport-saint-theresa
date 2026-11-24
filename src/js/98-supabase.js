// Supabase runtime: legacy action names are translated to authenticated RPCs.
let gpClient = null, gpChannel = null, gpRoom = null, gpRefreshTimer = null;

async function gpCall(action, payload = {}) {
  if (!gpClient) throw new Error('Supabase ยังไม่พร้อม');
  const { data, error } = await gpClient.rpc('gp_action', { action, payload });
  if (error) throw new Error(error.message);
  if (data?.ok === false) throw new Error('ไม่มีสิทธิ์ดำเนินการ');
  return data;
}

async function gpUpload(bucket, file, room = '') {
  const { data: { user }, error } = await gpClient.auth.getUser();
  if (error || !user) throw new Error('กรุณาเข้าสู่ระบบ');
  const blob = await (await fetch(file.data)).blob();
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[blob.type];
  if (!ext || blob.size > 5 * 1024 * 1024) throw new Error('รองรับ JPG, PNG, WebP ไม่เกิน 5 MB');
  const path = `${user.id}/${room ? room + '/' : ''}${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await gpClient.storage.from(bucket).upload(path, blob, { contentType: blob.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  return path;
}

async function gpSignedUrl(bucket, path) {
  if (!path) return '';
  const { data, error } = await gpClient.storage.from(bucket).createSignedUrl(path, 600);
  return error ? '' : data.signedUrl;
}

async function gpChatHistory(room) {
  const { messages } = await gpCall('chatHistory', { roomId: room });
  await Promise.all(messages.map(async m => { if (m.ImagePath) m.ImageLink = await gpSignedUrl('gp-chat', m.ImagePath); }));
  state.data.chatMessages = state.data.chatMessages.filter(m => m.ChatRoomID !== room).concat(messages.map(normalizeRow));
  if (state.active === 'chat' && state.chatRoom === room) renderChat();
}

function gpStopChat() {
  if (gpChannel) gpClient.removeChannel(gpChannel);
  gpChannel = null; gpRoom = null;
  clearTimeout(gpRefreshTimer);
}

function subscribeToFirebaseChat(room) {
  if (!gpClient || !state.currentUser || gpRoom === room) return;
  gpStopChat(); gpRoom = room;
  const refresh = () => {
    clearTimeout(gpRefreshTimer);
    gpRefreshTimer = setTimeout(() => gpChatHistory(room).catch(console.warn), 150);
  };
  gpChannel = gpClient.channel(`green-passport:${room}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gp_chat_events', filter: `room_id=eq.${room}` }, refresh)
    .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
  gpChatHistory(room).catch(err => alert(err.message));
}

function sheetApiConfigured() { return !!gpClient; }
async function sheetApi(action, payload = {}) {
  const next = structuredClone(payload);
  delete next.pin;
  if (action === 'appendWasteRecord') {
    const files = next.record.EvidenceFiles || [];
    if (!files.length || files.length > 5) throw new Error('แนบรูปหลักฐาน 1–5 รูป');
    next.record.EvidencePaths = await Promise.all(files.map(file => gpUpload('gp-evidence', file)));
    next.record.EvidenceFileNames = files.map(file => file.name).join(', ');
    delete next.record.EvidenceFiles;
  }
  if (action === 'appendChatMessage') {
    const m = next.message;
    if (m.ImageLink?.startsWith('data:')) m.ImagePath = await gpUpload('gp-chat', { data: m.ImageLink }, m.ChatRoomID);
    delete m.ImageLink;
  }
  const result = await gpCall(action, next);
  if (action === 'appendGameScore') result.gameScores = (await gpCall('getBootstrapData')).gameScores;
  if (action === 'appendWasteRecord' && result.record?.EvidencePaths?.length) {
    result.record.EvidenceFolderLink = await gpSignedUrl('gp-evidence', result.record.EvidencePaths[0]);
  }
  return result;
}

// Existing chat UI calls this compatibility shim; no Firebase SDK is loaded.
function gpChatAdapter() {
  return { ref(path) {
    const [, room, id] = path.split('/');
    return {
      async set(message) {
        await sheetApi('appendChatMessage', { message: { ...message, ChatRoomID: room } });
        await gpChatHistory(room);
      },
      async update(updates) {
        const action = ['teacher', 'admin'].includes(state.currentUser?.Role) ? 'updateChatMessageModeration' : 'reportChatMessage';
        await sheetApi(action, { messageId: id, moderationStatus: updates.ModerationStatus, reportStatus: updates.ReportStatus, isPinned: !!updates.IsPinned });
        await gpChatHistory(room);
      }
    };
  } };
}

async function gpSetUser() {
  const { user } = await gpCall('me');
  state.currentUser = normalizeAuthUser(user);
  state.authToken = '';
  state.adminPIN = ['teacher', 'admin'].includes(user.Role) ? 'staff-session' : '';
  state.authMessage = ''; state.authMessageType = '';
  applyCurrentUserToState(); renderNav();
  await reloadData(true);
  const authScreen = document.getElementById('authScreen');
  if (authScreen) { authScreen.replaceChildren(); delete authScreen.dataset.mode; }
  if (state.active === 'chat') subscribeToFirebaseChat(state.chatRoom || 'CR-MISSION-01');
  renderAll();
}

async function submitLogin(event) {
  event.preventDefault();
  const d = Object.fromEntries(new FormData(event.currentTarget).entries());
  const email = String(d.login || '').trim().toLowerCase();
  if (!email.includes('@')) return setAuthMessage('กรุณาใช้ Email ในการเข้าสู่ระบบ', 'bad');
  state.authBusy = true; renderAuth();
  try {
    if (!gpClient) throw new Error('ยังไม่สามารถเชื่อมต่อ Supabase');
    const { error } = await gpClient.auth.signInWithPassword({ email, password: String(d.password || '') });
    if (error) throw error;
    await gpSetUser();
  } catch (error) { state.authBusy = false; setAuthMessage(error.message, 'bad'); }
  finally { state.authBusy = false; }
}

async function submitSignup(event) {
  event.preventDefault();
  const d = Object.fromEntries(new FormData(event.currentTarget).entries());
  if (!d.Email || !d.Consent || String(d.Password || '').length < 8 || d.Password !== d.ConfirmPassword)
    return setAuthMessage('ใช้ Email ยอมรับเงื่อนไข และรหัสผ่านอย่างน้อย 8 ตัวอักษร', 'bad');
  state.authBusy = true; renderAuth();
  try {
    if (!gpClient) throw new Error('ยังไม่สามารถเชื่อมต่อ Supabase');
    const { data, error } = await gpClient.auth.signUp({
      email: String(d.Email).trim().toLowerCase(), password: d.Password,
      options: { data: {
        username: d.Username, display_name: d.DisplayName || `${d.FirstName || ''} ${d.LastName || ''}`.trim(),
        first_name: d.FirstName || '', last_name: d.LastName || '', class_name: d.ClassName || '',
        student_id: d.StudentID || '', household_name: d.HouseholdName || '', role: d.Role === 'parent' ? 'parent' : 'student', consent: true
      }, emailRedirectTo: location.origin }
    });
    if (error) throw error;
    if (data.session) await gpSetUser();
    else { state.authBusy = false; state.authMode = 'login'; setAuthMessage('กรุณาตรวจสอบอีเมลยืนยันก่อนเข้าสู่ระบบ', 'ok'); }
  } catch (error) { state.authBusy = false; setAuthMessage(error.message, 'bad'); }
  finally { state.authBusy = false; }
}

async function logout() {
  gpStopChat(); if (gpClient) await gpClient.auth.signOut();
  state.currentUser = null; state.adminPIN = ''; state.data = makeEmptyData();
  state.chatIdentity = {}; state.active = 'home'; state.authMode = 'login'; renderAuth();
}

async function reloadData(silent = false) {
  const result = await gpCall('getBootstrapData');
  await Promise.all(result.wasteRecords.map(async r => {
    if (r.EvidencePaths?.length) r.EvidenceFolderLink = await gpSignedUrl('gp-evidence', r.EvidencePaths[0]);
  }));
  if (!['teacher', 'admin'].includes(state.currentUser?.Role)) result.chatMessages = state.data.chatMessages || [];
  else await Promise.all(result.chatMessages.map(async m => { if (m.ImagePath) m.ImageLink = await gpSignedUrl('gp-chat', m.ImagePath); }));
  result.chatRooms = defaultChatRooms().filter(room => room.ChatRoomID === 'CR-MISSION-01' || ['teacher', 'admin'].includes(state.currentUser?.Role) || (room.ChatRoomID === 'CR-CLASS-01' && state.currentUser?.ClassName === 'ม.1/1'));
  hydrateData(result);
  if (!silent) alert('โหลดข้อมูลจาก Supabase เรียบร้อย');
  renderAll();
}

// Do not restore account data or queue legacy writes.
function saveToLocalStorage() {}
function loadFromLocalStorage() {}
function restoreAuthSession() { return false; }
function queuePendingWrite() { throw new Error('บันทึกไม่สำเร็จ กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง'); }
async function syncPendingWrites() {}
async function fetchUserProfilesFromFirestore() {}
async function loadBootstrapFromPublicSheets() { return gpCall('getBootstrapData'); }
function sheetConnectionPanelHtml() {
  return `<div class="panel"><h3>Supabase Database</h3><p class="notice">ฐานข้อมูลใหม่ แยกจากระบบเดิม</p><button class="btn" onclick="reloadData()">รีเฟรชข้อมูล</button></div>`;
}
function renderAdmin() {
  const staff = ['teacher', 'admin'].includes(state.currentUser?.Role);
  state.adminPIN = staff ? 'staff-session' : '';
  document.getElementById('admin').innerHTML = staff ? adminPanelHtml() : '<div class="panel"><h3>เฉพาะครูและผู้ดูแลระบบ</h3></div>';
  if (staff) scheduleAdminDeferredRender();
  if (state.currentUser?.Role === 'admin') {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = '<h3>คำขอสมัครสมาชิก</h3><div id="gpPendingMembers">กำลังโหลด...</div>';
    document.getElementById('admin').prepend(panel);
    gpPendingMembers();
  }
}
function adminLogin() { renderAdmin(); }

async function gpPendingMembers() {
  const target = document.getElementById('gpPendingMembers');
  if (!target) return;
  try {
    const { members } = await gpCall('pendingMembers');
    target.innerHTML = members.length ? members.map(m => `<div class="card"><strong>${escapeHtml(m.displayName)}</strong><p>${escapeHtml(m.username)} · ${escapeHtml(m.className)} · ${escapeHtml(m.studentId || '')}</p><button class="btn" data-member="${escapeAttr(m.id)}">อนุมัติ</button></div>`).join('') : '<p>ไม่มีคำขอใหม่</p>';
    target.querySelectorAll('[data-member]').forEach(btn => btn.addEventListener('click', async () => {
      if (!await customConfirm('ยืนยันว่าได้ตรวจสอบตัวตนของสมาชิกแล้วหรือไม่?')) return;
      try { await gpCall('approveMember', { id: btn.dataset.member }); gpPendingMembers(); } catch (err) { alert(err.message); }
    }));
  } catch (err) { target.textContent = err.message; }
}

async function init() {
  state.data = makeEmptyData(); state.currentUser = null; state.adminPIN = ''; state.chatIdentity = {};
  const start = new URLSearchParams(location.search).get('page') || location.hash.replace('#page=', '');
  if (pages.some(([id]) => id === start)) state.active = start;
  renderNav(); renderAuth();
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (!response.ok) throw new Error('Supabase configuration missing');
    const config = await response.json();
    gpClient = window.supabase.createClient(config.url, config.key);
    firebaseDb = gpChatAdapter();
    const { data: { session } } = await gpClient.auth.getSession();
    if (session) await gpSetUser();
    gpClient.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        gpStopChat(); state.currentUser = null; state.adminPIN = ''; state.data = makeEmptyData(); renderAuth();
      }
    });
  } catch (error) { setAuthMessage('ไม่สามารถเชื่อมต่อระบบใหม่: ' + error.message, 'bad'); }
}

init();
