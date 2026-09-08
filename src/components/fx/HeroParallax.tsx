import { useEffect, useRef, type ReactNode } from 'react';

type Props = { children: ReactNode; className?: string };

/** Soft parallax on hero veil via scroll / pointer. */
export function HeroParallax({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onScroll = () => {
      const y = Math.min(window.scrollY, 120);
      el.style.setProperty('--parallax-y', `${y * 0.18}px`);
    };
    const onPointer = (e: PointerEvent) => {
      const px = (e.clientX / window.innerWidth - 0.5) * 12;
      const py = (e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 8;
      el.style.setProperty('--parallax-x', `${px}px`);
      el.style.setProperty('--parallax-py', `${py}px`);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return (
    <div ref={ref} className={`hero-parallax ${className}`.trim()}>
      {children}
    </div>
  );
}
