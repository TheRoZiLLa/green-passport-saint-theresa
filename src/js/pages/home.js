    function renderHome() {
      const user = state.currentUser || {};
      const records = (state.data.wasteRecords || []).filter(r => String(r.UserID) === String(user.UserID));
      const co2e = records.reduce((total, r) => total + Number(r.TotalCO2e || 0), 0);
      const exp = (state.data.expLogs || []).filter(r => String(r.UserID) === String(user.UserID)).reduce((total, r) => total + Number(r.EXPAmount || 0), 0);
      const month = new Date().toISOString().slice(0, 7);
      const currentRecord = records.find(r => r.ReportMonth === month);
      const name = escapeHtml(user.DisplayName || 'Green Buddy');
      const nextAction = currentRecord ? 'ทำภารกิจต่อ' : 'เริ่มบันทึกขยะ';
      const nextPage = currentRecord ? 'game' : 'record';
      document.getElementById('home').innerHTML = `
        <div class="workspace-welcome">
          <div class="workspace-welcome-copy">
            <div class="workspace-eyebrow">GREEN PASSPORT · ST. THERESA</div>
            <h2>สวัสดี, ${name}</h2>
            <p>${currentRecord ? 'คุณบันทึกข้อมูลเดือนนี้แล้ว ลองเรียนรู้และทำกิจกรรมอื่น ๆ ต่อได้เลย' : 'เริ่มต้นด้วยการบันทึกขยะที่บ้าน แล้วสะสมความก้าวหน้าไปด้วยกัน'}</p>
            <div class="workspace-welcome-actions">
              <button class="btn" onclick="showPage('${nextPage}')">${icons[nextPage === 'record' ? 'edit' : 'game']} ${nextAction}</button>
              <button class="btn ghost" onclick="showPage('guide')">ดูคู่มือแยกขยะ</button>
            </div>
          </div>
          <div class="workspace-welcome-art">${authArt()}</div>
        </div>
        <div class="workspace-section-title"><div><h3>ความก้าวหน้าของคุณ</h3><p>ผลลัพธ์จากกิจกรรมของบัญชีนี้</p></div><button class="workspace-link" onclick="showOwnProfile()">ดูโปรไฟล์</button></div>
        <div class="workspace-stats">
          <div class="workspace-stat"><span class="workspace-stat-icon">${icons.impact}</span><div><span>คาร์บอนที่ลดได้</span><strong>${format(co2e)} <small>kgCO₂e</small></strong></div></div>
          <div class="workspace-stat"><span class="workspace-stat-icon">${icons.edit}</span><div><span>รายการบันทึก</span><strong>${records.length} <small>รายการ</small></strong></div></div>
          <div class="workspace-stat"><span class="workspace-stat-icon">${icons.award}</span><div><span>ประสบการณ์สะสม</span><strong>${exp} <small>EXP</small></strong></div></div>
        </div>
        <div class="workspace-section-title"><div><h3>อยากทำอะไรต่อ?</h3><p>เลือกกิจกรรมที่สนใจ</p></div><button class="workspace-link" onclick="showWorkspaceMenu()">ดูเมนูทั้งหมด</button></div>
        <div class="workspace-action-grid">
          ${[['record','edit','บันทึกขยะ','ส่งข้อมูลและหลักฐานกิจกรรมที่บ้าน'],['game','game','เล่นเกม','เรียนรู้และสะสม Badge'],['community','community','ชุมชน','แชร์ไอเดียและผลงานกับเพื่อน'],['chat','chat','พูดคุย','สอบถามและแลกเปลี่ยนในห้องแชท']].map(([id, icon, title, desc]) => `<button class="workspace-action-card" onclick="showPage('${id}')"><span class="workspace-action-icon">${icons[icon]}</span><div><strong>${title}</strong><small>${desc}</small></div></button>`).join('')}
        </div>
        ${isStaffUser() ? `<div class="workspace-admin-callout"><div><strong>จัดการโครงการ</strong><p>ตรวจสอบรายการที่ส่ง อนุมัติสมาชิก และดูแลชุมชน</p></div><button class="btn ghost" onclick="showPage('admin')">เปิดแผงจัดการ</button></div>` : ''}`;
    }

    function menuHelp(id) {
      return {
        record: 'กรอกขยะ หลักฐาน และคำนวณ kgCO₂e',
        guide: 'อ่านวิธีแยกขยะ 3Rs และขยะอันตราย',
        game: 'เล่นด่านความรู้ สะสมดาวและ Badge',
        leaderboard: 'ดูอันดับครัวเรือนลดคาร์บอนสะสม',
        community: 'แชร์ประสบการณ์ลดขยะและให้กำลังใจเพื่อน',
        friends: 'เห็นเพื่อนในระบบแบบปลอดภัย',
        chat: 'พูดคุยเรื่อง Zero Waste ภายใต้กติกาโรงเรียน',
        profile: 'ดู Level, EXP, Badge และความก้าวหน้าของฉัน',
        impact: 'ผลลัพธ์รวมสำหรับนำเสนอกรรมการ',
        dashboard: 'กราฟและตัวเลขภาพรวมโครงการ',
        missions: 'ภารกิจต่อเนื่องแบบรายเดือน',
        reminders: 'Green Buddy ช่วยเตือนงานที่ต้องทำ',
        studentRoles: 'บทบาทนักเรียนเจ้าของนวัตกรรม',
        starterKit: 'ชุดขยายผลสำหรับโรงเรียนอื่น',
        admin: 'ตรวจหลักฐาน ส่งออกข้อมูล และตั้งค่า',
      }[id] || 'เปิดใช้งานเมนูนี้';
    }

    function currentUserModeLabel() {
      const mode = userModes.find(([key]) => key === state.userMode);
      return mode ? `${mode[2]} ${mode[1]}` : 'นักเรียน';
    }

    function setUserMode(mode) {
      state.userMode = mode;
      localStorage.setItem('greenPassportUserMode', mode);
      renderAll();
    }
