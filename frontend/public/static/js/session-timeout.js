// ==========================================================================
// SESSION INACTIVITY MONITOR & AUTO-LOGOUT (30 MINUTES)
// O'zMU Jizzax Filiali - Iqtidorli Talabalar Portali
// ==========================================================================

(function () {
  'use strict';

  // Constants
  const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
  const WARNING_THRESHOLD_MS = 28 * 60 * 1000; // Warning at 28 minutes (2 mins left)
  const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds
  const TOAST_DURATION_MS = 6500; // Toast visible for 6.5s
  const STORAGE_KEY = 'portal_last_activity';

  let warningModalEl = null;
  let warningTimerInterval = null;
  let lastThrottledTime = 0;

  // Initialize last activity time if not set
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }

  // Record user activity with throttling (max once every 2 seconds)
  function recordActivity() {
    const now = Date.now();
    if (now - lastThrottledTime > 2000) {
      lastThrottledTime = now;
      localStorage.setItem(STORAGE_KEY, now.toString());
      // If warning modal was open, close it since user is active
      dismissWarningModal();
    }
  }

  // Listen to common user interaction events
  const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
  ACTIVITY_EVENTS.forEach(event => {
    window.addEventListener(event, recordActivity, { passive: true });
  });

  // Cross-tab synchronization via storage event
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      dismissWarningModal();
    }
  });

  // Check inactivity every 5 seconds
  setInterval(checkInactivity, CHECK_INTERVAL_MS);

  function checkInactivity() {
    const rawStored = localStorage.getItem(STORAGE_KEY);
    const lastActivity = rawStored ? parseInt(rawStored, 10) : Date.now();
    const elapsed = Date.now() - lastActivity;

    if (elapsed >= INACTIVITY_LIMIT_MS) {
      // 30 minutes elapsed -> perform real auto-logout
      executeAutoLogout();
    } else if (elapsed >= WARNING_THRESHOLD_MS) {
      // 28 minutes elapsed -> show warning modal with countdown
      const remainingSeconds = Math.max(0, Math.round((INACTIVITY_LIMIT_MS - elapsed) / 1000));
      showWarningModal(remainingSeconds);
    } else {
      dismissWarningModal();
    }
  }

  // Force auto-logout
  async function executeAutoLogout() {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Auto logout request error:', err);
    }

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();

    // Redirect to login page with clear reason
    window.location.href = '/login?reason=inactivity';
  }

  // ------------------------------------------------------------------------
  // 1. INACTIVITY NOTICE TOAST (Shows on login / entering dashboard)
  // ------------------------------------------------------------------------
  function showInactivityToast() {
    // Only show if just logged in OR first time in this session
    const justLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';
    const alreadyShown = sessionStorage.getItem('inactivity_toast_shown') === 'true';

    if (alreadyShown && !justLoggedIn) {
      return;
    }

    sessionStorage.setItem('inactivity_toast_shown', 'true');
    sessionStorage.removeItem('just_logged_in');

    // Create toast container if not exists
    let toastContainer = document.getElementById('inactivityToastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'inactivityToastContainer';
      toastContainer.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'session-inactivity-toast';
    toast.style.cssText = `
      pointer-events: auto;
      min-width: 330px;
      max-width: 420px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0b3b70;
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(11, 59, 112, 0.15), 0 2px 6px rgba(0, 0, 0, 0.06);
      padding: 14px 16px 12px;
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
      position: relative;
      overflow: hidden;
      font-family: inherit;
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="background: #eff6ff; color: #0b3b70; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #bfdbfe;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <circle cx="12" cy="11" r="3"></circle>
            <path d="M12 14v3"></path>
          </svg>
        </div>
        <div style="flex: 1; padding-right: 6px;">
          <div style="font-weight: 700; color: #0b3b70; font-size: 13.5px; line-height: 1.3;">Xavfsizlik eslatmasi</div>
          <p style="margin: 4px 0 0; font-size: 12.5px; color: #475569; line-height: 1.45;">
            Tizimda <strong>30 daqiqa</strong> davomida hech qanday harakat bo'lmasa, sessiyangiz xavfsizlik maqsadida avtomatik yakunlanadi.
          </p>
        </div>
        <button type="button" id="closeInactivityToastBtn" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: color 0.15s;" title="Yopish">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <!-- Progress Bar Timer -->
      <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #f1f5f9;">
        <div id="toastProgressBar" style="height: 100%; width: 100%; background: #0b3b70; transition: width ${TOAST_DURATION_MS}ms linear;"></div>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
      const prog = toast.querySelector('#toastProgressBar');
      if (prog) {
        requestAnimationFrame(() => {
          prog.style.width = '0%';
        });
      }
    });

    let dismissTimeout = null;

    function dismissToast() {
      if (dismissTimeout) clearTimeout(dismissTimeout);
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }

    const closeBtn = toast.querySelector('#closeInactivityToastBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', dismissToast);
      closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#0f172a'; });
      closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = '#94a3b8'; });
    }

    // Auto dismiss after TOAST_DURATION_MS
    dismissTimeout = setTimeout(dismissToast, TOAST_DURATION_MS);
  }

  // ------------------------------------------------------------------------
  // 2. WARNING MODAL (Appears during final 2 minutes of inactivity)
  // ------------------------------------------------------------------------
  function showWarningModal(secondsLeft) {
    if (warningModalEl) {
      const timeSpan = warningModalEl.querySelector('#inactivityCountDownSpan');
      if (timeSpan) timeSpan.innerText = formatTime(secondsLeft);
      return;
    }

    warningModalEl = document.createElement('div');
    warningModalEl.id = 'sessionWarningModalOverlay';
    warningModalEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeInWarning 0.25s ease-out;
    `;

    warningModalEl.innerHTML = `
      <div style="background: #ffffff; border-radius: 16px; max-width: 440px; width: 100%; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); text-align: center; border: 1px solid #fed7aa; position: relative;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; border: 2px solid #ffedd5;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <h3 style="margin: 0; font-size: 19px; font-weight: 800; color: #1e293b;">Sessiya yakunlanmoqda!</h3>
        <p style="margin: 10px 0 0; font-size: 14px; color: #64748b; line-height: 1.5;">
          Tizimda uzoq vaqt harakat bo'lmaganligi sababli, xavfsizlik yuzasidan yana 
          <strong id="inactivityCountDownSpan" style="color: #ea580c; font-size: 16px; font-weight: 800;">${formatTime(secondsLeft)}</strong>
          dan so'ng sessiyangiz avtomatik yopiladi.
        </p>
        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: center;">
          <button type="button" id="btnExtendSession" style="background: #0b3b70; color: #ffffff; border: none; padding: 11px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(11,59,112,0.25);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>Sessiyani davom ettirish</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(warningModalEl);

    const btnExtend = warningModalEl.querySelector('#btnExtendSession');
    if (btnExtend) {
      btnExtend.addEventListener('click', () => {
        recordActivity();
      });
    }

    // Live tick for countdown in modal
    if (warningTimerInterval) clearInterval(warningTimerInterval);
    warningTimerInterval = setInterval(() => {
      const rawStored = localStorage.getItem(STORAGE_KEY);
      const lastActivity = rawStored ? parseInt(rawStored, 10) : Date.now();
      const elapsed = Date.now() - lastActivity;
      const left = Math.max(0, Math.round((INACTIVITY_LIMIT_MS - elapsed) / 1000));
      
      const timeSpan = warningModalEl ? warningModalEl.querySelector('#inactivityCountDownSpan') : null;
      if (timeSpan) {
        timeSpan.innerText = formatTime(left);
      }

      if (left <= 0) {
        clearInterval(warningTimerInterval);
        executeAutoLogout();
      }
    }, 1000);
  }

  function dismissWarningModal() {
    if (warningTimerInterval) {
      clearInterval(warningTimerInterval);
      warningTimerInterval = null;
    }
    if (warningModalEl) {
      if (warningModalEl.parentNode) {
        warningModalEl.parentNode.removeChild(warningModalEl);
      }
      warningModalEl = null;
    }
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Developer / Admin Testing Helper
  window.testInactivityTimer = function (seconds = 10) {
    console.log(`[Session] Testing inactivity timer set to ${seconds} seconds.`);
    const simulatedPastTime = Date.now() - (INACTIVITY_LIMIT_MS - seconds * 1000);
    localStorage.setItem(STORAGE_KEY, simulatedPastTime.toString());
    checkInactivity();
  };

  // Run toast notification on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showInactivityToast);
  } else {
    showInactivityToast();
  }

})();
