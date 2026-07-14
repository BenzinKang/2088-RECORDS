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
        
        // 原有数据数组
        this.airships = [];    
        this.shops = [];       
        this.houses = [];      
        this.streetSigns = []; 

        // 超前景数据数组
        this.foregroundAssets = []; 
        
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

        // 2.5 远景天空飞艇
        const airshipColors = ['#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#d65d0e'];
        let airshipX = 50;
        while (airshipX < GAME_WIDTH + 400) {
            this.airships.push({
                x: airshipX,
                y: 15 + this.rand.next() * 35,
                w: 25 + this.rand.next() * 15,
                h: 10 + this.rand.next() * 6,
                speed: 0.02 + this.rand.next() * 0.02,
                color: airshipColors[Math.floor(this.rand.next() * airshipColors.length)],
                signalSpeed: 1 + this.rand.next() * 2
            });
            airshipX += 250 + this.rand.next() * 200;
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

        // 3.5 边缘矮店铺群
        curX = 10;
        const signColors = ['#ff0055', '#00ffcc', '#ffcc00', '#ff5500'];
        while (curX < GAME_WIDTH + 300) {
            let w = 35 + this.rand.next() * 25;
            let h = 18 + this.rand.next() * 10;
            this.shops.push({
                x: curX,
                w: w,
                h: h,
                seed: this.rand.next(),
                hasAwning: this.rand.next() > 0.3,
                awningColor: this.rand.next() > 0.5 ? '#b83214' : '#146eb8',
                hasVerticalSign: this.rand.next() > 0.4,
                signColor: signColors[Math.floor(this.rand.next() * signColors.length)],
                gateOpenRatio: 0.3 + this.rand.next() * 0.7,
                lightOn: this.rand.next() > 0.2
            });
            curX += w + 15 + this.rand.next() * 30;
        }

        // 3.6 矮小日系住宅群 (中景层)
        let houseX = 40;
        const roofColors = ['#2e5c8a', '#9c3a3a', '#4a5e43', '#5c5146', '#3b3b3b']; 
        const wallColors = ['#d9c5b2', '#cca47e', '#afbfa3', '#615449', '#e3dbcf']; 
        while (houseX < GAME_WIDTH + 400) {
            let w = 25 + this.rand.next() * 15; 
            let h = 16 + this.rand.next() * 12; 
            this.houses.push({
                x: houseX,
                w: w,
                h: h,
                roofColor: roofColors[Math.floor(this.rand.next() * roofColors.length)],
                wallColor: wallColors[Math.floor(this.rand.next() * wallColors.length)],
                houseType: this.rand.next() > 0.5 ? 0 : 1, 
                hasPole: this.rand.next() > 0.6, 
                lightOn: this.rand.next() > 0.3,
                seed: this.rand.next()
            });
            houseX += w + 40 + this.rand.next() * 60; 
        }

        // 3.8 道路旁边的路牌/路灯杆
        curX = 60;
        while (curX < GAME_WIDTH + 200) {
            this.streetSigns.push({
                x: curX,
                h: 22 + this.rand.next() * 8,
                type: Math.floor(this.rand.next() * 3),
                glowColor: this.rand.next() > 0.5 ? '#00ff00' : '#ff3300'
            });
            curX += 120 + this.rand.next() * 150;
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

        // 5. 【重构与改进】超前景生活化及街景摆设资产层
        curX = 30;
        // 调暗墙体和屋顶配色，使其融入黄昏
        const fgWallColors = ['#beb8b0', '#b0b0ad', '#b5aea2', '#a1a6aa']; 
        const fgRoofColors = ['#30373d', '#3e3d3b', '#262c36']; 
        const awningColors = ['#1650a2', '#b34700', '#008055', '#a1241b']; 

        while (curX < GAME_WIDTH + 500) {
            let roll = this.rand.next();

            if (roll < 0.45) { // 住宅
                let w = 60 + this.rand.next() * 20; 
                let h = 35 + this.rand.next() * 15; 
                this.foregroundAssets.push({
                    type: 'HOUSE',
                    x: curX,
                    w: w,
                    h: h,
                    roofColor: fgRoofColors[Math.floor(this.rand.next() * fgRoofColors.length)],
                    wallColor: fgWallColors[Math.floor(this.rand.next() * fgWallColors.length)],
                    awningColor: awningColors[Math.floor(this.rand.next() * awningColors.length)],
                    garageSide: this.rand.next() > 0.5 ? 'LEFT' : 'RIGHT', 
                    garageOpen: this.rand.next() > 0.4, 
                    roofType: this.rand.next() > 0.5 ? 'SLOPE' : 'FLAT', 
                    seed: this.rand.next()
                });
                curX += w + 80 + this.rand.next() * 80;
            } else if (roll < 0.65) { // 独立前景高挑路灯
                this.foregroundAssets.push({
                    type: 'STREET_LAMP',
                    x: curX,
                    h: 70 + this.rand.next() * 15,
                    lightColor: '#ffdd88'
                });
                curX += 70 + this.rand.next() * 60;
            } else if (roll < 0.75) { // 新增：红色消防栓
                this.foregroundAssets.push({
                    type: 'HYDRANT',
                    x: curX
                });
                curX += 45 + this.rand.next() * 45;
            } else if (roll < 0.85) { // 新增：街边小垃圾桶
                this.foregroundAssets.push({
                    type: 'TRASH_CAN',
                    x: curX,
                    style: this.rand.next() > 0.5 ? 'METAL' : 'PLASTIC'
                });
                curX += 45 + this.rand.next() * 45;
            } else if (roll < 0.93) { // 新增：堆放的纸箱
                this.foregroundAssets.push({
                    type: 'BOXES',
                    x: curX,
                    count: 1 + Math.floor(this.rand.next() * 2)
                });
                curX += 50 + this.rand.next() * 50;
            } else { // 新增：街边小型立式动态霓虹广告牌
                this.foregroundAssets.push({
                    type: 'BILLBOARD',
                    x: curX,
                    w: 12 + Math.floor(this.rand.next() * 6),
                    h: 22 + Math.floor(this.rand.next() * 10),
                    neonColor: this.rand.next() > 0.5 ? PALETTE.neonMagenta : PALETTE.neonCyan
                });
                curX += 65 + this.rand.next() * 60;
            }
        }
    }
    
    update(dt, speedMultiplier) {
        const baseSpeed = 2 * speedMultiplier;
        
        // 云朵移动
        for (let c of this.clouds) {
            c.x -= c.speed * baseSpeed * dt * 30;
            if (c.x + c.w < -60) c.x = GAME_WIDTH + 60;
        }

        // 飞艇移动
        for (let a of this.airships) {
            a.x -= a.speed * baseSpeed * dt * 30;
            if (a.x + a.w < -50) {
                a.x = GAME_WIDTH + 50 + Math.random() * 100;
                a.y = 15 + Math.random() * 35;
            }
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

        // 矮店铺移动
        for (let s of this.shops) {
            s.x -= 0.6 * baseSpeed * dt * 60;
            if (s.x + s.w < -50) s.x += GAME_WIDTH + 200;
        }

        // 日系住宅移动
        for (let h of this.houses) {
            h.x -= 0.6 * baseSpeed * dt * 60;
            if (h.x + h.w < -50) h.x += GAME_WIDTH + 250;
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

        // 路牌移动
        for (let s of this.streetSigns) {
            s.x -= 3.0 * speedMultiplier * dt * 60;
            if (s.x < -30) {
                s.x = GAME_WIDTH + 30 + Math.random() * 100;
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

        // 超前景资产移动
        for (let asset of this.foregroundAssets) {
            asset.x -= 4.8 * speedMultiplier * dt * 60;
            if (asset.x < -120) {
                asset.x = GAME_WIDTH + 200 + Math.random() * 200;
            }
        }
    }

    drawSky(ctx) {
        let skyGrad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
        skyGrad.addColorStop(0, '#591a0c');    
        skyGrad.addColorStop(0.45, '#a1350d');  
        skyGrad.addColorStop(0.8, '#e65c00');   
        skyGrad.addColorStop(1, '#ff8c1a');     
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, FLOOR_Y);

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

        ctx.fillStyle = skyGrad; 
        for (let y = sunY - sunRadius + 15; y < sunY + sunRadius; y += 7) {
            let currentBarWidth = Math.floor((y - (sunY - sunRadius + 15)) / 7) + 1;
            ctx.fillRect(sunX - sunRadius - 10, y, sunRadius * 2 + 20, currentBarWidth);
        }
        ctx.restore(); 

        this.drawAirships(ctx);

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

            ctx.globalAlpha = c.alpha * 1.5;
            ctx.fillStyle = '#ffb366';
            ctx.fillRect(cx + cw * 0.2, cy + ch - 1, cw * 0.55, 1);
        }
        ctx.restore();
    }

    drawAirships(ctx) {
        ctx.save();
        const time = Date.now() * 0.001;
        for (let a of this.airships) {
            let ax = Math.floor(a.x);
            let ay = Math.floor(a.y);
            
            let shipGrad = ctx.createLinearGradient(ax, ay, ax, ay + a.h);
            shipGrad.addColorStop(0, a.color);
            shipGrad.addColorStop(1, '#1f0d0a');
            ctx.fillStyle = shipGrad;

            ctx.beginPath();
            ctx.ellipse(ax + a.w / 2, ay + a.h / 2, a.w / 2, a.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#2b120c';
            ctx.fillRect(ax + a.w - 2, ay + 2, 4, 2);
            ctx.fillRect(ax + a.w - 2, ay + a.h - 4, 4, 2);
            ctx.fillRect(ax + a.w, ay + a.h / 2 - 2, 3, 4);

            ctx.fillStyle = '#120503';
            ctx.fillRect(ax + a.w * 0.3, ay + a.h, a.w * 0.3, 2);

            if (Math.sin(time * a.signalSpeed) > 0) {
                ctx.fillStyle = '#ff3300';
                ctx.fillRect(ax + 3, ay + a.h / 2, 1.5, 1.5);
                ctx.fillStyle = '#00ff55';
                ctx.fillRect(ax + a.w * 0.4, ay + a.h + 1, 1, 1);
            }
        }
        ctx.restore();
    }

    drawCity(ctx) {
        const time = Date.now() * 0.003; 

        for (let b of this.bgBuildings) {
            let bx = Math.floor(b.x);
            let bw = Math.floor(b.w);
            let bh = Math.floor(b.h);
            let bY = FLOOR_Y - bh;

            let bgBuildingGrad = ctx.createLinearGradient(bx, bY, bx, FLOOR_Y);
            bgBuildingGrad.addColorStop(0, '#2e141a'); 
            bgBuildingGrad.addColorStop(1, '#130810'); 
            ctx.fillStyle = bgBuildingGrad;

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
                ctx.fillStyle = '#10060c';
                ctx.fillRect(Math.floor(bx + bw / 2), Math.floor(bY - 10), 1, 10);
                ctx.fillStyle = '#ff1100'; 
                ctx.fillRect(Math.floor(bx + bw / 2), Math.floor(bY - 11), 1, 1);
                ctx.restore();
            }
        }

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

        this.drawShops(ctx, time);
        this.drawHouses(ctx, time);
        this.drawSmoke(ctx);
    }

    drawShops(ctx, time) {
        ctx.save();
        for (let s of this.shops) {
            let sx = Math.floor(s.x);
            let sy = Math.floor(FLOOR_Y - s.h);
            let sw = Math.floor(s.w);
            let sh = Math.floor(s.h);

            let shopGrad = ctx.createLinearGradient(sx, sy, sx, FLOOR_Y);
            shopGrad.addColorStop(0, '#241212');
            shopGrad.addColorStop(1, '#140a0a');
            ctx.fillStyle = shopGrad;
            ctx.fillRect(sx, sy, sw, sh);

            let winW = sw - 8;
            let winH = sh - 8;
            let winX = sx + 4;
            let winY = sy + 6;
            if (s.lightOn) {
                ctx.fillStyle = '#ffaa33';
                ctx.globalAlpha = 0.15;
                ctx.fillRect(winX, winY, winW, winH); 
                ctx.globalAlpha = 1.0;
            }

            ctx.fillStyle = '#1c1515';
            ctx.fillRect(winX, winY, winW, winH);
            ctx.fillStyle = '#2d2424';
            let gateH = Math.floor(winH * (1 - s.gateOpenRatio));
            for (let gy = winY; gy < winY + gateH; gy += 2) {
                ctx.fillRect(winX, gy, winW, 1);
            }

            if (s.hasAwning) {
                ctx.fillStyle = s.awningColor;
                ctx.fillRect(sx - 1, sy + 2, sw + 2, 3);
                ctx.fillStyle = '#0f0707';
                for (let ax = sx; ax < sx + sw; ax += 4) {
                    ctx.fillRect(ax, sy + 2, 2, 3);
                }
            }

            if (s.hasVerticalSign) {
                let signX = sx - 4;
                let signY = sy + 2;
                let signW = 3;
                let signH = sh - 6;
                ctx.fillStyle = '#120808';
                ctx.fillRect(signX, signY, signW, signH);
                if (Math.sin(time * 2 + sx) > -0.3) {
                    ctx.fillStyle = s.signColor;
                    ctx.fillRect(signX + 1, signY + 1, signW - 2, signH - 2);
                }
            } else {
                ctx.fillStyle = '#120808';
                ctx.fillRect(sx + 4, sy - 2, sw - 8, 3);
                if (Math.sin(time * 1.2 + sx) > -0.1) {
                    ctx.fillStyle = '#00ffcc';
                    ctx.fillRect(sx + 6, sy - 1, sw - 12, 1);
                }
            }

            ctx.strokeStyle = '#0d0505';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, sw, sh);
        }
        ctx.restore();
    }

    drawHouses(ctx, time) {
        ctx.save();
        for (let h of this.houses) {
            let hx = Math.floor(h.x);
            let hw = Math.floor(h.w);
            let hh = Math.floor(h.h);
            let hy = Math.floor(FLOOR_Y - hh);
            let roofH = Math.floor(hh * 0.35); 

            let wallGrad = ctx.createLinearGradient(hx, hy + roofH, hx, FLOOR_Y);
            wallGrad.addColorStop(0, h.wallColor);
            wallGrad.addColorStop(1, '#1a100d'); 
            ctx.fillStyle = wallGrad;
            ctx.fillRect(hx + 1, hy + roofH, hw - 2, hh - roofH);

            ctx.fillStyle = h.roofColor;
            ctx.beginPath();
            if (h.houseType === 0) {
                ctx.moveTo(hx - 2, hy + roofH);
                ctx.lineTo(hx + hw / 2, hy);
                ctx.lineTo(hx + hw + 2, hy + roofH);
            } else {
                ctx.moveTo(hx - 1, hy + roofH - 2);
                ctx.lineTo(hx + hw * 0.7, hy + 2);
                ctx.lineTo(hx + hw * 0.7, hy + roofH);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#1c1210';
                ctx.fillRect(hx + hw * 0.7, hy + roofH - 4, hw * 0.3, 1);
                ctx.fillRect(hx + hw * 0.7 + 2, hy + roofH - 4, 1, 4);
                ctx.fillRect(hx + hw * 0.9, hy + roofH - 4, 1, 4);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#140c0a';
            ctx.fillRect(hx - 1, hy + roofH, hw + 2, 1.5);

            let winY = hy + roofH + 3;
            let winH = Math.floor((hh - roofH) * 0.4);

            if (h.lightOn) {
                ctx.fillStyle = '#ffa64d'; 
                ctx.fillRect(hx + 4, winY, 8, winH);
                ctx.fillStyle = '#261712';
                ctx.fillRect(hx + 8, winY, 1, winH);
                ctx.fillRect(hx + 4, winY + winH / 2, 8, 1);
            } else {
                ctx.fillStyle = '#241a18';
                ctx.fillRect(hx + 4, winY, 8, winH);
            }

            if (hw > 30) {
                ctx.fillStyle = h.lightOn && h.seed > 0.5 ? '#ffbf80' : '#1a1210';
                ctx.fillRect(hx + hw - 10, winY + 1, 5, 4);
            }

            if (h.hasPole) {
                ctx.strokeStyle = '#261b18';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(hx + hw * 0.3, hy + 2);
                ctx.lineTo(hx + hw * 0.3, hy - 6); 
                ctx.stroke();

                ctx.fillStyle = '#1c1512';
                ctx.fillRect(hx + hw * 0.3 - 3, hy - 6, 7, 1);
            }

            ctx.strokeStyle = '#0f0908';
            ctx.lineWidth = 1;
            ctx.strokeRect(hx + 1, hy + roofH, hw - 2, hh - roofH);
        }
        ctx.restore();
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

        // 1. 渲染前景小路牌
        this.drawStreetSigns(ctx);

        // 2. 渲染前景电线杆 (保持原有剪影图层关系)
        this.drawUtilityPoles(ctx);

        // 3. 【全新改动】在最前端渲染无黑边、高精细日系一户建住宅群、现代路灯以及各类丰富的街景摆设
        this.drawForegroundAssets(ctx);
    }

    drawStreetSigns(ctx) {
        ctx.save();
        for (let s of this.streetSigns) {
            let sx = Math.floor(s.x);
            let sy = Math.floor(FLOOR_Y - s.h);

            drawPixelRect(ctx, sx, sy, 1, s.h, '#0d0404');
            drawPixelRect(ctx, sx + 1, sy, 1, s.h, '#241111');

            ctx.fillStyle = '#140606';
            if (s.type === 0) {
                ctx.beginPath();
                ctx.moveTo(sx - 3, sy + 6);
                ctx.lineTo(sx + 4, sy + 6);
                ctx.lineTo(sx + 0.5, sy);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = s.glowColor;
                ctx.fillRect(sx, sy + 4, 1, 1);
            } else if (s.type === 1) {
                ctx.beginPath();
                ctx.arc(sx + 0.5, sy + 3, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff3300';
                ctx.fillRect(sx, sy + 2, 1, 2);
            } else {
                ctx.fillRect(sx - 3, sy, 7, 5);
                ctx.fillStyle = '#00ffcc';
                ctx.fillRect(sx - 2, sy + 2, 2, 1);
            }
        }
        ctx.restore();
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

    // 【全新重构】绘制无纯黑描边、现实环境色调的前景摆设
    drawForegroundAssets(ctx) {
        ctx.save();
        const time = Date.now() * 0.002;

        for (let asset of this.foregroundAssets) {
            let ax = Math.floor(asset.x);

            // ================== 1. 独立高挑前景弧形路灯 ==================
            if (asset.type === 'STREET_LAMP') {
                let ay = Math.floor(FLOOR_Y - asset.h);
                ctx.fillStyle = '#232830'; // 灰钢质感灯柱
                ctx.fillRect(ax, ay, 2, asset.h);
                ctx.fillRect(ax - 3, ay, 4, 2); // 灯罩弧顶
                ctx.fillRect(ax - 5, ay + 1, 3, 2);
                
                ctx.fillStyle = '#fff3cd'; // 灯泡
                ctx.fillRect(ax - 5, ay + 3, 2, 2);

                ctx.save(); // 发光晕
                ctx.globalAlpha = 0.12;
                let lampGlow = ctx.createRadialGradient(ax - 4, ay + 4, 1, ax - 4, ay + 4, 14);
                lampGlow.addColorStop(0, asset.lightColor);
                lampGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = lampGlow;
                ctx.beginPath();
                ctx.arc(ax - 4, ay + 4, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                continue;
            }

            // ================== 2. 新增：红色消防栓 ==================
            if (asset.type === 'HYDRANT') {
                let hy = FLOOR_Y - 11;
                // 主体结构（避开大黑框，使用红棕暗色与亮红色区分光影）
                ctx.fillStyle = '#8a1111'; // 暗部红
                ctx.fillRect(ax, hy + 2, 6, 9);
                ctx.fillStyle = '#e62e2e'; // 亮部红
                ctx.fillRect(ax + 1, hy + 2, 2, 9);
                
                // 顶部帽子
                ctx.fillStyle = '#8a1111';
                ctx.fillRect(ax, hy, 6, 2);
                ctx.fillStyle = '#e62e2e';
                ctx.fillRect(ax + 2, hy - 1, 2, 1); // 顶阀突起
                
                // 左右侧边出水口阀门
                ctx.fillStyle = '#ffd700'; // 铜黄色阀
                ctx.fillRect(ax - 1, hy + 4, 1, 2);
                ctx.fillRect(ax + 6, hy + 4, 1, 2);
                ctx.fillStyle = '#b38600';
                ctx.fillRect(ax + 2, hy + 5, 2, 2); // 正面喷水口
                continue;
            }

            // ================== 3. 新增：纸皮箱堆 ==================
            if (asset.type === 'BOXES') {
                let by = FLOOR_Y;
                // 底部大纸箱
                ctx.fillStyle = '#6e4726'; // 纸箱暗调
                ctx.fillRect(ax, by - 10, 11, 10);
                ctx.fillStyle = '#9e6d42'; // 亮调
                ctx.fillRect(ax + 1, by - 9, 9, 8);
                // 封箱胶带细节
                ctx.fillStyle = '#3c2410'; 
                ctx.fillRect(ax + 4, by - 10, 3, 10);
                ctx.fillRect(ax, by - 5, 11, 1);

                // 如果有多个箱子，在上面斜放一个小一点的
                if (asset.count > 1) {
                    ctx.fillStyle = '#54361b';
                    ctx.fillRect(ax + 2, by - 16, 7, 6);
                    ctx.fillStyle = '#855b36';
                    ctx.fillRect(ax + 3, by - 15, 5, 5);
                    ctx.fillStyle = '#fff9e6'; // 白底快递单贴纸
                    ctx.fillRect(ax + 4, by - 13, 2, 2);
                }
                continue;
            }

            // ================== 4. 新增：分类垃圾桶 ==================
            if (asset.type === 'TRASH_CAN') {
                let ty = FLOOR_Y - 13;
                if (asset.style === 'METAL') {
                    // 金属垃圾桶（钛灰质感）
                    ctx.fillStyle = '#2f3542';
                    ctx.fillRect(ax, ty, 8, 13);
                    ctx.fillStyle = '#747d8c'; // 金属反光层
                    ctx.fillRect(ax + 1, ty + 1, 6, 12);
                    // 凹槽线条
                    ctx.fillStyle = '#2f3542';
                    ctx.fillRect(ax + 2, ty + 3, 1, 10);
                    ctx.fillRect(ax + 5, ty + 3, 1, 10);
                    // 桶盖提手
                    ctx.fillStyle = '#a4b0be';
                    ctx.fillRect(ax + 2, ty - 1, 4, 1);
                } else {
                    // 日式塑料可回收垃圾桶（深蓝色/绿色调）
                    ctx.fillStyle = '#1c3144'; // 桶身
                    ctx.fillRect(ax, ty + 2, 9, 11);
                    ctx.fillStyle = '#007acc'; // 可回收标志浅蓝背景
                    ctx.fillRect(ax + 2, ty + 5, 5, 5);
                    ctx.fillStyle = '#ffffff'; // 中间一小点白色标志
                    ctx.fillRect(ax + 4, ty + 7, 1, 1);

                    // 桶盖（弧形）
                    ctx.fillStyle = '#2d5a7b';
                    ctx.fillRect(ax - 1, ty, 11, 2);
                    ctx.fillStyle = '#1c3144';
                    ctx.fillRect(ax + 2, ty - 2, 5, 2); // 投入口
                }
                continue;
            }

            // ================== 5. 新增：街边立式动态广告牌 ==================
            if (asset.type === 'BILLBOARD') {
                let by = FLOOR_Y - asset.h;
                let bw = asset.w;
                let bh = asset.h;

                // 黑色金属支架与外框
                ctx.fillStyle = '#1a1d20';
                ctx.fillRect(ax, by, bw, bh);
                ctx.fillRect(ax + Math.floor(bw/2) - 1, by + bh, 3, FLOOR_Y - (by + bh)); // 立柱

                // 广告牌显示区
                ctx.fillStyle = '#0b0c10';
                ctx.fillRect(ax + 2, by + 2, bw - 4, bh - 6);

                // 动态霓虹灯画面闪烁（利用 Math.sin 模拟霓虹广告效果）
                if (Math.sin(time + ax) > -0.2) {
                    ctx.fillStyle = asset.neonColor;
                    // 绘制一横一竖或一个像素图案
                    ctx.fillRect(ax + 4, by + 4, bw - 8, 2);
                    ctx.fillRect(ax + Math.floor(bw/2) - 1, by + 8, 2, bh - 16);
                }
                continue;
            }

            // ================== 6. 现实生活化日系一户建住宅 ==================
            let aw = Math.floor(asset.w);
            let ah = Math.floor(asset.h);
            let ay = Math.floor(FLOOR_Y - ah);

            // 渐变墙体（顶部稍暗、底部自然沉底暗化，营造温暖黄昏的真实遮阴感）
            let houseGrad = ctx.createLinearGradient(ax, ay, ax, FLOOR_Y);
            houseGrad.addColorStop(0, asset.wallColor);
            houseGrad.addColorStop(1, '#66615a'); // 自然的地面沉降微暗
            ctx.fillStyle = houseGrad;
            ctx.fillRect(ax, ay, aw, ah);

            let roofH = Math.floor(ah * 0.25);

            // 1. 现实风格瓦屋顶
            ctx.fillStyle = asset.roofColor;
            if (asset.roofType === 'SLOPE') {
                ctx.beginPath();
                ctx.moveTo(ax - 2, ay + roofH);
                ctx.lineTo(ax + aw / 2, ay);
                ctx.lineTo(ax + aw + 2, ay + roofH);
                ctx.closePath();
                ctx.fill();
            } else {
                // 阶梯式平顶一户建
                ctx.fillRect(ax - 1, ay, aw + 2, 3);
                ctx.fillStyle = '#20252b';
                ctx.fillRect(ax + 4, ay - 2, aw - 8, 2);
            }

            // 2. 车库细节（带条纹卷帘门）
            let garageW = Math.floor(aw * 0.42);
            let garageH = Math.floor(ah * 0.6);
            let garageX = (asset.garageSide === 'LEFT') ? ax + 4 : ax + aw - garageW - 4;
            let garageY = FLOOR_Y - garageH;

            if (asset.garageOpen) {
                // 车库内部深影
                ctx.fillStyle = '#141211';
                ctx.fillRect(garageX, garageY, garageW, garageH);
                ctx.fillStyle = '#5c5955';
                ctx.fillRect(garageX, garageY, 2, garageH);
                ctx.fillRect(garageX + garageW - 2, garageY, 2, garageH);
            } else {
                // 铝合金卷帘门
                ctx.fillStyle = '#a0a8b3'; 
                ctx.fillRect(garageX, garageY, garageW, garageH);
                ctx.fillStyle = '#575e69'; 
                for (let gy = garageY + 3; gy < garageY + garageH; gy += 3) {
                    ctx.fillRect(garageX, gy, garageW, 1);
                }
            }

            // 3. 多彩帆布遮阳雨棚
            let winX = (asset.garageSide === 'LEFT') ? ax + aw - Math.floor(aw * 0.48) : ax + 6;
            let winY = ay + roofH + 3;
            let winW = Math.floor(aw * 0.38);
            let winH = Math.floor(ah * 0.35);

            // 窗户框及微光
            ctx.fillStyle = '#20252b';
            ctx.fillRect(winX, winY, winW, winH);
            ctx.fillStyle = '#ffe082'; // 柔和温黄窗内光
            ctx.fillRect(winX + 1, winY + 1, winW - 2, winH - 2);
            ctx.fillStyle = '#3e4a59'; // 十字窗棂
            ctx.fillRect(winX + Math.floor(winW/2), winY, 1, winH);
            ctx.fillRect(winX, winY + Math.floor(winH/2), winW, 1);

            // 彩色雨棚
            let awningY = winY - 2;
            ctx.fillStyle = asset.awningColor;
            ctx.fillRect(winX - 2, awningY, winW + 4, 3);
            ctx.fillStyle = '#ffffff'; 
            for (let stripeX = winX - 2; stripeX < winX + winW + 2; stripeX += 5) {
                ctx.fillRect(stripeX, awningY, 2, 3);
            }

            // 4. 门口红色信箱
            let boxX = (asset.garageSide === 'LEFT') ? garageX + garageW + 3 : garageX - 6;
            ctx.fillStyle = '#b31c1c'; 
            ctx.fillRect(boxX, FLOOR_Y - 12, 4, 6);
            ctx.fillStyle = '#2f3542'; 
            ctx.fillRect(boxX + 1, FLOOR_Y - 6, 1, 6);

            // 5. 墙面贴纸
            let paperX = (asset.garageSide === 'LEFT') ? ax + aw - 12 : ax + garageW + 6;
            let paperY = FLOOR_Y - 14;
            ctx.fillStyle = '#fce4ec'; 
            ctx.fillRect(paperX, paperY, 4, 5);
            ctx.fillStyle = '#e3f2fd'; 
            ctx.fillRect(paperX + 5, paperY + 2, 3, 6);

            // 6. 空调外机
            if (asset.seed > 0.5) {
                let acX = winX + 2;
                let acY = FLOOR_Y - 8;
                ctx.fillStyle = '#cfd8dc';
                ctx.fillRect(acX, acY, 8, 6);
                ctx.fillStyle = '#78909c'; 
                ctx.fillRect(acX + 1, acY + 1, 3, 4);
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
// --- GAME ENGINE CORE / STATE CONTROLLER ---
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
        // 如果是键盘事件，只允许空格键和上方向键
        if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp') return;
        
        // 【新增手机端过滤】如果点击的是游戏界面里的按钮（如开始/重启系统按钮），则交由按钮自己的事件处理，不触发跳跃
        if (e.target && e.target.classList.contains('cyber-btn')) return;

        // 只有在游戏运行状态下才允许跳跃
        if (this.gameState === STATES.RUNNING) {
            this.player.jump();
            if (e.cancelable) e.preventDefault(); // 阻止手机端默认的双击放大或滚动行为
        }
    };

    // 键盘监听不变
    window.addEventListener("keydown", handleJump);
    
    // 【修改】将原本 canvas 的监听，改为全局 window 或游戏大容器监听
    // 这样只要触碰手机屏幕任意位置（除按钮外），都能触发跳跃
    window.addEventListener("touchstart", handleJump, { passive: false });

    // 按钮监听器保持不变
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
