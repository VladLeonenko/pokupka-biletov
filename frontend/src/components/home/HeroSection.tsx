import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPublicCarousel, CarouselItem } from '@/services/carouselsApi';
import { VerticalCarousel } from './VerticalCarousel';
import gsap from 'gsap';

export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { data: carousel, isLoading: carouselLoading } = useQuery({
    queryKey: ['public-carousel', 'vertical-carousel-home'],
    queryFn: () => getPublicCarousel('vertical-carousel-home'),
    enabled: true,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
  });

  const defaultCarouselItems: CarouselItem[] = [
    { caption_html: 'Веб-дизайн', text: 'Веб-дизайн' },
    { caption_html: 'Маркетинг', text: 'Маркетинг' },
    { caption_html: 'Реклама', text: 'Реклама' },
    { caption_html: 'Сайт под ключ', text: 'Сайт под ключ' },
    { caption_html: 'Тестирование', text: 'Тестирование' },
    { caption_html: 'Продвижение', text: 'Продвижение' },
  ];

  const carouselItems: CarouselItem[] =
    !carouselLoading && carousel?.items && carousel.items.length > 0
      ? carousel.items
      : defaultCarouselItems;

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.hero-title', { y: 50, opacity: 0, duration: 0.8, ease: 'power3.out' });
      gsap.from('.hero-sub', { y: 30, opacity: 0, duration: 0.7, delay: 0.15, ease: 'power3.out' });
      gsap.from('.hero-stats', { y: 20, opacity: 0, duration: 0.6, delay: 0.3, ease: 'power3.out' });
      gsap.from('.hero-cta', { y: 20, opacity: 0, duration: 0.5, delay: 0.4, ease: 'power3.out' });
      gsap.from('.hero-carousel', { x: 60, opacity: 0, duration: 0.9, delay: 0.2, ease: 'power3.out' });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <Box ref={sectionRef} sx={{ py: { xs: 10, md: 14 } }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: { xs: 5, md: 4 },
          }}
        >
          {/* Left */}
          <Box sx={{ flex: 1, maxWidth: { md: '55%' } }}>
            <Typography
              variant="h1"
              className="hero-title"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                mb: 2,
              }}
            >
              Заказать сайт под ключ
            </Typography>

            <Typography
              className="hero-sub"
              sx={{
                fontSize: { xs: '1rem', md: '1.2rem' },
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.6,
                mb: 4,
                maxWidth: 480,
              }}
            >
              Профессиональное создание и продвижение сайтов, мобильных приложений
            </Typography>

            <Stack direction="row" spacing={{ xs: 3, md: 5 }} className="hero-stats" sx={{ mb: 4 }}>
              {[
                { val: '150+', label: 'проектов' },
                { val: '6+', label: 'в команде' },
                { val: '10+', label: 'дней на заказ' },
              ].map((s) => (
                <Box key={s.label}>
                  <Typography sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' }, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {s.val}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.3 }}>
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Box className="hero-cta">
              <Button
                component={Link}
                to="/new-client"
                sx={{
                  bgcolor: '#ffbb00',
                  color: '#141414',
                  fontWeight: 700,
                  fontSize: '1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#e5a800', color: '#141414' },
                }}
              >
                Стать клиентом
              </Button>
            </Box>
          </Box>

          {/* Right — Vertical carousel */}
          <Box className="hero-carousel" sx={{ flex: 1, maxWidth: { md: '40%' }, width: '100%' }}>
            <VerticalCarousel items={carouselItems} speed={3000} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
