// ── helpers ──
function showAlert(el, msg, type) {
  el.textContent = msg;
  el.className = `login-alert ${type}`;
}
function hideAlert(el) {
  el.className = 'login-alert';
}

// ── LOGIN FORM ──
const loginForm  = document.getElementById('loginForm');
const loginBtn   = document.getElementById('loginBtn');
const loginAlert = document.getElementById('loginAlert');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(loginAlert);

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showAlert(loginAlert, 'Por favor completa todos los campos.', 'error');
      return;
    }

    loginBtn.classList.add('loading');

    try {
      const res  = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.alert === 'success') {
        showAlert(loginAlert, 'Acceso concedido. Redirigiendo…', 'success');
        setTimeout(() => window.location = data.redirect, 900);
      } else {
        showAlert(loginAlert, data.message || 'Credenciales incorrectas.', 'error');
        loginBtn.classList.remove('loading');
      }
    } catch {
      showAlert(loginAlert, 'Error de conexión. Intenta de nuevo.', 'error');
      loginBtn.classList.remove('loading');
    }
  });
}

// ── RECOVERY MODAL ──
const overlay = document.getElementById('recoveryOverlay');
const step1   = document.getElementById('step1');
const step2   = document.getElementById('step2');
const alert1  = document.getElementById('alert1');
const alert2  = document.getElementById('alert2');

function openModal() {
  overlay.classList.add('open');
  step1.classList.add('active');
  step2.classList.remove('active');
  hideAlert(alert1);
  hideAlert(alert2);
}
function closeModal() {
  overlay.classList.remove('open');
}

const openBtn = document.getElementById('openRecovery');
if (openBtn) openBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });

const closeBtn = document.getElementById('closeModal');
if (closeBtn) closeBtn.addEventListener('click', closeModal);

if (overlay) {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

// Step 1 — Send OTP
const btnSendCode = document.getElementById('btnSendCode');
if (btnSendCode) {
  btnSendCode.addEventListener('click', async () => {
    const email = document.getElementById('recoveryEmail').value.trim();
    if (!email) { showAlert(alert1, 'Ingresa tu correo electrónico.', 'error'); return; }

    const orig = btnSendCode.textContent;
    btnSendCode.textContent = 'Enviando…';
    btnSendCode.disabled = true;

    try {
      const res  = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        step1.classList.remove('active');
        step2.classList.add('active');
      } else {
        showAlert(alert1, data.error || 'No se pudo enviar el código.', 'error');
      }
    } catch {
      showAlert(alert1, 'Error de conexión.', 'error');
    } finally {
      btnSendCode.textContent = orig;
      btnSendCode.disabled = false;
    }
  });
}

// Step 2 — Reset Password
const btnReset = document.getElementById('btnReset');
if (btnReset) {
  btnReset.addEventListener('click', async () => {
    const email       = document.getElementById('recoveryEmail').value.trim();
    const otpCode     = document.getElementById('otpCode').value.trim();
    const newPassword = document.getElementById('newPassword').value;

    if (!otpCode || !newPassword) { showAlert(alert2, 'Completa todos los campos.', 'error'); return; }
    if (newPassword.length < 5)   { showAlert(alert2, 'La contraseña debe tener mínimo 5 caracteres.', 'error'); return; }

    const orig = btnReset.textContent;
    btnReset.textContent = 'Verificando…';
    btnReset.disabled = true;

    try {
      const res  = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        showAlert(alert2, '¡Contraseña actualizada! Ya puedes iniciar sesión.', 'success');
        setTimeout(closeModal, 2200);
      } else {
        showAlert(alert2, data.error || 'Código inválido o expirado.', 'error');
      }
    } catch {
      showAlert(alert2, 'Error de conexión.', 'error');
    } finally {
      btnReset.textContent = orig;
      btnReset.disabled = false;
    }
  });
}

// Back button
const btnBack = document.getElementById('btnBack');
if (btnBack) {
  btnBack.addEventListener('click', () => {
    step2.classList.remove('active');
    step1.classList.add('active');
    hideAlert(alert2);
  });
}