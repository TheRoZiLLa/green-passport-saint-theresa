    function renderLeaderboard() {
      const topCarbon = [...(state.data.householdSummary || [])].sort((a,b)=>Number(b.TotalCO2e||0)-Number(a.TotalCO2e||0));
      document.getElementById('leaderboard').innerHTML = `
        <div class="workspace-page-action"><div><h3>อันดับการลดคาร์บอน</h3><p>เรียงตามปริมาณคาร์บอนที่ลดได้จากข้อมูลที่คุณมีสิทธิ์ดู</p></div><button class="btn ghost" onclick="refreshWorkspaceData()">รีเฟรชอันดับ</button></div>
        <div class="panel">${topCarbon.length ? `<div class="workspace-rank-list">${rankCards(topCarbon,'carbon')}</div>` : `<div class="workspace-empty"><span class="workspace-empty-icon">${icons.rank}</span><h3>ยังไม่มีอันดับ</h3><p>เมื่อมีการบันทึกกิจกรรม ข้อมูลผลลัพธ์จะปรากฏที่นี่</p><button class="btn" onclick="showPage('record')">บันทึกกิจกรรม</button></div>`}</div>
        <div class="workspace-section-title"><div><h3>อันดับเกม</h3><p>แข่งขันผ่านภารกิจ Trash Hero Academy</p></div></div><button class="workspace-action-card" style="width:100%" onclick="state.game.screen='leaderboard';showPage('game')"><span class="workspace-action-icon">${icons.game}</span><div><strong>ดูอันดับคะแนนเกม</strong><small>คะแนนและดาวสะสมจากผู้เล่น</small></div></button>`;
    }

    function rankCards(rows, type) {
      if (!rows.length) return '<div class="workspace-empty"><p>ยังไม่มีข้อมูลสำหรับจัดอันดับ</p></div>';
      return rows.map((r,i)=>`<div class="workspace-rank-row"><span class="workspace-rank-number rank-${i+1}">${i+1}</span><div class="workspace-rank-person"><strong>${escapeHtml(String(r.HouseholdName || r.DisplayName || 'สมาชิก Green Passport'))}</strong><small>${escapeHtml(String(r.ClassName || ''))} · ส่ง ${Number(r.TotalSubmissions || 0)} รายการ</small></div><div class="workspace-rank-score"><strong>${format(r.TotalCO2e || 0)}</strong><small>kgCO₂e</small></div></div>`).join('');
    }
