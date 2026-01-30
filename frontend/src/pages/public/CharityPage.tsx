import { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Button,
  Chip,
  Avatar,
  LinearProgress,
  Stack,
  Paper
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PeopleIcon from '@mui/icons-material/People';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import PetsIcon from '@mui/icons-material/Pets';
import ElderlyIcon from '@mui/icons-material/Elderly';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';

// Анимации
const fadeIn = keyframes`
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

const Section = styled(Box)(({ theme }) => ({
  paddingTop: '140px',
  paddingBottom: '80px',
  minHeight: '100vh',
}));

const HeroSection = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: '60px',
  animation: `${fadeIn} 1s ease-out`,
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-100px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '200px',
    height: '200px',
    background: 'radial-gradient(circle, rgba(255,187,0,0.2) 0%, transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(40px)',
    zIndex: 0,
  },
}));

const CharityCard = styled(Card)<{ selected?: boolean }>(({ theme, selected }) => ({
  height: '100%',
  border: selected 
    ? `2px solid #ffbb00` 
    : `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
  background: theme.palette.mode === 'dark'
    ? selected ? 'rgba(255,187,0,0.1)' : 'rgba(30,30,30,0.8)'
    : selected ? 'rgba(255,187,0,0.05)' : '#ffffff',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  position: 'relative',
  overflow: 'visible',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(255,187,0,0.2)'
      : '0 12px 40px rgba(0,0,0,0.15)',
    borderColor: '#ffbb00',
  },
  '&::after': selected ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at top right, rgba(255,187,0,0.1) 0%, transparent 50%)',
    pointerEvents: 'none',
  } : {},
}));

const StatsBox = styled(Paper)(({ theme }) => ({
  padding: '32px',
  textAlign: 'center',
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(255,187,0,0.1) 0%, rgba(255,187,0,0.05) 100%)'
    : 'linear-gradient(135deg, rgba(255,187,0,0.1) 0%, rgba(255,187,0,0.05) 100%)',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,187,0,0.2)' : 'rgba(255,187,0,0.3)'}`,
  borderRadius: '16px',
  animation: `${fadeIn} 1s ease-out 0.3s both`,
}));

const IconWrapper = styled(Box)<{ selected?: boolean }>(({ selected }) => ({
  width: '64px',
  height: '64px',
  borderRadius: '16px',
  background: selected 
    ? 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)'
    : 'linear-gradient(135deg, rgba(255,187,0,0.2) 0%, rgba(255,187,0,0.1) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '16px',
  transition: 'all 0.3s ease',
  animation: selected ? `${pulse} 2s ease-in-out infinite` : 'none',
  '& svg': {
    fontSize: '32px',
    color: selected ? '#fff' : '#ffbb00',
  },
}));

interface CharityFund {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  website: string;
  impact: string;
  color: string;
}

const charityFunds: CharityFund[] = [
  {
    id: 'podari-zhizn',
    name: 'Подари жизнь',
    description: 'Помощь детям с онкологическими и гематологическими заболеваниями',
    category: 'Дети',
    icon: <ChildCareIcon />,
    website: 'podari-zhizn.ru',
    impact: 'Более 30 000 детей получили помощь',
    color: '#ff6b6b',
  },
  {
    id: 'rusfond',
    name: 'Русфонд',
    description: 'Помощь тяжелобольным детям и взрослым в лечении и реабилитации',
    category: 'Медицина',
    icon: <FavoriteIcon />,
    website: 'rusfond.ru',
    impact: '50 000+ людей получили помощь',
    color: '#e74c3c',
  },
  {
    id: 'starost-v-radost',
    name: 'Старость в радость',
    description: 'Помощь одиноким пожилым людям в домах престарелых',
    category: 'Пожилые',
    icon: <ElderlyIcon />,
    website: 'starikam.org',
    impact: 'Помощь 200+ домам престарелых',
    color: '#3498db',
  },
  {
    id: 'khabenskiy',
    name: 'Фонд Хабенского',
    description: 'Помощь детям с онкологическими заболеваниями головного мозга',
    category: 'Дети',
    icon: <ChildCareIcon />,
    website: 'bfkh.ru',
    impact: '10 000+ детей получили помощь',
    color: '#9b59b6',
  },
  {
    id: 'avz',
    name: 'АВЗ - Зоозащита',
    description: 'Помощь бездомным животным, приюты, пристройство',
    category: 'Животные',
    icon: <PetsIcon />,
    website: 'avz.su',
    impact: '100 000+ животных спасено',
    color: '#f39c12',
  },
  {
    id: 'donate-stream',
    name: 'Donate.Stream',
    description: 'Помощь тяжелобольным детям, сбор средств на лечение',
    category: 'Дети',
    icon: <VolunteerActivismIcon />,
    website: 'donate-stream.ru',
    impact: 'Собрано 500+ млн рублей',
    color: '#1abc9c',
  },
  {
    id: 'adresmilk',
    name: 'Адреса милосердия',
    description: 'Помощь пожилым людям на дому, социальная поддержка',
    category: 'Пожилые',
    icon: <ElderlyIcon />,
    website: 'adresmilk.ru',
    impact: 'Помощь 5000+ пожилым людям',
    color: '#34495e',
  },
  {
    id: 'zhizn-kak-chudo',
    name: 'Жизнь как чудо',
    description: 'Помощь детям с тяжелыми заболеваниями, сбор на лечение',
    category: 'Дети',
    icon: <ChildCareIcon />,
    website: 'miracle.ru',
    impact: '3000+ детей получили лечение',
    color: '#e67e22',
  },
  {
    id: 'nochlezhka',
    name: 'Ночлежка',
    description: 'Помощь бездомным людям: питание, ночлег, социальная адаптация',
    category: 'Социальная помощь',
    icon: <PeopleIcon />,
    website: 'homeless.ru',
    impact: '50 000+ человек получили помощь',
    color: '#16a085',
  },
];

export function CharityPage() {
  const [selectedFund, setSelectedFund] = useState<string | null>('podari-zhizn');

  const handleSelectFund = (fundId: string) => {
    setSelectedFund(fundId);
    // Сохраняем выбор в localStorage
    localStorage.setItem('selectedCharityFund', fundId);
  };

  return (
    <>
      <SeoMetaTags
        title="Благотворительность - PrimeCoder"
        description="Мы помогаем! Часть средств от каждой продажи идет на благотворительность. Выберите фонд, который вам близок."
        keywords="благотворительность, помощь, фонды, пожертвования, социальная ответственность"
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />
      
      <Section>
        <Container maxWidth="lg">
          {/* Hero Section */}
          <HeroSection>
            <Box sx={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 2, 
              mb: 3,
              position: 'relative',
              zIndex: 1,
            }}>
              <FavoriteIcon sx={{ 
                fontSize: '48px', 
                color: '#ffbb00',
                animation: `${pulse} 2s ease-in-out infinite`,
              }} />
            </Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '32px', md: '48px' },
                fontWeight: 700,
                mb: 2,
                background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative',
                zIndex: 1,
              }}
            >
              Мы помогаем вместе с вами
            </Typography>
            <Typography
              variant="h5"
              sx={{
                maxWidth: '800px',
                mx: 'auto',
                color: 'text.secondary',
                mb: 4,
                lineHeight: 1.6,
                position: 'relative',
                zIndex: 1,
              }}
            >
              5% от каждой продажи на нашем сайте автоматически переводится в благотворительный фонд по вашему выбору
            </Typography>

            {/* Статистика */}
            <Grid container spacing={3} sx={{ mb: 6 }}>
              <Grid item xs={12} md={4}>
                <StatsBox elevation={0}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 700, 
                    color: '#ffbb00',
                    mb: 1,
                  }}>
                    ₽2.5М+
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Перечислено на благотворительность
                  </Typography>
                </StatsBox>
              </Grid>
              <Grid item xs={12} md={4}>
                <StatsBox elevation={0}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 700, 
                    color: '#ffbb00',
                    mb: 1,
                  }}>
                    500+
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Клиентов присоединились к помощи
                  </Typography>
                </StatsBox>
              </Grid>
              <Grid item xs={12} md={4}>
                <StatsBox elevation={0}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 700, 
                    color: '#ffbb00',
                    mb: 1,
                  }}>
                    9
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Проверенных благотворительных фондов
                  </Typography>
                </StatsBox>
              </Grid>
            </Grid>
          </HeroSection>

          {/* Как это работает */}
          <Box sx={{ mb: 8, textAlign: 'center' }}>
            <Typography variant="h3" sx={{ mb: 4, fontWeight: 600 }}>
              Как это работает?
            </Typography>
            <Stack 
              direction={{ xs: 'column', md: 'row' }} 
              spacing={4} 
              justifyContent="center"
              sx={{ maxWidth: '900px', mx: 'auto' }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  mx: 'auto',
                  mb: 2,
                }}>
                  1
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Выберите фонд
                </Typography>
                <Typography color="text.secondary">
                  Выберите благотворительную организацию, которая вам близка
                </Typography>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Box sx={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  mx: 'auto',
                  mb: 2,
                }}>
                  2
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Оформите заказ
                </Typography>
                <Typography color="text.secondary">
                  Покупайте услуги на нашем сайте как обычно
                </Typography>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Box sx={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  mx: 'auto',
                  mb: 2,
                }}>
                  3
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Мы переводим 5%
                </Typography>
                <Typography color="text.secondary">
                  Автоматически переводим 5% в выбранный вами фонд
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Выберите фонд */}
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                mb: 2, 
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Выберите благотворительный фонд
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ 
                mb: 6, 
                textAlign: 'center',
                maxWidth: '700px',
                mx: 'auto',
              }}
            >
              Все фонды проверены и имеют прозрачную отчетность. Вы можете изменить свой выбор в любое время в личном кабинете.
            </Typography>

            <Grid container spacing={3}>
              {charityFunds.map((fund, index) => (
                <Grid item xs={12} sm={6} md={4} key={fund.id}>
                  <CharityCard 
                    selected={selectedFund === fund.id}
                    onClick={() => handleSelectFund(fund.id)}
                    sx={{
                      animation: `${fadeIn} 0.5s ease-out ${index * 0.1}s both`,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <IconWrapper selected={selectedFund === fund.id}>
                          {fund.icon}
                        </IconWrapper>
                        {selectedFund === fund.id && (
                          <CheckCircleIcon sx={{ 
                            color: '#ffbb00', 
                            fontSize: '32px',
                            animation: `${pulse} 1s ease-in-out`,
                          }} />
                        )}
                      </Box>
                      
                      <Chip 
                        label={fund.category} 
                        size="small" 
                        sx={{ 
                          mb: 2,
                          bgcolor: selectedFund === fund.id ? 'rgba(255,187,0,0.2)' : 'rgba(255,187,0,0.1)',
                          color: '#ffbb00',
                          fontWeight: 600,
                        }} 
                      />
                      
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          mb: 1.5, 
                          fontWeight: 600,
                          fontSize: '18px',
                        }}
                      >
                        {fund.name}
                      </Typography>
                      
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ mb: 2, lineHeight: 1.6 }}
                      >
                        {fund.description}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Результат:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: fund.color }}>
                          {fund.impact}
                        </Typography>
                      </Box>
                      
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display: 'block',
                          color: 'text.secondary',
                          textDecoration: 'none',
                          '&:hover': { color: '#ffbb00' },
                        }}
                        component="a"
                        href={`https://${fund.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🌐 {fund.website}
                      </Typography>
                      
                      {selectedFund === fund.id && (
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="contained"
                            fullWidth
                            sx={{
                              bgcolor: '#ffbb00',
                              color: '#000',
                              fontWeight: 600,
                              '&:hover': {
                                bgcolor: '#e6a800',
                              },
                            }}
                          >
                            ✓ Выбрано
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </CharityCard>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Прозрачность */}
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Paper sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, rgba(255,187,0,0.05) 0%, rgba(255,187,0,0.02) 100%)',
              border: '1px solid rgba(255,187,0,0.2)',
            }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                Прозрачность и отчетность
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '700px', mx: 'auto' }}>
                Мы ежемесячно публикуем отчеты о перечисленных средствах. 
                Каждый рубль учитывается и идет на помощь тем, кто в ней нуждается. 
                Спасибо, что помогаете вместе с нами! ❤️
              </Typography>
            </Paper>
          </Box>
        </Container>
      </Section>
    </>
  );
}

