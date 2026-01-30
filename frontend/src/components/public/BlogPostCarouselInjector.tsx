import { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { InlineCarouselSlide, InlineImageCarousel } from './InlineImageCarousel';

interface BlogPostCarouselInjectorProps {
  slides: InlineCarouselSlide[];
  title?: string;
}

export function BlogPostCarouselInjector({ slides, title }: BlogPostCarouselInjectorProps) {
  const rootRef = useRef<Root | null>(null);

  useEffect(() => {
    if (!slides.length) return;

    const timer = setTimeout(() => {
      const placeholder = document.getElementById('blog-post-carousel-placeholder');
      if (!placeholder) return;

      placeholder.innerHTML = '';
      const container = document.createElement('div');
      placeholder.appendChild(container);

      if (!rootRef.current) {
        rootRef.current = createRoot(container);
      }

      rootRef.current.render(<InlineImageCarousel slides={slides} title={title} />);
    }, 400);

    return () => {
      clearTimeout(timer);
      if (rootRef.current) {
        try {
          rootRef.current.unmount();
        } catch (error) {
          console.error('[BlogPostCarouselInjector] unmount error', error);
        } finally {
          rootRef.current = null;
        }
      }
    };
  }, [slides, title]);

  return null;
}

