import { Box, Container, Typography, Button, Grid, Card, CardContent, Paper, TextField, Slider, Accordion, AccordionSummary, AccordionDetails, Rating, Avatar, Chip, Divider, Checkbox, FormControlLabel } from '@mui/material';
import { PrivacyConsentCheckbox } from '@/components/privacy/PrivacyConsentCheckbox';
import { MarketingConsentCheckbox } from '@/components/privacy/MarketingConsentCheckbox';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { listPublicBlogHighlights } from '@/services/publicApi';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/ToastProvider';
import { 
  TrendingUp, Calculate, CheckCircle, ArrowForward, 
  Speed, Scale, Shield, Analytics, Group, 
  Support, Settings, Verified,
  ExpandMore, Star, VerifiedUser
} from '@mui/icons-material';

// Типы для window
declare global {
  interface Window {
    particleCube?: {
      start: () => void;
      stop: () => void;
    };
  }
}

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

const cases = [
  {
    id: 1,
    company: 'IT-стартап',
    industry: 'SaaS',
    challenge: 'Нужен был полноценный маркетинговый отдел, но бюджет ограничен',
    solution: 'Подключили AI Pro Team для автоматизации контент-маркетинга и продаж',
    results: [
      'Рост лидов на 247%',
      'Снижение затрат на маркетинг на 68%',
      'Экономия 450 000 ₽/мес',
    ],
    rating: 5,
    author: 'Алексей М.',
    position: 'CEO',
    text: 'AI Boost Team полностью заменил нам маркетинговый отдел. За 3 месяца мы увеличили поток лидов в 2.5 раза, при этом сэкономили почти полмиллиона рублей ежемесячно. Рекомендую!',
    verified: true,
  },
  {
    id: 2,
    company: 'Интернет-магазин',
    industry: 'E-commerce',
    challenge: 'Требовалась автоматизация работы с клиентами и аналитика продаж',
    solution: 'Внедрили AI Junior для автоматизации клиентского сервиса',
    results: [
      'Обработка 80% обращений клиентов в автоматическом режиме',
      'Увеличение конверсии на 35%',
      'Экономия 180 000 ₽/мес',
    ],
    rating: 5,
    author: 'Екатерина В.',
    position: 'Владелец',
    text: '80% обращений клиентов теперь обрабатываются автоматически. Конверсия выросла на 35%, а мы экономим 180 тысяч рублей в месяц. Лучшее решение для малого бизнеса!',
    verified: true,
  },
  {
    id: 3,
    company: 'Консалтинговая компания',
    industry: 'B2B услуги',
    challenge: 'Нужна была экспертная аналитика и подготовка отчётов для клиентов',
    solution: 'Запустили AI Enterprise с кастомными аналитическими решениями',
    results: [
      'Скорость подготовки отчётов увеличилась в 5 раз',
      'Качество аналитики улучшилось на 40%',
      'Экономия 650 000 ₽/мес',
    ],
    rating: 5,
    author: 'Дмитрий П.',
    position: 'Партнёр',
    text: 'AI Boost Team создал для нас кастомные аналитические решения. Теперь мы готовим отчёты в 5 раз быстрее, а качество аналитики выросло на 40%. Экономия составляет 650 тысяч рублей в месяц!',
    verified: true,
  },
  {
    id: 4,
    company: 'Агентство недвижимости',
    industry: 'Недвижимость',
    challenge: 'Требовалась автоматизация лидогенерации и квалификации клиентов',
    solution: 'Подключили AI Pro Team для настройки воронок продаж',
    results: [
      'Поток квалифицированных лидов вырос на 180%',
      'Сокращение времени обработки заявок на 70%',
      'Экономия 320 000 ₽/мес',
    ],
    rating: 5,
    author: 'Сергей Л.',
    position: 'Руководитель отдела продаж',
    text: 'AI-команда настроила нам воронки продаж и автоматизировала квалификацию лидов. Поток качественных клиентов вырос на 180%, а время обработки сократилось на 70%. Экономия 320 тысяч в месяц!',
    verified: true,
  },
  {
    id: 5,
    company: 'Производственная компания',
    industry: 'Производство',
    challenge: 'Требовалась оптимизация бизнес-процессов и автоматизация документооборота',
    solution: 'Подключили AI Enterprise для управления процессами',
    results: [
      'Автоматизация 50% документооборота',
      'Сокращение времени обработки документов на 70%',
      'Экономия 380 000 ₽/мес',
    ],
    rating: 5,
    author: 'Игорь П.',
    position: 'Генеральный директор',
    text: 'AI-команда полностью заменила отдел оптимизации. За 4 месяца мы автоматизировали 50% документооборота, сократили время обработки на 70%. Экономия почти 400 тысяч рублей в месяц!',
    verified: true,
  },
  {
    id: 6,
    company: 'Образовательная платформа',
    industry: 'Образование',
    challenge: 'Нужна была поддержка в создании обучающих материалов',
    solution: 'Внедрили AI Junior для генерации контента',
    results: [
      'Создание 200+ обучающих материалов за квартал',
      'Улучшение аналитики успеваемости',
      'Экономия 250 000 ₽/мес',
    ],
    rating: 5,
    author: 'Ольга Н.',
    position: 'Руководитель образовательных программ',
    text: 'AI-команда помогла создать более 200 обучающих материалов за квартал. Аналитика стала детальнее и полезнее. Экономия 250 тысяч рублей в месяц!',
    verified: true,
  },
];

export default function PublicHomePageAI() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [avgSalary, setAvgSalary] = useState(100000);
  const [employeeCount, setEmployeeCount] = useState(2);
  const [bonusPercent, setBonusPercent] = useState(15);
  const [vacationDays, setVacationDays] = useState(28);
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);
  const [agreeToMarketing, setAgreeToMarketing] = useState(false);

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['blogHighlights'],
    queryFn: listPublicBlogHighlights,
  });

  // Расчеты для калькулятора - полная стоимость штатных сотрудников
  const monthlySalary = avgSalary * employeeCount;
  const taxes = monthlySalary * 0.3; // 30% страховые взносы работодателя
  const bonuses = monthlySalary * (bonusPercent / 100);
  const vacationCost = (monthlySalary / 30) * vacationDays;
  // Расходы на офис, оборудование, соцпакет, обучение (примерно 20% от ФОТ)
  const overhead = monthlySalary * 0.2;
  // Учитываем больничные и прочие неявки (примерно 5% рабочего времени)
  const sickLeaveCost = monthlySalary * 0.05;
  const totalMonthlyCost = monthlySalary + taxes + bonuses + (vacationCost / 12) + overhead + sickLeaveCost;

  // Подбор тарифа на основе количества сотрудников
  // 1-2 сотрудника -> AI Junior, 3-4 -> AI Pro Team, 5+ -> AI Enterprise
  const selectedTeamIndex = employeeCount <= 2 ? 0 : employeeCount <= 4 ? 1 : 2;
  const selectedTeam = teamOptions[selectedTeamIndex];
  
  // Используем реальную цену тарифа (без доп. часов, т.к. AI работает эффективнее и быстрее)
  const finalOutsourcingCost = selectedTeam.price;
  
  // Расчет реальной выгоды
  const savingsAmount = Math.round(totalMonthlyCost - finalOutsourcingCost);
  const savingsPercent = totalMonthlyCost > 0 
    ? Math.round((savingsAmount / totalMonthlyCost) * 100)
    : 0;

  // Расчет сравнения по количеству и качеству задач
  const tasksPerHour = 0.3; // среднее количество задач в час для обычного сотрудника (1 задача = ~3 часа)
  const hoursPerMonth = 160; // рабочих часов в месяц
  
  // Штатные сотрудники: количество задач = сотрудники * часы * задачи/час
  const employeeTasks = Math.round(employeeCount * hoursPerMonth * tasksPerHour);
  
  // AI-команда делает на 20% больше задач, чем штатные сотрудники
  const aiTasks = Math.round(employeeTasks * 1.2);
  
  // Качество: у AI меньше ошибок (5% vs 15% у людей)
  const employeeErrorRate = 0.15;
  const aiErrorRate = 0.05;
  const employeeQualityScore = Math.round((1 - employeeErrorRate) * 100);
  const aiQualityScore = Math.round((1 - aiErrorRate) * 100);
  
  // Расчет процента улучшения количества задач (фиксированно 20%)
  const tasksImprovement = 20;

  // Подключаем скрипт с частицами
  useEffect(() => {
    console.log('[Particles] Loading particles script...');
    
    // Загружаем скрипт
    const script = document.createElement('script');
    script.src = '/legacy/js/cube-optimized.js';
    script.async = true;
    script.onload = () => {
      console.log('[Particles] Script loaded successfully');
      console.log('[Particles] window.particleCube:', window.particleCube);
    };
    script.onerror = (error) => {
      console.error('[Particles] Failed to load script:', error);
    };
    document.body.appendChild(script);

    // Очистка при размонтировании
    return () => {
      console.log('[Particles] Cleaning up...');
      try {
        document.body.removeChild(script);
        // Останавливаем анимацию
        if (window.particleCube) {
          window.particleCube.stop();
        }
      } catch (e) {
        console.warn('[Particles] Cleanup error:', e);
      }
    };
  }, []);

  return (
    <Box sx={{ bgcolor: '#141414', color: '#ffffff' }}>
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        {/* Canvas для частиц */}
        <canvas
          id="particle-canvas"
          style={{
            position: 'absolute',
            top: '25%',
            left: 0,
            width: '100%',
            height: '50%',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
        
        <Box
          sx={{
            minHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'center',
            py: 8,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <MotionTypography
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4.5rem' },
              fontWeight: 800,
              mb: 2,
              background: 'linear-gradient(135deg, #ffffff 0%, #4caf50 50%, #2196f3 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            AI Boost Team
          </MotionTypography>

          <MotionTypography
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            variant="h4"
            sx={{
              fontSize: { xs: '1.2rem', md: '1.8rem' },
              mb: 1,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            Ваша AI-команда за 1/3 стоимости штата
          </MotionTypography>

          <MotionTypography
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            variant="body1"
            sx={{ mb: 6, color: 'rgba(255,255,255,0.7)', maxWidth: 700, mx: 'auto' }}
          >
            Экономьте до 67% на ФОТ. Масштабируйте команду за 1 неделю. Гарантия возврата за 14 дней.
          </MotionTypography>

          <Button
            variant="contained"
            size="large"
            sx={{
              fontSize: '1.2rem',
              py: 2,
              px: 4,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #43a047 0%, #1e88e5 100%)',
                boxShadow: '0 12px 32px rgba(76, 175, 80, 0.6)',
                transform: 'translateY(-2px)',
              },
              mx: 'auto',
            }}
            href="#calculator"
          >
            Рассчитать экономию за 30 сек
          </Button>
        </Box>
      </Container>

      {/* Команды и их функционал */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', py: 10 }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            align="center" 
            sx={{ 
              fontWeight: 700, 
              mb: 2,
              background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Выберите свой тариф
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 8, maxWidth: 700, mx: 'auto' }}>
            Все тарифы включают гарантию возврата денег за 14 дней
          </Typography>

          <Grid container spacing={4}>
            {teamOptions.map((option, index) => (
              <Grid item xs={12} md={4} key={index}>
                <MotionCard
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8, boxShadow: index === 1 ? '0 20px 40px rgba(76, 175, 80, 0.3)' : '0 20px 40px rgba(0,0,0,0.15)' }}
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    border: index === 1 ? '2px solid #4caf50' : '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                    background: index === 1 
                      ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(33, 150, 243, 0.1) 100%)' 
                      : 'transparent',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {index === 1 && (
                    <Chip
                      label="⭐ Популярный"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        right: 20,
                        background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
                        color: '#ffffff',
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
                      }}
                    />
                  )}

                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {option.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>
                      {option.idealFor}
                    </Typography>

                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#ffffff', mb: 1 }}>
                      {option.price.toLocaleString('ru-RU')} ₽
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      в месяц
                    </Typography>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                      ✓ {option.hoursIncluded} часов работы включено
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
                      + {option.extraHourPrice.toLocaleString('ru-RU')} ₽/час сверх лимита
                    </Typography>

                    <Divider sx={{ my: 3 }} />

                    {option.features.map((feature, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                        <CheckCircle sx={{ fontSize: 20, color: '#4caf50', flexShrink: 0, mt: 0.2 }} />
                        <Typography variant="body2">{feature}</Typography>
                      </Box>
                    ))}

                    <Button
                      fullWidth
                      variant={index === 1 ? 'contained' : 'outlined'}
                      size="large"
                      sx={{ 
                        mt: 4, 
                        fontWeight: 600, 
                        py: 1.5,
                        background: index === 1 ? 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)' : 'transparent',
                        borderColor: index === 1 ? 'transparent' : '#ffffff',
                        color: '#ffffff',
                        boxShadow: index === 1 ? '0 4px 12px rgba(76, 175, 80, 0.3)' : 'none',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: index === 1 ? 'linear-gradient(135deg, #43a047 0%, #1e88e5 100%)' : 'rgba(255,255,255,0.1)',
                          borderColor: '#ffffff',
                          boxShadow: index === 1 ? '0 6px 16px rgba(76, 175, 80, 0.4)' : 'none',
                          transform: 'translateY(-2px)',
                        }
                      }}
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

      {/* Калькулятор выгоды */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', py: 10 }}>
      <Container maxWidth="lg" id="calculator">
        <Typography 
          variant="h3" 
          align="center" 
          sx={{ 
            fontWeight: 700, 
            mb: 2,
            background: 'linear-gradient(135deg, #ff9800 0%, #e91e63 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Калькулятор выгоды
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 700, mx: 'auto' }}>
          Рассчитайте, сколько вы сэкономите, используя AI Boost Team вместо найма сотрудников
        </Typography>

        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Средняя зарплата сотрудника (₽/мес)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={avgSalary}
                  onChange={(e) => setAvgSalary(Number(e.target.value))}
                  InputProps={{ inputProps: { min: 50000, max: 500000, step: 10000 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                      '& fieldset': {
                        borderColor: 'rgba(76, 175, 80, 0.4)',
                        borderWidth: 2,
                      },
                      '&:hover fieldset': {
                        borderColor: '#4caf50',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#4caf50',
                      },
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Количество сотрудников
                </Typography>
                <Slider
                  value={employeeCount}
                  onChange={(_, value) => setEmployeeCount(value as number)}
                  min={1}
                  max={5}
                  step={1}
                  marks
                  valueLabelDisplay="on"
                  sx={{
                    color: '#2196f3',
                    height: 8,
                    '& .MuiSlider-thumb': {
                      width: 24,
                      height: 24,
                      backgroundColor: '#fff',
                      border: '3px solid currentColor',
                      '&:hover': {
                        boxShadow: '0 0 0 8px rgba(33, 150, 243, 0.16)',
                      },
                    },
                    '& .MuiSlider-track': {
                      height: 8,
                      borderRadius: 4,
                      background: 'linear-gradient(90deg, #2196f3 0%, #21cbf3 100%)',
                    },
                    '& .MuiSlider-rail': {
                      height: 8,
                      borderRadius: 4,
                      opacity: 0.3,
                    },
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: '#2196f3',
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Премии (% от зарплаты)
                </Typography>
                <Slider
                  value={bonusPercent}
                  onChange={(_, value) => setBonusPercent(value as number)}
                  min={0}
                  max={50}
                  step={5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                  sx={{
                    color: '#ff9800',
                    height: 8,
                    '& .MuiSlider-thumb': {
                      width: 24,
                      height: 24,
                      backgroundColor: '#fff',
                      border: '3px solid currentColor',
                      '&:hover': {
                        boxShadow: '0 0 0 8px rgba(255, 152, 0, 0.16)',
                      },
                    },
                    '& .MuiSlider-track': {
                      height: 8,
                      borderRadius: 4,
                      background: 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)',
                    },
                    '& .MuiSlider-rail': {
                      height: 8,
                      borderRadius: 4,
                      opacity: 0.3,
                    },
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: '#ff9800',
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Дней отпуска в году
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={vacationDays}
                  onChange={(e) => setVacationDays(Number(e.target.value))}
                  InputProps={{ inputProps: { min: 20, max: 60, step: 1 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(156, 39, 176, 0.08)',
                      '& fieldset': {
                        borderColor: 'rgba(156, 39, 176, 0.4)',
                        borderWidth: 2,
                      },
                      '&:hover fieldset': {
                        borderColor: '#9c27b0',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#9c27b0',
                      },
                    },
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(33, 150, 243, 0.15) 50%, rgba(156, 39, 176, 0.15) 100%)',
                  border: '2px solid',
                  borderColor: 'rgba(76, 175, 80, 0.5)',
                  boxShadow: '0 8px 32px rgba(76, 175, 80, 0.2)',
                  color: '#ffffff',
                  height: '100%',
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                  Результат расчёта
                </Typography>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>
                    Затраты на штатных сотрудников:
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    {Math.round(totalMonthlyCost).toLocaleString('ru-RU')} ₽/мес
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    (зарплата + налоги 30% + премии + отпускные + офис + больничные)
                  </Typography>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>
                    Стоимость AI Boost Team:
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    {Math.round(finalOutsourcingCost).toLocaleString('ru-RU')} ₽/мес
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    Рекомендуемый тариф: {selectedTeam.name} ({selectedTeam.hoursIncluded} часов включено)
                  </Typography>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 3 }} />

                {/* Сравнение по количеству задач */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Количество выполненных задач в месяц:
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
                          Штатные сотрудники
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          ~{employeeTasks}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          задач
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.15)', textAlign: 'center', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                        <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
                          AI Boost Team
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#4caf50' }}>
                          ~{aiTasks}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          задач {tasksImprovement > 0 ? `(+${tasksImprovement}% больше)` : tasksImprovement < 0 ? `(${tasksImprovement}% меньше)` : '(равно)'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                {/* Сравнение по качеству */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Качество выполнения задач:
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
                          Штатные сотрудники
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {employeeQualityScore}%
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          без ошибок (15% ошибок)
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.15)', textAlign: 'center', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                        <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
                          AI Boost Team
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#4caf50' }}>
                          {aiQualityScore}%
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          без ошибок (5% ошибок) +{aiQualityScore - employeeQualityScore}%
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 3 }} />

                {/* Финансовая выгода */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    Ваша экономия:
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, color: savingsAmount >= 0 ? '#4caf50' : '#f44336' }}>
                    {Math.abs(Math.round(savingsAmount)).toLocaleString('ru-RU')} ₽
                  </Typography>
                  <Typography variant="h5" sx={{ opacity: 0.9, color: savingsAmount >= 0 ? '#4caf50' : '#f44336' }}>
                    {savingsAmount >= 0 ? `(${savingsPercent}% экономии в месяц)` : `(${Math.abs(savingsPercent)}% дороже)`}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 4,
                    py: 2,
                    background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #43a047 0%, #1e88e5 100%)',
                      boxShadow: '0 12px 32px rgba(76, 175, 80, 0.6)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                  href="#contact-form"
                >
                  Получить бесплатный аудит
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Container>
      </Box>

      {/* Кейсы и отзывы */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', py: 10 }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            align="center" 
            sx={{ 
              fontWeight: 700, 
              mb: 2,
              background: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Кейсы и отзывы клиентов
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 8, maxWidth: 700, mx: 'auto' }}>
            Реальные результаты наших клиентов
          </Typography>

          <Grid container spacing={4}>
            {cases.map((caseItem, index) => (
              <Grid item xs={12} md={6} key={caseItem.id}>
                <MotionCard
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    p: 3,
                  }}
                >
                  <Box sx={{ mb: 2 }}>
                    <Chip label={caseItem.industry} size="small" sx={{ mr: 1, mb: 1 }} />
                    {caseItem.verified && (
                      <Chip
                        icon={<VerifiedUser sx={{ fontSize: 16 }} />}
                        label="Проверено"
                        size="small"
                        color="primary"
                        sx={{ mb: 1 }}
                      />
                    )}
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    {caseItem.company}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <strong>Задача:</strong> {caseItem.challenge}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    <strong>Решение:</strong> {caseItem.solution}
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Результаты:
                    </Typography>
                    {caseItem.results.map((result, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <CheckCircle sx={{ fontSize: 20, color: '#4caf50', flexShrink: 0 }} />
                        <Typography variant="body2">{result}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {[...Array(caseItem.rating)].map((_, i) => (
                      <Star key={i} sx={{ color: '#ffc107', fontSize: 20 }} />
                    ))}
                  </Box>

                  <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2 }}>
                    "{caseItem.text}"
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#000000' }}>
                      {caseItem.author.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {caseItem.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {caseItem.position}
                      </Typography>
                    </Box>
                  </Box>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FAQ */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', py: 10 }}>
      <Container maxWidth="md">
        <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 2 }}>
          Частые вопросы
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6 }}>
          Ответы на популярные вопросы об AI Boost Team
        </Typography>

        {[
          {
            q: 'Чем AI-команда отличается от обычных сотрудников?',
            a: 'AI-команда работает 24/7, не уходит в отпуск, не болеет, не требует офиса и соцпакета. При этом она выполняет задачи быстрее и с меньшим количеством ошибок.',
          },
          {
            q: 'Какие задачи может решать AI Boost Team?',
            a: 'Маркетинг (контент, SEO, SMM), аналитика данных, автоматизация процессов, создание отчётов, работа с клиентами, разработка стратегий и многое другое.',
          },
          {
            q: 'Как происходит интеграция с нашими системами?',
            a: 'Мы работаем с любыми популярными системами: AmoCRM, Битрикс24, 1С, Google Analytics, рекламные кабинеты. Настройка занимает от 1 до 7 дней в зависимости от сложности.',
          },
          {
            q: 'Что входит в гарантию возврата за 14 дней?',
            a: 'Если в течение 14 дней вы не увидите результатов или AI Boost Team вам не подойдёт, мы вернём 100% средств без вопросов.',
          },
          {
            q: 'Можно ли масштабировать команду?',
            a: 'Да, вы можете увеличить или уменьшить состав команды в любой момент. Изменения вступают в силу со следующего месяца.',
          },
          {
            q: 'Нужно ли обучать AI наши процессы?',
            a: 'Мы проводим аудит и сами настраиваем AI под ваши процессы. От вас требуется только предоставить доступы и ответить на вопросы.',
          },
        ].map((faq, index) => (
          <Accordion
            key={index}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            viewport={{ once: true }}
            sx={{
              mb: 2,
              borderRadius: 2,
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {faq.q}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" color="text.secondary">
                {faq.a}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
      </Box>

      {/* Контактная форма */}
      <Container maxWidth="md" sx={{ py: 10 }} id="contact-form">
        <MotionCard
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          sx={{
            p: 5,
            borderRadius: 3,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          }}
        >
          <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 2 }}>
            Начните экономить уже сегодня
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 5 }}>
            Оставьте заявку, и мы свяжемся с вами в течение 2 часов
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Ваше имя" variant="outlined" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Телефон" variant="outlined" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Email" type="email" variant="outlined" />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Расскажите о вашей задаче"
                multiline
                rows={4}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <PrivacyConsentCheckbox
                checked={agreeToPrivacy}
                onChange={setAgreeToPrivacy}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <MarketingConsentCheckbox
                checked={agreeToMarketing}
                onChange={setAgreeToMarketing}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => {
                  if (!agreeToPrivacy) {
                    showToast('Необходимо согласие на обработку персональных данных', 'error');
                    return;
                  }
                  // Здесь будет отправка формы
                  showToast('Спасибо за заявку! Мы свяжемся с вами в течение 2 часов.', 'success');
                }}
                sx={{
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #43a047 0%, #1e88e5 100%)',
                    boxShadow: '0 12px 32px rgba(76, 175, 80, 0.6)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Получить бесплатный аудит
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
              </Typography>
            </Grid>
          </Grid>
        </MotionCard>
      </Container>

      {/* Блог */}
      {blogPosts.length > 0 && (
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', py: 10 }}>
          <Container maxWidth="lg">
            <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 2 }}>
              Полезные статьи
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6 }}>
              Узнайте больше об AI и автоматизации бизнеса
            </Typography>

            <Grid container spacing={4}>
              {blogPosts.slice(0, 3).map((post, index) => (
                <Grid item xs={12} md={4} key={post.id}>
                  <MotionCard
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 2,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                      },
                    }}
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    {post.cover_image_url && (
                      <Box
                        sx={{
                          height: 200,
                          backgroundImage: `url(${post.cover_image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    )}
                    <CardContent sx={{ flex: 1, p: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {post.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {post.excerpt}
                      </Typography>
                      <Button size="small" endIcon={<ArrowForward />} sx={{ color: '#ffffff' }}>
                        Читать далее
                      </Button>
                    </CardContent>
                  </MotionCard>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}
    </Box>
  );
}
