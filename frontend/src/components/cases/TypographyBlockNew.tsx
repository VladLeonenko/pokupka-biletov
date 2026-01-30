import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

/**
 * Новый блок типографии
 * Основан на дизайне из Figma
 */
export function TypographyBlockNew() {
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

  // Получаем типографику из contentJson
  const typography = caseData.contentJson?.typography || {
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px',
    fontWeight: '400',
  };

  const fontFamily = typography.fontFamily || 'Inter, sans-serif';
  const fontSize = typography.fontSize || '16px';
  const fontWeight = typography.fontWeight || '400';

  // Размеры для демонстрации типографики
  const fontSizes = [
    { size: '12px', label: '12px' },
    { size: '14px', label: '14px' },
    { size: '16px', label: '16px' },
    { size: '18px', label: '18px' },
    { size: '24px', label: '24px' },
    { size: '32px', label: '32px' },
    { size: '48px', label: '48px' },
  ];

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
              Типография
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem', lg: '1.25rem' },
                color: 'rgba(255, 255, 255, 0.95)',
                lineHeight: 1.7,
              }}
            >
              Использовали шрифт {fontFamily.split(',')[0]} для создания современного и читаемого интерфейса.
            </Typography>
          </Box>

          {/* Демонстрация типографики в разных размерах */}
          <Box
            sx={{
              width: '100%',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              p: { xs: 3, md: 4 },
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {fontSizes.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography
              sx={{
                    fontSize: item.size,
                    fontFamily: fontFamily,
                    fontWeight: fontWeight,
                    color: '#fff',
                    lineHeight: 1.5,
              }}
                >
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: 'monospace',
                  }}
                >
                  {item.label} / {fontWeight}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

