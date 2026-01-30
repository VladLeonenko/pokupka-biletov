import { useEffect } from 'react';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { ContactsInfoSection } from '@/components/contacts/ContactsInfoSection';
import { SocialNetworkSection } from '@/components/contacts/SocialNetworkSection';
import { ContactFormSection } from '@/components/contacts/ContactFormSection';
import { BackgroundImagesSection } from '@/components/contacts/BackgroundImagesSection';

/**
 * Страница "Контакты" - полностью на React компонентах
 * Структура: контактная информация, социальные сети, форма обратной связи, фоновые изображения
 */
export function ContactsPage() {
  useEffect(() => {
    document.body.setAttribute('data-page', '/contacts');
    
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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/contacts';

  return (
    <>
      <SeoMetaTags
        title="Контакты PrimeCoder - Свяжитесь с нами"
        description="Контактная информация веб-студии PrimeCoder. Телефон, email, адрес, график работы. Оставьте заявку через форму обратной связи."
        keywords="контакты PrimeCoder, связаться с PrimeCoder, телефон веб-студии, email PrimeCoder, адрес PrimeCoder"
        url={currentUrl}
        image="https://primecoder.ru/legacy/img/logo.png"
      />
      <HeaderFooterInjector />
      <div className="page-content" style={{ minHeight: '100vh', paddingTop: '100px', position: 'relative' }}>
        <div className="container">
          <section>
            <div className="d-flex jcsb gap-h-30 contacts-block">
              <div className="d-flex flex-column">
                <ContactsInfoSection />
                <SocialNetworkSection />
              </div>
              <ContactFormSection />
            </div>
          </section>
        </div>
        <BackgroundImagesSection />
      </div>
    </>
  );
}
