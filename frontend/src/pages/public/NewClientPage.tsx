import { useEffect } from 'react';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { NewClientSection } from '@/components/new-client/NewClientSection';
import { NewClientForm } from '@/components/new-client/NewClientForm';
import { BackgroundImagesSection } from '@/components/contacts/BackgroundImagesSection';

/**
 * Страница "Стать клиентом" - полностью на React компонентах
 * Структура: секция с заголовком, форма анкеты, фоновые изображения
 */
export function NewClientPage() {
  useEffect(() => {
    document.body.setAttribute('data-page', '/new-client');
    
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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/new-client';

  return (
    <>
      <SeoMetaTags
        title="Стать клиентом PrimeCoder - Заполните анкету"
        description="Станьте клиентом PrimeCoder! Заполните мини-бриф, и мы подберем для вас необходимые услуги. Наша команда готова к сотрудничеству с любым бизнесом."
        keywords="стать клиентом, веб-студия, разработка сайтов, заполнить анкету, PrimeCoder"
        url={currentUrl}
        image="https://primecoder.ru/legacy/img/logo.png"
      />
      <HeaderFooterInjector />
      <div className="page-content" style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <div className="container">
          <NewClientSection />
          <NewClientForm />
        </div>
        <BackgroundImagesSection />
      </div>
    </>
  );
}
