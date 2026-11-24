    function renderHome() {
      const user = state.currentUser || {};
      const records = (state.data.wasteRecords || []).filter(r => String(r.UserID) === String(user.UserID)).sort((a,b)=>String(b.ReportMonth || b.SubmittedAt || '').localeCompare(String(a.ReportMonth || a.SubmittedAt || '')));
      const co2e = records.reduce((total, r) => total + Number(r.TotalCO2e || 0), 0);
      const exp = (state.data.expLogs || []).filter(r => String(r.UserID) === String(user.UserID)).reduce((total, r) => total + Number(r.EXPAmount || 0), 0);
      const month = new Date().toISOString().slice(0, 7);
      const currentRecord = records.find(r => r.ReportMonth === month);
      const approved = currentRecord?.ReviewStatus === 'ผ่านการตรวจสอบ';
      const niceMonth = value => {
        const date = new Date(String(value || month) + '-01T12:00:00');
        return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
      };
      const status = r => r?.ReviewStatus || 'รอตรวจสอบ';
      const town = (label, compact, value, unit, icon) => `<div class="workspace-stat"><div class="workspace-stat-copy"><span class="workspace-stat-label-full">${label}</span><span class="workspace-stat-label-compact">${compact}</span><strong>${value} <small>${unit}</small></strong></div><span class="workspace-stat-icon">${icons[icon]}</span></div>`;
      const dashboardActions = [['record','edit','บันทึกขยะ','ส่งข้อมูลประจำเดือน'],['game','game','Trash Hero Academy','เรียนรู้และสะสมรางวัล'],['community','community','ชุมชน','แบ่งปันไอเดีย'],['guide','book','คู่มือแยกขยะ','ค้นหาวิธีจัดการขยะ']];
      document.getElementById('home').innerHTML = `
        <div class="workspace-stats">
          ${town('คาร์บอนที่ลดได้','ลดคาร์บอน',format(co2e),'kgCO₂e','impact')}
          ${town('รายการที่ส่งแล้ว','ส่งแล้ว',records.length,'รายการ','edit')}
          ${town('ประสบการณ์สะสม','ประสบการณ์',exp,'EXP','award')}
        </div>
        <div class="workspace-dashboard-grid">
          <section class="panel workspace-dashboard-card workspace-recent">
            <div class="workspace-card-heading"><div><h3>รายการบันทึกล่าสุด</h3><p>ประวัติการส่งข้อมูลของคุณ</p></div><button class="workspace-link" onclick="showPage('impact')">ดูผลลัพธ์ทั้งหมด</button></div>
            ${records.length ? `<div class="workspace-record-list">${records.slice(0,4).map(r=>`<div class="workspace-record-row"><span class="workspace-record-icon">${icons.edit}</span><div class="workspace-record-name"><strong>${escapeHtml(niceMonth(r.ReportMonth))}</strong><small>${format(r.TotalCO2e || 0)} kgCO₂e</small></div><span class="workspace-record-status ${r.ReviewStatus === 'ผ่านการตรวจสอบ' ? 'is-approved' : ''}">${escapeHtml(status(r))}</span><div class="workspace-record-actions"><button type="button" class="btn ghost workspace-btn-sm" onclick="editWasteRecord('${escapeAttr(r.RecordID || r._rowNumber || '')}')">แก้ไข</button><button type="button" class="btn danger workspace-btn-sm" onclick="deleteWasteRecord('${escapeAttr(r.RecordID || r._rowNumber || '')}')">ลบ</button></div></div>`).join('')}</div>` : `<div class="workspace-recent-empty"><span class="workspace-record-icon">${icons.edit}</span><strong>ยังไม่มีรายการบันทึก</strong><p>เริ่มบันทึกข้อมูลครั้งแรกเพื่อดูผลลัพธ์ของคุณที่นี่</p><button class="btn ghost" onclick="showPage('record')">เริ่มบันทึก</button></div>`}
          </section>
          <section class="panel workspace-dashboard-card workspace-month-card">
            <div class="workspace-card-heading"><div><h3>ภารกิจประจำเดือน</h3><p>${escapeHtml(niceMonth(month))}</p></div><span class="workspace-record-icon">${icons.mission}</span></div>
            <div class="workspace-task-state"><span class="workspace-task-dot ${currentRecord?'submitted':''}"></span><strong>${currentRecord ? approved ? 'บันทึกเสร็จสมบูรณ์' : status(currentRecord) : 'ยังไม่ได้บันทึก'}</strong></div>
            <p>${currentRecord ? 'คุณส่งข้อมูลเดือนนี้แล้ว สามารถติดตามสถานะหรือทำกิจกรรมอื่นต่อได้' : 'ส่งข้อมูลปริมาณขยะและภาพหลักฐานของเดือนนี้เพื่อสะสมความก้าวหน้า'}</p>
            <button class="btn ${currentRecord ? 'ghost' : ''}" onclick="showPage('${currentRecord ? 'impact' : 'record'}')">${currentRecord ? 'ดูผลลัพธ์ของฉัน' : 'เริ่มบันทึกเดือนนี้'}</button>
          </section>
        </div>
        <div class="workspace-section-title"><div><h3>เมนูที่ใช้บ่อย</h3></div><button class="workspace-link" onclick="showWorkspaceMenu()">เมนูทั้งหมด</button></div>
        <div class="workspace-action-grid">
          ${dashboardActions.map(([id,icon,title,desc])=>`<button class="workspace-action-card" onclick="showPage('${id}')"><span class="workspace-action-icon">${icons[icon]}</span><div><strong>${title}</strong><small>${desc}</small></div></button>`).join('')}
        </div>
        ${isStaffUser() ? `<div class="workspace-admin-callout"><div><strong>สำหรับผู้ดูแลโครงการ</strong><p>ตรวจสอบรายการที่ส่ง อนุมัติสมาชิก และดูแลชุมชน</p></div><button class="btn ghost" onclick="showPage('admin')">จัดการระบบ</button></div>` : ''}`;
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
