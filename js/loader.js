/* ==========================================================================
   LOADER MODULE
   Handles the cinematic intro loading sequence.
   ========================================================================== */

const Loader = (() => {
  const STATUS_MESSAGES = [
    'ESTABLISHING SIGNAL',
    'CALIBRATING FREQUENCY',
    'SYNCING ARCHIVE',
    'READY'
  ];

  function init() {
    const loader = document.querySelector('[data-loader]');
    if (!loader) return;

    const statusEl = loader.querySelector('[data-loader-status]');
    let step = 0;

    const interval = setInterval(() => {
      step++;
      if (statusEl && STATUS_MESSAGES[step]) {
        statusEl.textContent = STATUS_MESSAGES[step];
      }
      if (step >= STATUS_MESSAGES.length - 1) clearInterval(interval);
    }, 420);

    const finish = () => {
     loader.classList.add('is-hidden');
     document.body.classList.add('is-loaded');

  // Trigger hero text animation after loader finishes
     document.dispatchEvent(new Event('loaderFinished'));

      setTimeout(() => loader.remove(), 900);
    };
    // Hide once assets/paint are ready, with a minimum show time for the effect.
    const minTime = new Promise((resolve) => setTimeout(resolve, 1700));
    const pageReady = new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });

    Promise.all([minTime, pageReady]).then(finish);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Loader.init);
