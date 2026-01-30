import { Box, Container, Typography, Button, Grid, Card, CardContent, Paper, Chip, TextField, Slider, Divider, Stepper, Step, StepLabel, StepContent, Accordion, AccordionSummary, AccordionDetails, Rating, Avatar } from '@mui/material';
import { motion } from 'framer-motion';
import { BlogCarousel } from '@/components/public/BlogCarousel';
import { useQuery } from '@tanstack/react-query';
import { listPublicBlogHighlights } from '@/services/publicApi';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Calculate, CheckCircle, ArrowForward, 
  Speed, Scale, Shield, Analytics, Group, 
  Support, Settings, Visibility, Savings, 
  Business, SmartToy, AutoAwesome, Verified,
  ExpandMore, Star, StarBorder, VerifiedUser
} from '@mui/icons-material';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);
const MotionTypography = motion.create(Typography);
const MotionPaper = motion.create(Paper);
const MotionAccordion = motion.create(Accordion);

interface TeamOption {
  id: string;
  name: string;
  description: string;
  specialists: string[];
  detailedFeatures: string[];
  price: string;
  priceRange: string;
  benefits: string[];
  savings: string;
  idealFor: string[];
  hoursIncluded: number; // Включено часов в месяц
  extraHourPrice: number; // Цена за дополнительный час
}

const teamOptions: TeamOption[] = [
  {
    id: 'team-a',
    name: 'Команда А',
    description: '2 AI-специалиста для усиления вашей команды',
    specialists: [
      'Автоматизация рутинных процессов',
      'AI-аналитика и исследование данных',
      'Генерация контента и идей',
      'Подготовка презентаций и отчетов',
      'Задачи маркетинга и SEO',
    ],
    detailedFeatures: [
      'Автоматизация рутинных процессов: настройка AI-инструментов для автоматизации повторяющихся задач, оптимизация рабочих процессов',
      'AI-аналитика и исследование данных: глубокий анализ данных, выявление паттернов, прогнозирование трендов, конкурентный анализ',
      'Генерация контента и идей: создание текстового контента, идей для маркетинга, креативные решения с использованием AI',
      'Подготовка презентаций и отчетов: автоматизированная подготовка профессиональных презентаций, визуализация данных, отчетность',
      'Задачи маркетинга и SEO: разработка маркетинговых стратегий, контент-маркетинг, SMM, email-кампании, SEO-оптимизация',
      'Финансовые расчеты и моделирование: финансовое моделирование, расчет ROI, анализ эффективности, прогнозирование',
      'Работа с документацией: создание и редактирование документов, систематизация информации, подготовка материалов',
      'Поддержка в переговорах: подготовка материалов для переговоров, анализ контрагентов, стратегическое планирование',
    ],
    price: 'от 100 000 ₽/мес',
    priceRange: '100 000 - 200 000 ₽/мес',
    hoursIncluded: 120, // Включено 120 часов в месяц (60 часов на специалиста)
    extraHourPrice: 2000, // Доплата за час сверх лимита
    benefits: [
      'Быстрое масштабирование без найма',
      'Гибкость в использовании',
      '120 часов работы включено',
      'Прозрачная доплата за дополнительные часы',
    ],
    savings: 'Экономия до 40%',
    idealFor: [
      'Малый бизнес',
      'Усиление существующего отдела',
      'Проектные задачи',
    ],
  },
  {
    id: 'team-b',
    name: 'Команда Б',
    description: '2 AI-специалиста + руководитель. Полная замена 1-2 отделов',
    specialists: [
      'Автономное управление отделом',
      'Стратегическое планирование',
      'Операционное управление',
      'Контроль качества и KPI',
      'Полная отчетность',
    ],
    detailedFeatures: [
      'Автономное управление отделом: полная координация работы, распределение задач, контроль сроков, управление ресурсами',
      'Стратегическое планирование: разработка долгосрочных стратегий развития, постановка целей, планирование бюджета, KPI-метрики',
      'Операционное управление: ежедневное управление процессами, решение оперативных задач, координация с другими отделами',
      'Контроль качества и KPI: постоянный мониторинг качества работы, стандартизация процессов, внедрение best practices',
      'Полная отчетность: регулярная детальная отчетность, анализ показателей, выявление проблем и возможностей',
      'Управление проектами: планирование проектов, контроль выполнения, управление рисками, коммуникация со стейкхолдерами',
      'Развитие процессов: оптимизация бизнес-процессов, внедрение инноваций, цифровая трансформация',
      'Работа с клиентами: управление отношениями с клиентами, решение проблем, развитие лояльности',
      'Интеграция с бизнес-системами: настройка интеграций, автоматизация взаимодействия между отделами',
    ],
    price: 'от 180 000 ₽/мес',
    priceRange: '180 000 - 350 000 ₽/мес',
    hoursIncluded: 200, // Включено 200 часов в месяц (100 часов на специалиста + руководитель)
    extraHourPrice: 1800, // Доплата за час сверх лимита
    benefits: [
      'Полная замена отдела',
      'Нет затрат на ФОТ, налоги, отпускные',
      '200 часов работы включено',
      'Профессиональное управление',
    ],
    savings: 'Экономия до 50%',
    idealFor: [
      'Средний бизнес',
      'Замена отдела маркетинга',
      'Замена отдела аналитики',
      'Оптимизация затрат',
    ],
  },
  {
    id: 'team-c',
    name: 'Команда В',
    description: '2 AI-инженера + разработчик + руководитель. Комплексное AI-решение',
    specialists: [
      'Разработка и внедрение AI-решений',
      'Автоматизация бизнес-процессов',
      'Интеграция AI в существующие системы',
      'Техническая поддержка и мониторинг',
      'Обучение вашей команды',
    ],
    detailedFeatures: [
      'Разработка и внедрение AI-решений: создание AI-моделей под задачи бизнеса, обучение моделей, интеграция в процессы',
      'Автоматизация бизнес-процессов: анализ процессов, выявление точек автоматизации, разработка и внедрение решений',
      'Интеграция AI в существующие системы: интеграция с CRM, ERP, другими бизнес-системами, API-разработка',
      'Техническая поддержка и мониторинг: круглосуточный мониторинг систем, устранение проблем, обновление моделей',
      'Обучение вашей команды: обучение работе с AI-инструментами, создание документации, проведение воркшопов',
      'Анализ данных и дашборды: сбор и анализ больших объемов данных, построение дашбордов, выявление инсайтов',
      'Разработка чат-ботов: создание интеллектуальных чат-ботов для клиентов, интеграция с мессенджерами',
      'Computer Vision решения: обработка изображений, распознавание объектов, анализ видео',
      'NLP и обработка текста: анализ текстов, генерация контента, классификация документов',
      'MLOps и DevOps: настройка CI/CD для ML, мониторинг моделей, автоматизация развертывания',
    ],
    price: 'от 270 000 ₽/мес',
    priceRange: '270 000 - 500 000 ₽/мес',
    hoursIncluded: 280, // Включено 280 часов в месяц (70 часов на специалиста)
    extraHourPrice: 1600, // Доплата за час сверх лимита
    benefits: [
      'Комплексное AI-решение',
      'Техническая экспертиза',
      '280 часов работы включено',
      'Быстрое внедрение',
    ],
    savings: 'Экономия до 45%',
    idealFor: [
      'Крупный бизнес',
      'IT-компании',
      'Цифровая трансформация',
      'Сложные AI-проекты',
    ],
  },
  {
    id: 'team-d',
    name: 'Вариант Г',
    description: 'Индивидуальный подбор команды под ваши задачи',
    specialists: [
      'Глубокий анализ потребностей',
      'Подбор оптимальной команды',
      'Гибкий состав и масштабирование',
      'Кастомизация под задачи',
      'Персональный менеджер',
    ],
    detailedFeatures: [
      'Глубокий анализ потребностей: детальный анализ бизнес-процессов, выявление узких мест, определение требований',
      'Подбор оптимальной команды: подбор специалистов под конкретные задачи, проверка компетенций, формирование команды',
      'Гибкий состав и масштабирование: возможность изменения состава, добавление/удаление специалистов, изменение нагрузки',
      'Кастомизация под задачи: настройка процессов под специфику бизнеса, разработка индивидуальных решений',
      'Персональный менеджер: выделенный менеджер для координации, единая точка контакта, оперативное решение вопросов',
      'Мультидисциплинарная команда: сочетание разных экспертиз (маркетинг, разработка, аналитика, дизайн)',
      'Экспертиза в различных областях: финансы, HR, продажи, производство, логистика, IT',
      'Гибкая модель работы: проектная работа, частичная занятость, консультации, долгосрочное сотрудничество',
      'Адаптация под сезонность: быстрое масштабирование при росте задач, адаптация под сезонные колебания',
    ],
    price: 'Индивидуально',
    priceRange: 'Рассчитывается индивидуально',
    hoursIncluded: 0, // Индивидуально
    extraHourPrice: 0, // Индивидуально
    benefits: [
      '100% соответствие задачам',
      'Максимальная гибкость',
      'Индивидуальные условия по часам',
      'Оптимальная стоимость',
    ],
    savings: 'Максимальная эффективность',
    idealFor: [
      'Специфические задачи',
      'Стартапы',
      'Проектная работа',
      'Экспериментальные решения',
    ],
  },
];

const advantages = [
  {
    icon: <Savings sx={{ fontSize: 40 }} />,
    title: 'Экономия до 50%',
    description: 'Экономия на ФОТ, налогах, премиях, больничных и отпускных. Платите только за фактическую работу.',
  },
  {
    icon: <Speed sx={{ fontSize: 40 }} />,
    title: 'Высокая скорость',
    description: 'AI-технологии позволяют выполнять задачи в разы быстрее, чем традиционные методы.',
  },
  {
    icon: <Scale sx={{ fontSize: 40 }} />,
    title: 'Гибкое масштабирование',
    description: 'Увеличивайте или уменьшайте команду в зависимости от нагрузки. Платите только за реальную загрузку.',
  },
  {
    icon: <Shield sx={{ fontSize: 40 }} />,
    title: 'Без рисков найма',
    description: 'Не нужно искать, нанимать и удерживать сотрудников. Мы берем все риски на себя.',
  },
  {
    icon: <Analytics sx={{ fontSize: 40 }} />,
    title: 'Прозрачность работы',
    description: 'Регулярные отчеты, KPI, полная видимость процессов. Вы всегда знаете, что происходит.',
  },
  {
    icon: <Settings sx={{ fontSize: 40 }} />,
    title: 'Кастомизация',
    description: 'Команда адаптируется под ваши задачи и бизнес-процессы. Индивидуальный подход к каждому клиенту.',
  },
];

const useCases = [
  {
    title: 'Малый бизнес',
    description: 'Автоматизация маркетинга и аналитики без расширения штата. Экономия на найме 2-3 сотрудников.',
    benefits: ['Экономия 200-300 тыс. ₽/мес', 'Быстрый запуск за 1-2 недели', 'Гибкая загрузка'],
  },
  {
    title: 'Средний бизнес',
    description: 'Полная замена отдела маркетинга или аналитики. Профессиональная команда без затрат на управление.',
    benefits: ['Экономия 400-600 тыс. ₽/мес', 'Автономная работа отдела', 'Полная отчетность'],
  },
  {
    title: 'Крупный бизнес',
    description: 'Масштабируемые AI-решения для цифровой трансформации. Комплексная автоматизация процессов.',
    benefits: ['Экономия до 1 млн ₽/мес', 'Интеграция с существующими системами', 'Техническая экспертиза'],
  },
  {
    title: 'IT-компании и стартапы',
    description: 'Гибкий доступ к AI-экспертам для проектов с переменной нагрузкой. Без долгосрочных обязательств.',
    benefits: ['Оплата по факту работы', 'Быстрое масштабирование', 'Проектный подход'],
  },
];

const processSteps = [
  {
    title: 'Консультация и анализ',
    description: 'Анализируем ваши потребности, текущие процессы и определяем оптимальное решение.',
  },
  {
    title: 'Подбор команды',
    description: 'Формируем команду AI-специалистов под ваши задачи с учетом специфики бизнеса.',
  },
  {
    title: 'Внедрение и интеграция',
    description: 'Интегрируем команду в ваши процессы, настраиваем инструменты и системы коммуникации.',
  },
  {
    title: 'Работа и мониторинг',
    description: 'Команда приступает к работе. Регулярные отчеты, KPI, постоянная оптимизация процессов.',
  },
];

export function PublicHomePageAI() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Калькулятор
  const [employeeCount, setEmployeeCount] = useState(2);
  const [avgSalary, setAvgSalary] = useState(150000);
  const [bonusPercent, setBonusPercent] = useState(20);
  const [vacationDays, setVacationDays] = useState(28);
  
  const { data: blogPosts = [], isLoading: blogLoading, error: blogError } = useQuery({
    queryKey: ['public-blog-highlights'],
    queryFn: listPublicBlogHighlights,
  });

  // Релевантные кейсы и отзывы для AI-аутсорсинга
  const aiCasesAndReviews = [
    {
      id: 1,
      company: 'E-commerce стартап',
      industry: 'Интернет-торговля',
      challenge: 'Необходимо было автоматизировать маркетинговые процессы и аналитику без найма дополнительных сотрудников',
      solution: 'Подключили Команду А (2 AI-специалиста) для автоматизации email-маркетинга, анализа конкурентов и генерации контента',
      results: [
        'Экономия 320 000 ₽/мес на ФОТ',
        'Увеличение конверсии на 25%',
        'Сокращение времени на аналитику с 20 до 5 часов в неделю',
      ],
      rating: 5,
      author: 'Алексей М.',
      position: 'CEO',
      text: 'AI-команда полностью заменила отдел маркетинга. За 3 месяца мы увеличили конверсию на 25%, при этом сэкономили более 300 тысяч рублей в месяц. Команда работает автономно, регулярно предоставляет отчеты и всегда готова к новым задачам.',
      verified: true,
    },
    {
      id: 2,
      company: 'Финансовая компания',
      industry: 'Финансы',
      challenge: 'Нужна была поддержка в анализе данных и подготовке финансовых отчетов',
      solution: 'Внедрили Команду Б (2 специалиста + руководитель) для полного управления аналитическим отделом',
      results: [
        'Экономия 450 000 ₽/мес',
        'Сокращение времени подготовки отчетов на 60%',
        'Повышение точности прогнозов на 30%',
      ],
      rating: 5,
      author: 'Мария С.',
      position: 'Финансовый директор',
      text: 'Мы полностью заменили аналитический отдел AI-командой. Результаты превзошли ожидания: отчеты готовятся в 2.5 раза быстрее, точность прогнозов выросла на 30%. Экономия составляет почти полмиллиона рублей в месяц. Рекомендую!',
      verified: true,
    },
    {
      id: 3,
      company: 'IT-компания',
      industry: 'Разработка ПО',
      challenge: 'Требовалась интеграция AI-решений в существующие продукты и автоматизация процессов разработки',
      solution: 'Подключили Команду В (2 AI-специалиста + разработчик + руководитель) для комплексной AI-интеграции',
      results: [
        'Внедрение AI-функций в 3 продукта за 2 месяца',
        'Автоматизация 40% рутинных задач',
        'ROI 180% за первый квартал',
      ],
      rating: 5,
      author: 'Дмитрий К.',
      position: 'CTO',
      text: 'Команда В помогла нам быстро интегрировать AI в наши продукты. За 2 месяца мы внедрили AI-функции в 3 продукта, автоматизировали 40% рутинных задач. ROI составил 180% уже в первом квартале. Отличная команда профессионалов!',
      verified: true,
    },
    {
      id: 4,
      company: 'Маркетинговое агентство',
      industry: 'Маркетинг',
      challenge: 'Нужно было масштабировать производство контента и аналитику для клиентов',
      solution: 'Использовали Команду А для генерации контента, анализа рынка и подготовки презентаций',
      results: [
        'Увеличение объема контента в 3 раза',
        'Экономия 280 000 ₽/мес',
        'Улучшение качества аналитики',
      ],
      rating: 5,
      author: 'Елена В.',
      position: 'Директор по маркетингу',
      text: 'AI-команда позволила нам масштабировать производство контента в 3 раза без найма новых сотрудников. Экономия составляет почти 300 тысяч рублей в месяц. Качество работы на высшем уровне, команда всегда на связи.',
      verified: true,
    },
    {
      id: 5,
      company: 'Производственная компания',
      industry: 'Производство',
      challenge: 'Требовалась оптимизация бизнес-процессов и автоматизация документооборота',
      solution: 'Подключили Команду Б для управления отделом оптимизации процессов',
      results: [
        'Автоматизация 50% документооборота',
        'Сокращение времени обработки документов на 70%',
        'Экономия 380 000 ₽/мес',
      ],
      rating: 5,
      author: 'Игорь П.',
      position: 'Генеральный директор',
      text: 'AI-команда полностью заменила отдел оптимизации. За 4 месяца мы автоматизировали 50% документооборота, сократили время обработки документов на 70%. Экономия почти 400 тысяч рублей в месяц. Очень доволен результатом!',
      verified: true,
    },
    {
      id: 6,
      company: 'Образовательная платформа',
      industry: 'Образование',
      challenge: 'Нужна была поддержка в создании обучающих материалов и аналитике успеваемости',
      solution: 'Внедрили Команду А для генерации контента и аналитики',
      results: [
        'Создание 200+ обучающих материалов за квартал',
        'Улучшение аналитики успеваемости',
        'Экономия 250 000 ₽/мес',
      ],
      rating: 5,
      author: 'Ольга Н.',
      position: 'Руководитель образовательных программ',
      text: 'AI-команда помогла нам создать более 200 обучающих материалов за квартал. Аналитика успеваемости стала намного детальнее и полезнее. Экономия составляет 250 тысяч рублей в месяц. Отличное решение для образовательных проектов!',
      verified: true,
    },
  ];

  // Отладка: логируем данные блога
  if (blogError) {
    console.error('[PublicHomePageAI] Blog loading error:', blogError);
  }
  if (blogPosts && blogPosts.length > 0) {
    console.log('[PublicHomePageAI] Blog posts loaded:', blogPosts.length);
  }

  // Расчеты для калькулятора
  const monthlySalary = avgSalary * employeeCount;
  const taxes = monthlySalary * 0.3; // ~30% налоги и взносы
  const bonuses = monthlySalary * (bonusPercent / 100);
  const vacationCost = (monthlySalary / 30) * vacationDays;
  const totalMonthlyCost = monthlySalary + taxes + bonuses + (vacationCost / 12);
  
  // Новая формула: аутсорсинг стоит 50-55% от ФОТ, гарантируя минимум 30% экономии
  // Используем прогрессивную шкалу в зависимости от количества сотрудников
  let outsourcingCostBase = totalMonthlyCost * 0.5; // Базовая цена = 50% от ФОТ
  
  // Минимальные цены в зависимости от количества сотрудников (чтобы покрыть наши расходы)
  const minPrices = {
    1: 100000,  // Минимум для 1 сотрудника
    2: 180000,  // Минимум для 2 сотрудников
    3: 270000,  // Минимум для 3 сотрудников
    4: 360000,  // Минимум для 4 сотрудников
    5: 450000,  // Минимум для 5 сотрудников
  };
  
  // Определяем минимальную цену для текущего количества сотрудников
  const minPrice = minPrices[employeeCount as keyof typeof minPrices] || employeeCount * 90000;
  
  // Используем максимум из базовой цены (50% от ФОТ) и минимальной цены
  // Но гарантируем, что цена не превышает 60% от ФОТ для обеспечения минимум 40% экономии
  const maxAllowedCost = totalMonthlyCost * 0.6; // Максимум 60% от ФОТ
  const outsourcingCost = Math.min(
    Math.max(outsourcingCostBase, minPrice),
    maxAllowedCost
  );
  
  const monthlySavings = totalMonthlyCost - outsourcingCost;
  const yearlySavings = monthlySavings * 12;
  const savingsPercent = totalMonthlyCost > 0 
    ? Math.max(30, ((monthlySavings / totalMonthlyCost) * 100)).toFixed(0) // Минимум 30% экономии
    : '0';

  // Определяем выбранный тариф на основе количества сотрудников
  const getSelectedTeamOption = () => {
    if (employeeCount === 1 || employeeCount === 2) return teamOptions[0]; // Команда А
    if (employeeCount === 3) return teamOptions[1]; // Команда Б
    if (employeeCount >= 4) return teamOptions[2]; // Команда В
    return teamOptions[0];
  };

  const selectedTeam = getSelectedTeamOption();
  // Расчет дополнительных часов (если клиент использует больше включенных)
  const avgHoursPerMonth = employeeCount * 160; // Средняя загрузка: 160 часов на сотрудника
  const extraHours = Math.max(0, avgHoursPerMonth - selectedTeam.hoursIncluded);
  const extraHoursCost = extraHours * selectedTeam.extraHourPrice;
  const totalCostWithExtras = outsourcingCost + extraHoursCost;

  const sectionAnimation = (delay: number = 0) => ({
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay },
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#141414',
        color: '#ffffff',
        pt: { xs: 4, md: 8 },
        pb: { xs: 8, md: 12 },
      }}
    >
      <Container maxWidth="lg">
        {/* Hero Section */}
        <MotionBox
          {...sectionAnimation(0)}
          sx={{
            textAlign: 'center',
            mb: { xs: 6, md: 10 },
          }}
        >
          <MotionTypography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '3.5rem', lg: '4.5rem' },
              fontWeight: 800,
              mb: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.2,
            }}
          >
            Аутсорсинг AI-команды
          </MotionTypography>
          <MotionTypography
            variant="h5"
            sx={{
              fontSize: { xs: '1.1rem', md: '1.5rem' },
              color: 'rgba(255,255,255,0.85)',
              mb: 4,
              maxWidth: 900,
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Усильте вашу команду или полностью замените отделы с помощью профессиональной AI-команды.
            <br />
            <strong style={{ color: '#ffffff' }}>Экономия до 50%</strong> по сравнению с наймом сотрудников.
            <br />
            <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>
              Гибкое масштабирование • Прозрачность работы • Гарантия результата
            </span>
          </MotionTypography>
          <Button
            variant="contained"
            size="large"
            startIcon={<Calculate />}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
            onClick={() => {
              const calculator = document.getElementById('calculator-section');
              if (calculator) {
                calculator.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
            Рассчитать выгоду
          </Button>
        </MotionBox>

        {/* Calculator Section */}
        <MotionBox {...sectionAnimation(0.1)} id="calculator-section" sx={{ mb: { xs: 8, md: 12 } }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 4,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Calculate sx={{ fontSize: 40, color: '#667eea' }} />
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#ffffff !important' }}>
                Калькулятор выгоды
              </Typography>
            </Box>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#ffffff !important' }}>
                    Количество сотрудников
                  </Typography>
                  <Slider
                    value={employeeCount}
                    onChange={(_, value) => setEmployeeCount(value as number)}
                    min={1}
                    max={10}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                    sx={{
                      color: '#667eea',
                      '& .MuiSlider-thumb': {
                        '&:hover': {
                          boxShadow: '0 0 0 8px rgba(102, 126, 234, 0.16)',
                        },
                      },
                    }}
                  />
                  <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.7)' }}>
                    {employeeCount} {employeeCount === 1 ? 'сотрудник' : employeeCount < 5 ? 'сотрудника' : 'сотрудников'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#ffffff !important' }}>
                    Средняя зарплата (₽/мес)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={avgSalary}
                    onChange={(e) => setAvgSalary(Number(e.target.value))}
                    InputProps={{
                      inputProps: { min: 50000, max: 500000, step: 10000 },
                      sx: { color: '#ffffff' },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea',
                        },
                        '& fieldset': {
                          borderColor: 'rgba(255,255,255,0.2)',
                        },
                      },
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#ffffff !important' }}>
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
                    sx={{ color: '#667eea' }}
                  />
                </Box>

                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#ffffff !important' }}>
                    Дней отпуска в году
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={vacationDays}
                    onChange={(e) => setVacationDays(Number(e.target.value))}
                    InputProps={{
                      inputProps: { min: 20, max: 60, step: 1 },
                      sx: { color: '#ffffff' },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea',
                        },
                        '& fieldset': {
                          borderColor: 'rgba(255,255,255,0.2)',
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
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    height: '100%',
                  }}
                >
                  <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                    Расходы на сотрудников
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1">Зарплата</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {Math.round(monthlySalary).toLocaleString('ru-RU')} ₽
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1">Налоги и взносы (~30%)</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {Math.round(taxes).toLocaleString('ru-RU')} ₽
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1">Премии</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {Math.round(bonuses).toLocaleString('ru-RU')} ₽
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body1">Отпускные (в месяц)</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {Math.round(vacationCost / 12).toLocaleString('ru-RU')} ₽
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                      <Typography variant="h6" fontWeight={700}>
                        Итого в месяц:
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {Math.round(totalMonthlyCost).toLocaleString('ru-RU')} ₽
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                      Стоимость аутсорсинга AI-команды:
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {Math.round(outsourcingCost).toLocaleString('ru-RU')} ₽/мес
                    </Typography>
                    {totalMonthlyCost > 0 && (
                      <Typography variant="caption" sx={{ mt: 1, opacity: 0.8, display: 'block' }}>
                        (примерно {((outsourcingCost / totalMonthlyCost) * 100).toFixed(0)}% от вашего ФОТ)
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TrendingUp sx={{ fontSize: 32 }} />
                      <Typography variant="h5" fontWeight={700}>
                        Ваша выгода
                      </Typography>
                    </Box>
                    <Typography variant="h3" fontWeight={800} sx={{ mb: 1, color: '#ffffff' }}>
                      {monthlySavings > 0 ? `+${Math.round(monthlySavings).toLocaleString('ru-RU')}` : Math.round(monthlySavings).toLocaleString('ru-RU')} ₽/мес
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                      {Math.round(yearlySavings).toLocaleString('ru-RU')} ₽ в год
                    </Typography>
                    <Chip
                      label={`Экономия ${savingsPercent}%`}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.3)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '1rem',
                      }}
                    />
                  </Box>

                  {/* Информация о включенных часах и доплате */}
                  <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.2)' }} />
                  <Box>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.9, textAlign: 'center', fontWeight: 600 }}>
                      Условия использования
                    </Typography>
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>
                        Включено часов в месяц:
                      </Typography>
                      <Typography variant="h6" fontWeight={600} sx={{ color: '#6cff81' }}>
                        {selectedTeam.hoursIncluded} часов
                      </Typography>
                    </Box>
                    {extraHours > 0 ? (
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,193,7,0.15)', borderRadius: 2, border: '1px solid rgba(255,193,7,0.3)' }}>
                        <Typography variant="body2" sx={{ mb: 1, opacity: 0.9, fontWeight: 600 }}>
                          Дополнительные часы (при загрузке {avgHoursPerMonth} ч/мес):
                        </Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: '#ffc107', mb: 0.5 }}>
                          +{extraHours} часов × {Math.round(selectedTeam.extraHourPrice).toLocaleString('ru-RU')} ₽ = {Math.round(extraHoursCost).toLocaleString('ru-RU')} ₽
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                          Итого: {Math.round(totalCostWithExtras).toLocaleString('ru-RU')} ₽/мес
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ p: 2, bgcolor: 'rgba(108,255,129,0.1)', borderRadius: 2, border: '1px solid rgba(108,255,129,0.2)' }}>
                        <Typography variant="body2" sx={{ color: '#6cff81', fontWeight: 600 }}>
                          ✓ Включенных часов достаточно для вашей загрузки
                        </Typography>
                      </Box>
                    )}
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'center', mt: 1 }}>
                      Доплата за час сверх лимита: {Math.round(selectedTeam.extraHourPrice).toLocaleString('ru-RU')} ₽
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </MotionBox>

        {/* Advantages Section */}
        <MotionBox {...sectionAnimation(0.2)} sx={{ mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 6,
              fontWeight: 700,
              color: '#ffffff !important',
            }}
          >
            Почему выбирают аутсорсинг AI-команды?
          </Typography>
          <Grid container spacing={4}>
            {advantages.map((advantage, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <MotionCard
                  sx={{
                    height: '100%',
                    p: 3,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: '#667eea',
                      background: 'rgba(102, 126, 234, 0.1)',
                    },
                  }}
                >
                  <Box sx={{ color: '#667eea', mb: 2 }}>
                    {advantage.icon}
                  </Box>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: '#ffffff' }}>
                    {advantage.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {advantage.description}
                  </Typography>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </MotionBox>

        {/* Use Cases Section */}
        <MotionBox {...sectionAnimation(0.3)} sx={{ mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 2,
              fontWeight: 700,
              color: '#ffffff !important',
            }}
          >
            Кому подходит аутсорсинг AI-команды?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              mb: 6,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 700,
              mx: 'auto',
            }}
          >
            Решения для бизнеса любого масштаба — от малого до крупного
          </Typography>
          <Grid container spacing={4}>
            {useCases.map((useCase, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: '#667eea',
                    },
                  }}
                >
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: '#ffffff' }}>
                    {useCase.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3 }}>
                    {useCase.description}
                  </Typography>
                  <Box>
                    {useCase.benefits.map((benefit, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'start', mb: 1.5 }}>
                        <CheckCircle sx={{ color: '#667eea', mr: 1.5, mt: 0.5, fontSize: 20 }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          {benefit}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </MotionBox>

        {/* Team Options Section */}
        <MotionBox {...sectionAnimation(0.4)} sx={{ mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 2,
              fontWeight: 700,
              color: '#ffffff !important',
            }}
          >
            Выберите команду
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              mb: 6,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 700,
              mx: 'auto',
            }}
          >
            Каждая команда включает определенное количество часов работы в месяц. За дополнительные часы — доплата по прозрачному тарифу.
          </Typography>
          <Grid container spacing={4}>
            {teamOptions.map((team, index) => (
              <Grid item xs={12} md={6} key={team.id}>
                <MotionCard
                  onHoverStart={() => setHoveredCard(team.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                  onClick={() => setExpandedCard(expandedCard === team.id ? null : team.id)}
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    overflow: 'hidden',
                    background: hoveredCard === team.id
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'rgba(255,255,255,0.05)',
                    border: '2px solid',
                    borderColor: hoveredCard === team.id ? 'transparent' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease',
                    boxShadow: hoveredCard === team.id
                      ? '0 20px 40px rgba(102, 126, 234, 0.3)'
                      : '0 4px 6px rgba(0,0,0,0.1)',
                    transform: hoveredCard === team.id ? 'translateY(-8px)' : 'translateY(0)',
                    cursor: 'pointer',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 700,
                          color: hoveredCard === team.id ? '#ffffff' : '#ffffff',
                          mb: 1,
                        }}
                      >
                        {team.name}
                      </Typography>
                      <Chip
                        label={team.savings}
                        sx={{
                          background: hoveredCard === team.id
                            ? 'rgba(255,255,255,0.2)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#ffffff',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        color: hoveredCard === team.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)',
                        mb: 2,
                        fontSize: '1.1rem',
                      }}
                    >
                      {team.description}
                    </Typography>
                    
                    {team.hoursIncluded > 0 && (
                      <Box sx={{ mb: 3, p: 2, bgcolor: hoveredCard === team.id ? 'rgba(108,255,129,0.15)' : 'rgba(108,255,129,0.1)', borderRadius: 2, border: '1px solid rgba(108,255,129,0.2)' }}>
                        <Typography variant="body2" sx={{ color: '#6cff81', fontWeight: 600, mb: 0.5 }}>
                          ✓ Включено: {team.hoursIncluded} часов работы в месяц
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                          Доплата за час сверх лимита: {Math.round(team.extraHourPrice).toLocaleString('ru-RU')} ₽
                        </Typography>
                      </Box>
                    )}
                    
                    {!expandedCard || expandedCard !== team.id ? (
                      <>
                        <Typography
                          variant="h6"
                          sx={{
                            color: hoveredCard === team.id ? '#ffffff' : '#ffffff',
                            fontWeight: 700,
                            mb: 2,
                          }}
                        >
                          Что входит:
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                          {team.specialists.map((spec, idx) => (
                            <Typography
                              key={idx}
                              component="li"
                              sx={{
                                color: hoveredCard === team.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)',
                                mb: 1,
                              }}
                            >
                              {spec}
                            </Typography>
                          ))}
                        </Box>
                        {team.idealFor && team.idealFor.length > 0 && (
                          <Box sx={{ mb: 3 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: hoveredCard === team.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)',
                                mb: 1,
                                fontWeight: 600,
                              }}
                            >
                              Идеально для:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {team.idealFor.map((item, idx) => (
                                <Chip
                                  key={idx}
                                  label={item}
                                  size="small"
                                  sx={{
                                    bgcolor: hoveredCard === team.id
                                      ? 'rgba(255,255,255,0.15)'
                                      : 'rgba(255,255,255,0.1)',
                                    color: '#ffffff',
                                    fontSize: '0.75rem',
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </>
                    ) : (
                      <>
                        <Typography
                          variant="h6"
                          sx={{
                            color: hoveredCard === team.id ? '#ffffff' : '#ffffff',
                            fontWeight: 700,
                            mb: 2,
                          }}
                        >
                          Полный список возможностей:
                        </Typography>
                        <Box component="ul" sx={{ pl: 0, mb: 3, listStyle: 'none' }}>
                          {team.detailedFeatures.map((feature, idx) => (
                            <Box
                              key={idx}
                              component="li"
                              sx={{
                                display: 'flex',
                                alignItems: 'start',
                                mb: 2,
                                p: 2,
                                borderRadius: 2,
                                bgcolor: hoveredCard === team.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                              }}
                            >
                              <CheckCircle
                                sx={{
                                  color: hoveredCard === team.id ? '#ffffff' : '#667eea',
                                  mr: 1.5,
                                  mt: 0.5,
                                  fontSize: 20,
                                }}
                              />
                              <Typography
                                sx={{
                                  color: hoveredCard === team.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)',
                                  fontSize: '0.95rem',
                                  lineHeight: 1.6,
                                }}
                              >
                                {feature}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </>
                    )}
                    
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 3,
                        pt: 3,
                        borderTop: `1px solid ${hoveredCard === team.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="h5"
                          sx={{
                            color: hoveredCard === team.id ? '#ffffff' : '#ffffff',
                            fontWeight: 700,
                            mb: 0.5,
                          }}
                        >
                          {team.price}
                        </Typography>
                        {team.priceRange && team.price !== team.priceRange && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: hoveredCard === team.id ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.6)',
                            }}
                          >
                            {team.priceRange}
                          </Typography>
                        )}
                      </Box>
                      <Button
                        variant={hoveredCard === team.id ? 'outlined' : 'contained'}
                        endIcon={<ArrowForward />}
                        sx={{
                          px: 3,
                          py: 1,
                          borderRadius: 2,
                          background: hoveredCard === team.id
                            ? 'transparent'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: hoveredCard === team.id ? '#ffffff' : '#ffffff',
                          borderColor: hoveredCard === team.id ? '#ffffff' : 'transparent',
                          '&:hover': {
                            background: hoveredCard === team.id
                              ? 'rgba(255,255,255,0.1)'
                              : 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                          },
                        }}
                      >
                        {expandedCard === team.id ? 'Свернуть' : 'Подробнее'}
                      </Button>
                    </Box>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </MotionBox>

        {/* Process Section */}
        <MotionBox {...sectionAnimation(0.5)} sx={{ mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 6,
              fontWeight: 700,
              color: '#ffffff !important',
            }}
          >
            Как мы работаем
          </Typography>
          <Stepper orientation="vertical" sx={{ maxWidth: 800, mx: 'auto' }}>
            {processSteps.map((step, index) => (
              <Step key={index} active={true} completed={false}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '1.2rem',
                    },
                    '& .MuiStepIcon-root': {
                      color: '#667eea',
                      '&.Mui-active': {
                        color: '#667eea',
                      },
                    },
                  }}
                >
                  {step.title}
                </StepLabel>
                <StepContent>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)', mb: 3 }}>
                    {step.description}
                  </Typography>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </MotionBox>

        {/* Guarantees Section */}
        <MotionBox {...sectionAnimation(0.6)} sx={{ mb: { xs: 8, md: 12 } }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
            }}
          >
            <Typography
              variant="h3"
              sx={{
                textAlign: 'center',
                mb: 4,
                fontWeight: 700,
                color: '#ffffff !important',
              }}
            >
              Гарантии и преимущества
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Verified sx={{ color: '#667eea', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#ffffff' }}>
                      Прозрачность работы
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Регулярные отчеты, KPI, полная видимость процессов. Вы всегда знаете, что происходит и какие результаты достигнуты.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Support sx={{ color: '#667eea', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#ffffff' }}>
                      Персональный менеджер
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Выделенный менеджер для координации, единая точка контакта, оперативное решение любых вопросов.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Settings sx={{ color: '#667eea', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#ffffff' }}>
                      Гибкая адаптация
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Команда адаптируется под ваши задачи и бизнес-процессы. Возможность изменения состава и нагрузки.
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Shield sx={{ color: '#667eea', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#ffffff' }}>
                      Без рисков
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Не нужно искать, нанимать и удерживать сотрудников. Мы берем все риски найма, обучения и управления на себя.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Speed sx={{ color: '#667eea', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#ffffff' }}>
                      Быстрый старт
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Команда готова к работе уже через 1-2 недели. Быстрая интеграция в ваши процессы без длительного ожидания.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Analytics sx={{ color: '#667eea', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#ffffff' }}>
                      Гарантия результата
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Конкурентные цены с гарантией результата. Оплата только за фактически выполненную работу.
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </MotionBox>

        {/* Current Services Section */}
        <MotionBox {...sectionAnimation(0.8)} sx={{ mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 6,
              fontWeight: 700,
              color: '#ffffff !important',
            }}
          >
            Также доступны наши услуги
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'rgba(255,255,255,0.05)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    borderColor: '#667eea',
                  },
                }}
                onClick={() => navigate('/catalog')}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#ffffff' }}>
                  Разработка сайтов
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Создание современных веб-приложений
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'rgba(255,255,255,0.05)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    borderColor: '#667eea',
                  },
                }}
                onClick={() => navigate('/catalog')}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#ffffff' }}>
                  SEO и маркетинг
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Продвижение и оптимизация
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'rgba(255,255,255,0.05)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    borderColor: '#667eea',
                  },
                }}
                onClick={() => navigate('/catalog')}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#ffffff' }}>
                  Дизайн и брендинг
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Создание уникального стиля
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </MotionBox>

        {/* Cases and Reviews Section */}
        <MotionBox {...sectionAnimation(0.75)} sx={{ mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 6,
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            Кейсы и отзывы клиентов
          </Typography>
          <Grid container spacing={4}>
            {aiCasesAndReviews.map((caseItem, index) => (
              <Grid item xs={12} md={6} key={caseItem.id}>
                <MotionPaper
                  {...sectionAnimation(0.76 + index * 0.02)}
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
                    },
                  }}
                >
                  {/* Кейс */}
                  <Box sx={{ mb: 3 }}>
                    <Chip
                      label={caseItem.industry}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(102,126,234,0.2)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        mb: 2,
                      }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', mb: 1 }}>
                      {caseItem.company}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'rgba(255,255,255,0.7)',
                        mb: 2,
                        fontStyle: 'italic',
                      }}
                    >
                      Задача: {caseItem.challenge}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        mb: 2,
                      }}
                    >
                      <strong>Решение:</strong> {caseItem.solution}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1, fontWeight: 600 }}>
                        Результаты:
                      </Typography>
                      {caseItem.results.map((result, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'start', mb: 0.5 }}>
                          <CheckCircle sx={{ fontSize: 16, color: '#6cff81', mr: 1, mt: 0.5, flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            {result}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 3 }} />

                  {/* Отзыв */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: '#667eea',
                          width: 56,
                          height: 56,
                          mr: 2,
                          fontSize: '1.5rem',
                          fontWeight: 700,
                        }}
                      >
                        {caseItem.author.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff', mr: 1 }}>
                            {caseItem.author}
                          </Typography>
                          {caseItem.verified && (
                            <VerifiedUser sx={{ fontSize: 20, color: '#667eea', ml: 0.5 }} />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                          {caseItem.position}, {caseItem.company}
                        </Typography>
                        <Rating
                          value={caseItem.rating}
                          readOnly
                          size="small"
                          sx={{
                            '& .MuiRating-iconFilled': {
                              color: '#ffc107',
                            },
                          }}
                        />
                      </Box>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'rgba(255,255,255,0.85)',
                        lineHeight: 1.7,
                        fontStyle: 'italic',
                      }}
                    >
                      "{caseItem.text}"
                    </Typography>
                  </Box>
                </MotionPaper>
              </Grid>
            ))}
          </Grid>
        </MotionBox>

        {/* FAQ Section */}
        <MotionBox {...sectionAnimation(0.8)} sx={{ mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 6,
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            Часто задаваемые вопросы
          </Typography>
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {[
              {
                question: 'Как быстро можно начать работу с AI-командой?',
                answer: 'Обычно мы запускаем проект в течение 3-5 рабочих дней после подписания договора. Это включает в себя подбор команды, настройку инструментов и интеграцию в ваши бизнес-процессы.',
              },
              {
                question: 'Можно ли изменить состав команды в процессе работы?',
                answer: 'Да, состав команды можно гибко изменять в зависимости от текущих задач. Вы можете увеличить или уменьшить количество специалистов, добавить новых экспертов или заменить участников команды.',
              },
              {
                question: 'Как обеспечивается качество работы AI-команды?',
                answer: 'Качество обеспечивается через регулярный мониторинг KPI, еженедельные отчеты, контроль качества на каждом этапе работы и постоянную обратную связь. У каждой команды есть руководитель, который контролирует выполнение задач.',
              },
              {
                question: 'Какие инструменты и технологии использует команда?',
                answer: 'Наша команда работает с современными AI-инструментами: ChatGPT, Claude, Midjourney, Stable Diffusion, а также специализированными решениями для автоматизации, аналитики и разработки. Мы адаптируем инструменты под ваши задачи.',
              },
              {
                question: 'Как рассчитывается стоимость услуг?',
                answer: 'Стоимость зависит от выбранного тарифа и количества специалистов. Базовые тарифы начинаются от 150 000 ₽/мес. Для индивидуальных решений мы рассчитываем стоимость после анализа ваших задач и потребностей.',
              },
              {
                question: 'Что делать, если результат не соответствует ожиданиям?',
                answer: 'Мы гарантируем качество работы и готовы корректировать подход при необходимости. В договоре прописаны четкие KPI и этапы приемки работы. Если результат не соответствует ожиданиям, мы вносим корректировки без дополнительной оплаты.',
              },
              {
                question: 'Нужна ли техническая подготовка для работы с AI-командой?',
                answer: 'Нет, специальная техническая подготовка не требуется. Команда адаптируется под ваш уровень технических знаний и использует понятные инструменты коммуникации. Мы предоставляем обучение и поддержку при необходимости.',
              },
              {
                question: 'Как обеспечивается конфиденциальность данных?',
                answer: 'Мы подписываем NDA с каждым клиентом и соблюдаем строгие правила конфиденциальности. Все данные хранятся в защищенных системах, доступ к которым имеют только уполномоченные специалисты. Мы можем работать с вашими внутренними системами через защищенные каналы.',
              },
            ].map((faq, index) => (
              <MotionAccordion
                key={index}
                {...sectionAnimation(0.81 + index * 0.02)}
                elevation={0}
                sx={{
                  mb: 2,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                  '&:before': {
                    display: 'none',
                  },
                  '&.Mui-expanded': {
                    margin: 0,
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore sx={{ color: '#ffffff' }} />}
                  sx={{
                    py: 2,
                    px: 3,
                    '& .MuiAccordionSummary-content': {
                      margin: 0,
                    },
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff' }}>
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, pb: 3 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255,255,255,0.8)',
                      lineHeight: 1.7,
                    }}
                  >
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </MotionAccordion>
            ))}
          </Box>
        </MotionBox>

        {/* Contact Form Section */}
        <MotionBox {...sectionAnimation(0.9)} id="contact-form">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
            }}
          >
            <Typography
              variant="h3"
              sx={{
                textAlign: 'center',
                mb: 4,
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              Получите консультацию
            </Typography>
            <Typography
              variant="body1"
              sx={{
                textAlign: 'center',
                mb: 4,
                color: 'rgba(255,255,255,0.9)',
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              Оставьте заявку, и мы свяжемся с вами в ближайшее время для обсуждения ваших задач и подбора оптимального решения
            </Typography>
            <Box
              component="form"
              sx={{
                maxWidth: 500,
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
              onSubmit={(e) => {
                e.preventDefault();
                alert('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
              }}
            >
              <TextField
                fullWidth
                placeholder="Ваше имя"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.95)',
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ffffff',
                    },
                  },
                }}
              />
              <TextField
                fullWidth
                type="tel"
                placeholder="Телефон"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.95)',
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ffffff',
                    },
                  },
                }}
              />
              <TextField
                fullWidth
                type="email"
                placeholder="Email"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.95)',
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ffffff',
                    },
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  background: '#ffffff',
                  color: '#667eea',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.9)',
                  },
                }}
              >
                Отправить заявку
              </Button>
            </Box>
          </Paper>
        </MotionBox>
      </Container>

      {/* Blog Section - Full Width */}
      {!blogLoading && blogPosts && blogPosts.length > 0 && (
        <MotionBox 
          {...sectionAnimation(0.7)} 
          sx={{ 
            width: '100%',
            py: { xs: 6, md: 10 },
            backgroundColor: '#141414',
          }}
        >
          <Container maxWidth="lg">
            <Typography
              variant="h3"
              sx={{
                textAlign: 'center',
                mb: 6,
                fontWeight: 700,
                color: '#ffffff !important',
              }}
            >
              Полезные статьи
            </Typography>
          </Container>
          <Box sx={{ width: '100%', overflow: 'hidden' }}>
            <BlogCarousel 
              posts={blogPosts.map((post: any) => ({
                slug: post.slug,
                title: post.title,
                excerpt: post.excerpt || '',
                body: post.body || '',
                publishedAt: post.published_at || post.publishedAt,
                coverImage: post.cover_image_url || post.coverImageUrl || post.coverImage,
              }))} 
            />
          </Box>
        </MotionBox>
      )}
    </Box>
  );
}
