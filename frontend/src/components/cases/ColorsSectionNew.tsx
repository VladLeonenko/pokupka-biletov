import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

/**
 * Новый блок цветов
 * Основан на дизайне из Figma
 */
export function ColorsSectionNew() {
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

  // Получаем цвета из contentJson
  const colors = caseData.contentJson?.colors?.palette || ['#ffbb00', '#141414', '#ffffff', '#333333', '#666666'];

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
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
              fontWeight: 500,
              color: '#fff',
              lineHeight: 1.2,
              mb: { xs: 2, md: 0 },
            }}
          >
            Цвета
          </Typography>

          {/* Отображение цветов в виде кружков с hex кодами */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: { xs: 3, md: 4 },
              alignItems: 'center',
            }}
          >
            {colors.map((color: string, index: number) => (
              <Box
                key={index}
              sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: { xs: '60px', sm: '80px', md: '100px' },
                    height: { xs: '60px', sm: '80px', md: '100px' },
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontFamily: 'monospace',
                  }}
                >
                  {color.toUpperCase()}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

