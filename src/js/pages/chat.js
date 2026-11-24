    function ensureChatRoom() {
      const rooms = (state.data.chatRooms || defaultChatRooms()).filter((room) => String(room.IsActive) !== 'false');
      if (!rooms.some((room) => room.ChatRoomID === state.chatRoom)) {
        const activeRoom = rooms.find((room) => latestRoomMessage(room.ChatRoomID)) || rooms.find((room) => room.ChatRoomID === 'CR-MISSION-01') || rooms[0];
        state.chatRoom = activeRoom?.ChatRoomID || 'CR-MISSION-01';
      }
      return rooms;
    }

    function chatRoomTone(room) {
      const text = `${room.ChatRoomID || ''} ${room.ChatRoomType || ''} ${room.ChatRoomName || ''}`;
      if (text.includes('TEACHER') || text.includes('ครู')) return 'teacher';
      if (text.includes('MISSION') || text.includes('กิจกรรม') || text.includes('Challenge')) return 'mission';
      return '';
    }

    function latestRoomMessage(roomId) {
      return (state.data.chatMessages || [])
        .filter((message) => message.ChatRoomID === roomId && !statusIsHidden(message.ModerationStatus))
        .sort((a, b) => String(b.Timestamp || '').localeCompare(String(a.Timestamp || '')))[0] || null;
    }

    function chatRoomMembers(roomId) {
      const members = {};
      (state.data.chatMessages || []).filter((message) => message.ChatRoomID === roomId).forEach((message) => {
        const key = message.UserID || message.DisplayName;
        if (!key) return;
        members[key] = { DisplayName: message.DisplayName, ClassName: message.ClassName, UserID: message.UserID };
      });
      return Object.values(members);
    }

    function chatRoomRowHtml(room, activeRoom) {
      const latest = latestRoomMessage(room.ChatRoomID);
      const count = (state.data.chatMessages || []).filter((message) => message.ChatRoomID === room.ChatRoomID && !statusIsHidden(message.ModerationStatus)).length;
      const tone = chatRoomTone(room);
      const preview = latest
        ? `${isOwnMessage(latest) ? 'คุณ' : safeDisplayName(latest.DisplayName)}: ${latest.MessageText || (latest.ImageLink ? 'ส่งรูปภาพ' : 'ข้อความใหม่')}`
        : (room.Description || 'ยังไม่มีข้อความ');
      return `
        <button class="chat-room-row ${room.ChatRoomID === activeRoom.ChatRoomID ? 'active' : ''}" type="button" onclick="setChatRoom('${escapeAttr(room.ChatRoomID)}')">
          <span class="room-avatar ${tone}">${escapeHtml(avatarText(room.ChatRoomName || 'GC'))}</span>
          <span class="chat-room-copy">
            <span class="room-title">${escapeHtml(room.ChatRoomName)}</span>
            <span class="room-preview">${escapeHtml(preview)}</span>
          </span>
          <span class="chat-room-meta">
            <span class="room-time">${latest ? escapeHtml(chatTimeLabel(latest.Timestamp)) : ''}</span>
            ${count ? `<span class="room-unread">${count > 99 ? '99+' : count}</span>` : ''}
          </span>
        </button>`;
    }

    function parseChatDate(value) {
      const text = String(value || '').trim();
      if (!text) return null;
      const direct = new Date(text.replace(' ', 'T'));
      if (!Number.isNaN(direct.getTime())) return direct;
      const match = text.match(/(\d{4})-(\d{2})-(\d{2}).*?(\d{1,2}):(\d{2})/);
      if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
      return null;
    }

    function chatDayKey(value) {
      const date = parseChatDate(value);
      if (!date) return String(value || '').slice(0, 10) || 'today';
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function chatDateLabel(value) {
      const date = parseChatDate(value);
      if (!date) return String(value || 'วันนี้').slice(0, 16);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const key = chatDayKey(value);
      const todayKey = chatDayKey(today.toISOString());
      const yesterdayKey = chatDayKey(yesterday.toISOString());
      if (key === todayKey) return 'วันนี้';
      if (key === yesterdayKey) return 'เมื่อวาน';
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function chatTimeLabel(value) {
      const date = parseChatDate(value);
      if (date) return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const match = String(value || '').match(/\d{1,2}:\d{2}/);
      return match ? match[0] : '';
    }

    function isTeacherMessage(message) {
      const text = `${message.UserID || ''} ${message.ClassName || ''} ${message.DisplayName || ''} ${message.MessageType || ''}`;
      return text.includes('TEACHER') || text.includes('Admin') || text.includes('ครู') || text.includes('announcement');
    }

    function isSystemMessage(message) {
      return String(message.MessageType || '').toLowerCase() === 'system';
    }

    function isOwnMessage(message) {
      const identity = currentUserIdentity();
      return !!((identity.UserID && message.UserID === identity.UserID) || (identity.DisplayName && message.DisplayName === identity.DisplayName));
    }

    function chatMessageStreamHtml(messages) {
      let lastDay = '';
      return messages.map((message, index) => {
        const day = chatDayKey(message.Timestamp);
        const sender = message.UserID || message.DisplayName || '';
        const prev = messages[index - 1];
        const next = messages[index + 1];
        const prevSame = prev && !isSystemMessage(prev) && chatDayKey(prev.Timestamp) === day && (prev.UserID || prev.DisplayName || '') === sender;
        const nextSame = next && !isSystemMessage(next) && chatDayKey(next.Timestamp) === day && (next.UserID || next.DisplayName || '') === sender;
        const divider = day !== lastDay ? `<div class="chat-date-divider"><span>${escapeHtml(chatDateLabel(message.Timestamp))}</span></div>` : '';
        lastDay = day;
        return divider + chatMessageHtml(message, {
          compact: prevSame && !isSystemMessage(message),
          groupFirst: !prevSame,
          groupLast: !nextSame,
        });
      }).join('');
    }

    function chatMessageHtml(message, options = {}) {
      if (isSystemMessage(message)) return `<div class="chat-system">${escapeHtml(message.MessageText)}</div>`;
      const id = String(message.MessageID || '');
      const arg = escapeAttr(jsString(id));
      const reported = String(message.ReportStatus || '').trim();
      const own = isOwnMessage(message);
      const teacher = isTeacherMessage(message);
      const reactions = state.chatReactions?.[id] || {};
      const reactionEntries = Object.entries(reactions).filter(([, count]) => Number(count) > 0);
      const reply = message.ReplyToMessageID ? (state.data.chatMessages || []).find((item) => item.MessageID === message.ReplyToMessageID) : null;
      const image = String(message.ImageLink || '').trim();
      const onlyImage = image && !String(message.MessageText || '').trim();
      const classes = [
        'chat-message',
        own ? 'own' : '',
        teacher ? 'teacher' : '',
        options.compact ? 'compact' : '',
        options.groupFirst ? 'group-first' : '',
        options.groupLast ? 'group-last' : '',
        message.MessageType === 'sticker' ? 'sticker' : '',
        onlyImage ? 'image-only' : '',
      ].filter(Boolean).join(' ');
      return `
        <div class="${classes}" data-msg-id="${escapeAttr(id)}">
          ${own ? '' : `<button class="chat-avatar ${teacher ? 'teacher' : chatRoomTone({ ChatRoomID: message.ChatRoomID })}" type="button" onclick="showChatProfile(${escapeAttr(jsString(message.UserID || message.DisplayName))})" title="${escapeAttr(safeDisplayName(message.DisplayName))}">${escapeHtml(avatarText(message.DisplayName))}</button>`}
          <div class="chat-stack">
            ${(!own && options.groupFirst) ? `
              <div class="chat-sender">
                <button class="chat-sender-btn" type="button" onclick="showChatProfile(${escapeAttr(jsString(message.UserID || message.DisplayName))})">${escapeHtml(safeDisplayName(message.DisplayName))}</button>
                ${teacher ? '<span class="teacher-badge">ครูผู้ดูแล</span>' : (message.ClassName ? `<span>${escapeHtml(message.ClassName)}</span>` : '')}
              </div>` : ''}
            <div class="chat-bubble-row">
              <div class="chat-bubble ${reported ? 'reported' : ''}" ondblclick="reactToMessage(${arg}, '💚')" onclick="toggleMobileChatActions(this)">
                ${truthy(message.IsPinned) ? '<span class="badge earned chat-pin-tag">ปักหมุด</span>' : ''}
                ${reported ? '<span class="status bad chat-pin-tag">ถูกรายงาน</span>' : ''}
                ${reply ? `<div class="chat-quote"><strong>${escapeHtml(safeDisplayName(reply.DisplayName))}</strong><span>${escapeHtml(String(reply.MessageText || 'รูปภาพ').slice(0, 80))}</span></div>` : ''}
                ${message.MessageText ? `<div class="chat-text">${escapeHtml(message.MessageText)}</div>` : ''}
                ${image ? `<img class="chat-image" src="${escapeAttr(image)}" alt="รูปภาพที่แชร์ใน Green Chat" onclick="event.stopPropagation();openChatImage('${escapeAttr(image)}')" onerror="this.style.display='none'">` : ''}
                ${reactionEntries.length ? `<div class="chat-reactions">${reactionEntries.map(([emoji, count]) => `<button class="chat-reaction" type="button" onclick="event.stopPropagation();reactToMessage(${arg}, '${escapeAttr(emoji)}')">${emoji}${count > 1 ? ` <span>${count}</span>` : ''}</button>`).join('')}</div>` : ''}
              </div>
              <div class="chat-actions" role="toolbar" aria-label="ตัวเลือกข้อความ">
                ${['💚','👍','😂','😮'].map((emoji) => `<button class="chat-action-emoji" type="button" onclick="event.stopPropagation();reactToMessage(${arg}, '${emoji}')" title="ส่ง ${emoji}">${emoji}</button>`).join('')}
                <button class="chat-action" type="button" onclick="event.stopPropagation();replyToChatMessage(${arg})" title="ตอบกลับ">↩</button>
                ${own ? '' : `<button class="chat-action" type="button" onclick="event.stopPropagation();reportChatMessage(${arg})" title="รายงานข้อความ">⚑</button>`}
              </div>
            </div>
            ${options.groupLast ? `<div class="chat-time">${escapeHtml(chatTimeLabel(message.Timestamp))}${own ? ' · ส่งแล้ว' : ''}</div>` : ''}
          </div>
        </div>`;
    }

    function renderChat() {
      const rooms = ensureChatRoom();
      const query = String(state.chatSearch || '').trim().toLowerCase();
      const filteredRooms = query
        ? rooms.filter(r => `${r.ChatRoomName || ''} ${r.ChatRoomType || ''} ${r.Description || ''}`.toLowerCase().includes(query))
        : rooms;
      const room = rooms.find((item) => item.ChatRoomID === state.chatRoom) || rooms[0] || {};
      const messages = (state.data.chatMessages || [])
        .filter((message) => message.ChatRoomID === room.ChatRoomID && !statusIsHidden(message.ModerationStatus))
        .sort((a, b) => String(a.Timestamp || '').localeCompare(String(b.Timestamp || '')));
      const members = chatRoomMembers(room.ChatRoomID);
      const reply = state.replyToMessageID ? messages.find((message) => message.MessageID === state.replyToMessageID) : null;
      const mobileList = state.chatMobileView === 'list';

      document.getElementById('chat').innerHTML = `
        <div class="chat-layout ${mobileList ? 'is-mobile-list' : 'is-mobile-thread'}">
          <aside class="chat-sidebar">
            <div class="chat-sidebar-head">
              <div class="chat-sidebar-title-row">
                <h3>แชท</h3>
                <button class="chat-icon-btn" type="button" onclick="askTeacherShortcut()" title="ทักหาครู">👩‍🏫</button>
              </div>
              <label class="chat-search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input type="search" id="chatRoomSearch" placeholder="ค้นหาห้องแชท..." value="${escapeAttr(state.chatSearch || '')}" oninput="filterChatRooms(this.value)">
              </label>
            </div>
            <div class="chat-room-list" id="chatRoomList">
              ${filteredRooms.length ? filteredRooms.map((item) => chatRoomRowHtml(item, room)).join('') : '<p class="chat-room-empty">ไม่พบห้องแชทที่ค้นหา</p>'}
            </div>
            <div class="chat-room-safe">พื้นที่สนทนาปลอดภัยสำหรับโรงเรียน · <button type="button" class="chat-link-inline" onclick="showChatRules()">กติกา</button></div>
          </aside>
          <section class="chat-shell">
            <header class="chat-header">
              <div class="chat-header-main">
                <button class="chat-icon-btn chat-mobile-back" type="button" onclick="showChatRoomList()" title="กลับไปหน้ารายการแชท" aria-label="กลับไปหน้ารายการแชท">‹</button>
                <div class="room-avatar ${chatRoomTone(room)}">${escapeHtml(avatarText(room.ChatRoomName || 'GC'))}</div>
                <div class="chat-header-title">
                  <span class="chat-line-title">${escapeHtml(room.ChatRoomName || 'Green Chat')}</span>
                  <span class="chat-line-sub">${members.length || 1} สมาชิก · ${escapeHtml(room.TeacherModerator || 'ครูผู้ดูแล')}</span>
                </div>
              </div>
              <div class="chat-toolbar">
                <button class="chat-icon-btn" type="button" onclick="showChatMembers()" title="สมาชิกในห้อง">👥</button>
                <button class="chat-icon-btn" type="button" onclick="showChatMedia()" title="รูปภาพที่แชร์">🖼</button>
                <button class="chat-icon-btn" type="button" onclick="showChatInfoModal()" title="ข้อมูลห้องและกติกา">ⓘ</button>
              </div>
            </header>
            <div class="chat-window" id="chatWindow">
              ${truthy(messages.find((message) => truthy(message.IsPinned))?.IsPinned) ? `<div class="chat-system">📌 มีข้อความปักหมุดในห้องนี้</div>` : ''}
              ${messages.length ? chatMessageStreamHtml(messages) : '<div class="chat-system">ยังไม่มีข้อความในห้องนี้ เริ่มทักทายเพื่อน ๆ ได้เลย 👋</div>'}
            </div>
            <form class="chat-composer" id="chatForm" onsubmit="sendChatMessage(event)">
              <div class="chat-reply-bar" id="chatReplyBar" ${reply ? '' : 'hidden'}>
                <div class="chat-reply-bar-copy">
                  <small>กำลังตอบกลับ ${reply ? escapeHtml(safeDisplayName(reply.DisplayName)) : ''}</small>
                  <span>${reply ? escapeHtml(String(reply.MessageText || 'รูปภาพ').slice(0, 90)) : ''}</span>
                </div>
                <button class="chat-icon-btn chat-reply-close" type="button" onclick="clearChatReply()" aria-label="ยกเลิกการตอบกลับ">×</button>
              </div>
              <div class="chat-image-preview" id="chatImagePreview" hidden>
                <img id="chatImagePreviewThumb" alt="ตัวอย่างรูปที่จะส่ง">
                <span id="chatImagePreviewName"></span>
                <button type="button" class="chat-icon-btn chat-reply-close" onclick="clearChatImage()" aria-label="ลบรูปที่เลือก">×</button>
              </div>
              <div class="chat-emoji-tray" id="chatEmojiTray" hidden>
                <div class="chat-tray-section">
                  ${['🌱','♻️','💚','🍃','🌍','🏡','🗑️','📷','⭐','🏆','👍','😂','😮','🙌'].map((emoji) => `<button class="chat-reaction" type="button" onclick="insertChatEmoji('${emoji}')">${emoji}</button>`).join('')}
                </div>
                <div class="chat-tray-stickers">
                  ${['เก่งมาก 💚','สู้ ๆ 🌱','ไอเดียดีมาก 🍃','สุดยอด ⭐','ช่วยโลกได้อีกก้าว 🌍'].map((text) => `<button class="chat-sticker" type="button" onclick="sendSticker(${escapeAttr(jsString(text))})">${escapeHtml(text)}</button>`).join('')}
                </div>
              </div>
              <input id="chatImageFile" type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="showChatImageName()">
              <div class="chat-compose-pill">
                <button class="chat-pill-btn" type="button" onclick="document.getElementById('chatImageFile').click()" title="ส่งรูปภาพ">📷</button>
                <button class="chat-pill-btn" type="button" onclick="toggleChatTray('chatEmojiTray')" title="อิโมจิและสติกเกอร์">☺</button>
                <textarea id="chatMessageInput" name="MessageText" rows="1" maxlength="500" placeholder="ส่งข้อความ..." oninput="updateChatComposerState(this)" onkeydown="chatTextareaKey(event)"></textarea>
                <button class="chat-quick-heart" id="chatQuickHeart" type="button" onclick="sendSticker('💚')" title="ส่งหัวใจสีเขียว">💚</button>
                <button class="chat-send-btn" id="chatSendBtn" type="submit" title="ส่งข้อความ" hidden>ส่ง</button>
              </div>
            </form>
          </section>
        </div>`;
      requestAnimationFrame(() => {
        const windowEl = document.getElementById('chatWindow');
        if (windowEl) windowEl.scrollTop = windowEl.scrollHeight;
      });
    }

    function updateChatComposerState(textarea) {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 110)}px`;
      }
      const hasText = !!String(document.getElementById('chatMessageInput')?.value || '').trim();
      const hasFile = !!(document.getElementById('chatImageFile')?.files?.length);
      const sendBtn = document.getElementById('chatSendBtn');
      const heartBtn = document.getElementById('chatQuickHeart');
      if (sendBtn && heartBtn) {
        sendBtn.hidden = !(hasText || hasFile);
        heartBtn.hidden = (hasText || hasFile);
      }
    }

    function filterChatRooms(value) {
      state.chatSearch = value;
      const list = document.getElementById('chatRoomList');
      if (!list) return;
      const rooms = ensureChatRoom();
      const room = rooms.find((item) => item.ChatRoomID === state.chatRoom) || rooms[0] || {};
      const query = String(value || '').trim().toLowerCase();
      const filtered = query
        ? rooms.filter(r => `${r.ChatRoomName || ''} ${r.ChatRoomType || ''} ${r.Description || ''}`.toLowerCase().includes(query))
        : rooms;
      list.innerHTML = filtered.length ? filtered.map((item) => chatRoomRowHtml(item, room)).join('') : '<p class="chat-room-empty">ไม่พบห้องแชทที่ค้นหา</p>';
    }

    function showChatRoomList() {
      state.chatMobileView = 'list';
      renderChat();
    }

    function toggleMobileChatActions(bubble) {
      const msg = bubble?.closest('.chat-message');
      if (!msg) return;
      const wasOpen = msg.classList.contains('show-actions');
      document.querySelectorAll('.chat-message.show-actions').forEach(el => el.classList.remove('show-actions'));
      if (!wasOpen) msg.classList.add('show-actions');
    }

    function refreshChatMessages() {
      const windowEl = document.getElementById('chatWindow');
      if (!windowEl) { renderChat(); return; }
      const messages = (state.data.chatMessages || []).filter(m => m.ChatRoomID === state.chatRoom && !statusIsHidden(m.ModerationStatus)).sort((a,b)=>String(a.Timestamp||'').localeCompare(String(b.Timestamp||'')));
      const nearBottom = windowEl.scrollHeight - windowEl.clientHeight - windowEl.scrollTop < 100;
      const previousTop = windowEl.scrollTop;
      windowEl.innerHTML = messages.length ? `${messages.some(m=>truthy(m.IsPinned)) ? '<div class="chat-system">📌 มีข้อความปักหมุดในห้องนี้</div>' : ''}${chatMessageStreamHtml(messages)}` : '<div class="chat-system">ยังไม่มีข้อความ ลองทักทายเพื่อน ๆ ได้เลย 👋</div>';
      windowEl.scrollTop = nearBottom ? windowEl.scrollHeight : previousTop;
    }

    function setChatRoom(roomId) {
      state.chatRoom = roomId;
      state.replyToMessageID = '';
      state.chatMobileView = 'thread';
      if (firebaseDb) {
        subscribeToFirebaseChat(roomId);
      }
      renderChat();
    }

    function toggleChatTray(id) {
      const el = document.getElementById(id);
      if (el) el.hidden = !el.hidden;
    }

    function insertChatEmoji(emoji) {
      const input = document.getElementById('chatMessageInput');
      if (!input) return;
      input.value = `${input.value || ''}${emoji}`;
      updateChatComposerState(input);
      input.focus();
    }

    function chatTextareaKey(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('chatForm')?.requestSubmit();
      }
    }

    function showChatImageName() {
      const file = document.getElementById('chatImageFile')?.files?.[0];
      const preview = document.getElementById('chatImagePreview');
      const thumb = document.getElementById('chatImagePreviewThumb');
      const name = document.getElementById('chatImagePreviewName');
      if (file && preview && thumb && name) {
        name.textContent = file.name;
        const reader = new FileReader();
        reader.onload = () => { thumb.src = reader.result; };
        reader.readAsDataURL(file);
        preview.hidden = false;
      } else if (preview) {
        preview.hidden = true;
      }
      updateChatComposerState(document.getElementById('chatMessageInput'));
    }

    function clearChatImage() {
      const fileInput = document.getElementById('chatImageFile');
      if (fileInput) fileInput.value = '';
      const preview = document.getElementById('chatImagePreview');
      if (preview) preview.hidden = true;
      updateChatComposerState(document.getElementById('chatMessageInput'));
    }

    function replyToChatMessage(messageId) {
      state.replyToMessageID = messageId;
      renderChat();
      document.getElementById('chatMessageInput')?.focus();
    }

    function clearChatReply() {
      state.replyToMessageID = '';
      renderChat();
    }

    function reactToMessage(messageId, emoji) {
      state.chatReactions ||= {};
      state.chatReactions[messageId] ||= {};
      state.chatReactions[messageId][emoji] = Number(state.chatReactions[messageId][emoji] || 0) + 1;
      localStorage.setItem('greenPassportChatReactions', JSON.stringify(state.chatReactions));
      refreshChatMessages();
    }

    function openChatDialog(title, bodyHtml) {
      let dialog = document.getElementById('gpChatModal');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'gpChatModal';
        dialog.className = 'workspace-menu-dialog chat-modal-dialog';
        document.body.append(dialog);
      }
      dialog.innerHTML = `<header><div><small>GREEN CHAT</small><h2>${escapeHtml(title)}</h2></div><button type="button" onclick="document.getElementById('gpChatModal').close()" aria-label="ปิด">×</button></header><div class="chat-modal-body">${bodyHtml}</div>`;
      if (!dialog.open) dialog.showModal();
    }

    function openChatImage(src) {
      openChatDialog('รูปภาพในแชท', `<img class="chat-modal-image" src="${escapeAttr(src)}" alt="รูปภาพใน Green Chat">`);
    }

    function showChatMembers() {
      const members = chatRoomMembers(state.chatRoom);
      const html = members.length
        ? `<div class="chat-modal-list">${members.map((member) => `<div class="chat-modal-item"><span class="chat-avatar">${escapeHtml(avatarText(member.DisplayName))}</span><div><strong>${escapeHtml(safeDisplayName(member.DisplayName))}</strong><small>${escapeHtml(member.ClassName || 'สมาชิก')}</small></div></div>`).join('')}</div>`
        : '<p class="workspace-hint">ยังไม่มีรายชื่อสมาชิกในห้องนี้</p>';
      openChatDialog(`สมาชิกในห้อง (${members.length})`, html);
    }

    function showChatMedia() {
      const images = (state.data.chatMessages || []).filter((message) => message.ChatRoomID === state.chatRoom && message.ImageLink && !statusIsHidden(message.ModerationStatus));
      const html = images.length
        ? `<div class="chat-media-grid">${images.map((message) => `<button type="button" class="chat-media-thumb" onclick="openChatImage('${escapeAttr(message.ImageLink)}')"><img src="${escapeAttr(message.ImageLink)}" alt="${escapeAttr(safeDisplayName(message.DisplayName))}"><span>${escapeHtml(safeDisplayName(message.DisplayName))}</span></button>`).join('')}</div>`
        : '<p class="workspace-hint">ยังไม่มีรูปภาพที่แชร์ในห้องนี้</p>';
      openChatDialog(`รูปภาพที่แชร์ (${images.length})`, html);
    }

    function showChatRules() {
      openChatDialog('กติกา Green Chat', `<ol class="chat-rules-list"><li>ใช้ถ้อยคำสุภาพและให้กำลังใจกัน</li><li>ไม่เปิดเผยเบอร์โทร ที่อยู่ หรือบัญชีส่วนตัว</li><li>พูดคุยเรื่องการลดขยะและภารกิจสีเขียว</li><li>กดรายงานข้อความที่ไม่เหมาะสมให้ครูตรวจสอบได้ทันที</li></ol>`);
    }

    function showChatInfoModal() {
      const rooms = ensureChatRoom();
      const room = rooms.find((item) => item.ChatRoomID === state.chatRoom) || rooms[0] || {};
      const notifOff = localStorage.getItem('greenPassportChatNotifications') === 'off';
      openChatDialog(room.ChatRoomName || 'ข้อมูลห้องแชท', `
        <p class="workspace-hint" style="margin-bottom:12px">${escapeHtml(room.Description || 'ห้องสนทนา Green Passport')}</p>
        <div class="chat-info-actions">
          <button type="button" class="btn ghost" onclick="showChatMembers()">ดูสมาชิกในห้อง</button>
          <button type="button" class="btn ghost" onclick="showChatMedia()">ดูรูปภาพที่แชร์</button>
          <button type="button" class="btn ghost" onclick="showChatRules()">อ่านกติกา</button>
          <button type="button" class="btn ghost" onclick="toggleChatNotifications();showChatInfoModal()">แจ้งเตือน: ${notifOff ? 'ปิด' : 'เปิด'}</button>
        </div>`);
    }

    function showChatProfile(profileId) {
      const profile = allProfiles().find((item) => item.UserID === profileId || item.DisplayName === profileId);
      if (!profile) {
        openChatDialog('โปรไฟล์สมาชิก', '<p class="workspace-hint">ยังไม่มีข้อมูลโปรไฟล์ของผู้ใช้นี้</p>');
        return;
      }
      openChatDialog(safeDisplayName(profile.DisplayName), `
        <div class="chat-modal-item" style="margin-bottom:12px">
          <span class="chat-avatar">${escapeHtml(avatarText(profile.DisplayName))}</span>
          <div><strong>${escapeHtml(safeDisplayName(profile.DisplayName))}</strong><small>${escapeHtml(profile.ClassName || 'สมาชิก')}</small></div>
        </div>
        <div class="workspace-mini-stat"><span>ระดับ</span><strong>${escapeHtml(profile.CurrentLevel || 'ต้นกล้า')}</strong></div>
        <div class="workspace-mini-stat"><span>EXP สะสม</span><strong>${Number(profile.CurrentEXP || 0)}</strong></div>
        <div class="workspace-mini-stat"><span>Badge</span><strong>${Number(profile.TotalBadges || 0)}</strong></div>`);
    }

    function askTeacherShortcut() {
      state.chatRoom = 'CR-TEACHER-01';
      state.chatMobileView = 'thread';
      renderChat();
      const input = document.getElementById('chatMessageInput');
      if (input) {
        input.value = 'ครูครับ/ค่ะ ขอสอบถามเรื่อง ';
        updateChatComposerState(input);
        input.focus();
      }
    }

    function toggleChatNotifications() {
      const key = 'greenPassportChatNotifications';
      const next = localStorage.getItem(key) === 'off' ? 'on' : 'off';
      localStorage.setItem(key, next);
      workspaceToast(`แจ้งเตือน Green Chat: ${next === 'on' ? 'เปิด' : 'ปิด'}`);
    }

    function moderateMessageText(text) {
      const value = String(text || '').trim();
      if (/(https?:\/\/|www\.)/i.test(value)) return { ok: false, message: 'ยังไม่อนุญาตให้ส่งลิงก์ใน Green Chat' };
      if (/\d{8,}/.test(value.replace(/[\s-]/g, ''))) return { ok: false, message: 'ไม่ควรส่งเบอร์โทรหรือข้อมูลติดต่อส่วนตัวใน Green Chat' };
      if (/(ที่อยู่|เบอร์|ไลน์|line id|facebook|ig|instagram)/i.test(value)) return { ok: false, message: 'กรุณาไม่เปิดเผยข้อมูลส่วนตัวหรือช่องทางติดต่อ' };
      if (/(โง่|เกลียด|ด่า|หยาบ|บูลลี่)/i.test(value)) return { ok: false, message: 'กรุณาใช้ถ้อยคำสุภาพและให้กำลังใจกัน' };
      return { ok: true };
    }

    async function sendChatMessage(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const input = document.getElementById('chatMessageInput');
      const file = document.getElementById('chatImageFile')?.files?.[0];
      const text = String(input?.value || '').trim();
      if (!text && !file) { alert('กรุณาพิมพ์ข้อความหรือแนบรูปภาพก่อนส่ง'); return; }
      if (file && (file.size > 5*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type))) { alert('รองรับรูป JPG, PNG, WebP ขนาดไม่เกิน 5 MB'); return; }
      const check = moderateMessageText(text);
      if (!check.ok) { alert(check.message); return; }
      const button = form.querySelector('[type="submit"]');
      if (button?.disabled) return;
      if (button) button.disabled = true;
      try {
        const room = state.chatRoom;
        const identity = currentUserIdentity();
        const imagePayload = file ? (await filesToPayload([file]))[0] : null;
        const message = {
          MessageID: `MSG-${Date.now()}`, ChatRoomID: room, Timestamp: nowStamp(),
          UserID: identity.UserID, DisplayName: identity.DisplayName, ClassName: identity.ClassName,
          MessageText: text, ImageLink: imagePayload?.data || '', MessageType: imagePayload ? 'image' : 'text',
          ReplyToMessageID: state.replyToMessageID || '', IsPinned: false, ReportStatus: '', ModerationStatus: 'ปกติ'
        };
        if (firebaseDb) await firebaseDb.ref(`chatMessages/${room}/${message.MessageID}`).set(message);
        else {
          const result = await sheetApi('appendChatMessage', { message });
          state.data.chatMessages.push(normalizeRow(result.message || message));
        }
        if (state.active === 'chat' && state.chatRoom === room) {
          state.replyToMessageID = ''; form.reset(); renderChat();
          document.getElementById('chatMessageInput')?.focus();
        }
      } catch (error) {
        console.warn('Chat message failed', error);
        alert('ส่งข้อความไม่สำเร็จ ลองใหม่อีกครั้งได้เลย ข้อความที่พิมพ์ไว้ยังอยู่');
      } finally { if (button) button.disabled = false; }
    }

    async function sendSticker(text) {
      const identity = currentUserIdentity();
      if (!identity.DisplayName) {
        alert('กรุณาเข้าสู่ระบบก่อนส่งข้อความ');
        return;
      }
      const message = {
        MessageID: `MSG-${Date.now()}`,
        ChatRoomID: state.chatRoom,
        Timestamp: nowStamp(),
        UserID: identity.UserID || identity.DisplayName || 'guest',
        DisplayName: identity.DisplayName,
        ClassName: identity.ClassName || '',
        MessageText: text,
        ImageLink: '',
        MessageType: 'sticker',
        ReplyToMessageID: state.replyToMessageID || '',
        IsPinned: false,
        ReportStatus: '',
        ModerationStatus: 'ปกติ',
      };
      try {
        if (firebaseDb) {
          await firebaseDb.ref(`chatMessages/${state.chatRoom}/${message.MessageID}`).set(message);
        } else {
          const result = await sheetApi('appendChatMessage', { message });
          state.data.chatMessages.push(normalizeRow(result.message || message));
        }
        state.replyToMessageID = '';
        saveToLocalStorage();
        renderChat();
      } catch (error) {
        console.warn('Send sticker failed', error);
        alert(error.message || 'ส่งสติกเกอร์ไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    }

    async function reportChatMessage(messageId) {
      if (!await customConfirm('รายงานข้อความนี้ให้ครูตรวจสอบหรือไม่')) return;
      const message = (state.data.chatMessages || []).find((item) => item.MessageID === messageId);
      if (message) {
        message.ReportStatus = 'ถูกรายงาน';
        message.ModerationStatus = 'รอครูตรวจสอบ';
      }
      if (firebaseDb) {
        try {
          await firebaseDb.ref(`chatMessages/${state.chatRoom}/${messageId}`).update({
            ReportStatus: 'ถูกรายงาน',
            ModerationStatus: 'รอครูตรวจสอบ'
          });
        } catch (error) {
          console.error("Firebase report message error:", error);
        }
      } else {
        try {
          await sheetApi('reportChatMessage', { messageId });
        } catch (error) {
          queuePendingWrite('reportChatMessage', { messageId });
        }
      }
      saveToLocalStorage();
      renderChat();
    }
