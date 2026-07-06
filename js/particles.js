/* ==========================================================================
   PARTICLES MODULE
   Ambient canvas particle field — digital fog / drifting light motes.
   ========================================================================== */

const ParticleField = (() => {
  let canvas, ctx, particles, width, height, animationId;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticles() {
    const count = Math.min(70, Math.floor((width * height) / 22000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.4,
      speedY: Math.random() * 0.25 + 0.05,
      drift: Math.random() * 0.4 - 0.2,
      alpha: Math.random() * 0.5 + 0.1,
      hue: Math.random() > 0.5 ? '0, 200, 255' : '110, 92, 255'
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.y -= p.speedY;
      p.x += p.drift;
      if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue}, ${p.alpha})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `rgba(${p.hue}, 0.6)`;
      ctx.fill();
    });
    animationId = requestAnimationFrame(draw);
  }

  function init() {
    canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    createParticles();

    if (reduceMotion) {
      // Draw a single static frame instead of a continuous animation loop.
      draw();
      cancelAnimationFrame(animationId);
      return;
    }
    draw();

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(animationId);
      else draw();
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', ParticleField.init);
