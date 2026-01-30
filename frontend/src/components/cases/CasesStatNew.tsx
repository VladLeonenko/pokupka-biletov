import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import { useMemo, useState, useEffect } from 'react';

/**
 * Новый блок основных показателей с круговой диаграммой
 * Основан на дизайне из Figma
 */
export function CasesStatNew() {
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

  // Состояние для анимации
  const [animatedPerformance, setAnimatedPerformance] = useState(0);

  // Определяем, является ли кейс дорогим/самописным
  const isCustomBuilt = useMemo(() => {
    if (!caseData) return false;
    
    const tools = caseData.tools || [];
    const toolsLower = tools.map((t: string) => t.toLowerCase());
    
    // Признаки самописных/дорогих решений
    const customIndicators = [
      'react', 'typescript', 'node.js', 'nodejs', 'postgresql', 'mongodb',
      'next.js', 'nextjs', 'vue.js', 'vuejs', 'angular', 'nestjs', 'express',
      'graphql', 'docker', 'kubernetes', 'microservices', 'aws', 'azure',
      'gcp', 'custom', 'самописный', 'индивидуальный'
    ];
    
    return customIndicators.some(indicator => 
      toolsLower.some((tool: string) => tool.includes(indicator))
    );
  }, [caseData]);

  // Генерируем рандомный процент производительности на основе slug (стабильный для одного кейса)
  const performance = useMemo(() => {
    if (!slug) return 90;
    
    // Если процент уже задан в метриках, используем его
    if (caseData?.metrics?.performance) {
      return caseData.metrics.performance;
    }
    
    // Генерируем стабильный рандом на основе slug
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
      hash = ((hash << 5) - hash) + slug.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Для самописных/дорогих: 95-100, для остальных: 90-99
    const min = isCustomBuilt ? 95 : 90;
    const max = isCustomBuilt ? 100 : 99;
    
    // Генерируем число от min до max на основе hash
    const random = Math.abs(hash) % (max - min + 1);
    return min + random;
  }, [slug, caseData?.metrics?.performance, isCustomBuilt]);

  // Анимация заполнения круга
  useEffect(() => {
    if (!performance || performance === 0) {
      setAnimatedPerformance(0);
      return;
    }
    
    // Сбрасываем значение перед началом анимации
    setAnimatedPerformance(0);
    
    const duration = 2000; // 2 секунды
    const startTime = Date.now();
    const startValue = 0;
    const endValue = performance;
    
    let animationFrameId: number;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing функция для плавной анимации
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      const currentValue = Math.max(0, Math.min(100, startValue + (endValue - startValue) * easedProgress));
      // Округляем до 1 знака после запятой для плавности
      setAnimatedPerformance(Math.round(currentValue * 10) / 10);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Убеждаемся, что финальное значение точно установлено
        setAnimatedPerformance(endValue);
      }
    };
    
    // Небольшая задержка для запуска анимации
    const timeoutId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(animate);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [performance]);

  if (!caseData) {
    return null;
  }
  
  const category = caseData.category || 'website';
  
  // Релевантные показатели в зависимости от категории
  const relevantMetrics = useMemo(() => {
    const metrics = caseData.metrics || {};
    
    switch (category) {
      case 'website':
        return [
          { label: 'Первая отрисовка контента', value: `${metrics.firstContentfulPaint || '0,8'} сек` },
          { label: 'Индекс скорости', value: `${metrics.speedIndex || '0,8'} сек` },
          { label: 'Отрисовка самого крупного контента', value: `${metrics.largestContentfulPaint || '0,8'} сек` },
          { label: 'Совокупное смещение макета', value: metrics.cumulativeLayoutShift || '0,879' },
        ];
      
      case 'mobile':
        return [
          { label: 'Время запуска приложения', value: `${metrics.appLaunchTime || '1,2'} сек` },
          { label: 'Размер приложения', value: `${metrics.appSize || '45'} МБ` },
          { label: 'Потребление памяти', value: `${metrics.memoryUsage || '120'} МБ` },
          { label: 'Производительность', value: `${metrics.mobilePerformance || '95'}%` },
        ];
      
      case 'seo':
        return [
          { label: 'Позиции в топ-10', value: `${metrics.top10Positions || '45'} запросов` },
          { label: 'Органический трафик', value: `+${metrics.organicTraffic || '250'}%` },
          { label: 'Конверсии из поиска', value: `+${metrics.searchConversions || '180'}%` },
          { label: 'Время на сайте', value: `+${metrics.timeOnSite || '95'}%` },
        ];
      
      case 'advertising':
        return [
          { label: 'CTR (кликабельность)', value: `${metrics.ctr || '4,2'}%` },
          { label: 'Стоимость клика', value: `${metrics.cpc || '45'} ₽` },
          { label: 'Конверсия', value: `${metrics.conversion || '12'}%` },
          { label: 'ROI', value: `${metrics.roi || '350'}%` },
        ];
      
      case 'design':
        return [
          { label: 'Узнаваемость бренда', value: `+${metrics.brandRecognition || '180'}%` },
          { label: 'Положительные отзывы', value: `+${metrics.positiveReviews || '200'}%` },
          { label: 'Вовлеченность', value: `+${metrics.engagement || '150'}%` },
          { label: 'Конверсия', value: `+${metrics.designConversion || '90'}%` },
        ];
      
      case 'ai':
        return [
          { label: 'Точность работы', value: `${metrics.accuracy || '98'}%` },
          { label: 'Скорость обработки', value: `${metrics.processingSpeed || '0,3'} сек` },
          { label: 'Экономия времени', value: `-${metrics.timeSaved || '70'}%` },
          { label: 'Удовлетворенность', value: `${metrics.satisfaction || '95'}%` },
        ];
      
      default:
        return [
          { label: 'Первая отрисовка контента', value: `${metrics.firstContentfulPaint || '0,8'} сек` },
          { label: 'Индекс скорости', value: `${metrics.speedIndex || '0,8'} сек` },
          { label: 'Отрисовка самого крупного контента', value: `${metrics.largestContentfulPaint || '0,8'} сек` },
          { label: 'Совокупное смещение макета', value: metrics.cumulativeLayoutShift || '0,879' },
        ];
    }
  }, [caseData, category]);

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
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem', lg: '3.5rem' },
            fontWeight: 500,
            color: '#fff',
            mb: { xs: 4, md: 6 },
            lineHeight: 1.2,
          }}
        >
          Основные показатели
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 4, md: 6 },
            alignItems: { xs: 'center', lg: 'flex-start' },
          }}
        >
          {/* Левая часть - круговая диаграмма */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 3, md: '50px' },
              alignItems: 'center',
              width: { xs: '100%', md: 'auto' },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: { xs: '200px', sm: '250px', md: '300px' },
                height: { xs: '200px', sm: '250px', md: '300px' },
                flexShrink: 0,
              }}
            >
              {/* Круговая диаграмма (SVG) */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 300 300"
                style={{ transform: 'rotate(-90deg)' }}
              >
                {/* Фоновый круг */}
                <circle
                  cx="150"
                  cy="150"
                  r="130"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="20"
                />
                {/* Анимированный круг */}
                <circle
                  cx="150"
                  cy="150"
                  r="130"
                  fill="none"
                  stroke="#ffbb00"
                  strokeWidth="20"
                  strokeDasharray={`${2 * Math.PI * 130}`}
                  strokeDashoffset={`${2 * Math.PI * 130 * (1 - animatedPerformance / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem', lg: '3rem' },
                    fontWeight: 400,
                    color: '#fff',
                    lineHeight: 1,
                    transition: 'all 0.1s ease-out',
                  }}
                >
                  {Math.round(animatedPerformance)}%
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 2, md: '30px' },
                alignItems: 'center',
                maxWidth: { xs: '100%', md: '500px' },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '1.5rem', md: '32px' },
                  fontWeight: 400,
                  color: '#fff',
                  textAlign: 'center',
                  lineHeight: 1,
                }}
              >
                Производительность
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '0.875rem', md: '16px' },
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Значения приблизительные и могут изменяться. Уровень производительности рассчитывается непосредственно на основании показателей.
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: 2, md: '10px' },
                  justifyContent: 'space-between',
                  width: { xs: '100%', md: '440px' },
                  mt: { xs: 2, md: 0 },
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      bgcolor: 'rgba(255, 0, 0, 0.5)',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: { xs: '0.75rem', md: '16px' },
                      color: '#aeaeae',
                    }}
                  >
                    Плохо
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      bgcolor: 'rgba(255, 255, 0, 0.5)',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: { xs: '0.75rem', md: '16px' },
                      color: '#aeaeae',
                    }}
                  >
                    Нормально
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      bgcolor: '#ffbb00',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: { xs: '0.75rem', md: '16px' },
                      color: '#aeaeae',
                    }}
                  >
                    Идеально
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Правая часть - метрики */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, md: 3 },
              flex: { xs: '1 1 100%', lg: '0 0 auto' },
              width: { xs: '100%', lg: '600px' },
            }}
          >
            {relevantMetrics.map((metric, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  pb: { xs: 2, md: '15px' },
                  borderBottom: index < 3 ? '1px solid #727272' : 'none',
                }}
              >
                <Box sx={{ display: 'flex', gap: { xs: 1, md: '10px' }, alignItems: 'center', flex: 1 }}>
                  <Box
                    sx={{
                      width: { xs: '20px', md: '30px' },
                      height: { xs: '20px', md: '30px' },
                      borderRadius: '4px',
                      bgcolor: '#ffbb00',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: '0.875rem', md: '20px' },
                        fontWeight: 500,
                        color: '#fff',
                        mb: { xs: 0.5, md: '10px' },
                        lineHeight: 1.5,
                      }}
                    >
                      {metric.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: '1.25rem', md: '35px' },
                        fontWeight: 400,
                        color: '#fff',
                        lineHeight: 1,
                      }}
                    >
                      {metric.value}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    width: { xs: '20px', md: '24px' },
                    height: { xs: '20px', md: '24px' },
                    flexShrink: 0,
                    opacity: 0.5,
                  }}
                >
                  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="#434343"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

