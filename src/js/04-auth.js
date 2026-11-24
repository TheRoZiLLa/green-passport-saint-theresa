    // Authentication UI: forms remain mounted while requests are in flight.
    const authIcons = {
      mail: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
      lock: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>',
      eye: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
      eyeOff: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 3 18 18M9.8 6.2A11.3 11.3 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3.4 3.9M6.2 6.8C3.4 8.6 2 12 2 12s3.5 6 10 6c1.1 0 2.1-.2 3-.5"/></svg>',
      leaf: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 4c-8 0-15 4-15 10a5 5 0 0 0 5 5c6 0 10-7 10-15Z"/><path d="M4 21 15 10"/></svg>',
      check: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7"/></svg>'
    };

    function authArt() {
      return `
        <svg class="auth-art" viewBox="0 0 400 300" aria-hidden="true">
          <circle cx="206" cy="150" r="116" fill="#275848"/>
          <circle cx="206" cy="150" r="91" fill="none" stroke="#8cb69b" stroke-width="1" stroke-dasharray="4 7" opacity=".6"/>
          <path d="M89 237c51-31 88-38 126-35 39 3 67 21 104 35" fill="none" stroke="#a7c9af" stroke-width="2" stroke-linecap="round"/>
          <path d="M206 231V140c0-38 19-61 47-77" stroke="#e6f1d5" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M207 170c-3-57-29-88-84-91-1 49 29 82 84 91Z" fill="#9fc68e"/>
          <path d="M208 138c17-51 49-78 100-75-8 48-44 74-100 75Z" fill="#d8eaa9"/>
          <path d="M209 208c24-37 52-51 89-47-14 35-44 51-89 47Z" fill="#6ea583"/>
          <path d="M206 202c-26-34-51-46-91-42 11 32 41 49 91 42Z" fill="#c5dbab"/>
          <path d="M142 97c29 16 48 38 65 73m77-91c-31 14-54 33-76 59M132 172c30 5 53 16 74 30m72-30c-30 7-46 16-69 36" fill="none" stroke="#386448" stroke-width="2" stroke-linecap="round" opacity=".7"/>
          <circle cx="99" cy="60" r="5" fill="#d8eaa9"/>
          <circle cx="335" cy="199" r="7" fill="#d8eaa9" opacity=".85"/>
          <path d="M328 94v18m-9-9h18M72 188v14m-7-7h14" stroke="#b7d398" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }

    function authBrandHtml(logo) {
      return `
        <section class="auth-brand-panel" aria-label="Green Passport">
          <div class="auth-logo-wrap">
            <div class="auth-logo">${logo ? `<img src="${escapeAttr(logo)}" alt="Green Passport">` : 'GP'}</div>
            <div class="auth-brand-name"><h1>Green Passport</h1><p>ST. THERESA · ZERO WASTE</p></div>
          </div>
          <div class="auth-brand-content">
            <div class="auth-brand-eyebrow">${authIcons.leaf} GREEN COMMUNITY</div>
            <h2>เริ่มจากเรา<br>เพื่อโลกที่ดีขึ้น</h2>
            <p>บันทึกทุกการเปลี่ยนแปลง เรียนรู้การแยกขยะ และร่วมสร้างโรงเรียนสีเขียวไปด้วยกัน</p>
            ${authArt()}
          </div>
          <div class="auth-brand-footer"><span class="auth-brand-dot"></span><span>ทุกการกระทำเล็ก ๆ มีความหมาย</span></div>
        </section>`;
    }

    function authPasswordField(id, name, label, autocomplete, placeholder, min = 8) {
      return `<div class="auth-field"><label class="auth-field-label" for="${id}">${label}</label>
        <span class="auth-input-wrap"><span class="auth-input-icon">${authIcons.lock}</span>
          <input id="${id}" name="${name}" type="password" autocomplete="${autocomplete}" required minlength="${min}" placeholder="${placeholder}">
          <button type="button" class="auth-password-toggle" aria-label="แสดงรหัสผ่าน" aria-pressed="false" data-password="${id}">${authIcons.eye}</button>
        </span></div>`;
    }

    function authEmailField(id, name, label = 'อีเมล') {
      return `<label class="auth-field" for="${id}"><span>${label}</span>
        <span class="auth-input-wrap"><span class="auth-input-icon">${authIcons.mail}</span>
          <input id="${id}" name="${name}" type="email" autocomplete="email" maxlength="90" required placeholder="name@example.com">
        </span></label>`;
    }

    function loginFormHtml() {
      return `
        <form class="auth-form auth-login-form" id="loginForm" onsubmit="submitLogin(event)">
          <div class="auth-heading"><span class="auth-kicker">WELCOME BACK</span><h2>ยินดีต้อนรับกลับมา</h2><p>เข้าสู่ระบบเพื่อสานต่อภารกิจรักษ์โลกของคุณ</p></div>
          <div class="auth-fields">
            ${authEmailField('loginUsername', 'login')}
            ${authPasswordField('loginPassword', 'password', 'รหัสผ่าน', 'current-password', 'กรอกรหัสผ่าน', 1)}
          </div>
          <div class="auth-help" style="justify-content:space-between"><button type="button" class="auth-text-button" onclick="showAuthHelp()">มีปัญหาในการเข้าสู่ระบบ?</button><button type="button" class="auth-text-button" onclick="openPasswordReset()">ลืมรหัสผ่าน?</button></div>
          <button class="auth-primary" type="submit" data-busy-label="กำลังเข้าสู่ระบบ..." data-label="เข้าสู่ระบบ">เข้าสู่ระบบ</button>
          <p class="auth-switch">ยังไม่มีบัญชี? <button type="button" onclick="setAuthMode('signup')">สมัครสมาชิก</button></p>
        </form>`;
    }

    function resetFormHtml() {
      return `<form class="auth-form" id="resetForm" onsubmit="submitPasswordReset(event)">
        <div class="auth-heading"><span class="auth-kicker">ACCOUNT RECOVERY</span><h2>ลืมรหัสผ่าน?</h2><p>กรอกอีเมลที่ใช้สมัครสมาชิก ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ</p></div>
        ${authEmailField('resetEmail', 'email')}
        <button class="auth-primary" type="submit" data-busy-label="กำลังส่งอีเมล..." data-label="ส่งลิงก์รีเซ็ตรหัสผ่าน">ส่งลิงก์รีเซ็ตรหัสผ่าน</button>
        <button class="auth-secondary" type="button" onclick="setAuthMode('login')">${authIcons.arrow} กลับไปเข้าสู่ระบบ</button>
      </form>`;
    }

    function recoveryFormHtml() {
      return `<form class="auth-form" id="recoveryForm" onsubmit="submitNewPassword(event)">
        <div class="auth-heading"><span class="auth-kicker">RESET PASSWORD</span><h2>ตั้งรหัสผ่านใหม่</h2><p>เลือกรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร แล้วเข้าสู่ระบบด้วยรหัสผ่านใหม่นี้</p></div>
        ${authPasswordField('recoveryPassword', 'password', 'รหัสผ่านใหม่', 'new-password', 'อย่างน้อย 8 ตัวอักษร')}
        ${authPasswordField('recoveryConfirm', 'confirm', 'ยืนยันรหัสผ่านใหม่', 'new-password', 'กรอกรหัสผ่านอีกครั้ง')}
        <button class="auth-primary" type="submit" data-busy-label="กำลังบันทึก..." data-label="บันทึกรหัสผ่านใหม่">บันทึกรหัสผ่านใหม่</button>
        <button class="auth-secondary" type="button" onclick="cancelPasswordRecovery()">ยกเลิก</button>
      </form>`;
    }

    function openPasswordReset(email = '') {
      if (state.authBusy) return;
      email ||= document.getElementById('loginUsername')?.value || '';
      state.authMode = 'reset'; state.authMessage = ''; state.authMessageType = '';
      renderAuth();
      const input = document.getElementById('resetEmail');
      if (input) { input.value = email; input.focus(); }
    }

    function signupFormHtml() {
      return `
        <form class="auth-form auth-signup-form" id="signupForm" onsubmit="authSubmitSignup(event)" novalidate>
          <div class="auth-heading"><span class="auth-kicker">JOIN THE COMMUNITY</span><h2>สร้างบัญชีของคุณ</h2><p>เริ่มต้นเส้นทาง Green Passport ใน 2 ขั้นตอน</p></div>
          <ol class="auth-steps" aria-label="ขั้นตอนสมัครสมาชิก">
            <li class="auth-step is-current" data-step-indicator="1"><span class="auth-step-number">1</span><span>ข้อมูลบัญชี</span></li>
            <li class="auth-step" data-step-indicator="2"><span class="auth-step-number">2</span><span>ข้อมูลส่วนตัว</span></li>
          </ol>
          <div data-signup-step="1" class="auth-step-fields">
            ${authEmailField('signupEmail', 'Email')}
            <label class="auth-field" for="signupUsername"><span>ชื่อผู้ใช้</span><span class="auth-input-wrap"><span class="auth-input-icon">${authIcons.user}</span><input id="signupUsername" name="Username" required maxlength="40" autocomplete="username" placeholder="green.student"></span><small>ใช้แสดงตัวตนในชุมชน การเข้าสู่ระบบใช้อีเมล</small></label>
            ${authPasswordField('signupPassword', 'Password', 'รหัสผ่าน', 'new-password', 'อย่างน้อย 8 ตัวอักษร')}
            <div class="auth-password-meter" aria-live="polite"><span class="auth-password-bar"><span id="authPasswordFill"></span></span><span id="authPasswordHint">รหัสผ่านอย่างน้อย 8 ตัวอักษร</span></div>
            ${authPasswordField('signupConfirmPassword', 'ConfirmPassword', 'ยืนยันรหัสผ่าน', 'new-password', 'กรอกรหัสผ่านอีกครั้ง')}
            <button type="button" class="auth-primary" data-auth-next>ถัดไป</button>
          </div>
          <div data-signup-step="2" class="auth-step-fields" hidden>
            <div class="auth-grid">
              <label class="auth-field" for="signupFirstName"><span>ชื่อจริง</span><input id="signupFirstName" name="FirstName" required maxlength="60" autocomplete="given-name" placeholder="ชื่อ"></label>
              <label class="auth-field" for="signupLastName"><span>นามสกุล</span><input id="signupLastName" name="LastName" required maxlength="60" autocomplete="family-name" placeholder="นามสกุล"></label>
              <label class="auth-field" for="signupDisplayName"><span>ชื่อที่แสดง <small>ไม่บังคับ</small></span><input id="signupDisplayName" name="DisplayName" maxlength="50" placeholder="ชื่อเล่น"></label>
              <label class="auth-field" for="signupRole"><span>ประเภทบัญชี</span><select id="signupRole" name="Role" required><option value="student">นักเรียน</option><option value="parent">ผู้ปกครอง</option></select></label>
              <label class="auth-field" for="signupClass"><span>ชั้น / ห้อง <small>ไม่บังคับ</small></span><input id="signupClass" name="ClassName" maxlength="30" placeholder="ม.1/1"></label>
              <label class="auth-field" for="signupStudentID"><span>รหัสนักเรียน <small>ไม่บังคับ</small></span><input id="signupStudentID" name="StudentID" maxlength="40" placeholder="ST001" autocomplete="off"></label>
              <label class="auth-field auth-full" for="signupHousehold"><span>ชื่อครัวเรือน <small>ไม่บังคับ</small></span><input id="signupHousehold" name="HouseholdName" maxlength="80" placeholder="ชื่อครอบครัวหรือครัวเรือน"></label>
            </div>
            <label class="auth-consent"><input name="Consent" type="checkbox" required><span>ยินยอมให้ใช้ข้อมูลที่กรอกเพื่อบันทึกกิจกรรมและแสดงผลในระบบ Green Passport ของโรงเรียน</span></label>
            <div class="auth-note">${authIcons.leaf}<span>บัญชีจะเปิดใช้งานหลังยืนยันอีเมลและได้รับอนุมัติจากโรงเรียน</span></div>
            <div class="auth-actions"><button type="button" class="auth-secondary" data-auth-back>${authIcons.arrow} ย้อนกลับ</button><button class="auth-primary" type="submit" data-busy-label="กำลังสร้างบัญชี..." data-label="สร้างบัญชี">สร้างบัญชี</button></div>
          </div>
          <p class="auth-switch">มีบัญชีอยู่แล้ว? <button type="button" onclick="setAuthMode('login')">เข้าสู่ระบบ</button></p>
        </form>`;
    }

    function authDisplayMessage(message) {
      if (/invalid login credentials/i.test(message)) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
      if (/email not confirmed/i.test(message)) return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';
      if (/user already registered/i.test(message)) return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ';
      if (/rate limit/i.test(message)) return 'มีการส่งคำขอหลายครั้ง กรุณารอสักครู่แล้วลองใหม่';
      return message;
    }

    function renderAuth() {
      document.body.classList.add('auth-locked');
      document.body.classList.remove('chat-active');
      const screen = document.getElementById('authScreen');
      if (!screen) return;
      const mode = ['signup', 'reset', 'recovery'].includes(state.authMode) ? state.authMode : 'login';
      const newForm = screen.dataset.mode !== mode || !screen.querySelector('.auth-form');
      if (newForm) {
        screen.dataset.mode = mode;
        screen.innerHTML = `
          <div class="auth-shell auth-mode-${mode}">
            ${authBrandHtml(greenPassportLogoSrc())}
            <section class="auth-form-panel" aria-label="${mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}">
              <div class="auth-mobile-brand"><span class="auth-mobile-mark">${greenPassportLogoSrc() ? `<img src="${escapeAttr(greenPassportLogoSrc())}" alt="">` : authIcons.leaf}</span><strong>Green Passport</strong><span>St. Theresa</span></div>
              ${['login', 'signup'].includes(mode) ? `<nav class="auth-tabs" aria-label="เลือกหน้าบัญชี">
                <button class="auth-tab ${mode === 'login' ? 'active' : ''}" type="button" aria-pressed="${mode === 'login'}" onclick="setAuthMode('login')">เข้าสู่ระบบ</button>
                <button class="auth-tab ${mode === 'signup' ? 'active' : ''}" type="button" aria-pressed="${mode === 'signup'}" onclick="setAuthMode('signup')">สมัครสมาชิก</button>
              </nav>` : ''}
              <div id="authStatus" class="auth-status" role="status" aria-live="polite" hidden></div>
              ${mode === 'signup' ? signupFormHtml() : mode === 'reset' ? resetFormHtml() : mode === 'recovery' ? recoveryFormHtml() : loginFormHtml()}
              <footer class="auth-form-footer">Green Passport <span>·</span> Saint Theresa School</footer>
            </section>
          </div>`;
        bindAuthUI(screen);
        if (mode === 'signup') setSignupStep(1);
      }
      const status = screen.querySelector('#authStatus');
      status.hidden = !state.authMessage;
      status.classList.toggle('bad', state.authMessageType === 'bad');
      status.textContent = authDisplayMessage(state.authMessage || '');
      const form = screen.querySelector('.auth-form');
      form.setAttribute('aria-busy', String(!!state.authBusy));
      screen.querySelectorAll('button').forEach(button => { button.disabled = !!state.authBusy; });
      screen.querySelectorAll('[data-busy-label]').forEach(button => {
        button.textContent = state.authBusy ? button.dataset.busyLabel : button.dataset.label;
        button.classList.toggle('is-loading', !!state.authBusy);
      });
    }

    function bindAuthUI(screen) {
      screen.querySelectorAll('[data-password]').forEach(button => {
        button.addEventListener('click', () => {
          const input = document.getElementById(button.dataset.password);
          if (!input) return;
          const visible = input.type === 'password';
          input.type = visible ? 'text' : 'password';
          button.setAttribute('aria-label', visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
          button.setAttribute('aria-pressed', String(visible));
          button.innerHTML = visible ? authIcons.eyeOff : authIcons.eye;
        });
      });
      screen.querySelector('[data-auth-next]')?.addEventListener('click', () => {
        if (validateSignupStep(1)) setSignupStep(2, true);
      });
      screen.querySelector('[data-auth-back]')?.addEventListener('click', () => setSignupStep(1, true));
      const password = screen.querySelector('#signupPassword');
      const confirm = screen.querySelector('#signupConfirmPassword');
      if (password) password.addEventListener('input', () => {
        const length = password.value.length;
        const fill = screen.querySelector('#authPasswordFill');
        const hint = screen.querySelector('#authPasswordHint');
        fill.style.width = Math.min(100, length / 8 * 100) + '%';
        fill.classList.toggle('is-valid', length >= 8);
        hint.textContent = length >= 8 ? 'ความยาวรหัสผ่านผ่านเกณฑ์แล้ว' : 'รหัสผ่านอย่างน้อย 8 ตัวอักษร';
        confirm.setCustomValidity('');
      });
      if (confirm) confirm.addEventListener('input', () => confirm.setCustomValidity(''));
    }

    function validateSignupStep(step) {
      const root = document.querySelector('[data-signup-step="' + step + '"]');
      if (step === 1) {
        const password = document.getElementById('signupPassword');
        const confirm = document.getElementById('signupConfirmPassword');
        confirm.setCustomValidity(password.value === confirm.value ? '' : 'รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      }
      return [...root.querySelectorAll('input, select')].every(input => input.reportValidity());
    }

    function setSignupStep(step, focus = false) {
      const form = document.getElementById('signupForm');
      if (!form) return;
      form.dataset.step = String(step);
      form.querySelectorAll('[data-signup-step]').forEach(panel => { panel.hidden = Number(panel.dataset.signupStep) !== step; });
      form.querySelectorAll('[data-step-indicator]').forEach(indicator => {
        const current = Number(indicator.dataset.stepIndicator);
        indicator.classList.toggle('is-current', current === step);
        indicator.classList.toggle('is-complete', current < step);
        if (current === step) indicator.setAttribute('aria-current', 'step');
        else indicator.removeAttribute('aria-current');
        indicator.querySelector('.auth-step-number').innerHTML = current < step ? authIcons.check : current;
      });
      if (focus) form.querySelector('[data-signup-step="' + step + '"] input')?.focus({ preventScroll: false });
    }

    function authSubmitSignup(event) {
      event.preventDefault();
      const step = Number(event.currentTarget.dataset.step || 1);
      if (step === 1) {
        if (validateSignupStep(1)) setSignupStep(2, true);
        return;
      }
      if (!validateSignupStep(2)) return;
      submitSignup(event);
    }

    function setAuthMode(mode) {
      if (state.authBusy) return;
      state.authMode = mode === 'signup' ? 'signup' : 'login';
      state.authMessage = '';
      state.authMessageType = '';
      renderAuth();
    }

    function setAuthMessage(message, type = '') {
      state.authMessage = message || '';
      state.authMessageType = type;
      renderAuth();
    }

    function showAuthHelp() {
      showAuthNotice('help', document.getElementById('loginUsername')?.value || '');
    }

    let authResendUntil = 0;
    const authNoticeCopy = {
      verify: { title: 'ตรวจสอบอีเมลของคุณ', text: 'ส่งคำขอสมัครสมาชิกแล้ว! เปิดกล่องจดหมายและกดปุ่มยืนยันในอีเมลจาก Green Passport หรือ Supabase ก่อนเข้าสู่ระบบ', tone: 'info', step: 2 },
      unconfirmed: { title: 'ยังไม่ได้ยืนยันอีเมล', text: 'กรุณาเปิดอีเมลที่ใช้สมัคร แล้วกดลิงก์ Confirm your signup หากหาไม่พบ ให้ตรวจสอบ Spam หรือขอส่งอีเมลใหม่', tone: 'warning', step: 2 },
      pending: { title: 'รอการอนุมัติจากโรงเรียน', text: 'ยืนยันอีเมลแล้วเรียบร้อย ตอนนี้บัญชีของคุณอยู่ในขั้นตอนตรวจสอบโดยผู้ดูแลโรงเรียน ยังไม่สามารถใช้งานระบบได้จนกว่าจะได้รับอนุมัติ', tone: 'info', step: 3 },
      approved: { title: 'บัญชีพร้อมใช้งานแล้ว!', text: 'โรงเรียนอนุมัติบัญชีของคุณแล้ว เริ่มต้นใช้งาน Green Passport ได้เลย', tone: 'info', step: 4 },
      reset_sent: { title: 'ตรวจสอบอีเมลของคุณ', text: 'หากอีเมลนี้มีบัญชีในระบบ คุณจะได้รับลิงก์สำหรับตั้งรหัสผ่านใหม่ กรุณาเปิดอีเมลและกดลิงก์ Reset password หากไม่พบให้ตรวจสอบ Spam', tone: 'info' },
      reset_done: { title: 'เปลี่ยนรหัสผ่านสำเร็จ', text: 'คุณสามารถเข้าสู่ระบบด้วยอีเมลเดิมและรหัสผ่านใหม่ได้ทันที', tone: 'info' },
      recovery_invalid: { title: 'ลิงก์รีเซ็ตรหัสผ่านใช้ไม่ได้', text: 'ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่', tone: 'warning' },
      credentials: { title: 'เข้าสู่ระบบไม่สำเร็จ', text: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือคุณอาจยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบข้อมูลและอีเมลยืนยันอีกครั้ง', tone: 'error' },
      existing: { title: 'ไม่สามารถสมัครบัญชีใหม่ได้', text: 'หากเคยสมัครด้วยอีเมลนี้แล้ว กรุณาตรวจสอบอีเมลยืนยันหรือกลับไปเข้าสู่ระบบ', tone: 'warning' },
      network: { title: 'เชื่อมต่อระบบไม่สำเร็จ', text: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ', tone: 'error' },
      rate: { title: 'กรุณารอสักครู่', text: 'มีการส่งคำขอหลายครั้งในช่วงเวลาสั้น ๆ กรุณาลองใหม่ภายหลัง', tone: 'warning' },
      validation: { title: 'กรุณาตรวจสอบข้อมูล', text: 'ตรวจสอบช่องที่จำเป็น รหัสผ่าน และการยอมรับเงื่อนไขให้ครบถ้วนก่อนดำเนินการ', tone: 'warning' },
      help: { title: 'มีปัญหาในการเข้าสู่ระบบ?', text: 'ใช้ Email ในการเข้าสู่ระบบ หากเพิ่งสมัคร ให้ยืนยันอีเมลก่อนและรออนุมัติจากโรงเรียน หากลืมรหัสผ่านให้ติดต่อผู้ดูแลระบบ', tone: 'info' },
      error: { title: 'ดำเนินการไม่สำเร็จ', text: 'เกิดข้อผิดพลาดระหว่างดำเนินการ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ', tone: 'error' }
    };

    function authNoticeKind(error) {
      const code = String(error?.code || '');
      const message = String(error?.message || error || '');
      if (/รอการอนุมัติจากโรงเรียน/.test(message)) return 'pending';
      if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return 'unconfirmed';
      if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return 'credentials';
      if (code === 'user_already_exists' || /already registered|already exists/i.test(message)) return 'existing';
      if (/rate.limit|too many requests|over_email_send_rate_limit/i.test(code + ' ' + message)) return 'rate';
      if (/fetch|network|configuration missing|Supabase ยังไม่พร้อม|ยังไม่สามารถเชื่อมต่อ/i.test(message)) return 'network';
      return 'error';
    }

    function showAuthNotice(kind, email = '', detail = '') {
      const copy = authNoticeCopy[kind] || authNoticeCopy.error;
      let modal = document.getElementById('gpAuthNotice');
      if (!modal) {
        modal = document.createElement('dialog');
        modal.id = 'gpAuthNotice';
        modal.className = 'auth-notice-dialog';
        modal.setAttribute('aria-labelledby', 'gpAuthNoticeTitle');
        modal.setAttribute('aria-describedby', 'gpAuthNoticeText');
        document.body.append(modal);
      }
      const emailConfirmed = kind === 'pending';
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const canResend = validEmail && ['verify', 'unconfirmed', 'credentials', 'help', 'existing'].includes(kind);
      const canOpenMail = validEmail && ['verify', 'unconfirmed', 'reset_sent'].includes(kind) && /@gmail\.com$/i.test(email);
      const steps = ['สมัครสมาชิก', 'ยืนยันอีเมล', 'โรงเรียนอนุมัติ'];
      modal.dataset.tone = copy.tone;
      modal.innerHTML = `<div class="auth-notice-top"><span class="auth-notice-icon">${kind === 'pending' ? authIcons.check : kind === 'verify' || kind === 'unconfirmed' ? authIcons.mail : copy.tone === 'error' || copy.tone === 'warning' ? '!' : 'i'}</span><button type="button" class="auth-notice-close" aria-label="ปิดหน้าต่างแจ้งเตือน">×</button></div>
        <h2 id="gpAuthNoticeTitle">${copy.title}</h2><p id="gpAuthNoticeText">${copy.text}</p>
        ${validEmail && ['verify','unconfirmed','pending','reset_sent'].includes(kind) ? `<div class="auth-notice-email">${escapeHtml(email)}</div>` : ''}
        ${copy.step ? `<ol class="auth-notice-steps" aria-label="สถานะบัญชี">${steps.map((step, index) => `<li class="${index + 1 < copy.step ? 'done' : index + 1 === copy.step ? 'current' : ''}" ${index + 1 === copy.step ? 'aria-current="step"' : ''}><span>${index + 1 < copy.step ? authIcons.check : index + 1}</span><div>${step}<small>${index + 1 < copy.step ? 'เรียบร้อย' : index + 1 === copy.step ? 'กำลังดำเนินการ' : 'ยังไม่ถึงขั้นตอนนี้'}</small></div></li>`).join('')}</ol>` : ''}
        <p class="auth-notice-feedback" id="gpAuthNoticeFeedback" role="status" hidden></p>
        <div class="auth-notice-actions">
          ${canOpenMail ? '<a class="auth-primary" href="https://mail.google.com/" target="_blank" rel="noopener noreferrer">เปิด Gmail</a>' : ''}
          ${emailConfirmed ? '<button type="button" class="auth-primary" data-notice-retry>ตรวจสอบสถานะอีกครั้ง</button><button type="button" class="auth-secondary" data-notice-logout>ออกจากระบบ</button>' : `<button type="button" class="${canOpenMail ? 'auth-secondary' : 'auth-primary'}" data-notice-dismiss>${copy.step === 2 ? 'กลับไปเข้าสู่ระบบ' : 'เข้าใจแล้ว'}</button>`}
          ${canResend ? '<button type="button" class="auth-notice-resend" data-notice-resend>ส่งอีเมลยืนยันใหม่</button>' : ''}
          ${['credentials','help','recovery_invalid'].includes(kind) ? '<button type="button" class="auth-secondary" data-notice-reset>ขอตั้งรหัสผ่านใหม่</button>' : ''}
        </div>`;
      const dismiss = () => modal.close();
      modal.querySelector('[data-notice-reset]')?.addEventListener('click', () => { dismiss(); openPasswordReset(email); });
      modal.querySelector('.auth-notice-close').addEventListener('click', dismiss);
      modal.querySelector('[data-notice-dismiss]')?.addEventListener('click', dismiss);
      modal.querySelector('[data-notice-logout]')?.addEventListener('click', async () => { dismiss(); await logout(); });
      modal.querySelector('[data-notice-retry]')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true; button.textContent = 'กำลังตรวจสอบ...';
        try { await gpSetUser(); showAuthNotice('approved'); }
        catch (error) { showAuthNotice(authNoticeKind(error), email, error.message); }
      });
      const resend = modal.querySelector('[data-notice-resend]');
      if (resend) resend.addEventListener('click', async () => {
        const feedback = modal.querySelector('#gpAuthNoticeFeedback');
        feedback.hidden = false;
        if (Date.now() < authResendUntil) { feedback.textContent = 'กรุณารอประมาณ ' + Math.ceil((authResendUntil - Date.now()) / 1000) + ' วินาทีก่อนส่งใหม่'; return; }
        if (!gpClient) { feedback.textContent = 'ระบบยังไม่พร้อม กรุณารีเฟรชหน้าเว็บ'; return; }
        authResendUntil = Date.now() + 60000;
        resend.disabled = true;
        try {
          const { error } = await gpClient.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin } });
          if (error) throw error;
          feedback.textContent = 'หากบัญชีนี้ยังรอการยืนยัน คุณจะได้รับอีเมลใหม่ กรุณาตรวจสอบกล่องจดหมายและ Spam';
        } catch (error) { feedback.textContent = authNoticeCopy[authNoticeKind(error)]?.text || authNoticeCopy.error.text; }
        finally { resend.disabled = false; }
      });
      if (!modal.open) modal.showModal();
      modal.querySelector('.auth-primary')?.focus();
    }

    function authLookupKey(value) {
      return String(value || '').trim().toLowerCase();
    }

    function maskStudentId(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      if (text.length <= 4) return text;
      return text.replace(/(.{2}).+(.{2})/, '$1***$2');
    }

    function normalizeAuthUser(user = {}) {
      const firstName = String(user.FirstName || user.firstName || '').trim();
      const lastName = String(user.LastName || user.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const username = String(user.Username || user.username || '').trim();
      const email = String(user.Email || user.email || '').trim();
      const studentId = String(user.StudentID || user.StudentId || user.studentId || '').trim();
      const displayName = String(user.DisplayName || user.displayName || fullName || username || email || studentId || 'Green User').trim();
      const userId = String(user.UserID || user.userId || studentId || username || email || displayName).trim();
      return {
        UserID: userId,
        Username: username,
        Email: email,
        Role: String(user.Role || user.role || 'student').trim() || 'student',
        DisplayName: displayName,
        FirstName: firstName,
        LastName: lastName,
        ClassName: String(user.ClassName || user.className || '').trim(),
        StudentID: studentId,
        StudentIDMasked: String(user.StudentIDMasked || user.studentIDMasked || maskStudentId(studentId || userId)).trim(),
        HouseholdName: String(user.HouseholdName || user.householdName || '').trim(),
        Avatar: String(user.Avatar || user.avatar || avatarText(displayName)).trim(),
        ConsentStatus: String(user.ConsentStatus || user.consentStatus || '').trim(),
        Status: String(user.Status || user.status || 'active').trim(),
        CreatedAt: user.CreatedAt || user.createdAt || '',
        LastLoginAt: user.LastLoginAt || user.lastLoginAt || '',
      };
    }

    function publicAuthUser(user) {
      const clean = normalizeAuthUser(user || {});
      return clean;
    }

    function currentUserIdentity() {
      const user = normalizeAuthUser(state.currentUser || {});
      return {
        UserID: user.UserID || user.StudentID || user.Username || user.DisplayName,
        DisplayName: user.DisplayName || `${user.FirstName || ''} ${user.LastName || ''}`.trim() || user.Username || 'Green User',
        ClassName: user.ClassName || '',
        StudentID: user.StudentID || user.UserID || '',
        HouseholdName: user.HouseholdName || '',
        Role: user.Role || 'student',
      };
    }

    function userModeFromRole(role) {
      const value = String(role || '').toLowerCase();
      if (['parent','teacher','leader'].includes(value)) return value;
      return 'student';
    }

    function applyCurrentUserToState() {
      if (!state.currentUser) return;
      const user = normalizeAuthUser(state.currentUser);
      state.currentUser = user;
      state.userMode = userModeFromRole(user.Role);
      localStorage.setItem('greenPassportUserMode', state.userMode);
      state.chatIdentity = {
        DisplayName: user.DisplayName,
        ClassName: user.ClassName,
        UserID: user.UserID,
      };
      localStorage.setItem('greenPassportChatIdentity', JSON.stringify(state.chatIdentity));
      state.profileUserID = user.UserID;
      const profile = {
        UserID: user.UserID,
        DisplayName: user.DisplayName,
        FirstName: user.FirstName,
        LastName: user.LastName,
        ClassName: user.ClassName,
        StudentIDMasked: user.StudentIDMasked,
        Avatar: user.Avatar || avatarText(user.DisplayName),
        CurrentLevel: 'Green Starter',
        CurrentEXP: 0,
        TotalScore: 0,
        TotalStars: 0,
        TotalBadges: 0,
        TotalPosts: 0,
        TotalComments: 0,
        TotalSubmissions: 0,
        TotalCO2e: 0,
        HouseholdStatus: user.HouseholdName || '',
        LastActiveAt: nowStamp(),
        ConsentStatus: user.ConsentStatus || 'ยินยอม',
      };
      const profiles = state.data.userProfiles || [];
      const index = profiles.findIndex((item) => String(item.UserID || item.DisplayName) === String(user.UserID));
      if (index >= 0) profiles[index] = Object.assign({}, profile, profiles[index], { LastActiveAt: nowStamp() });
      else profiles.unshift(profile);
      state.data.userProfiles = profiles;
      const nameParts = splitUserName(user);
      state.game.profile.firstName ||= nameParts.firstName;
      state.game.profile.lastName ||= nameParts.lastName;
      state.game.profile.className ||= user.ClassName;
      state.game.profile.studentId ||= user.StudentID || user.UserID;
      state.game.profile.teamName ||= `${user.DisplayName} Green Team`;
    }

    function splitUserName(user) {
      const normalized = normalizeAuthUser(user || {});
      if (normalized.FirstName || normalized.LastName) return { firstName: normalized.FirstName, lastName: normalized.LastName };
      const parts = String(normalized.DisplayName || '').trim().split(/\s+/);
      return { firstName: parts.shift() || normalized.DisplayName || 'Green', lastName: parts.join(' ') || 'User' };
    }

    function authRecordDefaults() {
      const user = currentUserIdentity();
      return {
        UserID: user.UserID,
        StudentName: `${state.currentUser?.FirstName || ''} ${state.currentUser?.LastName || ''}`.trim() || user.DisplayName,
        ClassName: user.ClassName,
        StudentID: user.StudentID,
        HouseholdName: user.HouseholdName || `${user.DisplayName} Home`,
      };
    }

    function localAuthUsers() {
      return readJsonStorage(LOCAL_AUTH_USERS_KEY, []);
    }

    function saveLocalAuthUsers(users) {
      localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users || []));
    }

    async function hashText(value) {
      const text = String(value || '');
      if (window.crypto?.subtle && window.TextEncoder) {
        const bytes = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      }
      let hash = 0;
      for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash) + text.charCodeAt(i);
      return `fallback-${Math.abs(hash)}`;
    }

    function randomToken(prefix = 'local') {
      return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    }

    async function localSignupUser(user, password) {
      const users = localAuthUsers();
      const normalized = normalizeAuthUser(user);
      normalized.UserID = normalized.UserID || normalized.StudentID || normalized.Username || normalized.Email;
      const keys = [normalized.Username, normalized.Email, normalized.UserID, normalized.StudentID].map(authLookupKey).filter(Boolean);
      const duplicate = users.some((item) => [item.Username, item.Email, item.UserID, item.StudentID].some((value) => keys.includes(authLookupKey(value))));
      if (duplicate) throw new Error('บัญชีนี้มีอยู่แล้ว กรุณา Login หรือใช้ Username อื่น');
      const salt = randomToken('salt');
      const stored = Object.assign({}, normalized, {
        PasswordSalt: salt,
        PasswordHash: await hashText(`${salt}:${password}:green-passport`),
        CreatedAt: new Date().toISOString(),
        LastLoginAt: new Date().toISOString(),
        Status: 'active',
      });
      users.push(stored);
      saveLocalAuthUsers(users);
      return { ok: true, token: randomToken('local-session'), user: publicAuthUser(stored), local: true };
    }

    async function localLoginUser(login, password) {
      const key = authLookupKey(login);
      const users = localAuthUsers();
      const user = users.find((item) => [item.Username, item.Email, item.UserID, item.StudentID].some((value) => authLookupKey(value) === key));
      if (!user) throw new Error('ไม่พบบัญชีนี้ในเครื่อง');
      const hash = await hashText(`${user.PasswordSalt}:${password}:green-passport`);
      if (hash !== user.PasswordHash) throw new Error('รหัสผ่านไม่ถูกต้อง');
      user.LastLoginAt = new Date().toISOString();
      saveLocalAuthUsers(users);
      return { ok: true, token: randomToken('local-session'), user: publicAuthUser(user), local: true };
    }

    async function completeAuthSession(result, remember = true) {
      const session = {
        token: result.token || randomToken('session'),
        user: normalizeAuthUser(result.user || {}),
      };
      state.authToken = session.token;
      state.currentUser = session.user;
      state.authMessage = '';
      state.authMessageType = '';
      if (remember) persistAuthSession(session);
      else sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      applyCurrentUserToState();
      document.body.classList.remove('auth-locked');
      renderNav();
      renderAll();
      try {
        await reloadData(true);
        applyCurrentUserToState();
        if (firebaseFs) {
          await fetchUserProfilesFromFirestore();
        }
        if (state.active === 'chat' && firebaseDb) {
          subscribeToFirebaseChat(state.chatRoom || 'CR-MISSION-01');
        }
        saveToLocalStorage();
        await syncPendingWrites();
        renderAll();
      } catch (error) {
        console.warn(error);
      }
    }

    async function submitLogin(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const login = String(data.login || '').trim();
      const password = String(data.password || '');
      if (!login || !password) {
        setAuthMessage('กรุณากรอก Username และ Password', 'bad');
        return;
      }
      state.authBusy = true;
      renderAuth();
      try {
        let result;
        if (firebaseAuth) {
          const email = await firebaseEmailLookup(login);
          const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
          const uid = userCredential.user.uid;
          const profileDoc = await firebaseFs.collection('userProfiles').doc(uid).get();
          if (!profileDoc.exists) {
            throw new Error('ไม่พบข้อมูลโปรไฟล์ผู้ใช้ในระบบ Firestore');
          }
          const profile = profileDoc.data();
          result = {
            ok: true,
            token: userCredential.user.refreshToken || uid,
            user: {
              UserID: uid,
              Username: profile.Username || login,
              Email: email,
              Role: profile.Role || 'student',
              FirstName: profile.FirstName || '',
              LastName: profile.LastName || '',
              DisplayName: profile.DisplayName || '',
              ClassName: profile.ClassName || '',
              StudentID: profile.StudentID || '',
              HouseholdName: profile.HouseholdStatus || '',
              ConsentStatus: profile.ConsentStatus || 'ยินยอม'
            }
          };
        } else {
          result = sheetApiConfigured()
            ? await sheetApi('loginUser', { login, password })
            : await localLoginUser(login, password);
        }
        await completeAuthSession(result, !!data.remember);
      } catch (remoteError) {
        try {
          const localResult = await localLoginUser(login, password);
          await completeAuthSession(localResult, !!data.remember);
        } catch (localError) {
          state.authBusy = false;
          setAuthMessage(`${remoteError.message || remoteError} ${sheetApiConfigured() ? '| Local: ' + (localError.message || localError) : ''}`, 'bad');
        }
      } finally {
        state.authBusy = false;
      }
    }

    async function submitSignup(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const password = String(data.Password || '');
      const confirm = String(data.ConfirmPassword || '');
      if (password.length < 6) {
        setAuthMessage('Password ต้องมีอย่างน้อย 6 ตัวอักษร', 'bad');
        return;
      }
      if (password !== confirm) {
        setAuthMessage('Password และ Confirm Password ไม่ตรงกัน', 'bad');
        return;
      }
      const user = normalizeAuthUser({
        Username: data.Username,
        Email: data.Email,
        Role: data.Role,
        FirstName: data.FirstName,
        LastName: data.LastName,
        DisplayName: data.DisplayName || `${data.FirstName || ''} ${data.LastName || ''}`.trim(),
        ClassName: data.ClassName,
        StudentID: data.StudentID,
        UserID: data.StudentID || data.Username || data.Email,
        HouseholdName: data.HouseholdName,
        ConsentStatus: data.Consent ? 'ยินยอม' : '',
      });
      state.authBusy = true;
      renderAuth();
      try {
        let result;
        if (firebaseAuth) {
          const usernameClean = String(data.Username || '').trim().toLowerCase();
          const usernameDoc = await firebaseFs.collection('usernames').doc(usernameClean).get();
          if (usernameDoc.exists) {
            throw new Error('Username นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น');
          }
          if (data.StudentID) {
            const studentClean = String(data.StudentID || '').trim().toLowerCase();
            const studentDoc = await firebaseFs.collection('studentIDs').doc(studentClean).get();
            if (studentDoc.exists) {
              throw new Error('รหัสนักเรียนนี้ถูกลงทะเบียนไว้แล้ว');
            }
          }
          const email = deriveEmail(data.Username || data.StudentID, data.Email);
          const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
          const uid = userCredential.user.uid;
          
          const profile = {
            UserID: uid,
            Username: data.Username,
            Email: email,
            Role: data.Role,
            FirstName: data.FirstName,
            LastName: data.LastName,
            DisplayName: user.DisplayName,
            ClassName: data.ClassName,
            StudentID: data.StudentID || '',
            HouseholdStatus: data.HouseholdName || '',
            ConsentStatus: data.Consent ? 'ยินยอม' : '',
            CurrentLevel: 'Green Starter',
            CurrentEXP: 0,
            TotalScore: 0,
            TotalStars: 0,
            TotalBadges: 0,
            TotalPosts: 0,
            TotalComments: 0,
            TotalSubmissions: 0,
            TotalCO2e: 0,
            LastActiveAt: nowStamp()
          };
          
          const batch = firebaseFs.batch();
          batch.set(firebaseFs.collection('userProfiles').doc(uid), profile);
          batch.set(firebaseFs.collection('usernames').doc(usernameClean), { email: email, uid: uid });
          if (data.StudentID) {
            const studentClean = String(data.StudentID || '').trim().toLowerCase();
            batch.set(firebaseFs.collection('studentIDs').doc(studentClean), { email: email, uid: uid });
          }
          await batch.commit();
          
          result = {
            ok: true,
            token: userCredential.user.refreshToken || uid,
            user: {
              UserID: uid,
              Username: data.Username,
              Email: email,
              Role: data.Role,
              FirstName: data.FirstName,
              LastName: data.LastName,
              DisplayName: user.DisplayName,
              ClassName: data.ClassName,
              StudentID: data.StudentID || '',
              HouseholdName: data.HouseholdName || '',
              ConsentStatus: data.Consent ? 'ยินยอม' : ''
            }
          };
        } else {
          result = sheetApiConfigured()
            ? await sheetApi('signupUser', { user, password })
            : await localSignupUser(user, password);
        }
        await completeAuthSession(result, true);
      } catch (remoteError) {
        try {
          const localResult = await localSignupUser(user, password);
          await completeAuthSession(localResult, true);
          alert('สมัครบัญชีในเครื่องสำเร็จ แต่ยังไม่ได้บันทึกไป Google Sheets/Firebase: ' + (remoteError.message || remoteError));
        } catch (localError) {
          state.authBusy = false;
          setAuthMessage(`${remoteError.message || remoteError} | Local: ${localError.message || localError}`, 'bad');
        }
      } finally {
        state.authBusy = false;
      }
    }

    async function logout() {
      const token = state.authToken;
      clearAuthSession();
      state.active = 'home';
      if (firebaseAuth) {
        try { await firebaseAuth.signOut(); } catch (e) {}
      }
      if (currentChatSubscription) {
        currentChatSubscription.off();
        currentChatSubscription = null;
      }
      renderAuth();
      if (sheetApiConfigured() && token && !firebaseAuth) {
        try { await sheetApi('logoutUser', { token }); } catch (e) {}
      }
    }

    function renderAuthUserChip() {
      const chips = Array.from(new Set([
        ...document.querySelectorAll('[data-auth-user-chip]'),
        document.getElementById('authUserChip'),
      ].filter(Boolean)));
      if (!chips.length) return;
      if (!isAuthenticated()) {
        chips.forEach((chip) => {
          chip.hidden = true;
          chip.innerHTML = '';
        });
        return;
      }
      const user = currentUserIdentity();
      const chipHtml = `
        <button type="button" class="auth-user-profile-trigger" onclick="showOwnProfile()" title="เปิดโปรไฟล์">
          <div class="avatar">${escapeHtml(avatarText(user.DisplayName))}</div>
          <span class="auth-user-profile-text">
            <strong>${escapeHtml(user.DisplayName)}</strong>
            <span>${escapeHtml(user.ClassName || user.Role || 'Green Passport')}</span>
          </span>
        </button>
        <button type="button" class="auth-user-logout" onclick="logout()" title="ออกจากระบบ" aria-label="ออกจากระบบ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17H5V7h5M14 8l4 4-4 4m-6-4h10"/></svg></button>`;
      chips.forEach((chip) => {
        chip.hidden = false;
        chip.innerHTML = chipHtml;
      });
    }
