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


                // 完成闪光效果
                element.classList.add("scramble-finished");


                setTimeout(() => {
                    element.classList.remove("scramble-finished");
                }, 700);

            }


        },45);

    }



    function init(){

        const texts = document.querySelectorAll(".scramble-text");


        setTimeout(() => {

            texts.forEach((text, i)=>{

                setTimeout(()=>{

                    scramble(text);

                }, i * 250);

            });


        },800);

    }


    return {
        init
    };


})();



document.addEventListener('loaderFinished', () => {

    TextScramble.init();

});
.scramble-finished {
    position:relative;
}


.scramble-finished::after {

    content:"";

    position:absolute;

    left:0;
    bottom:-5px;

    width:100%;
    height:1px;

    background:#00c8ff;

    box-shadow:
    0 0 10px #00c8ff;


    animation:scan 0.35s ease;

}



@keyframes scan {

    from{
        transform:scaleX(0);
        opacity:0;
    }

    50%{
        transform:scaleX(1);
        opacity:1;
    }

    to{
        transform:scaleX(0);
        opacity:0;
    }

}
