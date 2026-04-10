import { Box, Container, Typography, Button, Grid, Card, CardContent, Paper, TextField, Slider, Accordion, AccordionSummary, AccordionDetails, Avatar, Chip, Divider } from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PrivacyConsentCheckbox } from '@/components/privacy/PrivacyConsentCheckbox';
import { MarketingConsentCheckbox } from '@/components/privacy/MarketingConsentCheckbox';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { listPublicBlogHighlights } from '@/services/publicApi';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/ToastProvider';
import { CheckCircle, ArrowForward, ExpandMore, Star, VerifiedUser } from '@mui/icons-material';
import { AITeamEditorialThreeBackground } from '@/components/home/AITeamEditorialThreeBackground';

const editorialEyebrowSx = {
  fontSize: { xs: '0.65rem', sm: '0.7rem' },
  letterSpacing: '0.42em',
  textTransform: 'uppercase' as const,
  color: 'rgba(0,229,255,0.75)',
  fontWeight: 600,
  mb: 1.5,
};

const glassPanelSx = {
  bgcolor: 'rgba(12,12,16,0.55)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 2,
  color: '#f4f4f5',
};

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);
const MotionTypography = motion.create(Typography);

const HERO_CLIENT_CHIP_GROUPS: { labels: string[]; borderColor?: string }[] = [
  { labels: ['AI-агенты', 'Сценарии', 'Воронки', '24/7'] },
  { labels: ['CRM', 'Мессенджеры', 'Интеграции', 'Аналитика'], borderColor: 'rgba(0, 229, 255, 0.28)' },
  { labels: ['SEO', 'SMM', 'Рассылки', 'Скрипты продаж'], borderColor: 'rgba(199, 125, 255, 0.3)' },
];

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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://prime-coder.ru/ai-team';
  return (
    <>
      <SeoMetaTags
        title="AI-команда маркетинга под ключ от 79 000 ₽/мес"
        description="Подписка на AI-специалистов: SMM, SEO, аналитика, контент. Замена 1–2 штатных сотрудников. Пилот бесплатно — оцените результат."
        keywords="AI маркетинг, подписка на маркетолога, AI SMM, автоматизация маркетинга"
        url={currentUrl}
      />
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 90% 60% at 10% 20%, rgba(0, 229, 255, 0.07) 0%, transparent 50%),
            radial-gradient(ellipse 70% 50% at 90% 80%, rgba(199, 125, 255, 0.08) 0%, transparent 45%),
            linear-gradient(180deg, rgba(5,5,8,0.92) 0%, rgba(8,8,12,0.88) 40%, rgba(5,5,8,0.94) 100%)
          `,
          mixBlendMode: 'normal',
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <AITeamEditorialThreeBackground />

      <Box sx={{ position: 'relative', zIndex: 1, bgcolor: 'transparent', color: '#f4f4f5' }}>
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box
          sx={{
            minHeight: { xs: '85vh', md: '92vh' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            textAlign: 'left',
            py: { xs: 6, md: 10 },
            position: 'relative',
            zIndex: 1,
          }}
        >
          <MotionTypography
            component="p"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            sx={editorialEyebrowSx}
          >
            Спецвыпуск · AI-отдел под ключ · 2026
          </MotionTypography>

          <MotionTypography
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            variant="h1"
            sx={{
              fontSize: { xs: '2.65rem', md: '3.75rem', lg: 'clamp(3.5rem, 6vw, 5rem)' },
              fontWeight: 800,
              mb: 1,
              lineHeight: 1.05,
              color: '#fff',
              fontFamily: '"Raleway", sans-serif',
              textAlign: 'left',
              maxWidth: '14ch',
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
              fontSize: { xs: '1.15rem', md: '1.65rem' },
              mb: 1,
              fontWeight: 600,
              color: '#fff',
              fontFamily: '"Raleway", sans-serif',
              maxWidth: 720,
            }}
          >
            Ваша AI-команда за 1/3 стоимости штата
          </MotionTypography>

          <MotionTypography
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            variant="body1"
            sx={{ mb: 4, color: 'rgba(255,255,255,0.72)', maxWidth: 640, textAlign: 'left', lineHeight: 1.65 }}
          >
            Экономьте до 67% на ФОТ. Масштабируйте команду за 1 неделю. Гарантия возврата за 14 дней.
          </MotionTypography>

          <MotionBox
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 4, maxWidth: 720 }}
          >
            {HERO_CLIENT_CHIP_GROUPS.map((group, gi) => (
              <Box key={gi} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                {group.labels.map((label) => (
                  <Chip
                    key={label}
                    label={label}
                    size="small"
                    sx={{
                      ...glassPanelSx,
                      fontWeight: 600,
                      letterSpacing: '0.03em',
                      fontSize: { xs: '0.62rem', sm: '0.68rem' },
                      height: 26,
                      ...(group.borderColor ? { borderColor: group.borderColor } : {}),
                    }}
                  />
                ))}
              </Box>
            ))}
          </MotionBox>

          <Button
            variant="contained"
            size="medium"
            href="#calculator"
            sx={{
              alignSelf: 'flex-start',
              fontSize: '1rem',
              py: 1.5,
              px: 3,
              bgcolor: '#ffbb00',
              color: '#0a0a0c',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: '0 4px 24px rgba(255,184,0,0.22)',
              '&:hover': { bgcolor: '#e5a800', color: '#0a0a0c', transform: 'translateY(-2px)' },
            }}
          >
            Рассчитать экономию за 30 сек
          </Button>
        </Box>
      </Container>

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', mb: { xs: 0, md: 0 } }} />

      {/* Команды и их функционал */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography component="p" sx={{ ...editorialEyebrowSx }}>
            01 · Матрица подписки
          </Typography>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700, 
              mb: 2,
              color: '#fff',
              fontFamily: '"Raleway", sans-serif',
              textAlign: 'left',
              letterSpacing: '-0.02em',
            }}
          >
            Выберите свой тариф
          </Typography>
          <Typography variant="body1" sx={{ mb: 8, maxWidth: 700, textAlign: 'left', color: 'rgba(244,244,245,0.65)' }}>
            Все тарифы включают гарантию возврата денег за 14 дней
          </Typography>

          <Grid container spacing={4}>
            {teamOptions.map((option, index) => (
              <Grid item xs={12} md={4} key={index} sx={{ overflow: 'visible' }}>
                <MotionCard
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  whileHover={{
                    y: -6,
                    boxShadow:
                      index === 1
                        ? '0 24px 48px rgba(255, 184, 0, 0.22), 0 0 0 1px rgba(0,229,255,0.12)'
                        : '0 20px 40px rgba(0,0,0,0.35)',
                  }}
                  sx={{
                    height: '100%',
                    borderRadius: 1,
                    border: index === 1 ? '2px solid rgba(255, 184, 0, 0.85)' : '1px solid rgba(255,255,255,0.12)',
                    position: 'relative',
                    bgcolor: 'rgba(12,12,16,0.72)',
                    backdropFilter: 'blur(14px)',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    {index === 1 && (
                      <Chip
                        label="Рекомендуем"
                        className="chip-white-bg"
                        size="small"
                        sx={{
                          mb: 2,
                          bgcolor: '#fff',
                          color: '#141414',
                          fontWeight: 700,
                        }}
                      />
                    )}
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#fff', fontFamily: '"Raleway", sans-serif' }}>
                      {option.name}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, fontStyle: 'italic', color: 'rgba(244,244,245,0.58)' }}>
                      {option.idealFor}
                    </Typography>

                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#ffffff', mb: 1 }}>
                      {option.price.toLocaleString('ru-RU')} ₽
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: 'rgba(244,244,245,0.5)' }}>
                      в месяц
                    </Typography>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                      ✓ {option.hoursIncluded} часов работы включено
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: 'rgba(244,244,245,0.45)' }}>
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
                      size="medium"
                      sx={{ 
                        mt: 4, 
                        fontWeight: 600, 
                        py: 1.2,
                        fontSize: '1rem',
                        bgcolor: index === 1 ? '#ffbb00' : 'transparent',
                        borderColor: index === 1 ? 'transparent' : 'rgba(255,255,255,0.5)',
                        color: index === 1 ? '#141414' : '#fff',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: index === 1 ? '#e5a800' : 'rgba(255,255,255,0.1)',
                          borderColor: 'rgba(255,255,255,0.5)',
                          color: index === 1 ? '#141414' : '#fff',
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
      <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg" id="calculator">
        <Typography component="p" sx={{ ...editorialEyebrowSx }}>
          02 · Экономика штата vs AI
        </Typography>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 700, 
            mb: 2,
            color: '#fff',
            fontFamily: '"Raleway", sans-serif',
            textAlign: 'left',
            letterSpacing: '-0.02em',
          }}
        >
          Калькулятор выгоды
        </Typography>
        <Typography variant="body1" sx={{ mb: 6, maxWidth: 700, textAlign: 'left', color: 'rgba(244,244,245,0.65)' }}>
          Рассчитайте, сколько вы сэкономите, используя AI Boost Team вместо найма сотрудников
        </Typography>

        <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 0, ...glassPanelSx, border: '1px solid rgba(0,229,255,0.12)' }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f4f4f5' }}>
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
                      color: '#f4f4f5',
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
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f4f4f5' }}>
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
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f4f4f5' }}>
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
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f4f4f5' }}>
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
                      color: '#f4f4f5',
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
                  size="medium"
                  sx={{
                    mt: 4,
                    py: 1.2,
                    fontSize: '1rem',
                    bgcolor: '#ffbb00',
                    color: '#141414',
                    fontWeight: 700,
                    transition: 'all 0.3s ease',
                    '&:hover': { bgcolor: '#e5a800', color: '#141414', transform: 'translateY(-2px)' },
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
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography component="p" sx={{ ...editorialEyebrowSx }}>
            03 · Социальное доказательство
          </Typography>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700, 
              mb: 2,
              color: '#fff',
              fontFamily: '"Raleway", sans-serif',
              textAlign: 'left',
              letterSpacing: '-0.02em',
            }}
          >
            Кейсы и отзывы клиентов
          </Typography>
          <Typography variant="body1" sx={{ mb: 8, maxWidth: 700, textAlign: 'left', color: 'rgba(244,244,245,0.65)' }}>
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
                    borderRadius: 0,
                    p: 3,
                    ...glassPanelSx,
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <Box sx={{ mb: 2 }}>
                    <Chip label={caseItem.industry} size="small" sx={{ mr: 1, mb: 1 }} />
                    {caseItem.verified && (
                      <Chip
                        icon={<VerifiedUser sx={{ fontSize: 16, color: 'inherit' }} />}
                        label="Проверено"
                        size="small"
                        className="chip-white-bg"
                        sx={{ mb: 1, bgcolor: '#fff', color: '#141414' }}
                      />
                    )}
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    {caseItem.company}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 2, color: 'rgba(244,244,245,0.62)' }}>
                    <strong>Задача:</strong> {caseItem.challenge}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 3, color: 'rgba(244,244,245,0.62)' }}>
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
                    <Avatar sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700 }}>
                      {caseItem.author.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {caseItem.author}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(244,244,245,0.5)' }}>
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
      <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Typography component="p" sx={{ ...editorialEyebrowSx}}>
          04 · Рубрика «Вопрос — ответ»
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: '#fff', fontFamily: '"Raleway", sans-serif', textAlign: 'left', letterSpacing: '-0.02em' }}>
          Частые вопросы
        </Typography>
        <Typography variant="body1" sx={{ mb: 6, textAlign: 'left', color: 'rgba(244,244,245,0.65)' }}>
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
              borderRadius: 0,
              '&:before': { display: 'none' },
              ...glassPanelSx,
              boxShadow: 'none',
              '& .MuiAccordionSummary-expandIconWrapper': { color: 'rgba(0,229,255,0.8)' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {faq.q}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" sx={{ color: 'rgba(244,244,245,0.65)', lineHeight: 1.7 }}>
                {faq.a}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
      </Box>

      <Box component="section">
      {/* Контактная форма */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }} id="contact-form">
        <Typography component="p" sx={{ ...editorialEyebrowSx }}>
          05 · Заявка в одно касание
        </Typography>
        <MotionCard
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 0,
            ...glassPanelSx,
            border: '1px solid rgba(199, 125, 255, 0.2)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: '#fff', fontFamily: '"Raleway", sans-serif', textAlign: 'left', letterSpacing: '-0.02em' }}>
            Начните экономить уже сегодня
          </Typography>
          <Typography variant="body1" sx={{ mb: 5, textAlign: 'left', color: 'rgba(244,244,245,0.65)' }}>
            Оставьте заявку, и мы свяжемся с вами в течение 2 часов
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ваше имя"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.04)', color: '#f4f4f5' },
                  '& .MuiInputLabel-root': { color: 'rgba(244,244,245,0.6)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Телефон"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.04)', color: '#f4f4f5' },
                  '& .MuiInputLabel-root': { color: 'rgba(244,244,245,0.6)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.04)', color: '#f4f4f5' },
                  '& .MuiInputLabel-root': { color: 'rgba(244,244,245,0.6)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Расскажите о вашей задаче"
                multiline
                rows={4}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.04)', color: '#f4f4f5' },
                  '& .MuiInputLabel-root': { color: 'rgba(244,244,245,0.6)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                }}
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
                size="medium"
                onClick={() => {
                  if (!agreeToPrivacy) {
                    showToast('Необходимо согласие на обработку персональных данных', 'error');
                    return;
                  }
                  showToast('Спасибо за заявку! Мы свяжемся с вами в течение 2 часов.', 'success');
                }}
                sx={{
                  py: 1.2,
                  fontSize: '1rem',
                  fontWeight: 700,
                  bgcolor: '#ffbb00',
                  color: '#141414',
                  transition: 'all 0.3s ease',
                  '&:hover': { bgcolor: '#e5a800', color: '#141414', transform: 'translateY(-2px)' },
                }}
              >
                Получить бесплатный аудит
              </Button>
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'rgba(244,244,245,0.45)' }}>
                Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
              </Typography>
            </Grid>
          </Grid>
        </MotionCard>
      </Container>

      {/* Блог */}
      {blogPosts.length > 0 && (
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Container maxWidth="lg">
            <Typography component="p" align="center" sx={{ ...editorialEyebrowSx, textAlign: 'center' }}>
              06 · Лонгриды и заметки
            </Typography>
            <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 2, color: '#fff', letterSpacing: '-0.02em' }}>
              Полезные статьи
            </Typography>
            <Typography variant="body1" align="center" sx={{ mb: 6, color: 'rgba(244,244,245,0.65)' }}>
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
                      borderRadius: 0,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      ...glassPanelSx,
                      border: '1px solid rgba(255,255,255,0.08)',
                      '&:hover': {
                        boxShadow: '0 10px 40px rgba(0,229,255,0.08)',
                        borderColor: 'rgba(0,229,255,0.25)',
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
                      <Typography variant="body2" sx={{ mb: 2, color: 'rgba(244,244,245,0.6)' }}>
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
    </Box>
    </>
  );
}
