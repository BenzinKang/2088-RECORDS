const TextScramble = (() => {

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


    function init(){

        const texts = document.querySelectorAll(".scramble-text");

        setTimeout(() => {

            texts.forEach((text, i)=>{
                setTimeout(()=>{
                    scramble(text);
                }, i * 250);
            });

        }, 800);

    }


    return {init};

})();


document.addEventListener(
    "DOMContentLoaded",
    TextScramble.init
);
