/* ==========================================================================
   CURSOR MODULE
   Custom glowing cursor with magnetic hover states.
   ========================================================================== */

const CursorGlow = (() => {
  function init() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const cursor = document.createElement('div');
    cursor.className = 'cursor-glow';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let cx = x;
    let cy = y;

    window.addEventListener('mousemove', (e) => {
      x = e.clientX;
      y = e.clientY;
    });

    const interactive = 'a, button, .btn, .filter-tab, input, textarea, .release-card, .nav-toggle, .without-review';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactive)) cursor.classList.add('is-active');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactive)) cursor.classList.remove('is-active');
    });

    function render() {
      // Lightly ease the cursor toward the pointer for a fluid, weighted feel.
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', CursorGlow.init);
