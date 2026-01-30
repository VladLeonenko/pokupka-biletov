import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { motion } from 'framer-motion';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

interface TeamMember {
  name: string;
  role: string;
  imageUrl?: string;
}

interface TeamCarouselProps {
  members: TeamMember[];
  title?: string;
  description?: string;
}

const AUTO_SCROLL_SPEED = 50; // пикселей в секунду
const FRICTION = 0.95;

export function TeamCarousel({ members, title, description }: TeamCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const [slidesToShow, setSlidesToShow] = useState(4);
  
  const scrollPositionRef = useRef(0);
  const velocityRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isHorizontalDragRef = useRef(false);

  useEffect(() => {
    const updateSlidesToShow = () => {
      const width = window.innerWidth;
      if (width < 600) {
        setSlidesToShow(1);
      } else if (width < 960) {
        setSlidesToShow(1.6);
      } else if (width < 1280) {
        setSlidesToShow(2.4);
      } else {
        setSlidesToShow(3.2);
      }
    };
    updateSlidesToShow();
    window.addEventListener('resize', updateSlidesToShow);
    return () => window.removeEventListener('resize', updateSlidesToShow);
  }, []);

  useLayoutEffect(() => {
    if (members.length === 0 || !carouselContainerRef.current || !carouselRef.current) {
      return;
    }
    
    const container = carouselContainerRef.current;
    const carousel = carouselRef.current;
    
    void carousel.offsetHeight;
    
    let rafCount = 0;
    const initCarousel = () => {
      if (!container || !carousel) return;
      
      const getSlideWidth = () => carousel.offsetWidth / slidesToShow;
      const getSetWidth = () => members.length * getSlideWidth();
      
      const slideWidth = getSlideWidth();
      if ((slideWidth === 0 || !isFinite(slideWidth)) && rafCount < 10) {
        rafCount++;
        requestAnimationFrame(initCarousel);
        return;
      }
      if (slideWidth === 0 || !isFinite(slideWidth)) return;
      
      const setWidth = getSetWidth();
      scrollPositionRef.current = setWidth;
      setSlideWidth(slideWidth);
      
      const animate = (currentTime: number) => {
        if (!container || !carousel) return;
        
        const slideWidth = getSlideWidth();
        const setWidth = getSetWidth();
        const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 1000 : 0.016;
        lastTimeRef.current = currentTime;
        
        if (!isPausedRef.current && !isDraggingRef.current && !isHorizontalDragRef.current) {
          scrollPositionRef.current += AUTO_SCROLL_SPEED * deltaTime;
        }
        
        if (velocityRef.current !== 0) {
          scrollPositionRef.current += velocityRef.current * deltaTime;
          velocityRef.current *= FRICTION;
          if (Math.abs(velocityRef.current) < 0.1) {
            velocityRef.current = 0;
          }
        }
        
        if (scrollPositionRef.current < 0) {
          scrollPositionRef.current += setWidth * 2;
        } else if (scrollPositionRef.current > setWidth * 2) {
          scrollPositionRef.current -= setWidth * 2;
        }
        
        container.style.transform = `translateX(-${scrollPositionRef.current}px)`;
        container.style.transition = 'none';
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
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
  }, [members.length, slidesToShow]);

  const lastDragXRef = useRef(0);
  const lastDragTimeRef = useRef(0);
  const [slideWidth, setSlideWidth] = useState(0);

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
    
    if (document.body) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }
    if (carouselRef.current) {
      carouselRef.current.style.cursor = 'grabbing';
    }
  };

  // Обработчики для drag and drop мышью
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !carouselRef.current || !carouselContainerRef.current) return;
      
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
          }, 500);
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
    
    setTimeout(() => {
      isHorizontalDragRef.current = false;
    }, 100);
  };

  // Дублируем массив для бесконечной прокрутки
  const duplicatedMembers = [...members, ...members, ...members];

  return (
    <Box sx={{ mt: 8 }}>
      {title && (
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body1" color="rgba(255,255,255,0.78)" sx={{ mb: 4, whiteSpace: 'pre-line', maxWidth: 820 }}>
          {description}
        </Typography>
      )}
      <Box
        ref={carouselRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <Box
          ref={carouselContainerRef}
          sx={{
            display: 'flex',
            willChange: 'transform',
          }}
        >
          {duplicatedMembers.map((member, idx) => (
            <Box
              key={idx}
              sx={{
                flex: `0 0 ${100 / slidesToShow}%`,
                px: 1.5,
              }}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  bgcolor: 'rgba(17,18,36,0.78)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  transition: 'transform 0.35s ease, border-color 0.35s ease',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    borderColor: 'rgba(149,140,255,0.35)',
                  },
                }}
              >
                {member.imageUrl && (
                  <Box
                    component="img"
                    src={resolveImageUrl(member.imageUrl)}
                    alt={member.name}
                    sx={{
                      width: '100%',
                      height: 280,
                      objectFit: 'cover',
                      filter: 'brightness(0.9)',
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = fallbackImageUrl();
                    }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {member.name}
                  </Typography>
                  <Typography variant="subtitle2" color="rgba(149,140,255,0.85)">
                    {member.role}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

