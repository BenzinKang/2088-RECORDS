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

// 简单的伪随机数生成器（带Seed），确保每次进入游戏背景排布一致
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    next() {
        let x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }
}

// ============================================================================
// BACKGROUND SYSTEM (包含任务1：调暗超近景住宅 & 任务2：超近景增加霓虹广告牌)
// ============================================================================
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
        
        // 原有中远景数据数组
        this.airships = [];    
        this.shops = [];       
        this.houses = [];      
        this.streetSigns = []; 

        // 超前景（超近景）数据数组
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

        // 3.6 矮小日系住宅群（中景层）
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

        // 5. 超前景（超近景）资产层
        curX = 20;
        
        // 【任务1修改】大幅调暗超近景住宅配色，改为融入黄昏环境的极暗深灰和深红棕，防止突兀
        const fgWallColors = ['#21181a', '#261b1e', '#221921', '#1a1315']; 
        const fgRoofColors = ['#140e10', '#181113', '#110c0d'];             
        const awningColors = ['#541619', '#4d200e', '#093627', '#122645']; 

        // 广告牌霓虹色池
        const neonColors = [PALETTE.neonMagenta, PALETTE.neonCyan, PALETTE.neonGold, '#ff2a00', '#00ff66'];

        while (curX < GAME_WIDTH + 600) {
            let roll = this.rand.next();

            // 权重调配：住宅 35%, 【任务2】新增霓虹灯箱广告牌 30%, 街灯 15%, 其它杂物 20%
            if (roll < 0.35) { 
                let w = 55 + this.rand.next() * 20; 
                let h = 32 + this.rand.next() * 14; 
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
                    hasRoofNeon: this.rand.next() > 0.4, // 住宅有概率在楼顶自带霓虹牌
                    neonColor: neonColors[Math.floor(this.rand.next() * neonColors.length)],
                    seed: this.rand.next() 
                });
                curX += w + 50 + this.rand.next() * 50;
            } 
            // 【任务2核心】超近景增加独立的、高亮闪烁赛博风格的霓虹广告牌
            else if (roll < 0.65) { 
                let w = 16 + Math.floor(this.rand.next() * 12);
                let h = 30 + Math.floor(this.rand.next() * 15);
                this.foregroundAssets.push({
                    type: 'NEON_BOARD',
                    x: curX,
                    w: w,
                    h: h,
                    color: neonColors[Math.floor(this.rand.next() * neonColors.length)],
                    blinkSpeed: 1.5 + this.rand.next() * 2,
                    pattern: this.rand.next() > 0.5 ? 'BARS' : 'GRID'
                });
                curX += w + 60 + this.rand.next() * 60;
            }
            else if (roll < 0.80) { 
                this.foregroundAssets.push({
                    type: 'STREET_LAMP',
                    x: curX,
                    h: 65 + this.rand.next() * 15, 
                    lightColor: '#ffaa44' 
                });
                curX += 70 + this.rand.next() * 60; 
            } 
            else if (roll < 0.87) { 
                this.foregroundAssets.push({ type: 'HYDRANT', x: curX }); 
                curX += 45 + this.rand.next() * 45; 
            } 
            else if (roll < 0.94) { 
                this.foregroundAssets.push({ 
                    type: 'TRASH_CAN',
                    x: curX,
                    style: this.rand.next() > 0.5 ? 'METAL' : 'PLASTIC' 
                });
                curX += 45 + this.rand.next() * 45; 
            } 
            else { 
                this.foregroundAssets.push({ 
                    type: 'BOXES',
                    x: curX,
                    count: 1 + Math.floor(this.rand.next() * 2) 
                });
                curX += 50 + this.rand.next() * 50; 
            }
        }
    }
    
    update(dt, speedMultiplier) {
        const baseSpeed = 2 * speedMultiplier; 
        
        for (let c of this.clouds) {
            c.x -= c.speed * baseSpeed * dt * 30;
            if (c.x + c.w < -60) c.x = GAME_WIDTH + 60;
        }

        for (let a of this.airships) {
            a.x -= a.speed * baseSpeed * dt * 30;
            if (a.x + a.w < -50) {
                a.x = GAME_WIDTH + 50 + Math.random() * 100;
                a.y = 15 + Math.random() * 35;
            }
        }
        
        for (let b of this.bgBuildings) {
            b.x -= 0.05 * baseSpeed * dt * 60;
            if (b.x + b.w < -40) b.x += GAME_WIDTH + 200;
        }

        for (let f of this.factories) {
            f.x -= 0.09 * baseSpeed * dt * 60;
            if (f.x + f.w < -100) f.x += GAME_WIDTH + 300;

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
        
        for (let b of this.midBuildings) {
            b.x -= 0.22 * baseSpeed * dt * 60;
            if (b.x + b.w < -40) b.x += GAME_WIDTH + 200;
        }

        for (let s of this.shops) {
            s.x -= 0.6 * baseSpeed * dt * 60;
            if (s.x + s.w < -50) s.x += GAME_WIDTH + 200;
        }

        for (let h of this.houses) {
            h.x -= 0.6 * baseSpeed * dt * 60;
            if (h.x + h.w < -50) h.x += GAME_WIDTH + 250;
        }

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

        for (let s of this.streetSigns) {
            s.x -= 3.0 * speedMultiplier * dt * 60;
            if (s.x < -30) {
                s.x = GAME_WIDTH + 30 + Math.random() * 100;
            }
        }

        for (let p of this.utilityPoles) {
            p.x -= 4.2 * speedMultiplier * dt * 60;
            if (p.x < -50) {
                p.x = GAME_WIDTH + 50 + Math.random() * 100;
                p.h = 75 + Math.random() * 20;
            }
        }

        for (let asset of this.foregroundAssets) {
            asset.x -= 4.8 * speedMultiplier * dt * 60;
            if (asset.x < -120) {
                asset.x = GAME_WIDTH + 200 + Math.random() * 200;
            }
        }
    }

    drawSky(ctx) {
        let skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        skyGrad.addColorStop(0, PALETTE.skyTop);
        skyGrad.addColorStop(0.4, PALETTE.skyMid);
        skyGrad.addColorStop(1, PALETTE.skyBot);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = PALETTE.sunGlow;
        ctx.beginPath();
        ctx.arc(GAME_WIDTH / 2, FLOOR_Y - 10, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = PALETTE.sunCore;
        ctx.beginPath();
        ctx.arc(GAME_WIDTH / 2, FLOOR_Y - 10, 30, 0, Math.PI * 2);
        ctx.fill();

        for (let c of this.clouds) {
            ctx.fillStyle = c.color;
            ctx.globalAlpha = c.alpha;
            drawPixelRect(ctx, c.x, c.y, c.w, c.h, c.color);
        }
        ctx.globalAlpha = 1.0;
    }

    drawCity(ctx) {
        const time = Date.now() * 0.001;

        for (let b of this.bgBuildings) {
            let bx = Math.floor(b.x);
            let by = FLOOR_Y - b.h;
            ctx.fillStyle = PALETTE.cityDark;
            ctx.fillRect(bx, by, b.w, b.h);
            if (b.hasSpire) {
                ctx.fillStyle = '#1b0c0f';
                ctx.fillRect(bx + Math.floor(b.w / 2), by - 12, 1, 12);
            }
        }

        for (let f of this.factories) {
            let fx = Math.floor(f.x);
            let fy = FLOOR_Y - f.h;
            ctx.fillStyle = '#210f12';
            ctx.fillRect(fx, fy, f.w, f.h);
            ctx.fillStyle = '#170a0c';
            ctx.fillRect(fx + f.w * 0.35, FLOOR_Y - f.chimneyH1, 4, f.chimneyH1 - f.h);
            ctx.fillRect(fx + f.w * 0.7, FLOOR_Y - f.chimneyH2, 5, f.chimneyH2 - f.h);
        }

        ctx.fillStyle = 'rgba(200,200,200,0.25)';
        for (let p of this.smokeParticles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.floor(p.size), Math.floor(p.size));
        }
        ctx.globalAlpha = 1.0;

        for (let a of this.airships) {
            let ax = Math.floor(a.x);
            let ay = Math.floor(a.y);
            ctx.fillStyle = '#1a0d10';
            ctx.fillRect(ax, ay, a.w, a.h);
            ctx.fillStyle = a.color;
            ctx.fillRect(ax + 2, ay + 2, a.w - 4, a.h - 4);
            let blink = Math.floor(time * a.signalSpeed) % 2 === 0;
            if (blink) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(ax + a.w - 3, ay + a.h / 2 - 1, 2, 2);
            }
        }

        for (let b of this.midBuildings) {
            let bx = Math.floor(b.x);
            let by = FLOOR_Y - b.h;
            ctx.fillStyle = PALETTE.cityMid;
            ctx.fillRect(bx, by, b.w, b.h);

            let isBlinking = Math.sin(time * b.blinkSpeed + b.seed * 10) > -0.2;
            if (isBlinking) {
                ctx.fillStyle = b.neonColor;
                if (b.buildingType === 0) {
                    ctx.fillRect(bx + b.w - b.boardW - 2, by + b.boardYOffset, b.boardW, b.boardH);
                } else if (b.buildingType === 1) {
                    ctx.fillRect(bx + 2, by + 2, b.w - 4, 2);
                } else if (b.buildingType === 2) {
                    for (let wy = by + 6; wy < FLOOR_Y - 6; wy += 8) {
                        ctx.fillRect(bx + 4, wy, 2, 3);
                        ctx.fillRect(bx + b.w - 6, wy, 2, 3);
                    }
                }
            }

            ctx.fillStyle = '#261216';
            if (b.antennaType === 1) {
                ctx.fillRect(bx + 4, by - 8, 1, 8);
            } else if (b.antennaType === 2) {
                ctx.fillRect(bx + b.w - 5, by - 14, 1, 14);
            }
        }

        for (let s of this.shops) {
            let sx = Math.floor(s.x);
            let sy = FLOOR_Y - s.h;
            ctx.fillStyle = PALETTE.cityFore;
            ctx.fillRect(sx, sy, s.w, s.h);

            if (s.lightOn) {
                ctx.fillStyle = 'rgba(255, 230, 150, 0.35)';
                let openH = Math.floor(s.h * 0.6 * s.gateOpenRatio);
                ctx.fillRect(sx + 4, FLOOR_Y - openH, s.w - 8, openH);
            }

            ctx.fillStyle = '#2d1519';
            let gateH = Math.floor(s.h * 0.6);
            ctx.strokeRect(sx + 4, FLOOR_Y - gateH, s.w - 8, gateH);

            if (s.hasAwning) {
                ctx.fillStyle = s.awningColor;
                ctx.fillRect(sx + 2, sy + 3, s.w - 4, 3);
            }

            if (s.hasVerticalSign) {
                let isSignOn = Math.sin(time * 2 + s.seed * 5) > -0.4;
                if (isSignOn) {
                    ctx.fillStyle = s.signColor;
                    ctx.fillRect(sx - 5, sy + 2, 3, Math.floor(s.h * 0.7));
                }
            }
        }

        for (let h of this.houses) {
            let hx = Math.floor(h.x);
            let hy = FLOOR_Y - h.h;
            let roofH = Math.floor(h.h * 0.35);

            ctx.fillStyle = h.wallColor;
            ctx.fillRect(hx, hy + roofH, h.w, h.h - roofH);

            ctx.fillStyle = h.roofColor;
            if (h.houseType === 0) {
                ctx.beginPath();
                ctx.moveTo(hx - 2, hy + roofH);
                ctx.lineTo(hx + h.w / 2, hy);
                ctx.lineTo(hx + h.w + 2, hy + roofH);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillRect(hx - 1, hy + roofH - 2, h.w + 2, 2);
            }

            if (h.lightOn) {
                ctx.fillStyle = 'rgba(255, 200, 100, 0.45)';
                ctx.fillRect(hx + 4, hy + roofH + 4, 6, 6);
            }

            if (h.hasPole) {
                ctx.fillStyle = '#261216';
                ctx.fillRect(hx + h.w - 3, hy - 10, 1, h.h + 10);
                ctx.fillRect(hx + h.w - 5, hy - 8, 5, 1);
            }
        }

        for (let s of this.streetSigns) {
            let sx = Math.floor(s.x);
            let sy = FLOOR_Y - s.h;
            ctx.fillStyle = '#210e11';
            ctx.fillRect(sx, sy, 2, s.h);

            if (s.type === 0) {
                ctx.fillRect(sx - 3, sy, 8, 5);
            } else if (s.type === 1) {
                ctx.beginPath();
                ctx.moveTo(sx + 1, sy);
                ctx.lineTo(sx - 4, sy + 4);
                ctx.lineTo(sx + 6, sy + 4);
                ctx.closePath();
                ctx.fill();
            }

            let isGlow = Math.floor(time * 3 + sx) % 3 !== 0;
            if (isGlow) {
                ctx.fillStyle = s.glowColor;
                ctx.fillRect(sx, sy + 2, 2, 2);
            }
        }
    }

    // 绘制包含【任务1优化住宅】和【任务2全新霓虹广告牌】的前景资产
    drawForegroundAssets(ctx) {
        const time = Date.now() * 0.001;
        ctx.save();

        for (let asset of this.foregroundAssets) {
            let ax = Math.floor(asset.x);
            if (ax < -120 || ax > GAME_WIDTH + 120) continue;

            if (asset.type === 'HOUSE') {
                let ay = FLOOR_Y - asset.h;
                let aw = asset.w;
                let ah = asset.h;
                let roofH = Math.floor(ah * 0.3);

                // 1. 【任务1】使用深色渐变填涂房屋主体，完全压低亮度，完美沉入落日夜色中
                let wallGrad = ctx.createLinearGradient(ax, ay + roofH, ax, FLOOR_Y);
                wallGrad.addColorStop(0, asset.wallColor);
                wallGrad.addColorStop(1, '#0e0a0b'); 
                ctx.fillStyle = wallGrad;
                ctx.fillRect(ax, ay + roofH, aw, ah - roofH);

                // 压暗的屋顶
                ctx.fillStyle = asset.roofColor;
                if (asset.roofType === 'SLOPE') {
                    ctx.beginPath();
                    ctx.moveTo(ax - 3, ay + roofH);
                    ctx.lineTo(ax + aw / 2, ay);
                    ctx.lineTo(ax + aw + 3, ay + roofH);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillRect(ax - 2, ay + roofH - 3, aw + 4, 3);
                }

                // 【任务1】降低窗户光亮度，使其仅带有些许柔和的低饱和暗橘色
                ctx.fillStyle = (asset.seed > 0.45) ? 'rgba(200, 90, 20, 0.2)' : 'rgba(20, 15, 20, 0.8)';
                ctx.fillRect(ax + 6, ay + roofH + 5, 10, 8);
                ctx.fillStyle = '#0e0a0b'; 
                ctx.fillRect(ax + 11, ay + roofH + 5, 1, 8);

                ctx.fillStyle = asset.awningColor;
                ctx.fillRect(ax + aw - 20, ay + roofH + 10, 15, 2);

                ctx.strokeStyle = '#150f11';
                let gX = (asset.garageSide === 'LEFT') ? ax + aw - 22 : ax + 6;
                ctx.strokeRect(gX, ay + roofH + 14, 16, ah - roofH - 14);

                // 【任务2追加逻辑】部分住宅楼顶附加小型闪烁招牌，增强赛博感
                if (asset.hasRoofNeon) {
                    let blink = Math.sin(time * 3 + ax) > -0.3;
                    let nW = 16, nH = 8;
                    let nX = ax + (aw - nW) / 2;
                    let nY = ay - nH + (asset.roofType === 'FLAT' ? -1 : 3);
                    
                    ctx.fillStyle = '#080405';
                    ctx.fillRect(nX, nY, nW, nH);
                    if (blink) {
                        ctx.fillStyle = asset.neonColor;
                        ctx.globalAlpha = 0.7;
                        ctx.fillRect(nX + 2, nY + 2, nW - 4, nH - 4);
                        ctx.globalAlpha = 1.0;
                    }
                }
            } 
            else if (asset.type === 'NEON_BOARD') {
                // 【任务2核心】全新增加的超前景高挑动态闪烁霓虹广告牌
                let ay = FLOOR_Y - asset.h;
                let aw = asset.w;
                let ah = asset.h;
                let blink = Math.sin(time * asset.blinkSpeed + ax) > -0.4;

                ctx.fillStyle = '#120c0e';
                ctx.fillRect(ax + aw / 2 - 2, ay + ah - 10, 4, 10);

                ctx.fillStyle = '#060304';
                ctx.fillRect(ax, ay, aw, ah - 8);
                ctx.strokeStyle = '#1f1316';
                ctx.lineWidth = 1;
                ctx.strokeRect(ax, ay, aw, ah - 8);

                if (blink) {
                    ctx.save();
                    ctx.strokeStyle = asset.color;
                    ctx.shadowColor = asset.color;
                    ctx.shadowBlur = 4;
                    ctx.strokeRect(ax + 1, ay + 1, aw - 2, ah - 10);

                    ctx.fillStyle = asset.color;
                    ctx.globalAlpha = 0.8 + Math.sin(time * 10) * 0.2; 
                    if (asset.pattern === 'BARS') {
                        for (let tx = ax + 3; tx < ax + aw - 2; tx += 4) {
                            ctx.fillRect(tx, ay + 3, 2, ah - 14);
                        }
                    } else {
                        for (let ty = ay + 4; ty < ay + ah - 12; ty += 4) {
                            ctx.fillRect(ax + 3, ty, aw - 6, 1.5);
                        }
                    }
                    ctx.restore();
                }
            }
            else if (asset.type === 'STREET_LAMP') {
                let ay = FLOOR_Y - asset.h;
                ctx.fillStyle = '#171315';
                ctx.fillRect(ax, ay, 2, asset.h);
                ctx.fillRect(ax - 2, ay, 6, 2);
                ctx.fillStyle = asset.lightColor;
                ctx.fillRect(ax - 1, ay + 2, 4, 2);
                
                ctx.save();
                ctx.globalAlpha = 0.08;
                let lampGrad = ctx.createRadialGradient(ax + 1, ay + 4, 1, ax + 1, ay + 4, 12);
                lampGrad.addColorStop(0, asset.lightColor);
                lampGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = lampGrad;
                ctx.beginPath(); ctx.arc(ax + 1, ay + 4, 12, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            else if (asset.type === 'HYDRANT') {
                ctx.fillStyle = '#3d1012'; 
                ctx.fillRect(ax, FLOOR_Y - 7, 4, 7);
                ctx.fillRect(ax - 1, FLOOR_Y - 6, 6, 2);
            }
            else if (asset.type === 'TRASH_CAN') {
                ctx.fillStyle = asset.style === 'METAL' ? '#1c191b' : '#111f1b';
                ctx.fillRect(ax, FLOOR_Y - 9, 6, 9);
            }
            else if (asset.type === 'BOXES') {
                ctx.fillStyle = '#33241b'; 
                ctx.fillRect(ax, FLOOR_Y - 6, 7, 6);
                if (asset.count > 1) {
                    ctx.fillStyle = '#2b1e17';
                    ctx.fillRect(ax + 4, FLOOR_Y - 11, 5, 5);
                }
            }
        }
        ctx.restore();
    }

    drawForegroundGrid(ctx, worldX) {
        ctx.fillStyle = '#12050c';
        ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y);

        ctx.strokeStyle = '#380a1f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, FLOOR_Y);
        ctx.lineTo(GAME_WIDTH, FLOOR_Y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(230, 20, 100, 0.18)';
        const horizonY = FLOOR_Y;
        const totalLines = 14;
        for (let i = 0; i <= totalLines; i++) {
            let ratio = i / totalLines;
            let startX = GAME_WIDTH * ratio;
            let pX = GAME_WIDTH / 2 + (startX - GAME_WIDTH / 2) * 2.5;

            ctx.beginPath();
            ctx.moveTo(startX, horizonY);
            ctx.lineTo(pX, GAME_HEIGHT);
            ctx.stroke();
        }

        const speedFactor = 0.8;
        let localX = (worldX * speedFactor) % 40;
        let currentHSpacing = 4;
        let curY = horizonY;

        while (curY < GAME_HEIGHT) {
            ctx.beginPath();
            ctx.moveTo(0, Math.floor(curY));
            ctx.lineTo(GAME_WIDTH, Math.floor(curY));
            ctx.stroke();

            curY += currentHSpacing;
            currentHSpacing += 1.8;
        }
    }
}

// ============================================================================
// PLAYER SYSTEM (完全保留)
// ============================================================================
class Player {
    constructor() {
        this.x = 45;
        this.y = FLOOR_Y;
        this.vy = 0;
        this.w = 12;
        this.h = 18;
        this.isGrounded = true;
        this.jumpForce = -4.3;
        this.gravity = 0.22;
        this.animTime = 0;
        this.isDead = false;
    }

    jump() {
        if (this.isGrounded && !this.isDead) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
        }
    }

    update(dt) {
        if (!this.isGrounded) {
            this.vy += this.gravity * dt * 60;
            this.y += this.vy * dt * 60;
            if (this.y >= FLOOR_Y) {
                this.y = FLOOR_Y;
                this.vy = 0;
                this.isGrounded = true;
            }
        }
        if (!this.isDead && this.isGrounded) {
            this.animTime += dt * 12;
        }
    }

    draw(ctx) {
        let px = Math.floor(this.x);
        let py = Math.floor(this.y - this.h);
        
        ctx.save();
        if (this.isDead) {
            ctx.fillStyle = '#555555';
            ctx.fillRect(px, py + this.h - 6, this.h, 6);
            ctx.restore();
            return;
        }

        ctx.fillStyle = PALETTE.neonCyan;
        ctx.fillRect(px + 2, py, 8, 6);
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(px, py + 6, 12, 8);

        ctx.fillStyle = PALETTE.neonCyan;
        let legOffset = Math.floor(this.animTime) % 2 === 0 ? 0 : 2;
        if (!this.isGrounded) legOffset = 1;
        ctx.fillRect(px + 2, py + 14, 2, 4 - legOffset);
        ctx.fillRect(px + 8, py + 14, 2, 4 - (2 - legOffset));

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 8, py + 2, 2, 2);
        ctx.restore();
    }
}

// ============================================================================
// OBSTACLE WORLD SYSTEM (完全保留)
// ============================================================================
class WorldSystem {
    constructor(particleSystem) {
        this.obstacles = [];
        this.rand = new SeededRandom(123);
        this.nextSpawnDistance = 150;
        this.distanceTravelled = 0;
        this.particles = particleSystem;
    }

    reset() {
        this.obstacles = [];
        this.distanceTravelled = 0;
        this.nextSpawnDistance = 150;
        this.rand = new SeededRandom(Date.now() % 1000);
    }

    update(dt, speedMultiplier) {
        let speed = 4.2 * speedMultiplier * dt * 60;
        this.distanceTravelled += speed;

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].x -= speed;
            if (this.obstacles[i].type === 'DRONE') {
                this.obstacles[i].waveTime += dt * 5;
                this.obstacles[i].y = FLOOR_Y - 35 + Math.sin(this.obstacles[i].waveTime) * 12;
                
                if (Math.random() < 0.1 * dt * 60) {
                    this.particles.spawn(this.obstacles[i].x + 6, this.obstacles[i].y + 6, '#ff0055', 1);
                }
            }
            if (this.obstacles[i].x + this.obstacles[i].w < -20) {
                this.obstacles.splice(i, 1);
            }
        }

        if (this.distanceTravelled >= this.nextSpawnDistance) {
            this.spawnObstacle();
            this.distanceTravelled = 0;
            this.nextSpawnDistance = 120 + this.rand.next() * 140 - (speedMultiplier * 15);
            if (this.nextSpawnDistance < 80) this.nextSpawnDistance = 80;
        }
    }

    spawnObstacle() {
        let roll = this.rand.next();
        if (roll < 0.45) {
            this.obstacles.push({ type: 'BARRIER', x: GAME_WIDTH + 20, y: FLOOR_Y, w: 10 + Math.floor(this.rand.next() * 6), h: 14 + Math.floor(this.rand.next() * 10), color: '#ff0055' });
        } else if (roll < 0.75) {
            this.obstacles.push({ type: 'DRONE', x: GAME_WIDTH + 20, y: FLOOR_Y - 35, w: 12, h: 8, waveTime: this.rand.next() * 5, color: PALETTE.neonCyan });
        } else {
            this.obstacles.push({ type: 'DOUBLE_BLOCK', x: GAME_WIDTH + 20, y: FLOOR_Y, w: 22, h: 12, color: PALETTE.neonGold });
        }
    }

    draw(ctx) {
        ctx.save();
        for (let o of this.obstacles) {
            let ox = Math.floor(o.x);
            let oy = Math.floor(o.y - o.h);
            ctx.fillStyle = o.color;
            ctx.fillRect(ox, oy, o.w, o.h);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(ox + 1, oy + 1, o.w - 2, o.h - 2);

            if (o.type === 'DRONE') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(ox - 2, oy + 2, 2, 1);
                ctx.fillRect(ox + o.w, oy + 2, 2, 1);
            }
        }
        ctx.restore();
    }
}

// ============================================================================
// PARTICLE SYSTEM (完全保留)
// ============================================================================
class ParticleSystem {
    constructor() {
        this.pool = [];
    }
    spawn(x, y, color, count = 5) {
        for (let i = 0; i < count; i++) {
            this.pool.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.8) * 3,
                size: 1.5 + Math.random() * 2,
                life: 1.0,
                decay: 0.03 + Math.random() * 0.03,
                color: color
            });
        }
    }
    update(dt) {
        for (let i = this.pool.length - 1; i >= 0; i--) {
            let p = this.pool[i];
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.life -= p.decay * dt * 60;
            if (p.life <= 0) this.pool.splice(i, 1);
        }
    }
    draw(ctx) {
        ctx.save();
        for (let p of this.pool) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.floor(p.size), Math.floor(p.size));
        }
        ctx.restore();
    }
}

// ============================================================================
// GAME CORE ENGINE MANAGER (完全保留 & 精准嵌入超前景渲染)
// ============================================================================
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.ui = {
            startScreen: document.getElementById('startScreen'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            hud: document.getElementById('hud'),
            hudScore: document.getElementById('hudScore'),
            finalScore: document.getElementById('finalScore')
        };

        this.background = new BackgroundSystem();
        this.particles = new ParticleSystem();
        this.player = new Player();
        this.world = new WorldSystem(this.particles);

        this.gameState = STATES.START;
        this.score = 0;
        this.worldX = 0;
        this.speedMultiplier = 1.0;
        this.lastTime = 0;

        this.initInput();
    }

    initInput() {
        const triggerJump = () => {
            if (this.gameState === STATES.RUNNING) {
                this.player.jump();
            } else if (this.gameState === STATES.START) {
                this.startGame();
            } else if (this.gameState === STATES.GAMEOVER) {
                this.restartGame();
            }
        };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                triggerJump();
            }
        });
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            triggerJump();
        });
        this.ui.startScreen.addEventListener('click', triggerJump);
        this.ui.gameOverScreen.addEventListener('click', triggerJump);
    }

    startGame() {
        this.gameState = STATES.RUNNING;
        this.ui.startScreen.classList.add('hidden');
        this.ui.gameOverScreen.classList.add('hidden');
        this.ui.hud.classList.remove('hidden');
        this.score = 0;
        this.worldX = 0;
        this.speedMultiplier = 1.0;
        this.player.isDead = false;
        this.player.y = FLOOR_Y;
        this.world.reset();
    }

    restartGame() {
        this.startGame();
    }

    gameOver() {
        this.gameState = STATES.GAMEOVER;
        this.player.isDead = true;
        this.ui.gameOverScreen.classList.remove('hidden');
        this.ui.finalScore.textContent = this.score;
        this.particles.spawn(this.player.x + 6, this.player.y - 10, '#00f3ff', 15);
        this.particles.spawn(this.player.x + 6, this.player.y - 10, '#ff0055', 15);
    }

    checkCollisions() {
        let px = this.player.x;
        let py = this.player.y - this.player.h;
        let pw = this.player.w;
        let ph = this.player.h;

        for (let o of this.world.obstacles) {
            let ox = o.x;
            let oy = o.y - o.h;
            let ow = o.w;
            let oh = o.h;

            if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
                this.gameOver();
                break;
            }
        }
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = (timestamp - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1; 
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.gameState === STATES.RUNNING) {
            this.speedMultiplier += dt * 0.015;
            
            this.worldX += 4.2 * this.speedMultiplier * dt * 60;
            this.score = Math.floor(this.worldX / 10);
            this.ui.hudScore.textContent = String(this.score).padStart(5, '0');

            this.background.update(dt, this.speedMultiplier);
            this.player.update(dt);
            this.world.update(dt, this.speedMultiplier);
            this.checkCollisions();
        } else {
            this.background.update(dt, 0.1);
        }
        this.particles.update(dt);
    }

    draw() {
        this.ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // 1. 渲染天空、太阳、云层
        this.background.drawSky(this.ctx);
        
        // 2. 渲染林立的赛博中远景建筑群
        this.background.drawCity(this.ctx);
        
        // 3. 渲染带有透视效果的跑道地面网格
        this.background.drawForegroundGrid(this.ctx, this.worldX);

        // 4. 【精准调用点】渲染超近景生活化资产（即压暗后的超近景住宅与全新增加的霓虹广告牌）
        this.background.drawForegroundAssets(this.ctx);

        // 5. 渲染跑道上的障碍物
        if (this.gameState === STATES.RUNNING || this.gameState === STATES.GAMEOVER) {
            this.world.draw(this.ctx);
        }

        // 6. 渲染角色
        this.player.draw(this.ctx);

        // 7. 渲染粒子碎屑
        this.particles.draw(this.ctx);
    }
}

// 启动引擎
window.addEventListener('DOMContentLoaded', () => {
    const engine = new GameEngine();
    requestAnimationFrame((t) => engine.loop(t));
});
