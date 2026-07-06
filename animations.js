/* ==========================================================================
   ANIMATIONS MODULE
   Scroll reveal, parallax, card tilt, ripple buttons.
   ========================================================================== */

const Animations = (() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initScrollReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (reduceMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    items.forEach((el, i) => {
      el.style.setProperty('--stagger-index', i % 6);
      observer.observe(el);
    });
  }

  function initParallax() {
    const heroCity = document.querySelector('.hero-city');
    const heroContent = document.querySelector('.hero-content');
    if (!heroCity || reduceMotion) return;

    window.addEventListener('mousemove', (e) => {
      const relX = (e.clientX / window.innerWidth - 0.5) * 2;
      const relY = (e.clientY / window.innerHeight - 0.5) * 2;
      heroCity.style.transform = `translate(${relX * 12}px, ${relY * 12}px)`;
      if (heroContent) heroContent.style.transform = `translate(${relX * -6}px, ${relY * -6}px)`;
    }, { passive: true });

    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      heroCity.style.opacity = String(Math.max(0, 0.55 - scrolled / 900));
    }, { passive: true });
  }

  function initCardTilt() {
    if (reduceMotion) return;
    const cards = document.querySelectorAll('.release-card');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${py * -6}deg) rotateY(${px * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  function initRipple() {
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }

  function init() {
    initScrollReveal();
    initParallax();
    initCardTilt();
    initRipple();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Animations.init);
