import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';

/**
 * Объединенный блок Типография и Цвета согласно дизайну Figma
 * Заголовок, слева - типографика, справа - три колонки цветов
 */
export function CasesTypographyColorsNew() {
  const { slug } = useParams<{ slug?: string }>();
  
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

  // Получаем данные типографики и цветов из contentJson
  const typography = caseData.contentJson?.typography || {
    fontFamily: 'Open Sans',
    weights: ['LIGHT', 'REGULAR', 'SEMIBOLD'],
  };

  const colors = caseData.contentJson?.colors?.palette || [
    { color: '#000000', name: 'Black' },
    { color: '#FFFFFF', name: 'White' },
    { color: '#FD9C12', name: 'Orange' }, // #fd9c12 из Figma
  ];

  const fontFamily = typography.fontFamily || 'Open Sans';
  const fontWeights = typography.weights || ['LIGHT', 'REGULAR', 'SEMIBOLD'];

  // Генерируем колонки цветов с opacity
  const colorColumns = [
    { color: '#000000', opacities: [5, 10, 20, 40, 60, 100] },
    { color: '#FFFFFF', opacities: [5, 10, 20, 40, 60, 100] },
    { color: '#FD9C12', opacities: [5, 10, 20, 40, 60, 100] },
  ];

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#141414',
        py: { xs: 6, md: 8 },
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
            gap: { xs: 4, md: '50px' },
          }}
        >
          {/* Заголовок */}
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
              fontWeight: 700,
              color: '#fff',
            }}
          >
            Типография и цвета
          </Typography>

          {/* Основной контент - типографика слева, цвета справа */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: { xs: 4, md: '30px' },
            }}
          >
            {/* Левая колонка - типографика */}
            <Box
              sx={{
                flex: { xs: '1 1 100%', lg: '0 0 calc(50% - 15px)' },
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 3, md: '25px' },
              }}
            >
              {/* Варианты начертания */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 2, md: '25px' },
                }}
              >
                {fontWeights.map((weight: string, index: number) => (
                  <Typography
                    key={index}
                    sx={{
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                      fontWeight: weight === 'LIGHT' ? 300 : weight === 'REGULAR' ? 400 : 600,
                      fontFamily: fontFamily,
                      color: '#fff',
                      lineHeight: 1.5,
                    }}
                  >
                    {weight}
                  </Typography>
                ))}
              </Box>

              {/* Название шрифта и описание */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 2, md: '25px' },
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: '3rem', sm: '4rem', md: '6rem', lg: '7rem' },
                    fontWeight: 400,
                    fontFamily: fontFamily,
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  {fontFamily}
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: '1rem', md: '1.125rem', lg: '1.5rem' },
                    fontWeight: 300,
                    fontFamily: fontFamily,
                    color: '#fff',
                    lineHeight: 1.5,
                  }}
                >
                  Прямой штрих с открытыми формами и нейтральной, но дружественной внешностью. Оптимизирован для удобной читаемости в веб и мобильных интерфейсах.
                </Typography>
              </Box>
            </Box>

            {/* Правая колонка - цвета (три колонки с opacity) */}
            <Box
              sx={{
                flex: { xs: '1 1 100%', lg: '0 0 calc(50% - 15px)' },
                display: 'flex',
                gap: { xs: 2, md: 0 },
              }}
            >
              {colorColumns.map((col, colIndex) => (
                <Box
                  key={colIndex}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {col.opacities.map((opacity, opacityIndex) => (
                    <Box
                      key={opacityIndex}
                      sx={{
                        height: { xs: '20px', md: '25px' },
                        width: '100%',
                        backgroundColor: col.color,
                        opacity: opacity / 100,
                      }}
                    />
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
