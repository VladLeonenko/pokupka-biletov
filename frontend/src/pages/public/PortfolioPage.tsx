import { useState, useMemo, useEffect, useRef, useLayoutEffect, SyntheticEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, CircularProgress
} from '@mui/material';
import { listPublicCases } from '@/services/publicApi';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { SafeImage } from '@/components/common/SafeImage';

type Category = 'all' | 'website' | 'mobile' | 'ai' | 'seo' | 'advertising' | 'design' | 'marketing';

function getCategoryFromCase(caseItem: any): 'website' | 'mobile' | 'ai' | 'seo' | 'advertising' | 'design' | 'marketing' {
  // Если категория указана явно, используем её
  if (caseItem.category && ['website', 'mobile', 'ai', 'seo', 'advertising', 'design', 'marketing'].includes(caseItem.category)) {
    return caseItem.category;
  }
  
  // Определяем категорию по tools, title, summary или другим признакам
  const tools = caseItem.tools || [];
  const title = (caseItem.title || '').toLowerCase();
  const summary = (caseItem.summary || '').toLowerCase();
  const tags = (caseItem.tags || []).map((t: string) => t.toLowerCase());
  
  // AI Boost Team
  if (
    title.includes('ai') ||
    title.includes('искусственный интеллект') ||
    title.includes('boost team') ||
    summary.includes('ai') ||
    summary.includes('искусственный интеллект') ||
    summary.includes('boost team') ||
    tags.some((t: string) => t.includes('ai') || t.includes('boost'))
  ) {
    return 'ai';
  }
  
  // SEO / Продвижение
  if (
    title.includes('seo') ||
    title.includes('продвижение') ||
    title.includes('вывод в топ') ||
    title.includes('позиции') ||
    summary.includes('seo') ||
    summary.includes('продвижение') ||
    summary.includes('вывод в топ') ||
    tags.some((t: string) => t.includes('seo') || t.includes('продвижение'))
  ) {
    return 'seo';
  }
  
  // Маркетинг (проверяем перед рекламой)
  if (
    title.includes('маркетинг') ||
    title.includes('marketing') ||
    title.includes('smm') ||
    title.includes('социальные сети') ||
    title.includes('контент-маркетинг') ||
    title.includes('email-маркетинг') ||
    summary.includes('маркетинг') ||
    summary.includes('marketing') ||
    summary.includes('smm') ||
    summary.includes('социальные сети') ||
    tags.some((t: string) => t.includes('маркетинг') || t.includes('marketing') || t.includes('smm'))
  ) {
    return 'marketing';
  }
  
  // Реклама
  if (
    title.includes('реклама') ||
    title.includes('контекст') ||
    title.includes('таргет') ||
    summary.includes('реклама') ||
    summary.includes('контекст') ||
    summary.includes('таргет') ||
    tags.some((t: string) => t.includes('реклама') || t.includes('контекст'))
  ) {
    return 'advertising';
  }
  
  // Дизайн
  if (
    title.includes('дизайн') ||
    title.includes('брендинг') ||
    title.includes('логотип') ||
    summary.includes('дизайн') ||
    summary.includes('брендинг') ||
    tags.some((t: string) => t.includes('дизайн') || t.includes('брендинг'))
  ) {
    return 'design';
  }
  
  // Мобильное приложение
  if (
    title.includes('app') || 
    title.includes('приложение') || 
    title.includes('mobile') ||
    summary.includes('app') ||
    summary.includes('приложение') ||
    summary.includes('mobile') ||
    tools.some((t: string) => {
      const toolLower = t.toLowerCase();
      return toolLower.includes('react native') || 
             toolLower.includes('flutter') || 
             toolLower.includes('ios') || 
             toolLower.includes('android') ||
             toolLower.includes('swift') ||
             toolLower.includes('kotlin');
    })
  ) {
    return 'mobile';
  }
  
  // По умолчанию - веб-сайт
  return 'website';
}

export function PortfolioPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [slidesToShow, setSlidesToShow] = useState(4);
  const [slideWidth, setSlideWidth] = useState<number>(0); // State для ширины слайда
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  
  // Состояние для плавной прокрутки
  const scrollPositionRef = useRef(0); // Текущая позиция прокрутки в пикселях
  const velocityRef = useRef(0); // Скорость прокрутки
  const animationFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isHorizontalDragRef = useRef(false);
  
  // Автопрокрутка: скорость в пикселях в секунду (увеличено для плавности)
  const AUTO_SCROLL_SPEED = 50; // пикселей в секунду - плавная непрерывная прокрутка
  const FRICTION = 0.95; // Коэффициент трения для плавной остановки

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['publicCases'],
    queryFn: listPublicCases,
  });

  // Определяем количество слайдов в зависимости от ширины экрана (уменьшено для увеличения размера карточек на 20%)
  useEffect(() => {
    const updateSlidesToShow = () => {
      const width = window.innerWidth;
      if (width < 600) {
        setSlidesToShow(1); // xs: 1 слайд
      } else if (width < 960) {
        setSlidesToShow(1.6); // sm: ~1.6 слайда (вместо 2, чтобы карточки были на ~20% больше)
      } else if (width < 1280) {
        setSlidesToShow(2.4); // md: ~2.4 слайда (вместо 3)
      } else {
        setSlidesToShow(3.2); // lg+: ~3.2 слайда (вместо 4, чтобы карточки были на ~20% больше)
      }
    };

    updateSlidesToShow();
    window.addEventListener('resize', updateSlidesToShow);
    return () => window.removeEventListener('resize', updateSlidesToShow);
  }, []);

  // Фильтруем кейсы по категории
  const filteredCases = useMemo(() => {
    if (selectedCategory === 'all') {
      // Для "Портфолио" показываем микс всех категорий в случайном порядке
      const shuffled = [...cases].sort(() => Math.random() - 0.5);
      return shuffled;
    }
    return cases.filter((caseItem: any) => {
      const category = getCategoryFromCase(caseItem);
      return category === selectedCategory;
    });
  }, [cases, selectedCategory]);
  
  // Генерируем заглушку для кейса (как в TeamCarousel)
  const getCasePlaceholder = (caseItem: any): string => {
    // Получаем первые буквы из названия
    const title = caseItem.title || 'Кейс';
    const words = title.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return 'КЕ';
  };
  
  // Проверяем, нужно ли показывать заглушку
  const shouldShowPlaceholder = (caseItem: any): boolean => {
    // Показываем заглушку только если нет ни одного источника изображения
    const hasHeroImage = caseItem.heroImageUrl && caseItem.heroImageUrl.trim().length > 0;
    const hasDonorImage = caseItem.donorImageUrl && caseItem.donorImageUrl.trim().length > 0;
    const hasCoverPath = caseItem.slug && caseItem.slug.trim().length > 0; // cover.png будет проверен при загрузке
    return !hasHeroImage && !hasDonorImage && !hasCoverPath;
  };

  // Сортируем кейсы по дате создания (новые сначала)
  const sortedCases = useMemo(() => {
    return [...filteredCases].sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredCases]);

  // Плавная бесконечная прокрутка с requestAnimationFrame
  useLayoutEffect(() => {
    if (sortedCases.length === 0 || !carouselContainerRef.current || !carouselRef.current) {
      return;
    }
    const container = carouselContainerRef.current;
    const carousel = carouselRef.current;
    
    // Принудительно вызываем reflow для обновления размеров
    void carousel.offsetHeight;
    
    // Ждем несколько кадров для гарантии правильного расчета размеров DOM
    let rafCount = 0;
    const initCarousel = () => {
      if (!container || !carousel) return;
      
      // Вычисляем ширину одного слайда
      const getSlideWidth = () => {
        return carousel.offsetWidth / slidesToShow;
      };

      // Вычисляем общую ширину всех слайдов в одном наборе
      const getSetWidth = () => {
        return sortedCases.length * getSlideWidth();
      };

      // Проверяем, что размеры рассчитаны корректно
      const slideWidth = getSlideWidth();
      
      if ((slideWidth === 0 || !isFinite(slideWidth)) && rafCount < 10) {
        rafCount++;
        requestAnimationFrame(initCarousel);
        return;
      }
      
      if (slideWidth === 0 || !isFinite(slideWidth)) {
        return;
      }

      // Обновляем state для ширины слайда (триггерит ре-рендер с правильными размерами)
      setSlideWidth(slideWidth);

      // Инициализируем позицию (начинаем со второго набора)
      const setWidth = getSetWidth();
      scrollPositionRef.current = setWidth;

      const animate = (currentTime: number) => {
        if (!container || !carousel) return;

        const slideWidth = getSlideWidth();
        const setWidth = getSetWidth();
      
      // Вычисляем deltaTime для плавной анимации
      const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 1000 : 0.016; // ~60fps
      lastTimeRef.current = currentTime;

      // Применяем автопрокрутку, если не на паузе и не перетаскиваем
      // Изменено направление: теперь прокручивается ВПРАВО (было влево)
      if (!isPausedRef.current && !isDraggingRef.current && !isHorizontalDragRef.current) {
        scrollPositionRef.current += AUTO_SCROLL_SPEED * deltaTime;
      }

      // Применяем инерцию от перетаскивания
      if (velocityRef.current !== 0) {
        scrollPositionRef.current += velocityRef.current * deltaTime;
        velocityRef.current *= FRICTION;
        
        // Останавливаем, если скорость стала слишком малой
        if (Math.abs(velocityRef.current) < 0.1) {
          velocityRef.current = 0;
        }
      }

      // Смещение от перетаскивания применяется напрямую в обработчиках мыши и тача

      // Бесконечная прокрутка: зацикливание
      if (scrollPositionRef.current < 0) {
        scrollPositionRef.current += setWidth * 2;
      } else if (scrollPositionRef.current > setWidth * 2) {
        scrollPositionRef.current -= setWidth * 2;
      }

      // Применяем трансформацию без transition для максимальной плавности
      container.style.transform = `translateX(-${scrollPositionRef.current}px)`;
      container.style.transition = 'none';

        // Продолжаем анимацию
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      // Запускаем анимацию
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Запускаем инициализацию через несколько кадров для гарантии
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(initCarousel);
      });
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [sortedCases.length, slidesToShow]);

  // Сбрасываем позицию при изменении категории (но НЕ останавливаем анимацию)
  useEffect(() => {
    // Сбрасываем состояние взаимодействия
    velocityRef.current = 0;
    isPausedRef.current = false;
    isDraggingRef.current = false;
    isHorizontalDragRef.current = false;
    
    // Устанавливаем начальную позицию для новой категории
    if (sortedCases.length > 0 && carouselRef.current) {
      const slideWidth = carouselRef.current.offsetWidth / slidesToShow;
      const setWidth = sortedCases.length * slideWidth;
      scrollPositionRef.current = setWidth; // Начинаем со второго набора
    }
  }, [selectedCategory]);

  const handleCaseClick = (slug: string) => {
    if (!isDraggingRef.current && !isHorizontalDragRef.current) {
      navigate(`/cases/${slug}`);
    }
  };

  const handleMouseEnter = () => {
    // НЕ останавливаем автопрокрутку при наведении - только при активном взаимодействии
    if (carouselRef.current && !isDraggingRef.current) {
      carouselRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    // Убираем паузу (если была установлена)
    isPausedRef.current = false;
    if (carouselRef.current && !isDraggingRef.current) {
      carouselRef.current.style.cursor = '';
    }
  };

  // Обработчики для drag and drop
  const lastDragXRef = useRef(0);
  const lastDragTimeRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (!carouselRef.current) return;
    
    const rect = carouselRef.current.getBoundingClientRect();
    dragStartXRef.current = e.clientX - rect.left;
    lastDragXRef.current = e.clientX;
    lastDragTimeRef.current = Date.now();
    isDraggingRef.current = true;
    isHorizontalDragRef.current = false;
    isPausedRef.current = true;
    velocityRef.current = 0;
    
    // Устанавливаем курсор
    if (document.body) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }
    if (carouselRef.current) {
      carouselRef.current.style.cursor = 'grabbing';
    }
  };

  // Обработка глобальных событий мыши для drag and drop
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !carouselRef.current) return;
      
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastDragTimeRef.current) / 1000 || 0.016;
      lastDragTimeRef.current = currentTime;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      const deltaX = currentX - lastDragXRef.current;
      const rect = carouselRef.current.getBoundingClientRect();
      const startY = dragStartXRef.current + rect.top;
      const deltaY = Math.abs(currentY - startY);
      
      // Определяем направление движения
      if (!isHorizontalDragRef.current) {
        if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > deltaY * 1.5) {
          isHorizontalDragRef.current = true;
          // Обновляем курсор при начале горизонтального движения
          if (document.body) {
            document.body.style.cursor = 'grabbing';
          }
          if (carouselRef.current) {
            carouselRef.current.style.cursor = 'grabbing';
          }
        }
      }
      
      if (isHorizontalDragRef.current) {
        e.preventDefault();
        e.stopPropagation();
        
        // Вычисляем скорость для инерции
        if (deltaTime > 0) {
          velocityRef.current = deltaX / deltaTime;
        }
        
        // Применяем смещение напрямую к позиции
        scrollPositionRef.current -= deltaX;
        lastDragXRef.current = currentX;
      }
    };

    const handleGlobalMouseUp = () => {
      if (!isDraggingRef.current) return;
      
      isDraggingRef.current = false;
      isPausedRef.current = false;
      
      // Восстанавливаем курсор
      if (document.body) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (carouselRef.current) {
        carouselRef.current.style.cursor = 'grab';
      }
      
      // Не сбрасываем isHorizontalDragRef сразу, чтобы не сбрасывать инерцию
      setTimeout(() => {
        isHorizontalDragRef.current = false;
      }, 100);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false, capture: true });
    document.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });
    document.addEventListener('mouseleave', handleGlobalMouseUp, { capture: true });

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
      document.removeEventListener('mouseleave', handleGlobalMouseUp, { capture: true });
    };
  }, []);

  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Обработчик скролла тачпада (wheel event)
  useEffect(() => {
    // Ждем, пока карусель будет готова
    const initWheelHandler = () => {
      if (!carouselRef.current || !slideWidth) {
        return;
      }

      const handleWheel = (e: WheelEvent) => {
        if (!carouselRef.current) return;
        
        // Проверяем, является ли скролл горизонтальным
        const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY) || (e.shiftKey && Math.abs(e.deltaY) > 0);
        
        if (isHorizontalScroll) {
          e.preventDefault();
          e.stopPropagation();
          
          // Временно останавливаем автопрокрутку при активном скролле
          isPausedRef.current = true;
          
          // Определяем направление скролла (инвертируем для правильного направления)
          const scrollDelta = e.deltaX !== 0 ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
          
          // Применяем скролл к позиции (инвертируем знак для правильного направления)
          scrollPositionRef.current += scrollDelta;
          
          // Вычисляем скорость для инерции (инвертируем знак)
          velocityRef.current = scrollDelta * 0.3;
          
          // Возобновляем автопрокрутку быстрее после окончания скролла
          if (wheelTimeoutRef.current) {
            clearTimeout(wheelTimeoutRef.current);
          }
          wheelTimeoutRef.current = setTimeout(() => {
            isPausedRef.current = false;
            velocityRef.current *= 0.5; // Быстро убираем инерцию для возврата к autoplay
          }, 500); // Увеличено с 200 до 500мс
        }
      };

      const carousel = carouselRef.current;
      carousel.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        carousel.removeEventListener('wheel', handleWheel);
        if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current);
        }
      };
    };

    // Запускаем после того, как slideWidth установлен
    if (slideWidth > 0) {
      return initWheelHandler();
    }
  }, [slideWidth]);

  // Обработчики для touch событий
  const lastTouchXRef = useRef(0);
  const lastTouchTimeRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!carouselRef.current) return;
    
    const touch = e.touches[0];
    const rect = carouselRef.current.getBoundingClientRect();
    dragStartXRef.current = touch.clientX - rect.left;
    lastTouchXRef.current = touch.clientX;
    lastTouchTimeRef.current = Date.now();
    isDraggingRef.current = true;
    isHorizontalDragRef.current = false;
    isPausedRef.current = true;
    velocityRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !carouselRef.current) return;
    
    const touch = e.touches[0];
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTouchTimeRef.current) / 1000 || 0.016;
    lastTouchTimeRef.current = currentTime;
    
    const rect = carouselRef.current.getBoundingClientRect();
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = currentX - lastTouchXRef.current;
    const startY = dragStartXRef.current + rect.top;
    const deltaY = Math.abs(touch.clientY - startY);
    
    if (!isHorizontalDragRef.current) {
      if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > deltaY * 1.5) {
        isHorizontalDragRef.current = true;
      }
    }
    
    if (isHorizontalDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      
      if (deltaTime > 0) {
        velocityRef.current = deltaX / deltaTime;
      }
      
      // Применяем смещение (инвертируем для правильного направления)
      scrollPositionRef.current -= deltaX;
      lastTouchXRef.current = currentX;
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    isPausedRef.current = false;
    isHorizontalDragRef.current = false;
  };

  return (
    <>
      <SeoMetaTags
        title="Портфолио - Примеры работ PrimeCoder"
        description="Портфолио выполненных проектов веб-студии PrimeCoder. Разработка сайтов, мобильных приложений, дизайн и продвижение."
        keywords="портфолио, кейсы, примеры работ, разработка сайтов, мобильные приложения"
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />
    <Box
      sx={{
        minHeight: '100vh',
          color: '#fff',
          pt: 0,
          pb: 0,
        }}
      >
        <Container maxWidth="xl" sx={{ pt: { xs: '100px', md: '120px' }, pb: { xs: '60px', md: '80px' } }}>
          {/* Header with filters and counter */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 3,
              mb: { xs: 4, md: 6 },
            }}
          >
            {/* Title - ОГРОМНЫЙ ТЕКСТ ПО ЦЕНТРУ */}
            <Box sx={{ 
              position: 'relative',
              width: '100%',
              mb: 4,
              py: { xs: 4, md: 6 },
            }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '4rem', sm: '6rem', md: '10rem', lg: '12rem' },
                  fontWeight: 700,
                  color: '#fff',
                  opacity: 0.35,
                  textTransform: 'uppercase',
                  letterSpacing: { xs: '-0.03em', md: '-0.05em' },
                  lineHeight: 1,
                  textAlign: 'center',
                  userSelect: 'none',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,187,0,0.3) 50%, rgba(255,255,255,0.2) 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'fadeInScale 1.5s ease-out',
                  '@keyframes fadeInScale': {
                    '0%': {
                      opacity: 0,
                      transform: 'scale(0.8)',
                    },
                    '100%': {
                      opacity: 0.35,
                      transform: 'scale(1)',
                    },
                  },
                }}
              >
                Портфолио
              </Typography>
            </Box>

            {/* Filters */}
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, md: 2 },
                alignItems: 'center',
              }}
            >
              <Box
                onClick={() => setSelectedCategory('all')}
                sx={{
                  cursor: 'pointer',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: selectedCategory === 'all' ? 500 : 300,
                  color: selectedCategory === 'all' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'color 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  '&:hover': {
                    color: '#fff',
                  },
                }}
              >
                Портфолио
              </Box>
              <Box
                sx={{
                  width: '1px',
                  height: '16px',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }}
              />
              <Box
                onClick={() => setSelectedCategory('website')}
                sx={{
                  cursor: 'pointer',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: selectedCategory === 'website' ? 500 : 300,
                  color: selectedCategory === 'website' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'color 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  '&:hover': {
                    color: '#fff',
                  },
                }}
              >
                Сайты
              </Box>
              <Box
                sx={{
                  width: '1px',
                  height: '16px',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }}
              />
              <Box
                onClick={() => setSelectedCategory('mobile')}
                sx={{
                  cursor: 'pointer',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: selectedCategory === 'mobile' ? 500 : 300,
                  color: selectedCategory === 'mobile' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'color 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  '&:hover': {
                    color: '#fff',
                  },
                }}
              >
                Приложения
              </Box>
              <Box
                sx={{
                  width: '1px',
                  height: '16px',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }}
              />
              <Box
                onClick={() => setSelectedCategory('ai')}
                sx={{
                  cursor: 'pointer',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: selectedCategory === 'ai' ? 500 : 300,
                  color: selectedCategory === 'ai' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'color 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  '&:hover': {
                    color: '#fff',
                  },
                }}
              >
                AI Boost Team
              </Box>
              <Box
                sx={{
                  width: '1px',
                  height: '16px',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }}
              />
              <Box
                onClick={() => setSelectedCategory('seo')}
                sx={{
                  cursor: 'pointer',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: selectedCategory === 'seo' ? 500 : 300,
                  color: selectedCategory === 'seo' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'color 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  '&:hover': {
                    color: '#fff',
                  },
                }}
              >
                SEO
              </Box>
              <Box
                sx={{
                  width: '1px',
                  height: '16px',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }}
              />
              <Box
                onClick={() => setSelectedCategory('marketing')}
                sx={{
                  cursor: 'pointer',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: selectedCategory === 'marketing' ? 500 : 300,
                  color: selectedCategory === 'marketing' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'color 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  '&:hover': {
                    color: '#fff',
                  },
                }}
              >
                Маркетинг
              </Box>
              <Box
                sx={{
                  width: '1px',
                  height: '16px',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }}
              />
              <Box
                onClick={() => setSelectedCategory('advertising')}
                sx={{
                  cursor: 'pointer',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: selectedCategory === 'advertising' ? 500 : 300,
                  color: selectedCategory === 'advertising' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'color 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  '&:hover': {
                    color: '#fff',
                  },
                }}
              >
                Реклама
              </Box>
            </Box>

            {/* Counter */}
            <Typography
              sx={{
                fontSize: { xs: '0.875rem', md: '1rem' },
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 300,
                letterSpacing: '0.05em',
              }}
            >
              {sortedCases.length} / {sortedCases.length}
            </Typography>
          </Box>

          {/* Carousel */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#fff' }} />
            </Box>
          ) : sortedCases.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Проекты не найдены
              </Typography>
            </Box>
          ) : (
            <Box
              ref={carouselRef}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              sx={{
                position: 'relative',
                width: '100%',
                overflow: 'hidden',
                cursor: 'grab',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'pan-x',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* Carousel Container - Бесконечная прокрутка */}
              <Box
                ref={carouselContainerRef}
                sx={{
                  display: 'flex',
                  willChange: 'transform',
                }}
              >
                {/* Дублируем кейсы для бесконечной прокрутки */}
                {[...sortedCases, ...sortedCases, ...sortedCases].map((caseItem: any, index: number) => {
                  const category = getCategoryFromCase(caseItem);
                  const showPlaceholder = shouldShowPlaceholder(caseItem);
                  const placeholderText = getCasePlaceholder(caseItem);
                  
                  return (
                    <Box
                      key={`${caseItem.slug}-${Math.floor(index / sortedCases.length)}-${index % sortedCases.length}`}
                      sx={{
                        width: slideWidth > 0 ? `${slideWidth}px` : (carouselRef.current ? (carouselRef.current.offsetWidth / slidesToShow) : '100%'),
                        minWidth: slideWidth > 0 ? `${slideWidth}px` : (carouselRef.current ? (carouselRef.current.offsetWidth / slidesToShow) : '100%'),
                        px: { xs: 1, sm: 1.5, md: 2 },
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        className="MuiBox-root portfolio-card"
                        sx={{
                          position: 'relative',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'transform 0.4s ease',
                          width: '100%',
                          height: '300px',
                          maxHeight: '300px',
                          flexShrink: 0,
                          '&:hover': {
                            transform: !isDraggingRef.current ? 'scale(1.05)' : 'none',
                          },
                        }}
                        onClick={(e) => {
                          if (!isDraggingRef.current && !isHorizontalDragRef.current) {
                            handleCaseClick(caseItem.slug);
                          }
                        }}
                      >
                        {/* Заглушка или изображение */}
                        {showPlaceholder ? (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              zIndex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              fontSize: '64px',
                              color: 'rgba(255, 255, 255, 0.4)',
                              fontWeight: 300,
                              letterSpacing: '4px',
                            }}
                          >
                            {placeholderText}
                          </Box>
                        ) : (
                          <SafeImage
                            src={
                              caseItem.heroImageUrl?.trim() || 
                              (caseItem.slug ? `/legacy/img/cases/${caseItem.slug}/cover.png` : null) ||
                              caseItem.donorImageUrl?.trim() ||
                              null
                            }
                            fallback={fallbackImageUrl()}
                            alt={caseItem.title || 'Кейс'}
                            className="portfolio-image"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              zIndex: 1,
                              objectFit: 'cover',
                              display: 'block',
                              visibility: 'visible',
                              opacity: 1,
                            }}
                            hideOnError={false}
                            lazy={true}
                          />
                        )}
                        
                        {/* Overlay с градиентом для текста */}
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            zIndex: 2,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0) 100%)',
                            p: { xs: 2, md: 3 },
                            pt: { xs: 4, md: 6 },
                          }}
                        >
                          {/* Title and Category */}
                          <Typography
                            sx={{
                              fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.5rem' },
                              fontWeight: 400,
                              color: '#fff',
                              mb: 0.5,
                              lineHeight: 1.3,
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {caseItem.title || 'Без названия'}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.125rem' },
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontWeight: 300,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {category === 'mobile' ? 'Мобильное приложение' :
                             category === 'ai' ? 'AI Boost Team' :
                             category === 'seo' ? 'SEO продвижение' :
                             category === 'marketing' ? 'Маркетинг' :
                             category === 'advertising' ? 'Реклама' :
                             category === 'design' ? 'Дизайн' :
                             'Корпоративный сайт'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Container>

        <style>{`
          /* Стили для меню - скрыто по умолчанию, показывается только при открытии */
          .menu {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            opacity: 0 !important;
            visibility: hidden !important;
            z-index: 50 !important;
            pointer-events: none !important;
            transition: opacity 0.3s ease, visibility 0.3s ease !important;
          }
          
          /* Меню показывается только когда чекбокс отмечен */
          #burger-toggle:checked ~ .menu {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            z-index: 52 !important;
          }
          
          /* Убеждаемся, что portfolio-image видим */
          .portfolio-image {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            max-width: 100% !important;
            height: auto !important;
          }
          
          /* Ограничиваем высоту карточек портфолио */
          .portfolio-card,
          .portfolio-card.MuiBox-root,
          .MuiBox-root.portfolio-card {
            max-height: 300px !important;
            height: 300px !important;
            min-height: 300px !important;
          }
          
          /* Ограничиваем высоту всех контейнеров карточек портфолио в карусели */
          [class*="MuiBox-root"].portfolio-card {
            max-height: 300px !important;
            height: 300px !important;
            min-height: 300px !important;
          }
          
          /* Отключаем выделение текста при перетаскивании */
          .portfolio-card * {
            pointer-events: none;
            user-select: none;
            -webkit-user-select: none;
          }
          
          /* Убеждаемся, что изображение заполняет весь контейнер */
          .portfolio-card .portfolio-image {
            height: 100% !important;
            min-height: 300px !important;
            max-height: 300px !important;
          }
        `}</style>
      </Box>
    </>
  );
}
