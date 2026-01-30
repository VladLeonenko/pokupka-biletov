import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

/**
 * Блок календаря
 * Основан на дизайне из Figma
 */
export function CasesCalendar() {
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

  // Ищем изображение календаря в галерее или используем дефолтное из Figma
  const gallery = caseData.gallery || [];
  const calendarImage = Array.isArray(gallery) && gallery.length > 1
    ? resolveImageUrl(typeof gallery[1] === 'string' ? gallery[1] : gallery[1].url, '/legacy/img/cases-medical/calendar.png')
    : '/legacy/img/cases-medical/calendar.png';

  return (
    <Box
      sx={{
        width: '100%',
        py: { xs: 6, md: 8 },
        backgroundColor: '#141414',
      }}
    >
      <Box
        sx={{
          maxWidth: '1170px',
          margin: '0 auto',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 3, md: 4 },
          }}
        >
          <Box>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                fontWeight: 500,
                color: '#fff',
                lineHeight: 1.2,
                mb: { xs: 2, md: 3 },
              }}
            >
              Календарь
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem', lg: '1.25rem' },
                color: 'rgba(255, 255, 255, 0.95)',
                lineHeight: 1.7,
              }}
            >
              Разработали календарь для удобства пользователей. С помощью него можно записаться на приём к врачу.
            </Typography>
          </Box>

          <Box
            sx={{
              width: '100%',
              height: { xs: '300px', sm: '400px', md: '450px', lg: '511px' },
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            <SafeImage
              src={calendarImage}
              alt="Календарь для записи"
              fallback={fallbackImageUrl()}
              hideOnError={true}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

