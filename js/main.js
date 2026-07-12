/* ==========================================================================
   MAIN MODULE
   Filter tabs, form handling, misc page interactions.
   ========================================================================== */

const Main = (() => {

  function initFilterTabs() {

    const tabs = document.querySelectorAll("[data-filter-tab]");
    const cards = document.querySelectorAll("[data-release-card]");

    if (!tabs.length || !cards.length) return;

    tabs.forEach(tab => {

      tab.addEventListener("click", () => {

        tabs.forEach(t => {
          t.classList.remove("is-active");
          t.setAttribute("aria-pressed", "false");
        });

        tab.classList.add("is-active");
        tab.setAttribute("aria-pressed", "true");

        const filter = tab.dataset.filterTab;

        cards.forEach(card => {

          const match =
            filter === "all" ||
            card.dataset.releaseCard === filter;

          card.style.display = match ? "" : "none";

        });

      });

    });

  }

  function initNewsletterForm() {

    const form = document.querySelector("[data-newsletter-form]");
    if (!form) return;

    const note = form.querySelector("[data-form-note]");

    form.addEventListener("submit", e => {

      e.preventDefault();

      const input = form.querySelector("input[type=email]");

      if (!input.value || !input.checkValidity()) {

        note.textContent = "Enter a valid email to continue transmission.";
        note.classList.remove("is-success");
        return;

      }

      note.textContent = `Signal received — ${input.value} is now on the frequency.`;
      note.classList.add("is-success");

      form.reset();

    });

  }

  function initContactForm() {

    const form = document.querySelector("[data-contact-form]");
    if (!form) return;

    form.addEventListener("submit", e => {

      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const name = document.getElementById("contact-name").value;
      const email = document.getElementById("contact-email").value;
      const subject = document.getElementById("contact-subject").value;
      const message = document.getElementById("contact-message").value;

      let recipient = "";

      if (subject === "demo")
        recipient = "CYBERPUNK2088_DEMO@163.com";
      else if (subject === "website")
        recipient = "3579386804@qq.com";
      else
        recipient = "CYBERPUNK2088@126.COM";

      const mailSubject =
        subject === "demo"
          ? "Demo Submission"
          : subject === "website"
          ? "Website Related Question"
          : "Business Inquiry";

      const body =
`Name: ${name}

Email: ${email}

Message:

${message}`;

      window.location.href =
`mailto:${recipient}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(body)}`;

      form.reset();

    });

  }

  function initYear() {

    document.querySelectorAll("[data-year]").forEach(el => {

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

document.addEventListener("DOMContentLoaded", Main.init);


// ==========================
// Easter Egg
// ==========================

const reviewText = document.getElementById("withoutReview");

if (reviewText) {

  const sounds = [
    "audio/without-review1.wav",
    "audio/without-review2.wav",
    "audio/without-review3.wav",
    "audio/without-review4.wav"
  ];

  let clickCount = 0;

  reviewText.addEventListener("click", () => {

    const audio = new Audio(sounds[clickCount]);
    audio.play();

    clickCount++;

    if (clickCount >= sounds.length)
      clickCount = 0;

  });

}

function initMotionToggle(){

    const button =
    document.querySelector(".motion-toggle");

    const video =
    document.querySelector(".bg-video");


    if(!button || !video) return;


    let enabled = true;


    button.addEventListener("click",()=>{


        if(enabled){


            // 开始淡出

            video.classList.add("video-off");
            document.querySelector(".home-page")
                   ?.classList.add("video-off");

            button.classList.add("active");


            // 等淡出结束再暂停

            setTimeout(()=>{

                video.pause();

            },500);



        }else{


            // 先播放

            video.play().catch(()=>{});


            // 再淡入

            video.classList.remove("video-off");
            document.querySelector(".home-page")
                   ?.classList.remove("video-off");

            button.classList.remove("active");


        }


        enabled=!enabled;


    });


}



document.addEventListener(
"DOMContentLoaded",
()=>{

    initMotionToggle();

});
