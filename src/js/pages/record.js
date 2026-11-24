    function renderRecord() {
      const month = new Date().toISOString().slice(0, 7);
      const defaults = authRecordDefaults();
      state.recordDirty = false;
      const activityGroups = [
        ['วัสดุรีไซเคิล', activityFields.slice(0,7)],
        ['จัดการขยะอินทรีย์', activityFields.slice(7,10)],
        ['ลดการใช้และใช้ซ้ำ', activityFields.slice(10,17)],
        ['กำจัดขยะอันตราย', activityFields.slice(17)]
      ];
      document.getElementById('record').innerHTML = `
        <div class="workspace-form-layout">
          <form class="panel workspace-form" id="recordForm" novalidate data-step="1">
            <div class="workspace-form-header"><div><h3>สร้างรายการบันทึกใหม่</h3><p>กรอกข้อมูลตามลำดับ ใช้เวลาประมาณ 3–5 นาที</p></div></div>
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
                ${[['GeneralWasteKg','ขยะทั่วไป','general'],['RecycleWasteKg','ขยะรีไซเคิล','recycle'],['OrganicWasteKg','ขยะอินทรีย์','organic'],['HazardousWasteAmount','ขยะอันตราย','hazard']].map(([key,label,tone])=>`<div class="workspace-waste-field ${tone}"><span class="workspace-waste-dot"></span>${input(key,label+' (กก.)','number')}</div>`).join('')}
              </div>
              <h4>กิจกรรมลดคาร์บอน</h4><p class="workspace-hint">เปิดเฉพาะหมวดที่คุณทำ ข้อมูลในส่วนนี้ใช้คำนวณผลลัพธ์การลดคาร์บอน</p>
              ${activityGroups.map(([label,fields],i)=>`<details class="workspace-accordion"><summary><span>${label}</span><span class="workspace-accordion-count">${fields.length} รายการ</span></summary><div class="activity-grid">${fields.map(([field,name,unit])=>input(field,`${name} (${unit})`,'number')).join('')}</div></details>`).join('')}
            </div>
            <div class="workspace-step" data-record-step="3" hidden>
              <h4>แนบหลักฐานกิจกรรม</h4><p class="workspace-hint">แนบรูปภาพ 1–5 รูป (.jpg, .png หรือ .webp) ขนาดไม่เกิน 5 MB ต่อรูป</p>
              <label class="workspace-upload" for="EvidenceFiles">${icons.edit}<strong>เลือกรูปภาพหลักฐาน</strong><span>คลิกที่นี่เพื่อเลือกรูปจากอุปกรณ์</span><input id="EvidenceFiles" name="EvidenceFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label>
              <div id="recordFileList" class="workspace-file-list" aria-live="polite"></div>
              ${input('VideoLink', 'ลิงก์วิดีโอ (ถ้ามี)', 'url')}
              <label class="workspace-consent"><input type="checkbox" name="Consent" required><span>ยืนยันว่าข้อมูลและภาพหลักฐานเป็นข้อมูลที่สามารถส่งให้โรงเรียนตรวจสอบได้</span></label>
              <div class="workspace-info">หลังส่งรายการ ครูจะตรวจสอบข้อมูลก่อนเปลี่ยนสถานะเป็นผ่านการตรวจสอบ</div>
            </div>
            <div id="recordFormError" class="workspace-form-error" role="alert" hidden></div>
            <div class="workspace-form-actions"><button type="button" class="btn ghost" id="recordBack">ย้อนกลับ</button><button type="submit" class="btn" id="recordNext">ขั้นตอนถัดไป</button></div>
          </form>
          <aside class="workspace-summary panel">
            <span class="workspace-eyebrow">ผลลัพธ์ของกิจกรรม</span><h3>คาร์บอนที่ลดได้</h3>
            <div class="workspace-carbon-value"><span id="liveCo2e">0.00</span><small>kgCO₂e</small></div>
            <p>คำนวณจากข้อมูลกิจกรรมที่คุณกรอก</p>
            <div class="workspace-summary-tip"><strong>คำแนะนำ</strong><p id="liveAdvice">เริ่มกรอกข้อมูลเพื่อดูคำแนะนำ</p></div>
            <span class="workspace-summary-note">ระบบคำนวณผลลัพธ์โดยอัตโนมัติ</span>
          </aside>
        </div>`;
      const form = document.getElementById('recordForm');
      form.addEventListener('input', () => { state.recordDirty = true; updateLiveCarbon(); });
      form.addEventListener('submit', submitRecord);
      document.getElementById('recordBack').addEventListener('click', () => setRecordStep(Number(form.dataset.step) - 1));
      document.getElementById('EvidenceFiles').addEventListener('change', event => {
        const list = document.getElementById('recordFileList');
        list.innerHTML = [...event.target.files].map(file => `<div><span>${escapeHtml(file.name)}</span><small>${(file.size/1024/1024).toFixed(2)} MB</small></div>`).join('');
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
      step = Math.max(1, Math.min(3, step));
      form.dataset.step = String(step);
      form.querySelectorAll('[data-record-step]').forEach(el => el.hidden = Number(el.dataset.recordStep) !== step);
      form.querySelectorAll('[data-record-indicator]').forEach(el => {
        const n = Number(el.dataset.recordIndicator);
        el.classList.toggle('current', n === step); el.classList.toggle('complete', n < step);
        if (n === step) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
      });
      document.getElementById('recordBack').hidden = step === 1;
      document.getElementById('recordNext').textContent = step === 3 ? 'ส่งรายการบันทึก' : 'ขั้นตอนถัดไป';
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
      document.getElementById('liveAdvice').textContent = advice(data, co2e);
    }

    async function submitRecord(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const step = Number(form.dataset.step || 1);
      const panel = form.querySelector('[data-record-step="' + step + '"]');
      if (![...panel.querySelectorAll('input,select,textarea')].every(field => field.reportValidity())) return;
      if (step < 3) { setRecordStep(step + 1); return; }
      const errorBox = document.getElementById('recordFormError');
      const files = [...document.getElementById('EvidenceFiles').files];
      const showError = text => { errorBox.textContent = text; errorBox.hidden = false; errorBox.scrollIntoView({block:'nearest'}); };
      if (files.length < 1 || files.length > 5 || files.some(file => file.size > 5*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type))) {
        showError('กรุณาเลือกรูป JPG, PNG หรือ WebP 1–5 รูป ขนาดไม่เกิน 5 MB ต่อรูป'); return;
      }
      const button = document.getElementById('recordNext');
      if (button.disabled) return;
      button.disabled = true; button.textContent = 'กำลังส่งรายการ...'; errorBox.hidden = true;
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        data.UserID = currentUserIdentity().UserID;
        data.TotalCO2e = calculateCo2e(data);
        data.EvidenceFiles = await filesToPayload(files);
        const result = await sheetApi('appendWasteRecord', { record: data });
        if (result.record) state.data.wasteRecords.push(normalizeRow(result.record));
        refreshLocalDashboard(); applyCurrentUserToState(); saveToLocalStorage();
        state.recordDirty = false;
        document.getElementById('record').innerHTML = `<div class="panel workspace-success"><span class="workspace-success-icon">${authIcons.check}</span><h3>ส่งรายการเรียบร้อยแล้ว!</h3><p>ลดคาร์บอนได้ <strong>${format(result.totalCO2e ?? data.TotalCO2e)} kgCO₂e</strong></p><p>รายการของคุณกำลังรอครูตรวจสอบ</p><div class="btn-row"><button class="btn" onclick="renderRecord()">สร้างรายการใหม่</button><button class="btn ghost" onclick="showPage('home')">กลับหน้าหลัก</button></div></div>`;
      } catch (error) {
        console.warn('Record submission failed', error);
        showError('ยังส่งข้อมูลไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง');
      } finally {
        button.disabled = false; button.textContent = 'ส่งรายการบันทึก';
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
