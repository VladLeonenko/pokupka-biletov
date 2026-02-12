import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { getPublicCase } from '@/services/publicApi';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { useCursor } from '@/hooks/useCursor';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';

// Новые секции по дизайну Figma
import {
  HeroSection,
  AboutSection,
  TypographySection,
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
  
  const showColorsAndTypography = ['website', 'mobile', 'design'].includes(category);

  return (
    <>
      <SeoMetaTags
        title={caseData.title ? `${caseData.title} — кейс | PrimeCoder` : 'Кейсы разработки сайтов | PrimeCoder'}
        description={caseData.summary || 'Реальный кейс разработки сайта. Дизайн, вёрстка, интеграции. Смотрите процесс и результат работы PrimeCoder.'}
        keywords={caseData.title ? `кейс ${caseData.title}, разработка сайта` : 'кейсы веб-разработки, портфолио PrimeCoder'}
        url={currentUrl}
        image={caseData.heroImageUrl}
      />
      <HeaderFooterInjector />
      
      {/* Новые секции по дизайну Figma */}
      <HeroSection />
      <AboutSection />
      {showColorsAndTypography && <TypographySection />}
      <ToolsSection />
      <PerformanceSection />
      <MockupSection />
      <ResultsSection />
      
      {/* Существующие компоненты */}
      <CasesTeam />
      <CasesAsk />
      <CasesFormSection />
    </>
  );
}
