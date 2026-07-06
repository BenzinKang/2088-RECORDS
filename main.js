/* ==========================================================================
   MAIN MODULE
   Filter tabs, form handling, misc page interactions.
   ========================================================================== */

const Main = (() => {
  function initFilterTabs() {
    const tabs = document.querySelectorAll('[data-filter-tab]');
    const cards = document.querySelectorAll('[data-release-card]');
    if (!tabs.length || !cards.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        tabs.forEach((t) => t.setAttribute('aria-pressed', 'false'));
        tab.setAttribute('aria-pressed', 'true');

        const filter = tab.dataset.filterTab;
        cards.forEach((card) => {
          const match = filter === 'all' || card.dataset.releaseCard === filter;
          card.style.display = match ? '' : 'none';
        });
      });
    });
  }

  function initNewsletterForm() {
    const form = document.querySelector('[data-newsletter-form]');
    if (!form) return;
    const note = form.querySelector('[data-form-note]');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input.value || !input.checkValidity()) {
        note.textContent = 'Enter a valid email to continue transmission.';
        note.classList.remove('is-success');
        return;
      }
      note.textContent = `Signal received — ${input.value} is now on the frequency.`;
      note.classList.add('is-success');
      form.reset();
    });
  }

  function initContactForm() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;
    const note = form.querySelector('[data-form-note]');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      note.textContent = 'Message transmitted. Expect a reply within 48 hours.';
      note.classList.add('is-success');
      form.reset();
    });
  }

  function initYear() {
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  function init() {
    initFilterTabs();
    initNewsletterForm();
    initContactForm();
    initYear();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Main.init);
