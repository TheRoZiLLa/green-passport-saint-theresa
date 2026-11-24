    async function init() {
      const startPage = new URLSearchParams(location.search).get('page') || location.hash.replace('#page=', '');
      if (startPage && pages.some(([id]) => id === startPage)) state.active = startPage;
      renderNav();
      loadFromLocalStorage();
      restoreAuthSession();
      if (!isAuthenticated()) {
        renderAuth();
        return;
      }
      document.body.classList.remove('auth-locked');
      renderAll();
      try {
        await reloadData(true);
        applyCurrentUserToState();
        await syncPendingWrites();
        renderAll();
      } catch (error) {
        console.warn(error);
        alert('โหลดข้อมูลจาก Google Sheets ไม่สำเร็จ: ' + error.message);
        renderAll();
      }
    }

    function hydrateData(data = {}) {
      state.data = Object.assign(state.data, data);
      state.data.wasteRecords = (data.wasteRecords || []).map(normalizeRow);
      state.data.gameScores = (data.gameScores || []).map(normalizeRow);
      state.data.carbonFactors = (data.carbonFactors?.length ? data.carbonFactors : state.data.carbonFactors).map(normalizeRow);
      state.data.householdSummary = data.householdSummary || summarizeHouseholds(state.data.wasteRecords);
      state.data.dashboard = data.dashboard || buildDashboard(state.data.wasteRecords, state.data.householdSummary);
      state.data.communityPosts = (data.communityPosts || state.data.communityPosts || []).map(normalizeRow);
      state.data.postComments = (data.postComments || state.data.postComments || []).map(normalizeRow);
      state.data.chatMessages = (data.chatMessages || state.data.chatMessages || []).map(normalizeRow);
      state.data.chatRooms = (data.chatRooms?.length ? data.chatRooms : state.data.chatRooms?.length ? state.data.chatRooms : defaultChatRooms()).map(normalizeRow);
      state.data.userProfiles = (data.userProfiles || state.data.userProfiles || []).map(normalizeRow);
      state.data.levelRules = (data.levelRules?.length ? data.levelRules : state.data.levelRules?.length ? state.data.levelRules : defaultLevelRules()).map(normalizeRow);
      state.data.expLogs = (data.expLogs || state.data.expLogs || []).map(normalizeRow);
      state.data.carbonFactors?.forEach((factor) => {
        const field = activityFields.find((a) => a[1] === factor.ActivityName || a[0] === factor.ActivityCode)?.[0];
        if (field) factorMap[field] = Number(factor.EF || factorMap[field] || 0);
      });
    }

    function renderNav() {
      const side = document.getElementById('sideNav');
      const mobile = document.getElementById('mobileNav');
      const groups = [
        ['ภาพรวม', ['home', 'record', 'impact']],
        ['เรียนรู้และกิจกรรม', ['guide', 'game', 'leaderboard']],
        ['ชุมชน', ['community', 'chat', 'friends']],
        ['บัญชีของฉัน', ['profile']]
      ];
      if (isStaffUser()) groups.push(['สำหรับครูและผู้ดูแล', ['admin', 'dashboard']]);
      const navItem = (id) => {
        const page = pages.find(p => p[0] === id);
        return page ? `<button class="nav-btn" data-page="${id}" title="${escapeAttr(workspaceLabel(id))}">${icons[page[2]]}<span>${escapeHtml(workspaceLabel(id))}</span></button>` : '';
      };
      side.innerHTML = groups.map(([label, ids]) => `<div class="nav-group"><p>${label}</p>${ids.map(navItem).join('')}</div>`).join('');
      mobile.innerHTML = ['home','record','game','chat'].map(id => {
        const p = pages.find(item => item[0] === id);
        return `<button data-page="${id}" title="${escapeAttr(workspaceLabel(id))}">${icons[p[2]]}<span>${escapeHtml(workspaceMobileLabel(id))}</span></button>`;
      }).join('') + `<button type="button" onclick="showWorkspaceMenu()" aria-label="เมนูทั้งหมด"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 6h14M5 12h14M5 18h14"/></svg><span>เมนู</span></button>`;
      document.querySelectorAll('[data-page]').forEach((btn) => btn.addEventListener('click', () => btn.dataset.page === 'profile' ? showOwnProfile() : showPage(btn.dataset.page)));
    }

    const workspacePages = {
      home: ['หน้าหลัก', 'เริ่มต้นภารกิจรักษ์โลกของคุณได้จากที่นี่'],
      record: ['บันทึกขยะ', 'บันทึกกิจกรรมที่บ้านและหลักฐานเพื่อส่งให้ครูตรวจสอบ'],
      impact: ['ผลลัพธ์สิ่งแวดล้อม', 'ดูว่ากิจกรรมของเราช่วยลดผลกระทบต่อโลกได้อย่างไร'],
      guide: ['คู่มือแยกขยะ', 'ค้นหาวิธีคัดแยกและจัดการขยะอย่างถูกต้อง'],
      game: ['Trash Hero Academy', 'เรียนรู้ผ่านเกม ทำภารกิจ และสะสมเหรียญรางวัล'],
      leaderboard: ['อันดับ', 'ดูอันดับผลลัพธ์การลดคาร์บอนจากข้อมูลที่คุณมีสิทธิ์ดู'],
      community: ['ชุมชน', 'แบ่งปันไอเดียและติดตามเรื่องราวจากเพื่อน ๆ'],
      chat: ['แชท', 'พูดคุย แลกเปลี่ยนไอเดีย และขอคำแนะนำ'],
      friends: ['เพื่อน', 'ค้นหาเพื่อนร่วมภารกิจและดูความก้าวหน้า'],
      profile: ['โปรไฟล์', 'ติดตามกิจกรรม EXP และความสำเร็จของคุณ'],
      admin: ['จัดการระบบ', 'ตรวจสอบข้อมูล อนุมัติสมาชิก และดูแลชุมชน'],
      dashboard: ['Dashboard', 'สรุปข้อมูลรายเดือนและความก้าวหน้าของโครงการ'],
      compare: ['เปรียบเทียบผลลัพธ์', 'เปรียบเทียบข้อมูลระหว่างช่วงเวลา'],
      formula: ['วิธีคำนวณคาร์บอน', 'ทำความเข้าใจสูตรและตัวคูณการลดคาร์บอน'],
      missions: ['ภารกิจประจำเดือน', 'ดูสิ่งที่สามารถทำได้ในแต่ละเดือน'],
      reminders: ['แจ้งเตือนกิจกรรม', 'ตรวจสอบรายการที่ควรดำเนินการต่อ'],
      studentRoles: ['บทบาทนักเรียน', 'เรียนรู้หน้าที่ในการเป็นส่วนหนึ่งของโครงการ'],
      starterKit: ['Starter Kit', 'เครื่องมือเริ่มต้นสำหรับกิจกรรม Zero Waste'],
      certificate: ['เกียรติบัตร', 'ตรวจสอบและจัดทำเกียรติบัตร']
    };

    function workspaceLabel(id) { return workspacePages[id]?.[0] || 'Green Passport'; }
    function workspaceMobileLabel(id) { return ({home:'หน้าหลัก',record:'บันทึก',game:'เกม',chat:'แชท'})[id] || workspaceLabel(id); }

    let workspaceToastTimer;
    function workspaceToast(message) {
      let toast = document.getElementById('workspaceToast');
      if (!toast) { toast = document.createElement('div'); toast.id = 'workspaceToast'; toast.className = 'workspace-toast'; toast.setAttribute('role','status'); document.body.append(toast); }
      toast.textContent = message; toast.hidden = false;
      clearTimeout(workspaceToastTimer);
      workspaceToastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
    }

    async function refreshWorkspaceData() {
      if (state.workspaceRefreshing) return;
      if (state.active === 'community' && (document.querySelector('#communityPostForm [name="PostTitle"]')?.value || document.querySelector('#communityPostForm [name="PostContent"]')?.value)) {
        if (!await customConfirm('อัปเดตข้อมูลแล้วร่างโพสต์ที่ยังไม่ได้ส่งจะหาย ต้องการดำเนินการต่อหรือไม่?')) return;
      }
      const page = state.active;
      state.workspaceRefreshing = true; workspaceToast('กำลังอัปเดตข้อมูล...');
      try { await reloadData(true, page); workspaceToast('อัปเดตข้อมูลเรียบร้อย'); }
      catch (error) { alert('อัปเดตข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง'); }
      finally { state.workspaceRefreshing = false; }
    }

    function showWorkspaceMenu() {
      let menu = document.getElementById('workspaceMenu');
      if (!menu) {
        menu = document.createElement('dialog'); menu.id = 'workspaceMenu'; menu.className = 'workspace-menu-dialog';
        menu.setAttribute('aria-label','เมนูทั้งหมด'); document.body.append(menu);
      }
      const groups = [['กิจกรรมและข้อมูล',['home','record','guide','game','leaderboard','impact']],['ชุมชนและบัญชี',['community','chat','friends','profile']]];
      if (isStaffUser()) groups.push(['สำหรับครูและผู้ดูแล',['admin','dashboard','compare','formula','missions','reminders','studentRoles','starterKit','certificate']]);
      menu.innerHTML = `<header><div><small>GREEN PASSPORT</small><h2>เมนูทั้งหมด</h2></div><button type="button" onclick="document.getElementById('workspaceMenu').close()" aria-label="ปิดเมนู">×</button></header>` + groups.map(([name, ids]) => `<section><h3>${name}</h3><div class="workspace-menu-grid">${ids.map(id => `<button type="button" onclick="document.getElementById('workspaceMenu').close();${id === 'profile' ? 'showOwnProfile()' : `showPage('${id}')`}">${icons[pages.find(p=>p[0]===id)?.[2]] || ''}<span>${escapeHtml(workspaceLabel(id))}</span></button>`).join('')}</div></section>`).join('');
      menu.insertAdjacentHTML('beforeend', '<div class="workspace-menu-footer"><button class="workspace-link" type="button" onclick="document.getElementById(\'workspaceMenu\').close();logout()">ออกจากระบบ</button></div>');
      if (!menu.open) menu.showModal();
    }

    function shortLabel(label) {
      return label.replace('ข้อมูลขยะ', '').replace('Trash Hero Academy', 'เกม').replace('Leaderboard', 'อันดับ');
    }

    async function showPage(page) {
      if (!isAuthenticated()) {
        renderAuth();
        return;
      }
      if (!pages.some(item => item[0] === page)) return;
      if (page === 'admin' && !isStaffUser()) { alert('หน้านี้สำหรับครูและผู้ดูแลระบบเท่านั้น'); return; }
      if (state.active === 'record' && page === 'record' && state.recordDirty) return;
      if (state.active === 'record' && page !== 'record' && state.recordDirty) {
        if (!await customConfirm('ยังไม่ได้บันทึกข้อมูล ต้องการออกจากหน้านี้หรือไม่?')) return;
        state.recordDirty = false;
      }
      state.active = page;
      if (typeof gpStopChat === 'function' && page !== 'chat') gpStopChat();
      if (page === 'chat' && typeof subscribeToFirebaseChat === 'function') {
        ensureChatRoom();
        subscribeToFirebaseChat(state.chatRoom);
      }
      // Explicit refresh controls keep newly opened forms from being cleared by a delayed data fetch.
      document.body.classList.toggle('chat-active', page === 'chat');
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderAll() {
      if (!isAuthenticated()) {
        renderAuth();
        return;
      }
      const current = pages.find(([id]) => id === state.active);
      document.body.classList.remove('auth-locked');
      document.body.classList.toggle('chat-active', state.active === 'chat');
      document.getElementById('pageTitle').textContent = workspaceLabel(state.active);
      document.getElementById('pageSubtitle').textContent = workspacePages[state.active]?.[1] || '';
      document.getElementById('globalCarbon').textContent = format(state.data.dashboard.totalCO2e || 0);
      const carbonLabel = document.querySelector('.carbon-pill > div');
      if (carbonLabel) carbonLabel.textContent = isStaffUser() ? 'คาร์บอนในระบบ' : 'คาร์บอนของคุณ';
      renderAuthUserChip();
      document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === state.active));
      document.querySelectorAll('[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === state.active));
      const renderers = {
        home: renderHome,
        record: renderRecord,
        guide: renderGuide,
        game: renderGame,
        leaderboard: renderLeaderboard,
        community: renderCommunity,
        friends: renderFriends,
        chat: renderChat,
        profile: renderProfile,
        impact: renderImpact,
        dashboard: renderDashboard,
        compare: renderCompare,
        formula: renderFormula,
        missions: renderMonthlyMissions,
        reminders: renderReminders,
        studentRoles: renderStudentRoles,
        starterKit: renderStarterKit,
        certificate: renderCertificate,
        admin: renderAdmin,
      };
      (renderers[state.active] || renderHome)();
    }
