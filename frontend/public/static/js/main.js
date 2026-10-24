// ==========================================================================
// IQTIDORLI TALABALAR - MAIN JAVASCRIPT
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-menu .nav-link');
  const aboutLink = document.getElementById('nav-about');
  const contestsLink = document.getElementById('nav-contests');

  function setActiveNav(targetLink) {
    navLinks.forEach(link => link.classList.remove('active'));
    if (targetLink) {
      targetLink.classList.add('active');
    }
  }

  // 1. Check current URL hash on page load (e.g., /#elonlar)
  if (window.location.pathname === '/' || window.location.pathname === '') {
    if (window.location.hash === '#elonlar' && contestsLink) {
      setActiveNav(contestsLink);
      setTimeout(() => {
        const el = document.getElementById('elonlar');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } else if ((window.location.hash === '#haqida' || !window.location.hash) && aboutLink) {
      setActiveNav(aboutLink);
    }
  }

  // 2. Click handler for nav links
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      
      // If it's an internal anchor on home page
      if (href && (href.startsWith('/#') || href.startsWith('#'))) {
        const targetId = href.replace('/', '');
        const targetEl = document.querySelector(targetId);

        if (targetEl && (window.location.pathname === '/' || window.location.pathname === '')) {
          e.preventDefault();
          setActiveNav(this);
          
          const headerOffset = 90;
          const elementPosition = targetEl.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          history.pushState(null, null, targetId);
        }
      }
    });
  });

  // 3. ScrollSpy on home page
  if (window.location.pathname === '/' || window.location.pathname === '') {
    const elonlarSection = document.getElementById('elonlar');
    const haqidaSection = document.getElementById('haqida');

    window.addEventListener('scroll', () => {
      const scrollPosition = window.scrollY + 200;

      if (elonlarSection && scrollPosition >= elonlarSection.offsetTop) {
        if (!contestsLink?.classList.contains('active')) {
          setActiveNav(contestsLink);
        }
      } else if (aboutLink && (!haqidaSection || scrollPosition >= 0)) {
        if (!aboutLink.classList.contains('active')) {
          setActiveNav(aboutLink);
        }
      }
    }, { passive: true });
  }

  // 4. Global Logout function with Modal Confirmation
  window.handleGlobalLogout = async function () {
    if (window.openConfirmModal) {
      const confirmed = await window.openConfirmModal({
        title: "Tizimdan chiqish",
        message: "Haqiqatan ham tizimdan chiqishni xohlaysizmi?",
        confirmText: "Ha, chiqish",
        cancelText: "Bekor qilish",
        type: "warning"
      });
      if (!confirmed) return;
    }

    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API error:', e);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
  };
});
