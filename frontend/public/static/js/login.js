document.addEventListener('DOMContentLoaded', () => {
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('passwordInput');
  const loginForm = document.getElementById('loginForm');
  const alertBox = document.getElementById('loginAlert');
  const submitBtn = document.getElementById('submitBtn');

  // 1. Password reveal toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);

      // Update eye icon SVG
      if (type === 'text') {
        togglePasswordBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
      } else {
        togglePasswordBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    });
  }

  // 2. Login submit handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const login = document.getElementById('loginInput').value.trim();
      const password = passwordInput.value;
      const rememberMe = document.getElementById('rememberMe').checked;

      if (!login || !password) {
        showAlert('Iltimos, HEMIS ID va parolingizni kiriting', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Kirilmoqda...';
      hideAlert();

      try {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            login: login,
            password: password,
            remember_me: rememberMe
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Tizimga kirishda xatolik yuz berdi');
        }

        showAlert(`Xush kelibsiz, ${data.user.full_name}! Yo'naltirilmoqda...`, 'success');

        // Store in localStorage if needed
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('portal_last_activity', Date.now().toString());
        sessionStorage.setItem('just_logged_in', 'true');
        sessionStorage.removeItem('inactivity_notice_dismissed');

        setTimeout(() => {
          const redirectUrl = data.user.role === 'admin' ? '/admin' : '/dashboard';
          window.location.href = redirectUrl;
        }, 800);

      } catch (err) {
        showAlert(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tizimga kirish';
      }
    });
  }

  // Check URL query parameters for session expiration
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reason') === 'inactivity') {
    showAlert("Xavfsizlik talablariga muvofiq, 30 daqiqa harakatsiz qolganingiz sababli sessiyangiz avtomatik yakunlandi. Davom etish uchun iltimos qaytadan kiring.", 'warning');
  }

  function showAlert(message, type) {
    if (!alertBox) return;
    alertBox.className = `login-alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.style.display = 'block';
  }

  function hideAlert() {
    if (!alertBox) return;
    alertBox.style.display = 'none';
  }
});

// ==============================================================================
// Parolni tiklash (Forgot Password) Countdown Slider Modal
// ==============================================================================
let forgotCountdownTimer = null;
const FORGOT_TOTAL_SECONDS = 8;
let forgotRemainingSeconds = FORGOT_TOTAL_SECONDS;

window.openForgotPasswordModal = function () {
  const modal = document.getElementById('forgotPasswordModal');
  if (!modal) return;

  modal.style.display = 'flex';
  modal.classList.remove('fade-out');
  forgotRemainingSeconds = FORGOT_TOTAL_SECONDS;

  const countNum = document.getElementById('forgotCountdownNum');
  const btnCount = document.getElementById('btnForgotCountdown');
  const bar = document.getElementById('forgotProgressBar');

  if (countNum) countNum.innerText = `${forgotRemainingSeconds} soniya`;
  if (btnCount) btnCount.innerText = `${forgotRemainingSeconds}s`;

  if (bar) {
    bar.style.transition = 'none';
    bar.style.width = '100%';
    // Force browser reflow to reset CSS transition
    void bar.offsetWidth;
    // Animate smoothly to 0% over total duration
    bar.style.transition = `width ${FORGOT_TOTAL_SECONDS}s linear`;
    bar.style.width = '0%';
  }

  clearInterval(forgotCountdownTimer);
  forgotCountdownTimer = setInterval(() => {
    forgotRemainingSeconds--;
    if (countNum) countNum.innerText = `${forgotRemainingSeconds} soniya`;
    if (btnCount) btnCount.innerText = `${forgotRemainingSeconds}s`;

    if (forgotRemainingSeconds <= 0) {
      clearInterval(forgotCountdownTimer);
      window.closeForgotPasswordModal();
    }
  }, 1000);
};

window.closeForgotPasswordModal = function () {
  const modal = document.getElementById('forgotPasswordModal');
  clearInterval(forgotCountdownTimer);
  if (!modal) return;

  modal.classList.add('fade-out');
  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.remove('fade-out');
    const bar = document.getElementById('forgotProgressBar');
    if (bar) {
      bar.style.transition = 'none';
      bar.style.width = '100%';
    }
  }, 220);
};

// Modal foniga bosilganda yoki Escape bosilganda yopish
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        window.closeForgotPasswordModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const forgotModal = document.getElementById('forgotPasswordModal');
      if (forgotModal && forgotModal.style.display !== 'none') {
        window.closeForgotPasswordModal();
      }
      const eimzoModal = document.getElementById('eimzoModal');
      if (eimzoModal && eimzoModal.style.display !== 'none' && typeof closeEimzoModal === 'function') {
        closeEimzoModal();
      }
    }
  });
});

