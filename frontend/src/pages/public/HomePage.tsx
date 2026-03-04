import { useEffect, useRef, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPublicBlogHighlights } from '@/services/publicApi';
import { Box } from '@mui/material';
import { DeferredParticleSphere } from '@/components/home/DeferredParticleSphere';
import { HeroSection } from '@/components/home/HeroSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { QuizForm } from '@/components/home/QuizForm';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { ScrollSection, useScrollReveal } from '@/components/home/ScrollAnimations';

// Ниже-the-fold секции — lazy load, не блокируют LCP
const CasesSection = lazy(() => import('@/components/home/CasesSection').then(m => ({ default: m.CasesSection })));
const NewClientSection = lazy(() => import('@/components/home/NewClientSection').then(m => ({ default: m.NewClientSection })));
const AboutUsSection = lazy(() => import('@/components/home/AboutUsSection').then(m => ({ default: m.AboutUsSection })));
const ReviewsSection = lazy(() => import('@/components/home/ReviewsSection').then(m => ({ default: m.ReviewsSection })));
const BlogCarousel = lazy(() => import('@/components/public/BlogCarousel').then(m => ({ default: m.BlogCarousel })));
const AdvantagesModern = lazy(() => import('@/components/public/AdvantagesModern').then(m => ({ default: m.AdvantagesModern })));

const SectionFallback = () => <Box sx={{ minHeight: 320 }} />;

export function HomePage() {
  const mainRef = useRef<HTMLDivElement>(null);
  useScrollReveal(mainRef);

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

  const normalizedPosts = Array.isArray(highlights)
    ? highlights.map((post: any) => ({
        ...post,
        coverImage: post.coverImage || post.cover_image_url || post.coverImageUrl,
      }))
    : [];

  return (
    <>
      <SeoMetaTags
        title="Разработка сайтов под ключ от 150 000 ₽ | PrimeCoder"
        description="Создание сайтов, лендингов и интернет-магазинов в Москве. SEO-продвижение, реклама у блогеров. 150+ проектов, конверсия от 8%. Закажите ИЗ — получите КТ."
        keywords="разработка сайтов, создание сайта под ключ, интернет-магазин, лендинг, SEO продвижение, веб-студия Москва, PrimeCoder"
        url={typeof window !== 'undefined' ? window.location.origin + '/' : '/'}
      />

      <DeferredParticleSphere />

      <Box ref={mainRef}>
        {/* Hero — входная анимация через gsap внутри компонента */}
        <HeroSection />

        <ScrollSection>
          <QuizForm />
        </ScrollSection>

        <ScrollSection>
          <ServicesSection />
        </ScrollSection>

        {/* Cases — оставляем как есть */}
        <ScrollSection>
          <Suspense fallback={<SectionFallback />}>
            <CasesSection />
          </Suspense>
        </ScrollSection>

        <ScrollSection>
          <Suspense fallback={<SectionFallback />}>
            <AdvantagesModern />
          </Suspense>
        </ScrollSection>

        <ScrollSection>
          <Suspense fallback={<SectionFallback />}>
            <NewClientSection />
          </Suspense>
        </ScrollSection>

        <ScrollSection>
          <Suspense fallback={<SectionFallback />}>
            <AboutUsSection />
          </Suspense>
        </ScrollSection>

        <ScrollSection>
          <Suspense fallback={<SectionFallback />}>
            <ReviewsSection />
          </Suspense>
        </ScrollSection>

        {normalizedPosts.length > 0 && (
          <ScrollSection>
            <Box component="section" sx={{ pb: 4 }}>
              <Suspense fallback={<SectionFallback />}>
                <BlogCarousel posts={normalizedPosts} />
              </Suspense>
            </Box>
          </ScrollSection>
        )}
      </Box>
    </>
  );
}
