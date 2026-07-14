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

function resize() {

    canvas.width = window.innerWidth;

    canvas.height = 500;

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

            x: player.x,

            y: player.y + player.height / 2,
    
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

    ctx.save();

    ctx.shadowBlur = 18;
    ctx.shadowColor = "#00d7ff";
    ctx.strokeStyle = "#00d7ff";
    ctx.lineWidth = 2;

    // Head
    ctx.strokeRect(x + 8, y, 26, 20);

    // Eyes
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(x + 14, y + 7, 4, 4);
    ctx.fillRect(x + 24, y + 7, 4, 4);

    // Body
    ctx.strokeRect(x + 10, y + 20, 22, 24);

    // Legs
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 44);
    ctx.lineTo(x + 13, y + 60);

    ctx.moveTo(x + 26, y + 44);
    ctx.lineTo(x + 29, y + 60);

    ctx.stroke();

    ctx.restore();

}

const buildings = [];

for(let i=0;i<30;i++){

    buildings.push({

        x:i*120,

        width:60+Math.random()*60,

        height:80+Math.random()*180

    });

}

function drawBuildings() {

    ctx.fillStyle = "#0b2746";

    buildings.forEach(b => {

        b.x -= speed * 0.2;

        if (b.x + b.width < 0) {

            b.x = canvas.width + Math.random() * 300;

            b.height = 80 + Math.random() * 180;

            b.width = 60 + Math.random() * 60;

        }

        ctx.fillRect(

            b.x,

            GROUND_Y - b.height,

            b.width,

            b.height

        );

    });

}

for(let y=0;y<canvas.height;y+=4){

ctx.fillStyle="rgba(255,255,255,.02)";

ctx.fillRect(

0,

y,

canvas.width,

1

);

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

    for (const o of obstacles) {

        if (

            player.x < o.x + o.width &&

            player.x + player.width > o.x &&

            player.y < o.y + o.height &&

            player.y + player.height > o.y

        ) {

            gameOver = true;

            document
            .getElementById("gameover-screen")
            .classList.add("active");

            running = false;

            if (score > highScore) {

                highScore = score;

                localStorage.setItem(

                    "signalRunnerHighScore",

                    highScore

                );

            }

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

    gameOver = false;

    document
    .getElementById("gameover-screen")
    .classList.remove("active");

    running = true;

    player.y = GROUND_Y - player.height;

    player.velocityY = 0;

    timer = 0;

    requestAnimationFrame(gameLoop);

}

let timer = 0;

function gameLoop() {

    ctx.clearRect(0,0,canvas.width,canvas.height);

    drawBackground();

    updateGlitch();

    drawGlitch();

    drawGround();

    drawBuildings();

    updatePlayer();

    drawPlayer();

    updateObstacles();

    drawObstacles();

    collision();

    drawHUD();

    updateParticles();
    
    drawParticles();

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
