import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

/**
 * Новый блок адаптивности
 * Основан на дизайне из Figma
 */
export function CasesAdaptiveNew() {
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

  // Изображения адаптивов из галереи - только релевантные (исключаем hero и дефолтные)
  const gallery = caseData.gallery || [];
  const adaptiveImages = Array.isArray(gallery) && gallery.length > 0
    ? gallery
        .filter(item => {
          const imageUrl = typeof item === 'string' ? item : item.url;
          // Исключаем hero изображения и дефолтные изображения
          return imageUrl && 
                 !imageUrl.includes('-hero') && 
                 imageUrl !== caseData.heroImageUrl &&
                 !imageUrl.includes('/legacy/img/') &&
                 imageUrl.startsWith('/uploads/images/');
        })
        .slice(0, 3)
        .map(item => resolveImageUrl(typeof item === 'string' ? item : item.url))
    : [];

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
              Адаптив для сайта
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem', lg: '1.25rem' },
                color: 'rgba(255, 255, 255, 0.95)',
                lineHeight: 1.6,
              }}
            >
              Пользователям доступны все функции на телефонах и планшетах.
            </Typography>
          </Box>

          {adaptiveImages.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: adaptiveImages.length > 1 ? 'repeat(2, 1fr)' : '1fr' },
                gap: { xs: 2, md: 3 },
              }}
            >
              {adaptiveImages.map((imageUrl, index) => (
                <Box
                  key={index}
                  sx={{
                    width: '100%',
                    height: { xs: '300px', sm: '400px', md: '500px' },
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <SafeImage
                    src={imageUrl}
                    alt={`Адаптивная версия сайта - ${index + 1}`}
                    fallback={fallbackImageUrl()}
                    hideOnError={true}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem' },
                color: 'rgba(255, 255, 255, 0.6)',
                fontStyle: 'italic',
              }}
            >
              Изображения адаптивных версий будут добавлены позже
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

