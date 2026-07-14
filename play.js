/**
 * 2088 RECORDS - Neo Tokyo Pixel Runner Core
 * 纯前端 Canvas 像素级引擎
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 禁用图像平滑，获得完美的 Sharp Pixel Art（像素艺术）风格
ctx.imageSmoothingEnabled = false;

// 游戏状态管理
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let dataCoreCount = 0;
let highScore = localStorage.getItem('2088_highScore') || 0;
let gameSpeed = 6;
const baseSpeed = 6;
const maxSpeed = 16;
let scoreTimer = 0;
let screenShakeX = 0;
let screenShakeY = 0;
let screenShakeDuration = 0;

// 画布尺寸自动适配
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 辅助颜色常量
const COLORS = {
    bg: '#050a18',
    neonBlue: '#00c8ff',
    cyan: '#38e0ff',
    purple: '#6e5cff',
    magenta: '#ff007f',
    yellow: '#ffdc00'
};

// ==========================================
// 1. 玩家(PLAYER) 模块
// ==========================================
class Player {
    constructor() {
        this.baseWidth = 50;
        this.baseHeight = 65;
        this.x = 100;
        this.y = 0;
        this.vy = 0;
        this.gravity = 0.6;
        this.jumpForce = -13.5;
        this.isGrounded = false;
        
        // 动画控制
        this.frame = 0;
        this.animTimer = 0;
        this.animSpeed = 8; // 帧率分频
        this.state = 'RUNNING'; // RUNNING, JUMPING, HURT
        this.hurtTimer = 0;
    }

    reset() {
        this.x = canvas.width * 0.15;
        this.y = canvas.height * 0.7 - this.baseHeight;
        this.vy = 0;
        this.state = 'RUNNING';
        this.isGrounded = true;
        this.hurtTimer = 0;
    }

    jump() {
        if (this.isGrounded && this.state !== 'HURT') {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.state = 'JUMPING';
            // 触发跳跃粒子
            createJumpParticles(this.x + this.baseWidth / 2, this.y + this.baseHeight);
        }
    }

    triggerHurt() {
        this.state = 'HURT';
        this.hurtTimer = 30; // 持续伤害帧
        triggerScreenShake(15, 8);
    }

    update() {
        // 重力物理运算
        this.vy += this.gravity;
        this.y += this.vy;

        const groundY = canvas.height * 0.7 - this.baseHeight;
        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.isGrounded = true;
            if (this.state === 'JUMPING') {
                this.state = 'RUNNING';
            }
        }

        // 受击恢复状态
        if (this.state === 'HURT') {
            this.hurtTimer--;
            if (this.hurtTimer <= 0) {
                this.state = this.isGrounded ? 'RUNNING' : 'JUMPING';
            }
        }

        // 动画计时器
        this.animTimer++;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer = 0;
            this.frame = (this.frame + 1) % 6; // 6帧动画循环
        }
    }

    draw() {
        ctx.save();

        // 渲染边缘霓虹外发光效果
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.state === 'HURT' ? COLORS.magenta : COLORS.cyan;

        // 玩家整体定位与微动摆动
        ctx.translate(this.x, this.y);

        // 如果受击，产生无规律 Glitch 抽动
        if (this.state === 'HURT') {
            ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        }

        // 1. 绘制像素角色（利用 Canvas 像素块填充）
        const pSize = 3.5; // 像素单元大小
        const bodyColor = '#fff';
        const jacketColor = COLORS.purple;
        const neonAcc = this.state === 'HURT' ? COLORS.magenta : COLORS.neonBlue;

        // 根据运动状态，微调手足动画结构
        let offsetLegY = 0;
        let offsetArmX = 0;
        if (this.state === 'RUNNING') {
            offsetLegY = Math.sin(this.frame * Math.PI / 3) * 2;
            offsetArmX = Math.cos(this.frame * Math.PI / 3) * 3;
        }

        // --- 头部 & 头盔 ---
        ctx.fillStyle = '#1a1f2c';
        ctx.fillRect(4 * pSize, 1 * pSize, 6 * pSize, 5 * pSize); // 头壳
        ctx.fillStyle = neonAcc; // 霓虹面罩
        ctx.fillRect(7 * pSize, 2 * pSize, 4 * pSize, 3 * pSize);

        // --- 躯干 (赛博夹克) ---
        ctx.fillStyle = jacketColor;
        ctx.fillRect(3 * pSize, 6 * pSize, 7 * pSize, 7 * pSize);
        ctx.fillStyle = bodyColor; // 内衬
        ctx.fillRect(5 * pSize, 6 * pSize, 2 * pSize, 5 * pSize);

        // 霓虹飘带或背包
        ctx.fillStyle = neonAcc;
        ctx.fillRect(2 * pSize, 7 * pSize, 1 * pSize, 4 * pSize);

        // --- 手臂 ---
        ctx.fillStyle = '#1e2530';
        ctx.fillRect((4 + offsetArmX / pSize) * pSize, 8 * pSize, 2 * pSize, 4 * pSize);

        // --- 腿部 (随动作摆动) ---
        ctx.fillStyle = '#0f131a';
        // 左腿
        ctx.fillRect(4 * pSize, 13 * pSize, 2 * pSize, (4 + offsetLegY) * pSize);
        // 右腿
        ctx.fillRect(7 * pSize, 13 * pSize, 2 * pSize, (4 - offsetLegY) * pSize);
        
        // 机械鞋履
        ctx.fillStyle = neonAcc;
        ctx.fillRect(3.5 * pSize, (17 + offsetLegY) * pSize, 2.5 * pSize, 1.5 * pSize);
        ctx.fillRect(6.5 * pSize, (17 - offsetLegY) * pSize, 2.5 * pSize, 1.5 * pSize);

        ctx.restore();
    }
}

const player = new Player();

// ==========================================
// 2. 障碍物(OBSTACLE) & 收集物(COLLECTIBLE) 模块
// ==========================================
class Obstacle {
    constructor(type) {
        this.type = type; // 'DRONE' (无人机) 或 'BARRIER' (路障)
        this.width = type === 'DRONE' ? 45 : 35;
        this.height = type === 'DRONE' ? 30 : 50;
        this.x = canvas.width + Math.random() * 200;
        this.y = type === 'DRONE' 
            ? canvas.height * 0.7 - 100 - Math.random() * 80 
            : canvas.height * 0.7 - this.height;
        this.pulse = 0;
    }

    update() {
        this.x -= gameSpeed;
        this.pulse += 0.1;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;

        if (this.type === 'DRONE') {
            ctx.shadowColor = COLORS.magenta;
            ctx.translate(this.x, this.y + Math.sin(this.pulse) * 5); // 无人机悬停起伏
            
            // 无人机主体
            ctx.fillStyle = '#222530';
            ctx.fillRect(5, 5, 35, 15);
            // 亮红色摄像头
            ctx.fillStyle = COLORS.magenta;
            ctx.fillRect(20, 10, 8, 8);
            // 霓虹旋翼
            ctx.fillStyle = COLORS.cyan;
            ctx.fillRect(0, 0, 12, 4);
            ctx.fillRect(33, 0, 12, 4);
        } else {
            // 路障或能量路桩
            ctx.shadowColor = COLORS.purple;
            ctx.translate(this.x, this.y);

            // 底座
            ctx.fillStyle = '#151922';
            ctx.fillRect(0, this.height - 10, this.width, 10);
            // 发光能量核心
            const heightOffset = Math.abs(Math.sin(this.pulse)) * 10;
            ctx.fillStyle = COLORS.purple;
            ctx.fillRect(5, heightOffset, this.width - 10, this.height - 10 - heightOffset);
            ctx.fillStyle = COLORS.cyan;
            ctx.fillRect(10, heightOffset + 5, this.width - 20, 5);
        }
        ctx.restore();
    }
}

class Collectible {
    constructor() {
        this.width = 25;
        this.height = 25;
        this.x = canvas.width + Math.random() * 300;
        this.y = canvas.height * 0.7 - 60 - Math.random() * 100;
        this.type = Math.random() > 0.4 ? 'NOTE' : 'CORE'; // 音符 或 核心
        this.pulse = 0;
    }

    update() {
        this.x -= gameSpeed;
        this.pulse += 0.08;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2 + Math.sin(this.pulse) * 4);
        ctx.rotate(this.pulse);
        ctx.shadowBlur = 15;

        if (this.type === 'NOTE') {
            ctx.shadowColor = COLORS.cyan;
            ctx.fillStyle = COLORS.cyan;
            // 绘制像素音符图案
            ctx.fillRect(-5, -8, 4, 16); // 符杆
            ctx.fillRect(-10, 4, 8, 6);  // 符头
            ctx.fillRect(-5, -8, 12, 4); // 符翅
        } else {
            ctx.shadowColor = COLORS.yellow;
            ctx.fillStyle = COLORS.yellow;
            // 核心立方体
            ctx.fillRect(-8, -8, 16, 16);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(-10, -10, 20, 20);
        }
        ctx.restore();
    }
}

let obstacles = [];
let collectibles = [];
let spawnTimer = 0;

function handleEntities() {
    spawnTimer++;
    if (spawnTimer > 80) {
        spawnTimer = 0;
        if (Math.random() > 0.4) {
            const type = Math.random() > 0.5 ? 'DRONE' : 'BARRIER';
            obstacles.push(new Obstacle(type));
        } else {
            collectibles.push(new Collectible());
        }
    }

    // 障碍物更新绘制
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        obstacles[i].draw();

        // 碰撞判定
        if (isColliding(player, obstacles[i])) {
            if (player.state !== 'HURT') {
                player.triggerHurt();
                score = Math.max(0, score - 200); // 扣分惩罚
            }
        }

        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }

    // 收集物更新绘制
    for (let i = collectibles.length - 1; i >= 0; i--) {
        collectibles[i].update();
        collectibles[i].draw();

        if (isColliding(player, collectibles[i])) {
            createCollectParticles(collectibles[i].x, collectibles[i].y, collectibles[i].type);
            if (collectibles[i].type === 'NOTE') {
                score += 500;
            } else {
                score += 1000;
                dataCoreCount++;
            }
            collectibles.splice(i, 1);
            continue;
        }

        if (collectibles[i].x + collectibles[i].width < 0) {
            collectibles.splice(i, 1);
        }
    }
}

// 矩形盒碰撞检测算法
function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.baseWidth > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.baseHeight > rect2.y;
}


// ==========================================
// 3. 视差系统 (PARALLAX BACKGROUND)
// ==========================================
class SkyLayer {
    constructor() {
        this.stars = [];
        for (let i = 0; i < 35; i++) {
            this.stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * (canvas.height * 0.4),
                size: Math.random() * 2 + 1,
                alpha: Math.random()
            });
        }
    }

    draw() {
        // 1. 晚霞渐变天空
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.7);
        skyGrad.addColorStop(0, '#04030f');
        skyGrad.addColorStop(0.3, '#1c0f30');
        skyGrad.addColorStop(0.6, '#4c1c5c');
        skyGrad.addColorStop(0.85, '#d35271');
        skyGrad.addColorStop(1, '#ff8066');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 星星微闪
        ctx.fillStyle = '#ffffff';
        this.stars.forEach(s => {
            s.alpha += (Math.random() - 0.5) * 0.1;
            s.alpha = Math.max(0.1, Math.min(1, s.alpha));
            ctx.globalAlpha = s.alpha;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        ctx.globalAlpha = 1.0;
    }
}

class FarCityLayer {
    constructor() {
        this.buildings = [];
        this.width = 180;
        this.totalBuildings = Math.ceil(canvas.width / 150) + 2;
        for (let i = 0; i < this.totalBuildings; i++) {
            this.buildings.push({
                x: i * this.width,
                height: 180 + Math.random() * 150,
                width: this.width + Math.random() * 50,
                windowPattern: this.createWindowPattern()
            });
        }
    }

    createWindowPattern() {
        let pattern = [];
        for (let r = 0; r < 12; r++) {
            for (let c = 0; c < 5; c++) {
                if (Math.random() > 0.6) {
                    pattern.push({r, c, color: Math.random() > 0.5 ? COLORS.cyan : COLORS.purple});
                }
            }
        }
        return pattern;
    }

    draw(speedMultiplier) {
        ctx.save();
        const scroll = (gameSpeed * speedMultiplier) % this.width;
        
        ctx.translate(-scroll, 0);
        this.buildings.forEach((b, index) => {
            const drawX = index * this.width;
            const drawY = canvas.height * 0.7 - b.height;

            // 远景楼宇阴影与质感
            ctx.fillStyle = '#0f0c24';
            ctx.fillRect(drawX, drawY, b.width, b.height);

            // 绘制远景大楼楼顶天线
            ctx.strokeStyle = '#221a3a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(drawX + b.width / 2, drawY);
            ctx.lineTo(drawX + b.width / 2, drawY - 25);
            ctx.stroke();

            // 绘制天窗发光网格
            const winW = 5;
            const winH = 8;
            b.windowPattern.forEach(win => {
                const wx = drawX + 15 + win.c * 15;
                const wy = drawY + 20 + win.r * 15;
                if (wx < drawX + b.width - 15) {
                    ctx.fillStyle = win.color;
                    ctx.globalAlpha = 0.25;
                    ctx.fillRect(wx, wy, winW, winH);
                }
            });
            ctx.globalAlpha = 1.0;
        });
        ctx.restore();
    }
}

class MidCityLayer {
    constructor() {
        this.elements = [];
        this.totalCount = 10;
        for (let i = 0; i < this.totalCount; i++) {
            this.elements.push({
                x: i * 250,
                height: 100 + Math.random() * 100,
                width: 140 + Math.random() * 60,
                neonLabel: Math.random() > 0.5 ? '2088' : 'MUSIC'
            });
        }
    }

    draw(speedMultiplier) {
        ctx.save();
        const scroll = (gameSpeed * speedMultiplier) % 250;
        ctx.translate(-scroll, 0);

        this.elements.forEach((e, idx) => {
            const drawX = idx * 250;
            const drawY = canvas.height * 0.7 - e.height;

            // 绘制中景建筑
            ctx.fillStyle = '#111025';
            ctx.fillRect(drawX, drawY, e.width, e.height);

            // 绘制高架桥侧面透视线
            ctx.strokeStyle = COLORS.purple;
            ctx.lineWidth = 1;
            ctx.strokeRect(drawX, drawY, e.width, e.height);

            // 霓虹发光招牌
            ctx.shadowBlur = 8;
            ctx.shadowColor = COLORS.cyan;
            ctx.fillStyle = COLORS.cyan;
            ctx.fillRect(drawX + 10, drawY + 15, 8, 30);

            // 楼宇内的未来字体
            ctx.fillStyle = '#fff';
            ctx.font = '7px "Share Tech Mono"';
            ctx.fillText(e.neonLabel, drawX + 25, drawY + 30);
            
            ctx.shadowBlur = 0;
        });
        ctx.restore();
    }
}

class GroundLayer {
    constructor() {
        this.wireY = canvas.height * 0.7;
    }

    draw() {
        const h = canvas.height;
        const groundY = h * 0.7;

        // 1. 地面赛博格深渊渐变
        const gr = ctx.createLinearGradient(0, groundY, 0, h);
        gr.addColorStop(0, '#0a091a');
        gr.addColorStop(0.5, '#050308');
        gr.addColorStop(1, '#000000');
        ctx.fillStyle = gr;
        ctx.fillRect(0, groundY, canvas.width, h - groundY);

        // 2. 地面发光透视网格（营造 3D 立体空间感）
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // 水平线
        for (let y = groundY; y < h; y += 25) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        // 透视汇聚斜线
        const step = canvas.width / 12;
        for (let i = -4; i <= 16; i++) {
            ctx.moveTo(i * step - (gameSpeed * 1.5) % step, groundY);
            ctx.lineTo(i * step * 1.5 - (gameSpeed * 2.5) % (step * 1.5), h);
        }
        ctx.stroke();

        // 3. 路缘线发光
        ctx.strokeStyle = COLORS.cyan;
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.cyan;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

const sky = new SkyLayer();
const farCity = new FarCityLayer();
const midCity = new MidCityLayer();
const ground = new GroundLayer();


// ==========================================
// 4. 粒子特效系统 (PARTICLE SYSTEM)
// ==========================================
class Particle {
    constructor(x, y, vx, vy, size, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.maxLife = life;
        this.life = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

let particles = [];

function createJumpParticles(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(
            x, y,
            (Math.random() - 0.5) * 5 - 2, // 随风后吹
            -Math.random() * 4,
            Math.random() * 3 + 2,
            COLORS.cyan,
            25 + Math.random() * 15
        ));
    }
}

function createCollectParticles(x, y, type) {
    const color = type === 'NOTE' ? COLORS.cyan : COLORS.yellow;
    for (let i = 0; i < 12; i++) {
        particles.push(new Particle(
            x, y,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            Math.random() * 4 + 2,
            color,
            30
        ));
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}


// ==========================================
// 5. 屏幕抖动控制
// ==========================================
function triggerScreenShake(duration, magnitude) {
    screenShakeDuration = duration;
    screenShakeX = magnitude;
    screenShakeY = magnitude;
}

function applyScreenShake() {
    if (screenShakeDuration > 0) {
        const dx = (Math.random() - 0.5) * screenShakeX;
        const dy = (Math.random() - 0.5) * screenShakeY;
        ctx.translate(dx, dy);
        screenShakeDuration--;
    }
}


// ==========================================
// 6. 游戏交互流程与生命周期
// ==========================================
function startGame() {
    gameState = 'PLAYING';
    score = 0;
    dataCoreCount = 0;
    gameSpeed = baseSpeed;
    obstacles = [];
    collectibles = [];
    particles = [];
    player.reset();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('sys-status').className = 'hud-value status-good';
    document.getElementById('sys-status').textContent = 'ONLINE';
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('final-score').textContent = Math.floor(score);
    document.getElementById('final-data').textContent = dataCoreCount;
    document.getElementById('sys-status').className = 'hud-value text-purple';
    document.getElementById('sys-status').textContent = 'OFFLINE';

    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('2088_highScore', highScore);
    }
}

// 物理按键与触控绑定
function handleJumpAction() {
    if (gameState === 'PLAYING') {
        player.jump();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJumpAction();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleJumpAction();
}, { passive: false });

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);


// ==========================================
// 7. 核心游戏循环 (GAME LOOP)
// ==========================================
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // 应用屏幕抖动特效
    applyScreenShake();

    // 1. 渲染视差背景 (Parallax)
    sky.draw();
    farCity.draw(0.08); // 超慢速远景
    midCity.draw(0.35); // 中速城市高架区

    // 2. 更新运行物理
    if (gameState === 'PLAYING') {
        scoreTimer++;
        if (scoreTimer % 5 === 0) {
            score += 1; // 持续生存得分
        }

        // 游戏阻尼递增
        if (gameSpeed < maxSpeed) {
            gameSpeed += 0.001;
        }

        player.update();
    }

    // 3. 渲染运动环境与角色
    ground.draw();
    handleEntities();
    updateParticles();
    player.draw();

    ctx.restore();

    // 4. 更新 HUD 数据终端
    document.getElementById('hud-score').textContent = String(Math.floor(score)).padStart(6, '0');
    document.getElementById('hud-hiscore').textContent = String(Math.floor(highScore)).padStart(6, '0');
    document.getElementById('hud-data').textContent = String(dataCoreCount).padStart(4, '0');

    // 5. 死亡判定
    if (gameState === 'PLAYING' && player.state === 'HURT' && score <= 0) {
        gameOver();
    }

    requestAnimationFrame(gameLoop);
}

// 开启核心渲染引擎
gameLoop();
