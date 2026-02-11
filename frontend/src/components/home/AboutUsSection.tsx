import { Link } from 'react-router-dom';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import { motion } from 'framer-motion';

const MotionBox = motion.create(Box);
const stats = [
  { value: '150+', label: 'проектов' },
  { value: 'c 2017', label: 'на рынке' },
  { value: '6+', label: 'в команде' },
];

export function AboutUsSection() {
  return (
    <Box
      sx={{
        py: { xs: 10, md: 14 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background text — follow.art style */}
      <Typography
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(6rem, 18vw, 16rem)',
          fontWeight: 900,
          color: '#fff',
          opacity: 0.025,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        PRIMECODER
      </Typography>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <MotionBox
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Typography
            variant="overline"
            sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}
          >
            О нас
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.02em',
              mb: 3,
              maxWidth: 640,
            }}
          >
            Маркетплейс digital-услуг и веб-студия
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '1rem', md: '1.15rem' },
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.7,
              maxWidth: 580,
              mb: 5,
            }}
          >
            Одна точка входа для разработки сайтов, SEO, рекламы у блогеров, дизайна и маркетинга. Договор, персональный менеджер, гарантия от 1 года. Часть прибыли направляем на благотворительность.
          </Typography>
        </MotionBox>

        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Stack
            direction="row"
            spacing={{ xs: 4, md: 8 }}
            sx={{ mb: 5 }}
          >
            {stats.map((s) => (
              <Box key={s.label}>
                <Typography
                  sx={{
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mt: 0.5 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Button
            component={Link}
            to="/about"
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
            Узнать больше
          </Button>
        </MotionBox>
      </Container>
    </Box>
  );
}
