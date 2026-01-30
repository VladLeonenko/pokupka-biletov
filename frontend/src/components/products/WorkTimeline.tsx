import { Box, Typography, Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, Paper, Chip } from '@mui/material';
import { motion } from 'framer-motion';

const MotionTimelineItem = motion.create(TimelineItem);
const MotionPaper = motion.create(Paper);

interface WorkStep {
  number: number;
  title: string;
  description: string;
  duration?: string;
}

interface WorkTimelineProps {
  steps: WorkStep[];
  title?: string;
}

const defaultSteps: WorkStep[] = [
  {
    number: 1,
    title: 'Анализ и планирование',
    description: 'Составление ТЗ и дизайн-брифа с учетом целей бизнеса и исследованием конкурентов',
    duration: '3-5 дней',
  },
  {
    number: 2,
    title: 'Проектирование структуры и UX',
    description: 'Создание подробных прототипов, фокус на удобстве пользователя и эффективности контента',
    duration: '5-7 дней',
  },
  {
    number: 3,
    title: 'Уникальный дизайн',
    description: 'Разработка фирменного стиля, визуальных элементов, анимаций и продуманной типографии',
    duration: '7-10 дней',
  },
  {
    number: 4,
    title: 'Программирование и верстка',
    description: 'Адаптация под все типы устройств, оптимизация скорости загрузки, интеграция модулей и сервисов',
    duration: '10-15 дней',
  },
  {
    number: 5,
    title: 'Контент',
    description: 'Наполнение сайта SEO-оптимизированным текстом, качественными изображениями и видео',
    duration: '5-7 дней',
  },
  {
    number: 6,
    title: 'Тестирование',
    description: 'Функциональное, нагрузочное и кроссбраузерное тестирование для устранения ошибок',
    duration: '3-5 дней',
  },
  {
    number: 7,
    title: 'Запуск и продвижение',
    description: 'Публикация сайта, настройка аналитики, SEO-продвижение и маркетинговая поддержка',
    duration: '2-3 дня',
  },
];

export function WorkTimeline({ steps = defaultSteps, title = 'Этапы работы' }: WorkTimelineProps) {
  if (!steps || steps.length === 0) {
    steps = defaultSteps;
  }

  return (
    <Box sx={{ my: 6 }}>
      <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
        {title}
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Прозрачный процесс разработки от идеи до запуска
      </Typography>

      <Timeline position="alternate" sx={{ maxWidth: 1000, mx: 'auto' }}>
        {steps.map((step, index) => (
          <MotionTimelineItem
            key={step.number}
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <TimelineSeparator>
              <TimelineDot
                sx={{
                  bgcolor: 'primary.main',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" fontWeight="bold" color="white">
                  {step.number}
                </Typography>
              </TimelineDot>
              {index < steps.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <MotionPaper
                sx={{
                  p: 3,
                  bgcolor: index % 2 === 0 ? 'primary.light' : 'secondary.light',
                  color: 'white',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {step.title}
                  </Typography>
                  {step.duration && (
                    <Chip
                      label={step.duration}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                  )}
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {step.description}
                </Typography>
              </MotionPaper>
            </TimelineContent>
          </MotionTimelineItem>
        ))}
      </Timeline>
    </Box>
  );
}
