import { Box, Container, Typography, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HandshakeIcon from '@mui/icons-material/Handshake';

const advantages = [
  { icon: <CheckCircleIcon />, title: 'Проверенное качество', desc: 'Сертифицированные специалисты с опытом 5+ лет. Все проекты проходят строгий контроль качества.' },
  { icon: <SpeedIcon />, title: 'Быстрая разработка', desc: 'Среднее время реализации: 2-4 недели. Agile и DevOps методологии.' },
  { icon: <HandshakeIcon />, title: 'Прозрачность', desc: 'Полная отчётность на каждом этапе. Регулярные демо и доступ к задачнику.' },
  { icon: <TrendingUpIcon />, title: 'Рост бизнеса', desc: 'Наши решения увеличивают конверсию в среднем на 150%. Подтверждено данными.' },
  { icon: <SecurityIcon />, title: 'Безопасность', desc: 'SSL, защита от DDoS, бэкапы. Соответствие GDPR.' },
  { icon: <SupportAgentIcon />, title: 'Поддержка 24/7', desc: 'Техподдержка, бесплатные обновления первые 3 месяца. Всегда на связи.' },
];

const stats = [
  { val: '150+', label: 'проектов' },
  { val: '12+', label: 'специалистов' },
  { val: '8', label: 'лет опыта' },
];

export function AdvantagesModern() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, position: 'relative', overflow: 'hidden' }}>
      {/* Decorative background */}
      <Typography
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(5rem, 14vw, 14rem)',
          fontWeight: 900,
          color: '#fff',
          opacity: 0.02,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-0.04em',
        }}
      >
        QUALITY
      </Typography>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}
        >
          Преимущества
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '2rem', md: '2.75rem' },
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.02em',
            mb: 2,
          }}
        >
          Почему выбирают нас
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', mb: 5, maxWidth: 540 }}>
          Создаём решения, которые помогают бизнесу расти и развиваться
        </Typography>

        {/* Stats */}
        <Stack direction="row" spacing={{ xs: 4, md: 8 }} sx={{ mb: 6 }}>
          {stats.map((s) => (
            <Box key={s.label}>
              <Typography sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {s.val}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.3 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* Cards grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {advantages.map((a, i) => (
            <Box
              key={i}
              data-scroll-child
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.06)',
                bgcolor: 'rgba(20,20,20,0.5)',
                transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
                '&:hover': {
                  borderColor: 'rgba(255,187,0,0.25)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,187,0,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  '& svg': { fontSize: 24, color: '#ffbb00' },
                }}
              >
                {a.icon}
              </Box>
              <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '1.05rem', mb: 1 }}>
                {a.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
                {a.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
