/**
 * CYBER_CORE: NEON RUN - Pure Vanilla HTML5 Canvas Procedural Pixel-Art Engine
 * Optimized structural modularity mimicking professional indie game frameworks.
 */

// --- ENUM CONFIGURATIONS & GAME STATE CONSTANTS ---
const STATES = { START: 0, RUNNING: 1, GAMEOVER: 2 };
const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;
const FLOOR_Y = 225;

// 温暖黄昏、红棕建筑与霓虹广告牌调色板
const PALETTE = {
    skyTop: '#1a0c18',      // 极深红紫（夜空顶部）
    skyMid: '#401824',      // 温暖暗红（过渡带）
    skyBot: '#e65c00',      // 温暖落日橙（地平线）
    sunGlow: '#ff7700',     // 橙色光晕
    sunCore: '#ffcc00',     // 金黄太阳核心
    neonCyan: '#00f3ff',    // 冰蓝霓虹（用于静态灯光）
    neonMagenta: '#ff007f', // 霓虹粉红（广告牌闪烁）
    neonGold: '#ffaa00',    // 金橙霓虹（广告牌闪烁）
    cityDark: '#261216',    // 远景暗红棕（阳光阴影色）
    cityMid: '#381a1f',     // 中景中红棕
    cityFore: '#4a2228'     // 近景深红棕
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
        // 温暖色调的云彩
        this.clouds = [
            { x: 30,  y: 20, w: 90,  h: 12, speed: 0.03, alpha: 0.15, color: '#e65c00' },
            { x: 160, y: 45, w: 140, h: 18, speed: 0.015, alpha: 0.20, color: '#401824' },
            { x: 280, y: 15, w: 100, h: 10, speed: 0.04, alpha: 0.12, color: '#ffaa00' },
            { x: 400, y: 35, w: 120, h: 15, speed: 0.02, alpha: 0.18, color: '#401824' }
        ];
        
        this.rand = new SeededRandom(789);
        this.bgBuildings = [];
        this.midBuildings = [];
        this.utilityPoles = []; // 前景电线杆
        
        // 动态生成的工厂烟雾粒子
        this.smokeParticles = [];
        
        this.generateParallaxSectors();
    }

    generateParallaxSectors() {
        // 1. 远景高耸大楼（保持纯红棕色静态剪影，偶尔有静态细微灯光）
        let curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 20 + this.rand.next() * 25;
            let h = 70 + this.rand.next() * 80; 
            this.bgBuildings.push({ 
                x: curX, 
                w: w, 
                h: h, 
                seed: this.rand.next(),
                hasSpire: this.rand.next() > 0.5 
            });
            curX += w + 4;
        }

        // 2. 中景不规则建筑（加入烟囱、工厂和静态霓虹装饰）
        curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 45 + this.rand.next() * 40; 
            let h = 70 + this.rand.next() * 50; 
            let isFactory = this.rand.next() > 0.7; // 30% 概率是带有烟囱的工厂
            
            this.midBuildings.push({
                x: curX, 
                w: w, 
                h: h, 
                seed: this.rand.next(),
                isFactory: isFactory,
                neonColor: this.rand.next() > 0.5 ? PALETTE.neonMagenta : PALETTE.neonGold,
                // 建筑类型：0=阶梯大楼, 1=普通方形, 2=带烟囱工厂, 3=带天桥
                buildingType: isFactory ? 2 : Math.floor(this.rand.next() * 3),
                boardW: 10 + Math.floor(this.rand.next() * 10),
                boardH: 25 + Math.floor(this.rand.next() * 20),
                boardYOffset: 15 + Math.floor(this.rand.next() * 20),
                blinkSpeed: 0.8 + this.rand.next() * 1.0  // 只有广告牌闪烁的速度
            });
            curX += w + 15; 
        }

        // 3. 前景电线杆
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
        
        // 缓慢的云朵飘动
        for (let c of this.clouds) {
            c.x -= c.speed * baseSpeed * dt * 30;
            if (c.x + c.w < -20) c.x = GAME_WIDTH + 50;
        }
        
        // 远景大楼移动
        for (let b of this.bgBuildings) {
            b.x -= 0.06 * baseSpeed * dt * 60;
            if (b.x + b.w < 0) b.x += GAME_WIDTH + 200;
        }
        
        // 中景大楼与工厂移动
        for (let b of this.midBuildings) {
            b.x -= 0.22 * baseSpeed * dt * 60;
            if (b.x + b.w < 0) b.x += GAME_WIDTH + 200;

            // 如果是工厂，在移动时往空气中产生烟雾
            if (b.isFactory && Math.random() < 0.03 * dt * 60) {
                const chimneyX = b.x + b.w * 0.75;
                const chimneyY = FLOOR_Y - b.h - 15; // 烟囱口位置
                this.smokeParticles.push({
                    x: chimneyX,
                    y: chimneyY,
                    vx: -1.0 - Math.random() * 0.5, // 往后飘
                    vy: -0.3 - Math.random() * 0.3, // 往上飘
                    size: 2 + Math.random() * 4,
                    alpha: 0.4,
                    life: 1.0 // 寿命
                });
            }
        }

        // 更新烟雾粒子
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            let p = this.smokeParticles[i];
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.size += 0.1 * dt * 60; // 烟雾慢慢扩散变大
            p.alpha -= 0.01 * dt * 60; // 慢慢淡出
            p.life -= 0.015 * dt * 60;
            if (p.life <= 0 || p.alpha <= 0) {
                this.smokeParticles.splice(i, 1);
            }
        }

        // 前景电线杆移动
        for (let p of this.utilityPoles) {
            p.x -= 4.2 * speedMultiplier * dt * 60;
            if (p.x < -50) {
                p.x = GAME_WIDTH + 50 + Math.random() * 100;
                p.h = 75 + Math.random() * 20;
            }
        }
    }

    drawSky(ctx) {
        // 1. 温暖的黄昏暖橙色调渐变天空
        let skyGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
        skyGrad.addColorStop(0, PALETTE.skyTop);    // 顶部极深红紫
        skyGrad.addColorStop(0.5, PALETTE.skyMid);   // 中部温暖暗红
        skyGrad.addColorStop(0.85, PALETTE.skyBot);  // 地平线温暖落日橙
        skyGrad.addColorStop(1, '#ff8000');         // 最底部亮橙色
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, FLOOR_Y);

        // 2. 温暖落日（金黄核心与暖橙光晕）
        let sunX = GAME_WIDTH / 2; 
        let sunY = FLOOR_Y - 35;   
        let sunRadius = 35;        

        ctx.save();
        ctx.globalAlpha = 0.15;
        let bloomGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, sunRadius + 25);
        bloomGrad.addColorStop(0, PALETTE.sunGlow);
        bloomGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bloomGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius + 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 太阳本体
        ctx.save();
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.clip();

        let sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, PALETTE.sunCore); 
        sunGrad.addColorStop(1, '#ff4500'); // 融入烈火橙

        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunX - sunRadius, sunY - sunRadius, sunRadius * 2, sunRadius * 2);

        // 网格切空
        ctx.fillStyle = skyGrad; 
        for (let y = sunY - 5; y < sunY + sunRadius; y += 6) {
            let currentBarWidth = Math.floor((y - (sunY - 5)) / 4.5) + 1;
            ctx.fillRect(sunX - sunRadius, y, sunRadius * 2, currentBarWidth);
        }
        ctx.restore();

        // 3. 温暖调云彩
        ctx.save();
        for (let c of this.clouds) {
            const cx = Math.floor(c.x);
            const cy = Math.floor(c.y);
            
            ctx.globalAlpha = c.alpha;
            let cloudGrad = ctx.createLinearGradient(cx, cy, cx, cy + c.h);
            cloudGrad.addColorStop(0, c.color);
            cloudGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = cloudGrad;
            
            ctx.beginPath();
            ctx.arc(cx + c.w * 0.2, cy + c.h * 0.5, c.h * 0.5, 0, Math.PI * 2);
            ctx.arc(cx + c.w * 0.5, cy + c.h * 0.4, c.h * 0.7, 0, Math.PI * 2);
            ctx.arc(cx + c.w * 0.8, cy + c.h * 0.6, c.h * 0.5, 0, Math.PI * 2);
            ctx.rect(cx + c.w * 0.2, cy, c.w * 0.6, c.h);
            ctx.closePath();
            ctx.fill();

            // 温暖的高光边缘
            ctx.globalAlpha = c.alpha * 1.3;
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(cx + c.w * 0.25, cy + c.h - 1.5, c.w * 0.5, 1);
        }
        ctx.restore();
    }

    drawCity(ctx) {
        const time = Date.now() * 0.003; 

        // 1. 远景高耸建筑（沉稳暗红棕色，无任何闪烁，营造静态纵深）
        ctx.fillStyle = PALETTE.cityDark; 
        for (let b of this.bgBuildings) {
            let bY = FLOOR_Y - b.h;
            ctx.fillRect(Math.floor(b.x), Math.floor(bY), Math.floor(b.w), Math.floor(b.h));
            
            // 静态的微弱天线针，不闪烁
            if (b.hasSpire) {
                ctx.fillStyle = '#201014';
                ctx.fillRect(Math.floor(b.x + b.w / 2), Math.floor(bY - 10), 1, 10);
                ctx.fillStyle = '#a83232'; // 极暗的红色指示灯
                ctx.fillRect(Math.floor(b.x + b.w / 2), Math.floor(bY - 11), 1, 1);
            }
        }

        // 2. 中景不规则、红棕阴影色大楼与工厂
        for (let b of this.midBuildings) {
            const bx = Math.floor(b.x);
            const bw = Math.floor(b.w);
            const bh = Math.floor(b.h);
            const bY = Math.floor(FLOOR_Y - bh);
            
            // 建筑暗部红棕色渐变
            let bGrad = ctx.createLinearGradient(bx, bY, bx, FLOOR_Y);
            bGrad.addColorStop(0, PALETTE.cityMid); 
            bGrad.addColorStop(1, PALETTE.cityDark); 
            ctx.fillStyle = bGrad;

            // 绘制主体
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(bx, FLOOR_Y);
            
            if (b.buildingType === 0) {
                // 阶梯式叠落大楼
                ctx.lineTo(bx, bY + bh * 0.35);
                ctx.lineTo(bx + 8, bY + bh * 0.35); 
                ctx.lineTo(bx + 8, bY);
                ctx.lineTo(bx + bw - 8, bY);
                ctx.lineTo(bx + bw - 8, bY + bh * 0.45);
                ctx.lineTo(bx + bw, bY + bh * 0.45);
            } else if (b.buildingType === 2) {
                // 工厂造型：左侧是扁平厂房，右侧伸出一根细长管道烟囱
                ctx.lineTo(bx, bY + 15);
                ctx.lineTo(bx + bw * 0.65, bY + 15);
                // 绘制高耸的烟囱
                ctx.lineTo(bx + bw * 0.65, bY - 15);
                ctx.lineTo(bx + bw * 0.85, bY - 15);
                ctx.lineTo(bx + bw * 0.85, bY + 15);
                ctx.lineTo(bx + bw, bY + 15);
            } else if (b.buildingType === 3) {
                // 倾斜切割型高楼
                ctx.lineTo(bx, bY + 20);
                ctx.lineTo(bx + bw * 0.7, bY);
                ctx.lineTo(bx + bw, bY + 12);
            } else {
                ctx.lineTo(bx, bY);
                ctx.lineTo(bx + bw, bY);
            }

            ctx.lineTo(bx + bw, FLOOR_Y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // 绘制工厂烟囱的警示红环
            if (b.buildingType === 2) {
                ctx.fillStyle = '#ff3300';
                ctx.fillRect(bx + bw * 0.65, bY - 10, Math.floor(bw * 0.2), 3);
            }

            // --- 2.1 静态窗户（只使用固定算法，不随时间闪烁，画面更静态） ---
            let winSeed = b.seed;
            for (let wx = bx + 6; wx < bx + bw - 6; wx += 8) {
                for (let wy = bY + 18; wy < FLOOR_Y - 10; wy += 14) {
                    winSeed = (winSeed * 37 + 23) % 100;
                    if (winSeed > 70) {
                        // 静态透光：温暖的暗金色和少许红橙色
                        ctx.fillStyle = winSeed > 88 ? '#ffd080' : '#d45500';
                        ctx.fillRect(Math.floor(wx), Math.floor(wy), 2, 3);
                    }
                }
            }

            // --- 2.2 霓虹大楼轮廓（完全静态常亮，不闪烁） ---
            if (b.seed > 0.6 && b.buildingType !== 2) {
                ctx.strokeStyle = PALETTE.neonCyan;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.35; // 淡淡的常亮边缘发光
                ctx.beginPath();
                ctx.moveTo(bx + 2, FLOOR_Y);
                ctx.lineTo(bx + 2, bY + 2);
                ctx.lineTo(bx + bw - 2, bY + 2);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }

            // --- 2.3 动态霓虹广告牌（允许闪烁，作为画面中唯一动感细节） ---
            const isBlinking = Math.sin(time * b.blinkSpeed) > -0.3; 
            if (isBlinking && (b.buildingType === 0 || b.buildingType === 3)) {
                ctx.save();
                const neonColor = b.neonColor;
                ctx.shadowColor = neonColor;
                ctx.shadowBlur = 2;

                let boardX = bx - 3; // 挂载在左侧
                let boardY = bY + b.boardYOffset;
                
                ctx.shadowBlur = 0;
                drawPixelRect(ctx, boardX, boardY, b.boardW, b.boardH, '#15080b');
                
                ctx.strokeStyle = neonColor;
                ctx.lineWidth = 1;
                ctx.strokeRect(boardX + 1, boardY + 1, b.boardW - 2, b.boardH - 2);

                ctx.fillStyle = neonColor;
                ctx.shadowColor = neonColor;
                ctx.shadowBlur = 1.5;
                for (let cy = boardY + 3; cy < boardY + b.boardH - 4; cy += 4) {
                    if (Math.sin(cy + time * 1.5) > -0.2) {
                        ctx.fillRect(boardX + 2.5, cy, b.boardW - 5, 1);
                    }
                }
                ctx.restore();
            }
        }

        // 3. 绘制从工厂烟囱中飘出的烟雾粒子
        this.drawSmoke(ctx);
    }

    drawSmoke(ctx) {
        ctx.save();
        for (let p of this.smokeParticles) {
            ctx.fillStyle = '#ffaa66'; // 带有一点落日橙光反射的灰色烟雾
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawForegroundGrid(ctx, worldX) {
        // 1. 地板暗部（暖红黑色调）
        drawPixelRect(ctx, 0, FLOOR_Y, GAME_WIDTH, 4, '#1a0c10');
        drawPixelRect(ctx, 0, FLOOR_Y + 4, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y, '#0d0508');

        // 2. 透视网格线
        ctx.strokeStyle = '#261216';
        ctx.lineWidth = 1;
        let spacing = 18;
        let offset = (worldX * 1.5) % spacing;

        ctx.beginPath();
        for (let x = -offset; x < GAME_WIDTH; x += spacing) {
            ctx.moveTo(Math.floor(x), FLOOR_Y + 4);
            ctx.lineTo(Math.floor(x), GAME_HEIGHT);
        }
        ctx.stroke();

        // 3. 跑道边缘发光霓虹线（橙红霞光配色）
        ctx.strokeStyle = '#ff5500';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, FLOOR_Y + 4);
        ctx.lineTo(GAME_WIDTH, FLOOR_Y + 4);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // 4. 绘制前景电线杆
        this.drawUtilityPoles(ctx);
    }

    drawUtilityPoles(ctx) {
        ctx.save();
        ctx.strokeStyle = '#0a0304';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.75;
        
        for (let i = 0; i < this.utilityPoles.length - 1; i++) {
            let p1 = this.utilityPoles[i];
            let p2 = this.utilityPoles[i + 1];
            
            if (p2.x - p1.x < 300) {
                let y1 = FLOOR_Y - p1.h + 5;
                let y2 = FLOOR_Y - p2.h + 5;
                ctx.beginPath();
                ctx.moveTo(p1.x, y1);
                ctx.quadraticCurveTo((p1.x + p2.x) / 2, Math.max(y1, y2) + 12, p2.x, y2);
                ctx.stroke();
            }
        }

        for (let p of this.utilityPoles) {
            const px = Math.floor(p.x);
            const py = Math.floor(FLOOR_Y - p.h);
            
            drawPixelRect(ctx, px - 1, py, 3, p.h, '#14070a');
            drawPixelRect(ctx, px, py, 1, p.h, '#261216'); 

            if (p.h > 85) {
                drawPixelRect(ctx, px - 4, py + 15, 5, 8, '#1a0c10');
                drawPixelRect(ctx, px - 3, py + 16, 3, 6, '#14070a');
                drawPixelRect(ctx, px - 2, py + 18, 1, 1, '#ff5500');
            }

            if (p.crossarms) {
                drawPixelRect(ctx, px - 8, py + 4, 17, 2, '#14070a');
                drawPixelRect(ctx, px - 6, py + 2, 2, 2, '#ffffff');
                drawPixelRect(ctx, px + 5, py + 2, 2, 2, '#ffffff');
                
                drawPixelRect(ctx, px - 6, py + 10, 13, 2, '#14070a');
                drawPixelRect(ctx, px - 4, py + 8, 2, 2, '#ffffff');
                drawPixelRect(ctx, px + 3, py + 8, 2, 2, '#ffffff');
            } else {
                drawPixelRect(ctx, px - 10, py + 6, 21, 2, '#14070a');
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
