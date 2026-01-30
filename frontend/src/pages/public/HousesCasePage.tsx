import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { useCursor } from '@/hooks/useCursor';
import { getPublicPage } from '@/services/publicApi';
import { Box, CircularProgress } from '@mui/material';
import { CasesHeader } from '@/components/cases/CasesHeader';
import { CasesTasks } from '@/components/cases/CasesTasks';
import { TypographyBlock } from '@/components/cases/TypographyBlock';
import { ColorsSection } from '@/components/cases/ColorsSection';
import { CasesGradient } from '@/components/cases/CasesGradient';
import { CasesTools } from '@/components/cases/CasesTools';
import { CasesAdaptive } from '@/components/cases/CasesAdaptive';
import { CasesLayout } from '@/components/cases/CasesLayout';
import { CasesInfrastructure } from '@/components/cases/CasesInfrastructure';
import { CasesStat } from '@/components/cases/CasesStat';
import { CasesResults } from '@/components/cases/CasesResults';
import { CasesTeam } from '@/components/cases/CasesTeam';
import { CasesAsk } from '@/components/cases/CasesAsk';
import { CasesFormSection } from '@/components/cases/CasesFormSection';

/**
 * Страница кейса "Дома России" - полностью на React компонентах
 * Сохраняет структуру, стили и наполнение из БД
 */
export function HousesCasePage() {
  useCursor();
  
  const { data: page, isLoading } = useQuery({
    queryKey: ['public-page', '/houses-case'],
    queryFn: () => getPublicPage('/houses-case'),
    staleTime: 30000,
  });

  useEffect(() => {
    document.body.setAttribute('data-page', '/houses-case');
    
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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/houses-case';

  if (isLoading) {
    return (
      <>
        <HeaderFooterInjector />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress sx={{ color: '#fff' }} />
        </Box>
      </>
    );
  }

  // Если страница не загрузилась, показываем контент все равно
  if (!page) {
    return (
      <>
        <SeoMetaTags
          title="Кейс Дома России - Разработка сайта | PrimeCoder"
          description="Разработка сайта для компании Дома России. Современный дизайн, адаптивная верстка, интеграция с CRM."
          keywords="кейс, разработка сайта, Дома России, веб-разработка, PrimeCoder"
          url={currentUrl}
        />
        <HeaderFooterInjector />
        <div className="page-content">
          <CasesHeader />
          <CasesTasks />
          <TypographyBlock />
          <ColorsSection />
          <CasesGradient />
          <CasesTools />
          <CasesAdaptive />
          <CasesLayout />
          <CasesInfrastructure />
          <CasesStat />
          <CasesResults />
          <CasesTeam />
          <CasesAsk />
          <CasesFormSection />
        </div>
      </>
    );
  }

  return (
    <>
      <SeoMetaTags
        title={page?.seo?.metaTitle || page?.title || 'Кейс Дома России - Разработка сайта | PrimeCoder'}
        description={page?.seo?.metaDescription || 'Разработка сайта для компании Дома России. Современный дизайн, адаптивная верстка, интеграция с CRM.'}
        keywords={page?.seo?.metaKeywords?.join(', ') || 'кейс, разработка сайта, Дома России, веб-разработка, PrimeCoder'}
        url={currentUrl}
        image={page?.seo?.ogImageUrl}
      />
      <HeaderFooterInjector />
      <div className="page-content">
        <CasesHeader />
        <CasesTasks />
        <TypographyBlock />
        <ColorsSection />
        <CasesGradient />
        <CasesTools />
        <CasesAdaptive />
        <CasesLayout />
        <CasesInfrastructure />
        <CasesStat />
        <CasesResults />
        <CasesTeam />
        <CasesAsk />
        <CasesFormSection />
      </div>
    </>
  );
}

