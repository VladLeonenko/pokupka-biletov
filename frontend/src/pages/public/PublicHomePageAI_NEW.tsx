import { Box, Container, Typography, Button, Grid, Card, CardContent, Paper, TextField, Slider, Accordion, AccordionSummary, AccordionDetails, Rating, Avatar, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Calculate, CheckCircle, ArrowForward, 
  Speed, Scale, Shield, Analytics, Group, 
  Support, Settings, Visibility, Savings, 
  Business, SmartToy, AutoAwesome, Verified,
  ExpandMore, Star, VerifiedUser
} from '@mui/icons-material';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);
const MotionTypography = motion.create(Typography);

interface TeamOption {
  name: string;
  price: number;
  specialists: number;
  description: string;
  features: string[];
  detailedFeatures: { title: string; description: string; }[];
  idealFor: string;
  hoursIncluded: number;
  extraHourPrice: number;
}

const teamOptions: TeamOption[] = [
  {
    name: 'AI Junior',
    price: 79000,
    specialists: 1,
    description: 'Входной уровень для старта с AI',
    features: [
      '1 AI-специалист + автоматизированные шаблоны',
      'Маркетинг, SMM, SEO-контент',
      'Базовая аналитика и отчёты',
      'Генерация текстов и креативов',
      'Email-рассылки и чат-боты',
    ],
    detailedFeatures: [
      { title: 'Маркетинг', description: 'Создание контента для соцсетей, блогов, рассылок. Планирование кампаний.' },
      { title: 'SEO', description: 'Генерация SEO-оптимизированных текстов, мета-тегов, анализ конкурентов' },
      { title: 'Аналитика', description: 'Базовые отчёты по продажам, трафику, конверсиям с визуализацией' },
      { title: 'Автоматизация', description: 'Готовые шаблоны для типовых задач и процессов' },
    ],
    idealFor: 'ИП, фрилансеры, микро-бизнес до 5 человек',
    hoursIncluded: 80,
    extraHourPrice: 2500,
  },
  {
    name: 'AI Pro Team',
    price: 199000,
    specialists: 3,
    description: 'Полная замена 1-2 отделов',
    features: [
      '2 AI-специалиста + менеджер проектов',
      'Полная автоматизация маркетинга и продаж',
      'Интеграция с CRM и аналитикой',
      'Стратегическое планирование',
      'Обучение вашей команды',
    ],
    detailedFeatures: [
      { title: 'Управление проектами', description: 'Менеджер координирует работу, следит за сроками и KPI' },
      { title: 'Автоматизация отделов', description: 'Полная автоматизация маркетинга + отдела продаж' },
      { title: 'Интеграции', description: 'Настройка AmoCRM, Битрикс24, Google Analytics, рекламных кабинетов' },
      { title: 'Стратегия', description: 'Разработка маркетинговой стратегии, воронок продаж, контент-плана' },
      { title: 'Обучение', description: 'Обучение вашей команды работе с AI-инструментами и процессами' },
    ],
    idealFor: 'Малый бизнес 5-50 сотрудников, розница, услуги',
    hoursIncluded: 200,
    extraHourPrice: 1800,
  },
  {
    name: 'AI Enterprise',
    price: 399000,
    specialists: 4,
    description: 'Полноценный AI-отдел для бизнеса',
    features: [
      '3+ AI-специалиста + разработчик + аналитик',
      'Любые сложные задачи и интеграции',
      'Кастомные AI-решения под ваш бизнес',
      'Техподдержка 24/7 и SLA',
      'Выделенный менеджер и отчётность',
    ],
    detailedFeatures: [
      { title: 'Разработка', description: 'Создание кастомных AI-решений: чат-боты, рекомендательные системы, аналитика' },
      { title: 'Глубокая интеграция', description: 'Интеграция с любыми системами: 1С, SAP, корпоративные базы данных' },
      { title: 'Поддержка 24/7', description: 'Круглосуточная техподдержка, мониторинг, SLA с гарантиями' },
      { title: 'Аналитика', description: 'Продвинутая аналитика: прогнозирование, машинное обучение, Big Data' },
      { title: 'Обучение персонала', description: 'Комплексное обучение вашей команды, документация, регулярные воркшопы' },
    ],
    idealFor: 'Средний и крупный бизнес, корпорации, enterprise',
    hoursIncluded: 400,
    extraHourPrice: 1200,
  },
];

export default function PublicHomePageAI() {
  const navigate = useNavigate();
  const [avgSalary, setAvgSalary] = useState(100000);
  const [employeeCount, setEmployeeCount] = useState(2);

  // Расчеты для калькулятора
  const monthlySalary = avgSalary * employeeCount;
  const taxes = monthlySalary * 0.3;
  const bonuses = monthlySalary * 0.15;
  const totalMonthlyCost = monthlySalary + taxes + bonuses;

  // Подбор тарифа
  const selectedTeam = teamOptions[employeeCount <= 2 ? 0 : employeeCount <= 4 ? 1 : 2];
  const outsourcingCost = selectedTeam.price;
  const savingsAmount = Math.round(totalMonthlyCost - outsourcingCost);
  const savingsPercent = Math.round((savingsAmount / totalMonthlyCost) * 100);

  return (
    <Box sx={{ bgcolor: '#ffffff', color: '#000000' }}>
      {/* 1. HERO + КАЛЬКУЛЯТОР */}
      <Container maxWidth="lg">
        <Box
          sx={{
            minHeight: '95vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <MotionTypography
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            variant="h1"
            align="center"
            sx={{
              fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4.5rem' },
              fontWeight: 800,
              mb: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI Boost Team
          </MotionTypography>

          <MotionTypography
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            variant="h4"
            align="center"
            sx={{
              fontSize: { xs: '1.2rem', md: '1.8rem' },
              mb: 1,
              fontWeight: 600,
              color: '#000000',
            }}
          >
            Ваша AI-команда за 1/3 стоимости штата
          </MotionTypography>

          <MotionTypography
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            variant="body1"
            align="center"
            sx={{ mb: 6, color: '#666666', maxWidth: 700, mx: 'auto' }}
          >
            Экономьте 67% на ФОТ. Масштабируйте команду за 1 неделю. Гарантия возврата за 14 дней.
          </MotionTypography>

          {/* КАЛЬКУЛЯТОР ВЫГОДЫ (встроенный) */}
          <MotionCard
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            sx={{
              maxWidth: 900,
              mx: 'auto',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" align="center" sx={{ fontWeight: 700, mb: 4 }}>
                Рассчитать экономию за 30 сек
              </Typography>

              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Средняя зарплата сотрудника (₽/мес)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={avgSalary}
                    onChange={(e) => setAvgSalary(Number(e.target.value))}
                    InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' } }}
                  />

                  <Typography variant="subtitle2" sx={{ mb: 2, mt: 3, fontWeight: 600 }}>
                    Количество сотрудников
                  </Typography>
                  <Slider
                    value={employeeCount}
                    onChange={(_, v) => setEmployeeCount(v as number)}
                    min={1}
                    max={5}
                    step={1}
                    marks
                    valueLabelDisplay="on"
                    sx={{ color: '#ffffff' }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      borderRadius: 2,
                      color: '#ffffff',
                      height: '100%',
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                      Ваша экономия:
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                      {savingsAmount.toLocaleString('ru-RU')} ₽
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3 }}>
                      ({savingsPercent}% экономии в месяц)
                    </Typography>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.3)', my: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Ваш ФОТ:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {Math.round(totalMonthlyCost).toLocaleString('ru-RU')} ₽
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">AI Boost Team:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {outsourcingCost.toLocaleString('ru-RU')} ₽
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                      <Typography variant="body2">Рекомендуемый тариф:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {selectedTeam.name}
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      sx={{
                        bgcolor: '#ffffff',
                        color: '#667eea',
                        fontWeight: 700,
                        '&:hover': { bgcolor: '#f0f0f0' },
                      }}
                      href="#contact-form"
                    >
                      Получить бесплатный аудит за 24ч
                    </Button>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </MotionCard>
        </Box>
      </Container>

      {/* 2. ПРОБЛЕМА */}
      <Box sx={{ bgcolor: '#f9f9f9', py: 10 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 6 }}>
            Сколько вы теряете на сотрудниках?
          </Typography>

          <Grid container spacing={4}>
            {[
              { label: 'Зарплата', value: 'x1.0', icon: <Business sx={{ fontSize: 40 }} /> },
              { label: 'Налоги', value: '+30%', icon: <Calculate sx={{ fontSize: 40 }} /> },
              { label: 'Премии', value: '+15%', icon: <TrendingUp sx={{ fontSize: 40 }} /> },
              { label: 'Отпускные', value: '+10%', icon: <Shield sx={{ fontSize: 40 }} /> },
              { label: 'Больничные', value: '+5%', icon: <Support sx={{ fontSize: 40 }} /> },
              { label: 'ИТОГО', value: '≈x2.0', icon: <Savings sx={{ fontSize: 40, color: '#d32f2f' }} /> },
            ].map((item, index) => (
              <Grid item xs={6} md={4} lg={2} key={index}>
                <MotionCard
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  sx={{
                    textAlign: 'center',
                    p: 3,
                    height: '100%',
                    borderRadius: 2,
                    ...(item.label === 'ИТОГО' && {
                      bgcolor: '#ffebee',
                      border: '2px solid #d32f2f',
                    }),
                  }}
                >
                  {item.icon}
                  <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </MotionCard>
              </Grid>
            ))}
          </Grid>

          <Typography
            variant="h5"
            align="center"
            sx={{ mt: 6, fontWeight: 600, color: '#d32f2f' }}
          >
            Реальная стоимость сотрудника ≈ в 2 раза выше зарплаты!
          </Typography>
        </Container>
      </Box>

      {/* 3. РЕШЕНИЕ (видео + результаты) */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 2 }}>
          Решение: AI Boost Team
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 700, mx: 'auto' }}>
          Посмотрите, как AI Boost заменил маркетолога за 1 неделю
        </Typography>

        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: 'relative',
                paddingBottom: '56.25%',
                bgcolor: '#f0f0f0',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#999999',
                }}
              >
                [Видео кейс]
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            {[
              { label: 'Рост лидов', value: '+247%', icon: <TrendingUp /> },
              { label: 'Снижение затрат', value: '-68%', icon: <Savings /> },
              { label: 'Время на запуск', value: '7 дней', icon: <Speed /> },
            ].map((metric, i) => (
              <MotionCard
                key={i}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                sx={{ mb: 2, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}
              >
                <Box sx={{ color: '#667eea', fontSize: 40 }}>{metric.icon}</Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#667eea' }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {metric.label}
                  </Typography>
                </Box>
              </MotionCard>
            ))}
          </Grid>
        </Grid>
      </Container>

      {/* 4. ТАРИФЫ */}
      <Box sx={{ bgcolor: '#f9f9f9', py: 10 }} id="tariffs">
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 8 }}>
            Выберите свой тариф
          </Typography>

          <Grid container spacing={4}>
            {teamOptions.map((option, index) => (
              <Grid item xs={12} md={4} key={index}>
                <MotionCard
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    border: index === 1 ? '3px solid #667eea' : 'none',
                    position: 'relative',
                  }}
                >
                  {index === 1 && (
                    <Chip
                      label="Популярный"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        right: 20,
                        bgcolor: '#667eea',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    />
                  )}

                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {option.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {option.idealFor}
                    </Typography>

                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#667eea', mb: 1 }}>
                      {option.price.toLocaleString('ru-RU')} ₽
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      / месяц
                    </Typography>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="body2" sx={{ mb: 2 }}>
                      ✓ {option.hoursIncluded} часов работы включено
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
                      + {option.extraHourPrice} ₽/час сверх лимита
                    </Typography>

                    {option.features.map((feature, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                        <CheckCircle sx={{ fontSize: 20, color: '#4caf50', flexShrink: 0 }} />
                        <Typography variant="body2">{feature}</Typography>
                      </Box>
                    ))}

                    <Button
                      fullWidth
                      variant={index === 1 ? 'contained' : 'outlined'}
                      size="large"
                      sx={{ mt: 3, fontWeight: 600 }}
                      href="#contact-form"
                    >
                      Выбрать тариф
                    </Button>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}


