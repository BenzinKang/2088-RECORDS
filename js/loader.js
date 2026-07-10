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
                "2088": "Z0⧖⧖",
                "RECORDS": "RΞƆØΓÐ$"
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

        const original = text.textContent;


        let changed = false;


        text.addEventListener(
            "mouseenter",
            ()=>{


                if(changed) return;


                changed = true;


                text.classList.add(
                    "rgb-glitch"
                );


                setTimeout(()=>{


                    const chars =
                    original.split("");


                    // 只修改一个字符
                    if(original === "2088"){

                        chars[2] = "⧖";

                    }


                    if(original === "RECORDS"){

                        chars[2] = "Ɔ";

                    }


                    text.textContent =
                    chars.join("");


                    setTimeout(()=>{

                        text.classList.remove(
                            "rgb-glitch"
                        );

                    },120);


                },60);


            }
        );



        text.addEventListener(
               "mouseleave",
               ()=>{


                   if(!changed) return;


                   text.classList.add(
                       "rgb-glitch"
                   );


                   setTimeout(()=>{


                          text.textContent =
                          original;
   

                          setTimeout(()=>{
   
                              text.classList.remove(
                                  "rgb-glitch"
                              );

                          },120);


                      },60);



                      changed = false;


                  }
              );


          });


       }




    function init(){


        const loader =
            document.querySelector(
                "[data-loader]"
            );


        if(!loader) return;



        const status =
            loader.querySelector(
                "[data-loader-status]"
            );



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



            // 等 loader 消失后启动标题动画

            setTimeout(()=>{

                startScramble();

            },900);
           
           setTimeout(()=>{

                initHoverGlitch();

            },1000);


            setTimeout(()=>{

                loader.remove();

            },1200);


        };





        const minTime =
        new Promise(resolve=>{


            setTimeout(resolve,1700);


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
