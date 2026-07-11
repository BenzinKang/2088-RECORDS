/* ==========================================================================
   LOADER MODULE
   Handles the cinematic intro loading sequence.
   ========================================================================== */

/* ==========================================================================
   LOADER MODULE
   Handles the cinematic intro loading sequence.
   ========================================================================== */

const Loader = (() => {
   let logoClickCount = 0;
   let logoTimer = null;


    const STATUS_MESSAGES = [
        "ESTABLISHING SIGNAL",
        "CALIBRATING FREQUENCY",
        "SYNCING ARCHIVE",
        "READY"
    ];



    function startScramble() {


        const texts = document.querySelectorAll(
            ".scramble-text"
        );


        if (!texts.length) return;



        const chars =
            "!<>-_\\/[]{}—=+*^?#∆ΞØΣЖΛΩ∇∴≈≠¤▒░█θΘΠγΓ";



        function scramble(element) {


            const original = element.textContent.trim();

            const fakeTextMap = {
                "2088": "2ØBS",
                "RECORDS": "RΞƇØΓÐ$"
            };

            const fakeText = fakeTextMap[original] || original;


            let iteration = 0;
            element.innerText = original;



            // ===== Decode phase =====

            const phase1 = setInterval(() => {


                element.innerText =
                    original
                    .split("")
                    .map((char,index)=>{


                        if(index < iteration){

                            return fakeText[index] || char;

                        }


                        return original[index];


                    })
                    .join("");



                iteration += 0.7;



                if(iteration >= original.length){


                    clearInterval(phase1);



                    let recover = 0;



                    // ===== Restore phase =====

                    const phase2 =
                    setInterval(()=>{


                        element.innerText =
                        original
                        .split("")
                        .map((char,index)=>{


                            if(index < recover){

                                return original[index];

                            }


                            return fakeText[index] || char;


                        })
                        .join("");



                        recover += 0.8;



                        if(recover >= original.length){


                            clearInterval(phase2);


                            element.innerText =
                            original;



                            element.classList.add(
                                "rgb-glitch"
                            );



                            setTimeout(()=>{

                                element.classList.remove(
                                    "rgb-glitch"
                                );

                            },500);


                        }


                    },60);


                }


            },45);

        }



        texts.forEach((text,index)=>{


            setTimeout(()=>{

                scramble(text);

            }, index * 300);


        });


    }
   function initHoverGlitch(){

    const texts = document.querySelectorAll(
        ".scramble-text"
    );


    texts.forEach(text=>{


        const original =
             text.dataset.original ||
             text.textContent.trim();


         text.dataset.original =
             original;
      


        const fakeMap = {

            
            
            "0":"Ø",
            "8":"S",

            "R":"Γ",
            "E":"Ξ",
            "C":"Ƈ",
            "O":"Ø",
            "D":"Ð",
            "S":"$"

        };



        text.addEventListener(
            "mousemove",
            (e)=>{


                const rect =
                    text.getBoundingClientRect();



                const index =
                    Math.floor(
                        (
                            e.clientX - rect.left
                        )
                        /
                        (
                            rect.width / original.length
                        )
                    );



                const chars =
                    original.split("");



                if(
                    index >= 0 &&
                    index < chars.length
                ){

                    chars[index] =
                        fakeMap[chars[index]]
                        ||
                        chars[index];


                    text.textContent =
                        chars.join("");
                  


                    text.classList.add(
                        "rgb-glitch"
                    );

                }


            }
        );



        text.addEventListener(
            "mouseleave",
            ()=>{


                text.textContent =
                    original;
                


                text.classList.remove(
                    "rgb-glitch"
                );


            }
        );


    });


}
   function init1788EasterEgg(){

    const logo = document.querySelector(".logo");
    const title = document.querySelector(".scramble-text");

    if(!logo || !title) return;

    logo.addEventListener("click",(e)=>{

        e.preventDefault();

        logoClickCount++;

        clearTimeout(logoTimer);

        logoTimer = setTimeout(()=>{
            logoClickCount = 0;
        },10000);

        if(logoClickCount < 5) return;

        logoClickCount = 0;

        logo.classList.add("rgb-glitch");
        title.classList.add("rgb-glitch");

        const original = title.textContent;

        title.textContent = "1788-L";

        setTimeout(()=>{

            title.textContent = original;

            logo.classList.remove("rgb-glitch");
            title.classList.remove("rgb-glitch");

        },3000);

    });

}




    function init(){


const loader =
    document.querySelector(
        "[data-loader]"
    );


if(!loader) return;


const loaderContent =
    loader.querySelector(
        ".loader-content"
    );


const loaderVideo =
    loader.querySelector(
        ".loader-video"
    );


const isHome =
    document.body.classList.contains(
        "home-index"
    );


const loaderVideo =
    loader.querySelector(
        ".loader-video"
    );


// 首页第一次进入：视频模式
if(isHome && firstVisit && loaderVideo){

    if(loaderContent){

        loaderContent.style.display = "none";

    }

}


// 首页非第一次进入：恢复普通loader
if(isHome && !firstVisit){

    if(loaderVideo){

        loaderVideo.remove();

    }


    loader.classList.remove(
        "video-loader"
    );


    if(loaderContent){

        loaderContent.style.display = "flex";

    }

}


// 首页进入记录
if(isHome && firstVisit){

    sessionStorage.setItem(
        "2088_entered",
        "true"
    );

}




        let step = 0;
        const statusTimer =
        setInterval(()=>{


            step++;


            if(status && STATUS_MESSAGES[step]){

                status.textContent =
                    STATUS_MESSAGES[step];

            }



            if(step >= STATUS_MESSAGES.length - 1){

                clearInterval(statusTimer);

            }


        },420);





        const finish = () => {



            loader.classList.add(
                "is-hidden"
            );


            document.body.classList.add(
                "is-loaded"
            );
            // ===== 新增这里 =====
    const video = document.querySelector(".bg-video");

    if(video){

        video.play().catch(()=>{});

    }
    


            // 等 loader 消失后启动标题动画

            setTimeout(()=>{

                startScramble();

            },900);
           
           setTimeout(()=>{

                initHoverGlitch();
                init1788EasterEgg();

            },1000);


            setTimeout(()=>{

                loader.remove();

            },1200);


        };
         




const minTime =
new Promise(resolve=>{


    if(loaderVideo && isHome && firstVisit){


        loaderVideo.addEventListener(
            "ended",
            resolve,
            {
                once:true
            }
        );


        // 防止视频异常
        setTimeout(
            resolve,
            6000
        );


    }else{


        setTimeout(
            resolve,
            1700
        );


    }


});



        const pageReady =
        new Promise(resolve=>{


            if(document.readyState === "complete"){


                resolve();


            }else{


                window.addEventListener(
                    "load",
                    resolve,
                    {
                        once:true
                    }
                );


            }


        });





        Promise.all([
            minTime,
            pageReady
        ])
        .then(finish);


    }





    return {
        init
    };


})();




document.addEventListener(
    "DOMContentLoaded",
    Loader.init
);
