import { Link } from 'react-router-dom';
import { Box, Container, Typography, Button, Stack, Card, CardContent, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { getPublicTeamMembers } from '@/services/cmsApi';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import {
  Code,
  Store,
  VolunteerActivism,
  Groups,
  TrendingUp,
  DesignServices,
  Campaign,
} from '@mui/icons-material';

const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);

const sectionMotion = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const SERVICES = [
  { icon: Code, title: 'Разработка', text: 'Сайты, интернет-магазины, веб-приложения. Современный стек, быстрая отдача.' },
  { icon: DesignServices, title: 'Дизайн', text: 'UI/UX, брендинг, интерфейсы. Визуал, который конвертирует.' },
  { icon: TrendingUp, title: 'SEO и аналитика', text: 'Органический трафик, позиции, контент. Рост без переплат за рекламу.' },
  { icon: Campaign, title: 'Реклама и маркетинг', text: 'Реклама у блогеров, контекст, маркетплейс digital-услуг под ключ.' },
];

export function AboutPage() {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://prime-coder.ru/about';

  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ['public-team-members'],
    queryFn: () => getPublicTeamMembers(),
    staleTime: 60000,
  });

  return (
    <>
      <SeoMetaTags
        title="О компании PrimeCoder — веб-студия в Москве"
        description="Команда 150+ реализованных проектов. Разработка сайтов, SEO, реклама у блогеров. Часть выручки — в благотворительные фонды. Узнайте, почему выбирают нас."
        keywords="веб-студия PrimeCoder, о компании, разработка сайтов Москва, digital агентство, команда разработки"
        url={currentUrl}
        image="https://prime-coder.ru/legacy/img/logo.png"
      />
      <HeaderFooterInjector />

      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          bgcolor: '#141414',
          color: '#fff',
          pt: { xs: 6.25, md: 6.25 },
          pb: 8,
        }}
      >
        {/* Hero */}
        <Box
          sx={{
            minHeight: 'auto',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '-20%',
              right: '-10%',
              width: '60%',
              maxWidth: 600,
              height: '140%',
              background: 'radial-gradient(ellipse at center, rgba(149,140,255,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <Container maxWidth="lg">
            <MotionBox
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <Typography
                component="p"
                variant="overline"
                sx={{
                  letterSpacing: '0.3em',
                  color: 'rgba(255,187,0,0.9)',
                  mb: 2,
                  fontWeight: 600,
                }}
              >
                О нас
              </Typography>
              <Typography
                component="h1"
                variant="h1"
                sx={{
                  fontSize: { xs: 'clamp(2.5rem, 10vw, 4rem)', md: 'clamp(3.5rem, 6vw, 5.5rem)' },
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                  mb: 3,
                }}
              >
                Мы создаём digital,
                <br />
                <Box component="span" sx={{ color: 'rgba(255,187,0,0.95)' }}>
                  который работает
                </Box>
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  color: 'rgba(255,255,255,0.7)',
                  maxWidth: 520,
                  lineHeight: 1.6,
                }}
              >
                Маркетплейс digital-услуг и веб-студия в одном. Разработка сайтов, SEO, реклама у блогеров, дизайн — с одной точки входа, с гарантией и прозрачными сроками.
              </Typography>
            </MotionBox>
          </Container>
        </Box>

        {/* Суть: чем занимаемся */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Container maxWidth="lg">
            <MotionTypography
              variant="overline"
              sx={{ letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', mb: 1, display: 'block' }}
              {...sectionMotion(0)}
            >
              Чем мы занимаемся
            </MotionTypography>
            <MotionTypography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '2.75rem' },
                fontWeight: 700,
                letterSpacing: '-0.02em',
                mb: 6,
              }}
              {...sectionMotion(0.05)}
            >
              От идеи до результата
            </MotionTypography>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              sx={{ flexWrap: 'wrap', gap: 3 }}
              useFlexGap
            >
              {SERVICES.map((item, i) => (
                <MotionBox
                  key={item.title}
                  {...sectionMotion(0.1 + i * 0.05)}
                  sx={{ flex: { md: '1 1 220px' } }}
                >
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      bgcolor: 'rgba(17,18,36,0.6)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 3,
                      transition: 'border-color 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        borderColor: 'rgba(149,140,255,0.25)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,187,0,0.12)',
                          color: '#ffbb00',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2,
                        }}
                      >
                        <item.icon sx={{ fontSize: 28 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
                        {item.text}
                      </Typography>
                    </CardContent>
                  </Card>
                </MotionBox>
              ))}
            </Stack>
          </Container>
        </Box>

        {/* Маркетплейс digital-услуг */}
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            bgcolor: 'rgba(17,18,36,0.5)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Container maxWidth="lg">
            <MotionBox {...sectionMotion(0)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Store sx={{ color: 'rgba(255,187,0,0.9)', fontSize: 32 }} />
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}
                >
                  Концепция
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  mb: 3,
                  maxWidth: 720,
                }}
              >
                Маркетплейс digital-услуг — одна точка входа для всего
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.1rem',
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.75,
                  maxWidth: 720,
                }}
              >
                Вместо поиска подрядчиков по разным направлениям вы получаете единый интерфейс: сайт, SEO, рекламу у блогеров, дизайн и маркетинг — с прозрачными тарифами, договором и персональным менеджером. Мы объединяем экспертизу студии и удобство маркетплейса: заказываете услуги как товары, но с живой поддержкой и гарантией результата.
              </Typography>
              <Button
                component={Link}
                to="/catalog"
                variant="outlined"
                sx={{
                  mt: 4,
                  borderColor: 'rgba(255,187,0,0.5)',
                  color: '#ffbb00',
                  '&:hover': { borderColor: '#ffbb00', bgcolor: 'rgba(255,187,0,0.06)' },
                }}
              >
                Смотреть каталог услуг
              </Button>
            </MotionBox>
          </Container>
        </Box>

        {/* Команда */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Container maxWidth="lg">
            <MotionBox {...sectionMotion(0)} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Groups sx={{ color: 'rgba(255,187,0,0.9)', fontSize: 28 }} />
              <Typography variant="overline" sx={{ letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>
                Команда
              </Typography>
            </MotionBox>
            <MotionTypography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '2.75rem' },
                fontWeight: 700,
                letterSpacing: '-0.02em',
                mb: 6,
              }}
              {...sectionMotion(0.05)}
            >
              Кто делает результат
            </MotionTypography>
            {teamLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: 'rgba(255,187,0,0.8)' }} />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 4,
                }}
              >
                {teamMembers.map((member, i) => (
                  <MotionBox
                    key={member.id}
                    {...sectionMotion(0.05 + i * 0.03)}
                    sx={{ textAlign: 'center' }}
                  >
                    <Box
                      component="img"
                      src={resolveImageUrl(member.imageUrl, '/legacy/img/logo.png')}
                      alt={member.name}
                      loading="lazy"
                      sx={{
                        width: '100%',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        borderRadius: 2,
                        mb: 1.5,
                        border: '1px solid rgba(255,255,255,0.06)',
                        maxWidth: 280,
                        mx: 'auto',
                        display: 'block',
                      }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {member.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      {member.role}
                    </Typography>
                  </MotionBox>
                ))}
              </Box>
            )}
          </Container>
        </Box>

        {/* Благотворительность */}
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            bgcolor: 'rgba(17,18,36,0.5)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Container maxWidth="lg">
            <MotionBox {...sectionMotion(0)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <VolunteerActivism sx={{ color: 'rgba(255,187,0,0.9)', fontSize: 32 }} />
                <Typography variant="overline" sx={{ letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>
                  Благотворительность
                </Typography>
              </Box>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  mb: 3,
                  maxWidth: 640,
                }}
              >
                Часть прибыли мы направляем на помощь
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.05rem',
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.75,
                  maxWidth: 640,
                }}
              >
                Мы считаем важным делиться результатом не только с клиентами, но и с теми, кому нужна поддержка. PrimeCoder участвует в благотворительных проектах: часть средств от проектов направляется на помощь нуждающимся. Для нас это не пиар, а часть ценностей компании.
              </Typography>
            </MotionBox>
          </Container>
        </Box>

        {/* Цифры */}
        <Box sx={{ py: { xs: 6, md: 8 } }}>
          <Container maxWidth="lg">
            <MotionBox
              {...sectionMotion(0)}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 4,
                textAlign: 'center',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffbb00', lineHeight: 1 }}>
                  150+
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                  проектов
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffbb00', lineHeight: 1 }}>
                  с 2017
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                  на рынке
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffbb00', lineHeight: 1 }}>
                  12+
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                  в команде
                </Typography>
              </Box>
            </MotionBox>
          </Container>
        </Box>

        {/* CTA */}
        <Box sx={{ py: { xs: 8, md: 10 } }}>
          <Container maxWidth="md">
            <MotionBox
              {...sectionMotion(0)}
              sx={{
                textAlign: 'center',
                p: 5,
                borderRadius: 4,
                bgcolor: 'rgba(17,18,36,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontSize: { xs: '1.75rem', md: '2rem' },
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  mb: 2,
                }}
              >
                Готовы обсудить проект?
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.65)', mb: 3 }}>
                Опишите задачу — рассчитаем сроки и стоимость без обязательств.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" flexWrap="wrap">
                <Button
                  component={Link}
                  to="/contacts"
                  variant="contained"
                  sx={{
                    bgcolor: '#ffbb00',
                    color: '#141414',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#e6a800' },
                  }}
                >
                  Связаться
                </Button>
                <Button
                  component={Link}
                  to="/reviews"
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                  }}
                >
                  Читать отзывы
                </Button>
              </Stack>
            </MotionBox>
          </Container>
        </Box>
      </Box>
    </>
  );
}
