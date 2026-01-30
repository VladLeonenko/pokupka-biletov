import { useQuery } from '@tanstack/react-query';
import { listPublicPromotions } from '@/services/publicApi';
import { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PromotionsHeader } from '@/components/promotions/PromotionsHeader';
import { PromotionsList } from '@/components/promotions/PromotionsList';
import { BackgroundImagesSection } from '@/components/contacts/BackgroundImagesSection';

/**
 * Страница "Акции и скидки" - полностью на React компонентах
 * Структура: заголовок, список акций, модальные окна с формами, фоновые изображения
 */
export function PublicPromotionsPage() {
  useEffect(() => {
    document.body.setAttribute('data-page', '/promotion');
    
    // Убеждаемся, что стили загружены
    const ensureStylesLoaded = () => {
      const pageContent = document.querySelector('.page-content');
      if (pageContent) {
        pageContent.classList.add('styles-loaded');
      }
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
  }, []);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['public-promotions'],
    queryFn: listPublicPromotions,
    enabled: true,
    staleTime: 30000,
  });

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/promotion';

  if (isLoading) {
    return (
      <>
        <HeaderFooterInjector />
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, pt: '140px' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <SeoMetaTags
        title="Акции и скидки - PrimeCoder"
        description="Выгодные акции и скидки на разработку сайтов, веб-дизайн, запуск рекламы в Яндекс Директе и SEO продвижение"
        keywords="акции, скидки, промо, PrimeCoder, разработка сайтов, веб-дизайн, реклама, SEO"
        url={currentUrl}
        image="https://primecoder.ru/legacy/img/logo.png"
      />
      <HeaderFooterInjector />
      <div className="page-content" style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
        <div className="container">
          <PromotionsHeader />
          <PromotionsList promotions={promotions} />
        </div>
        <BackgroundImagesSection />
      </div>
    </>
  );
}
