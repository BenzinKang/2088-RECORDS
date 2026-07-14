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

    }

}

function drawPlayer() {

    ctx.save();

    ctx.shadowBlur = 18;

    ctx.shadowColor = "#00d5ff";

    ctx.fillStyle = player.color;

    ctx.fillRect(

        player.x,

        player.y,

        player.width,

        player.height

    );

    ctx.restore();

}


function spawnObstacle() {

    const width = 28 + Math.random() * 35;

    const height = 40 + Math.random() * 70;

    obstacles.push({

        x: canvas.width + width,

        y: GROUND_Y - height,

        width,

        height

    });

}

function updateObstacles() {

    for (let i = obstacles.length - 1; i >= 0; i--) {

        obstacles[i].x -= speed;

        if (obstacles[i].x + obstacles[i].width < 0) {

            obstacles.splice(i, 1);

            score += 10;

        }

    }

}

function drawObstacles() {

    obstacles.forEach(o => {

        ctx.save();

        ctx.shadowBlur = 15;

        ctx.shadowColor = "#00bfff";

        ctx.fillStyle = "#008cff";

        ctx.fillRect(

            o.x,

            o.y,

            o.width,

            o.height

        );

        ctx.restore();

    });

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


function restart() {

    obstacles.length = 0;

    score = 0;

    speed = 8;

    gameOver = false;

    running = true;

    player.y = GROUND_Y - player.height;

    player.velocityY = 0;

}

let timer = 0;

function gameLoop() {

    ctx.clearRect(0,0,canvas.width,canvas.height);

    drawGround();

    updatePlayer();

    drawPlayer();

    updateObstacles();

    drawObstacles();

    collision();

    drawHUD();

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

    running = true;

    gameLoop();

});
