/* ==========================================================================
   NAVIGATION MODULE
   Sticky nav state, mobile menu, active page indication.
   ========================================================================== */

const Navigation = (() => {
  function initScrollState(nav) {
    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initMobileMenu(nav) {
    const toggle = nav.querySelector('[data-nav-toggle]');
    const links = nav.querySelector('[data-nav-links]');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on Escape for keyboard users.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('is-open')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        toggle.focus();
      }
    });
  }

  function init() {
    const nav = document.querySelector('[data-site-nav]');
    if (!nav) return;
    initScrollState(nav);
    initMobileMenu(nav);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Navigation.init);
