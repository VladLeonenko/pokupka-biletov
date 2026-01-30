import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPublicBlogHighlights } from '@/services/publicApi';
import { Box } from '@mui/material';
import { ParticleCanvas } from '@/components/home/ParticleCanvas';
import { HeroSection } from '@/components/home/HeroSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { CasesSection } from '@/components/home/CasesSection';
import { AdvantagesSection } from '@/components/home/AdvantagesSection';
import { NewClientSection } from '@/components/home/NewClientSection';
import { AboutUsSection } from '@/components/home/AboutUsSection';
import { ReviewsSection } from '@/components/home/ReviewsSection';
import { BlogCarousel } from '@/components/public/BlogCarousel';
import { QuizForm } from '@/components/home/QuizForm';
import { AdvantagesModern } from '@/components/public/AdvantagesModern';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';

// Загружаем необходимые скрипты для legacy функциональности
if (typeof window !== 'undefined') {
  // Загружаем jQuery если еще не загружен
  if (!(window as any).jQuery) {
    const jqueryScript = document.createElement('script');
    jqueryScript.src = '/legacy/js/jquery.js';
    document.head.appendChild(jqueryScript);
  }

  // Загружаем native-carousel.js для вертикальной карусели
  if (!document.querySelector('script[src*="native-carousel.js"]')) {
    const carouselScript = document.createElement('script');
    carouselScript.src = '/legacy/js/native-carousel.js';
    document.body.appendChild(carouselScript);
  }

  // Загружаем quiz-optimized.js только на главной странице
  const isHomePage = window.location.pathname === '/';
  if (isHomePage && !document.querySelector('script[src*="quiz-optimized.js"]')) {
    const quizScript = document.createElement('script');
    quizScript.src = '/legacy/js/quiz-optimized.js';
    document.body.appendChild(quizScript);
  }
}

/**
 * Главная страница - полностью на React компонентах
 * Без legacy HTML из БД, все блоки - чистые React компоненты
 */
export function HomePage() {
  useEffect(() => {
    document.body.setAttribute('data-page', '/');
  }, []);

  const { data: highlights = [] } = useQuery({
    queryKey: ['public-blog-highlights'],
    queryFn: listPublicBlogHighlights,
    enabled: true,
    staleTime: 30000,
    gcTime: 60000,
  });

  const normalizedPosts = highlights.map((post: any) => ({
    ...post,
    coverImage: post.coverImage || post.cover_image_url || post.coverImageUrl,
  }));

  return (
    <>
      <SeoMetaTags
        title="PrimeCoder - Веб-студия | Разработка сайтов, мобильных приложений, дизайн и продвижение"
        description="Веб-студия PrimeCoder - разработка сайтов, мобильных приложений, дизайн и продвижение. Более 10 лет опыта, 100+ успешных проектов."
        keywords="веб-студия, разработка сайтов, мобильные приложения, дизайн, SEO продвижение, веб-разработка"
        url={typeof window !== 'undefined' ? window.location.origin + '/' : '/'}
      />

      {/* Частицы на фоне */}
      <ParticleCanvas />

      {/* Hero секция */}
      <HeroSection />

      {/* Quiz форма - вторая секция */}
      <QuizForm />

      {/* Services секция с табами */}
      <ServicesSection />

      {/* Cases секция */}
      <CasesSection />

      {/* Advantages секция */}
      <AdvantagesSection />

      {/* Advantages Modern секция - "Почему выбирают именно нас" */}
      <AdvantagesModern />

      {/* New Client секция */}
      <NewClientSection />

      {/* About Us секция */}
      <AboutUsSection />

      {/* Reviews секция */}
      <ReviewsSection />

      {/* Blog секция - на всю ширину */}
      {normalizedPosts.length > 0 && (
        <Box component="section" className="blog d-flex gap-v-50 flex-column">
          <BlogCarousel posts={normalizedPosts} />
        </Box>
      )}
    </>
  );
}
