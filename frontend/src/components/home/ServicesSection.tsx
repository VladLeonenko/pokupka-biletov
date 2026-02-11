import { Link } from 'react-router-dom';
import { Box, Container, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';

const MotionBox = motion.create(Box);

const services = [
  {
    num: '01',
    title: 'Разработка сайтов',
    desc: 'Лендинги, корпоративные сайты, интернет-магазины, WordPress, 1С-Битрикс, Tilda. Адаптив, SEO, интеграции.',
    price: 'от 50 000 ₽',
    slug: 'korporativnyj-sajt',
  },
  {
    num: '02',
    title: 'Мобильные приложения',
    desc: 'iOS и Android. React Native, нативная разработка. MVP за 3 месяца, публикация в сторах.',
    price: 'от 300 000 ₽',
    slug: 'internet-magazin',
  },
  {
    num: '03',
    title: 'Дизайн',
    desc: 'UI/UX, прототипы, дизайн-системы, редизайн. Figma-макеты, адаптив, передача в разработку.',
    price: 'от 60 000 ₽',
    slug: 'ui-ux-dizajn',
  },
  {
    num: '04',
    title: 'SEO и маркетинг',
    desc: 'Продвижение в Яндексе и Google, реклама у блогеров, контент, аналитика. Рост трафика и заявок.',
    price: 'от 65 000 ₽/мес',
    slug: 'seo-prodvizhenie',
  },
];

const cardMotion = (i: number) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
});

export function ServicesSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <MotionBox
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          sx={{ mb: 6 }}
        >
          <Typography
            variant="overline"
            sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}
          >
            Услуги
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}
          >
            Что мы делаем
          </Typography>
        </MotionBox>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          {services.map((s, i) => (
            <MotionBox
              key={s.num}
              data-scroll-child
              {...cardMotion(i)}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.06)',
                bgcolor: 'rgba(20,20,20,0.6)',
                p: { xs: 3, md: 4 },
                transition: 'border-color 0.3s, box-shadow 0.3s',
                '&:hover': {
                  borderColor: 'rgba(255,187,0,0.25)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
                },
                '&:hover .deco-num': {
                  opacity: 0.08,
                  transform: 'translateY(-4px)',
                },
              }}
            >
              {/* Decorative number — follow.art style */}
              <Typography
                className="deco-num"
                sx={{
                  position: 'absolute',
                  top: { xs: -10, md: -16 },
                  right: { xs: 8, md: 16 },
                  fontSize: 'clamp(5rem, 10vw, 9rem)',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#fff',
                  opacity: 0.04,
                  pointerEvents: 'none',
                  userSelect: 'none',
                  transition: 'opacity 0.4s, transform 0.4s',
                }}
              >
                {s.num}
              </Typography>

              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: '#fff', mb: 1.5, position: 'relative', zIndex: 1 }}
              >
                {s.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, mb: 2, position: 'relative', zIndex: 1 }}
              >
                {s.desc}
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#ffbb00',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {s.price}
              </Typography>
            </MotionBox>
          ))}
        </Box>

        <MotionBox
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          sx={{ textAlign: 'center', mt: 5 }}
        >
          <Button
            component={Link}
            to="/catalog"
            variant="outlined"
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: '#fff',
              fontSize: '1rem',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              letterSpacing: '0.05em',
              '&:hover': { borderColor: '#ffbb00', color: '#ffbb00' },
            }}
          >
            Все услуги
          </Button>
        </MotionBox>
      </Container>
    </Box>
  );
}
