import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';

/**
 * Типография и цвета - светлый фон как в Figma
 */
export function CasesTypographyColorsNew() {
  const { slug } = useParams<{ slug?: string }>();
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  if (!caseData || !slug) {
    return null;
  }

  const typography = caseData.contentJson?.typography || {
    fontFamily: 'Open Sans',
    weights: ['Light', 'Regular', 'SemiBold'],
  };

  const colors = caseData.contentJson?.colors?.palette || [
    { color: '#000000', name: 'Black' },
    { color: '#FFFFFF', name: 'White' },
    { color: '#FD9C12', name: 'Orange' },
  ];

  const fontFamily = typography.fontFamily || 'Open Sans';
  const weights = typography.weights || ['Light', 'Regular', 'SemiBold'];
  const description = typography.description || 'Прямой штрих с открытыми формами и нейтральной, но дружественной внешностью.';

  const opacityLevels = [10, 20, 40, 60, 80, 100];

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#F5F5F5 !important',
        py: { xs: '50px', md: '80px' },
      }}
    >
      <Box
        sx={{
          maxWidth: '1170px',
          margin: '0 auto',
          px: { xs: '20px', md: '40px' },
        }}
      >
        {/* Заголовок */}
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Open Sans", sans-serif',
            fontWeight: 700,
            fontSize: { xs: '32px', md: '48px' },
            color: '#141414 !important',
            mb: { xs: '40px', md: '60px' },
          }}
        >
          Типография и цвета
        </Typography>

        {/* Контент */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: '50px', lg: '80px' },
          }}
        >
          {/* Левая - Типографика */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ mb: { xs: '30px', md: '40px' } }}>
              {weights.map((weight: string, index: number) => (
                <Typography
                  key={index}
                  sx={{
                    fontFamily: `"${fontFamily}", sans-serif`,
                    fontWeight: weight.toLowerCase() === 'light' ? 300 
                      : weight.toLowerCase() === 'regular' ? 400 
                      : weight.toLowerCase() === 'semibold' ? 600 
                      : 400,
                    fontSize: { xs: '28px', md: '36px' },
                    color: '#141414 !important',
                    lineHeight: 1.8,
                    fontStyle: weight.toLowerCase() === 'light' ? 'italic' : 'normal',
                  }}
                >
                  {weight.toUpperCase()}
                </Typography>
              ))}
            </Box>

            <Typography
              sx={{
                fontFamily: `"${fontFamily}", serif`,
                fontWeight: 400,
                fontSize: { xs: '60px', md: '80px', lg: '100px' },
                color: '#141414 !important',
                lineHeight: 1.1,
                mb: '20px',
              }}
            >
              {fontFamily}
            </Typography>

            <Typography
              sx={{
                fontFamily: '"Open Sans", sans-serif',
                fontWeight: 400,
                fontSize: { xs: '16px', md: '18px' },
                color: '#141414 !important',
                lineHeight: 1.6,
                maxWidth: '400px',
              }}
            >
              {description}
            </Typography>
          </Box>

          {/* Правая - Цвета */}
          <Box sx={{ display: 'flex', gap: '0', flexShrink: 0 }}>
            {colors.map((colorItem: any, colIndex: number) => (
              <Box key={colIndex} sx={{ display: 'flex', flexDirection: 'column' }}>
                {opacityLevels.map((opacity, rowIndex) => {
                  const isWhite = colorItem.color?.toLowerCase() === '#ffffff';
                  return (
                    <Box
                      key={rowIndex}
                      sx={{
                        width: { xs: '60px', md: '80px', lg: '100px' },
                        height: { xs: '40px', md: '50px', lg: '60px' },
                        backgroundColor: colorItem.color,
                        opacity: opacity / 100,
                        border: isWhite ? '1px solid #E0E0E0' : 'none',
                      }}
                    />
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
