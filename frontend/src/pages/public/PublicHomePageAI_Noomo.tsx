import { Box, Container, Typography, Button, Grid, TextField, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PrivacyConsentCheckbox } from '@/components/privacy/PrivacyConsentCheckbox';
import { MarketingConsentCheckbox } from '@/components/privacy/MarketingConsentCheckbox';
import { useQuery } from '@tanstack/react-query';
import { listPublicBlogHighlights } from '@/services/publicApi';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/ToastProvider';
import { ExpandMore } from '@mui/icons-material';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroTypewriterFloat } from '@/components/home/HeroTypewriterFloat';
import { NoomoFixedStage, SECTION_SCROLL, getSectionProgress } from '@/components/home/NoomoFixedStage';

gsap.registerPlugin(ScrollTrigger);

const SECTION_SERVICES = 3;
const SECTION_TESTIMONIALS = 7;
const SECTION_TARIFFS = 9;

// Данные
const services = [
  'Контент-маркетинг',
  'SEO и аналитика',
  'SMM и креатив',
  'Чат-боты 24/7',
  'Email-рассылки',
  'Автоматизация CRM',
  'Стратегия и планирование',
  'Обучение команды',
];

const industries = [
  'SaaS', 'E-commerce', 'B2B услуги', 'Недвижимость',
  'Производство', 'Образование', 'Финтех', 'Консалтинг',
];

const teamOptions = [
  {
    name: 'AI Junior',
    price: 79000,
    desc: 'Входной уровень для старта с AI',
    features: [
      '1 AI-специалист + автоматизированные шаблоны',
      'Маркетинг, SMM, SEO-контент',
      'Базовая аналитика и отчёты',
      'Генерация текстов и креативов',
      'Email-рассылки и чат-боты',
    ],
    idealFor: 'ИП, фрилансеры, микро-бизнес до 5 человек',
    hoursIncluded: 80,
    extraHourPrice: 2500,
  },
  {
    name: 'AI Pro Team',
    price: 199000,
    desc: 'Полная замена 1–2 отделов',
    features: [
      '2 AI-специалиста + менеджер проектов',
      'Полная автоматизация маркетинга и продаж',
      'Интеграция с CRM и аналитикой',
      'Стратегическое планирование',
      'Обучение вашей команды',
    ],
    idealFor: 'Малый бизнес 5–50 сотрудников, розница, услуги',
    hoursIncluded: 200,
    extraHourPrice: 1800,
  },
  {
    name: 'AI Enterprise',
    price: 399000,
    desc: 'Полноценный AI-отдел для бизнеса',
    features: [
      '3+ AI-специалиста + разработчик + аналитик',
      'Любые сложные задачи и интеграции',
      'Кастомные AI-решения под ваш бизнес',
      'Техподдержка 24/7 и SLA',
      'Выделенный менеджер и отчётность',
    ],
    idealFor: 'Средний и крупный бизнес, корпорации, enterprise',
    hoursIncluded: 400,
    extraHourPrice: 1200,
  },
];

const testimonials = [
  {
    text: 'AI Boost Team полностью заменил нам маркетинговый отдел. За 3 месяца мы увеличили поток лидов в 2.5 раза, сэкономили почти полмиллиона рублей ежемесячно.',
    author: 'Алексей М.',
    role: 'CEO, IT-стартап',
    result: '+247% лидов',
  },
  {
    text: '80% обращений клиентов обрабатываются автоматически. Конверсия выросла на 35%, экономим 180 тысяч в месяц.',
    author: 'Екатерина В.',
    role: 'Владелец, интернет-магазин',
    result: '+35% конверсия',
  },
  {
    text: 'Кастомные аналитические решения. Отчёты в 5 раз быстрее, качество аналитики +40%. Экономия 650 тысяч рублей в месяц.',
    author: 'Дмитрий П.',
    role: 'Партнёр, консалтинг',
    result: '5× скорость',
  },
];

const faqs = [
  { q: 'Чем AI-команда отличается от штатных сотрудников?', a: 'Работает 24/7, не уходит в отпуск, не болеет, не требует офиса. Выполняет задачи быстрее и с меньшим количеством ошибок.' },
  { q: 'Какие задачи решает AI Boost Team?', a: 'Маркетинг, SEO, SMM, аналитика, автоматизация, отчёты, работа с клиентами, стратегии.' },
  { q: 'Гарантия возврата?', a: '14 дней — если не подойдёт, вернём 100% без вопросов.' },
  { q: 'Для кого AI Boost Team?', a: 'Для компаний, которые хотят ускорить разработку, маркетинг или аналитику с помощью AI без найма целой команды специалистов.' },
  { q: 'Какие сроки внедрения?', a: 'Пилот — 2–4 недели. Полное внедрение — от 1 до 3 месяцев в зависимости от объёма.' },
  { q: 'Сколько это стоит?', a: 'От 79 000 ₽/мес за входной уровень. Есть тарифы под разные задачи и бюджеты.' },
  { q: 'Какие риски и как вы их снимаете?', a: 'Мы делаем пилот на ограниченном объёме, тестируем гипотезы, показываем ROI. Работаем по Agile с еженедельными демо.' },
  { q: 'Что нужно от клиента?', a: 'Доступ к данным/системам для интеграции, обратная связь на демо, решение по приоритетам.' },
];

const budgetOptions = [
  { label: '70K–150K ₽/мес', value: '70-150' },
  { label: '150K–300K ₽/мес', value: '150-300' },
  { label: '300K+ ₽/мес', value: '300+' },
];

const directions = [
  {
    title: 'Dev & Product',
    desc: 'AI-код-ассистент, автотесты, ускорение релизов. Интеграция AI в разработку продукта.',
    bullets: ['Автоматизация рутины', 'Code review за минуты', 'Релизы в 2–3× быстрее'],
    icon: 'Dev',
  },
  {
    title: 'Marketing & Content',
    desc: 'AI-контент, сегментация, перформанс. От лендингов до SEO и соцсетей.',
    bullets: ['Контент под каждую аудиторию', 'A/B тесты и оптимизация', 'Масштабирование без роста штата'],
    icon: 'Marketing',
  },
  {
    title: 'Data & Automation',
    desc: 'Аналитика, отчёты, автофлоу. AI делает выводы поверх данных.',
    bullets: ['Отчёты за секунды', 'Дашборды и алерты', 'Интеграции CRM/ERP'],
    icon: 'Data',
  },
];

const aiFeatures = [
  { title: 'AI Code Review', desc: 'Подсветка кода и комментарии от ИИ', tech: 'GPT / Claude / custom LLM' },
  { title: 'AI Content Engine', desc: 'Генератор контента для лендинга и SEO', tech: 'LLM + fine-tuning' },
  { title: 'AI Analytics', desc: 'Дашборд, где AI делает выводы поверх графиков', tech: 'RAG + аналитика' },
  { title: 'AI Sales Assistant', desc: 'Чатбот, который знает всё про продукт', tech: 'Knowledge base + LLM' },
  { title: 'AI Автоматизация', desc: 'Сценарии без кода: триггеры, оркестрация', tech: 'Workflow engines' },
  { title: 'AI-стратегия', desc: 'Аудит процессов и план внедрения AI', tech: 'Методология + экспертиза' },
];

const cases = [
  {
    niche: 'E-commerce',
    task: 'Низкий трафик, ручная обработка заказов',
    solution: 'AI-контент для SEO, чатбот для обработки заявок',
    result: '+180% трафик, −60% время ответа',
  },
  {
    niche: 'B2B-сервис',
    task: 'Долгие циклы продаж, ручные отчёты',
    solution: 'AI-ассистент по продукту, автоотчёты и дашборды',
    result: '+35% конверсия, 5× скорость отчётов',
  },
  {
    niche: 'Консалтинг',
    task: 'Ручная подготовка материалов под клиентов',
    solution: 'AI-генерация персональных материалов из базы знаний',
    result: '−70% время на подготовку, +40% качество',
  },
];

const processSteps = [
  { step: 1, title: 'AI-аудит', desc: 'Код, маркетинг, данные — находим точки роста' },
  { step: 2, title: 'Дизайн архитектуры', desc: 'Проектируем AI-решение под ваши процессы' },
  { step: 3, title: 'Внедрение', desc: 'Интеграции, пилот, обучение команды' },
  { step: 4, title: 'Наблюдение и оптимизация', desc: 'Метрики, итерации, масштабирование' },
];

export default function PublicHomePageAI_Noomo() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const mainRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);
  const [agreeToMarketing, setAgreeToMarketing] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [formSent, setFormSent] = useState(false);

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['blogHighlights'],
    queryFn: listPublicBlogHighlights,
  });

  const servicesWrapRef = useRef<HTMLDivElement>(null);
  const servicesTrackRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const tariffsRef = useRef<HTMLDivElement>(null);
  const tariffCardsRef = useRef<HTMLDivElement>(null);

  // GSAP Hero: sub + CTA (title через HeroWordReveal)
  useEffect(() => {
    if (!heroRef.current) return;
    const q = gsap.utils.selector(heroRef);
    const ctx = gsap.context(() => {
      gsap.from(q('.noomo-hero-sub'), {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 1.2,
      });
      gsap.from(q('.noomo-hero-cta'), {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'back.out(1.4)',
        delay: 1.5,
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // Scroll-driven анимации (совместимы с NoomoFixedStage, content scroll от spacer)
  useEffect(() => {
    const wrap = servicesWrapRef.current;
    const track = servicesTrackRef.current;
    const tariffs = tariffsRef.current;
    const tariffCards = tariffCardsRef.current;
    const testimonials = testimonialsRef.current;
    const spacer = mainRef.current?.querySelector<HTMLElement>('[data-noomo-spacer]');
    if (!wrap || !track || !tariffs || !tariffCards || !testimonials || !spacer) return;

    const cards = tariffCards.querySelectorAll<HTMLElement>('[data-tariff-card]');
    const inners = tariffCards.querySelectorAll<HTMLElement>('[data-tariff-inner]');
    const testimonialCards = testimonials.querySelectorAll<HTMLElement>('[data-testimonial-card]');

    const getContentScrollY = () => {
      const rect = spacer.getBoundingClientRect();
      return Math.max(0, -rect.top);
    };

    // Дыхание тарифов (не зависит от скролла)
    inners.forEach((el, i) => {
      gsap.to(el, {
        y: 5,
        duration: 2.2 + i * 0.15,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    const update = () => {
      const scrollY = getContentScrollY();
      const vh = window.innerHeight;

      // Services: scrub по прогрессу секции 3
      const sProgress = getSectionProgress(scrollY, vh, SECTION_SERVICES);
      const maxX = Math.max(0, track.scrollWidth - wrap.offsetWidth);
      gsap.set(track, { x: -maxX * sProgress });

      // Tariffs: дуга + движение влево по прогрессу секции 9
      const tProgress = getSectionProgress(scrollY, vh, SECTION_TARIFFS);
      const p = Math.min(tProgress * 1.2, 1);
      cards.forEach((el, i) => {
        const startX = 350 + i * 80;
        const arcY = Math.sin(p * Math.PI) * -80;
        const scrollLeft = -p * 120;
        const opacityProgress = Math.max(0, (tProgress - 0.15 - i * 0.08) / 0.4);
        gsap.set(el, {
          x: scrollLeft + (1 - p) * startX,
          y: (1 - p) * arcY,
          opacity: Math.min(1, opacityProgress),
        });
      });

      // Testimonials: fade-in по прогрессу секции 7
      const tmProgress = getSectionProgress(scrollY, vh, SECTION_TESTIMONIALS);
      testimonialCards.forEach((el, i) => {
        const stagger = i * 0.12;
        const localProgress = Math.max(0, (tmProgress - 0.15 - stagger) / 0.5);
        const o = Math.min(1, localProgress);
        const y = 50 * (1 - o);
        gsap.set(el, { opacity: o, y });
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      gsap.killTweensOf(inners);
    };
  }, []);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://prime-coder.ru/ai-team-v2';

  return (
    <>
      <SeoMetaTags
        title="AI Boost Team — AI-команда маркетинга под ключ"
        description="AI-специалисты под ключ: контент, аналитика, автоматизация. От 79 000 ₽/мес. Пилот бесплатно."
        url={currentUrl}
      />

      <Box
        component="main"
        ref={mainRef}
        data-noomo-main
        sx={{
          background: 'linear-gradient(180deg, #0a0a10 0%, #0d0d14 50%, #0a0a10 100%)',
          color: '#e8e8e8',
          minHeight: '100vh',
          fontFamily: '"Raleway", sans-serif',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <NoomoFixedStage
          sections={[
            /* Hero */
            <Box
              key="hero"
              ref={heroRef}
            sx={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
              <HeroTypewriterFloat sx={{ mb: 3 }} />

              <Typography
                className="noomo-hero-sub"
                sx={{
                  fontSize: { xs: '1.1rem', md: '1.35rem' },
                  color: 'rgba(232,232,232,0.85)',
                  maxWidth: 680,
                  lineHeight: 1.75,
                  mb: 5,
                }}
              >
                От контент-маркетинга до полной автоматизации отделов — мы позволяем истории вашего бизнеса диктовать формат. Работаем с компаниями, которые ценят результат, детали и понимают, что отличная цифровая работа требует времени, доверия и сотрудничества.
              </Typography>

              <Box className="noomo-hero-cta" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Button
                  href="#contact"
                  variant="contained"
                  sx={{
                    bgcolor: '#ffbb00',
                    color: '#0a0a12',
                    fontWeight: 700,
                    px: 4,
                    py: 1.75,
                    fontSize: '1rem',
                    borderRadius: 0,
                    letterSpacing: '0.05em',
                    boxShadow: '0 0 24px rgba(255,187,0,0.4)',
                    '&:hover': {
                      bgcolor: '#e5a800',
                      color: '#0a0a12',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 0 32px rgba(255,187,0,0.5)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Обсудить проект
                </Button>
                <Button
                  href="#calculator"
                  variant="outlined"
                  sx={{
                    borderWidth: 2,
                    borderColor: 'rgba(255,187,0,0.5)',
                    color: '#ffbb00',
                    fontWeight: 600,
                    px: 4,
                    py: 1.75,
                    fontSize: '1rem',
                    borderRadius: 0,
                    letterSpacing: '0.05em',
                    '&:hover': {
                      borderWidth: 2,
                      borderColor: '#ffbb00',
                      color: '#e5a800',
                      bgcolor: 'rgba(255,187,0,0.08)',
                      boxShadow: '0 0 20px rgba(255,187,0,0.2)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Рассчитать экономию
                </Button>
              </Box>
            </Container>
          </Box>,

            /* Что такое AI Boost Team */
            <Box key="what" sx={{ py: { xs: 12, md: 16 }, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Container maxWidth="lg">
              <Grid container spacing={6} alignItems="center">
                <Grid item xs={12} md={7}>
                  <Typography
                    component="h2"
                    data-noomo-fly-child
                    data-fly-child-variant="fade-left"
                    sx={{
                      fontSize: { xs: 'clamp(1.5rem, 4vw, 2.4rem)', md: '2.4rem' },
                      fontWeight: 700,
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                      mb: 3,
                      color: '#f0f0f0',
                    }}
                  >
                    Что такое AI Boost Team
                  </Typography>
                  <Typography
                    data-noomo-fly-child
                    data-fly-child-variant="fade-up"
                    sx={{
                      fontSize: '1.05rem',
                      color: 'rgba(232,232,232,0.85)',
                      lineHeight: 1.75,
                      mb: 3,
                    }}
                  >
                    AI Boost Team — это элитный спецотряд, который ускоряет разработку, маркетинг и аналитику с помощью AI. Мы объединяем React/Node.js с GPT, Claude и кастомными LLM, чтобы дать вам скорость и ROI без роста штата.
                  </Typography>
                  <Box data-noomo-fly-child data-fly-child-variant="fade-up" component="ul" sx={{ m: 0, pl: 2.5, color: 'rgba(232,232,232,0.85)' }}>
                    {['React/Node.js + AI в одном стеке', 'Скорость внедрения — недели, не месяцы', 'ROI с первых недель пилота', 'Опыт в 50+ проектах'].map((item, i) => (
                      <Box component="li" key={i} sx={{ mb: 1, fontSize: '1rem', lineHeight: 1.6 }}>
                        {item}
                      </Box>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Box
                    data-noomo-fly-child
                    data-fly-child-variant="scale"
                    sx={{
                      minHeight: 200,
                      border: '1px solid rgba(255,187,0,0.2)',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0,0,0,0.3)',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                      transform: 'perspective(800px) rotateY(-6deg) rotateX(4deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <Typography sx={{ color: 'rgba(255,187,0,0.4)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
                      AI · Dev · Data
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Container>
          </Box>,

            /* 3 направления */
            <Box key="directions" sx={{ py: { xs: 12, md: 16 }, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Container maxWidth="lg">
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-right"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: 'rgba(232,232,232,0.5)',
                  mb: 6,
                  textTransform: 'uppercase',
                }}
              >
                3 направления AI Boost Team
              </Typography>
              <Grid container spacing={4}>
                {directions.map((d, i) => (
                  <Grid item xs={12} md={4} key={d.title}>
                    <Box
                      data-noomo-fly-child
                      sx={{
                        p: 4,
                        height: '100%',
                        bgcolor: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,187,0,0.15)',
                        borderRadius: 1,
                        transition: 'all 0.4s ease',
                        transform: `perspective(900px) rotateY(${i === 0 ? -12 : i === 1 ? 0 : 12}deg) rotateX(5deg)`,
                        transformStyle: 'preserve-3d',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                        '&:hover': {
                          borderColor: 'rgba(255,187,0,0.5)',
                          boxShadow: '0 0 30px rgba(255,187,0,0.15), 0 16px 48px rgba(0,0,0,0.5)',
                          transform: `perspective(900px) rotateY(${i === 0 ? -6 : i === 1 ? 0 : 6}deg) rotateX(2deg) translateY(-6px)`,
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: '0.75rem', color: '#ffbb00', fontWeight: 600, mb: 1, letterSpacing: '0.1em' }}>
                        {d.icon}
                      </Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', mb: 2, color: '#f0f0f0' }}>
                        {d.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.95rem', color: 'rgba(232,232,232,0.75)', lineHeight: 1.6, mb: 2 }}>
                        {d.desc}
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2, color: 'rgba(232,232,232,0.8)', fontSize: '0.9rem' }}>
                        {d.bullets.map((b, j) => (
                          <Box component="li" key={j} sx={{ mb: 0.5 }}>{b}</Box>
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>,

            /* Services */
            <Box
              key="services"
              ref={servicesWrapRef}
            sx={{
              py: { xs: 10, md: 14 },
              borderTop: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              minHeight: { xs: 200, md: 220 },
            }}
          >
            <Typography
              component="h2"
              data-noomo-fly-child
              data-fly-child-variant="fade-left"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'rgba(232,232,232,0.5)',
                mb: 4,
                textTransform: 'uppercase',
                px: { xs: 2, md: 3 },
              }}
            >
              Услуги
            </Typography>
            <Box
              ref={servicesTrackRef}
              data-noomo-fly-child
              data-fly-child-variant="fade-up"
              sx={{
                display: 'flex',
                flexWrap: 'nowrap',
                gap: { xs: 1.5, md: 2 },
                px: { xs: 2, md: 3 },
                width: 'max-content',
                willChange: 'transform',
              }}
            >
                {services.concat(services).map((s, i) => (
                <Box
                  key={`${s}-${i}`}
                  component="span"
                  sx={{
                    flexShrink: 0,
                    fontSize: { xs: '0.95rem', md: '1.1rem' },
                    color: '#e8e8e8',
                    px: 2.5,
                    py: 1.25,
                    border: '1px solid rgba(255,187,0,0.2)',
                    bgcolor: 'rgba(0,0,0,0.3)',
                    cursor: 'default',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap',
                    transform: 'perspective(600px) rotateX(3deg)',
                    '&:hover': {
                      borderColor: 'rgba(255,187,0,0.6)',
                      color: '#ffbb00',
                      boxShadow: '0 0 20px rgba(255,187,0,0.2)',
                      transform: 'perspective(600px) rotateX(0deg) translateY(-2px)',
                    },
                  }}
                >
                  {s}
                </Box>
              ))}
            </Box>
          </Box>,

            /* Industries */
            <Box key="industries" sx={{ py: { xs: 10, md: 14 } }}>
            <Container maxWidth="lg">
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-right"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: 'rgba(232,232,232,0.5)',
                  mb: 5,
                  textTransform: 'uppercase',
                }}
              >
                С кем работаем
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: { xs: 2.5, md: 4 },
                  alignItems: 'center',
                }}
              >
                {industries.map((ind) => (
                  <Typography
                    key={ind}
                    data-noomo-fly-child
                    sx={{
                      fontSize: { xs: '1rem', md: '1.25rem' },
                      color: 'rgba(232,232,232,0.8)',
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {ind}
                  </Typography>
                ))}
              </Box>
            </Container>
          </Box>,

            /* AI-инструменты */
            <Box key="ai-tools" sx={{ py: { xs: 12, md: 16 }, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Container maxWidth="lg">
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-up"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: 'rgba(232,232,232,0.5)',
                  mb: 2,
                  textTransform: 'uppercase',
                }}
              >
                AI-инструменты
              </Typography>
              <Typography
                data-noomo-fly-child
                sx={{
                  fontSize: { xs: '1.5rem', md: '1.8rem' },
                  fontWeight: 700,
                  mb: 6,
                  color: '#f0f0f0',
                  maxWidth: 560,
                }}
              >
                Что вы получаете
              </Typography>
              <Grid container spacing={3}>
                {aiFeatures.map((f, i) => (
                  <Grid item xs={12} sm={6} md={4} key={f.title}>
                    <Box
                      data-noomo-fly-child
                      sx={{
                        p: 3,
                        height: '100%',
                        minHeight: 180,
                        bgcolor: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,187,0,0.15)',
                        borderRadius: 1,
                        transform: `perspective(800px) rotateY(${i === 0 ? -8 : i === 1 ? 0 : 8}deg) rotateX(4deg)`,
                        transformStyle: 'preserve-3d',
                        boxShadow: '0 10px 36px rgba(0,0,0,0.4)',
                        transition: 'all 0.4s ease',
                        '&:hover': {
                          borderColor: 'rgba(255,187,0,0.4)',
                          boxShadow: '0 0 24px rgba(255,187,0,0.1), 0 14px 44px rgba(0,0,0,0.5)',
                          transform: `perspective(800px) rotateY(${i === 0 ? -4 : i === 1 ? 0 : 4}deg) rotateX(2deg) translateY(-4px)`,
                        },
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 1, color: '#f0f0f0' }}>
                        {f.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.9rem', color: 'rgba(232,232,232,0.75)', lineHeight: 1.5, mb: 2 }}>
                        {f.desc}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,187,0,0.7)', fontWeight: 500 }}>
                        {f.tech}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>,

            /* Team */
            <Box
              key="team"
              sx={{
              py: { xs: 12, md: 18 },
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Container maxWidth="lg">
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-up"
                sx={{
                  fontSize: { xs: 'clamp(2rem, 5vw, 3.2rem)', md: '3.2rem' },
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  mb: 6,
                  color: '#f0f0f0',
                  textAlign: 'center',
                  maxWidth: 720,
                  mx: 'auto',
                }}
              >
                Отличная работа невозможна без команды.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: { xs: 3, md: 4 },
                  mt: 6,
                }}
              >
                {[
                  { title: 'Команда основателей', desc: 'Сильные отношения с клиентами в центре подхода' },
                  { title: 'Понимание задач', desc: 'Уделяем время вашим уникальным целям' },
                  { title: 'Результат', desc: 'Решения, которые помогают достигать целей' },
                ].map((card, i) => (
                  <Box
                    key={card.title}
                    data-noomo-fly-child
                      sx={{
                        width: { xs: '100%', sm: 280, md: 300 },
                        p: 4,
                        bgcolor: 'rgba(0,0,0,0.35)',
                        borderRadius: 1,
                        border: '1px solid rgba(255,187,0,0.15)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                        transform: `perspective(900px) rotateY(${i === 0 ? -10 : i === 1 ? 0 : 10}deg) rotateX(5deg)`,
                        transformStyle: 'preserve-3d',
                      transition: 'all 0.4s ease',
                      '&:hover': {
                        transform: 'perspective(800px) rotateY(0deg) rotateX(0deg) translateY(-6px)',
                        borderColor: 'rgba(255,187,0,0.5)',
                        boxShadow: '0 0 30px rgba(255,187,0,0.15)',
                      },
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', mb: 1.5, color: '#f0f0f0' }}>
                      {card.title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.95rem', color: 'rgba(232,232,232,0.7)', lineHeight: 1.6 }}>
                      {card.desc}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Container>
          </Box>,

            /* Testimonials */
            <Box key="testimonials" sx={{ py: { xs: 12, md: 16 } }}>
            <Container maxWidth="lg">
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-up"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: 'rgba(232,232,232,0.5)',
                  mb: 6,
                  textTransform: 'uppercase',
                }}
              >
                Отзывы
              </Typography>
              <Grid container spacing={4} ref={testimonialsRef}>
                {testimonials.map((t, i) => (
                  <Grid item xs={12} md={4} key={i}>
                    <Box data-testimonial-card sx={{ height: '100%' }}>
                      <Box
                        sx={{
                          p: 4,
                          height: '100%',
                          minHeight: 280,
                          bgcolor: 'rgba(0,0,0,0.35)',
                          border: '1px solid rgba(255,187,0,0.15)',
                          borderRadius: 1,
                          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                          display: 'flex',
                          flexDirection: 'column',
                          transform: `perspective(900px) rotateY(${i === 0 ? -10 : i === 1 ? 0 : 10}deg) rotateX(4deg)`,
                          transformStyle: 'preserve-3d',
                          transition: 'all 0.4s ease',
                          '&:hover': {
                            transform: 'perspective(1000px) rotateY(0deg) translateY(-8px)',
                            borderColor: 'rgba(255,187,0,0.4)',
                            boxShadow: '0 0 30px rgba(255,187,0,0.12)',
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '1.05rem',
                            lineHeight: 1.75,
                            color: 'rgba(232,232,232,0.9)',
                            mb: 3,
                            flex: 1,
                          }}
                        >
                          "{t.text}"
                        </Typography>
                        <Box sx={{ mt: 'auto' }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#f0f0f0' }}>
                            {t.author}
                          </Typography>
                          <Typography sx={{ fontSize: '0.85rem', color: 'rgba(232,232,232,0.6)' }}>
                            {t.role}
                          </Typography>
                          <Typography
                            sx={{
                              mt: 1,
                              fontSize: '0.8rem',
                              color: '#ffbb00',
                              fontWeight: 600,
                            }}
                          >
                            {t.result}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>,

            /* Кейсы */
            <Box key="cases" sx={{ py: { xs: 12, md: 16 }, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Container maxWidth="lg">
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-up"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: 'rgba(232,232,232,0.5)',
                  mb: 2,
                  textTransform: 'uppercase',
                }}
              >
                Кейсы
              </Typography>
              <Typography
                data-noomo-fly-child
                sx={{
                  fontSize: { xs: '1.5rem', md: '1.8rem' },
                  fontWeight: 700,
                  mb: 6,
                  color: '#f0f0f0',
                }}
              >
                Задача → Решение → Результат
              </Typography>
              <Grid container spacing={4}>
                {cases.map((c, i) => (
                  <Grid item xs={12} md={4} key={c.niche}>
                    <Box
                      data-noomo-fly-child
                      sx={{
                        p: 4,
                        height: '100%',
                        bgcolor: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,187,0,0.15)',
                        borderRadius: 1,
                        borderLeft: '4px solid rgba(255,187,0,0.5)',
                        transform: `perspective(800px) rotateY(${i === 0 ? -8 : i === 1 ? 0 : 8}deg) rotateX(4deg)`,
                        transformStyle: 'preserve-3d',
                        boxShadow: '0 10px 36px rgba(0,0,0,0.4)',
                        transition: 'all 0.4s ease',
                        '&:hover': {
                          borderColor: 'rgba(255,187,0,0.35)',
                          boxShadow: '0 0 24px rgba(255,187,0,0.08), 0 14px 44px rgba(0,0,0,0.5)',
                          transform: `perspective(800px) rotateY(${i === 0 ? -4 : i === 1 ? 0 : 4}deg) rotateX(2deg) translateY(-4px)`,
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: '0.75rem', color: '#ffbb00', fontWeight: 600, mb: 2, letterSpacing: '0.1em' }}>
                        {c.niche}
                      </Typography>
                      <Typography sx={{ fontSize: '0.85rem', color: 'rgba(232,232,232,0.7)', mb: 1.5, fontWeight: 600 }}>
                        Было:
                      </Typography>
                      <Typography sx={{ fontSize: '0.9rem', color: 'rgba(232,232,232,0.8)', mb: 2, lineHeight: 1.5 }}>
                        {c.task}
                      </Typography>
                      <Typography sx={{ fontSize: '0.85rem', color: 'rgba(232,232,232,0.7)', mb: 1.5, fontWeight: 600 }}>
                        Сделали:
                      </Typography>
                      <Typography sx={{ fontSize: '0.9rem', color: 'rgba(232,232,232,0.8)', mb: 2, lineHeight: 1.5 }}>
                        {c.solution}
                      </Typography>
                      <Typography sx={{ fontSize: '0.95rem', color: '#ffbb00', fontWeight: 700 }}>
                        {c.result}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>,

            /* Tariffs */
            <Box
              key="tariffs"
              ref={tariffsRef}
            id="calculator"
            sx={{
              py: { xs: 14, md: 20 },
              minHeight: '120vh',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              overflow: 'visible',
            }}
          >
            <Container maxWidth="lg" sx={{ position: 'relative' }}>
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-up"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: 'rgba(232,232,232,0.5)',
                  mb: 2,
                  textTransform: 'uppercase',
                }}
              >
                Тарифы
              </Typography>
              <Typography
                data-noomo-fly-child
                sx={{
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                  fontWeight: 700,
                  mb: 6,
                  color: '#f0f0f0',
                }}
              >
                От 79 000 ₽/мес
              </Typography>
              <Grid ref={tariffCardsRef} container spacing={3}>
                {teamOptions.map((opt, i) => (
                  <Grid item xs={12} md={4} key={i}>
                    <Box
                      data-tariff-card
                      sx={{
                        willChange: 'transform',
                        perspective: 1000,
                        '& [data-tariff-inner]': { willChange: 'transform' },
                      }}
                    >
                      <Box
                        data-tariff-inner
                        sx={{
                          p: 4,
                          minHeight: 420,
                          display: 'flex',
                          flexDirection: 'column',
                          bgcolor: 'rgba(0,0,0,0.5)',
                          border: i === 1 ? '2px solid rgba(255,187,0,0.5)' : '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 1,
                          boxShadow: i === 1 ? '0 0 32px rgba(255,187,0,0.2)' : '0 8px 32px rgba(0,0,0,0.4)',
                          transform: `perspective(800px) rotateY(${i === 0 ? -10 : i === 1 ? 0 : 10}deg) rotateX(6deg)`,
                          transformStyle: 'preserve-3d',
                          transition: 'border-color 0.3s, box-shadow 0.3s',
                          '&:hover': {
                            borderColor: i === 1 ? 'rgba(255,187,0,0.8)' : 'rgba(255,187,0,0.4)',
                            boxShadow: i === 1 ? '0 0 40px rgba(255,187,0,0.25)' : '0 0 24px rgba(255,187,0,0.12)',
                          },
                        }}
                      >
                        <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', mb: 0.5, color: '#f0f0f0' }}>
                          {opt.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.95rem', color: 'rgba(232,232,232,0.8)', mb: 2 }}>
                          {opt.desc}
                        </Typography>
                        <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, mb: 2, color: '#ffbb00' }}>
                          {opt.price.toLocaleString('ru-RU')} ₽
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: 'rgba(232,232,232,0.6)', mb: 2 }}>
                          {opt.hoursIncluded} ч/мес · доп. час {opt.extraHourPrice.toLocaleString('ru-RU')} ₽
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2, mb: 2, color: 'rgba(232,232,232,0.85)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                          {opt.features.map((f, j) => (
                            <Box component="li" key={j} sx={{ mb: 0.5 }}>{f}</Box>
                          ))}
                        </Box>
                        <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,187,0,0.8)', mb: 2, fontStyle: 'italic' }}>
                          {opt.idealFor}
                        </Typography>
                        <Button
                          href="#contact"
                          variant={i === 1 ? 'contained' : 'outlined'}
                          fullWidth
                          sx={{
                            bgcolor: i === 1 ? '#ffbb00' : 'transparent',
                            color: i === 1 ? '#0a0a12' : '#ffbb00',
                            borderColor: i === 1 ? 'transparent' : 'rgba(255,187,0,0.5)',
                            borderRadius: 0,
                            fontWeight: 600,
                            py: 1.5,
                            mt: 'auto',
                            '&:hover': {
                              bgcolor: i === 1 ? '#e5a800' : 'rgba(255,187,0,0.1)',
                              borderColor: 'rgba(255,187,0,0.7)',
                              color: i === 1 ? '#0a0a12' : '#e5a800',
                              boxShadow: i === 1 ? '0 0 24px rgba(255,187,0,0.4)' : '0 0 16px rgba(255,187,0,0.15)',
                              transform: 'translateY(-2px)',
                            },
                            transition: 'all 0.3s ease',
                          }}
                        >
                          Выбрать
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>,

            /* Процесс */
            <Box key="process" sx={{ py: { xs: 12, md: 16 }, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Container maxWidth="lg">
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-up"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: 'rgba(232,232,232,0.5)',
                  mb: 2,
                  textTransform: 'uppercase',
                }}
              >
                Процесс
              </Typography>
              <Typography
                data-noomo-fly-child
                sx={{
                  fontSize: { xs: '1.5rem', md: '1.8rem' },
                  fontWeight: 700,
                  mb: 6,
                  color: '#f0f0f0',
                }}
              >
                Как мы работаем
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: { xs: 3, md: 2 },
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                {processSteps.map((p, i) => (
                  <Box
                    key={p.step}
                    data-noomo-fly-child
                    sx={{
                      flex: 1,
                      p: 3,
                      position: 'relative',
                      bgcolor: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,187,0,0.15)',
                      borderRadius: 1,
                      transform: `perspective(800px) rotateY(${i === 0 ? -6 : i === 3 ? 6 : 0}deg) rotateX(4deg)`,
                      transformStyle: 'preserve-3d',
                      boxShadow: '0 10px 36px rgba(0,0,0,0.4)',
                      transition: 'all 0.4s ease',
                      '&:hover': {
                        borderColor: 'rgba(255,187,0,0.4)',
                        boxShadow: '0 0 20px rgba(255,187,0,0.1), 0 14px 44px rgba(0,0,0,0.5)',
                        transform: `perspective(800px) rotateY(${i === 0 ? -3 : i === 3 ? 3 : 0}deg) rotateX(2deg) translateY(-4px)`,
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: 'rgba(255,187,0,0.5)', mb: 1 }}>
                      {p.step}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 1, color: '#f0f0f0' }}>
                      {p.title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.9rem', color: 'rgba(232,232,232,0.75)', lineHeight: 1.5 }}>
                      {p.desc}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Container>
          </Box>,

            /* FAQ */
            <Box key="faq" sx={{ py: { xs: 10, md: 12 } }}>
            <Container maxWidth="md">
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-up"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: 'rgba(232,232,232,0.5)',
                  mb: 4,
                  textTransform: 'uppercase',
                }}
              >
                FAQ
              </Typography>
              {faqs.map((faq, i) => (
                <Accordion
                  key={i}
                  data-noomo-fly-child
                  sx={{
                    bgcolor: 'transparent',
                    '&:before': { display: 'none' },
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    '&.Mui-expanded': { margin: 0 },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'rgba(232,232,232,0.6)' }} />}>
                    <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: '#f0f0f0' }}>
                      {faq.q}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography sx={{ color: 'rgba(232,232,232,0.75)', fontSize: '0.95rem' }}>
                      {faq.a}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Container>
          </Box>,

            /* CTA */
            <Box
              key="cta"
              id="contact"
            sx={{
              py: { xs: 12, md: 16 },
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Container maxWidth="md">
              <Typography
                component="h2"
                data-noomo-fly-child
                data-fly-child-variant="fade-up"
                sx={{
                  fontSize: { xs: 'clamp(1.35rem, 3.5vw, 1.85rem)', md: '1.9rem' },
                  fontWeight: 700,
                  textAlign: 'center',
                  mb: 4,
                  lineHeight: 1.35,
                  color: '#f0f0f0',
                  letterSpacing: '-0.02em',
                }}
              >
                МЫ ЗДЕСЬ НЕ РАДИ СЕБЯ — МЫ ЗДЕСЬ РАДИ ВАС, ВАШЕЙ КОМПАНИИ, ВАШИХ ЦЕЛЕЙ.
              </Typography>
              <Typography
                data-noomo-fly-child
                sx={{
                  textAlign: 'center',
                  color: 'rgba(232,232,232,0.8)',
                  mb: 5,
                  fontSize: '1.05rem',
                }}
              >
                С нами это возможно. Будем рады обсудить ваш проект.
              </Typography>

              {formSent ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: '#ffbb00' }}>
                    Спасибо
                  </Typography>
                  <Typography sx={{ mt: 1, color: 'rgba(232,232,232,0.8)' }}>
                    Мы свяжемся с вами в течение 2 часов.
                  </Typography>
                </Box>
              ) : (
                <Box component="form">
                  <Typography
                    data-noomo-fly-child
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      letterSpacing: '0.2em',
                      color: 'rgba(232,232,232,0.5)',
                      mb: 2,
                      textTransform: 'uppercase',
                    }}
                  >
                    Бюджет проекта (₽/мес)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 4 }}>
                    {budgetOptions.map((b) => (
                      <Button
                        key={b.value}
                        onClick={() => setSelectedBudget(b.value)}
                        sx={{
                          border: '2px solid',
                          borderColor: selectedBudget === b.value ? 'rgba(255,187,0,0.6)' : 'rgba(255,255,255,0.2)',
                          color: selectedBudget === b.value ? '#ffbb00' : 'rgba(232,232,232,0.9)',
                          bgcolor: selectedBudget === b.value ? 'rgba(255,187,0,0.1)' : 'transparent',
                          borderRadius: 0,
                          px: 3,
                          py: 1.5,
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: 'rgba(255,187,0,0.5)',
                            color: '#ffbb00',
                            bgcolor: 'rgba(255,187,0,0.06)',
                          },
                        }}
                      >
                        {b.label}
                      </Button>
                    ))}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        placeholder="Ваше имя"
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(0,0,0,0.3)',
                            borderRadius: 0,
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#ffbb00', borderWidth: 2 },
                            '& input': { color: '#f0f0f0' },
                            '& input::placeholder': { color: 'rgba(232,232,232,0.5)', opacity: 1 },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        placeholder="Телефон"
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(0,0,0,0.3)',
                            borderRadius: 0,
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#ffbb00', borderWidth: 2 },
                            '& input': { color: '#f0f0f0' },
                            '& input::placeholder': { color: 'rgba(232,232,232,0.5)', opacity: 1 },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        placeholder="Расскажите о проекте"
                        multiline
                        rows={3}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(0,0,0,0.3)',
                            borderRadius: 0,
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#ffbb00', borderWidth: 2 },
                            '& textarea': { color: '#f0f0f0' },
                            '& textarea::placeholder': { color: 'rgba(232,232,232,0.5)', opacity: 1 },
                          },
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
                      <MarketingConsentCheckbox checked={agreeToMarketing} onChange={setAgreeToMarketing} />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => {
                          if (!agreeToPrivacy) {
                            showToast('Необходимо согласие на обработку данных', 'error');
                            return;
                          }
                          setFormSent(true);
                          showToast('Спасибо! Свяжемся в течение 2 часов.', 'success');
                        }}
                        sx={{
                          bgcolor: '#ffbb00',
                          color: '#0a0a12',
                          fontWeight: 700,
                          py: 2,
                          borderRadius: 0,
                          fontSize: '1rem',
                          letterSpacing: '0.05em',
                          boxShadow: '0 0 24px rgba(255,187,0,0.3)',
                          '&:hover': {
                            bgcolor: '#e5a800',
                            color: '#0a0a12',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 0 32px rgba(255,187,0,0.4)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Отправить
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Container>
          </Box>,

            /* Blog */
            ...(Array.isArray(blogPosts) && blogPosts.length > 0
              ? [
                  <Box
                    key="blog"
              sx={{
                py: { xs: 10, md: 12 },
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Container maxWidth="lg">
                <Typography
                  data-noomo-fly-child
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.25em',
                    color: 'rgba(232,232,232,0.5)',
                    mb: 5,
                    textTransform: 'uppercase',
                  }}
                >
                  Полезные статьи
                </Typography>
                <Grid container spacing={4}>
                  {blogPosts.slice(0, 3).map((post: any, i: number) => (
                    <Grid item xs={12} md={4} key={post?.id || i}>
                      <Box
                        data-noomo-fly-child
                        onClick={() => navigate(`/blog/${post.slug}`)}
                        sx={{
                          cursor: 'pointer',
                          border: '1px solid rgba(255,187,0,0.15)',
                          bgcolor: 'rgba(0,0,0,0.35)',
                          borderRadius: 1,
                          overflow: 'hidden',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: 'rgba(255,187,0,0.4)',
                            boxShadow: '0 0 24px rgba(255,187,0,0.1)',
                          },
                        }}
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
                        <Box sx={{ p: 3 }}>
                          <Typography sx={{ fontWeight: 600, mb: 1, color: '#f0f0f0' }}>{post.title}</Typography>
                          <Typography sx={{ fontSize: '0.9rem', color: 'rgba(232,232,232,0.7)', mb: 2 }}>
                            {post.excerpt}
                          </Typography>
                          <Typography sx={{ fontSize: '0.85rem', color: '#ffbb00', fontWeight: 600 }}>
                            Читать →
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Container>
            </Box>,
                ]
              : []),
          ]}
        />
      </Box>
    </>
  );
}
