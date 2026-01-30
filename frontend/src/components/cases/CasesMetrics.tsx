import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';
import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Блок метрик с индивидуальными показателями для каждого кейса
 * Основан на дизайне из Figma
 */
export function CasesMetrics() {
  const { slug } = useParams<{ slug?: string }>();
  const [animatedDays, setAnimatedDays] = useState(0);
  const [animatedSecond, setAnimatedSecond] = useState(0);
  const metricsRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  
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
  
  // Второй показатель зависит от категории
  const secondMetric = useMemo(() => {
    switch (category) {
      case 'website':
        return { value: metrics.pages || 75, label: 'стр', description: 'объем сайта' };
      case 'mobile':
        return { value: metrics.features || 15, label: 'функций', description: 'в приложении' };
      case 'seo':
        return { value: metrics.keywords || 100, label: 'запросов', description: 'в топ-10' };
      case 'advertising':
        return { value: metrics.campaigns || 5, label: 'кампаний', description: 'настроено' };
      case 'design':
        return { value: metrics.elements || 20, label: 'элементов', description: 'в стиле' };
      case 'ai':
        return { value: metrics.automations || 8, label: 'автоматизаций', description: 'внедрено' };
      default:
        return { value: metrics.pages || 75, label: 'стр', description: 'объем сайта' };
    }
  }, [category, metrics]);

  // Анимация чисел при скролле
  useEffect(() => {
    if (hasAnimated.current || !metricsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            
            // Анимация дней
            animateValue(0, days, 2000, setAnimatedDays);
            // Анимация второго показателя
            animateValue(0, secondMetric.value, 2000, setAnimatedSecond);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(metricsRef.current);

    return () => {
      observer.disconnect();
    };
  }, [days, secondMetric.value]);

  // Функция анимации значения
  const animateValue = (start: number, end: number, duration: number, setter: (val: number) => void) => {
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing функция (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (end - start) * easeOut);
      
      setter(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setter(end);
      }
    };
    
    requestAnimationFrame(animate);
  };

  // Изображения для галереи (ноутбук и мобильные устройства)
  const gallery = caseData.gallery || [];
  const laptopImage = Array.isArray(gallery) && gallery.length > 0 
    ? resolveImageUrl(typeof gallery[0] === 'string' ? gallery[0] : gallery[0].url, '/legacy/img/cases-medical/metrics-laptop.png')
    : '/legacy/img/cases-medical/metrics-laptop.png';

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#141414',
        py: { xs: 6, md: 8 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          maxWidth: '1170px',
          margin: '0 auto',
          px: { xs: 2, sm: 3, md: 4 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 6, md: 8 },
            alignItems: { xs: 'center', lg: 'flex-start' },
            justifyContent: 'space-between',
          }}
        >
          {/* Левая часть - метрики */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 6, md: 8 },
              alignItems: { xs: 'center', md: 'flex-start' },
              flex: { xs: '1 1 100%', lg: '0 0 auto' },
            }}
          >
            {/* Дни */}
            <Box
              ref={metricsRef}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                alignItems: { xs: 'center', md: 'flex-start' },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '3rem', sm: '4rem', md: '5rem', lg: '6rem' },
                  fontWeight: 600,
                  color: '#ffbb00',
                  lineHeight: 1,
                }}
              >
                {animatedDays}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1.25rem', md: '1.5rem', lg: '2rem' },
                  fontWeight: 600,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                дней
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '0.875rem', md: '1rem', lg: '1.25rem' },
                  color: 'rgba(255, 255, 255, 0.7)',
                  mt: 1,
                }}
              >
                срок реализации
              </Typography>
            </Box>

            {/* Второй показатель (зависит от категории) */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                alignItems: { xs: 'center', md: 'flex-start' },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '3rem', sm: '4rem', md: '5rem', lg: '6rem' },
                  fontWeight: 600,
                  color: '#ffbb00',
                  lineHeight: 1,
                }}
              >
                {animatedSecond}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1.25rem', md: '1.5rem', lg: '2rem' },
                  fontWeight: 600,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                {secondMetric.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '0.875rem', md: '1rem', lg: '1.25rem' },
                  color: 'rgba(255, 255, 255, 0.7)',
                  mt: 1,
                }}
              >
                {secondMetric.description}
              </Typography>
            </Box>
          </Box>

        {/* Правая часть - изображения (скрыто на мобильных) */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'block' },
            flex: '0 0 40%',
            maxWidth: '500px',
          }}
        >
          <SafeImage
            src={laptopImage}
            alt="Макет проекта"
            fallback={fallbackImageUrl()}
            hideOnError={true}
            sx={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>
        </Box>
      </Box>
    </Box>
  );
}

