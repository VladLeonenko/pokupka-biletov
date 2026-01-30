import { useEffect } from 'react';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { AboutSection } from '@/components/about/AboutSection';
import { AdvantagesAboutSection } from '@/components/about/AdvantagesAboutSection';
import { TeamSection } from '@/components/about/TeamSection';
import { AwwwardsSection } from '@/components/about/AwwwardsSection';
import { ReviewsAboutSection } from '@/components/about/ReviewsAboutSection';

/**
 * Страница "О нас" - полностью на React компонентах
 * Структура: about, advantages-about, Команда, awwwards, reviews
 */
export function AboutPage() {
  useEffect(() => {
    document.body.setAttribute('data-page', '/about');
    
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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://primecoder.ru/about';

  return (
    <>
      <SeoMetaTags
        title="О компании PrimeCoder - Веб-студия разработки сайтов"
        description="PrimeCoder - digital-продакшн полного цикла. Более 100 успешных проектов, команда профессионалов, современные технологии. Разработка сайтов, мобильных приложений, дизайн и продвижение."
        keywords="веб-студия, разработка сайтов, digital-агентство, веб-разработка, дизайн, команда, PrimeCoder, создание сайтов, разработка приложений"
        url={currentUrl}
        image="https://primecoder.ru/legacy/img/logo.png"
      />
      <HeaderFooterInjector />
      <div className="page-content" style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <div className="container">
          <AboutSection />
          <AdvantagesAboutSection />
          <TeamSection />
          <AwwwardsSection />
          <ReviewsAboutSection />
        </div>
      </div>
    </>
  );
}

