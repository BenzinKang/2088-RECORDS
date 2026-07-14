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
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
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
        // 1. 远景高耸大楼
        let curX = -50;
        while (curX < GAME_WIDTH + 200) {
            let w = 12 + this.rand.next() * 14; 
            let h = 50 + this.rand.next() * 55; 
            this.bgBuildings.push({ 
                x: curX, 
                w: w, 
                h: h, 
                seed: this.rand.next(),
                hasSpire: this.rand.next() > 0.4 
            });
            curX += w + 8; 
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
            if (b.x + b.w < -40) b.x += GAME_WIDTH + 200;
        }

        // 远景独立工厂移动
        for (let f of this.factories) {
            f.x -= 0.09 * baseSpeed * dt * 60;
            if (f.x + f.w < -100) f.x += GAME_WIDTH + 300;

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
            if (b.x + b.w < -40) b.x += GAME_WIDTH + 200;
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
                ctx.lineTo(bx, bY + bh * 0.6);
                ctx.bezierCurveTo(bx + bw * 0.1, bY + bh * 0.3, bx + bw * 0.2, bY + bh * 0.1, bx + bw * 0.5, bY);
                ctx.bezierCurveTo(bx + bw * 0.8, bY + bh * 0.1, bx + bw * 0.9, bY + bh * 0.3, bx + bw, FLOOR_Y);
                ctx.closePath();
                ctx.fill();
            }
            else if (landmarkType === 3) {
                ctx.lineTo(bx, bY + bh * 0.2);
                ctx.lineTo(bx + bw * 0.7, bY);
                ctx.lineTo(bx + bw, bY + bh * 0.1);
                ctx.lineTo(bx + bw, FLOOR_Y);
                ctx.closePath();
                ctx.fill();
            }
            else {
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

            let c1W = 4;
            let c1X = Math.floor(fx + fw * 0.35 - c1W / 2);
            ctx.fillRect(c1X, FLOOR_Y - f.chimneyH1, c1W, f.chimneyH1);
            ctx.fillStyle = '#9c2417';
            ctx.fillRect(c1X, FLOOR_Y - f.chimneyH1 + 4, c1W, 3);
            ctx.fillStyle = '#2e1613';

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

            if (b.buildingType === 1) {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out'; 
                ctx.beginPath();
                ctx.arc(bx + bw * 0.5, bY + 8, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

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

            const isBlinking = Math.sin(time * b.blinkSpeed) > -0.3; 
            if (isBlinking && (b.buildingType === 0 || b.buildingType === 3)) {
                ctx.save();
                const neonColor = b.neonColor;

                let boardX = bx - 2; 
                let boardY = bY + b.boardYOffset;
                
                drawPixelRect(ctx, boardX, boardY, b.boardW, b.boardH, '#1c0a0c');
                
                ctx.strokeStyle = neonColor;
                ctx.lineWidth = 1;
                ctx.strokeRect(boardX + 0.5, boardY + 0.5, b.boardW - 1, b.boardH - 1);

                ctx.fillStyle = neonColor;
                for (let cy = boardY + 2; cy < boardY + b.boardH - 3; cy += 3) {
                    if (Math.sin(cy + time * 1.5) > -0.2) {
                        ctx.fillRect(boardX + 1.5, cy, b.boardW - 3, 1);
                    }
                }
                ctx.restore();
            }
        }

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
        drawPixelRect(ctx, 0, FLOOR_Y, GAME_WIDTH, 4, '#1c0d0d');
        drawPixelRect(ctx, 0, FLOOR_Y + 4, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y, '#0d0404');

        ctx.strokeStyle = '#2b1414';
        ctx.lineWidth = 1;
        let spacing = 18;
        let offset = (worldX * 1.5) % spacing;

        ctx.beginPath();
        for (let x = -offset; x < GAME_WIDTH; x += spacing) {
            ctx.moveTo(Math.floor(x), FLOOR_Y + 4);
            ctx.lineTo(Math.floor(x), GAME_HEIGHT);
        }
        ctx.stroke();

        ctx.strokeStyle = '#ff4d00';
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(0, FLOOR_Y + 4);
        ctx.lineTo(GAME_WIDTH, FLOOR_Y + 4);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        this.drawUtilityPoles(ctx);
    }

    drawUtilityPoles(ctx) {
        ctx.save();
        ctx.strokeStyle = '#080202';
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
            
            drawPixelRect(ctx, px - 1, py, 3, p.h, '#140606');
            drawPixelRect(ctx, px, py, 1, p.h, '#2b1414'); 

            if (p.h > 85) {
                drawPixelRect(ctx, px - 4, py + 15, 5, 8, '#1c0d0d');
                drawPixelRect(ctx, px - 3, py + 16, 3, 6, '#140606');
                drawPixelRect(ctx, px - 2, py + 18, 1, 1, '#ff4d00');
            }

            if (p.crossarms) {
                drawPixelRect(ctx, px - 8, py + 4, 17, 2, '#140606');
                drawPixelRect(ctx, px - 6, py + 2, 2, 2, '#ffffff');
                drawPixelRect(ctx, px + 5, py + 2, 2, 2, '#ffffff');
                
                drawPixelRect(ctx, px - 6, py + 10, 13, 2, '#140606');
                drawPixelRect(ctx, px - 4, py + 8, 2, 2, '#ffffff');
                drawPixelRect(ctx, px + 3, py + 8, 2, 2, '#ffffff');
            } else {
                drawPixelRect(ctx, px - 10, py + 6, 21, 2, '#140606');
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
        this.state = 'RUN'; 
    }

    jump() {
        if (this.isGrounded || this.jumpCount < 2) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.jumpCount++;
            this.state = 'JUMP';
            
            for(let i=0; i<8; i++) {
                this.ps.spawn(this.x + 4, this.y + 24, -1 - Math.random()*2, (Math.random()-0.5)*3, 15, PALETTE.neonCyan, 2);
            }
        }
    }

    update(dt) {
        this.animTimer += dt * 12;

        this.vy += this.gravity * dt * 60;
        this.y += this.vy * dt * 60;

        if (this.y >= FLOOR_Y - this.h) {
            this.y = FLOOR_Y - this.h;
            this.vy = 0;
            
            if (!this.isGrounded) {
                this.isGrounded = true;
                this.jumpCount = 0;
                this.state = 'RUN';
                for(let i=0; i<6; i++) {
                    this.ps.spawn(this.x + 10, FLOOR_Y, (Math.random()-0.5)*4, -Math.random()*2, 12, '#8892b0', 2);
                }
            }
        }

        if (this.isGrounded && Math.random() > 0.7) {
            this.ps.spawn(this.x, this.y + 16, -1, -0.5, 10, PALETTE.neonMagenta, 1);
        }
    }

    draw(ctx) {
        const px = Math.floor(this.x);
        const py = Math.floor(this.y);
        
        let legOffset = 0;
        let torsoBounce = 0;
        if (this.isGrounded) {
            legOffset = Math.sin(this.animTimer) * 4;
            torsoBounce = Math.abs(Math.cos(this.animTimer)) * 2;
        } else {
            legOffset = this.vy < 0 ? 3 : -2; 
        }

        ctx.fillStyle = '#0f1224';
        ctx.fillRect(px + 4, py + 18 + torsoBounce, 4, 8);
        ctx.fillStyle = '#1d2242';
        ctx.fillRect(px + 2 + (this.isGrounded ? -legOffset : 2), py + 24, 4, 8);

        ctx.fillStyle = '#2d355a';
        ctx.fillRect(px + 2, py + 6 - torsoBounce, 16, 14);
        ctx.fillStyle = '#414b7e'; 
        ctx.fillRect(px + 4, py + 8 - torsoBounce, 12, 4);

        ctx.fillStyle = '#171a33';
        ctx.fillRect(px + 10, py - torsoBounce, 10, 8);
        ctx.fillStyle = PALETTE.neonCyan;
        ctx.fillRect(px + 16, py + 2 - torsoBounce, 4, 2);

        ctx.fillStyle = '#1d2242';
        ctx.fillRect(px + 12, py + 18 + torsoBounce, 4, 8);
        ctx.fillStyle = '#5260a4';
        ctx.fillRect(px + 10 + (this.isGrounded ? legOffset : -2), py + 24, 5, 8);

        ctx.fillStyle = (Math.floor(this.animTimer) % 2 === 0) ? PALETTE.neonMagenta : '#a30036';
        ctx.fillRect(px + 8, py + 12 - torsoBounce, 4, 4);
    }

    getHitbox() {
        return { x: this.x + 4, y: this.y + 2, w: this.w - 6, h: this.h - 4 };
    }
}

class WorldManager {
    constructor(particleSystem) {
        this.ps = particleSystem;
        this.obstacles = [];
        this.spawnTimer = 0;
    }

    reset() {
        this.obstacles = [];
        this.spawnTimer = 0;
    }

    update(dt, speedMultiplier) {
        this.spawnTimer += dt * 60;
        
        let currentInterval = Math.max(50, 130 - speedMultiplier * 15);
        
        if (this.spawnTimer >= currentInterval) {
            this.spawnTimer = 0;
            this.spawnObstacle();
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let obs = this.obstacles[i];
            obs.x -= 4.2 * speedMultiplier * dt * 60;
            
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
            obs = {
                x: GAME_WIDTH + 20, y: FLOOR_Y - 22, w: 18, h: 22,
                type: 'container', color: '#632512', trim: PALETTE.neonGold
            };
        } else if (randVal < 0.8) {
            obs = {
                x: GAME_WIDTH + 20, y: FLOOR_Y - 36, w: 12, h: 36,
                type: 'barrier', color: '#172540', trim: PALETTE.neonMagenta
            };
        } else {
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
            
            drawPixelRect(ctx, ox, oy, obs.w, obs.h, obs.color);
            
            if (obs.type === 'container') {
                ctx.fillStyle = '#3a180d';
                ctx.fillRect(ox + 2, oy + 2, obs.w - 4, 2);
                ctx.fillRect(ox + 2, oy + obs.h - 4, obs.w - 4, 2);
                ctx.fillStyle = obs.trim;
                ctx.fillRect(ox + 4, oy + 8, 3, 3); 
            } 
            else if (obs.type === 'barrier') {
                ctx.fillStyle = '#0d1626';
                ctx.fillRect(ox + 3, oy, obs.w - 6, obs.h);
                ctx.fillStyle = obs.trim;
                ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.02) * 0.2;
                ctx.fillRect(ox + 5, oy + 4, obs.w - 10, obs.h - 12);
                ctx.globalAlpha = 1.0;
            } 
            else if (obs.type === 'drone') {
                ctx.fillStyle = '#0b0d14';
                ctx.fillRect(ox - 2, oy + 2, 4, 2); 
                ctx.fillRect(ox + obs.w - 2, oy + 2, 4, 2); 
                ctx.fillStyle = obs.trim; 
                ctx.fillRect(ox + Math.floor(obs.w/2) - 1, oy + 4, 2, 2);
            }
        }
    }
}

// ============================================================================
// --- GAME ENGINE CORE CORE / STATE CONTROLLER (补齐部分) ---
// ============================================================================

class GameEngine {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        
        // 游戏核心属性
        this.gameState = STATES.START;
        this.score = 0;
        this.highscore = parseInt(localStorage.getItem("neonrun_highscore")) || 0;
        this.worldX = 0; 
        this.speedMultiplier = 1.0;
        this.lastTime = 0;

        // 初始化子系统
        this.particles = new ParticleSystem();
        this.background = new BackgroundSystem();
        this.player = new Player(this.particles);
        this.world = new WorldManager(this.particles);

        // 获取 HTML UI 元素
        this.ui = {
            hud: document.getElementById("hud"),
            hudScore: document.getElementById("hud-score"),
            hudHighscore: document.getElementById("hud-highscore"),
            startScreen: document.getElementById("screen-start"),
            gameoverScreen: document.getElementById("screen-gameover"),
            finalScore: document.getElementById("final-score"),
            finalHighscore: document.getElementById("final-highscore"),
            btnStart: document.getElementById("btn-start"),
            btnRestart: document.getElementById("btn-restart")
        };

        this.initEvents();
        this.resetUI();
        
        // 启动主循环（在 Start 状态下负责渲染流动的背景）
        requestAnimationFrame((t) => this.loop(t));
    }

    initEvents() {
        // 动作触发（跳跃）
        const handleJump = (e) => {
            if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp') return;
            if (this.gameState === STATES.RUNNING) {
                this.player.jump();
                if (e.cancelable) e.preventDefault();
            }
        };
        window.addEventListener("keydown", handleJump);
        this.canvas.addEventListener("touchstart", handleJump, { passive: false });

        // 按钮监听器
        this.ui.btnStart.addEventListener("click", () => this.startGame());
        this.ui.btnRestart.addEventListener("click", () => this.startGame());
    }

    resetUI() {
        this.ui.hudHighscore.textContent = String(this.highscore).padStart(5, '0');
    }

    startGame() {
        this.gameState = STATES.RUNNING;
        this.score = 0;
        this.speedMultiplier = 1.0;
        this.worldX = 0;

        this.player.reset();
        this.world.reset();
        this.particles.particles = [];

        // UI 状态切换
        this.ui.startScreen.classList.add("hidden");
        this.ui.gameoverScreen.classList.add("hidden");
        this.ui.hud.classList.remove("hidden");
    }

    gameOver() {
        this.gameState = STATES.GAMEOVER;
        
        // 机甲核心爆炸火花效果
        this.particles.spawnExplosion(this.player.x + this.player.w/2, this.player.y + this.player.h/2, PALETTE.neonMagenta, 30);
        this.particles.spawnExplosion(this.player.x + this.player.w/2, this.player.y + this.player.h/2, PALETTE.neonCyan, 15);

        // 记录高分
        if (this.score > this.highscore) {
            this.highscore = this.score;
            localStorage.setItem("neonrun_highscore", this.highscore);
            this.ui.hudHighscore.textContent = String(this.highscore).padStart(5, '0');
        }

        // 刷新结算界面数据
        this.ui.finalScore.textContent = this.score;
        this.ui.finalHighscore.textContent = this.highscore;

        // UI 状态切换
        this.ui.hud.classList.add("hidden");
        this.ui.gameoverScreen.classList.remove("hidden");
    }

    checkCollisions() {
        const pBox = this.player.getHitbox();
        for (let obs of this.world.obstacles) {
            // AABB 碰撞检测算法
            if (pBox.x < obs.x + obs.w &&
                pBox.x + pBox.w > obs.x &&
                pBox.y < obs.y + obs.h &&
                pBox.y + pBox.h > obs.y) {
                this.gameOver();
                break;
            }
        }
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // 防止切屏或降帧导致单帧计算过大（锁帧上限）
        if (dt > 0.1) dt = 0.1;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.gameState === STATES.RUNNING) {
            // 速度平滑加速曲线
            this.speedMultiplier += dt * 0.015;
            
            // 距离计算
            this.worldX += 4.2 * this.speedMultiplier * dt * 60;
            this.score = Math.floor(this.worldX / 10);
            this.ui.hudScore.textContent = String(this.score).padStart(5, '0');

            // 物理引擎子系统步进
            this.background.update(dt, this.speedMultiplier);
            this.player.update(dt);
            this.world.update(dt, this.speedMultiplier);
            this.checkCollisions();
        } else {
            // 在 Start 界面或者 GameOver 界面下，背景元素依然保持轻微的怠速滚动，增强高级感
            this.background.update(dt, 0.1);
        }
        this.particles.update(dt);
    }

    draw() {
        // 清理上帧画布
        this.ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // 1. 渲染背景、太阳和云彩层
        this.background.drawSky(this.ctx);
        
        // 2. 渲染林立的赛博建筑群与动态闪烁广告牌
        this.background.drawCity(this.ctx);
        
        // 3. 渲染近景带有透视效果的地面网格
        this.background.drawForegroundGrid(this.ctx, this.worldX);

        // 4. 渲染跑道上的障碍物
        if (this.gameState === STATES.RUNNING || this.gameState === STATES.GAMEOVER) {
            this.world.draw(this.ctx);
        }

        // 5. 渲染玩家操作的机甲战士
        if (this.gameState !== STATES.GAMEOVER) {
            this.player.draw(this.ctx);
        }

        // 6. 渲染全屏粒子发生器层
        this.particles.draw(this.ctx);
    }
}

// 当 DOM 加载完成后实例化游戏
window.addEventListener("DOMContentLoaded", () => {
    new GameEngine();
});
