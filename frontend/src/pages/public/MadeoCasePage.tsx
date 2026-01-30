import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { useCursor } from '@/hooks/useCursor';
import { getPublicPage } from '@/services/publicApi';
import { processHtmlContent } from '@/utils/processHtmlContent';
import { Box, CircularProgress } from '@mui/material';

/**
 * Страница кейса "Madeo" - полностью на React компонентах
 * Сохраняет структуру, стили и наполнение из БД
 */
export function MadeoCasePage() {
  useCursor();
  
  const { data: page, isLoading } = useQuery({
    queryKey: ['public-page', '/madeo-case'],
    queryFn: () => getPublicPage('/madeo-case'),
    staleTime: 30000,
  });

  useEffect(() => {
    document.body.setAttribute('data-page', '/madeo-case');
    
    // Убеждаемся, что стили загружены
    const ensureStylesLoaded = () => {
      const pageContent = document.querySelector('.page-content');
      if (pageContent) {
        pageContent.classList.add('styles-loaded');
        // Убираем отступы у page-content
        (pageContent as HTMLElement).style.paddingTop = '0';
        (pageContent as HTMLElement).style.paddingBottom = '0';
        (pageContent as HTMLElement).style.paddingLeft = '0';
        (pageContent as HTMLElement).style.paddingRight = '0';
      }
      
      // Центрируем все блоки с классом container с !important
      const containers = document.querySelectorAll('.page-content .container');
      containers.forEach((container) => {
        const el = container as HTMLElement;
        el.style.setProperty('margin', '0 auto', 'important');
        el.style.setProperty('margin-left', 'auto', 'important');
        el.style.setProperty('margin-right', 'auto', 'important');
        el.style.setProperty('padding-left', '16px', 'important');
        el.style.setProperty('padding-right', '16px', 'important');
        el.style.setProperty('max-width', '1170px', 'important');
      });
    };
    
    // Проверяем, загружены ли уже стили
    const styleLoaded = document.querySelector('link[href*="style.min.css"]');
    if (styleLoaded) {
      ensureStylesLoaded();
    } else {
      // Если стили не загружены, загружаем их
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = '/legacy/css/style.min.css';
      styleLink.media = 'all';
      styleLink.onload = ensureStylesLoaded;
      document.head.appendChild(styleLink);
      
      // Fallback: если стили не загрузились за 200ms, показываем контент все равно
      setTimeout(ensureStylesLoaded, 200);
    }
    
    // Применяем стили после рендера
    const timeoutId = setTimeout(ensureStylesLoaded, 300);
    
    // Используем MutationObserver для отслеживания появления новых .container элементов
    const observer = new MutationObserver(() => {
      ensureStylesLoaded();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/madeo-case';

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#fff' }} />
      </Box>
    );
  }

  const htmlContent = page?.html || '';
  const processedContent = processHtmlContent(htmlContent);

  return (
    <>
      <SeoMetaTags
        title={page?.seo?.metaTitle || page?.title || 'Кейс Madeo - Разработка сайта | PrimeCoder'}
        description={page?.seo?.metaDescription || 'Разработка сайта для компании Madeo. Современный дизайн, адаптивная верстка, интеграция с CRM.'}
        keywords={page?.seo?.metaKeywords?.join(', ') || 'кейс, разработка сайта, Madeo, веб-разработка, PrimeCoder'}
        url={currentUrl}
        image={page?.seo?.ogImageUrl}
      />
      <HeaderFooterInjector />
      <div className="page-content">
        <div dangerouslySetInnerHTML={{ __html: processedContent }} />
      </div>
    </>
  );
}

