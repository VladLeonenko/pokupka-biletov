/**
 * Noomo-эффект: фиксированная «сцена», контент подлетает к зрителю при скролле.
 * Ощущение: ты на одном месте, к тебе прилетают разные блоки.
 */
import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const SECTION_SCROLL = 100; // vh на секцию

/** Прогресс скролла внутри секции: 0 при входе, 1 при выходе */
export function getSectionProgress(scrollY: number, viewportH: number, sectionIndex: number): number {
  const sectionH = (SECTION_SCROLL / 100) * viewportH;
  const sectionStart = sectionIndex * sectionH;
  const sectionEnd = sectionStart + sectionH;
  if (scrollY <= sectionStart) return 0;
  if (scrollY >= sectionEnd) return 1;
  return (scrollY - sectionStart) / sectionH;
}

function getSlideY(scrollY: number, viewportH: number, index: number): number {
  const sectionH = (SECTION_SCROLL / 100) * viewportH;
  const sectionStart = index * sectionH;
  const sectionProgress = (scrollY - sectionStart) / sectionH;
  if (sectionProgress < 0) return viewportH;
  // Hero (0): сразу виден. Остальные — подлетают снизу за первые 25%
  if (sectionProgress < 0.25) return index === 0 ? 0 : viewportH * (1 - sectionProgress / 0.25);
  if (sectionProgress < 0.65) return 0;
  if (sectionProgress < 1) return -viewportH * ((sectionProgress - 0.65) / 0.35);
  return -viewportH;
}

function getSlideOpacity(scrollY: number, viewportH: number, index: number): number {
  const sectionH = (SECTION_SCROLL / 100) * viewportH;
  const sectionStart = index * sectionH;
  const sectionProgress = (scrollY - sectionStart) / sectionH;
  if (sectionProgress < 0 || sectionProgress > 1) return 0;
  // Hero: сразу виден. Остальные — fade in за первые 10%
  if (sectionProgress < 0.1) return index === 0 ? 1 : sectionProgress / 0.1;
  if (sectionProgress > 0.9) return (1 - sectionProgress) / 0.1;
  return 1;
}

interface NoomoFixedStageProps {
  sections: ReactNode[];
}

export function NoomoFixedStage({ sections }: NoomoFixedStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slides = stageRef.current?.querySelectorAll<HTMLElement>('[data-noomo-slide]');
    const spacer = spacerRef.current;
    if (!slides?.length || !spacer) return;

    const getContentScrollY = () => {
      const rect = spacer.getBoundingClientRect();
      return Math.max(0, -rect.top); // пикселей «въехали» в контент
    };

    const update = () => {
      const scrollY = getContentScrollY();
      const vh = window.innerHeight;
      let activeIndex = 0;
      slides.forEach((slide, i) => {
        const y = getSlideY(scrollY, vh, i);
        const opacity = getSlideOpacity(scrollY, vh, i);
        gsap.set(slide, { y, opacity });
        if (opacity > 0.5 && Math.abs(y) < vh / 2) activeIndex = i;
      });
      slides.forEach((slide, i) => {
        (slide as HTMLElement).style.pointerEvents = i === activeIndex ? 'auto' : 'none';
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [sections.length]);

  const stage = (
    <div
      ref={stageRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'auto',
        zIndex: 10,
        background: 'linear-gradient(180deg, #0a0a10 0%, #0d0d14 50%, #0a0a10 100%)',
      }}
    >
      {sections.map((content, i) => (
        <div
          key={i}
          data-noomo-slide
          data-slide-index={i}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflow: 'auto',
            pointerEvents: 'none',
          }}
        >
          {content}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div
        ref={spacerRef}
        style={{
          height: `${sections.length * SECTION_SCROLL}vh`,
          pointerEvents: 'none',
        }}
        data-noomo-spacer
        aria-hidden
      />
      {typeof document !== 'undefined' && createPortal(stage, document.body)}
    </>
  );
}
