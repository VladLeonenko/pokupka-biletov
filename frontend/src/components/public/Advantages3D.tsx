import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Container, Grid, Card, CardContent, useTheme } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { Verified, Speed, Handshake, TrendingUp, Security, Support } from '@mui/icons-material';

// Анимации
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotateX(0deg); }
  50% { transform: translateY(-20px) rotateX(5deg); }
`;

const rotate3d = keyframes`
  0% { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
  50% { transform: perspective(1000px) rotateY(180deg) rotateX(10deg); }
  100% { transform: perspective(1000px) rotateY(360deg) rotateX(0deg); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(255, 187, 0, 0.3); }
  50% { box-shadow: 0 0 40px rgba(255, 187, 0, 0.6); }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Стилизованные компоненты
const AdvantagesSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(10, 0),
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(180deg, #141414 0%, #1a1a1a 100%)'
    : 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 50%, rgba(255, 187, 0, 0.05) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
}));

const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'delay',
})<{ delay: number }>(({ theme, delay }) => ({
  height: '100%',
  background: theme.palette.mode === 'dark'
    ? 'rgba(29, 29, 29, 0.8)'
    : 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 187, 0, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: theme.spacing(2),
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  animation: `${slideIn} 0.8s ease-out ${delay}s both`,
  transformStyle: 'preserve-3d',
  perspective: '1000px',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(255, 187, 0, 0.05) 0%, transparent 100%)',
    opacity: 0,
    transition: 'opacity 0.4s',
  },
  '&:hover': {
    transform: 'translateY(-10px) scale(1.02)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 20px 60px rgba(255, 187, 0, 0.3)'
      : '0 20px 60px rgba(0, 0, 0, 0.15)',
    borderColor: '#ffbb00',
    '&::before': {
      opacity: 1,
    },
    '& .icon-wrapper': {
      animation: `${rotate3d} 3s ease-in-out infinite`,
      background: 'linear-gradient(135deg, #ffbb00 0%, #ffd700 100%)',
    },
  },
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  width: 80,
  height: 80,
  borderRadius: '50%',
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(255, 187, 0, 0.2) 0%, rgba(255, 187, 0, 0.1) 100%)'
    : 'linear-gradient(135deg, rgba(255, 187, 0, 0.15) 0%, rgba(255, 187, 0, 0.05) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  marginBottom: theme.spacing(3),
  transition: 'all 0.4s',
  animation: `${float} 3s ease-in-out infinite`,
  transformStyle: 'preserve-3d',
  '& svg': {
    fontSize: 40,
    color: '#ffbb00',
    filter: 'drop-shadow(0 4px 8px rgba(255, 187, 0, 0.3))',
  },
}));

const StatsBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  gap: theme.spacing(6),
  marginTop: theme.spacing(8),
  marginBottom: theme.spacing(6),
  flexWrap: 'wrap',
  [theme.breakpoints.down('md')]: {
    gap: theme.spacing(4),
  },
}));

const StatItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'delay',
})<{ delay: number }>(({ theme, delay }) => ({
  textAlign: 'center',
  animation: `${slideIn} 0.8s ease-out ${delay}s both, ${glow} 2s ease-in-out infinite`,
  '& .stat-number': {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #ffbb00 0%, #ffd700 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: 1.2,
    [theme.breakpoints.down('sm')]: {
      fontSize: '2.5rem',
    },
  },
  '& .stat-label': {
    fontSize: '1rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
    fontWeight: 500,
  },
}));

interface Advantage {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const advantages: Advantage[] = [
  {
    icon: <Verified />,
    title: 'Проверенное качество',
    description: 'Более 100 успешных проектов с гарантией качества. Используем современные технологии и лучшие практики разработки.',
  },
  {
    icon: <Speed />,
    title: 'Быстрая разработка',
    description: 'Agile-методология и опытная команда позволяют запускать проекты в сжатые сроки без потери качества.',
  },
  {
    icon: <Handshake />,
    title: 'Прозрачное сотрудничество',
    description: 'Полная прозрачность на всех этапах: от планирования до запуска. Еженедельные отчеты и доступ к рабочим процессам.',
  },
  {
    icon: <TrendingUp />,
    title: 'Рост бизнеса',
    description: 'Фокус на конверсии и ROI. Каждое решение направлено на увеличение вашей прибыли и привлечение клиентов.',
  },
  {
    icon: <Security />,
    title: 'Безопасность данных',
    description: 'Современные протоколы защиты, регулярные аудиты безопасности и соответствие международным стандартам.',
  },
  {
    icon: <Support />,
    title: 'Постоянная поддержка',
    description: 'Техническая поддержка 24/7, регулярные обновления и оптимизация. Всегда на связи с вашим бизнесом.',
  },
];

const stats = [
  { number: '100+', label: 'Реализованных проектов' },
  { number: '15+', label: 'Опытных специалистов' },
  { number: '5+', label: 'Лет на рынке' },
  { number: '98%', label: 'Довольных клиентов' },
];

export function Advantages3D() {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <AdvantagesSection ref={sectionRef}>
      <Container maxWidth="lg">
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h2"
            sx={{
              fontFamily: 'Play, sans-serif',
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '3rem' },
              mb: 2,
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #ffffff 0%, #ffbb00 100%)'
                : 'linear-gradient(135deg, #141414 0%, #ffbb00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Почему выбирают нас
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{
              maxWidth: 700,
              margin: '0 auto',
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            Мы создаем не просто сайты — мы строим цифровые решения, которые работают на результат
          </Typography>
        </Box>

        <StatsBox>
          {stats.map((stat, index) => (
            <StatItem key={index} delay={0.2 + index * 0.1}>
              <Typography className="stat-number">{stat.number}</Typography>
              <Typography className="stat-label">{stat.label}</Typography>
            </StatItem>
          ))}
        </StatsBox>

        <Grid container spacing={4}>
          {advantages.map((advantage, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <StyledCard delay={0.6 + index * 0.1}>
                <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <IconWrapper className="icon-wrapper">
                    {advantage.icon}
                  </IconWrapper>
                  <Typography
                    variant="h5"
                    component="h3"
                    gutterBottom
                    sx={{
                      fontFamily: 'Play, sans-serif',
                      fontWeight: 600,
                      textAlign: 'center',
                      mb: 2,
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#141414',
                    }}
                  >
                    {advantage.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      textAlign: 'center',
                      lineHeight: 1.7,
                      color: theme.palette.text.secondary,
                      flex: 1,
                    }}
                  >
                    {advantage.description}
                  </Typography>
                </CardContent>
              </StyledCard>
            </Grid>
          ))}
        </Grid>

        <Box textAlign="center" mt={8}>
          <Typography
            variant="h6"
            sx={{
              color: '#ffbb00',
              fontWeight: 600,
              mb: 2,
            }}
          >
            Готовы начать свой проект?
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Свяжитесь с нами и получите бесплатную консультацию
          </Typography>
        </Box>
      </Container>
    </AdvantagesSection>
  );
}
