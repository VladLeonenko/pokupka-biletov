import { Box, Typography, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { ParticleSphere } from '@/components/home/ParticleSphere';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';

const NAV_LINKS = [
  { to: '/', label: 'Главная' },
  { to: '/catalog', label: 'Каталог' },
  { to: '/blog', label: 'Блог' },
  { to: '/portfolio', label: 'Портфолио' },
  { to: '/about', label: 'О нас' },
  { to: '/contacts', label: 'Контакты' },
  { to: '/new-client', label: 'Стать клиентом' },
];

export function NotFoundPage() {
  return (
    <>
      <SeoMetaTags
        title="404 — Страница не найдена | PrimeCoder"
        description="Страница не найдена. Кот нажал Delete. Вернитесь на главную или в каталог."
        url={typeof window !== 'undefined' ? `${window.location.origin}/404` : 'https://prime-coder.ru/404'}
        noindex
      />
      <ParticleSphere />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: 'calc(100vh - 180px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          px: 2,
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '8rem', md: '12rem' },
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            textShadow: '0 0 60px rgba(255,187,0,0.3)',
          }}
        >
          404
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '1.1rem', md: '1.35rem' },
            color: 'rgba(255,255,255,0.85)',
            mt: 2,
            mb: 4,
          }}
        >
          Кот нажал Delete
        </Typography>
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1.5}
          justifyContent="center"
          sx={{ maxWidth: 560 }}
        >
          {NAV_LINKS.map(({ to, label }) => (
            <Typography
              key={to}
              component={Link}
              to={to}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '0.95rem',
                px: 2,
                py: 1,
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'all 0.25s ease',
                '&:hover': {
                  color: '#ffbb00',
                  borderColor: 'rgba(255,187,0,0.5)',
                  bgcolor: 'rgba(255,187,0,0.08)',
                },
              }}
            >
              {label}
            </Typography>
          ))}
        </Stack>
      </Box>
    </>
  );
}
