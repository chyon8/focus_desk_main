import React, { useEffect, useRef } from 'react';
import type { ParticleKind } from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  /** Seconds lived; only embers use it, to fade in and out. */
  age: number;
  life: number;
  /** Fixed per-particle offset so sine drift never marches in step. */
  seed: number;
}

/** Particles at density 1 on a 1440×900 screen. Scaled by area from there. */
const MAX_COUNT: Record<ParticleKind, number> = {
  rain: 600,
  snow: 400,
  embers: 180,
  dust: 260,
};

const REFERENCE_AREA = 1440 * 900;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function spawn(kind: ParticleKind, w: number, h: number, fresh: boolean): Particle {
  const seed = Math.random() * Math.PI * 2;

  switch (kind) {
    case 'rain': {
      const vy = rand(900, 1500);
      return {
        // Start off the right edge too, so the slant does not leave a bare corner.
        x: rand(0, w * 1.25),
        y: fresh ? rand(0, h) : rand(-h * 0.3, -10),
        vx: -vy * 0.16,
        vy,
        size: rand(0.6, 1.3),
        alpha: rand(0.18, 0.45),
        age: 0,
        life: 0,
        seed,
      };
    }
    case 'snow': {
      return {
        x: rand(0, w),
        y: fresh ? rand(0, h) : rand(-40, -4),
        vx: rand(-10, 10),
        vy: rand(25, 70),
        size: rand(1, 2.6),
        alpha: rand(0.3, 0.75),
        age: 0,
        life: 0,
        seed,
      };
    }
    case 'embers': {
      const life = rand(2.4, 5.5);
      return {
        x: rand(0, w),
        y: fresh ? rand(0, h) : rand(h, h + 60),
        vx: rand(-8, 8),
        vy: -rand(25, 70),
        size: rand(0.8, 2),
        alpha: rand(0.35, 0.85),
        age: fresh ? rand(0, life) : 0,
        life,
        seed,
      };
    }
    case 'dust': {
      return {
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-8, 8),
        vy: rand(-6, 6),
        size: rand(0.6, 1.8),
        alpha: rand(0.12, 0.38),
        age: 0,
        life: 0,
        seed,
      };
    }
  }
}

function draw(ctx: CanvasRenderingContext2D, kind: ParticleKind, p: Particle) {
  switch (kind) {
    case 'rain':
      ctx.strokeStyle = `rgba(190, 215, 235, ${p.alpha})`;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
      ctx.stroke();
      break;
    case 'snow':
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'embers': {
      // Fade in over the first fifth of the life, then out over the last third.
      const t = p.age / p.life;
      const fade = Math.min(1, t / 0.2, (1 - t) / 0.33);
      ctx.fillStyle = `rgba(255, 168, 92, ${p.alpha * Math.max(0, fade)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'dust':
      ctx.fillStyle = `rgba(255, 240, 220, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

// Memoised: the scene above re-renders on every camera move, and there is no
// reason for that to touch the canvas.
export const ParticleLayer = React.memo(function ParticleLayer({
  kind,
  density,
}: {
  kind: ParticleKind;
  density: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const scale = (width * height) / REFERENCE_AREA;
      const target = Math.round(MAX_COUNT[kind] * density * scale);
      particles = Array.from({ length: target }, () => spawn(kind, width, height, true));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      // Clamp so a backgrounded window does not teleport everything on return.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, width, height);

      const glow = kind === 'embers' || kind === 'dust';
      if (glow) ctx.globalCompositeOperation = 'lighter';

      for (const p of particles) {
        p.age += dt;
        // Slow particles wander; rain is too fast for the drift to read.
        if (kind !== 'rain') {
          p.x += (p.vx + Math.sin(now / 1400 + p.seed) * 14) * dt;
        } else {
          p.x += p.vx * dt;
        }
        p.y += p.vy * dt;

        const gone =
          kind === 'embers'
            ? p.age > p.life || p.y < -20
            : p.y > height + 20 || p.y < -60 || p.x < -80 || p.x > width + 80;
        if (gone) {
          Object.assign(p, spawn(kind, width, height, false));
          continue;
        }

        draw(ctx, kind, p);
      }

      if (glow) ctx.globalCompositeOperation = 'source-over';
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => cancelAnimationFrame(frame);

    // No point burning a rAF loop while the window is hidden.
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [kind, density]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
});
