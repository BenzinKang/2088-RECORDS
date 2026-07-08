/* ==========================================================================
   LOADER MODULE
   Handles the cinematic intro loading sequence.
   ========================================================================== */

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


  function startScramble() {

    const texts = document.querySelectorAll('.scramble-text');

    if (!texts.length) return;


    const chars = "!<>-_\\/[]{}—=+*^?#________";


    function scramble(element) {

      const original = element.innerText;
      let iteration = 0;


      const interval = setInterval(() => {

        element.innerText = original
          .split("")
          .map((char, index) => {

            if (index < iteration) {
              return original[index];
            }

            return chars[
              Math.floor(Math.random() * chars.length)
            ];

          })
          .join("");


        iteration += 0.35;


        if (iteration >= original.length) {

          clearInterval(interval);
          element.innerText = original;

        }

      }, 45);

    }


    texts.forEach((text, index) => {

      setTimeout(() => {
        scramble(text);
      }, index * 300);

    });

  }



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


      if (step >= STATUS_MESSAGES.length - 1) {
        clearInterval(interval);
      }


    }, 420);



    const finish = () => {

      loader.classList.add('is-hidden');

      document.body.classList.add('is-loaded');


      // Start title reconstruction after loader transition
      setTimeout(() => {
        startScramble();
      }, 900);



      setTimeout(() => {
        loader.remove();
      }, 1000);

    };



    const minTime = new Promise((resolve) => {
      setTimeout(resolve, 1700);
    });


    const pageReady = new Promise((resolve) => {

      if (document.readyState === 'complete') {
        resolve();
      } else {

        window.addEventListener(
          'load',
          resolve,
          { once:true }
        );

      }

    });



    Promise.all([minTime, pageReady])
      .then(finish);

  }


  return { init };


})();


document.addEventListener(
  'DOMContentLoaded',
  Loader.init
);
