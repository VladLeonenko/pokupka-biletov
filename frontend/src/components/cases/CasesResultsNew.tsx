import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { useMemo } from 'react';

/**
 * Новый блок результатов с тремя карточками
 * Основан на дизайне из Figma
 */
export function CasesResultsNew() {
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

  const category = caseData.category || 'website';
  const metrics = caseData.metrics || {};
  const days = metrics.days || 37;
  
  // Индивидуальные результаты на основе категории
  const results = useMemo(() => {
    switch (category) {
      case 'website':
        return {
          description: `На проект было затрачено ${days} рабочих дней. Разработано ${metrics.pages || 75} страниц. Цели и задачи заказчика выполнены в полном объеме. Сайт успешно запущен и привлекает новых клиентов.`,
          metrics: [
            { label: 'Страниц создано', value: metrics.pages || 75 },
            { label: 'Дней разработки', value: days },
            { label: 'Производительность', value: '95%' },
          ],
        };
      case 'mobile':
        return {
          description: `На проект было затрачено ${days} рабочих дней. Реализовано ${metrics.features || 15} функций. Мобильное приложение успешно запущено в App Store и Google Play, получило высокие оценки пользователей.`,
          metrics: [
            { label: 'Функций реализовано', value: metrics.features || 15 },
            { label: 'Дней разработки', value: days },
            { label: 'Рейтинг в магазинах', value: '4.8/5' },
          ],
        };
      case 'seo':
        return {
          description: `SEO-продвижение длилось ${days} дней. Оптимизировано ${metrics.keywords || 100} ключевых запросов. Сайт значительно улучшил позиции в поисковых системах и увеличил органический трафик.`,
          metrics: [
            { label: 'Запросов в топ-10', value: metrics.keywords || 100 },
            { label: 'Дней продвижения', value: days },
            { label: 'Рост трафика', value: '+250%' },
          ],
        };
      case 'advertising':
        return {
          description: `Настроено ${metrics.campaigns || 5} рекламных кампаний за ${days} дней. Реклама показала отличные результаты: увеличился поток целевых посетителей и выросла конверсия.`,
          metrics: [
            { label: 'Кампаний настроено', value: metrics.campaigns || 5 },
            { label: 'Дней работы', value: days },
            { label: 'ROI', value: '350%' },
          ],
        };
      case 'design':
        return {
          description: `Создан фирменный стиль за ${days} дней. Разработано ${metrics.elements || 20} элементов бренда. Новый стиль повысил узнаваемость компании и создал единый визуальный образ.`,
          metrics: [
            { label: 'Элементов создано', value: metrics.elements || 20 },
            { label: 'Дней разработки', value: days },
            { label: 'Узнаваемость бренда', value: '+180%' },
          ],
        };
      case 'ai':
        return {
          description: `Внедрено ${metrics.automations || 8} AI-автоматизаций за ${days} дней. Решения позволили значительно сократить время на выполнение рутинных задач и повысить эффективность бизнеса.`,
          metrics: [
            { label: 'Автоматизаций внедрено', value: metrics.automations || 8 },
            { label: 'Дней внедрения', value: days },
            { label: 'Экономия времени', value: '-70%' },
          ],
        };
      default:
        return {
          description: `На проект было затрачено ${days} рабочих дней. Цели и задачи заказчика выполнены в полном объеме. Мы очень гордимся этим проектом!`,
          metrics: [
            { label: 'Дней работы', value: days },
            { label: 'Удовлетворенность', value: '100%' },
            { label: 'Производительность', value: '95%' },
          ],
        };
    }
  }, [category, metrics, days]);

  // Получаем значения для отображения (используем уже объявленную metrics выше)
  const resultDays = metrics.days || results.metrics.find(m => m.label.includes('дней') || m.label.includes('Дней'))?.value || '45';
  const resultPages = metrics.pages || results.metrics.find(m => m.label.includes('страниц') || m.label.includes('Страниц'))?.value || '30';

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
            gap: { xs: 4, md: '50px' },
          }}
        >
          {/* Заголовок справа с линиями и текст в рамке */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              alignItems: 'flex-end',
              position: 'relative',
            }}
          >
            {/* Заголовок справа с линиями */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 2, md: 3 },
                width: '100%',
                mb: '-37px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  width: { xs: '40px', md: '70px' },
                  height: '1px',
                  backgroundColor: '#fff',
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                  fontWeight: 700,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                }}
              >
                Результаты
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  background: 'linear-gradient(90deg, #fff 0%, transparent 100%)',
                }}
              />
            </Box>

            {/* Текст в рамке */}
            <Box
              sx={{
                border: '1px solid #fff',
                borderTop: 'none',
                p: { xs: 3, md: '50px' },
                width: '100%',
                mt: '-37px',
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem', lg: '1.5rem' },
                  fontWeight: 300,
                  color: '#fff',
                  lineHeight: 1.5,
                }}
              >
                {results.description || 'На проект было затрачено 45 рабочих дней. Цели и задачи заказчика выполнены в полном объеме. Мы очень гордимся этим проектом!'}
              </Typography>
            </Box>
          </Box>

          {/* Два значения (дни и страницы) */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 3, md: '30px' },
              width: { xs: '100%', md: '768px' },
            }}
          >
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 1, md: 2 },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                  fontWeight: 400,
                  color: '#FD9C12',
                  lineHeight: 1,
                }}
              >
                {resultDays} {typeof resultDays === 'number' ? 'дней' : ''}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem', lg: '1.5rem' },
                  fontWeight: 300,
                  color: '#fff',
                  lineHeight: 1.5,
                }}
              >
                Время работы
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 1, md: 2 },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
                  fontWeight: 400,
                  color: '#FD9C12',
                  lineHeight: 1,
                }}
              >
                {resultPages} {typeof resultPages === 'number' ? 'страниц' : ''}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem', lg: '1.5rem' },
                  fontWeight: 300,
                  color: '#fff',
                  lineHeight: 1.5,
                }}
              >
                Объем работы
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

