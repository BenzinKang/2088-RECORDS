const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = 500;

const GROUND_HEIGHT = 90;
const GROUND_Y = canvas.height - GROUND_HEIGHT;

let running = false;
let gameOver = false;

let score = 0;
let speed = 8;

let highScore =
    Number(localStorage.getItem("signalRunnerHighScore")) || 0;

const gravity = 1.1;

const player = {

    x: 120,

    y: 0,

    width: 42,

    height: 60,

    velocityY: 0,

    jumping: false,

    color: "#3fd8ff"

};

player.y = GROUND_Y - player.height;

const obstacles = [];

function resize(){

    canvas.width = window.innerWidth;

    canvas.height = 500;

    player.y = GROUND_Y - player.height;

}

window.addEventListener("resize", resize);

function jump() {

    if (!player.jumping) {

        player.velocityY = -20;

        player.jumping = true;

    }

}

window.addEventListener("keydown", e => {

    if (e.code === "Space" || e.code === "ArrowUp") {

        e.preventDefault();

        if (gameOver) {

            restart();

            return;

        }

        jump();

    }

});

canvas.addEventListener("pointerdown", () => {

    if (gameOver) {

        restart();

        return;

    }

    jump();

});

function updatePlayer() {

    player.velocityY += gravity;

    player.y += player.velocityY;

    if (player.y >= GROUND_Y - player.height) {

        player.y = GROUND_Y - player.height;

        player.velocityY = 0;

        player.jumping = false;


        particles.push({

            x: player.x + player.width / 2,

            y: player.y + player.height - 8,

            size: 5,

            alpha: 1

        });

        if (particles.length > 80) {

            particles.shift();

        }

    }

}

function drawPlayer() {

    const x = player.x;
    const y = player.y;


    // 动画时间
    const time = Date.now() / 120;


    // 跑步摆动
    const walk =
        running && !gameOver
        ? Math.sin(time) * 3
        : 0;


    // 跳跃压缩
    const jumping =
        player.y < GROUND_Y - player.height - 5;


    const legCompress =
        jumping ? -5 : 0;



    ctx.save();


    ctx.shadowBlur = 20;
    ctx.shadowColor="#00d7ff";

    ctx.lineWidth=2;
    ctx.strokeStyle="#00d7ff";



    /*
        HEAD / COCKPIT
    */


    ctx.fillStyle="#071522";

    ctx.beginPath();

    ctx.roundRect(
        x+8,
        y,
        28,
        22,
        5
    );

    ctx.fill();
    ctx.stroke();



    // glass

    ctx.fillStyle="#00ffff";

    ctx.shadowBlur=12;

    ctx.fillRect(
        x+14,
        y+8,
        16,
        5
    );



    /*
        BODY CORE
    */


    ctx.shadowBlur=15;

    ctx.fillStyle="#091526";

    ctx.beginPath();

    ctx.roundRect(
        x+10,
        y+23,
        24,
        30,
        4
    );

    ctx.fill();

    ctx.stroke();



    // energy reactor

    ctx.fillStyle="#00ffff";

    ctx.beginPath();

    ctx.arc(
        x+22,
        y+37,
        5 + Math.sin(time)*1,
        0,
        Math.PI*2
    );

    ctx.fill();




    /*
        ARMS
    */

    ctx.shadowBlur=10;


    ctx.beginPath();


    ctx.moveTo(
        x+10,
        y+28
    );

    ctx.lineTo(
        x+2,
        y+40+walk
    );


    ctx.moveTo(
        x+34,
        y+28
    );

    ctx.lineTo(
        x+42,
        y+40-walk
    );


    ctx.stroke();




    /*
        MECH LEGS
    */


    const leftLeg =
        Math.sin(time)*5;

    const rightLeg =
        Math.sin(time+Math.PI)*5;



    // 左液压腿

    ctx.beginPath();


    ctx.moveTo(
        x+16,
        y+53
    );

    ctx.lineTo(
        x+14+leftLeg,
        y+65+legCompress
    );


    ctx.lineTo(
        x+8+leftLeg,
        y+70
    );



    // 右腿

    ctx.moveTo(
        x+28,
        y+53
    );

    ctx.lineTo(
        x+30+rightLeg,
        y+65+legCompress
    );


    ctx.lineTo(
        x+36+rightLeg,
        y+70
    );


    ctx.stroke();




    /*
        FOOT THRUSTERS
    */


    ctx.fillStyle="#00ffff";


    ctx.fillRect(
        x+5+leftLeg,
        y+70,
        10,
        3
    );


    ctx.fillRect(
        x+31+rightLeg,
        y+70,
        10,
        3
    );



    /*
        JUMP BOOSTER
    */

    if(jumping){

        ctx.shadowBlur=25;
        ctx.fillStyle="#00ffff";

        ctx.beginPath();

        ctx.moveTo(
            x+18,
            y+72
        );

        ctx.lineTo(
            x+22,
            y+90
        );

        ctx.lineTo(
            x+26,
            y+72
        );

        ctx.fill();

    }


    ctx.restore();

}

function drawBuildings() {

    buildings.forEach(b => {

        b.x -= speed * 0.2;


        if (b.x + b.width < 0) {

            b.x = canvas.width + Math.random() * 300;

            b.height = 100 + Math.random() * 220;

            b.width = 70 + Math.random() * 90;

            // 随机楼属性
            b.neon = Math.random() > 0.4;
            b.color = Math.random() > 0.5
                ? "#00d7ff"
                : "#9b5cff";

        }


        const x = b.x;
        const y = GROUND_Y - b.height;



        ctx.save();


        // ===== Building shadow =====

        ctx.fillStyle = "#050b18";

        ctx.fillRect(
            x,
            y,
            b.width,
            b.height
        );



        // ===== Glass reflection =====

        ctx.fillStyle = "#091d35";

        ctx.fillRect(
            x + 5,
            y + 5,
            b.width - 10,
            b.height - 10
        );



        // ===== Neon edge =====

        ctx.shadowBlur = 15;
        ctx.shadowColor = b.color;

        ctx.strokeStyle = b.color;

        ctx.lineWidth = 2;

        ctx.strokeRect(
            x,
            y,
            b.width,
            b.height
        );



        ctx.shadowBlur = 0;



        // ===== Windows =====

        const rows = Math.floor(b.height / 18);
        const cols = Math.floor(b.width / 18);


        for(let r = 0; r < rows; r++){

            for(let c = 0; c < cols; c++){

                // 随机亮灯
                if(Math.random() > 0.45){

                    ctx.fillStyle =
                        Math.random() > 0.7
                        ? "#ff3df2"
                        : "#00d7ff";


                    ctx.fillRect(

                        x + 10 + c * 18,

                        y + 12 + r * 18,

                        6,

                        5

                    );

                }

            }

        }



        // ===== Neon billboard =====

        if(b.neon){

            ctx.shadowBlur = 20;

            ctx.shadowColor = "#00ffff";

            ctx.strokeStyle="#00ffff";


            ctx.strokeRect(

                x + b.width/2 - 15,

                y + 40,

                30,

                15

            );


            ctx.fillStyle="#00ffff";

            ctx.fillRect(

                x + b.width/2 - 10,

                y + 45,

                20,

                3

            );

        }



        // ===== Rooftop antenna =====

        if(Math.random() > 0.8){

            ctx.strokeStyle="#00ffff";

            ctx.beginPath();

            ctx.moveTo(
                x+b.width/2,
                y
            );

            ctx.lineTo(
                x+b.width/2,
                y-25
            );

            ctx.stroke();


            ctx.fillStyle="#ff3df2";

            ctx.beginPath();

            ctx.arc(
                x+b.width/2,
                y-27,
                3,
                0,
                Math.PI*2
            );

            ctx.fill();

        }



        ctx.restore();


    });

}

function drawScanlines(){

    ctx.fillStyle="rgba(255,255,255,.02)";

    for(let y=0;y<canvas.height;y+=4){

        ctx.fillRect(

            0,

            y,

            canvas.width,

            1

        );

    }

}



function spawnObstacle() {

    const width = 28 + Math.random() * 35;
    const height = 40 + Math.random() * 70;

    const obstacleTypes = [
        "firewall",
        "fragment",
        "noise"
    ];

    const type =
        obstacleTypes[
            Math.floor(Math.random() * obstacleTypes.length)
        ];

    obstacles.push({

        x: canvas.width + width,

        y: GROUND_Y - height,

        width,

        height,

        type

    });

}

function updateObstacles() {

    for (let i = obstacles.length - 1; i >= 0; i--) {

        const obstacle = obstacles[i];

        obstacle.x -= speed;

        if (obstacle.x + obstacle.width < 0) {

            obstacles.splice(i, 1);

            score += 10;

        }

    }

}


function drawObstacles() {

    obstacles.forEach(o => {

        ctx.save();

        ctx.shadowBlur = 20;

        switch (o.type) {

            case "firewall":

                ctx.fillStyle = "#ff3f63";
                ctx.shadowColor = "#ff3f63";

                break;

            case "fragment":

                ctx.fillStyle = "#00d8ff";
                ctx.shadowColor = "#00d8ff";

                break;

            case "noise":

                ctx.fillStyle = "#7a6bff";
                ctx.shadowColor = "#7a6bff";

                break;

        }

        ctx.fillRect(
            o.x,
            o.y,
            o.width,
            o.height
        );

        ctx.restore();

    });

}

const stars = [];

for (let i = 0; i < 120; i++) {

    stars.push({

        x: Math.random() * canvas.width,

        y: Math.random() * canvas.height,

        r: Math.random() * 2,

        speed: 0.3 + Math.random()

    });

}

let glitchTimer = 0;

function updateGlitch(){

    glitchTimer++;

    if(glitchTimer>600){

        glitchTimer=0;

    }

}

function drawGlitch(){

    if(glitchTimer<15){

        ctx.save();

        ctx.globalAlpha=.08;

        ctx.fillStyle="#00ffff";

        ctx.fillRect(

            Math.random()*canvas.width,

            Math.random()*canvas.height,

            200,

            4

        );

        ctx.restore();

    }

}

function drawBackground() {

    const gradient = ctx.createLinearGradient(

        0,

        0,

        0,

        canvas.height

    );

    gradient.addColorStop(0, "#040916");
    gradient.addColorStop(1, "#071c32");

    ctx.fillStyle = gradient;

    ctx.fillRect(

        0,

        0,

        canvas.width,

        canvas.height

    );

    for (const s of stars) {

        s.x -= s.speed;

        if (s.x < 0) {

            s.x = canvas.width;

            s.y = Math.random() * canvas.height;

        }

        ctx.beginPath();

        ctx.fillStyle = "#8fdfff";

        ctx.arc(

            s.x,

            s.y,

            s.r,

            0,

            Math.PI * 2

        );

        ctx.fill();

    }

}

function collision() {

    if (gameOver) return;

    for (const o of obstacles) {

        if (

            player.x < o.x + o.width &&
            player.x + player.width > o.x &&
            player.y < o.y + o.height &&
            player.y + player.height > o.y

        ) {

            gameOver = true;
            running = false;

            if (score > highScore) {

                highScore = score;

                localStorage.setItem(
                    "signalRunnerHighScore",
                    highScore
                );

            }

            document
                .getElementById("gameover-screen")
                .classList.add("active");

            return;

        }

    }

}

function drawGround() {

    ctx.fillStyle = "#071c32";

    ctx.fillRect(

        0,

        GROUND_Y,

        canvas.width,

        GROUND_HEIGHT

    );

    ctx.strokeStyle = "rgba(0,200,255,.25)";

    for (let i = 0; i < canvas.width; i += 40) {

        ctx.beginPath();

        ctx.moveTo(i, GROUND_Y);

        ctx.lineTo(i, canvas.height);

        ctx.stroke();

    }

    for (let y = GROUND_Y; y < canvas.height; y += 18) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(canvas.width, y);

        ctx.stroke();

    }

    ctx.strokeStyle = "#00d7ff";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(0, GROUND_Y);

    ctx.lineTo(canvas.width, GROUND_Y);

    ctx.stroke();

}

function drawHUD() {

    document.getElementById("distance").innerText =
        score + " Units";

    document.getElementById("speed").innerText =
        speed.toFixed(1) + "x";

    document.getElementById("highscore").innerText =
        highScore;

}

const particles = [];




function updateParticles() {

    for (let i = particles.length - 1; i >= 0; i--) {

        const p = particles[i];

        p.x -= 3;

        p.alpha -= .03;

        p.size *= .97;

        if (p.alpha <= 0)

            particles.splice(i,1);

    }

}

function drawParticles() {

    particles.forEach(p=>{

        ctx.save();

        ctx.globalAlpha = p.alpha;

        ctx.fillStyle="#00d7ff";

        ctx.beginPath();

        ctx.arc(

            p.x,

            p.y,

            p.size,

            0,

            Math.PI*2

        );

        ctx.fill();

        ctx.restore();

    });

}

function restart() {

    obstacles.length = 0;
    particles.length = 0;

    score = 0;
    speed = 8;

    timer = 0;

    gameOver = false;
    running = true;

    player.y = GROUND_Y - player.height;
    player.velocityY = 0;
    player.jumping = false;

    document
        .getElementById("gameover-screen")
        .classList.remove("active");

    requestAnimationFrame(gameLoop);

}

let timer = 0;

function gameLoop() {

    ctx.clearRect(0,0,canvas.width,canvas.height);

    drawBackground();

    updateGlitch();

    drawGlitch();

    drawBuildings();

    drawGround();

    updatePlayer();

    drawPlayer();

    updateObstacles();

    drawObstacles();

    collision();

    drawHUD();

    updateParticles();
    
    drawParticles();

    drawScanlines();

    timer++;

    if (timer > 90) {

        spawnObstacle();

        timer = 0;

    }

    score += 0.1;

    speed += 0.0008;

    if (!gameOver)

        requestAnimationFrame(gameLoop);

}

document

.getElementById("startButton")

.addEventListener("click", () => {

    document

    .getElementById("start-screen")

    .classList.remove("active");

    if(running) return;

    running = true;

    gameLoop();

});

document
    .getElementById("restartButton")
    .addEventListener("click", restart);
