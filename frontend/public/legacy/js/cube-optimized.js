// Оптимизированный cube.js для главной страницы
(function() {
  'use strict';

  function normalPool(o) {
    var r = 0;
    do {
      var a = Math.round(normal({mean: o.mean, dev: o.dev}));
      if (a < o.pool.length && a >= 0) return o.pool[a];
      r++;
    } while (r < 100);
    return o.pool[0] || 0;
  }

  function randomNormal(o) {
    o = Object.assign({mean: 0, dev: 1, pool: []}, o);
    if (Array.isArray(o.pool) && o.pool.length > 0) {
      return normalPool(o);
    }
    var r, a, n, e, l = o.mean, t = o.dev;
    do {
      r = (a = 2 * Math.random() - 1) * a + (n = 2 * Math.random() - 1) * n;
    } while (r >= 1);
    e = a * Math.sqrt(-2 * Math.log(r) / r);
    return t * e + l;
  }

  const NUM_PARTICLES = 600;
  const PARTICLE_SIZE = 0.2;
  const SPEED = 30000;

  let particles = [];
  let canvas = null;
  let ctx = null;
  let animationId = null;
  let isInitialized = false;

  function rand(low, high) {
    return Math.random() * (high - low) + low;
  }

  function createParticle() {
    const colour = {
      r: 255,
      g: 187,
      b: 0,
      a: rand(0, 1),
    };
    return {
      x: -2,
      y: -2,
      diameter: Math.max(0, randomNormal({ mean: PARTICLE_SIZE, dev: PARTICLE_SIZE / 2 })),
      duration: randomNormal({ mean: SPEED, dev: SPEED * 0.1 }),
      amplitude: randomNormal({ mean: 16, dev: 2 }),
      offsetY: randomNormal({ mean: 0, dev: 20 }),
      arc: Math.PI * 2,
      startTime: performance.now() - rand(0, SPEED),
      colour: `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a})`,
    };
  }

  function moveParticle(particle, time) {
    const progress = ((time - particle.startTime) % particle.duration) / particle.duration;
    return {
      ...particle,
      x: progress,
      y: ((Math.sin(progress * particle.arc) * particle.amplitude) + particle.offsetY),
    };
  }

  function drawParticle(particle) {
    if (!canvas || !ctx) return;
    const vh = canvas.height / 100;

    ctx.fillStyle = particle.colour;
    ctx.beginPath();
    ctx.ellipse(
      particle.x * canvas.width,
      particle.y * vh + (canvas.height / 2),
      particle.diameter * vh,
      particle.diameter * vh,
      0,
      0,
      2 * Math.PI
    );
    ctx.fill();
  }

  function draw(time) {
    if (!canvas || !ctx) return;

    // Move particles
    particles = particles.map(particle => moveParticle(particle, time));

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the particles
    particles.forEach(drawParticle);

    // Schedule next frame
    animationId = requestAnimationFrame(draw);
  }

  function initializeCanvas() {
    canvas = document.getElementById('particle-canvas');
    if (!canvas) return false;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return true;
  }

  function startAnimation() {
    if (isInitialized) return;
    
    if (!initializeCanvas()) {
      console.warn('particle-canvas not found, skipping animation');
      return;
    }

    isInitialized = true;

    // Create particles
    particles = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push(createParticle());
    }
    
    animationId = requestAnimationFrame(draw);
  }

  function stopAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    isInitialized = false;
    particles = [];
  }

  // Start animation when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAnimation);
  } else {
    startAnimation();
  }

  // Экспортируем функции для управления (если нужно)
  window.particleCube = {
    start: startAnimation,
    stop: stopAnimation
  };
})();

// Функция normal для нормального распределения
function normal(opts) {
  var r, v1, v2, s;
  do {
    v1 = 2 * Math.random() - 1;
    v2 = 2 * Math.random() - 1;
    s = v1 * v1 + v2 * v2;
  } while (s >= 1 || s === 0);
  r = Math.sqrt(-2 * Math.log(s) / s);
  return opts.mean + opts.dev * v1 * r;
}



