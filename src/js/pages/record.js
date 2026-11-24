    function myWasteRecords() {
      const myId = String(currentUserIdentity().UserID || '');
      return (state.data.wasteRecords || [])
        .filter(r => String(r.UserID || '') === myId)
        .sort((a, b) => String(b.ReportMonth || b.SubmittedAt || '').localeCompare(String(a.ReportMonth || a.SubmittedAt || '')));
    }

    function wasteRecordKey(record) {
      return String(record?.RecordID || record?._rowNumber || '');
    }

    function findOwnWasteRecord(recordId) {
      const key = String(recordId || '');
      if (!key) return null;
      return myWasteRecords().find(r => String(r.RecordID || '') === key || String(r._rowNumber || '') === key) || null;
    }

    function niceRecordMonth(value) {
      const fallback = new Date().toISOString().slice(0, 7);
      const date = new Date(String(value || fallback) + '-01T12:00:00');
      return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    }

    function renderMyWasteRecordsHtml() {
      const records = myWasteRecords();
      if (!records.length) {
        return `<section class="panel workspace-my-records">
          <div class="workspace-card-heading"><div><h3>รายการบันทึกของฉัน</h3><p>รายการที่คุณส่งแล้วจะแสดงที่นี่เพื่อให้แก้ไขหรือลบได้</p></div></div>
          <p class="workspace-hint" style="margin-top:10px">ยังไม่มีรายการบันทึกขยะของคุณ</p>
        </section>`;
      }
      return `<section class="panel workspace-my-records">
        <div class="workspace-card-heading"><div><h3>รายการบันทึกของฉัน (${records.length})</h3><p>สามารถแก้ไขข้อมูลหรือลบรายการที่บันทึกไว้ได้</p></div></div>
        <div class="workspace-record-list">${records.map(r => {
          const key = wasteRecordKey(r);
          const status = r.ReviewStatus || 'รอตรวจสอบ';
          const isApproved = status === 'ผ่านการตรวจสอบ';
          const isEditing = state.editingRecordId && state.editingRecordId === key;
          const summary = `ทั่วไป ${format(r.GeneralWasteKg || 0)} · รีไซเคิล ${format(r.RecycleWasteKg || 0)} · อินทรีย์ ${format(r.OrganicWasteKg || 0)} · อันตราย ${format(r.HazardousWasteAmount || 0)} กก.`;
          return `<div class="workspace-record-row ${isEditing ? 'is-editing' : ''}">
            <span class="workspace-record-icon">${icons.edit}</span>
            <div class="workspace-record-name">
              <strong>${escapeHtml(niceRecordMonth(r.ReportMonth))} · ${format(r.TotalCO2e || 0)} kgCO₂e</strong>
              <small>${escapeHtml(summary)}</small>
              ${r.TeacherComment ? `<small class="workspace-record-comment">หมายเหตุครู: ${escapeHtml(r.TeacherComment)}</small>` : ''}
            </div>
            <span class="workspace-record-status ${isApproved ? 'is-approved' : ''}">${escapeHtml(status)}</span>
            <div class="workspace-record-actions">
              ${r.EvidenceFolderLink ? `<a class="btn ghost workspace-btn-sm" href="${escapeAttr(r.EvidenceFolderLink)}" target="_blank" rel="noopener">หลักฐาน</a>` : ''}
              <button type="button" class="btn ghost workspace-btn-sm" onclick="editWasteRecord('${escapeAttr(key)}')">แก้ไข</button>
              <button type="button" class="btn danger workspace-btn-sm" onclick="deleteWasteRecord('${escapeAttr(key)}')">ลบ</button>
            </div>
          </div>`;
        }).join('')}</div>
      </section>`;
    }

    async function editWasteRecord(recordId) {
      const target = findOwnWasteRecord(recordId);
      if (!target) {
        alert('ไม่พบรายการบันทึกขยะที่ต้องการแก้ไข');
        return;
      }
      const nextKey = wasteRecordKey(target);
      if (state.active === 'record' && state.recordDirty && state.editingRecordId !== nextKey) {
        if (!await customConfirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการสลับไปแก้ไขรายการนี้หรือไม่?')) return;
      }
      state.editingRecordId = nextKey;
      state.recordDirty = false;
      if (state.active !== 'record') {
        await showPage('record');
      } else {
        renderRecord();
      }
      document.getElementById('recordForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function cancelEditWasteRecord() {
      state.editingRecordId = '';
      state.recordDirty = false;
      renderRecord();
    }

    async function deleteWasteRecord(recordId) {
      const target = findOwnWasteRecord(recordId);
      if (!target) {
        alert('ไม่พบรายการบันทึกขยะที่ต้องการลบ');
        return;
      }
      const monthLabel = niceRecordMonth(target.ReportMonth);
      if (!await customConfirm(`ต้องการลบรายการบันทึกขยะเดือน ${monthLabel} หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
      try {
        await sheetApi('deleteWasteRecord', { recordId: target.RecordID || '', row: target._rowNumber || null });
        const key = wasteRecordKey(target);
        state.data.wasteRecords = (state.data.wasteRecords || []).filter(r => wasteRecordKey(r) !== key);
        if (target.RecordID) {
          state.data.expLogs = (state.data.expLogs || []).filter(log => !(log.ActivityType === 'waste-submission' && String(log.RelatedID || '') === String(target.RecordID)));
        }
        if (state.editingRecordId === key) {
          state.editingRecordId = '';
          state.recordDirty = false;
        }
        refreshLocalDashboard(); applyCurrentUserToState(); saveToLocalStorage();
        renderAll();
        workspaceToast('ลบรายการบันทึกขยะเรียบร้อยแล้ว');
      } catch (error) {
        console.warn('Record deletion failed', error);
        alert(error.message || 'ไม่สามารถลบรายการบันทึกขยะได้ กรุณาลองอีกครั้ง');
      }
    }

    function renderRecord() {
      const editing = state.editingRecordId ? findOwnWasteRecord(state.editingRecordId) : null;
      if (state.editingRecordId && !editing) state.editingRecordId = '';
      const month = editing?.ReportMonth || new Date().toISOString().slice(0, 7);
      const defaults = authRecordDefaults();
      state.recordDirty = false;
      const hasExistingEvidence = !!(editing && ((Array.isArray(editing.EvidencePaths) && editing.EvidencePaths.length) || editing.EvidenceFileNames));
      const activityGroups = [
        ['วัสดุรีไซเคิล', activityFields.slice(0,7)],
        ['จัดการขยะอินทรีย์', activityFields.slice(7,10)],
        ['ลดการใช้และใช้ซ้ำ', activityFields.slice(10,17)],
        ['กำจัดขยะอันตราย', activityFields.slice(17)]
      ];
      document.getElementById('record').innerHTML = `
        <div class="workspace-form-layout">
          <form class="panel workspace-form" id="recordForm" novalidate data-step="1">
            <div class="workspace-form-header">
              <div>
                <h3>${editing ? 'แก้ไขรายการบันทึกขยะ' : 'สร้างรายการบันทึกใหม่'}</h3>
                <p>${editing ? `กำลังแก้ไขข้อมูลเดือน ${escapeHtml(niceRecordMonth(editing.ReportMonth))} (เมื่อบันทึกแล้วสถานะจะกลับเป็นรอตรวจสอบ)` : 'กรอกข้อมูลตามลำดับ ใช้เวลาประมาณ 3–5 นาที'}</p>
              </div>
              ${editing ? '<button type="button" class="btn ghost workspace-btn-sm" id="cancelEditRecord">ยกเลิกการแก้ไข</button>' : ''}
            </div>
            <ol class="workspace-steps" aria-label="ขั้นตอนบันทึกขยะ">${['ข้อมูลทั่วไป','ข้อมูลขยะ','หลักฐาน'].map((label,i)=>`<li data-record-indicator="${i+1}"><span>${i+1}</span><strong>${label}</strong></li>`).join('')}</ol>
            <div class="workspace-step" data-record-step="1">
              <h4>ข้อมูลการส่ง</h4><p class="workspace-hint">ระบบนำข้อมูลผู้ส่งมาจากบัญชีของคุณอัตโนมัติ</p>
              <div class="workspace-identity"><div class="avatar">${escapeHtml(avatarText(defaults.StudentName || 'GP'))}</div><div><strong>${escapeHtml(defaults.StudentName || 'สมาชิก Green Passport')}</strong><small>${escapeHtml([defaults.ClassName, defaults.HouseholdName].filter(Boolean).join(' · ') || 'บัญชีของคุณ')}</small></div></div>
              ${['StudentName','ClassName','StudentID','HouseholdName'].map(k=>`<input type="hidden" name="${k}" value="${escapeAttr(defaults[k] || '')}">`).join('')}
              ${input('ReportMonth', 'เดือนที่บันทึก', 'month', true, month)}
              <div class="workspace-info">เตรียมปริมาณขยะในหน่วยกิโลกรัมและรูปถ่ายหลักฐานไว้ก่อนเริ่มบันทึก</div>
            </div>
            <div class="workspace-step" data-record-step="2" hidden>
              <h4>ปริมาณขยะที่เกิดขึ้น</h4><p class="workspace-hint">กรอกเฉพาะข้อมูลที่มี หากไม่มีให้เว้นว่างหรือใส่ 0</p>
              <div class="workspace-waste-grid">
                ${[['GeneralWasteKg','ขยะทั่วไป','general'],['RecycleWasteKg','ขยะรีไซเคิล','recycle'],['OrganicWasteKg','ขยะอินทรีย์','organic'],['HazardousWasteAmount','ขยะอันตราย','hazard']].map(([key,label,tone])=>`<div class="workspace-waste-field ${tone}"><span class="workspace-waste-dot"></span>${input(key,label+' (กก.)','number',false,editing?.[key] ?? '')}</div>`).join('')}
              </div>
              <h4>กิจกรรมลดคาร์บอน</h4><p class="workspace-hint">เปิดเฉพาะหมวดที่คุณทำ ข้อมูลในส่วนนี้ใช้คำนวณผลลัพธ์การลดคาร์บอน</p>
              ${activityGroups.map(([label,fields])=>`<details class="workspace-accordion"><summary><span>${label}</span><span class="workspace-accordion-count">${fields.length} รายการ</span></summary><div class="activity-grid">${fields.map(([field,name,unit])=>input(field,`${name} (${unit})`,'number',false,editing?.[field] ?? '')).join('')}</div></details>`).join('')}
            </div>
            <div class="workspace-step" data-record-step="3" hidden>
              <h4>แนบหลักฐานกิจกรรม</h4><p class="workspace-hint">${hasExistingEvidence ? 'อัปโหลดรูปใหม่ 1–5 รูปเพื่อแทนที่หลักฐานเดิม หรือเว้นว่างเพื่อใช้รูปเดิม' : 'แนบรูปภาพ 1–5 รูป (.jpg, .png หรือ .webp) ขนาดไม่เกิน 5 MB ต่อรูป'}</p>
              <label class="workspace-upload" for="EvidenceFiles">${icons.edit}<strong>${hasExistingEvidence ? 'เลือกรูปใหม่ (ไม่บังคับ)' : 'เลือกรูปภาพหลักฐาน'}</strong><span>คลิกที่นี่เพื่อเลือกรูปจากอุปกรณ์</span><input id="EvidenceFiles" name="EvidenceFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple ${hasExistingEvidence ? '' : 'required'}></label>
              <div id="recordFileList" class="workspace-file-list" aria-live="polite">${hasExistingEvidence ? `<div><span>หลักฐานเดิม: ${escapeHtml(editing.EvidenceFileNames || 'มีไฟล์แนบอยู่แล้ว')}</span><small>ใช้รูปเดิม</small></div>` : ''}</div>
              ${input('VideoLink', 'ลิงก์วิดีโอ (ถ้ามี)', 'url', false, editing?.VideoLink || '')}
              <label class="workspace-consent"><input type="checkbox" name="Consent" ${editing ? 'checked' : ''} required><span>ยืนยันว่าข้อมูลและภาพหลักฐานเป็นข้อมูลที่สามารถส่งให้โรงเรียนตรวจสอบได้</span></label>
              <div class="workspace-info">หลังส่งรายการ ครูจะตรวจสอบข้อมูลก่อนเปลี่ยนสถานะเป็นผ่านการตรวจสอบ</div>
            </div>
            <div id="recordFormError" class="workspace-form-error" role="alert" hidden></div>
            <div class="workspace-form-actions"><div class="workspace-mobile-estimate"><span>ประมาณการคาร์บอน</span><strong><span id="liveCo2eMobile">0.00</span> kgCO₂e</strong></div><button type="button" class="btn ghost" id="recordBack">ย้อนกลับ</button><button type="submit" class="btn" id="recordNext">ขั้นตอนถัดไป</button></div>
          </form>
          <aside class="workspace-summary panel">
            <span class="workspace-eyebrow">ผลลัพธ์ของกิจกรรม</span><h3>ประมาณการคาร์บอน</h3>
            <div class="workspace-carbon-value"><span id="liveCo2e">0.00</span><small>kgCO₂e</small></div>
            <p>คำนวณจากข้อมูลกิจกรรมที่กรอก ระบบจะตรวจสอบอีกครั้งเมื่อส่ง</p>
            <div class="workspace-summary-tip"><strong>คำแนะนำ</strong><p id="liveAdvice">เริ่มกรอกข้อมูลเพื่อดูคำแนะนำ</p></div>
            <span class="workspace-summary-note">ระบบคำนวณผลลัพธ์โดยอัตโนมัติ</span>
          </aside>
        </div>
        ${renderMyWasteRecordsHtml()}`;
      const form = document.getElementById('recordForm');
      form.addEventListener('input', () => { state.recordDirty = true; updateLiveCarbon(); });
      form.addEventListener('submit', submitRecord);
      document.getElementById('recordBack').addEventListener('click', () => setRecordStep(Number(form.dataset.step) - 1));
      document.getElementById('cancelEditRecord')?.addEventListener('click', cancelEditWasteRecord);
      document.getElementById('EvidenceFiles').addEventListener('change', event => {
        const list = document.getElementById('recordFileList');
        const picked = [...event.target.files];
        list.innerHTML = picked.length
          ? picked.map(file => `<div><span>${escapeHtml(file.name)}</span><small>${(file.size/1024/1024).toFixed(2)} MB</small></div>`).join('')
          : (hasExistingEvidence ? `<div><span>หลักฐานเดิม: ${escapeHtml(editing.EvidenceFileNames || 'มีไฟล์แนบอยู่แล้ว')}</span><small>ใช้รูปเดิม</small></div>` : '');
        state.recordDirty = true;
      });
      setRecordStep(1, false);
      updateLiveCarbon();
    }

    function input(name, label, type, required, value = '') {
      const step = type === 'number' ? ' step="0.01" min="0" placeholder="0"' : '';
      return `<label>${escapeHtml(label)}<input name="${escapeAttr(name)}" type="${type}" value="${escapeAttr(String(value ?? ''))}" ${required ? 'required' : ''}${step}></label>`;
    }

    function setRecordStep(step, scroll = true) {
      const form = document.getElementById('recordForm');
      if (!form) return;
      const editing = state.editingRecordId ? findOwnWasteRecord(state.editingRecordId) : null;
      step = Math.max(1, Math.min(3, step));
      form.dataset.step = String(step);
      form.querySelectorAll('[data-record-step]').forEach(el => el.hidden = Number(el.dataset.recordStep) !== step);
      form.querySelectorAll('[data-record-indicator]').forEach(el => {
        const n = Number(el.dataset.recordIndicator);
        el.classList.toggle('current', n === step); el.classList.toggle('complete', n < step);
        if (n === step) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
      });
      document.getElementById('recordBack').hidden = step === 1;
      document.getElementById('recordNext').textContent = step === 3 ? (editing ? 'บันทึกการแก้ไข' : 'ส่งรายการบันทึก') : 'ขั้นตอนถัดไป';
      const error = document.getElementById('recordFormError');
      error.hidden = true;
      if (scroll) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function updateLiveCarbon() {
      const form = document.getElementById('recordForm');
      if (!form) return;
      const data = Object.fromEntries(new FormData(form).entries());
      const co2e = calculateCo2e(data);
      document.getElementById('liveCo2e').textContent = format(co2e);
      const mobileEstimate = document.getElementById('liveCo2eMobile');
      if (mobileEstimate) mobileEstimate.textContent = format(co2e);
      document.getElementById('liveAdvice').textContent = advice(data, co2e).replace(/\p{Extended_Pictographic}/gu, '').trim();
    }

    async function submitRecord(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const editing = state.editingRecordId ? findOwnWasteRecord(state.editingRecordId) : null;
      const step = Number(form.dataset.step || 1);
      const panel = form.querySelector('[data-record-step="' + step + '"]');
      if (![...panel.querySelectorAll('input,select,textarea')].every(field => field.reportValidity())) return;
      if (step < 3) { setRecordStep(step + 1); return; }
      const errorBox = document.getElementById('recordFormError');
      const files = [...document.getElementById('EvidenceFiles').files];
      const hasExistingEvidence = !!(editing && ((Array.isArray(editing.EvidencePaths) && editing.EvidencePaths.length) || editing.EvidenceFileNames));
      const showError = text => { errorBox.textContent = text; errorBox.hidden = false; errorBox.scrollIntoView({block:'nearest'}); };
      if (!editing) {
        if (files.length < 1 || files.length > 5 || files.some(file => file.size > 5*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type))) {
          showError('กรุณาเลือกรูป JPG, PNG หรือ WebP 1–5 รูป ขนาดไม่เกิน 5 MB ต่อรูป'); return;
        }
      } else {
        if (files.length > 5 || files.some(file => file.size > 5*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type))) {
          showError('กรุณาเลือกรูป JPG, PNG หรือ WebP ไม่เกิน 5 รูป ขนาดไม่เกิน 5 MB ต่อรูป'); return;
        }
        if (files.length === 0 && !hasExistingEvidence) {
          showError('กรุณาแนบรูปหลักฐานอย่างน้อย 1 รูป'); return;
        }
      }
      const button = document.getElementById('recordNext');
      if (button.disabled) return;
      button.disabled = true; button.textContent = editing ? 'กำลังบันทึกการแก้ไข...' : 'กำลังส่งรายการ...'; errorBox.hidden = true;
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        data.UserID = currentUserIdentity().UserID;
        data.TotalCO2e = calculateCo2e(data);
        if (files.length) {
          data.EvidenceFiles = await filesToPayload(files);
        } else if (editing) {
          delete data.EvidenceFiles;
          if (editing.EvidencePaths) data.EvidencePaths = editing.EvidencePaths;
          if (editing.EvidenceFileNames) data.EvidenceFileNames = editing.EvidenceFileNames;
        }
        if (editing) {
          const result = await sheetApi('updateWasteRecord', { recordId: editing.RecordID || '', row: editing._rowNumber || null, record: data });
          const updated = normalizeRow(result.record || { ...editing, ...data, ReviewStatus: 'รอตรวจสอบ' });
          const targetKey = wasteRecordKey(editing);
          const idx = state.data.wasteRecords.findIndex(r => wasteRecordKey(r) === targetKey);
          if (idx >= 0) state.data.wasteRecords[idx] = updated;
          else state.data.wasteRecords.unshift(updated);
          state.editingRecordId = '';
          refreshLocalDashboard(); applyCurrentUserToState(); saveToLocalStorage();
          state.recordDirty = false;
          document.getElementById('record').innerHTML = `<div class="panel workspace-success"><span class="workspace-success-icon">${authIcons.check}</span><h3>บันทึกการแก้ไขเรียบร้อยแล้ว!</h3><p>ลดคาร์บอนได้ <strong>${format(result.totalCO2e ?? data.TotalCO2e)} kgCO₂e</strong></p><p>รายการของคุณถูกส่งให้ครูตรวจสอบอีกครั้งแล้ว</p><div class="btn-row"><button class="btn" onclick="renderRecord()">กลับหน้ารายการบันทึก</button><button class="btn ghost" onclick="showPage('home')">กลับหน้าหลัก</button></div></div>`;
        } else {
          const result = await sheetApi('appendWasteRecord', { record: data });
          if (result.record) state.data.wasteRecords.unshift(normalizeRow(result.record));
          refreshLocalDashboard(); applyCurrentUserToState(); saveToLocalStorage();
          state.recordDirty = false;
          document.getElementById('record').innerHTML = `<div class="panel workspace-success"><span class="workspace-success-icon">${authIcons.check}</span><h3>ส่งรายการเรียบร้อยแล้ว!</h3><p>ลดคาร์บอนได้ <strong>${format(result.totalCO2e ?? data.TotalCO2e)} kgCO₂e</strong></p><p>รายการของคุณกำลังรอครูตรวจสอบ</p><div class="btn-row"><button class="btn" onclick="renderRecord()">สร้างรายการใหม่</button><button class="btn ghost" onclick="showPage('home')">กลับหน้าหลัก</button></div></div>`;
        }
      } catch (error) {
        console.warn('Record submission failed', error);
        showError(error.message || 'ยังส่งข้อมูลไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง');
      } finally {
        button.disabled = false; button.textContent = editing ? 'บันทึกการแก้ไข' : 'ส่งรายการบันทึก';
      }
    }

    function filesToPayload(files) {
      return Promise.all([...files].map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, mimeType: file.type, data: reader.result });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));
    }

    function calculateCo2e(data) {
      return round(activityFields.reduce((total, [field]) => total + Number(data[field] || 0) * Number(factorMap[field] || 0), 0));
    }

    function advice(data, co2e) {
      if (Number(data.GeneralWasteKg || 0) > 10) return '🗑️ ขยะทั่วไปยังสูง ลองลดซองขนม ถุงพลาสติก และของใช้ครั้งเดียวทิ้งนะ';
      if (Number(data.OrganicWasteKg || 0) > Number(data.CompostFoodKg || 0) + Number(data.BioExtractKg || 0) + Number(data.FeedAnimalsKg || 0)) return '🍃 ขยะอินทรีย์เยอะมาก ลองทำถังหมักปุ๋ยหรือน้ำหมักชีวภาพที่บ้านกันเถอะ';
      if (Number(data.RecycleWasteKg || 0) > 0 && Number(data.RecycleWasteKg || 0) < 3) return '♻️ เดือนนี้ขยะรีไซเคิลยังน้อย ลองตั้งมุมแยกขวด กระดาษ และกระป๋องในบ้านนะ';
      if (co2e >= 20) return '🌍 เยี่ยมมาก! เดือนนี้ครอบครัวของคุณลดคาร์บอนได้ดีขึ้นมาก';
      return '📸 อย่าลืมเพิ่มรูปภาพหลักฐานก่อนส่งข้อมูลนะ';
    }
