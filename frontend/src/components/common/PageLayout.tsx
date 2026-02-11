import { useRef, useEffect, type ReactNode } from 'react';
import { Box, Container } from '@mui/material';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface PageLayoutProps {
  children: ReactNode;
  /** Show the particle sphere on this page (default false — only homepage has it) */
  withSphere?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false;
  /** If true, wraps children in <Container>. Default true. */
  contained?: boolean;
}

/**
 * Reusable layout wrapper for all public pages.
 * Provides:
 *  - consistent padding / min-height
 *  - GSAP scroll-reveal for [data-anim] elements
 *  - optional Container wrapper
 */
export function PageLayout({ children, maxWidth = 'lg', contained = true }: PageLayoutProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      // Reveal any [data-anim="fade-up"] elements
      gsap.utils.toArray<HTMLElement>('[data-anim="fade-up"]').forEach((el) => {
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

      // Stagger [data-anim="stagger"] children with [data-anim-child]
      gsap.utils.toArray<HTMLElement>('[data-anim="stagger"]').forEach((parent) => {
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
    }, ref);

    return () => ctx.revert();
  }, []);

  const inner = contained ? <Container maxWidth={maxWidth}>{children}</Container> : children;

  return (
    <Box
      ref={ref}
      component="main"
      sx={{
        minHeight: '100vh',
        color: '#fff',
        pt: { xs: 12, md: 14 },
        pb: { xs: 6, md: 10 },
      }}
    >
      {inner}
    </Box>
  );
}
