import { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import { InlineImageCarousel, InlineCarouselSlide } from '@/components/public/InlineImageCarousel';
import { processHtmlContent } from '@/utils/processHtmlContent';
import { preserveTableHtml } from '@/utils/preserveTableHtml';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

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

  // data-scroll-child, data-scroll-label для ParticleSphere + подсветка кода
  useEffect(() => {
    if (!contentRef.current) return;
    const contentDiv = contentRef.current;
    const timeoutId = setTimeout(() => {
      Array.from(contentDiv.children).forEach((el) => {
        (el as HTMLElement).setAttribute('data-scroll-child', '');
      });
      contentDiv.querySelectorAll('h2, h3').forEach((el) => {
        const text = (el.textContent || '').trim().slice(0, 60);
        if (text) el.setAttribute('data-scroll-label', text);
      });
      Prism.highlightAllUnder(contentDiv);
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [contentHtml, carouselEnabled]);

  // Обработка карусели в контенте - удаляем placeholder из HTML, если он есть
  const contentWithoutPlaceholder = contentHtml.replace(
    /<div[^>]*id=["']blog-post-carousel-placeholder["'][^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // ВАЖНО: Сначала обрабатываем опросы и таблицы, потом пути к изображениям
  const baseProcessed = processHtmlContent(preserveTableHtml(contentWithoutPlaceholder));
  // Разрешаем пути /uploads/ для img (dev proxy, prod same-origin)
  const processedContent = baseProcessed.replace(
    /(<img[^>]+src=)(["'])(\/uploads\/[^"']+)\2/gi,
    (_, prefix, q, path) => `${prefix}${q}${resolveImageUrl(path, '')}${q}`,
  );
  
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
    <div className="blog-post-content" style={{ opacity: 1, visibility: 'visible', color: 'rgba(241,244,255,0.84)' }}>
      {carouselEnabled && carouselSlides.length > 0 && (
        <div style={{ margin: '40px 0' }}>
          <InlineImageCarousel slides={carouselSlides} title={carouselTitle} />
        </div>
      )}
      <div ref={contentRef} dangerouslySetInnerHTML={{ __html: processedContent }} />
    </div>
  );
}

