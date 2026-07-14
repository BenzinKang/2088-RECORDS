/* ============================================================
   2088 RECORDS — HIDDEN SIGNAL
   Cyberpunk Pixel-Art Endless Runner
   Pure Canvas2D / Vanilla JS — no external libraries.
   ============================================================ */
(() => {
  "use strict";

  /* ----------------------------------------------------------
     0. DOM refs & basic state
  ---------------------------------------------------------- */
  const canvas   = document.getElementById("game");
  const ctx      = canvas.getContext("2d", { alpha: false });
  const stage    = document.getElementById("stage");

  const scoreVal   = document.getElementById("scoreVal");
  const highVal    = document.getElementById("highVal");
  const statusDot  = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const comboBlock = document.getElementById("comboBlock");
  const comboText  = document.getElementById("comboText");
  const glitchLayer= document.getElementById("glitchLayer");

  const startScreen = document.getElementById("startScreen");
  const overScreen  = document.getElementById("overScreen");
  const startBtn    = document.getElementById("startBtn");
  const retryBtn    = document.getElementById("retryBtn");
  const overScoreEl = document.getElementById("overScore");
  const overHighEl  = document.getElementById("overHigh");

  const STORAGE_KEY = "2088_records_highscore";
  const STATES = { START: "start", PLAYING: "playing", OVER: "over" };
  let gameState = STATES.START;

  const COLORS = {
    bgDeep:  "#050A18",
    bgPanel: "#091526",
    blue:    "#00C8FF",
    cyan:    "#38E0FF",
    purple:  "#6E5CFF",
    pink:    "#FF3E9A",
    danger:  "#FF4D6D",
    warnAmber:"#FFC85C"
  };

  /* ----------------------------------------------------------
     1. Seeded RNG (deterministic background generation)
  ---------------------------------------------------------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = (r, a = 0, b = 1) => a + r() * (b - a);
  const randInt = (r, a, b) => Math.floor(rand(r, a, b + 1));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ----------------------------------------------------------
     2. Canvas sizing
  ---------------------------------------------------------- */
  let cssW = 0, cssH = 0, dpr = 1, worldScale = 1;
  let groundY = 0;

  function resize() {
    const rect = stage.getBoundingClientRect();
    cssW = Math.max(320, rect.width);
    cssH = Math.max(320, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width  = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    worldScale = clamp(cssH / 640, 0.62, 1.55);
    groundY = cssH * 0.76;

    buildCaches();
  }

  /* ----------------------------------------------------------
     3. Offscreen tile caches for parallax layers (perf)
  ---------------------------------------------------------- */
  let farCache, midCache, nearCache;
  let farTileW, midTileW, nearTileW;
  let farItems = [], midItems = [], nearItems = [], flickerPool = [];

  function makeOffscreen(w, h) {
    const c = document.createElement("canvas");
    c.width  = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const cx = c.getContext("2d");
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, ctx: cx };
  }

  function buildCaches() {
    const rFar  = mulberry32(1337);
    const rMid  = mulberry32(9001);
    const rNear = mulberry32(4242);

    /* ---- FAR SKYLINE (super-tall towers, mega ad screens) ---- */
    farTileW = Math.max(cssW * 1.6, 2200) * worldScale;
    const farTop = cssH * 0.10;
    const farBase = groundY - cssH * 0.30;
    farItems = [];
    let x = -40;
    while (x < farTileW + 40) {
      const w = rand(rFar, 46, 110) * worldScale;
      const h = rand(rFar, 120, farBase - farTop + 90) * worldScale;
      const hue = pick(rFar, ["#0B1C33", "#0E223D", "#101B36", "#152244"]);
      const hasAntenna = rFar() > 0.55;
      const hasBillboard = rFar() > 0.72;
      farItems.push({ x, w, h, hue, hasAntenna, hasBillboard, seed: rFar() * 1000 });
      x += w * rand(rFar, 0.35, 0.7);
    }
    farCache = makeOffscreen(farTileW, cssH);
    drawFarTile(farCache.ctx, farItems, farBase);

    /* ---- MID CITY (Japanese-future low blocks, neon signage) ---- */
    midTileW = Math.max(cssW * 1.4, 1800) * worldScale;
    const midBase = groundY - cssH * 0.02;
    const midTop = groundY - cssH * 0.30;
    midItems = [];
    x = -30;
    while (x < midTileW + 30) {
      const w = rand(rMid, 60, 150) * worldScale;
      const h = rand(rMid, 70, midBase - midTop) * worldScale;
      const hue = pick(rMid, ["#0C1830", "#122036", "#0F1C2E", "#182338"]);
      const neon = pick(rMid, [COLORS.cyan, COLORS.purple, COLORS.pink, COLORS.blue]);
      midItems.push({ x, w, h, hue, neon, sign: rMid() > 0.4, seed: rMid() * 1000 });
      x += w * rand(rMid, 0.55, 0.85);
    }
    midCache = makeOffscreen(midTileW, cssH);
    drawMidTile(midCache.ctx, midItems, midBase);

    /* ---- NEAR FOREGROUND (street furniture) ---- */
    nearTileW = Math.max(cssW * 1.1, 1300) * worldScale;
    nearItems = [];
    x = -20;
    const kinds = ["pole", "sign", "hydrant", "bin", "fence", "vending", "pipe", "shopfront"];
    while (x < nearTileW + 20) {
      const kind = pick(rNear, kinds);
      const w = rand(rNear, 18, 70) * worldScale;
      nearItems.push({ x, kind, w, seed: rNear() * 1000, neon: pick(rNear, [COLORS.cyan, COLORS.pink, COLORS.purple]) });
      x += rand(rNear, 90, 230) * worldScale;
    }
    nearCache = makeOffscreen(nearTileW, cssH);
    drawNearTile(nearCache.ctx, nearItems);

    /* flicker pool: random subset of far/mid windows redrawn live for animation */
    flickerPool = [];
    for (let i = 0; i < 26; i++) {
      flickerPool.push({
        layer: rFar() > 0.5 ? "far" : "mid",
        x: rand(rFar, 0, farTileW),
        y: rand(rFar, farTop, farBase),
        w: rand(rFar, 3, 7) * worldScale,
        h: rand(rFar, 4, 9) * worldScale,
        color: pick(rFar, [COLORS.cyan, COLORS.purple, COLORS.blue, COLORS.pink]),
        phase: rFar() * Math.PI * 2,
        speed: rand(rFar, 1.2, 3.2)
      });
    }
  }

  function windowGrid(cx, x, y, w, h, seed, base) {
    const rw = mulberry32(Math.floor(seed * 999));
    const cols = Math.max(2, Math.floor(w / (7 * worldScale)));
    const rows = Math.max(3, Math.floor(h / (9 * worldScale)));
    const cw = w / cols, rh = h / rows;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rw() > 0.42) continue;
        const lit = rw() > 0.35;
        cx.fillStyle = lit ? pick(rw, [COLORS.cyan, COLORS.blue, COLORS.purple]) : "rgba(255,255,255,0.05)";
        cx.globalAlpha = lit ? rand(rw, 0.35, 0.9) : 0.5;
        cx.fillRect(x + c * cw + 1, y + r * rh + 1, Math.max(1, cw - 2), Math.max(1, rh - 2));
      }
    }
    cx.globalAlpha = 1;
  }

  function drawFarTile(cx, items, baseY) {
    for (const b of items) {
      const top = baseY - b.h;
      cx.fillStyle = b.hue;
      cx.fillRect(b.x, top, b.w, b.h + 40);
      // glass sheen edge
      const grad = cx.createLinearGradient(b.x, 0, b.x + b.w, 0);
      grad.addColorStop(0, "rgba(56,224,255,0.05)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.02)");
      grad.addColorStop(1, "rgba(110,92,255,0.06)");
      cx.fillStyle = grad;
      cx.fillRect(b.x, top, b.w, b.h + 40);

      windowGrid(cx, b.x, top, b.w, b.h, b.seed, baseY);

      if (b.hasAntenna) {
        cx.strokeStyle = "rgba(180,220,255,0.5)";
        cx.lineWidth = 1.4;
        cx.beginPath();
        cx.moveTo(b.x + b.w * 0.5, top);
        cx.lineTo(b.x + b.w * 0.5, top - 22 * worldScale);
        cx.stroke();
        cx.fillStyle = COLORS.danger;
        cx.fillRect(b.x + b.w * 0.5 - 1.5, top - 24 * worldScale, 3, 3);
      }
      if (b.hasBillboard) {
        const bw = b.w * 0.8, bh = 16 * worldScale;
        const by = top + b.h * 0.22;
        const grad2 = cx.createLinearGradient(b.x, by, b.x + bw, by);
        grad2.addColorStop(0, COLORS.purple);
        grad2.addColorStop(1, COLORS.pink);
        cx.fillStyle = grad2;
        cx.globalAlpha = 0.75;
        cx.fillRect(b.x + b.w * 0.1, by, bw, bh);
        cx.globalAlpha = 1;
      }
    }
  }

  function drawMidTile(cx, items, baseY) {
    for (const s of items) {
      const top = baseY - s.h;
      cx.fillStyle = s.hue;
      cx.fillRect(s.x, top, s.w, s.h + 30);
      windowGrid(cx, s.x, top, s.w, s.h * 0.75, s.seed, baseY);
      // rooftop unit
      cx.fillStyle = "rgba(0,0,0,0.35)";
      cx.fillRect(s.x + s.w * 0.15, top - 6 * worldScale, s.w * 0.3, 6 * worldScale);

      if (s.sign) {
        const sw = 6 * worldScale, sh = s.h * rand(mulberry32(s.seed | 0), 0.35, 0.65);
        const sx = s.x + s.w + 1;
        cx.fillStyle = s.neon;
        cx.globalAlpha = 0.85;
        cx.fillRect(sx, top + s.h - sh, sw, sh);
        cx.globalAlpha = 1;
      }
    }
    // ground haze strip
    const g = cx.createLinearGradient(0, baseY - 40, 0, baseY + 10);
    g.addColorStop(0, "rgba(5,10,24,0)");
    g.addColorStop(1, "rgba(5,10,24,0.9)");
    cx.fillStyle = g;
    cx.fillRect(0, baseY - 40, cx.canvas.width, 60);
  }

  function drawNearTile(cx, items) {
    const baseY = groundY;
    for (const o of items) {
      const s = worldScale;
      switch (o.kind) {
        case "pole": {
          cx.fillStyle = "#0A1220";
          cx.fillRect(o.x, baseY - 120 * s, 4 * s, 120 * s);
          cx.strokeStyle = "rgba(56,224,255,0.25)";
          cx.beginPath();
          cx.moveTo(o.x - 40 * s, baseY - 110 * s);
          cx.lineTo(o.x + 60 * s, baseY - 100 * s);
          cx.stroke();
          break;
        }
        case "sign": {
          cx.fillStyle = "#0A1220";
          cx.fillRect(o.x, baseY - 70 * s, 3 * s, 70 * s);
          cx.fillStyle = o.neon;
          cx.globalAlpha = 0.85;
          cx.fillRect(o.x - 14 * s, baseY - 90 * s, 34 * s, 14 * s);
          cx.globalAlpha = 1;
          break;
        }
        case "hydrant": {
          cx.fillStyle = COLORS.danger;
          cx.fillRect(o.x, baseY - 22 * s, 10 * s, 22 * s);
          cx.fillStyle = "#3a0d16";
          cx.fillRect(o.x - 2 * s, baseY - 24 * s, 14 * s, 4 * s);
          break;
        }
        case "bin": {
          cx.fillStyle = "#132038";
          cx.fillRect(o.x, baseY - 26 * s, 16 * s, 26 * s);
          cx.strokeStyle = "rgba(0,200,255,0.3)";
          cx.strokeRect(o.x, baseY - 26 * s, 16 * s, 26 * s);
          break;
        }
        case "fence": {
          cx.strokeStyle = "rgba(127,166,201,0.35)";
          cx.lineWidth = 2 * s;
          for (let i = 0; i < o.w; i += 8 * s) {
            cx.beginPath();
            cx.moveTo(o.x + i, baseY);
            cx.lineTo(o.x + i, baseY - 20 * s);
            cx.stroke();
          }
          cx.beginPath();
          cx.moveTo(o.x, baseY - 14 * s);
          cx.lineTo(o.x + o.w, baseY - 14 * s);
          cx.stroke();
          break;
        }
        case "vending": {
          cx.fillStyle = "#0E1B33";
          cx.fillRect(o.x, baseY - 46 * s, 22 * s, 46 * s);
          cx.fillStyle = o.neon;
          cx.globalAlpha = 0.8;
          cx.fillRect(o.x + 3 * s, baseY - 40 * s, 16 * s, 26 * s);
          cx.globalAlpha = 1;
          break;
        }
        case "pipe": {
          cx.strokeStyle = "#1C2A44";
          cx.lineWidth = 5 * s;
          cx.beginPath();
          cx.moveTo(o.x, baseY);
          cx.lineTo(o.x, baseY - 34 * s);
          cx.lineTo(o.x + 24 * s, baseY - 34 * s);
          cx.stroke();
          break;
        }
        case "shopfront": {
          cx.fillStyle = "#0D1830";
          cx.fillRect(o.x, baseY - 54 * s, o.w, 54 * s);
          cx.fillStyle = o.neon;
          cx.globalAlpha = 0.7;
          cx.fillRect(o.x + 4 * s, baseY - 40 * s, o.w - 8 * s, 10 * s);
          cx.globalAlpha = 1;
          cx.fillStyle = "rgba(255,255,255,0.06)";
          cx.fillRect(o.x + 4 * s, baseY - 26 * s, o.w - 8 * s, 20 * s);
          break;
        }
      }
    }
    // road surface
    const roadGrad = cx.createLinearGradient(0, baseY, 0, cx.canvas.height / dpr);
    roadGrad.addColorStop(0, "#0B1424");
    roadGrad.addColorStop(1, "#02050C");
    cx.fillStyle = roadGrad;
    cx.fillRect(0, baseY, cx.canvas.width, (cx.canvas.height / dpr) - baseY);
    cx.strokeStyle = "rgba(0,200,255,0.18)";
    cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(0, baseY + 1);
    cx.lineTo(cx.canvas.width, baseY + 1);
    cx.stroke();
  }

  function drawTiledLayer(cache, tileW, scrollX, screenW, screenH, alpha = 1) {
    const off = -(((scrollX % tileW) + tileW) % tileW);
    ctx.globalAlpha = alpha;
    let sx = off;
    while (sx < screenW) {
      ctx.drawImage(cache.canvas, 0, 0, cache.canvas.width, cache.canvas.height, sx, 0, tileW, screenH);
      sx += tileW;
    }
    ctx.globalAlpha = 1;
  }

  /* ----------------------------------------------------------
     4. Sky (static gradient cached, dynamic clouds/vehicles live)
  ---------------------------------------------------------- */
  let skyCache = null;
  function buildSkyCache() {
    skyCache = makeOffscreen(cssW, cssH);
    const cx = skyCache.ctx;
    const g = cx.createLinearGradient(0, 0, 0, cssH * 0.85);
    g.addColorStop(0, "#1a1035");
    g.addColorStop(0.28, "#3a1f52");
    g.addColorStop(0.5, "#8a3a63");
    g.addColorStop(0.68, "#e0674f");
    g.addColorStop(0.82, "#ffb15e");
    g.addColorStop(1, "#1c2a4a");
    cx.fillStyle = g;
    cx.fillRect(0, 0, cssW, cssH);

    // sun
    const sunX = cssW * 0.72, sunY = cssH * 0.34, sunR = cssH * 0.16;
    const sg = cx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.4);
    sg.addColorStop(0, "rgba(255,214,140,0.95)");
    sg.addColorStop(0.35, "rgba(255,150,120,0.45)");
    sg.addColorStop(1, "rgba(255,150,120,0)");
    cx.fillStyle = sg;
    cx.beginPath(); cx.arc(sunX, sunY, sunR * 2.4, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#FFE3B0";
    cx.beginPath(); cx.arc(sunX, sunY, sunR * 0.55, 0, Math.PI * 2); cx.fill();

    // distant fog band near horizon
    const fog = cx.createLinearGradient(0, cssH * 0.55, 0, cssH * 0.86);
    fog.addColorStop(0, "rgba(255,180,140,0)");
    fog.addColorStop(1, "rgba(255,190,150,0.28)");
    cx.fillStyle = fog;
    cx.fillRect(0, cssH * 0.55, cssW, cssH * 0.31);
  }

  class Cloud {
    constructor(r) {
      this.reset(r, true);
    }
    reset(r, init) {
      this.x = init ? rand(r, 0, cssW) : cssW + rand(r, 20, 200);
      this.y = rand(r, cssH * 0.06, cssH * 0.32);
      this.w = rand(r, 60, 160) * worldScale;
      this.h = this.w * 0.28;
      this.speed = rand(r, 4, 10) * worldScale;
      this.alpha = rand(r, 0.12, 0.3);
    }
    update(dt) {
      this.x -= this.speed * dt;
      if (this.x < -this.w - 20) this.reset(Math.random, false);
    }
    draw() {
      ctx.fillStyle = `rgba(255,220,210,${this.alpha})`;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.w * 0.5, this.h * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(this.x + this.w * 0.3, this.y + this.h * 0.15, this.w * 0.35, this.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  class FlyingVehicle {
    constructor(r) { this.reset(r, true); }
    reset(r, init) {
      this.type = pick(r, ["plane", "cruiser", "airship", "cargo"]);
      this.y = rand(r, cssH * 0.08, cssH * 0.42);
      this.x = init ? rand(r, 0, cssW) : cssW + rand(r, 40, 300);
      this.dir = -1;
      this.speed = (this.type === "airship" ? rand(r, 3, 6) : rand(r, 14, 30)) * worldScale;
      this.scale = rand(r, 0.7, 1.3) * worldScale;
      this.blinkPhase = r() * Math.PI * 2;
    }
    update(dt, t) {
      this.x += this.dir * this.speed * dt;
      if (this.x < -140) this.reset(Math.random, false);
    }
    draw(t) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.scale, this.scale);
      const blink = Math.sin(t * 4 + this.blinkPhase) > 0.6;
      if (this.type === "plane") {
        ctx.fillStyle = "rgba(20,26,40,0.85)";
        ctx.fillRect(-24, -2, 48, 4);
        ctx.fillRect(-6, -6, 4, 12);
        ctx.fillStyle = blink ? COLORS.danger : "rgba(255,80,90,0.3)";
        ctx.fillRect(-26, -1, 2, 2);
      } else if (this.type === "cruiser") {
        ctx.fillStyle = "#111a2c";
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(20, -6); ctx.lineTo(30, 0); ctx.lineTo(20, 6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = COLORS.cyan;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(-18, -2, 26, 2);
        ctx.globalAlpha = 1;
      } else if (this.type === "airship") {
        ctx.fillStyle = "rgba(30,20,45,0.8)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 46, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.purple;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(-30, -3, 60, 3);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "#0d1420";
        ctx.fillRect(-34, -8, 68, 16);
        ctx.fillStyle = blink ? COLORS.warnAmber : "rgba(255,200,90,0.25)";
        ctx.fillRect(-34, -8, 4, 4);
        ctx.fillRect(30, 4, 4, 4);
      }
      ctx.restore();
    }
  }

  /* ----------------------------------------------------------
     5. Particles
  ---------------------------------------------------------- */
  class Particle {
    constructor(x, y, opt = {}) {
      this.x = x; this.y = y;
      this.vx = opt.vx ?? rand(Math.random, -60, 60);
      this.vy = opt.vy ?? rand(Math.random, -160, -40);
      this.g = opt.g ?? 420;
      this.life = opt.life ?? 0.6;
      this.age = 0;
      this.size = opt.size ?? rand(Math.random, 2, 4);
      this.color = opt.color ?? COLORS.cyan;
      this.fade = opt.fade ?? true;
    }
    update(dt) {
      this.age += dt;
      this.vy += this.g * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    get dead() { return this.age >= this.life; }
    draw() {
      const t = 1 - this.age / this.life;
      ctx.globalAlpha = this.fade ? clamp(t, 0, 1) : 1;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
      ctx.globalAlpha = 1;
    }
  }
  let particles = [];
  function burst(x, y, color, count = 14, opt = {}) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, {
        vx: rand(Math.random, -140, 140),
        vy: rand(Math.random, -220, -20),
        color, life: rand(Math.random, 0.35, 0.75), size: rand(Math.random, 2, 5),
        ...opt
      }));
    }
  }

  /* ----------------------------------------------------------
     6. Player
  ---------------------------------------------------------- */
  class Player {
    constructor() { this.reset(); }
    reset() {
      this.w = 30 * worldScale;
      this.h = 44 * worldScale;
      this.x = cssW * 0.16;
      this.y = groundY - this.h;
      this.vy = 0;
      this.grounded = true;
      this.state = "run";
      this.runT = 0;
      this.hitT = 0;
      this.spin = 0;
      this.duckAmt = 0;
      this.dust = 0;
    }
    jump() {
      if (this.grounded && gameState === STATES.PLAYING) {
        this.vy = -JUMP_VELOCITY * worldScale;
        this.grounded = false;
        this.state = "jump";
        burst(this.x + this.w / 2, groundY, COLORS.cyan, 8, { g: 600, life: 0.3, size: 2 });
      }
    }
    hit() {
      if (this.state === "hit") return;
      this.state = "hit";
      this.hitT = 0;
      this.spin = 0;
    }
    update(dt) {
      if (this.state === "hit") {
        this.hitT += dt;
        this.spin += dt * 14;
        this.vy += GRAVITY * worldScale * dt;
        this.y += this.vy * dt;
        this.x -= 40 * worldScale * dt;
        return;
      }
      // physics
      this.vy += GRAVITY * worldScale * dt;
      this.y += this.vy * dt;
      if (this.y + this.h >= groundY) {
        this.y = groundY - this.h;
        this.vy = 0;
        if (!this.grounded) burst(this.x + this.w / 2, groundY, "rgba(180,210,255,0.6)", 6, { g: 500, life: 0.25, size: 2, vy: -60 });
        this.grounded = true;
      } else {
        this.grounded = false;
      }
      this.state = this.grounded ? "run" : (this.vy < 0 ? "jump" : "fall");
      if (this.state === "run") {
        this.runT += dt * (7 + gameSpeed / 90);
        this.dust += dt;
        if (this.dust > 0.09) {
          this.dust = 0;
          particles.push(new Particle(this.x + 4, groundY - 2, {
            vx: rand(Math.random, -20, -70), vy: rand(Math.random, -30, -5),
            g: 200, life: 0.35, size: rand(Math.random, 1.5, 3), color: "rgba(150,190,220,0.35)"
          }));
        }
      }
    }
    draw() {
      const s = worldScale;
      ctx.save();
      const cx0 = this.x + this.w / 2, cy0 = this.y + this.h / 2;
      if (this.state === "hit") {
        ctx.translate(cx0, cy0);
        ctx.rotate(this.spin);
        ctx.translate(-cx0, -cy0);
      }
      const bob = this.state === "run" ? Math.sin(this.runT) * 2 * s : 0;
      const legPhase = Math.sin(this.runT);
      const x = this.x, y = this.y + bob, w = this.w, h = this.h;

      // neon rim glow
      ctx.shadowColor = this.state === "hit" ? COLORS.danger : COLORS.cyan;
      ctx.shadowBlur = 14 * s;

      // legs
      ctx.fillStyle = "#101a30";
      if (this.state === "run") {
        const l1 = legPhase * 6 * s, l2 = -legPhase * 6 * s;
        ctx.fillRect(x + w * 0.22, y + h * 0.62 + Math.max(0, l1), w * 0.22, h * 0.38 - Math.max(0, l1));
        ctx.fillRect(x + w * 0.56, y + h * 0.62 + Math.max(0, l2), w * 0.22, h * 0.38 - Math.max(0, l2));
      } else {
        ctx.fillRect(x + w * 0.24, y + h * 0.6, w * 0.2, h * 0.3);
        ctx.fillRect(x + w * 0.56, y + h * 0.6, w * 0.2, h * 0.3);
      }

      // torso
      ctx.fillStyle = "#141F3A";
      ctx.fillRect(x + w * 0.15, y + h * 0.28, w * 0.7, h * 0.4);
      // chest neon line
      ctx.fillStyle = this.state === "hit" ? COLORS.danger : COLORS.purple;
      ctx.fillRect(x + w * 0.18, y + h * 0.42, w * 0.64, h * 0.05);

      // backpack thruster
      ctx.fillStyle = "rgba(0,200,255,0.55)";
      ctx.fillRect(x + w * 0.02, y + h * 0.35, w * 0.12, h * 0.28);
      if (this.state === "jump" || this.state === "fall") {
        ctx.fillStyle = "rgba(56,224,255,0.5)";
        ctx.fillRect(x + w * 0.03, y + h * 0.6, w * 0.09, h * 0.22 + Math.abs(this.vy) * 0.01);
      }

      // arms
      ctx.fillStyle = "#101a30";
      const armSwing = this.state === "run" ? legPhase * 5 * s : (this.state === "jump" ? -8 * s : 6 * s);
      ctx.fillRect(x + w * 0.68, y + h * 0.34 + armSwing * 0.2, w * 0.14, h * 0.28);

      // head
      ctx.fillStyle = "#182545";
      ctx.fillRect(x + w * 0.22, y, w * 0.56, h * 0.3);
      // visor
      ctx.fillStyle = this.state === "hit" ? COLORS.danger : COLORS.cyan;
      ctx.shadowBlur = 10 * s;
      ctx.fillRect(x + w * 0.26, y + h * 0.1, w * 0.48, h * 0.08);

      ctx.shadowBlur = 0;
      ctx.restore();
    }
    get hitbox() {
      return { x: this.x + this.w * 0.22, y: this.y + this.h * 0.05, w: this.w * 0.56, h: this.h * 0.9 };
    }
  }

  const GRAVITY = 2100;
  const JUMP_VELOCITY = 780;

  /* ----------------------------------------------------------
     7. Obstacles & Collectibles
  ---------------------------------------------------------- */
  const OBSTACLE_TYPES = ["barrier", "robot", "droneLow"];
  class Obstacle {
    constructor(type, speed) {
      this.type = type;
      const s = worldScale;
      if (type === "barrier") {
        this.w = 22 * s; this.h = 34 * s;
        this.y = groundY - this.h;
      } else if (type === "robot") {
        this.w = 30 * s; this.h = 40 * s;
        this.y = groundY - this.h;
      } else { // droneLow — flies at an altitude that intersects the jump arc; safe if you stay grounded
        this.w = 34 * s; this.h = 18 * s;
        this.y = groundY - this.h - rand(Math.random, 70, 110) * s;
        this.baseY = this.y;
        this.bobT = Math.random() * Math.PI * 2;
      }
      this.x = cssW + this.w + 10;
      this.dead = false;
    }
    update(dt, speed) {
      this.x -= speed * dt;
      if (this.type === "droneLow") {
        this.bobT += dt * 3;
        this.y = this.baseY + Math.sin(this.bobT) * 6 * worldScale;
      }
      if (this.x + this.w < -10) this.dead = true;
    }
    draw() {
      const s = worldScale;
      ctx.save();
      if (this.type === "barrier") {
        ctx.fillStyle = "#1a2440";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = COLORS.warnAmber;
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(this.x + 2, this.y + 4 + i * (this.h - 8) / 3, this.w - 4, 3 * s);
        }
        ctx.strokeStyle = "rgba(255,200,90,0.5)";
        ctx.strokeRect(this.x, this.y, this.w, this.h);
      } else if (this.type === "robot") {
        ctx.shadowColor = COLORS.danger;
        ctx.shadowBlur = 8 * s;
        ctx.fillStyle = "#241522";
        ctx.fillRect(this.x + this.w * 0.15, this.y, this.w * 0.7, this.h * 0.6);
        ctx.fillRect(this.x + this.w * 0.05, this.y + this.h * 0.6, this.w * 0.9, this.h * 0.4);
        ctx.fillStyle = COLORS.danger;
        ctx.fillRect(this.x + this.w * 0.3, this.y + this.h * 0.15, this.w * 0.4, this.h * 0.12);
        ctx.shadowBlur = 0;
      } else {
        ctx.shadowColor = COLORS.purple;
        ctx.shadowBlur = 10 * s;
        ctx.fillStyle = "#151233";
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.purple;
        ctx.fillRect(this.x + this.w * 0.35, this.y + this.h * 0.35, this.w * 0.3, this.h * 0.3);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
    get hitbox() {
      const pad = this.w * 0.12;
      return { x: this.x + pad, y: this.y + pad * 0.6, w: this.w - pad * 2, h: this.h - pad };
    }
  }

  const COLLECT_TYPES = ["fragment", "note", "core"];
  class Collectible {
    constructor(type) {
      this.type = type;
      const s = worldScale;
      this.size = type === "core" ? 16 * s : 12 * s;
      this.x = cssW + 40;
      const high = Math.random() > 0.5;
      this.y = high ? groundY - rand(Math.random, 90, 150) * s : groundY - rand(Math.random, 24, 46) * s;
      this.t = Math.random() * Math.PI * 2;
      this.dead = false;
      this.collected = false;
    }
    update(dt, speed) {
      this.x -= speed * dt;
      this.t += dt * 4;
      if (this.x < -40) this.dead = true;
    }
    draw() {
      const s = worldScale;
      const bob = Math.sin(this.t) * 4 * s;
      const cx0 = this.x, cy0 = this.y + bob;
      ctx.save();
      ctx.translate(cx0, cy0);
      if (this.type === "fragment") {
        ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 10 * s;
        ctx.fillStyle = COLORS.cyan;
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      } else if (this.type === "note") {
        ctx.shadowColor = COLORS.pink; ctx.shadowBlur = 10 * s;
        ctx.fillStyle = COLORS.pink;
        ctx.beginPath();
        ctx.ellipse(0, this.size * 0.25, this.size * 0.45, this.size * 0.32, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(this.size * 0.3, -this.size * 0.9, this.size * 0.12, this.size * 1.1);
      } else {
        ctx.shadowColor = COLORS.purple; ctx.shadowBlur = 14 * s;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        grad.addColorStop(0, "#fff");
        grad.addColorStop(0.4, COLORS.purple);
        grad.addColorStop(1, "rgba(110,92,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    get hitbox() {
      return { x: this.x - this.size, y: this.y - this.size, w: this.size * 2, h: this.size * 2 };
    }
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ----------------------------------------------------------
     8. Game state
  ---------------------------------------------------------- */
  const BASE_SPEED = 260;
  const MAX_SPEED = 620;
  let gameSpeed = BASE_SPEED;
  let distance = 0;
  let score = 0;
  let highScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let combo = 0;
  let comboTimer = 0;
  let obstacles = [], collectibles = [];
  let spawnTimer = 0, collectTimer = 0;
  let player = null;
  let clouds = [], vehicles = [];
  let shakeT = 0, shakeMag = 0;
  let elapsed = 0;

  highVal.textContent = String(highScore).padStart(6, "0");

  function initEntities() {
    const rc = mulberry32(77);
    clouds = Array.from({ length: 5 }, () => new Cloud(rc));
    vehicles = Array.from({ length: 3 }, () => new FlyingVehicle(rc));
    player = new Player();
  }

  function resetGame() {
    gameSpeed = BASE_SPEED;
    distance = 0; score = 0; combo = 0; comboTimer = 0; elapsed = 0;
    obstacles = []; collectibles = []; particles = [];
    spawnTimer = 1.0; collectTimer = 0.6;
    player.reset();
    shakeT = 0;
    comboBlock.classList.remove("show");
    setStatus(false);
  }

  function setStatus(danger) {
    statusDot.classList.toggle("warn", danger);
    statusText.textContent = danger ? "SYSTEM STATUS: WARNING" : "SYSTEM STATUS: ONLINE";
  }

  function startGame() {
    gameState = STATES.PLAYING;
    resetGame();
    startScreen.classList.add("hidden");
    overScreen.classList.add("hidden");
  }

  function endGame() {
    gameState = STATES.OVER;
    const finalScore = Math.floor(score);
    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem(STORAGE_KEY, String(highScore));
    }
    overScoreEl.textContent = String(finalScore).padStart(6, "0");
    overHighEl.textContent = String(highScore).padStart(6, "0");
    highVal.textContent = String(highScore).padStart(6, "0");
    document.getElementById("overEyebrow").textContent =
      finalScore >= highScore && finalScore > 0 ? "// NEW RECORD SIGNAL" : "// SIGNAL LOST";
    setTimeout(() => overScreen.classList.remove("hidden"), 550);
    statusText.textContent = "SYSTEM STATUS: OFFLINE";
    statusDot.classList.remove("warn");
  }

  function triggerGlitch() {
    glitchLayer.classList.remove("active");
    void glitchLayer.offsetWidth;
    glitchLayer.classList.add("active");
  }

  function screenShake(mag, t) { shakeMag = mag; shakeT = t; }

  /* ----------------------------------------------------------
     9. Spawning
  ---------------------------------------------------------- */
  function spawnObstacle() {
    const type = pick(Math, OBSTACLE_TYPES.map((_, i) => i)); // placeholder unused
  }
  function chooseObstacleType() {
    const r = Math.random();
    if (r < 0.42) return "barrier";
    if (r < 0.75) return "robot";
    return "droneLow";
  }

  function trySpawn(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const type = chooseObstacleType();
      obstacles.push(new Obstacle(type, gameSpeed));
      const speedFactor = clamp(gameSpeed / BASE_SPEED, 1, 2.4);
      spawnTimer = clamp(rand(Math.random, 0.85, 1.5) / speedFactor, 0.42, 1.6);
    }
    collectTimer -= dt;
    if (collectTimer <= 0) {
      if (Math.random() > 0.15) {
        const type = pick(Math, COLLECT_TYPES);
        collectibles.push(new Collectible(type));
      }
      collectTimer = rand(Math.random, 0.6, 1.3);
    }
  }

  /* ----------------------------------------------------------
     10. Update / Draw main loop
  ---------------------------------------------------------- */
  function updateHUD() {
    scoreVal.textContent = String(Math.floor(score)).padStart(6, "0");
  }

  function showCombo(n) {
    comboText.textContent = `COMBO x${n}`;
    comboBlock.classList.add("show");
    clearTimeout(showCombo._t);
    showCombo._t = setTimeout(() => comboBlock.classList.remove("show"), 900);
  }

  function update(dt) {
    if (gameState !== STATES.PLAYING) return;
    elapsed += dt;
    gameSpeed = clamp(BASE_SPEED + elapsed * 6.2, BASE_SPEED, MAX_SPEED);
    distance += gameSpeed * dt;
    score += gameSpeed * dt * 0.045;

    player.update(dt);
    if (player.state === "hit" && player.y > cssH + 100) {
      endGame();
      return;
    }

    trySpawn(dt);

    for (const o of obstacles) o.update(dt, gameSpeed);
    obstacles = obstacles.filter(o => !o.dead);

    for (const c of collectibles) c.update(dt, gameSpeed);
    collectibles = collectibles.filter(c => !c.dead && !c.collected);

    if (player.state !== "hit") {
      const pb = player.hitbox;
      for (const o of obstacles) {
        if (aabb(pb, o.hitbox)) {
          player.hit();
          triggerGlitch();
          screenShake(10, 0.35);
          setStatus(true);
          burst(player.x + player.w / 2, player.y + player.h / 2, COLORS.danger, 18, { g: 500 });
          combo = 0;
          break;
        }
      }
      for (const c of collectibles) {
        if (!c.collected && aabb(pb, c.hitbox)) {
          c.collected = true;
          const pts = c.type === "core" ? 80 : c.type === "note" ? 40 : 20;
          combo++;
          comboTimer = 2;
          score += pts + combo * 2;
          const color = c.type === "core" ? COLORS.purple : c.type === "note" ? COLORS.pink : COLORS.cyan;
          burst(c.x, c.y, color, 10, { g: 300, life: 0.4 });
          if (combo >= 3) showCombo(combo);
        }
      }
    }

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 0;
    }

    for (const p of particles) p.update(dt);
    particles = particles.filter(p => !p.dead);

    for (const c of clouds) c.update(dt);
    for (const v of vehicles) v.update(dt, elapsed);

    if (shakeT > 0) shakeT -= dt;

    updateHUD();
  }

  function draw(t) {
    ctx.save();
    if (shakeT > 0) {
      const m = shakeMag * (shakeT / 0.35);
      ctx.translate(rand(Math.random, -m, m), rand(Math.random, -m, m));
    }

    // sky
    if (skyCache) ctx.drawImage(skyCache.canvas, 0, 0, skyCache.canvas.width, skyCache.canvas.height, 0, 0, cssW, cssH);
    else { ctx.fillStyle = COLORS.bgDeep; ctx.fillRect(0, 0, cssW, cssH); }

    for (const c of clouds) c.draw();
    for (const v of vehicles) v.draw(t);

    // parallax layers, near = fastest
    const farOffset = distance * 0.10;
    const midOffset = distance * 0.28;
    const nearOffset = distance * 1.0;

    drawTiledLayer(farCache, farTileW, farOffset, cssW, cssH, 0.92);

    // live flicker overlay for far/mid windows
    for (const f of flickerPool) {
      const on = Math.sin(t * f.speed + f.phase) > 0.55;
      if (!on) continue;
      const layerOffset = f.layer === "far" ? farOffset : midOffset;
      const tileW = f.layer === "far" ? farTileW : midTileW;
      const off = -(((layerOffset % tileW) + tileW) % tileW);
      let sx = off;
      while (sx < cssW) {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(sx + f.x, f.y, f.w, f.h);
        sx += tileW;
      }
      ctx.globalAlpha = 1;
    }

    drawTiledLayer(midCache, midTileW, midOffset, cssW, cssH, 0.96);
    drawTiledLayer(nearCache, nearTileW, nearOffset, cssW, cssH, 1);

    // ground accent line (subtle motion lines for speed feel)
    if (gameState === STATES.PLAYING) {
      ctx.strokeStyle = "rgba(0,200,255,0.12)";
      ctx.lineWidth = 1;
      const lineOffset = (distance * 1.4) % 60;
      for (let x = -lineOffset; x < cssW; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, cssH - 4);
        ctx.lineTo(x + 22, cssH - 4);
        ctx.stroke();
      }
    }

    for (const c of collectibles) c.draw();
    for (const o of obstacles) o.draw();
    if (player) player.draw();
    for (const p of particles) p.draw();

    ctx.restore();
  }

  /* ----------------------------------------------------------
     11. Loop
  ---------------------------------------------------------- */
  let lastTime = 0;
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    let dt = (ts - lastTime) / 1000;
    lastTime = ts;
    dt = Math.min(dt, 0.05); // clamp for tab-switch jank
    const t = ts / 1000;

    update(dt);
    draw(t);

    requestAnimationFrame(loop);
  }

  /* ----------------------------------------------------------
     12. Input
  ---------------------------------------------------------- */
  function handleJump(e) {
    if (e) e.preventDefault();
    if (gameState === STATES.START) { startGame(); return; }
    if (gameState === STATES.OVER) { startGame(); return; }
    if (gameState === STATES.PLAYING) player.jump();
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      handleJump(e);
    }
  }, { passive: false });

  stage.addEventListener("pointerdown", (e) => {
    // avoid double-trigger with the start/retry buttons which have their own handlers
    if (e.target.closest(".neon-btn")) return;
    handleJump(e);
  }, { passive: false });

  startBtn.addEventListener("click", (e) => { e.stopPropagation(); startGame(); });
  retryBtn.addEventListener("click", (e) => { e.stopPropagation(); startGame(); });

  document.addEventListener("touchmove", (e) => {
    if (gameState === STATES.PLAYING) e.preventDefault();
  }, { passive: false });

  window.addEventListener("resize", () => {
    resize();
    buildSkyCache();
  });
  window.addEventListener("orientationchange", () => {
    setTimeout(() => { resize(); buildSkyCache(); }, 200);
  });

  /* ----------------------------------------------------------
     13. Boot
  ---------------------------------------------------------- */
  resize();
  buildSkyCache();
  initEntities();
  setStatus(false);
  statusText.textContent = "SYSTEM STATUS: STANDBY";
  requestAnimationFrame(loop);

})();
