import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
  tw: number;
  hue: 'gold' | 'teal';
};

type Props = { sitewide?: boolean };

/** Soft floating gold/teal dust. Disabled under prefers-reduced-motion. */
export function GoldParticles({ sitewide = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = sitewide ? 22 : 18;
      const count = Math.max(16, Math.min(sitewide ? 42 : 28, Math.floor(w / density)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * (sitewide ? 2.1 : 1.8),
        vx: -0.12 + Math.random() * 0.24,
        vy: -0.18 - Math.random() * 0.28,
        a: 0.2 + Math.random() * 0.4,
        tw: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.38 ? 'gold' : 'teal',
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.025;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        const alpha = p.a * (0.55 + 0.45 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle =
          p.hue === 'teal'
            ? `rgba(80, 170, 155, ${alpha.toFixed(3)})`
            : `rgba(246, 213, 138, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [sitewide]);

  return (
    <canvas
      className={`gold-particles${sitewide ? ' sitewide' : ''}`}
      ref={canvasRef}
      aria-hidden
    />
  );
}
