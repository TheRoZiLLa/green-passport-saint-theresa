    function showOwnProfile() { state.profileUserID = state.currentUser?.UserID || ''; showPage('profile'); }

    function renderProfile() {
      const profiles = allProfiles();
      const myId = currentUserIdentity().UserID;
      if (!profiles.length) {
        document.getElementById('profile').innerHTML = '<div class="panel workspace-empty"><h3>ยังไม่มีข้อมูลโปรไฟล์</h3><p>เริ่มทำกิจกรรมเพื่อสะสมความก้าวหน้า</p><button class="btn" onclick="showPage(\'record\')">เริ่มบันทึก</button></div>';
        return;
      }
      const profile = profiles.find(p => (p.UserID || p.DisplayName) === state.profileUserID) || profiles.find(p=>p.UserID === myId) || profiles[0];
      state.profileUserID = profile.UserID || profile.DisplayName;
      const own = state.profileUserID === myId;
      const current = levelInfoByEXP(profile.CurrentEXP);
      const next = nextLevelInfo(profile.CurrentEXP);
      const posts = (state.data.communityPosts || []).filter(post => post.UserID === profile.UserID && statusIsPublished(post.ReviewStatus));
      document.getElementById('profile').innerHTML = `
        <div class="workspace-page-action"><div><h3>${own ? 'โปรไฟล์ของฉัน' : 'โปรไฟล์เพื่อน'}</h3><p>ติดตามความสำเร็จและกิจกรรมที่ผ่านมาของสมาชิก</p></div><button class="btn ghost" onclick="${own ? "showPage('friends')" : 'showOwnProfile()'}">${own?'ดูเพื่อน':'กลับโปรไฟล์ของฉัน'}</button></div>
        <div class="profile-banner workspace-profile-banner">
          <div class="workspace-profile-identity"><div class="avatar">${escapeHtml(profile.Avatar || avatarText(profile.DisplayName))}</div><div><span class="workspace-eyebrow">${own ? 'MY GREEN JOURNEY' : 'GREEN COMMUNITY'}</span><h3>${escapeHtml(safeDisplayName(profile.DisplayName))}</h3><p>${escapeHtml(profile.ClassName || (own ? currentUserIdentity().Role : 'สมาชิก'))}</p></div><span class="badge earned">${current.emoji} ${escapeHtml(current.name)}</span></div>
          <div class="workspace-level-progress"><div><strong>${Number(profile.CurrentEXP || 0)} EXP</strong><span>${current.name === next.name ? 'ถึงระดับสูงสุดแล้ว' : 'อีก ' + Math.max(0,Number(next.min||0)-Number(profile.CurrentEXP||0)) + ' EXP สู่ ' + escapeHtml(next.name)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${progressToNextLevel(profile.CurrentEXP)}%"></div></div></div>
        </div>
        <div class="workspace-section-title"><div><h3>สถิติและความสำเร็จ</h3><p>อัปเดตจากกิจกรรมที่บันทึกไว้</p></div></div>
        <div class="workspace-stats"><div class="workspace-stat"><span class="workspace-stat-icon">${icons.game}</span><div><span>คะแนนเกม</span><strong>${Number(profile.TotalScore||0)}</strong></div></div><div class="workspace-stat"><span class="workspace-stat-icon">${icons.award}</span><div><span>Badge</span><strong>${Number(profile.TotalBadges||0)}</strong></div></div><div class="workspace-stat"><span class="workspace-stat-icon">${icons.community}</span><div><span>โพสต์</span><strong>${Number(profile.TotalPosts||posts.length||0)}</strong></div></div></div>
        <div class="grid two" style="margin-top:16px">
          <div class="panel"><h3>ผลลัพธ์กิจกรรม</h3><div class="workspace-mini-stat"><span>บันทึกขยะ</span><strong>${Number(profile.TotalSubmissions||0)}</strong></div><div class="workspace-mini-stat"><span>ลดคาร์บอน (kgCO₂e)</span><strong>${format(profile.TotalCO2e||0)}</strong></div>${own ? '<button class="btn" style="margin-top:14px" onclick="showPage(\'record\')">เพิ่มกิจกรรม</button>' : ''}</div>
          <div class="panel"><h3>เรื่องราวที่แบ่งปัน</h3>${posts.length ? `<div class="tag-row">${posts.slice(0,6).map(post=>`<span class="tag">${escapeHtml(post.PostTitle)}</span>`).join('')}</div>` : '<p>ยังไม่มีโพสต์ที่เผยแพร่</p>'}<button class="btn ghost" style="margin-top:14px" onclick="showPage('community')">ไปที่ชุมชน</button></div>
        </div>
        <details class="panel workspace-accordion" style="margin-top:16px"><summary>ดูระดับและรางวัลทั้งหมด</summary><div class="level-row">${levelCatalog.map(level=>`<div class="level-chip ${level.name===current.name?'active':''}"><div class="emoji">${level.emoji}</div><strong>${escapeHtml(level.name)}</strong><span>${level.min}+ EXP</span></div>`).join('')}</div></details>`;
    }
