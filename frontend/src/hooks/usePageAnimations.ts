import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Global hook that initializes GSAP scroll-reveal animations
 * for any element with data-anim attributes on the page.
 *
 * Usage: call once in App.tsx or a layout wrapper.
 *
 * Supported attributes:
 *   data-anim="fade-up"     — fade + slide-up on scroll
 *   data-anim="stagger"     — stagger children marked with data-anim-child
 */
export function usePageAnimations(pathname: string) {
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const duration = isMobile ? 0.4 : 0.7;
    const stagger = isMobile ? 0.03 : 0.07;
    const yFrom = isMobile ? 20 : 40;

    const startFade = isMobile ? 'top 95%' : 'top 88%';
    const startStagger = isMobile ? 'top 92%' : 'top 82%';

    const timer = setTimeout(() => {
      gsap.utils.toArray<HTMLElement>('[data-anim="fade-up"]').forEach((el) => {
        if (el.dataset.animated === '1') return;
        el.dataset.animated = '1';
        gsap.fromTo(
          el,
          { y: yFrom, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: startFade, toggleActions: 'play none none none' },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-anim="stagger"]').forEach((parent) => {
        if (parent.dataset.animated === '1') return;
        parent.dataset.animated = '1';
        const kids = parent.querySelectorAll<HTMLElement>('[data-anim-child]');
        if (!kids.length) return;
        gsap.fromTo(
          kids,
          { y: isMobile ? 15 : 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: isMobile ? 0.35 : 0.5,
            stagger,
            ease: 'power2.out',
            scrollTrigger: { trigger: parent, start: startStagger, toggleActions: 'play none none none' },
          },
        );
      });

      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timer);
      // Kill page-specific triggers
      ScrollTrigger.getAll().forEach((t) => {
        const el = t.trigger as HTMLElement | null;
        if (el?.dataset?.animated === '1') {
          t.kill();
          delete el.dataset.animated;
        }
      });
    };
  }, [pathname]);
}
