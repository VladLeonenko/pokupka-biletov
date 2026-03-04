/**
 * Эффект Noomo: при скролле viewport «на месте», блоки подлетают снизу в позицию, затем улетают вверх.
 * Каждый блок — уникальная анимация (вариации по y, scale, opacity).
 */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type FlyVariant = 'default' | 'slide-up' | 'scale-in' | 'from-right' | 'from-left' | 'blur-in';
export type FlyChildVariant = 'fade-up' | 'fade-left' | 'fade-right' | 'scale' | 'fade';

const VARIANT_CONFIG: Record<FlyVariant, { fromY: number; toY: number; fromX?: number; fromScale?: number; fromOpacity?: number }> = {
  'default': { fromY: 100, toY: -80 },
  'slide-up': { fromY: 140, toY: -100 },
  'scale-in': { fromY: 80, toY: -80, fromScale: 0.92 },
  'from-right': { fromY: 60, toY: -80, fromX: 120 },
  'from-left': { fromY: 60, toY: -80, fromX: -120 },
  'blur-in': { fromY: 100, toY: -80, fromOpacity: 0.2 },
};

function progressToY(progress: number, fromY: number, toY: number): number {
  if (progress <= 0.25) {
    const t = progress / 0.25;
    return fromY * (1 - t);
  }
  if (progress >= 0.75) {
    const t = (progress - 0.75) / 0.25;
    return toY * t;
  }
  return 0;
}

function progressToX(progress: number, fromX: number): number {
  if (progress <= 0.25) return fromX * (1 - progress / 0.25);
  return 0;
}

function progressToScale(progress: number, fromScale: number): number {
  if (progress <= 0.25) return fromScale + (1 - fromScale) * (progress / 0.25);
  return 1;
}

function progressToOpacity(progress: number, fromOpacity: number): number {
  if (progress <= 0.25) return fromOpacity + (1 - fromOpacity) * (progress / 0.25);
  if (progress >= 0.75) return Math.max(0, 1 - (progress - 0.75) / 0.25);
  return 1;
}

export function useNoomoScrollFly(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!containerRef.current) return;

    const sections = containerRef.current.querySelectorAll<HTMLElement>('[data-noomo-fly-section]');
    if (!sections.length) return;

    const ctx = gsap.context(() => {
      sections.forEach((section) => {
        if (section.getAttribute('data-no-fly') === '1') return;
        const content = section.querySelector<HTMLElement>('[data-noomo-fly-content]');
        if (!content) return;

        const variant = (section.getAttribute('data-fly-variant') as FlyVariant) || 'default';
        const cfg = VARIANT_CONFIG[variant];

        // Начальное состояние детей
        content.querySelectorAll<HTMLElement>('[data-noomo-fly-child]').forEach((el) => {
          const v = (el.getAttribute('data-fly-child-variant') as FlyChildVariant) || 'fade-up';
          gsap.set(el, {
            opacity: 0,
            y: v === 'fade-up' ? 50 : 0,
            x: v === 'fade-left' ? 40 : v === 'fade-right' ? -40 : 0,
            scale: v === 'scale' ? 0.92 : 1,
          });
        });

        ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2,
          onUpdate: (self) => {
            const p = self.progress;
            gsap.set(content, {
              y: progressToY(p, cfg.fromY, cfg.toY),
              x: cfg.fromX != null ? progressToX(p, cfg.fromX) : 0,
              scale: cfg.fromScale != null ? progressToScale(p, cfg.fromScale) : 1,
              opacity: cfg.fromOpacity != null ? progressToOpacity(p, cfg.fromOpacity) : 1,
            });
            // Дети: появляются с отставанием, когда блок «приземлился» (progress 0.2–0.5)
            const childProgressBase = Math.max(0, Math.min(1, (p - 0.18) / 0.3));
            const children = content.querySelectorAll<HTMLElement>('[data-noomo-fly-child]');
            children.forEach((el, i) => {
              const stagger = i * 0.06;
              const cp = Math.max(0, Math.min(1, (childProgressBase - stagger) / (1 - stagger || 0.01)));
              const v = (el.getAttribute('data-fly-child-variant') as FlyChildVariant) || 'fade-up';
              const ease = 1 - Math.pow(1 - cp, 2);
              if (v === 'fade-up') {
                gsap.set(el, { y: 50 * (1 - ease), opacity: ease });
              } else if (v === 'fade-left') {
                gsap.set(el, { x: 40 * (1 - ease), opacity: ease });
              } else if (v === 'fade-right') {
                gsap.set(el, { x: -40 * (1 - ease), opacity: ease });
              } else if (v === 'scale') {
                gsap.set(el, { scale: 0.92 + 0.08 * ease, opacity: ease });
              } else {
                gsap.set(el, { opacity: ease });
              }
            });
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [containerRef]);
}

interface NoomoFlySectionProps {
  children: React.ReactNode;
  variant?: FlyVariant;
  /** Не анимировать — контент на месте (Hero) */
  noFly?: boolean;
  id?: string;
}

export function NoomoFlySection({
  children,
  variant = 'default',
  noFly = false,
  id,
}: NoomoFlySectionProps) {
  if (noFly) {
    return (
      <div id={id} data-noomo-fly-section data-no-fly="1" style={{ minHeight: '100vh' }}>
        {children}
      </div>
    );
  }

  return (
    <div
      id={id}
      data-noomo-fly-section
      data-fly-variant={variant}
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        data-noomo-fly-content
        style={{
          width: '100%',
          willChange: 'transform, opacity',
        }}
      >
        {children}
      </div>
    </div>
  );
}
