import { useMemo, useState, useEffect } from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent, Chip, useTheme, LinearProgress } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { motion, useAnimation } from 'framer-motion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { AdvantagesModernInjector } from './AdvantagesModernInjector';
import { BlogCarouselInjector } from './BlogCarouselInjector';

const YELLOW = '#ffbb00';
const DARK_BG = '#141414';

// Анимации
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// Стилизованные компоненты
const HeroSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  background: `linear-gradient(135deg, ${DARK_BG} 0%, #1a1a1a 50%, ${DARK_BG} 100%)`,
  backgroundSize: '200% 200%',
  animation: `${gradientShift} 15s ease infinite`,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 30% 50%, rgba(255, 187, 0, 0.1) 0%, transparent 50%)`,
    pointerEvents: 'none',
  },
}));

const HeroContent = styled(Container)({
  position: 'relative',
  zIndex: 1,
  paddingTop: '120px',
  paddingBottom: '80px',
});

const HeroTitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
  fontWeight: 800,
  lineHeight: 1.2,
  marginBottom: '24px',
  background: `linear-gradient(135deg, #ffffff 0%, ${YELLOW} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  animation: `${fadeInUp} 0.8s ease-out`,
}));

const HeroSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
  color: 'rgba(255, 255, 255, 0.8)',
  marginBottom: '40px',
  maxWidth: '700px',
  animation: `${fadeInUp} 0.8s ease-out 0.2s both`,
}));

const CTAButton = styled(Button)(({ theme }) => ({
  padding: '16px 48px',
  fontSize: '1.1rem',
  fontWeight: 600,
  backgroundColor: YELLOW,
  color: DARK_BG,
  borderRadius: '50px',
  textTransform: 'none',
  boxShadow: `0 8px 24px rgba(255, 187, 0, 0.4)`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  animation: `${fadeInUp} 0.8s ease-out 0.4s both`,
  '&:hover': {
    backgroundColor: '#ffcc33',
    transform: 'translateY(-2px)',
    boxShadow: `0 12px 32px rgba(255, 187, 0, 0.6)`,
  },
}));

const GamificationSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: '100px 0',
  background: `linear-gradient(180deg, ${DARK_BG} 0%, #1a1a1a 100%)`,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 70% 30%, rgba(255, 187, 0, 0.08) 0%, transparent 50%)`,
    pointerEvents: 'none',
  },
}));

const StatsCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '24px',
  padding: '32px',
  height: '100%',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: `linear-gradient(90deg, ${YELLOW} 0%, transparent 100%)`,
    transform: 'scaleX(0)',
    transition: 'transform 0.3s ease',
  },
  '&:hover': {
    transform: 'translateY(-8px)',
    borderColor: YELLOW,
    boxShadow: `0 16px 48px rgba(255, 187, 0, 0.2)`,
    '&::before': {
      transform: 'scaleX(1)',
    },
  },
}));

const StatNumber = styled(Typography)(({ theme }) => ({
  fontSize: '3.5rem',
  fontWeight: 800,
  background: `linear-gradient(135deg, ${YELLOW} 0%, #ffcc33 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  marginBottom: '8px',
  animation: `${pulse} 2s ease-in-out infinite`,
}));

const AchievementBadge = styled(Chip)(({ theme }) => ({
  backgroundColor: `${YELLOW}20`,
  color: YELLOW,
  border: `1px solid ${YELLOW}40`,
  fontWeight: 600,
  padding: '8px 16px',
  borderRadius: '20px',
  '& .MuiChip-icon': {
    color: YELLOW,
  },
}));

interface ModernHomePageProps {
  pageData?: any;
  highlights?: any[];
  carousels?: any[];
}

export function ModernHomePage({ pageData, highlights = [], carousels = [] }: ModernHomePageProps) {
  const theme = useTheme();

  // Извлекаем данные из HTML если нужно
  const extractContent = useMemo(() => {
    if (!pageData?.html) return null;
    
    // Простой парсинг для демонстрации
    const html = pageData.html;
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Добро пожаловать';
    
    return { title };
  }, [pageData]);

  const stats = [
    { number: '500+', label: 'Довольных клиентов', icon: <StarIcon /> },
    { number: '1000+', label: 'Реализованных проектов', icon: <TrendingUpIcon /> },
    { number: '15+', label: 'Лет опыта', icon: <EmojiEventsIcon /> },
    { number: '98%', label: 'Успешных проектов', icon: <CheckCircleIcon /> },
  ];

  return (
    <Box sx={{ bgcolor: DARK_BG, color: '#ffffff', minHeight: '100vh' }}>
      {/* Hero Section */}
      <HeroSection>
        <HeroContent>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <HeroTitle variant="h1">
              {extractContent?.title || 'Создаем цифровые решения будущего'}
            </HeroTitle>
            <HeroSubtitle>
              Мы помогаем бизнесу расти с помощью современных технологий, 
              инновационных решений и экспертного подхода к каждому проекту
            </HeroSubtitle>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <CTAButton variant="contained" size="large">
                Начать проект
              </CTAButton>
              <CTAButton 
                variant="outlined" 
                size="large"
                sx={{
                  borderColor: YELLOW,
                  color: YELLOW,
                  '&:hover': {
                    borderColor: '#ffcc33',
                    backgroundColor: `${YELLOW}10`,
                  },
                }}
              >
                Узнать больше
              </CTAButton>
            </Box>
          </motion.div>
        </HeroContent>
      </HeroSection>

      {/* Gamification Section - Второй блок */}
      <GamificationSection>
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <AchievementBadge 
                icon={<EmojiEventsIcon />}
                label="Наши достижения"
                sx={{ mb: 3 }}
              />
              <Typography 
                variant="h2" 
                sx={{ 
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 800,
                  mb: 2,
                  background: `linear-gradient(135deg, #ffffff 0%, ${YELLOW} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Результаты, которые говорят сами за себя
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  maxWidth: '600px',
                  mx: 'auto',
                }}
              >
                Каждый проект — это шаг к новым высотам. Отслеживайте прогресс и достигайте целей вместе с нами.
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {stats.map((stat, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <StatsCard>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: YELLOW }}>
                        {stat.icon}
                      </Box>
                      <StatNumber>{stat.number}</StatNumber>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontWeight: 500,
                        }}
                      >
                        {stat.label}
                      </Typography>
                    </StatsCard>
                  </motion.div>
                </Grid>
              ))}
            </Grid>

            {/* Прогресс-бар достижений с геймификацией */}
            <Box sx={{ mt: 8, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 4 }}>
                <LocalFireDepartmentIcon sx={{ color: YELLOW, fontSize: 32 }} />
                <Typography variant="h5" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 700 }}>
                  Прогресс месяца
                </Typography>
                <LocalFireDepartmentIcon sx={{ color: YELLOW, fontSize: 32 }} />
              </Box>
              <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
                {[
                  { label: 'Новые проекты', value: 85, color: YELLOW, icon: <RocketLaunchIcon />, level: 'Эксперт' },
                  { label: 'Довольные клиенты', value: 92, color: '#4CAF50', icon: <StarIcon />, level: 'Мастер' },
                  { label: 'Успешные запуски', value: 78, color: '#2196F3', icon: <CheckCircleIcon />, level: 'Профи' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.15 }}
                  >
                    <Card
                      sx={{
                        mb: 3,
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '20px',
                        padding: '24px',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: item.color,
                          transform: 'translateX(8px)',
                          boxShadow: `0 8px 24px ${item.color}40`,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ color: item.color, display: 'flex', alignItems: 'center' }}>
                            {item.icon}
                          </Box>
                          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                            {item.label}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Chip
                            label={item.level}
                            size="small"
                            sx={{
                              backgroundColor: `${item.color}20`,
                              color: item.color,
                              border: `1px solid ${item.color}40`,
                              fontWeight: 600,
                            }}
                          />
                          <Typography variant="h6" sx={{ color: item.color, fontWeight: 700, minWidth: '60px', textAlign: 'right' }}>
                            {item.value}%
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          height: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.value}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: index * 0.2, ease: 'easeOut' }}
                          style={{
                            height: '100%',
                            background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}CC 100%)`,
                            borderRadius: '6px',
                            boxShadow: `0 0 12px ${item.color}60`,
                          }}
                        />
                        {/* Эффект свечения */}
                        <motion.div
                          initial={{ x: '-100%' }}
                          whileInView={{ x: '200%' }}
                          viewport={{ once: true }}
                          transition={{ 
                            duration: 1.5, 
                            delay: index * 0.2 + 0.5,
                            repeat: Infinity,
                            repeatDelay: 3,
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '30%',
                            height: '100%',
                            background: `linear-gradient(90deg, transparent 0%, ${item.color}80 50%, transparent 100%)`,
                            borderRadius: '6px',
                          }}
                        />
                      </Box>
                      {/* XP очки */}
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          XP: {item.value * 10}
                        </Typography>
                        {item.value >= 90 && (
                          <Chip
                            icon={<EmojiEventsIcon />}
                            label="Достижение разблокировано!"
                            size="small"
                            sx={{
                              backgroundColor: `${YELLOW}20`,
                              color: YELLOW,
                              border: `1px solid ${YELLOW}40`,
                              fontWeight: 600,
                              animation: `${pulse} 2s ease-in-out infinite`,
                            }}
                          />
                        )}
                      </Box>
                    </Card>
                  </motion.div>
                ))}
              </Box>

              {/* Общий уровень */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Card
                  sx={{
                    mt: 6,
                    maxWidth: '600px',
                    mx: 'auto',
                    background: `linear-gradient(135deg, ${YELLOW}20 0%, ${YELLOW}10 100%)`,
                    backdropFilter: 'blur(20px)',
                    border: `2px solid ${YELLOW}40`,
                    borderRadius: '24px',
                    padding: '32px',
                    textAlign: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                    <EmojiEventsIcon sx={{ color: YELLOW, fontSize: 40 }} />
                    <Typography variant="h4" sx={{ color: YELLOW, fontWeight: 800 }}>
                      Уровень: Легенда
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
                    Вы достигли выдающихся результатов! Продолжайте в том же духе.
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon key={star} sx={{ color: YELLOW, fontSize: 32 }} />
                    ))}
                  </Box>
                </Card>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </GamificationSection>

      {/* Services Section */}
      <Box sx={{ py: 10, bgcolor: DARK_BG }}>
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography 
                variant="h2" 
                sx={{ 
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 800,
                  mb: 2,
                  background: `linear-gradient(135deg, #ffffff 0%, ${YELLOW} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Наши услуги
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  maxWidth: '600px',
                  mx: 'auto',
                }}
              >
                Комплексные решения для вашего бизнеса
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {[
                { title: 'Веб-разработка', description: 'Современные сайты и веб-приложения', icon: '💻' },
                { title: 'Мобильные приложения', description: 'iOS и Android приложения', icon: '📱' },
                { title: 'Дизайн', description: 'UI/UX дизайн и брендинг', icon: '🎨' },
                { title: 'Маркетинг', description: 'SEO, SMM и контент-маркетинг', icon: '📈' },
                { title: 'Консалтинг', description: 'Стратегическое планирование', icon: '💡' },
                { title: 'Поддержка', description: 'Техническая поддержка 24/7', icon: '🛠️' },
              ].map((service, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <StatsCard>
                      <Typography variant="h3" sx={{ mb: 2, fontSize: '3rem' }}>
                        {service.icon}
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: '#ffffff',
                          fontWeight: 700,
                          mb: 1,
                        }}
                      >
                        {service.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        {service.description}
                      </Typography>
                    </StatsCard>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Advantages Section */}
      <Box sx={{ py: 10, bgcolor: '#1a1a1a' }}>
        <AdvantagesModernInjector />
      </Box>

      {/* Blog Section */}
      <Box sx={{ py: 10, bgcolor: DARK_BG }}>
        <BlogCarouselInjector posts={highlights} />
      </Box>

      {/* CTA Section */}
      <Box 
        sx={{ 
          py: 12, 
          background: `linear-gradient(135deg, ${YELLOW} 0%, #ffcc33 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Box sx={{ textAlign: 'center', maxWidth: '800px', mx: 'auto' }}>
              <Typography 
                variant="h2" 
                sx={{ 
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 800,
                  mb: 3,
                  color: DARK_BG,
                }}
              >
                Готовы начать проект?
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'rgba(20, 20, 20, 0.8)',
                  mb: 4,
                }}
              >
                Свяжитесь с нами сегодня и получите бесплатную консультацию
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <CTAButton 
                  variant="contained" 
                  size="large"
                  sx={{
                    backgroundColor: DARK_BG,
                    color: YELLOW,
                    '&:hover': {
                      backgroundColor: '#1a1a1a',
                    },
                  }}
                >
                  Связаться с нами
                </CTAButton>
                <CTAButton 
                  variant="outlined" 
                  size="large"
                  sx={{
                    borderColor: DARK_BG,
                    color: DARK_BG,
                    '&:hover': {
                      borderColor: DARK_BG,
                      backgroundColor: `${DARK_BG}10`,
                    },
                  }}
                >
                  Посмотреть портфолио
                </CTAButton>
              </Box>
            </Box>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
}

