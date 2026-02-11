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

    const ctx = gsap.context(() => {
      sections.forEach((section) => {
        // Main section reveal
        gsap.fromTo(
          section,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              end: 'top 40%',
              toggleActions: 'play none none none',
            },
          },
        );

        // Staggered children: карточки, grid items
        const cards = section.querySelectorAll<HTMLElement>('[data-scroll-child]');
        if (cards.length) {
          gsap.fromTo(
            cards,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.08,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 75%',
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
 */
export function ScrollSection({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div data-scroll-section id={id} style={{ opacity: 0, willChange: 'transform, opacity' }}>
      {children}
    </div>
  );
}
