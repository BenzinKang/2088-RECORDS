const TextScramble = (() => {

    const chars = "!<>-_\\/[]{}—=+*^?#∆ΞØΣЖΛΩ∇∴≈≠¤▒░█";


    function scramble(element) {

        const original = element.innerText.trim();

        const fakeText = "2Ø88 ΛΞCØRD$";

        let iteration = 0;



        // 第一阶段：乱码 → fake text

        const phase1 = setInterval(() => {


            element.innerText = original
                .split("")
                .map((char, index) => {


                    if (index < iteration) {

                        return fakeText[index] || original[index];

                    }


                    return chars[
                        Math.floor(Math.random() * chars.length)
                    ];


                })
                .join("");



            iteration += 0.45;



            if (iteration >= original.length) {


                clearInterval(phase1);



                // 第二阶段：fake text → 正文

                let recover = 0;



                const phase2 = setInterval(() => {


                    element.innerText = original
                        .split("")
                        .map((char, index) => {


                            if (index < recover) {

                                return original[index];

                            }


                            return fakeText[index] || original[index];


                        })
                        .join("");



                    recover += 0.5;



                    if (recover >= original.length) {


                        clearInterval(phase2);


                        element.innerText = original;



                        // RGB glitch

                        element.classList.add(
                            "rgb-glitch"
                        );


                        setTimeout(() => {

                            element.classList.remove(
                                "rgb-glitch"
                            );

                        }, 500);


                    }


                },60);



            }


        },45);



    }



    function init() {


        const texts = document.querySelectorAll(
            ".scramble-text"
        );


        setTimeout(() => {


            texts.forEach((text, i) => {


                setTimeout(() => {

                    scramble(text);

                }, i * 250);


            });


        },800);


    }



    return {
        init
    };


})();



document.addEventListener("loaderFinished", () => {

    TextScramble.init();

});
