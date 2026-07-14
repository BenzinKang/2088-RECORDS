/**
 * CYBER_CORE: NEON RUN - Pure Vanilla HTML5 Canvas Procedural Pixel-Art Engine
 * Optimized structural modularity mimicking professional indie game frameworks.
 */

// --- ENUM CONFIGURATIONS & GAME STATE CONSTANTS ---
const STATES = { START: 0, RUNNING: 1, GAMEOVER: 2 };
const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;
const FLOOR_Y = 225;

// Global Color Matrix
const PALETTE = {
    skyTop: '#050816',
    skyMid: '#171033',
    skyBot: '#36103b',
    sunGlow: '#ff5500',
    sunCore: '#ffaa00',
    neonCyan: '#00f3ff',
    neonMagenta: '#ff0055',
    neonGold: '#ffaa00',
    cityDark: '#0b1026',
    cityMid: '#13142f',
    cityFore: '#1d193b'
};

// --- HELPER FUNCTIONS FOR PROCEDURAL PIXEL RENDERING ---
function drawPixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

// Custom procedural seeded pseudo-random for consistent landscape textures
class SeededRandom {
    constructor(seed = 12345) { this.seed = seed; }
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

// --- ENGINE ARCHITECTURE CLASSES ---

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawn(x, y, vx, vy, life, color, size = 2, type = 'square') {
        this.particles.push({ x, y, vx, vy, maxLife: life, life, color, size, type });
    }

    spawnExplosion(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2.5;
            this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 20 + Math.random() * 20, color, 1 + Math.random() * 2);
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.life -= dt * 60;
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            if (p.type === 'rain') p.y += 3; // Extra acceleration downwards
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        for (let p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.floor(p.size), Math.floor(p.size));
        }
        ctx.globalAlpha = 1.0;
    }
}

class BackgroundSystem {
    constructor() {
        this.clouds = [
            { x: 40, y: 30, speed: 0.05, pixels: [[1,1,1],[1,1,1,1,1],[0,1,1,1]] },
            { x: 180, y: 15, speed: 0.03, pixels: [[0,1,1],[1,1,1,1],[0,1,1]] },
            { x: 320, y: 45, speed: 0.07, pixels: [[1,1,1,1],[1,1,1,1,1,1],[0,0,1,1,1]] }
        ];
        
        this.rand = new SeededRandom(789);
        this.bgBuildings = [];
        this.midBuildings = [];
        this.foreElements = [];
        
        this.generateParallaxSectors();
    }

    generateParallaxSectors() {
        // Background layer generation
        let curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 35 + this.rand.next() * 45;
            let h = 80 + this.rand.next() * 90;
            this.bgBuildings.push({ x: curX, w: w, h: h, seed: this.rand.next() });
            curX += w - 5; // Slight structural overlaps
        }
        // Middle layer generation
        curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 45 + this.rand.next() * 55;
            let h = 110 + this.rand.next() * 80;
            this.midBuildings.push({
                x: curX, w: w, h: h, 
                type: Math.floor(this.rand.next() * 3),
                neonColor: this.rand.next() > 0.4 ? (this.rand.next() > 0.5 ? PALETTE.neonCyan : PALETTE.neonMagenta) : null,
                seed: this.rand.next()
            });
            curX += w + 10;
        }
    }

    update(dt, speedMultiplier) {
        const baseSpeed = 2 * speedMultiplier;
        
        // Clouds translation
        for (let c of this.clouds) {
            c.x -= c.speed * baseSpeed * dt * 30;
            if (c.x < -40) c.x = GAME_WIDTH + 20;
        }
        
        // Parallax horizontal shifts
        for (let b of this.bgBuildings) {
            b.x -= 0.1 * baseSpeed * dt * 60;
            if (b.x + b.w < 0) b.x += GAME_WIDTH + 200;
        }
        
        for (let b of this.midBuildings) {
            b.x -= 0.35 * baseSpeed * dt * 60;
            if (b.x + b.w < 0) b.x += GAME_WIDTH + 200;
        }
    }


 // 替换 game.js 中 BackgroundSystem 类的 drawSky 函数
    drawSky(ctx) {
        // 1. 创建 Synthwave 紫橙粉渐变天空
        let skyGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
        skyGrad.addColorStop(0, '#171033');    // 深紫 Synthwave Top
        skyGrad.addColorStop(0.5, '#4c103e');  // 霓虹粉紫 Middle
        skyGrad.addColorStop(1, '#ff5500');    // 温暖橙 Horizon
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, FLOOR_Y);

        // 2. 绘制合成器浪潮巨大的太阳 (把太阳往上提，并添加复古横向切线效果)
        let sunX = GAME_WIDTH / 2; 
        let sunY = FLOOR_Y - 45;   // 【修改】将太阳的Y轴大幅往上提，使其跃出地平线
        let sunRadius = 45;        // 太阳半径

        // 绘制太阳发光底层 (Bloom)
        ctx.save();
        ctx.globalAlpha = 0.25;
        let bloomGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunRadius + 20);
        bloomGrad.addColorStop(0, '#ff0055');
        bloomGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bloomGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius + 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 绘制太阳本体
        ctx.save();
        // 限制绘制区域在一个圆形中
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.clip();

        // 填充太阳渐变色
        let sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#ffaa00'); // 顶部金黄
        sunGrad.addColorStop(1, '#ff0055'); // 底部渐变霓虹粉

        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunX - sunRadius, sunY - sunRadius, sunRadius * 2, sunRadius * 2);

        // --- 核心亮点：Synthwave 标志性的太阳水平切线 ---
        // 我们用天空的渐变色在太阳上画横线，营造出复古合成器浪潮效果
        ctx.fillStyle = skyGrad; 
        let barHeight = 2; // 切线高度
        // 从太阳中下部开始切线，越往下切线越宽
        for (let y = sunY - 10; y < sunY + sunRadius; y += 6) {
            let currentBarWidth = Math.floor((y - (sunY - 10)) / 4) + 1;
            ctx.fillRect(sunX - sunRadius, y, sunRadius * 2, currentBarWidth);
        }
        ctx.restore();

        // 3. 绘制大气层像素云（保持原样）
        ctx.fillStyle = '#171033';
        ctx.globalAlpha = 0.3;
        const pSize = 4;
        for (let c of this.clouds) {
            for (let row = 0; row < c.pixels.length; row++) {
                for (let col = 0; col < c.pixels[row].length; col++) {
                    if (c.pixels[row][col] === 1) {
                        ctx.fillRect(Math.floor(c.x + col * pSize), Math.floor(c.y + row * pSize), pSize, pSize);
                    }
                }
            }
        }
        ctx.globalAlpha = 1.0;
    }

    // 在 game.js 的 BackgroundSystem 类中找到并替换此函数
    drawCity(ctx) {
        const pSize = 2;

        // 1. Far Far Background Silhouettes (远景剪影)
        // 增加一点透明度，让夕阳光线“渗”出来
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = PALETTE.cityDark; // 深蓝紫色剪影
        for (let b of this.bgBuildings) {
            let bY = FLOOR_Y - b.h;
            ctx.fillRect(Math.floor(b.x), Math.floor(bY), Math.floor(b.w), Math.floor(b.h));
            // Tiny geometric antennas
            if (b.seed > 0.6) {
                ctx.fillRect(Math.floor(b.x + b.w/2), Math.floor(bY - 12), 2, 12);
            }
        }
        ctx.globalAlpha = 1.0;

        // 2. Mid Skyline Architecture (中景建筑)
        for (let b of this.midBuildings) {
            let bY = FLOOR_Y - b.h;
            
            // 核心建筑结构：使用带有夕阳余晖的渐变色
            // 从 cityMid (深紫) 渐变到更暗的 cityDark
            let bGrad = ctx.createLinearGradient(b.x, bY, b.x, FLOOR_Y);
            bGrad.addColorStop(0, '#13142f'); // City Mid (稍微提亮一点)
            bGrad.addColorStop(1, PALETTE.cityDark); // City Dark
            ctx.fillStyle = bGrad;
            ctx.fillRect(Math.floor(b.x), Math.floor(bY), Math.floor(b.w), Math.floor(b.h));

            // Windows & Neon Matrix (保持原样)
            ctx.fillStyle = '#1e244a';
            let winSeed = b.seed;
            for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 8) {
                for (let wy = bY + 10; wy < FLOOR_Y - 15; wy += 14) {
                    winSeed = (winSeed * 31 + 17) % 100;
                    if (winSeed > 65) {
                        ctx.fillStyle = winSeed > 85 ? PALETTE.neonGold : '#3d4478';
                        ctx.fillRect(Math.floor(wx), Math.floor(wy), 3, 5);
                    }
                }
            }

            // High Tech Neon advertisements (保持原样)
            if (b.neonColor) {
                ctx.fillStyle = b.neonColor;
                ctx.globalAlpha = 0.6;
                ctx.fillRect(Math.floor(b.x + 2), Math.floor(bY + 4), 2, Math.floor(b.h - 10));
                
                if (b.type === 1) {
                    ctx.fillRect(Math.floor(b.x + b.w/2 - 8), Math.floor(bY + 4), 16, 6);
                }
                ctx.globalAlpha = 1.0;
            }
        }
    }

    drawForegroundGrid(ctx, worldX) {
        // Procedural floor concrete boundary
        drawPixelRect(ctx, 0, FLOOR_Y, GAME_WIDTH, 4, '#121424');
        drawPixelRect(ctx, 0, FLOOR_Y + 4, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y, '#070914');

        // Linear grid perspectives drawn procedurally via tracking game world offset
        ctx.strokeStyle = '#181b36';
        ctx.lineWidth = 1;
        let spacing = 18;
        let offset = (worldX * 1.5) % spacing;

        // Vertical panel crosslines
        ctx.beginPath();
        for (let x = -offset; x < GAME_WIDTH; x += spacing) {
            ctx.moveTo(Math.floor(x), FLOOR_Y + 4);
            ctx.lineTo(Math.floor(x), GAME_HEIGHT);
        }
        ctx.stroke();

        // Horizontal neon tracking trim
        ctx.strokeStyle = PALETTE.neonMagenta;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, FLOOR_Y + 4);
        ctx.lineTo(GAME_WIDTH, FLOOR_Y + 4);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

class Player {
    constructor(particleSystem) {
        this.ps = particleSystem;
        this.reset();
    }

    reset() {
        this.x = 45;
        this.y = FLOOR_Y - 32;
        this.w = 20;
        this.h = 32;
        this.vy = 0;
        this.gravity = 0.45;
        this.jumpForce = -7.5;
        this.isGrounded = true;
        this.jumpCount = 0;
        this.animTimer = 0;
        this.state = 'RUN'; // RUN, JUMP, LAND
    }

    jump() {
        if (this.isGrounded || this.jumpCount < 2) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.jumpCount++;
            this.state = 'JUMP';
            
            // Thrust engine fire effects
            for(let i=0; i<8; i++) {
                this.ps.spawn(this.x + 4, this.y + 24, -1 - Math.random()*2, (Math.random()-0.5)*3, 15, PALETTE.neonCyan, 2);
            }
        }
    }

    update(dt) {
        this.animTimer += dt * 12;

        // Semi-realistic physics implementation
        this.vy += this.gravity * dt * 60;
        this.y += this.vy * dt * 60;

        // Ground Collision Lock
        if (this.y >= FLOOR_Y - this.h) {
            this.y = FLOOR_Y - this.h;
            this.vy = 0;
            
            if (!this.isGrounded) {
                this.isGrounded = true;
                this.jumpCount = 0;
                this.state = 'RUN';
                // Impact dust dynamics
                for(let i=0; i<6; i++) {
                    this.ps.spawn(this.x + 10, FLOOR_Y, (Math.random()-0.5)*4, -Math.random()*2, 12, '#8892b0', 2);
                }
            }
        }

        // Particle generation running constant heat core discharge
        if (this.isGrounded && Math.random() > 0.7) {
            this.ps.spawn(this.x, this.y + 16, -1, -0.5, 10, PALETTE.neonMagenta, 1);
        }
    }

    draw(ctx) {
        const px = Math.floor(this.x);
        const py = Math.floor(this.y);
        
        // Procedural leg cycle calculation based on active runtime states
        let legOffset = 0;
        let torsoBounce = 0;
        if (this.isGrounded) {
            legOffset = Math.sin(this.animTimer) * 4;
            torsoBounce = Math.abs(Math.cos(this.animTimer)) * 2;
        } else {
            legOffset = this.vy < 0 ? 3 : -2; // Leg posture configuration based on velocity vectors
        }

        // --- LAYERED MECHANIZED DRAW SYSTEM ---

        // 1. Back Hydraulic Leg Architecture
        ctx.fillStyle = '#0f1224';
        ctx.fillRect(px + 4, py + 18 + torsoBounce, 4, 8);
        ctx.fillStyle = '#1d2242';
        ctx.fillRect(px + 2 + (this.isGrounded ? -legOffset : 2), py + 24, 4, 8);

        // 2. Heavy Steel Mech Torso & Plating Armor
        ctx.fillStyle = '#2d355a';
        ctx.fillRect(px + 2, py + 6 - torsoBounce, 16, 14);
        ctx.fillStyle = '#414b7e'; // Panel Highlights
        ctx.fillRect(px + 4, py + 8 - torsoBounce, 12, 4);

        // 3. Cybernetic Control Cockpit Head Canopy
        ctx.fillStyle = '#171a33';
        ctx.fillRect(px + 10, py - torsoBounce, 10, 8);
        // Glowing Visor / Optical Scanner Lens
        ctx.fillStyle = PALETTE.neonCyan;
        ctx.fillRect(px + 16, py + 2 - torsoBounce, 4, 2);

        // 4. Front Kinetic Leg Architecture
        ctx.fillStyle = '#1d2242';
        ctx.fillRect(px + 12, py + 18 + torsoBounce, 4, 8);
        ctx.fillStyle = '#5260a4';
        ctx.fillRect(px + 10 + (this.isGrounded ? legOffset : -2), py + 24, 5, 8);

        // 5. Plasma Core Over-heat Reactor Vent (Center Core)
        ctx.fillStyle = (Math.floor(this.animTimer) % 2 === 0) ? PALETTE.neonMagenta : '#a30036';
        ctx.fillRect(px + 8, py + 12 - torsoBounce, 4, 4);
    }

    getHitbox() {
        // Compressed tight collision boxes for satisfying gameplay loops
        return { x: this.x + 4, y: this.y + 2, w: this.w - 6, h: this.h - 4 };
    }
}

class WorldManager {
    constructor(particleSystem) {
        this.ps = particleSystem;
        this.obstacles = [];
        this.spawnTimer = 0;
        this.minSpawnInterval = 90;
    }

    reset() {
        this.obstacles = [];
        this.spawnTimer = 0;
    }

    update(dt, speedMultiplier) {
        this.spawnTimer += dt * 60;
        
        // Dynamic scaling difficulty algorithm
        let currentInterval = Math.max(50, 130 - speedMultiplier * 15);
        
        if (this.spawnTimer >= currentInterval) {
            this.spawnTimer = 0;
            this.spawnObstacle();
        }

        // Loop array backwards for standard safe deletion sequences
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let obs = this.obstacles[i];
            obs.x -= 4.2 * speedMultiplier * dt * 60;
            
            // Atmospheric particle trails tracking on high-velocity drones
            if (obs.type === 'drone' && Math.random() > 0.6) {
                this.ps.spawn(obs.x + obs.w, obs.y + obs.h/2, 1, 0, 8, PALETTE.neonCyan, 1);
            }

            if (obs.x + obs.w < 0) {
                this.obstacles.splice(i, 1);
            }
        }
    }

    spawnObstacle() {
        let randVal = Math.random();
        let obs = {};

        if (randVal < 0.45) {
            // Industrial Freight Matrix Cache Box
            obs = {
                x: GAME_WIDTH + 20, y: FLOOR_Y - 22, w: 18, h: 22,
                type: 'container', color: '#632512', trim: PALETTE.neonGold
            };
        } else if (randVal < 0.8) {
            // High-voltage Neon Plasma Deflection Node Grid
            obs = {
                x: GAME_WIDTH + 20, y: FLOOR_Y - 36, w: 12, h: 36,
                type: 'barrier', color: '#172540', trim: PALETTE.neonMagenta
            };
        } else {
            // Low-altitude Autonomous Air Security Hunter Drone
            let droneAlt = FLOOR_Y - 48 - Math.random() * 25;
            obs = {
                x: GAME_WIDTH + 20, y: droneAlt, w: 16, h: 10,
                type: 'drone', color: '#202538', trim: PALETTE.neonCyan
            };
        }
        this.obstacles.push(obs);
    }

    draw(ctx) {
        for (let obs of this.obstacles) {
            const ox = Math.floor(obs.x);
            const oy = Math.floor(obs.y);
            
            // Core structure profile rendering
            drawPixelRect(ctx, ox, oy, obs.w, obs.h, obs.color);
            
            // Cyberpunk detail injection based on contextual metadata
            if (obs.type === 'container') {
                // Reinforced iron cargo cross beams
                ctx.fillStyle = '#3a180d';
                ctx.fillRect(ox + 2, oy + 2, obs.w - 4, 2);
                ctx.fillRect(ox + 2, oy + obs.h - 4, obs.w - 4, 2);
                ctx.fillStyle = obs.trim;
                ctx.fillRect(ox + 4, oy + 8, 3, 3); // Nuclear tracking marker
            } 
            else if (obs.type === 'barrier') {
                // High voltage energetic node posts
                ctx.fillStyle = '#0d1626';
                ctx.fillRect(ox + 3, oy, obs.w - 6, obs.h);
                // Glowing plasma energy field stream core
                ctx.fillStyle = obs.trim;
                ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.02) * 0.2;
                ctx.fillRect(ox + 5, oy + 4, obs.w - 10, obs.h - 12);
                ctx.globalAlpha = 1.0;
            } 
            else if (obs.type === 'drone') {
                // Multi-wing engine structural alignment profile
                ctx.fillStyle = '#0b0d14';
                ctx.fillRect(ox, oy + 2, 4, 4); // Rear thruster alignment
                ctx.fillStyle = obs.trim;       // Forward laser optic tracker camera
                ctx.fillRect(ox + obs.w - 3, oy + 4, 3, 3);
            }
        }
    }
}

// --- CENTRAL CORE GAME ENGINE ---

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.particleSystem = new ParticleSystem();
        this.bgSystem = new BackgroundSystem();
        this.player = new Player(this.particleSystem);
        this.worldManager = new WorldManager(this.particleSystem);

        this.gameState = STATES.START;
        this.score = 0;
        this.highscore = parseInt(localStorage.getItem('cc_highscore')) || 0;
        this.speedMultiplier = 1.0;
        this.worldX = 0;
        
        this.lastTime = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        this.initUI();
        this.bindInput();
        
        // Active loop initializer kick-start
        requestAnimationFrame((t) => this.loop(t));
    }

    initUI() {
        this.dom = {
            hud: document.getElementById('hud'),
            score: document.getElementById('hud-score'),
            highscore: document.getElementById('hud-highscore'),
            startScreen: document.getElementById('screen-start'),
            gameoverScreen: document.getElementById('screen-gameover'),
            finalScore: document.getElementById('final-score'),
            finalHighscore: document.getElementById('final-highscore'),
            btnStart: document.getElementById('btn-start'),
            btnRestart: document.getElementById('btn-restart')
        };

        this.dom.btnStart.addEventListener('click', () => this.startGame());
        this.dom.btnRestart.addEventListener('click', () => this.startGame());
    }

    bindInput() {
        const triggerJump = () => {
            if (this.gameState === STATES.RUNNING) {
                this.player.jump();
            }
        };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                triggerJump();
            }
        });

        // Instant universal touch interface binding for smart responsive mobile scaling
        window.addEventListener('touchstart', (e) => {
            if (this.gameState === STATES.RUNNING) {
                // Prevent duplicate ghost click execution paths on complex mobile devices
                if (e.target.tagName !== 'BUTTON') {
                    e.preventDefault();
                    triggerJump();
                }
            }
        }, { passive: false });
    }

    startGame() {
        this.score = 0;
        this.speedMultiplier = 1.0;
        this.worldX = 0;
        this.player.reset();
        this.worldManager.reset();
        
        this.gameState = STATES.RUNNING;
        
        this.dom.startScreen.classList.add('hidden');
        this.dom.gameoverScreen.classList.add('hidden');
        this.dom.hud.classList.remove('hidden');
    }

    triggerScreenShake(duration, intensity) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }

    checkCollisions() {
        let pHitbox = this.player.getHitbox();

        for (let obs of this.worldManager.obstacles) {
            if (pHitbox.x < obs.x + obs.w &&
                pHitbox.x + pHitbox.w > obs.x &&
                pHitbox.y < obs.y + obs.h &&
                pHitbox.y + pHitbox.h > obs.y) {
                this.gameOver();
                break;
            }
        }
    }

    gameOver() {
        this.gameState = STATES.GAMEOVER;
        this.triggerScreenShake(30, 6);
        
        // Massive energy core implosion particle spray
        this.particleSystem.spawnExplosion(this.player.x + 10, this.player.y + 16, PALETTE.neonMagenta, 24);
        this.particleSystem.spawnExplosion(this.player.x + 10, this.player.y + 16, PALETTE.neonCyan, 16);

        if (this.score > this.highscore) {
            this.highscore = this.score;
            localStorage.setItem('cc_highscore', this.highscore);
        }

        // String numerical padding conversions
        this.dom.finalScore.textContent = Math.floor(this.score);
        this.dom.finalHighscore.textContent = Math.floor(this.highscore);
        
        this.dom.gameoverScreen.classList.remove('hidden');
    }

    update(dt) {
        // Enforce max delta step boundary to secure stable collision sweeps during extreme frame skips
        if (dt > 0.1) dt = 0.1;

        // Camera shake matrix timer countdowns
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt * 60;
        }

        this.particleSystem.update(dt);

        if (this.gameState === STATES.RUNNING) {
            // Progressive algorithmic procedural speed amplification curves
            this.speedMultiplier += 0.015 * dt;
            this.worldX += 4.2 * this.speedMultiplier * dt * 60;
            this.score += dt * 8 * this.speedMultiplier;

            // DOM Interface Metrics Engine Refresh
            this.dom.score.textContent = String(Math.floor(this.score)).padStart(5, '0');
            this.dom.highscore.textContent = String(Math.floor(this.highscore)).padStart(5, '0');

            this.bgSystem.update(dt, this.speedMultiplier);
            this.player.update(dt);
            this.worldManager.update(dt, this.speedMultiplier);
            this.checkCollisions();
        }
        
        // Ambient environmental matrix weather rain details
        if (Math.random() > 0.4) {
            this.particleSystem.spawn(Math.random() * GAME_WIDTH, -5, -1, 4, 60, '#3d4b7c', 1, 'rain');
        }
    }

    draw() {
        this.ctx.save();
        
        // Apply procedural screenshake translations across global matrix transformation hooks
        if (this.shakeTimer > 0) {
            let dx = (Math.random() - 0.5) * this.shakeIntensity;
            let dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        this.ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Core Pipeline Layers Sequences execution execution map
        this.bgSystem.drawSky(this.ctx);
        this.bgSystem.drawCity(this.ctx);
        this.bgSystem.drawForegroundGrid(this.ctx, this.worldX);
        
        this.worldManager.draw(this.ctx);
        
        if (this.gameState !== STATES.GAMEOVER) {
            this.player.draw(this.ctx);
        }
        
        this.particleSystem.draw(this.ctx);

        this.ctx.restore();
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }
}

// Instantiate and initialize runtime system stack once file registers safely
window.addEventListener('DOMContentLoaded', () => {
    new GameEngine();
});
