import { Box, Typography, Button } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

/**
 * Новый Hero-блок для кейсов с зеленым фоном
 * Основан на дизайне из Figma (desktop версия)
 */
export function CasesHeaderNew() {
  const { slug } = useParams<{ slug?: string }>();
  
  // Ранний возврат если нет slug - компонент не должен рендериться
  if (!slug) {
    return null;
  }
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  if (!caseData) {
    return null;
  }

  // Приоритет: contentJson.header.banner > heroImageUrl > legacy cover.png > donorImageUrl
  const heroImage = (caseData.contentJson as any)?.header?.banner?.trim()
    ? resolveImageUrl((caseData.contentJson as any).header.banner, fallbackImageUrl())
    : caseData.heroImageUrl?.trim()
    ? resolveImageUrl(caseData.heroImageUrl, fallbackImageUrl())
    : slug
    ? resolveImageUrl(`/legacy/img/cases/${slug}/cover.png`, fallbackImageUrl())
    : caseData.donorImageUrl?.trim()
    ? resolveImageUrl(caseData.donorImageUrl, fallbackImageUrl())
    : fallbackImageUrl();

  return (
    <Box
      sx={{
        width: '100%',
        pt: { xs: 4, md: 6 },
        pb: { xs: 4, md: 6 },
        backgroundColor: '#141414',
      }}
    >
      <Box
        sx={{
          maxWidth: { xs: '100%', md: '1170px' },
          margin: '0 auto',
          px: { xs: 0, sm: 2, md: 4 },
        }}
      >
        {/* Обложка кейса - на мобильной во весь экран без закруглений, на десктопе с закруглениями */}
        <Box
          sx={{
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: { xs: 0, md: '12px' },
            mb: { xs: 4, md: 6 },
            boxShadow: { xs: 'none', md: '0 8px 32px rgba(0, 0, 0, 0.3)' },
            aspectRatio: '16/9',
            maxHeight: { xs: '400px', sm: '500px', md: '600px' },
          }}
        >
          <SafeImage
            src={heroImage}
            alt={caseData.title}
            fallback={fallbackImageUrl()}
            hideOnError={false}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </Box>

        {/* Контент под изображением */}
        <Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                fontWeight: 400,
                color: '#fff',
                mb: { xs: 2, md: 3 },
                lineHeight: 1.2,
              }}
            >
              {caseData.title || 'Название проекта'}
            </Typography>
            
            {caseData.summary && (
              <Typography
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem', lg: '1.25rem' },
                color: 'rgba(255, 255, 255, 0.9)',
                  mb: { xs: 3, md: 4 },
                  lineHeight: 1.6,
                maxWidth: '800px',
                }}
              >
                {caseData.summary}
              </Typography>
            )}

            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
            {caseData.donorUrl && (
              <Button
                variant="contained"
                component="a"
                href={caseData.donorUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  bgcolor: '#ffbb00',
                  color: '#141414',
                  px: { xs: 3, md: 4 },
                  py: { xs: 1.5, md: 2 },
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: '3px',
                  '&:hover': {
                    bgcolor: '#e6a800',
                  },
                }}
              >
                Посмотреть сайт
              </Button>
            )}
              <Button
                variant="outlined"
                sx={{
                borderColor: '#ffbb00',
                color: '#ffbb00',
                  px: { xs: 3, md: 4 },
                  py: { xs: 1.5, md: 2 },
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: '3px',
                  '&:hover': {
                  borderColor: '#e6a800',
                  bgcolor: 'rgba(255, 187, 0, 0.1)',
                  },
                }}
              >
                Заказать проект
              </Button>
            </Box>
        </Box>
      </Box>
    </Box>
  );
}

