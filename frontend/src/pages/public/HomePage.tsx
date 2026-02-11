import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPublicBlogHighlights } from '@/services/publicApi';
import { Box } from '@mui/material';
import { ParticleSphere } from '@/components/home/ParticleSphere';
import { HeroSection } from '@/components/home/HeroSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { CasesSection } from '@/components/home/CasesSection';
import { NewClientSection } from '@/components/home/NewClientSection';
import { AboutUsSection } from '@/components/home/AboutUsSection';
import { ReviewsSection } from '@/components/home/ReviewsSection';
import { BlogCarousel } from '@/components/public/BlogCarousel';
import { QuizForm } from '@/components/home/QuizForm';
import { AdvantagesModern } from '@/components/public/AdvantagesModern';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { ScrollSection, useScrollReveal } from '@/components/home/ScrollAnimations';

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

      <ParticleSphere />

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
          <CasesSection />
        </ScrollSection>

        <ScrollSection>
          <AdvantagesModern />
        </ScrollSection>

        <ScrollSection>
          <NewClientSection />
        </ScrollSection>

        <ScrollSection>
          <AboutUsSection />
        </ScrollSection>

        <ScrollSection>
          <ReviewsSection />
        </ScrollSection>

        {normalizedPosts.length > 0 && (
          <ScrollSection>
            <Box component="section" sx={{ pb: 4 }}>
              <BlogCarousel posts={normalizedPosts} />
            </Box>
          </ScrollSection>
        )}
      </Box>
    </>
  );
}
