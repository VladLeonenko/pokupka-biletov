import { useEffect, useRef } from 'react';

/**
 * Компонент для анимации частиц на главной странице
 * Миграция из cube-optimized.js в React
 */
export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const particlesRef = useRef<any[]>([]);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размеры canvas с учетом devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight * 0.8; // 80vh как в оригинале
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Функции из оригинального cube-optimized.js
    function normal(options: any) {
      let r, v1, v2, s;
      do {
        v1 = 2 * Math.random() - 1;
        v2 = 2 * Math.random() - 1;
        s = v1 * v1 + v2 * v2;
      } while (s >= 1 || s === 0);
      r = Math.sqrt(-2 * Math.log(s) / s);
      return options.mean + options.dev * v1 * r;
    }

    function normalPool(o: any) {
      let r = 0;
      do {
        const a = Math.round(normal({ mean: o.mean, dev: o.dev }));
        if (a < o.pool.length && a >= 0) return o.pool[a];
        r++;
      } while (r < 100);
      return o.pool[0] || 0;
    }

    function randomNormal(o: any) {
      o = Object.assign({ mean: 0, dev: 1, pool: [] }, o);
      if (Array.isArray(o.pool) && o.pool.length > 0) {
        return normalPool(o);
      }
      return normal(o);
    }

    const NUM_PARTICLES = 600;
    const PARTICLE_SIZE = 0.2;
    const SPEED = 30000;

    function rand(low: number, high: number) {
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

    function moveParticle(particle: any, time: number) {
      const progress = ((time - particle.startTime) % particle.duration) / particle.duration;
      return {
        ...particle,
        x: progress,
        y: ((Math.sin(progress * particle.arc) * particle.amplitude) + particle.offsetY),
      };
    }

    function drawParticle(particle: any) {
      if (!canvas || !ctx) return;
      // Используем реальные размеры canvas (с учётом devicePixelRatio)
      const canvasHeight = canvas.height / dpr;
      const canvasWidth = canvas.width / dpr;
      const vh = canvasHeight / 100;

      ctx.fillStyle = particle.colour;
      ctx.beginPath();
      // Используем реальные координаты с учётом devicePixelRatio
      const x = particle.x * canvasWidth;
      const y = (particle.y * vh) + (canvasHeight / 2);
      const radius = particle.diameter * vh;
      ctx.ellipse(
        x,
        y,
        radius,
        radius,
        0,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }

    function draw(time: number) {
      if (!canvas || !ctx) return;

      // Move particles
      particlesRef.current = particlesRef.current.map(particle => moveParticle(particle, time));

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the particles
      particlesRef.current.forEach(drawParticle);

      animationIdRef.current = requestAnimationFrame(draw);
    }

    // Инициализация частиц
    if (!isInitializedRef.current) {
      particlesRef.current = Array.from({ length: NUM_PARTICLES }, createParticle);
      isInitializedRef.current = true;
      draw(performance.now());
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="particle-canvas"
      style={{
        position: 'fixed',
        top: '15%',
        left: 0,
        width: '100%',
        height: '80vh',
        zIndex: -10,
        pointerEvents: 'none',
      }}
    />
  );
}

