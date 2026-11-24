    function communityCategories() {
      return [
        'ตั้งมุมแยกขยะที่บ้าน',
        'ทำปุ๋ยหมักจากเศษอาหาร',
        'ลดพลาสติกใช้ครั้งเดียว',
        'ซ่อม ใช้ซ้ำ ส่งต่อ',
        'ธนาคารขยะและรีไซเคิล',
        'คำถามหรือไอเดีย Zero Waste',
      ];
    }

    function communityRulesAccepted() {
      return localStorage.getItem('greenPassportCommunityRules') === 'accepted';
    }

    function acceptCommunityRules() {
      localStorage.setItem('greenPassportCommunityRules', 'accepted');
      renderAll();
    }

    function statusIsPublished(status) {
      const text = String(status || '');
      return text.includes('เผยแพร่') || text.includes('ผ่านการตรวจ');
    }

    function statusIsHidden(status) {
      const text = String(status || '');
      return text.includes('ซ่อน') || text.includes('ลบ') || text.includes('ไม่เหมาะสม');
    }

    function truthy(value) {
      return value === true || String(value).toLowerCase() === 'true' || String(value).includes('ใช่') || String(value).includes('ปัก');
    }

    function renderCommunityRules() {
      const accepted = communityRulesAccepted();
      return `
        <div class="rules-box">
          <strong>กติกาชุมชน Green Passport</strong>
          <p>ใช้ชื่อเล่นหรือชื่อที่ไม่เปิดเผยข้อมูลส่วนตัว, แชร์เฉพาะประสบการณ์ลดขยะที่สร้างสรรค์, ไม่ส่งเบอร์โทร ที่อยู่ ลิงก์ส่วนตัว หรือข้อความที่ทำให้ผู้อื่นเสียหาย และทุกโพสต์ต้องรอครูตรวจสอบก่อนเผยแพร่</p>
          <div class="btn-row" style="margin-top:10px">
            <span class="status ${accepted ? 'ok' : ''}">${accepted ? 'ยอมรับกติกาแล้ว' : 'ยังไม่ได้ยอมรับกติกา'}</span>
            ${accepted ? '' : `<button class="btn ghost" type="button" onclick="acceptCommunityRules()">ยอมรับกติกา</button>`}
          </div>
        </div>`;
    }

    function publishedPosts() {
      return (state.data.communityPosts || [])
        .filter((post) => statusIsPublished(post.ReviewStatus) && !statusIsHidden(post.ReviewStatus))
        .sort((a, b) => String(b.Timestamp || '').localeCompare(String(a.Timestamp || '')));
    }

    function renderCommunity() {
      const posts = publishedPosts();
      const identity = currentUserIdentity();
      const pending = (state.data.communityPosts || []).filter(post => post.UserID === identity.UserID && !statusIsPublished(post.ReviewStatus) && !statusIsHidden(post.ReviewStatus)).length;
      document.getElementById('community').innerHTML = `
        <div class="workspace-page-action"><div><h3>พื้นที่แบ่งปันสีเขียว</h3><p>เรื่องราวจากเพื่อน ๆ ที่ผ่านการตรวจสอบแล้ว</p></div><div class="btn-row"><button class="btn ghost" onclick="refreshWorkspaceData()">รีเฟรช</button><button class="btn" onclick="openCommunityComposer()">สร้างโพสต์</button></div></div>
        <div class="workspace-community-layout">
          <div class="workspace-feed">
            <details class="panel workspace-compose" id="workspaceComposer">
              <summary><span>${icons.edit} เขียนเรื่องราวของคุณ</span><small>โพสต์จะรอครูตรวจสอบ</small></summary>
              <form id="communityPostForm" class="workspace-compose-form">
                <input type="hidden" name="DisplayName" value="${escapeAttr(identity.DisplayName)}"><input type="hidden" name="ClassName" value="${escapeAttr(identity.ClassName)}"><input type="hidden" name="UserID" value="${escapeAttr(identity.UserID)}">
                <label>หมวดหมู่<select name="Category">${communityCategories().map(item=>`<option>${escapeHtml(item)}</option>`).join('')}</select></label>
                <label>หัวข้อ<input name="PostTitle" required maxlength="90" placeholder="เช่น เปลี่ยนขวดพลาสติกเป็นกระถางต้นไม้"></label>
                <label>เรื่องราวของคุณ<textarea name="PostContent" required minlength="20" rows="5" maxlength="1200" placeholder="เล่าว่าคุณทำอะไร ผลลัพธ์เป็นอย่างไร หรืออยากแนะนำอะไรให้เพื่อน ๆ"></textarea></label>
                <details class="workspace-accordion"><summary>เพิ่มรายละเอียด (ไม่บังคับ)</summary>
                  <div class="field-grid">
                    <label>วิธีที่ใช้<textarea name="MethodUsed" rows="3" maxlength="600"></textarea></label><label>ผลที่ได้<textarea name="Result" rows="3" maxlength="600"></textarea></label>
                    <label>ปัญหาที่พบ<textarea name="Problem" rows="3" maxlength="600"></textarea></label><label>วิธีแก้ไข<textarea name="Solution" rows="3" maxlength="600"></textarea></label>
                  </div>
                  <label>คำแนะนำเพิ่มเติม<textarea name="AdviceToFriends" rows="2" maxlength="400"></textarea></label>
                  <div class="field-grid"><label>ลิงก์รูปภาพ<input name="ImageLinks" type="url" placeholder="https://..."></label><label>แท็ก<input name="Tags" placeholder="เช่น รีไซเคิล, ลดขยะ"></label></div>
                </details>
                <label class="workspace-consent"><input name="CommunityRulesConsent" type="checkbox" required ${communityRulesAccepted()?'checked':''}><span>ยอมรับกติกาชุมชน: ใช้ถ้อยคำสุภาพ ไม่เปิดเผยข้อมูลส่วนตัวของผู้อื่น</span></label>
                <div class="workspace-form-actions"><button class="btn ghost" type="button" onclick="document.getElementById('workspaceComposer').open=false">ยกเลิก</button><button class="btn" type="submit">ส่งโพสต์ให้ครูตรวจสอบ</button></div>
              </form>
            </details>
            ${posts.length ? posts.map(post=>`<div class="panel workspace-feed-card">${postCardHtml(post)}</div>`).join('') : `<div class="panel workspace-empty"><span class="workspace-empty-icon">${icons.community}</span><h3>ยังไม่มีโพสต์ในชุมชน</h3><p>มาเป็นคนแรกที่แบ่งปันเรื่องราวและไอเดียดี ๆ ให้เพื่อน ๆ กัน</p><button class="btn" onclick="openCommunityComposer()">สร้างโพสต์แรก</button></div>`}
          </div>
          <aside class="panel workspace-community-side"><h3>โพสต์ของฉัน</h3><div class="workspace-mini-stat"><strong>${pending}</strong><span>รอการตรวจสอบ</span></div><div class="workspace-mini-stat"><strong>${posts.filter(post=>post.UserID === identity.UserID).length}</strong><span>เผยแพร่แล้ว</span></div><div class="workspace-info">แชร์เฉพาะข้อมูลที่คุณยินดีให้เพื่อนและโรงเรียนเห็น</div><button class="btn ghost" onclick="showPage('chat')">ไปที่ห้องแชท</button></aside>
        </div>`;
      document.getElementById('communityPostForm')?.addEventListener('submit', submitCommunityPost);
    }

    function openCommunityComposer() {
      const composer = document.getElementById('workspaceComposer');
      if (!composer) return;
      composer.open = true;
      composer.scrollIntoView({behavior:'smooth',block:'start'});
      composer.querySelector('[name="PostTitle"]')?.focus();
    }

    function postCardHtml(post) {
      const id = String(post.PostID || '');
      const safe = domId(id);
      const identity = currentUserIdentity();
      const comments = (state.data.postComments || []).filter((comment) => comment.PostID === id && statusIsPublished(comment.ReviewStatus) && !statusIsHidden(comment.ReviewStatus));
      const profile = allProfiles().find((item) => item.UserID === post.UserID || item.DisplayName === post.DisplayName) || {};
      const image = String(post.ImageLinks || '').split(',').map((x) => x.trim()).find(Boolean);
      const arg = escapeAttr(jsString(id));
      return `
        <article class="post-card">
          <div class="btn-row" style="justify-content:space-between;align-items:flex-start">
            <div class="btn-row">
              <div class="avatar">${escapeHtml(avatarText(post.DisplayName))}</div>
              <div>
                <strong>${escapeHtml(post.PostTitle)}</strong>
                <p>${escapeHtml(safeDisplayName(post.DisplayName))} · ${escapeHtml(post.ClassName || '')} · ${escapeHtml(profile.CurrentLevel || '')}</p>
              </div>
            </div>
            <span class="badge earned">${escapeHtml(post.Category || 'Green Story')}</span>
          </div>
          ${image ? `<div class="post-image" style="margin-top:12px"><img src="${escapeAttr(image)}" alt="หลักฐานกิจกรรม" onerror="this.parentElement.style.display='none'"></div>` : ''}
          <p style="margin-top:12px">${escapeHtml(post.PostContent)}</p>
          <div class="grid two" style="margin-top:12px">
            ${post.MethodUsed ? `<div class="notice"><strong>วิธีทำ</strong><br>${escapeHtml(post.MethodUsed)}</div>` : ''}
            ${post.Result ? `<div class="notice"><strong>ผลลัพธ์</strong><br>${escapeHtml(post.Result)}</div>` : ''}
            ${post.Problem ? `<div class="notice"><strong>ปัญหา</strong><br>${escapeHtml(post.Problem)}</div>` : ''}
            ${post.Solution ? `<div class="notice"><strong>แก้ไขอย่างไร</strong><br>${escapeHtml(post.Solution)}</div>` : ''}
          </div>
          ${post.AdviceToFriends ? `<div style="margin-top:12px">${greenBuddy(escapeHtml(post.AdviceToFriends), true)}</div>` : ''}
          <div class="tag-row" style="margin-top:12px">${splitTags(post.Tags).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
          <div class="btn-row" style="margin-top:12px">
            <button class="btn ghost" type="button" onclick="encouragePost(${arg})">ให้กำลังใจ (${Number(post.Likes || 0)})</button>
            <span class="status">${comments.length} ความคิดเห็น</span>
          </div>
          <div class="comment-list">
            ${comments.map((comment) => `<div class="comment-item"><strong>${escapeHtml(safeDisplayName(comment.DisplayName))}</strong> <small>${escapeHtml(comment.ClassName || '')}</small><br>${escapeHtml(comment.CommentText)}</div>`).join('')}
          </div>
          <div class="field-grid" style="margin-top:12px">
            <label>ชื่อผู้แสดงความคิดเห็น<input id="comment-name-${safe}" maxlength="40" value="${escapeAttr(identity.DisplayName)}" readonly></label>
            <label>ความคิดเห็นสร้างสรรค์<input id="comment-text-${safe}" maxlength="300" placeholder="ให้กำลังใจหรือถามวิธีทำ"></label>
          </div>
          <button class="btn secondary" style="margin-top:10px" type="button" onclick="commentOnPost(${arg})">ส่งความคิดเห็นให้ครูตรวจ</button>
        </article>`;
    }

    async function submitCommunityPost(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      if (!communityRulesAccepted() && !data.CommunityRulesConsent) {
        alert('กรุณายอมรับกติกาชุมชนก่อนส่งโพสต์');
        return;
      }
      if (String(data.PostContent || '').trim().length < 20) {
        alert('กรุณาเล่าประสบการณ์ให้ละเอียดขึ้นเล็กน้อย เพื่อให้เพื่อนนำไปทำตามได้');
        return;
      }
      localStorage.setItem('greenPassportCommunityRules', 'accepted');
      const post = {
        PostID: `CP-${Date.now()}`,
        Timestamp: nowStamp(),
        UserID: data.UserID || data.DisplayName || 'guest',
        DisplayName: data.DisplayName,
        ClassName: data.ClassName,
        Category: data.Category,
        PostTitle: data.PostTitle,
        PostContent: data.PostContent,
        MethodUsed: data.MethodUsed,
        Result: data.Result,
        Problem: data.Problem,
        Solution: data.Solution,
        AdviceToFriends: data.AdviceToFriends,
        ImageLinks: data.ImageLinks,
        Tags: data.Tags,
        Likes: 0,
        CommentCount: 0,
        ReviewStatus: 'รอตรวจสอบ',
        TeacherComment: '',
        ApprovedBy: '',
        ApprovedAt: '',
      };
      const submit = form.querySelector('[type="submit"]');
      if (submit?.disabled) return;
      if (submit) { submit.disabled = true; submit.textContent = 'กำลังส่ง...'; }
      try {
        const result = await sheetApi('appendCommunityPost', { post });
        state.data.communityPosts.push(normalizeRow(result.post || post));
        renderCommunity();
        alert('ส่งโพสต์สำเร็จ! ครูจะตรวจสอบก่อนเผยแพร่ในชุมชน');
      } catch (error) {
        console.warn('Community post failed', error);
        alert('ยังส่งโพสต์ไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้ง');
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = 'ส่งโพสต์ให้ครูตรวจสอบ'; }
      }
    }

    async function encouragePost(postId) {
      const post = (state.data.communityPosts || []).find(item => item.PostID === postId);
      try {
        const result = await sheetApi('sendCommunityLike', { postId });
        if (result.post && post) Object.assign(post, normalizeRow(result.post));
        renderCommunity();
      } catch (error) { alert('ยังส่งกำลังใจไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    }

    async function commentOnPost(postId) {
      const safe = domId(postId);
      const identity = currentUserIdentity();
      const name = identity.DisplayName || document.getElementById(`comment-name-${safe}`)?.value.trim();
      const text = document.getElementById(`comment-text-${safe}`)?.value.trim();
      if (!name || !text) {
        alert('กรุณากรอกชื่อและความคิดเห็น');
        return;
      }
      const comment = {
        CommentID: `CM-${Date.now()}`,
        PostID: postId,
        Timestamp: nowStamp(),
        UserID: identity.UserID || name,
        DisplayName: name,
        ClassName: identity.ClassName || '',
        CommentText: text,
        LikeCount: 0,
        ReviewStatus: 'รอตรวจสอบ',
        ReportStatus: '',
      };
      try {
        const result = await sheetApi('appendPostComment', { comment });
        state.data.postComments.push(normalizeRow(result.comment || comment));
        renderCommunity();
        alert('ส่งความคิดเห็นแล้ว กำลังรอครูตรวจสอบ');
      } catch (error) {
        console.warn('Comment submission failed', error);
        alert('ยังส่งความคิดเห็นไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    }

    function renderFriends() {
      const profiles = allProfiles();
      document.getElementById('friends').innerHTML = `
        <div class="panel">
          <h3>เพื่อน Green Passport</h3>
          <p>แสดงรายชื่อแบบปลอดภัย เห็นเฉพาะชื่อที่ย่อแล้ว ระดับ EXP และผลงานด้านสิ่งแวดล้อม เพื่อชวนกันทำภารกิจต่อโดยไม่เปิดเผยข้อมูลส่วนตัว</p>
          <input class="profile-picker" id="friendSearch" type="search" placeholder="ค้นหาชื่อ ชั้น หรือ Level" oninput="filterFriends()">
        </div>
        <div class="grid three" style="margin-top:16px">
          ${profiles.map(friendCardHtml).join('') || '<div class="notice">ยังไม่มีข้อมูลเพื่อนในระบบ</div>'}
        </div>`;
    }

    function friendCardHtml(profile) {
      const id = profile.UserID || profile.DisplayName;
      const arg = escapeAttr(jsString(id));
      const search = [profile.DisplayName, profile.ClassName, profile.LevelName, profile.CurrentLevel].join(' ').toLowerCase();
      return `
        <div class="card friend-card" data-search="${escapeAttr(search)}">
          <div class="btn-row">
            <div class="avatar">${escapeHtml(profile.Avatar || avatarText(profile.DisplayName))}</div>
            <div>
              <strong>${escapeHtml(safeDisplayName(profile.DisplayName))}</strong>
              <p>${escapeHtml(profile.ClassName || '')} · ${escapeHtml(profile.CurrentLevel || '')}</p>
            </div>
          </div>
          <div class="progress-track" style="margin:12px 0"><div class="progress-fill" style="width:${progressToNextLevel(profile.CurrentEXP)}%"></div></div>
          <div class="grid two">
            ${kpi('EXP', Number(profile.CurrentEXP || 0), '')}
            ${kpi('Badge', Number(profile.TotalBadges || 0), 'ชิ้น')}
          </div>
          <p>${escapeHtml(profile.HouseholdStatus || 'กำลังพัฒนาพฤติกรรมลดขยะ')}</p>
          <div class="btn-row">
            <button class="btn ghost" onclick="openProfile(${arg})">ดูโปรไฟล์</button>
            <button class="btn secondary" onclick="openGreenChat()">ชวนคุยใน Green Chat</button>
          </div>
        </div>`;
    }

    function filterFriends() {
      const query = String(document.getElementById('friendSearch')?.value || '').trim().toLowerCase();
      document.querySelectorAll('.friend-card').forEach((card) => {
        card.style.display = !query || card.dataset.search.includes(query) ? '' : 'none';
      });
    }

    function openProfile(profileId) {
      state.profileUserID = profileId;
      showPage('profile');
    }

    function openGreenChat() {
      state.chatRoom = state.chatRoom || (state.data.chatRooms?.[0]?.ChatRoomID || 'CR-MISSION-01');
      showPage('chat');
    }
