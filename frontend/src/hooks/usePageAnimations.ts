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
    // Small delay to let DOM settle after navigation
    const timer = setTimeout(() => {
      // Fade-up elements
      gsap.utils.toArray<HTMLElement>('[data-anim="fade-up"]').forEach((el) => {
        // Skip already-animated
        if (el.dataset.animated === '1') return;
        el.dataset.animated = '1';
        gsap.fromTo(
          el,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          },
        );
      });

      // Stagger containers
      gsap.utils.toArray<HTMLElement>('[data-anim="stagger"]').forEach((parent) => {
        if (parent.dataset.animated === '1') return;
        parent.dataset.animated = '1';
        const kids = parent.querySelectorAll<HTMLElement>('[data-anim-child]');
        if (!kids.length) return;
        gsap.fromTo(
          kids,
          { y: 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.07,
            ease: 'power2.out',
            scrollTrigger: { trigger: parent, start: 'top 82%', toggleActions: 'play none none none' },
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
