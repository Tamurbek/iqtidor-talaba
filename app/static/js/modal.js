/**
 * Iqtidorli Talabalar Portali - Global Modal & Toast UI System
 * Provides rich, modern modal dialogs (Alert, Confirm, Prompt) and non-blocking Toasts.
 */

(function () {
  // 1. Create Toast Container if not exists
  let toastContainer = document.getElementById('globalToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'globalToastContainer';
    toastContainer.className = 'global-toast-container';
    document.body ? document.body.appendChild(toastContainer) : document.addEventListener('DOMContentLoaded', () => document.body.appendChild(toastContainer));
  }

  // 2. SVG Icons helper
  const ICONS = {
    success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  };

  /**
   * Show a beautiful floating toast message
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration ms (default 3500)
   */
  window.showToast = function (message, type = 'info', duration = 3500) {
    if (!toastContainer) {
      toastContainer = document.getElementById('globalToastContainer');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'globalToastContainer';
        toastContainer.className = 'global-toast-container';
        document.body.appendChild(toastContainer);
      }
    }

    const toast = document.createElement('div');
    toast.className = `global-toast toast-${type}`;
    
    const icon = ICONS[type] || ICONS.info;

    toast.innerHTML = `
      <div class="toast-icon-wrap">${icon}</div>
      <div class="toast-body-wrap">
        <div class="toast-text">${message}</div>
      </div>
      <button class="toast-close-btn" aria-label="Yopish">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    toastContainer.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    const closeToast = () => {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    };

    toast.querySelector('.toast-close-btn').addEventListener('click', closeToast);

    if (duration > 0) {
      setTimeout(closeToast, duration);
    }
  };

  // Base Modal Creator
  function createModalBackdrop(contentHtml) {
    const backdrop = document.createElement('div');
    backdrop.className = 'global-modal-backdrop';
    backdrop.innerHTML = `
      <div class="global-modal-card">
        ${contentHtml}
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => {
      backdrop.classList.add('modal-backdrop-show');
      backdrop.querySelector('.global-modal-card').classList.add('modal-card-show');
    });

    function close() {
      backdrop.classList.remove('modal-backdrop-show');
      backdrop.querySelector('.global-modal-card').classList.remove('modal-card-show');
      setTimeout(() => {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      }, 250);
    }

    return { backdrop, close };
  }

  /**
   * Open Custom Alert Modal
   * @param {Object} opts { title, message, type, confirmText }
   * @returns {Promise<void>}
   */
  window.openAlertModal = function (opts = {}) {
    const title = opts.title || (opts.type === 'error' ? 'Xatolik' : opts.type === 'success' ? 'Muvaffaqiyatli' : 'Ma\'lumot');
    const message = opts.message || '';
    const type = opts.type || 'info';
    const confirmText = opts.confirmText || 'Tushunarli';
    const icon = ICONS[type] || ICONS.info;

    return new Promise((resolve) => {
      const html = `
        <div class="modal-header-icon modal-icon-${type}">
          ${icon}
        </div>
        <h3 class="modal-title">${title}</h3>
        <div class="modal-body-text">${message}</div>
        <div class="modal-actions-single">
          <button type="button" class="modal-btn modal-btn-primary" id="modalConfirmBtn">${confirmText}</button>
        </div>
      `;

      const { backdrop, close } = createModalBackdrop(html);

      const confirmBtn = backdrop.querySelector('#modalConfirmBtn');
      confirmBtn.focus();

      const onConfirm = () => {
        close();
        resolve();
      };

      confirmBtn.addEventListener('click', onConfirm);

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) onConfirm();
      });

      const onKeyDown = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          document.removeEventListener('keydown', onKeyDown);
          onConfirm();
        }
      };
      document.addEventListener('keydown', onKeyDown);
    });
  };

  /**
   * Open Custom Confirm Modal
   * @param {Object} opts { title, message, confirmText, cancelText, type }
   * @returns {Promise<boolean>}
   */
  window.openConfirmModal = function (opts = {}) {
    const title = opts.title || 'Tasdiqlash';
    const message = opts.message || 'Ushbu amalni bajarishni tasdiqlaysizmi?';
    const confirmText = opts.confirmText || 'Ha, tasdiqlayman';
    const cancelText = opts.cancelText || 'Bekor qilish';
    const type = opts.type || 'warning';
    const icon = ICONS[type] || ICONS.warning;

    return new Promise((resolve) => {
      const html = `
        <div class="modal-header-icon modal-icon-${type}">
          ${icon}
        </div>
        <h3 class="modal-title">${title}</h3>
        <div class="modal-body-text">${message}</div>
        <div class="modal-actions-row">
          <button type="button" class="modal-btn modal-btn-secondary" id="modalCancelBtn">${cancelText}</button>
          <button type="button" class="modal-btn modal-btn-${type === 'error' ? 'danger' : 'primary'}" id="modalConfirmBtn">${confirmText}</button>
        </div>
      `;

      const { backdrop, close } = createModalBackdrop(html);

      const confirmBtn = backdrop.querySelector('#modalConfirmBtn');
      const cancelBtn = backdrop.querySelector('#modalCancelBtn');
      confirmBtn.focus();

      let handled = false;
      const finish = (result) => {
        if (handled) return;
        handled = true;
        document.removeEventListener('keydown', onKeyDown);
        close();
        resolve(result);
      };

      confirmBtn.addEventListener('click', () => finish(true));
      cancelBtn.addEventListener('click', () => finish(false));

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) finish(false);
      });

      const onKeyDown = (e) => {
        if (e.key === 'Escape') finish(false);
      };
      document.addEventListener('keydown', onKeyDown);
    });
  };

  /**
   * Open Custom Prompt Modal
   * @param {Object} opts { title, message, label, defaultValue, placeholder, inputType, confirmText, cancelText }
   * @returns {Promise<string|null>}
   */
  window.openPromptModal = function (opts = {}) {
    const title = opts.title || 'Ma\'lumot kiritish';
    const message = opts.message || '';
    const label = opts.label || '';
    const defaultValue = opts.defaultValue !== undefined ? opts.defaultValue : '';
    const placeholder = opts.placeholder || '';
    const inputType = opts.inputType || 'text';
    const confirmText = opts.confirmText || 'Saqlash';
    const cancelText = opts.cancelText || 'Bekor qilish';

    return new Promise((resolve) => {
      const inputElement = inputType === 'textarea' 
        ? `<textarea id="modalPromptInput" class="modal-input-field modal-textarea" rows="4" placeholder="${placeholder}">${defaultValue}</textarea>`
        : `<input id="modalPromptInput" type="${inputType}" class="modal-input-field" value="${defaultValue}" placeholder="${placeholder}" ${inputType === 'number' ? 'step="any"' : ''} />`;

      const html = `
        <div class="modal-header-icon modal-icon-info">
          ${ICONS.info}
        </div>
        <h3 class="modal-title">${title}</h3>
        ${message ? `<div class="modal-body-text">${message}</div>` : ''}
        <div class="modal-form-group">
          ${label ? `<label class="modal-input-label" for="modalPromptInput">${label}</label>` : ''}
          ${inputElement}
        </div>
        <div class="modal-actions-row">
          <button type="button" class="modal-btn modal-btn-secondary" id="modalCancelBtn">${cancelText}</button>
          <button type="button" class="modal-btn modal-btn-primary" id="modalConfirmBtn">${confirmText}</button>
        </div>
      `;

      const { backdrop, close } = createModalBackdrop(html);

      const input = backdrop.querySelector('#modalPromptInput');
      const confirmBtn = backdrop.querySelector('#modalConfirmBtn');
      const cancelBtn = backdrop.querySelector('#modalCancelBtn');

      setTimeout(() => {
        if (input) {
          input.focus();
          if (input.select) input.select();
        }
      }, 100);

      let handled = false;
      const finish = (result) => {
        if (handled) return;
        handled = true;
        document.removeEventListener('keydown', onKeyDown);
        close();
        resolve(result);
      };

      confirmBtn.addEventListener('click', () => {
        finish(input.value);
      });

      cancelBtn.addEventListener('click', () => finish(null));

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) finish(null);
      });

      const onKeyDown = (e) => {
        if (e.key === 'Escape') finish(null);
        if (e.key === 'Enter' && inputType !== 'textarea') finish(input.value);
      };
      document.addEventListener('keydown', onKeyDown);
    });
  };

})();
