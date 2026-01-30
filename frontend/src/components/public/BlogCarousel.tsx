import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Box, Typography, Card, CardContent, CardMedia } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  publishedAt: string | null;
  coverImage?: string;
}

interface BlogCarouselProps {
  posts: BlogPost[];
}

export function BlogCarousel({ posts }: BlogCarouselProps) {
  const navigate = useNavigate();
  const [slidesToShow, setSlidesToShow] = useState(3.2);
  const [slideWidth, setSlideWidth] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  
  // Состояние для плавной прокрутки
  const scrollPositionRef = useRef(0);
  const velocityRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isHorizontalDragRef = useRef(false);
  
  // Автопрокрутка: скорость в пикселях в секунду
  const AUTO_SCROLL_SPEED = 50;
  const FRICTION = 0.95;

  // Определяем количество слайдов в зависимости от ширины экрана
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

  // Функция извлечения изображения из HTML
  const extractImage = (body: string): string => {
    if (!body) return '/legacy/img/blog-item-default.png';
    const imgMatch = body.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch) {
      let imgSrc = imgMatch[1];
      if (imgSrc.startsWith('@img/')) {
        imgSrc = '/legacy/img/' + imgSrc.substring(5);
      } else if (!imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
        imgSrc = '/legacy/img/' + imgSrc;
      }
      return imgSrc;
    }
    return '/legacy/img/blog-item-default.png';
  };

  // Функция форматирования даты
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Нет даты';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return 'Нет даты';
    }
  };

  // Извлечение текстового превью
  const extractExcerpt = (body: string, maxLength: number = 150): string => {
    if (!body) return '';
    const text = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Плавная бесконечная прокрутка с requestAnimationFrame
  useLayoutEffect(() => {
    if (posts.length === 0 || !carouselContainerRef.current || !carouselRef.current) {
      return;
    }
    const container = carouselContainerRef.current;
    const carousel = carouselRef.current;
    
    void carousel.offsetHeight;
    
    let rafCount = 0;
    const initCarousel = () => {
      if (!container || !carousel) return;
      
      const getSlideWidth = () => {
        return carousel.offsetWidth / slidesToShow;
      };

      const getSetWidth = () => {
        return posts.length * getSlideWidth();
      };

      const slideWidth = getSlideWidth();
      
      if ((slideWidth === 0 || !isFinite(slideWidth)) && rafCount < 10) {
        rafCount++;
        requestAnimationFrame(initCarousel);
        return;
      }
      
      if (slideWidth === 0 || !isFinite(slideWidth)) {
        return;
      }
      
      setSlideWidth(slideWidth);

      let lastTime = performance.now();
      
      const animate = (currentTime: number) => {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        if (!isPausedRef.current && !isDraggingRef.current) {
          velocityRef.current += AUTO_SCROLL_SPEED * deltaTime;
        }
        
        velocityRef.current *= FRICTION;
        scrollPositionRef.current += velocityRef.current * deltaTime;
        
        const setWidth = getSetWidth();
        
        if (scrollPositionRef.current >= setWidth) {
          scrollPositionRef.current -= setWidth;
        } else if (scrollPositionRef.current < 0) {
          scrollPositionRef.current += setWidth;
        }
        
        const translateX = -scrollPositionRef.current;
        carousel.style.transform = `translateX(${translateX}px)`;
        
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
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [posts.length, slidesToShow]);

  // Mouse drag handlers
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!carouselContainerRef.current?.contains(e.target as Node)) return;
      
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      lastTimeRef.current = performance.now();
      isHorizontalDragRef.current = false;
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      
      const deltaX = e.clientX - dragStartXRef.current;
      
      if (!isHorizontalDragRef.current && Math.abs(deltaX) > 5) {
        isHorizontalDragRef.current = true;
      }
      
      if (isHorizontalDragRef.current) {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTimeRef.current) / 1000;
        
        if (deltaTime > 0) {
          velocityRef.current = -deltaX / deltaTime;
        }
        
        scrollPositionRef.current -= deltaX;
        dragStartXRef.current = e.clientX;
        lastTimeRef.current = currentTime;
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        isHorizontalDragRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Wheel handler для управления тачпадом (только горизонтальное движение)
  useEffect(() => {
    if (slideWidth === 0) return;
    
    let wheelTimeoutRef: NodeJS.Timeout | null = null;
    
    const handleWheel = (e: WheelEvent) => {
      if (!carouselContainerRef.current?.contains(e.target as Node)) return;
      
      // Реагируем только на горизонтальное движение (deltaX)
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;
      
      // Проверяем, что горизонтальное движение преобладает над вертикальным
      if (Math.abs(deltaX) > Math.abs(deltaY) * 0.5 && Math.abs(deltaX) > 0) {
        e.preventDefault();
        
        isPausedRef.current = true;
        velocityRef.current += deltaX * 3;
        
        if (wheelTimeoutRef) clearTimeout(wheelTimeoutRef);
        
        wheelTimeoutRef = setTimeout(() => {
          isPausedRef.current = false;
        }, 500);
      }
    };

    carouselContainerRef.current?.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      if (wheelTimeoutRef) clearTimeout(wheelTimeoutRef);
      carouselContainerRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [slideWidth]);

  if (posts.length === 0) {
    return null;
  }

  // Дублируем посты для бесконечной прокрутки
  const duplicatedPosts = [...posts, ...posts, ...posts];

  return (
    <Box
      ref={carouselContainerRef}
      sx={{
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        py: 6,
      }}
    >
      <Typography
        variant="h3"
        sx={{
          textAlign: 'center',
          mb: 4,
          fontWeight: 700,
          color: '#ffffff',
        }}
      >
        Блог
      </Typography>

      <Box
        ref={carouselRef}
        sx={{
          display: 'flex',
          gap: 3,
          willChange: 'transform',
        }}
      >
        {duplicatedPosts.map((post, index) => {
          const image = resolveImageUrl(post.coverImage || extractImage(post.body));
          const excerpt = post.excerpt || extractExcerpt(post.body);
          
          return (
            <Card
              key={`${post.slug}-${index}`}
              onClick={() => navigate(`/blog/${post.slug}`)}
              sx={{
                minWidth: slideWidth > 0 ? `${slideWidth}px` : '100%',
                width: slideWidth > 0 ? `${slideWidth}px` : '100%',
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                bgcolor: '#1e1e1e',
                color: '#ffffff',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 24px rgba(255, 187, 0, 0.3)',
                },
              }}
            >
              <CardMedia
                component="img"
                image={image}
                alt={post.title}
                sx={{
                  height: '300px',
                  objectFit: 'cover',
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                }}
              />
              <CardContent
                sx={{
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                  minHeight: 120,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#ffbb00',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    mb: 0.5,
                    display: 'block',
                    fontSize: '0.7rem',
                  }}
                >
                  {formatDate(post.publishedAt)}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: '#ffffff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {post.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    fontSize: '0.75rem',
                  }}
                >
                  {excerpt}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

