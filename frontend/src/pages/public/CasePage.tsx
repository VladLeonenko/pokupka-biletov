import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { getPublicCase } from '@/services/publicApi';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { useCursor } from '@/hooks/useCursor';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

// Новые секции по дизайну Figma
import {
  HeroSection,
  AboutSection,
  TypographySection,
  ColorsImageSection,
  ToolsSection,
  PerformanceSection,
  MockupSection,
  ResultsSection,
} from '@/components/cases/sections';

// Существующие компоненты (которые оставляем)
import { CasesTeam } from '@/components/cases/CasesTeam';
import { CasesAsk } from '@/components/cases/CasesAsk';
import { CasesFormSection } from '@/components/cases/CasesFormSection';

interface CasePageProps {
  slug?: string;
}

export function CasePage({ slug: propSlug }: CasePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const slug = propSlug || paramSlug;
  const navigate = useNavigate();
  useCursor();

  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  useEffect(() => {
    if (slug) {
      document.body.setAttribute('data-page', `/cases/${slug}`);
    }
  }, [slug]);

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

  if (error || !caseData) {
    return (
      <>
        <HeaderFooterInjector />
        <Box sx={{ p: 4, textAlign: 'center', color: '#fff' }}>
          <Typography variant="h5">Кейс не найден</Typography>
          <Button onClick={() => navigate('/portfolio')} sx={{ mt: 2 }}>
            Вернуться к портфолио
          </Button>
        </Box>
      </>
    );
  }

  const category = caseData.category || 'website';
  const currentUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://primecoder.ru/cases/${slug}`;

  const sections = caseData.contentJson?.sections ?? {};
  const show = (key: string) => sections[key] !== false;
  const showColorsAndTypography = ['website', 'mobile', 'design'].includes(category);

  const seoTitle = (caseData as any).seoTitle || (caseData.title ? `${caseData.title} — кейс | PrimeCoder` : 'Кейсы разработки сайтов | PrimeCoder');
  const seoDescription = (caseData as any).seoDescription || caseData.summary || 'Реальный кейс разработки сайта. Дизайн, вёрстка, интеграции. Смотрите процесс и результат работы PrimeCoder.';
  const seoKeywords = (caseData as any).seoKeywords || (caseData.title ? `кейс ${caseData.title}, разработка сайта` : 'кейсы веб-разработки, портфолио PrimeCoder');
  const ogImage = (caseData as any).ogImageUrl || caseData.heroImageUrl;
  const ogImageUrl = ogImage ? resolveImageUrl(ogImage) : undefined;

  return (
    <>
      <SeoMetaTags
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        url={currentUrl}
        image={ogImageUrl}
      />
      <HeaderFooterInjector />

      {show('hero') && <HeroSection />}
      {show('about') && <AboutSection />}
      {show('typography') && showColorsAndTypography && <TypographySection />}
      {show('colors') && showColorsAndTypography && <ColorsImageSection />}
      {show('tools') && <ToolsSection />}
      {show('performance') && <PerformanceSection />}
      {show('mockup') && <MockupSection />}
      {show('results') && <ResultsSection />}
      {show('team') && <CasesTeam />}
      {show('ask') && <CasesAsk />}
      {show('form') && <CasesFormSection />}
    </>
  );
}
