import { useEffect, useRef } from 'react';
import { InlineImageCarousel, InlineCarouselSlide } from '@/components/public/InlineImageCarousel';
import { processHtmlContent } from '@/utils/processHtmlContent';
import { preserveTableHtml } from '@/utils/preserveTableHtml';

interface BlogPostContentProps {
  contentHtml: string;
  carouselEnabled?: boolean;
  carouselTitle?: string;
  carouselSlides?: InlineCarouselSlide[];
}

/**
 * Контент статьи блога с поддержкой карусели
 */
export function BlogPostContent({ 
  contentHtml, 
  carouselEnabled, 
  carouselTitle, 
  carouselSlides = [] 
}: BlogPostContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const revealObserverRef = useRef<IntersectionObserver | null>(null);

  // Анимация появления элементов при скролле
  useEffect(() => {
    if (!contentRef.current) return;

    const root = contentRef.current.closest('.blog-post');
    if (!root) return;

    // Небольшая задержка, чтобы DOM успел отрендериться
    const timeoutId = setTimeout(() => {
      if (revealObserverRef.current) {
        revealObserverRef.current.disconnect();
        revealObserverRef.current = null;
      }

      // Выбираем только прямые дочерние элементы контента, исключая сам контейнер
      const contentDiv = contentRef.current;
      if (!contentDiv) return;

      // Получаем все прямые дочерние элементы .blog-post-content
      const targets = Array.from(contentDiv.children) as HTMLElement[];
      
      // Также добавляем заголовок статьи
      const header = root.querySelector('.blog-post-header') as HTMLElement;
      const allTargets = header ? [header, ...targets] : targets;
      
      if (allTargets.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.1, // Уменьшил threshold для более раннего срабатывания
          rootMargin: '0px 0px -5% 0px', // Уменьшил отступ
        }
      );

      revealObserverRef.current = observer;

      allTargets.forEach((element, index) => {
        if (!element) return;
        element.classList.remove('is-visible');
        element.classList.add('will-reveal');
        const delay = Math.min(index * 80, 420);
        element.style.setProperty('--reveal-delay', `${delay}ms`);
        observer.observe(element);
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (revealObserverRef.current) {
        revealObserverRef.current.disconnect();
        revealObserverRef.current = null;
      }
    };
  }, [contentHtml, carouselEnabled]);

  // Обработка карусели в контенте - удаляем placeholder из HTML, если он есть
  const contentWithoutPlaceholder = contentHtml.replace(
    /<div[^>]*id=["']blog-post-carousel-placeholder["'][^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // ВАЖНО: Сначала обрабатываем опросы и таблицы, потом пути к изображениям
  // Это нужно, чтобы preserveTableHtml работал с оригинальным HTML
  const processedContent = processHtmlContent(preserveTableHtml(contentWithoutPlaceholder));
  
  // DEBUG: логируем в dev режиме
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      const hasPoll = /Опрос[:\s]+/i.test(contentWithoutPlaceholder);
      const hasProcessedPoll = processedContent.includes('article-poll');
      if (hasPoll && !hasProcessedPoll) {
        console.warn('[BlogPostContent] Обнаружен опрос, но не обработан:', {
          original: contentWithoutPlaceholder.substring(0, 200),
          processed: processedContent.substring(0, 200),
        });
      }
    }
  }, [contentWithoutPlaceholder, processedContent]);

  return (
    <div 
      className="blog-post-content" 
      ref={contentRef}
      style={{
        opacity: 1,
        visibility: 'visible',
        color: 'rgba(241,244,255,0.84)',
      }}
    >
      {carouselEnabled && carouselSlides.length > 0 && (
        <div style={{ margin: '40px 0' }}>
          <InlineImageCarousel slides={carouselSlides} title={carouselTitle} />
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: processedContent }} />
    </div>
  );
}

