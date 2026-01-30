import { SyntheticEvent, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Container, Typography, CircularProgress, Grid, Button
} from '@mui/material';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { CasesHeaderNew } from '@/components/cases/CasesHeaderNew';
import { CasesAboutNew } from '@/components/cases/CasesAboutNew';
import { CasesTasksNew } from '@/components/cases/CasesTasksNew';
import { CasesTypographyColorsNew } from '@/components/cases/CasesTypographyColorsNew';
import { CasesToolsNew } from '@/components/cases/CasesToolsNew';
import { CasesAdaptiveNew } from '@/components/cases/CasesAdaptiveNew';
import { CasesStatNew } from '@/components/cases/CasesStatNew';
import { CasesResultsNew } from '@/components/cases/CasesResultsNew';
import { CasesMetrics } from '@/components/cases/CasesMetrics';
import { CasesCalendar } from '@/components/cases/CasesCalendar';
import { CasesTeam } from '@/components/cases/CasesTeam';
import { CasesAsk } from '@/components/cases/CasesAsk';
import { CasesFormSection } from '@/components/cases/CasesFormSection';
import { useCursor } from '@/hooks/useCursor';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { SafeHtmlRenderer } from '@/components/common/SafeHtmlRenderer';
import { SafeImage } from '@/components/common/SafeImage';

interface CasePageProps {
  /** Если передан, используется вместо slug из URL */
  slug?: string;
}

// Определяем тип шаблона на основе категории
function getTemplateType(category?: string, templateType?: string): 'full' | 'simple' {
  // Если явно указан templateType для полного шаблона (houses, madeo, medical и т.д.)
  if (templateType && ['houses', 'madeo', 'straumann', 'polygon', 'medical'].includes(templateType)) {
    return 'full';
  }
  
  // Для кейсов разработки сайтов и приложений используем полный шаблон
  if (category === 'website' || category === 'mobile') {
    return 'full';
  }
  
  // Для остальных услуг (AI, SEO, реклама, дизайн) - упрощенный шаблон
  return 'simple';
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

  // Определяем тип шаблона
  const templateType = getTemplateType(caseData?.category, caseData?.templateType);

  useEffect(() => {
    if (slug) {
      document.body.setAttribute('data-page', `/cases/${slug}`);
      
      // Убеждаемся, что стили загружены для полного шаблона
      if (templateType === 'full') {
        const ensureStylesLoaded = () => {
          const pageContent = document.querySelector('.page-content');
          if (pageContent) {
            pageContent.classList.add('styles-loaded');
            (pageContent as HTMLElement).style.paddingTop = '0';
            (pageContent as HTMLElement).style.paddingBottom = '0';
            (pageContent as HTMLElement).style.paddingLeft = '0';
            (pageContent as HTMLElement).style.paddingRight = '0';
          }
          
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
        
        const styleLoaded = document.querySelector('link[href*="style.min.css"]');
        if (styleLoaded) {
          ensureStylesLoaded();
        } else {
          const styleLink = document.createElement('link');
          styleLink.rel = 'stylesheet';
          styleLink.href = '/legacy/css/style.min.css';
          styleLink.media = 'all';
          styleLink.onload = ensureStylesLoaded;
          document.head.appendChild(styleLink);
          setTimeout(ensureStylesLoaded, 200);
        }
        
        const timeoutId = setTimeout(ensureStylesLoaded, 300);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [slug, templateType]);

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

  const heroImage = resolveImageUrl(caseData.heroImageUrl || caseData.donorImageUrl);
  const gallery = caseData.gallery || [];
  const tools = caseData.tools || [];
  const contentHtml = caseData.contentHtml || '';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://primecoder.ru/cases/${slug}`;

  // Полный шаблон для разработки сайтов/приложений
  if (templateType === 'full') {
    const category = caseData.category || 'website';
    const isMedicalCase = caseData.templateType === 'medical' || slug?.includes('medical') || slug?.includes('clinic');
    
    // Блоки для разработки сайтов, мобильных приложений и веб-дизайна
    const showColorsAndTypography = ['website', 'mobile', 'design'].includes(category);
    // Блок адаптива только для сайтов
    const showAdaptive = category === 'website';
    // Блок календаря только для мед клиники
    const showCalendar = isMedicalCase;

    return (
      <>
        <SeoMetaTags
          title={caseData.title ? `${caseData.title} - Кейс | PrimeCoder` : 'Кейс - PrimeCoder'}
          description={caseData.summary || 'Детальное описание проекта'}
          keywords={caseData.title || 'кейс, проект, разработка'}
          url={currentUrl}
          image={caseData.heroImageUrl}
        />
        <HeaderFooterInjector />
        {/* Главный баннер - фулскрин, выходит за пределы контейнера */}
        <CasesHeaderNew />
        {/* Остальные блоки - внутри контейнера */}
        <div className="page-content">
          {/* Новые компоненты на основе дизайна из Figma */}
          <CasesAboutNew />
          <CasesTasksNew />
          {showColorsAndTypography && <CasesTypographyColorsNew />}
          <CasesToolsNew />
          {showAdaptive && <CasesAdaptiveNew />}
          {showCalendar && <CasesCalendar />}
          <CasesStatNew />
          <CasesResultsNew />
          {/* Существующие компоненты (блоки 11-14) */}
          <CasesTeam />
          <CasesAsk />
          <CasesFormSection />
        </div>
        <style>{`
          .page-content {
            margin: 0 auto !important;
            max-width: 1170px !important;
            padding: 0 16px !important;
          }
          .page-content .container {
            margin: 0 auto !important;
            max-width: 1170px !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        `}</style>
      </>
    );
  }

  // Упрощенный шаблон для других услуг (AI, SEO, реклама)

  return (
    <>
      <SeoMetaTags
        title={caseData.title ? `${caseData.title} - Кейс | PrimeCoder` : 'Кейс - PrimeCoder'}
        description={caseData.summary || 'Детальное описание проекта'}
        keywords={caseData.title || 'кейс, проект'}
        url={currentUrl}
        image={caseData.heroImageUrl}
      />
      <HeaderFooterInjector />
      <Box
        sx={{
          minHeight: '100vh',
          color: '#fff',
          pb: { xs: '60px', md: '80px' },
        }}
      >
        {/* Hero Section */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: { xs: '400px', md: '600px' },
            mb: 6,
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={heroImage}
            alt={caseData.title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = fallbackImageUrl();
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)',
              p: { xs: 3, md: 5 },
            }}
          >
            <Container maxWidth={false} sx={{ maxWidth: '1170px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2rem', md: '3.5rem' },
                  fontWeight: 300,
                  mb: 2,
                  color: '#fff',
                }}
              >
                {caseData.title || 'Без названия'}
              </Typography>
              {caseData.summary && (
                <Typography
                  sx={{
                    fontSize: { xs: '1rem', md: '1.25rem' },
                    color: 'rgba(255, 255, 255, 0.9)',
                    maxWidth: '800px',
                  }}
                >
                  {caseData.summary}
                </Typography>
              )}
            </Container>
          </Box>
        </Box>

        <Container maxWidth={false} sx={{ maxWidth: '1170px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
          {/* Описание задачи */}
          {contentHtml && (
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  fontWeight: 300,
                  mb: 3,
                  color: '#fff',
                }}
              >
                Описание проекта
              </Typography>
              <Box
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  lineHeight: 1.8,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  '& > *': {
                    maxWidth: '100%',
                  },
                }}
              >
                <SafeHtmlRenderer
                  html={contentHtml}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: { xs: '1rem', md: '1.125rem' },
                    lineHeight: 1.8,
                  }}
              />
              </Box>
            </Box>
          )}

          {/* Решение */}
          {caseData.summary && !contentHtml && (
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  fontWeight: 300,
                  mb: 3,
                  color: '#fff',
                }}
              >
                Решение
              </Typography>
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  lineHeight: 1.8,
                  maxWidth: '900px',
                }}
              >
                {caseData.summary}
              </Typography>
            </Box>
          )}

          {/* Галерея изображений - Masonry layout в стиле Pinterest */}
          {gallery.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  fontWeight: 300,
                  mb: 4,
                  color: '#fff',
                }}
              >
                Галерея проекта
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                  gap: { xs: 2, sm: 2.5, md: 3 },
                  '& > *': {
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                  },
                }}
              >
                {(gallery && gallery.length > 0 ? gallery : (slug ? [
                  `/legacy/img/cases/${slug}/gallery-1.png`,
                  `/legacy/img/cases/${slug}/gallery-2.png`,
                  `/legacy/img/cases/${slug}/gallery-3.png`,
                ] : []))
                  .filter((item: string | { url: string; alt?: string }) => {
                    const imageUrl = typeof item === 'string' ? item : item.url;
                    return imageUrl && !imageUrl.includes('-hero') && imageUrl !== caseData.heroImageUrl;
                  })
                  .map((item: string | { url: string; alt?: string }, index: number) => {
                    const imageUrl = typeof item === 'string' ? item : item.url;
                    const imageAlt = typeof item === 'string' ? `${caseData.title} - изображение ${index + 1}` : (item.alt || `${caseData.title} - изображение ${index + 1}`);
                    // Чередуем размеры для эффекта мудборда
                    const isLarge = index % 3 === 0 || index % 5 === 0;
                    return (
                      <Box
                        key={index}
                        sx={{
                          position: 'relative',
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          gridRow: isLarge ? 'span 2' : 'span 1',
                          '&:hover': {
                            transform: 'translateY(-8px)',
                            boxShadow: '0 12px 24px rgba(0,0,0,0.5)',
                            zIndex: 1,
                          },
                        }}
                        onClick={() => {
                          // Открыть изображение в полноэкранном режиме или lightbox
                          window.open(imageUrl, '_blank');
                        }}
                      >
                        <SafeImage
                          src={imageUrl}
                          alt={imageAlt}
                          fallback={fallbackImageUrl()}
                          hideOnError={true}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            minHeight: isLarge ? 400 : 250,
                            maxHeight: isLarge ? 600 : 350,
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                            p: 1.5,
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                            '&:hover': {
                              opacity: 1,
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#fff',
                              fontSize: '0.75rem',
                              display: 'block',
                            }}
                          >
                            {imageAlt}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
              </Box>
            </Box>
          )}

          {/* Инструменты и технологии */}
          {tools.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  fontWeight: 300,
                  mb: 3,
                  color: '#fff',
                }}
              >
                Использованные технологии
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {tools.map((tool: string, index: number) => (
                  <Box
                    key={index}
                    sx={{
                      px: 3,
                      py: 1.5,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.9375rem',
                    }}
                  >
                    {tool}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Container>

        {/* Блоки для упрощенного шаблона */}
        <div className="page-content">
          <CasesTeam />
          <CasesAsk />
          <CasesFormSection />
        </div>

        {/* Кнопка назад */}
        <Container maxWidth={false} sx={{ maxWidth: '1170px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Button
              onClick={() => navigate('/portfolio')}
              sx={{
                px: 4,
                py: 1.5,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              Вернуться к портфолио
            </Button>
          </Box>
        </Container>

        <style>{`
          /* Стили для меню */
          .menu {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            opacity: 0 !important;
            visibility: hidden !important;
            z-index: 50 !important;
            pointer-events: none !important;
            transition: opacity 0.3s ease, visibility 0.3s ease !important;
          }
          
          #burger-toggle:checked ~ .menu {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            z-index: 52 !important;
          }
          
          body {
            position: relative !important;
          }
          
          /* Убеждаемся, что все Container в упрощенном шаблоне используют правильную ширину */
          .MuiContainer-root {
            max-width: 1170px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            box-sizing: border-box !important;
          }
          
          @media (min-width: 600px) {
            .MuiContainer-root {
              padding-left: 24px !important;
              padding-right: 24px !important;
            }
          }
          
          @media (min-width: 900px) {
            .MuiContainer-root {
              padding-left: 32px !important;
              padding-right: 32px !important;
            }
          }
          
          /* Убеждаемся, что page-content использует правильную ширину */
          .page-content {
            max-width: 1170px !important;
            margin: 0 auto !important;
            padding: 0 16px !important;
            box-sizing: border-box !important;
          }
          
          .page-content .MuiContainer-root,
          .page-content .container {
            max-width: 1170px !important;
            margin: 0 auto !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            box-sizing: border-box !important;
          }
          
          /* Убеждаемся, что все элементы внутри Container не выходят за пределы */
          .MuiContainer-root > *,
          .MuiContainer-root .MuiBox-root,
          .MuiContainer-root .MuiTypography-root {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* Убеждаемся, что изображения и другие элементы не выходят за пределы */
          .MuiContainer-root img,
          .MuiContainer-root video,
          .MuiContainer-root iframe {
            max-width: 100% !important;
            height: auto !important;
          }
        `}</style>
      </Box>
    </>
  );
}

