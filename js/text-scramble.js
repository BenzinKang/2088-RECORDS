const TextScramble = (() => {

    const chars = "!<>-_\\/[]{}—=+*^?#∆ΞØΣЖΛΩ∇∴≈≠¤▒░█";


    function scramble(element) {

        const original = element.innerText.trim();

        const fakeText = "2Ø88 RΞCØRD$";

        let iteration = 0;


        // Phase 1:
        // random code -> fake text

        const phase1 = setInterval(() => {


            element.innerText = original
                .split("")
                .map((char, index) => {


                    if (index < iteration) {

                        return fakeText[index] || char;

                    }


                    return chars[
                        Math.floor(Math.random() * chars.length)
                    ];


                })
                .join("");



            iteration += 0.35;



            if (iteration >= original.length) {


                clearInterval(phase1);



                // Phase 2:
                // fake text -> real text

                let recover = 0;



                const phase2 = setInterval(() => {


                    element.innerText = original
                        .split("")
                        .map((char, index) => {


                            if (index < recover) {

                                return original[index];

                            }


                            return fakeText[index] || char;


                        })
                        .join("");



                    recover += 0.25;



                    if (recover >= original.length) {


                        clearInterval(phase2);


                        element.innerText = original;



                        // finish flash

                        element.classList.add(
                            "scramble-finished"
                        );


                        setTimeout(() => {

                            element.classList.remove(
                                "scramble-finished"
                            );

                        }, 700);


                    }


                }, 60);


            }


        }, 45);

    }



    function init() {


        const texts = document.querySelectorAll(".scramble-text");



        setTimeout(() => {


            texts.forEach((text, i) => {


                setTimeout(() => {


                    scramble(text);


                }, i * 250);


            });


        }, 800);


    }



    return {
        init
    };


})();



document.addEventListener("loaderFinished", () => {

    TextScramble.init();

});
