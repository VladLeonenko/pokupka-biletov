import { styled } from '@mui/material/styles';
import { Box, Typography, Container, Grid, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HandshakeIcon from '@mui/icons-material/Handshake';

const Section = styled(Box)(({ theme }) => ({
  padding: '80px 0',
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)'
    : 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 20% 50%, ${theme.palette.mode === 'dark' ? 'rgba(255, 187, 0, 0.05)' : 'rgba(255, 187, 0, 0.08)'} 0%, transparent 50%)`,
    pointerEvents: 'none',
  },
}));

const StatsBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  gap: '60px',
  marginBottom: '60px',
  flexWrap: 'wrap',
  [theme.breakpoints.down('md')]: {
    gap: '30px',
  },
}));

const StatItem = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  '& .number': {
    fontSize: '48px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
    [theme.breakpoints.down('md')]: {
      fontSize: '36px',
    },
  },
  '& .label': {
    fontSize: '16px',
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
}));

const AdvantageCard = styled(Paper)(({ theme }) => ({
  padding: '32px',
  height: '100%',
  borderRadius: '16px',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.8) 0%, rgba(20, 20, 20, 0.9) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(245, 245, 245, 0.8) 100%)',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'default',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(255, 187, 0, 0.15)'
      : '0 12px 40px rgba(0, 0, 0, 0.12)',
    borderColor: '#ffbb00',
  },
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  width: '64px',
  height: '64px',
  borderRadius: '16px',
  background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '20px',
  transition: 'transform 0.3s ease',
  '& svg': {
    fontSize: '32px',
    color: '#fff',
  },
  '.advantage-card:hover &': {
    transform: 'rotate(10deg) scale(1.1)',
  },
}));

interface Advantage {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const advantages: Advantage[] = [
  {
    icon: <CheckCircleIcon />,
    title: 'Проверенное качество',
    description: 'Сертифицированные специалисты с опытом 5+ лет. Все проекты проходят строгий контроль качества.',
  },
  {
    icon: <SpeedIcon />,
    title: 'Быстрая разработка',
    description: 'Среднее время реализации: 2-4 недели. Используем современные методологии Agile и DevOps.',
  },
  {
    icon: <HandshakeIcon />,
    title: 'Прозрачное сотрудничество',
    description: 'Полная отчетность на каждом этапе. Регулярные встречи и демонстрации промежуточных результатов.',
  },
  {
    icon: <TrendingUpIcon />,
    title: 'Рост вашего бизнеса',
    description: 'Наши решения увеличивают конверсию в среднем на 150%. Подтверждено данными клиентов.',
  },
  {
    icon: <SecurityIcon />,
    title: 'Безопасность данных',
    description: 'SSL-шифрование, защита от DDoS-атак, регулярное резервное копирование. Соответствие GDPR.',
  },
  {
    icon: <SupportAgentIcon />,
    title: 'Постоянная поддержка',
    description: 'Техподдержка 24/7, бесплатные обновления первые 3 месяца. Всегда на связи.',
  },
];

export function AdvantagesModern() {
  return (
    <Section>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '32px', md: '48px' },
              fontWeight: 700,
              mb: 2,
              background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Почему выбирают нас
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              maxWidth: '700px',
              mx: 'auto',
              fontSize: { xs: '16px', md: '18px' },
            }}
          >
            Мы создаем решения, которые помогают бизнесу расти и развиваться
          </Typography>
        </Box>

        {/* Stats */}
        <StatsBox>
          <StatItem>
            <div className="number">100+</div>
            <div className="label">Завершенных проектов</div>
          </StatItem>
          <StatItem>
            <div className="number">15+</div>
            <div className="label">Специалистов</div>
          </StatItem>
          <StatItem>
            <div className="number">5</div>
            <div className="label">Лет опыта</div>
          </StatItem>
        </StatsBox>

        {/* Advantages Grid */}
        <Grid container spacing={3}>
          {advantages.map((advantage, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <AdvantageCard className="advantage-card" elevation={0}>
                <IconWrapper>{advantage.icon}</IconWrapper>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    fontSize: { xs: '20px', md: '22px' },
                  }}
                >
                  {advantage.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.7,
                    fontSize: '15px',
                  }}
                >
                  {advantage.description}
                </Typography>
              </AdvantageCard>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
