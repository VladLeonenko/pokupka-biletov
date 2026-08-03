import { Box, Typography, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { SITE_BRAND, getSiteBaseUrl } from '@/config/site';

const NAV_LINKS = [
  { to: '/', label: 'Афиша' },
  { to: '/events', label: 'Мероприятия' },
  { to: '/events/map', label: 'Карта недели' },
  { to: '/contacts', label: 'Контакты' },
  { to: '/faq', label: 'FAQ' },
  { to: '/returns', label: 'Возврат' },
];

export function NotFoundPage() {
  const origin = getSiteBaseUrl();

  return (
    <>
      <SeoMetaTags
        title={`404 — Страница не найдена | ${SITE_BRAND}`}
        description="Страница не найдена. Вернитесь в афишу или поиск мероприятий."
        url={typeof window !== 'undefined' ? `${window.location.origin}/404` : `${origin}/404`}
        noindex
      />
      <Box
        sx={{
          minHeight: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          px: 2,
          background:
            'radial-gradient(800px 400px at 50% 0%, rgba(255,78,24,0.12), transparent 60%), #fafafa',
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '6.5rem', md: '9rem' },
            fontWeight: 900,
            color: '#111',
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
        >
          404
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '1.05rem', md: '1.2rem' },
            color: 'rgba(0,0,0,0.55)',
            mt: 1.5,
            mb: 1,
            textAlign: 'center',
            maxWidth: 420,
          }}
        >
          Такой страницы нет — но афиша на месте
        </Typography>
        <Typography sx={{ color: 'rgba(0,0,0,0.4)', mb: 4, fontSize: '0.9rem' }}>
          {SITE_BRAND}
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1.5} justifyContent="center" sx={{ maxWidth: 560 }}>
          {NAV_LINKS.map(({ to, label }) => (
            <Typography
              key={to}
              component={Link}
              to={to}
              sx={{
                color: 'rgba(0,0,0,0.7)',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                px: 2,
                py: 1,
                borderRadius: '2px',
                border: '1px solid rgba(0,0,0,0.12)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: '#ff4e18',
                  borderColor: 'rgba(255,78,24,0.45)',
                  bgcolor: 'rgba(255,78,24,0.06)',
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
