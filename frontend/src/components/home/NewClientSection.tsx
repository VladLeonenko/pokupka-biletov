import { Link } from 'react-router-dom';
import { Box, Container, Typography, Button, Stack } from '@mui/material';

const steps = [
  { num: '01', title: 'Оценка', desc: 'Профессиональная оценка проекта с чётким расчётом стоимости и сроков.' },
  { num: '02', title: 'Выбор стека', desc: 'Подбор лучших технологий, методологии (Waterfall / Scrum / Kanban), назначение ответственных.' },
  { num: '03', title: 'Разработка', desc: 'Доступ к задачнику, отслеживание хода выполнения, регулярные демо.' },
  { num: '04', title: 'Запуск', desc: 'Code-review, тестирование на стейджинге, передача готового продукта.' },
];

export function NewClientSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, position: 'relative', overflow: 'hidden' }}>
      {/* Decorative */}
      <Typography
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(5rem, 15vw, 14rem)',
          fontWeight: 900,
          color: '#fff',
          opacity: 0.02,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-0.04em',
        }}
      >
        WORKFLOW
      </Typography>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}
        >
          Стать клиентом
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '2rem', md: '2.75rem' },
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.02em',
            mb: 1.5,
          }}
        >
          Реализуем идеи в прибыльные проекты
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', mb: 5, maxWidth: 540, lineHeight: 1.65 }}>
          Работаем строго по регламенту, нацеленному на максимальный результат. Договор, гарантия от 1 года, персональный PM.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
            mb: 5,
          }}
        >
          {steps.map((s) => (
            <Box
              key={s.num}
              data-scroll-child
              sx={{
                position: 'relative',
                p: 3,
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.06)',
                bgcolor: 'rgba(20,20,20,0.5)',
                overflow: 'hidden',
              }}
            >
              <Typography
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: 10,
                  fontSize: 'clamp(3.5rem, 6vw, 5rem)',
                  fontWeight: 900,
                  color: '#fff',
                  opacity: 0.04,
                  pointerEvents: 'none',
                  userSelect: 'none',
                  lineHeight: 1,
                }}
              >
                {s.num}
              </Typography>
              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem', mb: 1, position: 'relative', zIndex: 1 }}>
                {s.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, position: 'relative', zIndex: 1 }}>
                {s.desc}
              </Typography>
            </Box>
          ))}
        </Box>

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
      </Container>
    </Box>
  );
}
