import { Box, Typography, Stack, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { SITE_BRAND, getSiteBaseUrl } from '@/config/site';
import { useForceTicketsChrome } from '@/utils/ticketsChrome';
import { LOGO_LETTER } from '@/components/tickets/ticketsLogoPaths';

const ORANGE = '#ff4e18';
const INK = '#111';

const QUICK_LINKS = [
  { to: '/events', label: 'Все мероприятия' },
  { to: '/events/map', label: 'Карта недели' },
  { to: '/faq', label: 'Вопросы' },
  { to: '/returns', label: 'Возврат' },
  { to: '/contacts', label: 'Контакты' },
];

const TICKET_TOP =
  'M22 5H78A12 12 0 0 1 90 17V61A9 9 0 0 0 81 70L74.8 65.5L68.6 70L62.4 74.5L56.2 70L50 65.5L43.8 70L37.6 74.5L31.4 70L25.2 65.5L19 70A9 9 0 0 0 10 61V17A12 12 0 0 1 22 5Z';
const TICKET_BOTTOM =
  'M19 70L25.2 65.5L31.4 70L37.6 74.5L43.8 70L50 65.5L56.2 70L62.4 74.5L68.6 70L74.8 65.5L81 70A9 9 0 0 0 90 79V123A12 12 0 0 1 78 135H22A12 12 0 0 1 10 123V79A9 9 0 0 0 19 70Z';
const BARCODE = [24, 27, 31, 33, 37, 41, 43, 47, 50, 54, 56, 60, 64, 66, 70, 73, 76];

function TornTicket() {
  return (
    <Box
      component="svg"
      viewBox="0 0 100 140"
      aria-hidden
      sx={{
        width: { xs: 92, sm: 120, md: 150 },
        height: 'auto',
        overflow: 'visible',
        mx: { xs: 0.5, md: 1.5 },
        '& .nf-top': {
          transformBox: 'fill-box',
          transformOrigin: '15% 100%',
          animation: 'nfSway 3.2s ease-in-out infinite',
        },
        '@keyframes nfSway': {
          '0%, 100%': { transform: 'translate(-3px, -10px) rotate(-14deg)' },
          '50%': { transform: 'translate(-3px, -13px) rotate(-19deg)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& .nf-top': { animation: 'none', transform: 'translate(-3px, -10px) rotate(-14deg)' },
        },
      }}
    >
      <path d={TICKET_BOTTOM} fill={INK} />
      {BARCODE.map((x, i) => (
        <rect key={x} x={x} y={96} width={i % 3 === 0 ? 2.2 : 1.2} height={22} fill={ORANGE} />
      ))}
      <text
        x="50"
        y="88"
        textAnchor="middle"
        fill={ORANGE}
        fontSize="8"
        fontWeight="700"
        letterSpacing="1.5"
        fontFamily="var(--neg-font, system-ui, sans-serif)"
      >
        № 404
      </text>
      <g className="nf-top">
        <path d={TICKET_TOP} fill={ORANGE} />
        <path d={LOGO_LETTER} fill={INK} transform="translate(18 4) scale(1.6)" />
      </g>
    </Box>
  );
}

function Four() {
  return (
    <Typography
      component="span"
      aria-hidden
      sx={{
        fontFamily: 'var(--neg-font-display, var(--neg-font, system-ui))',
        fontSize: { xs: '7.5rem', sm: '10rem', md: '12.5rem' },
        fontWeight: 900,
        lineHeight: 0.8,
        letterSpacing: '-0.06em',
        color: INK,
      }}
    >
      4
    </Typography>
  );
}

export function NotFoundPage() {
  useForceTicketsChrome();
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
        component="main"
        sx={{
          minHeight: 'calc(100vh - 160px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 6, md: 10 },
          px: 2,
          textAlign: 'center',
          background: `radial-gradient(700px 360px at 50% 30%, rgba(255,78,24,0.10), transparent 70%), #fff`,
        }}
      >
        <Typography component="h1" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          404 — страница не найдена
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 3, md: 4 } }}>
          <Four />
          <TornTicket />
          <Four />
        </Box>

        <Typography
          component="p"
          sx={{
            fontFamily: 'var(--neg-font-display, var(--neg-font, system-ui))',
            fontSize: { xs: '1.5rem', md: '2rem' },
            fontWeight: 800,
            color: INK,
            lineHeight: 1.15,
            maxWidth: 560,
          }}
        >
          Билет на эту страницу не найден
        </Typography>
        <Typography sx={{ color: 'rgba(0,0,0,0.55)', mt: 1.5, mb: 4, fontSize: { xs: '1rem', md: '1.1rem' }, maxWidth: 460 }}>
          Похоже, её отменили или перенесли. Зато в афише всё в силе — выбирайте, куда сходить.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mb: 4, width: { xs: '100%', sm: 'auto' }, maxWidth: 360 }}>
          <Button
            component={Link}
            to="/"
            variant="contained"
            disableElevation
            sx={{
              bgcolor: ORANGE,
              color: '#fff',
              borderRadius: 999,
              px: 4,
              py: 1.4,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': { bgcolor: '#e8430f' },
            }}
          >
            В афишу
          </Button>
          <Button
            component={Link}
            to="/search"
            variant="outlined"
            sx={{
              color: INK,
              borderColor: 'rgba(0,0,0,0.2)',
              borderRadius: 999,
              px: 4,
              py: 1.4,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': { borderColor: INK, bgcolor: 'transparent' },
            }}
          >
            Найти событие
          </Button>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" sx={{ maxWidth: 560 }}>
          {QUICK_LINKS.map(({ to, label }) => (
            <Typography
              key={to}
              component={Link}
              to={to}
              sx={{
                color: 'rgba(0,0,0,0.7)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                px: 1.75,
                py: 0.75,
                borderRadius: 999,
                border: '1px solid rgba(0,0,0,0.12)',
                transition: 'all 0.2s ease',
                '&:hover': { color: ORANGE, borderColor: 'rgba(255,78,24,0.45)', bgcolor: 'rgba(255,78,24,0.06)' },
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
