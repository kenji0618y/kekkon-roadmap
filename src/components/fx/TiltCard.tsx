import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  style?: CSSProperties;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** CSS 3D perspective tilt; no-ops when prefers-reduced-motion. */
export function TiltCard({ children, className = '', maxTilt = 8, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)';
  }, []);

  const onMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el || reduced.current) return;
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width - 0.5;
      const py = (clientY - r.top) / r.height - 0.5;
      const rx = (-py * maxTilt).toFixed(2);
      const ry = (px * maxTilt).toFixed(2);
      el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    },
    [maxTilt],
  );

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`.trim()}
      style={style}
      onPointerEnter={() => {
        reduced.current = prefersReducedMotion();
      }}
      onPointerMove={(e) => onMove(e.clientX, e.clientY)}
      onPointerLeave={reset}
      onPointerUp={reset}
    >
      {children}
    </div>
  );
}
