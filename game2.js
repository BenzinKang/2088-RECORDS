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
        // 暖色调、写实风云彩
        this.clouds = [
            { x: 30,  y: 12, w: 110, h: 14, speed: 0.02, alpha: 0.18, color: '#ff6a00' },
            { x: 190, y: 30, w: 160, h: 22, speed: 0.01, alpha: 0.22, color: '#b33600' },
            { x: 340, y: 8,  w: 120, h: 12, speed: 0.03, alpha: 0.15, color: '#ffaa00' },
            { x: 480, y: 25, w: 140, h: 18, speed: 0.015, alpha: 0.20, color: '#b33600' }
        ];
        
        this.rand = new SeededRandom(789);
        this.bgBuildings = [];
        this.midBuildings = [];
        this.utilityPoles = []; // 前景电线杆
        this.smokeParticles = []; // 工厂烟雾粒子
        this.factories = []; // 远景独立工厂
        
        this.generateParallaxSectors();
    }

    generateParallaxSectors() {
        // 1. 远景高耸大楼（变细、变密，突出林立感）
        let curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 12 + this.rand.next() * 14; 
            let h = 50 + this.rand.next() * 55; 
            this.bgBuildings.push({ 
                x: curX, 
                w: w, 
                h: h, 
                seed: this.rand.next(),
                hasSpire: this.rand.next() > 0.4 // 拥有避雷针的概率提高
            });
            curX += w + 8; // 间距更紧密
        }

        // 2. 远景独立工厂
        let factX = 80;
        while (factX < GAME_WIDTH + 300) {
            this.factories.push({
                x: factX,
                w: 60 + this.rand.next() * 30,  
                h: 20 + this.rand.next() * 12,  
                chimneyH1: 35 + this.rand.next() * 15, 
                chimneyH2: 45 + this.rand.next() * 15, 
                seed: this.rand.next()
            });
            factX += 280 + this.rand.next() * 150; 
        }

        // 3. 中景多元化写字楼群
        curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 24 + this.rand.next() * 18; 
            let h = 40 + this.rand.next() * 38; 
            
            this.midBuildings.push({
                x: curX, 
                w: w, 
                h: h, 
                seed: this.rand.next(),
                neonColor: this.rand.next() > 0.5 ? PALETTE.neonMagenta : PALETTE.neonGold,
                buildingType: Math.floor(this.rand.next() * 4),
                antennaType: Math.floor(this.rand.next() * 4),
                boardW: 6 + Math.floor(this.rand.next() * 6), 
                boardH: 15 + Math.floor(this.rand.next() * 12),
                boardYOffset: 6 + Math.floor(this.rand.next() * 12),
                blinkSpeed: 0.8 + this.rand.next() * 1.0
            });
            curX += w + 22; 
        }

        // 4. 前景电线杆
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
            if (c.x + c.w < -60) c.x = GAME_WIDTH + 60;
        }
        
        // 远景大楼移动
        for (let b of this.bgBuildings) {
            b.x -= 0.05 * baseSpeed * dt * 60;
            if (b.x + b.w < 0) b.x += GAME_WIDTH + 200;
        }

        // 远景独立工厂移动
        for (let f of this.factories) {
            f.x -= 0.09 * baseSpeed * dt * 60;
            if (f.x + f.w < 0) f.x += GAME_WIDTH + 300;

            // 烟雾产生
            if (Math.random() < 0.05 * dt * 60) {
                const chimney1X = f.x + f.w * 0.35;
                const chimney1Y = FLOOR_Y - f.chimneyH1;
                const chimney2X = f.x + f.w * 0.7;
                const chimney2Y = FLOOR_Y - f.chimneyH2;
                let tx = Math.random() > 0.5 ? chimney1X : chimney2X;
                let ty = Math.random() > 0.5 ? chimney1Y : chimney2Y;

                this.smokeParticles.push({
                    x: tx,
                    y: ty,
                    vx: -0.8 - Math.random() * 0.4, 
                    vy: -0.3 - Math.random() * 0.3, 
                    size: 1 + Math.random() * 2,    
                    alpha: 0.3,
                    life: 1.0
                });
            }
        }
        
        // 中景大楼移动
        for (let b of this.midBuildings) {
            b.x -= 0.22 * baseSpeed * dt * 60;
            if (b.x + b.w < 0) b.x += GAME_WIDTH + 200;
        }

        // 烟雾粒子物理更新
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            let p = this.smokeParticles[i];
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.size += 0.05 * dt * 60; 
            p.alpha -= 0.01 * dt * 60; 
            p.life -= 0.012 * dt * 60;
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
        // 1. 温暖的红橙色天顶渐变
        let skyGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
        skyGrad.addColorStop(0, '#591a0c');    
        skyGrad.addColorStop(0.45, '#a1350d');  
        skyGrad.addColorStop(0.8, '#e65c00');   
        skyGrad.addColorStop(1, '#ff8c1a');     
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, FLOOR_Y);

        // 2. 震撼超大夕阳
        let sunX = GAME_WIDTH / 2; 
        let sunY = FLOOR_Y - 5; 
        let sunRadius = 75;     

        ctx.save();
        ctx.globalAlpha = 0.25;
        let bloomGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunRadius + 50);
        bloomGrad.addColorStop(0, '#ff7700');
        bloomGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bloomGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius + 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // === 用一个独立的 save 块把太阳裁剪彻底隔离 ===
        ctx.save(); 
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.clip(); 

        let sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#ffd11a'); 
        sunGrad.addColorStop(0.7, '#ff5500'); 
        sunGrad.addColorStop(1, '#991f00');   

        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunX - sunRadius, sunY - sunRadius, sunRadius * 2, sunRadius * 2);

        // 太阳网格切线
        ctx.fillStyle = skyGrad; 
        for (let y = sunY - sunRadius + 15; y < sunY + sunRadius; y += 7) {
            let currentBarWidth = Math.floor((y - (sunY - sunRadius + 15)) / 7) + 1;
            ctx.fillRect(sunX - sunRadius - 10, y, sunRadius * 2 + 20, currentBarWidth);
        }
        ctx.restore(); 

        // 3. 不规则写实叠云
        ctx.save();
        for (let c of this.clouds) {
            const cx = Math.floor(c.x);
            const cy = Math.floor(c.y);
            const cw = c.w;
            const ch = c.h;
            
            ctx.globalAlpha = c.alpha;
            let cloudGrad = ctx.createLinearGradient(cx, cy, cx, cy + ch);
            cloudGrad.addColorStop(0, c.color);
            cloudGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = cloudGrad;

            ctx.beginPath();
            ctx.arc(cx + cw * 0.15, cy + ch * 0.6, ch * 0.45, 0, Math.PI * 2);
            ctx.arc(cx + cw * 0.38, cy + ch * 0.35, ch * 0.75, 0, Math.PI * 2);
            ctx.arc(cx + cw * 0.65, cy + ch * 0.5, ch * 0.6, 0, Math.PI * 2);
            ctx.arc(cx + cw * 0.88, cy + ch * 0.7, ch * 0.3, 0, Math.PI * 2);
            ctx.rect(cx + cw * 0.15, cy + ch * 0.2, cw * 0.7, ch * 0.8);
            ctx.closePath();
            ctx.fill();

            // 亮边高光
            ctx.globalAlpha = c.alpha * 1.5;
            ctx.fillStyle = '#ffb366';
            ctx.fillRect(cx + cw * 0.2, cy + ch - 1, cw * 0.55, 1);
        }
        ctx.restore();
    }

    drawCity(ctx) {
        const time = Date.now() * 0.003; 

        // 1. 远景窄楼
        ctx.fillStyle = '#0a0b10'; 
        for (let b of this.bgBuildings) {
            let bx = Math.floor(b.x);
            let bw = Math.floor(b.w);
            let bh = Math.floor(b.h);
            let bY = FLOOR_Y - bh;

            let landmarkType = Math.floor((b.seed * 100) % 4);

            ctx.save();
            ctx.beginPath(); 
            ctx.moveTo(bx, FLOOR_Y);

            if (landmarkType === 1) {
                // 1. 仿东方明珠/信号发射塔式
                ctx.lineTo(bx + bw * 0.4, bY + bh * 0.5);
                ctx.lineTo(bx + bw * 0.4, bY); 
                ctx.lineTo(bx + bw * 0.6, bY);
                ctx.lineTo(bx + bw * 0.6, bY + bh * 0.5);
                ctx.lineTo(bx + bw, FLOOR_Y);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.arc(bx + bw * 0.5, bY + bh * 0.25, bw * 0.4, 0, Math.PI * 2); 
                ctx.arc(bx + bw * 0.5, bY + bh * 0.5, bw * 0.5, 0, Math.PI * 2); 
                ctx.closePath();
                ctx.fill();
            } 
            else if (landmarkType === 2) {
                // 2. 流线渐进收缩顶
                ctx.lineTo(bx, bY + bh * 0.6);
                ctx.bezierCurveTo(bx + bw * 0.1, bY + bh * 0.3, bx + bw * 0.2, bY + bh * 0.1, bx + bw * 0.5, bY);
                ctx.bezierCurveTo(bx + bw * 0.8, bY + bh * 0.1, bx + bw * 0.9, bY + bh * 0.3, bx + bw, FLOOR_Y);
                ctx.closePath();
                ctx.fill();
            }
            else if (landmarkType === 3) {
                // 3. 科技切角斜顶
                ctx.lineTo(bx, bY + bh * 0.2);
                ctx.lineTo(bx + bw * 0.7, bY);
                ctx.lineTo(bx + bw, bY + bh * 0.1);
                ctx.lineTo(bx + bw, FLOOR_Y);
                ctx.closePath();
                ctx.fill();
            }
            else {
                // 0. 传统阶梯对称式
                ctx.lineTo(bx, bY + bh * 0.3);
                ctx.lineTo(bx + bw * 0.2, bY + bh * 0.3);
                ctx.lineTo(bx + bw * 0.2, bY + bh * 0.1);
                ctx.lineTo(bx + bw * 0.4, bY + bh * 0.1);
                ctx.lineTo(bx + bw * 0.4, bY);
                ctx.lineTo(bx + bw * 0.6, bY);
                ctx.lineTo(bx + bw * 0.6, bY + bh * 0.1);
                ctx.lineTo(bx + bw * 0.8, bY + bh * 0.1);
                ctx.lineTo(bx + bw * 0.8, bY + bh * 0.3);
                ctx.lineTo(bx + bw, bY + bh * 0.3);
                ctx.lineTo(bx + bw, FLOOR_Y);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore(); 
            
            // 远景极细避雷针与航空灯
            if (b.hasSpire) {
                ctx.save();
                ctx.fillStyle = '#050508';
                ctx.fillRect(Math.floor(bx + bw / 2), Math.floor(bY - 10), 1, 10);
                ctx.fillStyle = '#ff1100'; 
                ctx.fillRect(Math.floor(bx + bw / 2), Math.floor(bY - 11), 1, 1);
                ctx.restore();
            }
        }

        // 2. 独立远景工厂与烟囱
        ctx.fillStyle = '#2e1613'; 
        for (let f of this.factories) {
            let fx = Math.floor(f.x);
            let fw = Math.floor(f.w);
            let fh = Math.floor(f.h);
            let fY = FLOOR_Y - fh;

            ctx.beginPath();
            ctx.moveTo(fx, FLOOR_Y);
            ctx.lineTo(fx, fY);
            ctx.lineTo(fx + fw * 0.2, fY - 5);
            ctx.lineTo(fx + fw * 0.4, fY);
            ctx.lineTo(fx + fw * 0.6, fY - 5);
            ctx.lineTo(fx + fw * 0.8, fY);
            ctx.lineTo(fx + fw, fY);
            ctx.lineTo(fx + fw, FLOOR_Y);
            ctx.fill();

            // 烟囱1
            let c1W = 4;
            let c1X = Math.floor(fx + fw * 0.35 - c1W / 2);
            ctx.fillRect(c1X, FLOOR_Y - f.chimneyH1, c1W, f.chimneyH1);
            ctx.fillStyle = '#9c2417';
            ctx.fillRect(c1X, FLOOR_Y - f.chimneyH1 + 4, c1W, 3);
            ctx.fillStyle = '#2e1613';

            // 烟囱2
            let c2W = 3;
            let c2X = Math.floor(fx + fw * 0.7 - c2W / 2);
            ctx.fillRect(c2X, FLOOR_Y - f.chimneyH2, c2W, f.chimneyH2);
            ctx.fillStyle = '#9c2417';
            ctx.fillRect(c2X, FLOOR_Y - f.chimneyH2 + 3, c2W, 2);
            ctx.fillStyle = '#2e1613';
        }

        // 3. 中景多元化现代写字楼群
        for (let b of this.midBuildings) {
            const bx = Math.floor(b.x);
            const bw = Math.floor(b.w);
            const bh = Math.floor(b.h);
            const bY = Math.floor(FLOOR_Y - bh);
            
            let bGrad = ctx.createLinearGradient(bx, bY, bx, FLOOR_Y);
            bGrad.addColorStop(0, '#3d1b16'); 
            bGrad.addColorStop(1, '#24100d'); 
            ctx.fillStyle = bGrad;

            // --- 3.1 绘制写字楼屋顶形状 ---
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(bx, FLOOR_Y);
            
            if (b.buildingType === 0) {
                ctx.lineTo(bx, bY + bh * 0.4);
                ctx.lineTo(bx + bw * 0.2, bY + bh * 0.4);
                ctx.lineTo(bx + bw * 0.2, bY + bh * 0.2);
                ctx.lineTo(bx + bw * 0.35, bY + bh * 0.2);
                ctx.lineTo(bx + bw * 0.35, bY);
                ctx.lineTo(bx + bw * 0.65, bY);
                ctx.lineTo(bx + bw * 0.65, bY + bh * 0.2);
                ctx.lineTo(bx + bw * 0.8, bY + bh * 0.2);
                ctx.lineTo(bx + bw * 0.8, bY + bh * 0.4);
                ctx.lineTo(bx + bw, bY + bh * 0.4);
            } else if (b.buildingType === 1) {
                ctx.lineTo(bx, bY + 12);
                ctx.lineTo(bx + bw * 0.15, bY);
                ctx.lineTo(bx + bw * 0.85, bY);
                ctx.lineTo(bx + bw, bY + 12);
            } else if (b.buildingType === 2) {
                ctx.lineTo(bx, bY + 18);
                ctx.lineTo(bx + bw * 0.6, bY);
                ctx.lineTo(bx + bw, bY + 4);
            } else if (b.buildingType === 3) {
                ctx.lineTo(bx, bY);
                ctx.lineTo(bx + bw * 0.35, bY);
                ctx.lineTo(bx + bw * 0.35, bY + 12); 
                ctx.lineTo(bx + bw * 0.65, bY + 12);
                ctx.lineTo(bx + bw * 0.65, bY);
                ctx.lineTo(bx + bw, bY);
            }

            ctx.lineTo(bx + bw, FLOOR_Y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // 标志性“镂空圆孔”
            if (b.buildingType === 1) {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out'; 
                ctx.beginPath();
                ctx.arc(bx + bw * 0.5, bY + 8, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // --- 3.2 绘制大楼顶部的天线与避雷针设备 ---
            ctx.save();
            ctx.strokeStyle = '#1f0d0b';
            ctx.lineWidth = 1;
            
            if (b.antennaType === 1) {
                let ax = Math.floor(bx + bw * 0.5);
                ctx.beginPath();
                ctx.moveTo(ax, bY);
                ctx.lineTo(ax, bY - 14);
                ctx.stroke();
                ctx.fillStyle = '#ff3300';
                ctx.fillRect(ax, bY - 15, 1, 1);
            } else if (b.antennaType === 2) {
                let ax1 = Math.floor(bx + bw * 0.25);
                let ax2 = Math.floor(bx + bw * 0.75);
                ctx.beginPath();
                ctx.moveTo(ax1, bY); ctx.lineTo(ax1, bY - 10);
                ctx.moveTo(ax2, bY); ctx.lineTo(ax2, bY - 10);
                ctx.stroke();
            } else if (b.antennaType === 3) {
                ctx.fillStyle = '#1f0d0b';
                ctx.beginPath();
                ctx.arc(bx + bw * 0.5, bY - 3, 4, Math.PI, 0); 
                ctx.stroke();
                ctx.fillRect(Math.floor(bx + bw * 0.5) - 0.5, bY - 3, 1, 3); 
            }
            ctx.restore();

            // --- 3.3 静态密集的摩天楼窗格 ---
            let winSeed = b.seed;
            for (let wx = bx + 4; wx < bx + bw - 4; wx += 6) { 
                for (let wy = bY + 16; wy < FLOOR_Y - 8; wy += 11) {
                    winSeed = (winSeed * 37 + 23) % 100;
                    if (winSeed > 72) {
                        ctx.fillStyle = winSeed > 90 ? '#ffd599' : '#b84a00';
                        ctx.fillRect(Math.floor(wx), Math.floor(wy), 1.2, 2);
                    }
                }
            }

            // --- 3.4 动态霓虹广告牌 ---
            const isBlinking = Math.sin(time * b.blinkSpeed) > -0.3; 
            if (isBlinking && (b.buildingType === 0 || b.buildingType === 3)) {
                ctx.save();
                const neonColor = b.neonColor;
                ctx.shadowColor = neonColor;
                ctx.shadowBlur = 1.5;

                let boardX = bx - 2; 
                let boardY = bY + b.boardYOffset;
                
                ctx.shadowBlur = 0;
                drawPixelRect(ctx, boardX, boardY, b.boardW, b.boardH, '#1c0a0c');
                
                ctx.strokeStyle = neonColor;
                ctx.lineWidth = 1;
                ctx.strokeRect(boardX + 0.5, boardY + 0.5, b.boardW - 1, b.boardH - 1);

                ctx.fillStyle = neonColor;
                ctx.shadowColor = neonColor;
                ctx.shadowBlur = 1;
                for (let cy = boardY + 2; cy < boardY + b.boardH - 3; cy += 3) {
                    if (Math.sin(cy + time * 1.5) > -0.2) {
                        ctx.fillRect(boardX + 1.5, cy, b.boardW - 3, 1);
                    }
                }
                ctx.restore();
            }
        }

        // 4. 绘制远方工厂冒出的烟雾
        this.drawSmoke(ctx);
    }

    drawSmoke(ctx) {
        ctx.save();
        for (let p of this.smokeParticles) {
            ctx.fillStyle = '#ffa366'; 
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawForegroundGrid(ctx, worldX) {
        drawPixelRect(ctx,
