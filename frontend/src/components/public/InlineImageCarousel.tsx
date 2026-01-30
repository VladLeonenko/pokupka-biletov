import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, CardMedia, Typography, Button } from '@mui/material';

export interface InlineCarouselSlide {
  imageUrl: string;
  caption?: string;
  alt?: string;
  linkUrl?: string;
}

interface InlineImageCarouselProps {
  slides: InlineCarouselSlide[];
  title?: string;
}

export function InlineImageCarousel({ slides, title }: InlineImageCarouselProps) {
  const [slidesToShow, setSlidesToShow] = useState(3.2);
  const [slideWidth, setSlideWidth] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const velocityRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isHorizontalDragRef = useRef(false);

  const AUTO_SCROLL_SPEED = 50;
  const FRICTION = 0.95;

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
    if (slides.length === 0 || !carouselRef.current || !containerRef.current) return;
    const carousel = carouselRef.current;
    const container = containerRef.current;

    void carousel.offsetHeight;
    let rafCount = 0;

    const initCarousel = () => {
      if (!carousel || !container) return;

      const getSlideWidth = () => carousel.offsetWidth / slidesToShow;
      const getSetWidth = () => slides.length * getSlideWidth();

      const currentSlideWidth = getSlideWidth();
      if ((currentSlideWidth === 0 || !isFinite(currentSlideWidth)) && rafCount < 10) {
        rafCount++;
        requestAnimationFrame(initCarousel);
        return;
      }

      if (currentSlideWidth === 0 || !isFinite(currentSlideWidth)) {
        return;
      }

      setSlideWidth(currentSlideWidth);
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
        if (setWidth <= 0) return;

        if (scrollPositionRef.current >= setWidth) {
          scrollPositionRef.current -= setWidth;
        } else if (scrollPositionRef.current < 0) {
          scrollPositionRef.current += setWidth;
        }

        carousel.style.transform = `translateX(${-scrollPositionRef.current}px)`;
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
  }, [slides.length, slidesToShow]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;

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

  useEffect(() => {
    if (slideWidth === 0) return;

    let wheelTimeoutRef: NodeJS.Timeout | null = null;

    const handleWheel = (e: WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;

      const deltaX = e.deltaX;
      const deltaY = e.deltaY;

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

    containerRef.current?.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (wheelTimeoutRef) clearTimeout(wheelTimeoutRef);
      containerRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [slideWidth]);

  if (slides.length === 0) {
    return null;
  }

  const duplicatedSlides = [...slides, ...slides, ...slides];

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        py: 4,
      }}
    >
      {title && (
        <Typography
          variant="h4"
          sx={{
            textAlign: 'center',
            mb: 3,
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          {title}
        </Typography>
      )}
      <Box
        ref={carouselRef}
        sx={{
          display: 'flex',
          gap: 3,
          willChange: 'transform',
        }}
      >
        {duplicatedSlides.map((slide, index) => (
          <Card
            key={`${slide.imageUrl}-${index}`}
            sx={{
              minWidth: slideWidth > 0 ? `${slideWidth}px` : '100%',
              width: slideWidth > 0 ? `${slideWidth}px` : '100%',
              flexShrink: 0,
              cursor: slide.linkUrl ? 'pointer' : 'default',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              bgcolor: '#1e1e1e',
              color: '#ffffff',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 24px rgba(255, 187, 0, 0.3)',
              },
            }}
            onClick={() => {
              if (!slide.linkUrl) return;
              if (slide.linkUrl.startsWith('http')) {
                window.open(slide.linkUrl, '_blank', 'noopener,noreferrer');
              } else {
                window.location.href = slide.linkUrl.startsWith('/') ? slide.linkUrl : `/${slide.linkUrl}`;
              }
            }}
          >
            <CardMedia
              component="img"
              height="90"
              image={slide.imageUrl}
              alt={slide.alt || slide.caption || 'Изображение карусели'}
              sx={{
                objectFit: 'cover',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              }}
            />
            {(slide.caption || slide.linkUrl) && (
              <CardContent
                sx={{
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  minHeight: 90,
                }}
              >
                {slide.caption && (
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: '#ffffff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {slide.caption}
                  </Typography>
                )}
                {slide.linkUrl && (
                  <Button
                    variant="text"
                    size="small"
                    sx={{
                      alignSelf: 'flex-start',
                      textTransform: 'none',
                      color: '#ffbb00',
                      fontWeight: 600,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (slide.linkUrl?.startsWith('http')) {
                        window.open(slide.linkUrl, '_blank', 'noopener,noreferrer');
                      } else if (slide.linkUrl) {
                        window.location.href = slide.linkUrl.startsWith('/') ? slide.linkUrl : `/${slide.linkUrl}`;
                      }
                    }}
                  >
                    Перейти
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </Box>
    </Box>
  );
}

