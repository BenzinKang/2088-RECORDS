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
        this.utilityPoles = []; // 新增：前景电线杆数据
        
        this.generateParallaxSectors();
    }

// 找到 BackgroundSystem 类的 generateParallaxSectors 方法并替换
// 找到 BackgroundSystem 类的 generateParallaxSectors 方法并替换
    generateParallaxSectors() {
        // 1. 远景建筑（微缩的远山般参差齐剪影）
        let curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 20 + this.rand.next() * 30;
            let h = 45 + this.rand.next() * 55;
            this.bgBuildings.push({ x: curX, w: w, h: h, seed: this.rand.next() });
            curX += w - 3;
        }

        // 2. 中景建筑【超级赛博朋克多样化重构】
        curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 40 + this.rand.next() * 45; 
            let h = 70 + this.rand.next() * 60; 
            
            // 每一个建筑都生成一套独特的、不规整的赛博挂件外设
            this.midBuildings.push({
                x: curX, 
                w: w, 
                h: h, 
                seed: this.rand.next(),
                // 霓虹主色调
                neonColor: this.rand.next() > 0.3 ? (this.rand.next() > 0.5 ? PALETTE.neonCyan : PALETTE.neonMagenta) : PALETTE.neonGold,
                // 外设挂件：0=侧边挂载仓, 1=顶部雷达阵列, 2=巨型跨楼广告牌, 3=多重不规则堆叠
                addonType: Math.floor(this.rand.next() * 4),
                // 广告牌宽度和高度
                boardW: 10 + Math.floor(this.rand.next() * 15),
                boardH: 25 + Math.floor(this.rand.next() * 30),
                boardYOffset: 15 + Math.floor(this.rand.next() * 30),
                // 闪烁频率
                blinkSpeed: 0.5 + this.rand.next() * 1.5
            });
            curX += w + 22; // 留出空间给侧边挂载仓和横向霓虹牌
        }

        // 3. 前景电线杆（保持不变）
        curX = 100;
        while (curX < GAME_WIDTH + 300) {
            this.utilityPoles.push({
                x: curX,
                h: 75 + Math.random() * 20,
                crossarms: Math.random() > 0.3
            });
            curX += 160 + Math.random() * 100;
        }
    }
    
    update(dt, speedMultiplier) {
        const baseSpeed = 2 * speedMultiplier;
        
        // 云朵移动
        for (let c of this.clouds) {
            c.x -= c.speed * baseSpeed * dt * 30;
            if (c.x < -40) c.x = GAME_WIDTH + 20;
        }
        
        // 远景移动（极慢）
        for (let b of this.bgBuildings) {
            b.x -= 0.08 * baseSpeed * dt * 60;
            if (b.x + b.w < 0) b.x += GAME_WIDTH + 200;
        }
        
        // 中景移动（较慢）
        for (let b of this.midBuildings) {
            b.x -= 0.25 * baseSpeed * dt * 60;
            if (b.x + b.w < 0) b.x += GAME_WIDTH + 200;
        }

        // 前景电线杆移动（最快，与地板卷动一致，形成强烈的近景位移）
        for (let p of this.utilityPoles) {
            p.x -= 4.2 * speedMultiplier * dt * 60;
            if (p.x < -50) {
                p.x = GAME_WIDTH + 50 + Math.random() * 100;
                p.h = 75 + Math.random() * 20;
            }
        }
    }

    drawSky(ctx) {
        // 1. 创建 Synthwave 紫橙粉渐变天空
        let skyGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
        skyGrad.addColorStop(0, '#171033');    
        skyGrad.addColorStop(0.5, '#4c103e');  
        skyGrad.addColorStop(1, '#ff5500');    
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, FLOOR_Y);

        // 2. 绘制合成器浪潮落日
        let sunX = GAME_WIDTH / 2; 
        let sunY = FLOOR_Y - 45;   
        let sunRadius = 45;        

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

        ctx.save();
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.clip();

        let sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#ffaa00'); 
        sunGrad.addColorStop(1, '#ff0055'); 

        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunX - sunRadius, sunY - sunRadius, sunRadius * 2, sunRadius * 2);

        ctx.fillStyle = skyGrad; 
        let barHeight = 2; 
        for (let y = sunY - 10; y < sunY + sunRadius; y += 6) {
            let currentBarWidth = Math.floor((y - (sunY - 10)) / 4) + 1;
            ctx.fillRect(sunX - sunRadius, y, sunRadius * 2, currentBarWidth);
        }
        ctx.restore();

        // 3. 新增：背景跨海悬索巨桥（画在夕阳和云彩的前面，远景建筑的后面）
        this.drawBackgroundBridge(ctx);

        // 4. 绘制大气层像素云
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

    // 新增：绘制宏大的工业悬索桥剪影
    drawBackgroundBridge(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.25; // 淡淡的雾霭质感
        ctx.strokeStyle = '#4c103e';
        ctx.fillStyle = '#4c103e';
        ctx.lineWidth = 1;

        // 桥梁主路面
        let bridgeY = FLOOR_Y - 20;
        ctx.fillRect(0, bridgeY, GAME_WIDTH, 3);

        // 两个巨大的主桥塔 (左右对称，直通云霄)
        let tower1X = GAME_WIDTH * 0.15;
        let tower2X = GAME_WIDTH * 0.85;
        let towerHeight = 70;

        // 桥塔 1
        ctx.fillRect(tower1X, bridgeY - towerHeight, 6, towerHeight);
        // 桥塔 2
        ctx.fillRect(tower2X, bridgeY - towerHeight, 6, towerHeight);

        // 悬索拉线 (用二次贝塞尔曲线绘制优雅的弧形电缆)
        ctx.beginPath();
        // 左主缆
        ctx.moveTo(0, bridgeY);
        ctx.quadraticCurveTo(tower1X / 2, bridgeY - 20, tower1X, bridgeY - towerHeight);
        // 中间主索
        ctx.quadraticCurveTo(GAME_WIDTH / 2, bridgeY - 10, tower2X, bridgeY - towerHeight);
        // 右主缆
        ctx.quadraticCurveTo((GAME_WIDTH + tower2X) / 2, bridgeY - 20, GAME_WIDTH, bridgeY);
        ctx.stroke();

        ctx.restore();
    }

    // 找到 BackgroundSystem 类的 drawCity 方法并替换
// 找到 BackgroundSystem 类的 generateParallaxSectors 方法并替换
    generateParallaxSectors() {
        // 1. 远景建筑（微缩的远山般参差齐剪影）
        let curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 20 + this.rand.next() * 30;
            let h = 45 + this.rand.next() * 55;
            this.bgBuildings.push({ x: curX, w: w, h: h, seed: this.rand.next() });
            curX += w - 3;
        }

        // 2. 中景建筑【超级赛博朋克多样化重构】
        curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 40 + this.rand.next() * 45; 
            let h = 70 + this.rand.next() * 60; 
            
            // 每一个建筑都生成一套独特的、不规整的赛博挂件外设
            this.midBuildings.push({
                x: curX, 
                w: w, 
                h: h, 
                seed: this.rand.next(),
                // 霓虹主色调
                neonColor: this.rand.next() > 0.3 ? (this.rand.next() > 0.5 ? PALETTE.neonCyan : PALETTE.neonMagenta) : PALETTE.neonGold,
                // 外设挂件：0=侧边挂载仓, 1=顶部雷达阵列, 2=巨型跨楼广告牌, 3=多重不规则堆叠
                addonType: Math.floor(this.rand.next() * 4),
                // 广告牌宽度和高度
                boardW: 10 + Math.floor(this.rand.next() * 15),
                boardH: 25 + Math.floor(this.rand.next() * 30),
                boardYOffset: 15 + Math.floor(this.rand.next() * 30),
                // 闪烁频率
                blinkSpeed: 0.5 + this.rand.next() * 1.5
            });
            curX += w + 22; // 留出空间给侧边挂载仓和横向霓虹牌
        }

        // 3. 前景电线杆（保持不变）
        curX = 100;
        while (curX < GAME_WIDTH + 300) {
            this.utilityPoles.push({
                x: curX,
                h: 75 + Math.random() * 20,
                crossarms: Math.random() > 0.3
            });
            curX += 160 + Math.random() * 100;
        }
    }

    drawForegroundGrid(ctx, worldX) {
        // 1. 绘制跑道地板底色
        drawPixelRect(ctx, 0, FLOOR_Y, GAME_WIDTH, 4, '#121424');
        drawPixelRect(ctx, 0, FLOOR_Y + 4, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y, '#070914');

        // 2. 跑道透视网格线
        ctx.strokeStyle = '#181b36';
        ctx.lineWidth = 1;
        let spacing = 18;
        let offset = (worldX * 1.5) % spacing;

        ctx.beginPath();
        for (let x = -offset; x < GAME_WIDTH; x += spacing) {
            ctx.moveTo(Math.floor(x), FLOOR_Y + 4);
            ctx.lineTo(Math.floor(x), GAME_HEIGHT);
        }
        ctx.stroke();

        // 3. 跑道上方霓虹边缘线
        ctx.strokeStyle = PALETTE.neonMagenta;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, FLOOR_Y + 4);
        ctx.lineTo(GAME_WIDTH, FLOOR_Y + 4);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // 4. 新增：绘制快速移动的前景电线杆和拉扯的电缆线
        this.drawUtilityPoles(ctx);
    }

    // 新增：绘制高精细度像素电线杆与低垂的电线缆绳
    drawUtilityPoles(ctx) {
        ctx.save();
        
        // 绘制连接各个电线杆之间的低垂电线 (按顺序连线)
        ctx.strokeStyle = '#080a14';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        
        for (let i = 0; i < this.utilityPoles.length - 1; i++) {
            let p1 = this.utilityPoles[i];
            let p2 = this.utilityPoles[i + 1];
            
            // 只有当两个电线杆距离不是特别远时，拉一条低垂的二次贝塞尔曲线
            if (p2.x - p1.x < 300) {
                let y1 = FLOOR_Y - p1.h + 5;
                let y2 = FLOOR_Y - p2.h + 5;
                ctx.beginPath();
                ctx.moveTo(p1.x, y1);
                ctx.quadraticCurveTo((p1.x + p2.x) / 2, Math.max(y1, y2) + 12, p2.x, y2);
                ctx.stroke();
            }
        }

        // 绘制电线杆本体
        for (let p of this.utilityPoles) {
            const px = Math.floor(p.x);
            const py = Math.floor(FLOOR_Y - p.h);
            
            // 杆身（深灰铁黑色）
            drawPixelRect(ctx, px - 1, py, 3, p.h, '#0f1224');
            drawPixelRect(ctx, px, py, 1, p.h, '#202644'); // 高光

            // 变压器箱体 (经典工业细节)
            if (p.h > 85) {
                drawPixelRect(ctx, px - 4, py + 15, 5, 8, '#141830');
                drawPixelRect(ctx, px - 3, py + 16, 3, 6, '#0f1224');
                // 变压器上的小红点工作指示灯
                drawPixelRect(ctx, px - 2, py + 18, 1, 1, PALETTE.neonMagenta);
            }

            // 顶部的 T 型架或横木
            if (p.crossarms) {
                // 上排横梁
                drawPixelRect(ctx, px - 8, py + 4, 17, 2, '#0f1224');
                // 两个白色的小瓷瓶绝缘子
                drawPixelRect(ctx, px - 6, py + 2, 2, 2, '#ffffff');
                drawPixelRect(ctx, px + 5, py + 2, 2, 2, '#ffffff');
                
                // 下排横梁
                drawPixelRect(ctx, px - 6, py + 10, 13, 2, '#0f1224');
                drawPixelRect(ctx, px - 4, py + 8, 2, 2, '#ffffff');
                drawPixelRect(ctx, px + 3, py + 8, 2, 2, '#ffffff');
            } else {
                // 单个十字梁
                drawPixelRect(ctx, px - 10, py + 6, 21, 2, '#0f1224');
                drawPixelRect(ctx, px - 8, py + 4, 2, 2, '#ffffff');
                drawPixelRect(ctx, px + 6, py + 4, 2, 2, '#ffffff');
            }
        }
        ctx.restore();
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
