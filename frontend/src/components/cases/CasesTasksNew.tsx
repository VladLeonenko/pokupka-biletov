import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

/**
 * Новый блок Задач и Решения
 * Основан на дизайне из Figma - два блока рядом
 */
export function CasesTasksNew() {
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

  // Извлекаем задачи и решение из contentJson или contentHtml
  const extractFromHtml = (html: string, section: string): string => {
    if (!html) return '';
    // Ищем секцию в HTML
    const regex = new RegExp(`<h3[^>]*>${section}[^<]*</h3>\\s*<p[^>]*>([^<]+)</p>`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : '';
  };
  
  const tasks = caseData.contentJson?.tasks?.text || 
    extractFromHtml(caseData.contentHtml || '', 'Задачи и вызовы') ||
    extractFromHtml(caseData.contentHtml || '', 'Задачи') ||
    '';
    
  const solution = caseData.contentJson?.solution?.text || 
    extractFromHtml(caseData.contentHtml || '', 'Наше решение') ||
    extractFromHtml(caseData.contentHtml || '', 'Решение') ||
    '';

  // Пути к изображениям ноутбука и телефона - сначала из contentJson, потом из папки
  const laptopImage = caseData.contentJson?.tasks?.laptopImage
    ? resolveImageUrl(caseData.contentJson.tasks.laptopImage, fallbackImageUrl())
    : resolveImageUrl(`/legacy/img/cases/${slug}/laptop.png`, fallbackImageUrl());
  const phoneImage = caseData.contentJson?.solution?.phoneImage
    ? resolveImageUrl(caseData.contentJson.solution.phoneImage, fallbackImageUrl())
    : resolveImageUrl(`/legacy/img/cases/${slug}/phone.png`, fallbackImageUrl());

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#141414',
        py: { xs: 6, md: 8 },
        mt: { xs: 0, md: 0 },
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
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 4, md: 6, lg: '130px' },
            alignItems: 'flex-start',
          }}
        >
          {/* Левая колонка - текст (Задачи и Решение) */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', lg: '0 0 calc(50% - 65px)' },
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 4, md: '50px' },
            }}
          >
            {/* Блок Задач */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 2, md: '25px' },
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                Задачи
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem', lg: '1.5rem' },
                  fontWeight: 300,
                  color: '#fff',
                  lineHeight: 1.5,
                }}
              >
                {tasks || caseData.summary || 'Разработка дизайна и сайта для проекта. Реализация всех требований заказчика.'}
              </Typography>
            </Box>

            {/* Блок Решения */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 2, md: '25px' },
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                Решение
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem', lg: '1.5rem' },
                  fontWeight: 300,
                  color: '#fff',
                  lineHeight: 1.5,
                }}
              >
                {solution || 'Создан уникальный дизайн с фирменным стилем компании. Благодаря цветовому решению проект выделяется среди конкурентов и вызывает доверие.'}
              </Typography>
            </Box>
          </Box>

          {/* Правая колонка - изображения ноутбука и телефона */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', lg: '0 0 calc(50% - 65px)' },
              display: 'flex',
              position: 'relative',
              minHeight: { xs: '300px', md: '500px' },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                width: '100%',
              }}
            >
              {/* Изображение ноутбука (меньше, слева) */}
              <Box
                sx={{
                  position: 'absolute',
                  left: { xs: 0, md: '-10%' },
                  top: { xs: '10%', md: '15%' },
                  width: { xs: '40%', md: '343px' },
                  height: { xs: 'auto', md: '377px' },
                  transform: 'rotate(-3.286deg)',
                  zIndex: 2,
                }}
              >
                <SafeImage
                  src={laptopImage}
                  alt="Ноутбук с проектом"
                  fallback={fallbackImageUrl()}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>

              {/* Изображение телефона (больше, справа) */}
              <Box
                sx={{
                  position: 'absolute',
                  right: { xs: 0, md: '-15%' },
                  top: { xs: '40%', md: '25%' },
                  width: { xs: '50%', md: '467px' },
                  height: { xs: 'auto', md: '571px' },
                  transform: 'rotate(6.447deg)',
                  zIndex: 1,
                }}
              >
                <SafeImage
                  src={phoneImage}
                  alt="Телефон с проектом"
                  fallback={fallbackImageUrl()}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

