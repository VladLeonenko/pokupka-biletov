import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hook: подключает GSAP ScrollTrigger анимации ко всем section-элементам
 * внутри контейнера. Каждая секция fade-in + slide-up при скролле.
 * Вдохновлено follow.art — плавные переходы между блоками.
 */
export function useScrollReveal(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!containerRef.current) return;

    const sections = containerRef.current.querySelectorAll<HTMLElement>('[data-scroll-section]');
    if (!sections.length) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const sectionDuration = isMobile ? 0.5 : 0.9;
    const sectionY = isMobile ? 30 : 60;
    const cardsDuration = isMobile ? 0.35 : 0.6;
    const cardsStagger = isMobile ? 0.04 : 0.08;

    const ctx = gsap.context(() => {
      sections.forEach((section) => {
        const visibleOnLoad = section.getAttribute('data-scroll-visible-on-load') === '1';

        if (visibleOnLoad) {
          section.style.opacity = '1';
          const cards = section.querySelectorAll<HTMLElement>('[data-scroll-child]');
          cards.forEach((el) => {
            (el as HTMLElement).style.opacity = '1';
            (el as HTMLElement).style.transform = 'none';
          });
          return;
        }

        gsap.fromTo(
          section,
          { y: sectionY, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: sectionDuration,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 98%',
              end: 'top 50%',
              toggleActions: 'play none none none',
            },
          },
        );

        const cards = section.querySelectorAll<HTMLElement>('[data-scroll-child]');
        if (cards.length) {
          gsap.fromTo(
            cards,
            { y: isMobile ? 15 : 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: cardsDuration,
              stagger: cardsStagger,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 90%',
                toggleActions: 'play none none none',
              },
            },
          );
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [containerRef]);
}

/**
 * Invisible wrapper — оборачивает секцию для scroll-reveal.
 * Начальный opacity=0 чтобы GSAP мог анимировать появление.
 * visibility: hidden до анимации, иначе контент мерцает при load.
 */
export function ScrollSection({
  children,
  id,
  /** Если true, секция видна сразу (для страниц где контент выше сгиба — блог, кейсы) */
  visibleOnLoad = false,
}: {
  children: React.ReactNode;
  id?: string;
  visibleOnLoad?: boolean;
}) {
  return (
    <div
      data-scroll-section
      data-scroll-visible-on-load={visibleOnLoad ? '1' : undefined}
      id={id}
      style={
        visibleOnLoad
          ? { willChange: 'transform, opacity' }
          : { opacity: 0, willChange: 'transform, opacity' }
      }
    >
      {children}
    </div>
  );
}
