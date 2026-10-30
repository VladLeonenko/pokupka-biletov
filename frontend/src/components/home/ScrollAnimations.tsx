import type { ReactNode } from 'react';

/** No-op: GSAP scroll reveals removed (Primecoder leftover). */
export function useScrollReveal(_containerRef: React.RefObject<HTMLDivElement | null>) {
  // intentionally empty
}

type ScrollSectionProps = {
  children: ReactNode;
  visibleOnLoad?: boolean;
  className?: string;
};

/** Plain section wrapper — kept so blog/pages don’t break after GSAP purge. */
export function ScrollSection({ children, visibleOnLoad, className }: ScrollSectionProps) {
  return (
    <section
      className={className}
      data-scroll-section
      data-scroll-visible-on-load={visibleOnLoad ? '1' : undefined}
    >
      {children}
    </section>
  );
}
