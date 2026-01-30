import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Alert,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWorkoutProfile,
  getNutritionProfile,
  getReadingProfile,
  getEducationProfile,
  getFinanceProfile,
} from '@/services/plannerApi';
import { WorkoutOnboarding } from '@/components/planner/WorkoutOnboarding';
import { NutritionOnboarding } from '@/components/planner/NutritionOnboarding';
import { ReadingOnboarding } from '@/components/planner/ReadingOnboarding';
import { EducationOnboarding } from '@/components/planner/EducationOnboarding';
import { FinanceOnboarding } from '@/components/planner/FinanceOnboarding';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`planner-tabpanel-${index}`}
      aria-labelledby={`planner-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function UserPersonalDevelopmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState<{
    workout: boolean;
    nutrition: boolean;
    reading: boolean;
    education: boolean;
    finance: boolean;
  }>({
    workout: false,
    nutrition: false,
    reading: false,
    education: false,
    finance: false,
  });

  const { data: workoutProfile, isLoading: loadingWorkout } = useQuery({
    queryKey: ['workoutProfile'],
    queryFn: getWorkoutProfile,
    enabled: !!user,
  });

  const { data: nutritionProfile, isLoading: loadingNutrition } = useQuery({
    queryKey: ['nutritionProfile'],
    queryFn: getNutritionProfile,
    enabled: !!user,
  });

  const { data: readingProfile, isLoading: loadingReading } = useQuery({
    queryKey: ['readingProfile'],
    queryFn: getReadingProfile,
    enabled: !!user,
  });

  const { data: educationProfile, isLoading: loadingEducation } = useQuery({
    queryKey: ['educationProfile'],
    queryFn: getEducationProfile,
    enabled: !!user,
  });

  const { data: financeProfile, isLoading: loadingFinance } = useQuery({
    queryKey: ['financeProfile'],
    queryFn: getFinanceProfile,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Автоматически показываем онбординг если профиль пустой
    if (!loadingWorkout && !workoutProfile) {
      setShowOnboarding(prev => ({ ...prev, workout: true }));
    }
    if (!loadingNutrition && !nutritionProfile) {
      setShowOnboarding(prev => ({ ...prev, nutrition: true }));
    }
    if (!loadingReading && !readingProfile) {
      setShowOnboarding(prev => ({ ...prev, reading: true }));
    }
    if (!loadingEducation && !educationProfile) {
      setShowOnboarding(prev => ({ ...prev, education: true }));
    }
    if (!loadingFinance && !financeProfile) {
      setShowOnboarding(prev => ({ ...prev, finance: true }));
    }
  }, [
    workoutProfile,
    nutritionProfile,
    readingProfile,
    educationProfile,
    financeProfile,
    loadingWorkout,
    loadingNutrition,
    loadingReading,
    loadingEducation,
    loadingFinance,
  ]);

  const handleOnboardingComplete = (category: keyof typeof showOnboarding) => {
    setShowOnboarding(prev => ({ ...prev, [category]: false }));
    queryClient.invalidateQueries({ queryKey: [`${category}Profile`] });
  };

  if (!user) {
    return null;
  }

  const isLoading =
    loadingWorkout || loadingNutrition || loadingReading || loadingEducation || loadingFinance;

  if (isLoading) {
    return (
      <>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LinearProgress />
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Загрузка профилей личного развития...
          </Typography>
        </Container>
      </>
    );
  }

  const tabs = [
    { label: '🏋️ Тренировки', icon: <FitnessCenterIcon /> },
    { label: '🍎 Питание', icon: <RestaurantIcon /> },
    { label: '📚 Чтение', icon: <MenuBookIcon /> },
    { label: '🎓 Образование', icon: <SchoolIcon /> },
    { label: '💰 Финансы', icon: <AccountBalanceWalletIcon /> },
  ];

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Заголовок */}
        <Box sx={{ mb: 4 }}>
          <Button variant="text" onClick={() => navigate('/account')} sx={{ mb: 2 }}>
            ← Вернуться в кабинет
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            🚀 Личное развитие
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Управляйте всеми аспектами вашего развития в одном месте
          </Typography>
        </Box>

        {/* Табы */}
        <Card sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 70,
                fontSize: '1rem',
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab key={index} label={tab.label} icon={tab.icon} iconPosition="start" />
            ))}
          </Tabs>
        </Card>

        {/* Панели */}
        <TabPanel value={activeTab} index={0}>
          {showOnboarding.workout || !workoutProfile ? (
            <Card
              sx={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#ffffff',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <WorkoutOnboarding onComplete={() => handleOnboardingComplete('workout')} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    🏋️ Профиль тренировок
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => setShowOnboarding(prev => ({ ...prev, workout: true }))}
                  >
                    Изменить настройки
                  </Button>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>Ваш профиль настроен!</strong> Данные сохранены и используются для персональных рекомендаций.
                </Alert>

                {workoutProfile && (
                  <Box>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>Уровень подготовки:</strong>{' '}
                      {workoutProfile.fitness_level === 'beginner'
                        ? 'Начинающий'
                        : workoutProfile.fitness_level === 'intermediate'
                        ? 'Средний'
                        : workoutProfile.fitness_level === 'advanced'
                        ? 'Продвинутый'
                        : 'Профессионал'}
                    </Typography>
                    {workoutProfile.training_days_per_week && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Тренировок в неделю:</strong> {workoutProfile.training_days_per_week}
                      </Typography>
                    )}
                    {workoutProfile.goals && workoutProfile.goals.length > 0 && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Цели:</strong> {workoutProfile.goals.join(', ')}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {showOnboarding.nutrition || !nutritionProfile ? (
            <Card
              sx={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#ffffff',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <NutritionOnboarding onComplete={() => handleOnboardingComplete('nutrition')} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    🍎 Профиль питания
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => setShowOnboarding(prev => ({ ...prev, nutrition: true }))}
                  >
                    Изменить настройки
                  </Button>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>Ваш профиль настроен!</strong> Данные сохранены и используются для персональных рекомендаций.
                </Alert>

                {nutritionProfile && (
                  <Box>
                    {nutritionProfile.daily_calories_goal && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Цель по калориям:</strong> {nutritionProfile.daily_calories_goal} ккал/день
                      </Typography>
                    )}
                    {nutritionProfile.diet_type && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Тип питания:</strong> {nutritionProfile.diet_type}
                      </Typography>
                    )}
                    {nutritionProfile.meals_per_day && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Приёмов пищи в день:</strong> {nutritionProfile.meals_per_day}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {showOnboarding.reading || !readingProfile ? (
            <Card
              sx={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#ffffff',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <ReadingOnboarding onComplete={() => handleOnboardingComplete('reading')} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    📚 Профиль чтения
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => setShowOnboarding(prev => ({ ...prev, reading: true }))}
                  >
                    Изменить настройки
                  </Button>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>Ваш профиль настроен!</strong> Данные сохранены и используются для персональных рекомендаций.
                </Alert>

                {readingProfile && (
                  <Box>
                    {readingProfile.books_per_month_goal && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Цель по книгам:</strong> {readingProfile.books_per_month_goal} книг/месяц
                      </Typography>
                    )}
                    {readingProfile.pages_per_day_goal && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Цель по страницам:</strong> {readingProfile.pages_per_day_goal} страниц/день
                      </Typography>
                    )}
                    {readingProfile.favorite_genres && readingProfile.favorite_genres.length > 0 && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Любимые жанры:</strong> {readingProfile.favorite_genres.join(', ')}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {showOnboarding.education || !educationProfile ? (
            <Card
              sx={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#ffffff',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <EducationOnboarding onComplete={() => handleOnboardingComplete('education')} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    🎓 Профиль образования
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => setShowOnboarding(prev => ({ ...prev, education: true }))}
                  >
                    Изменить настройки
                  </Button>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>Ваш профиль настроен!</strong> Данные сохранены и используются для персональных рекомендаций.
                </Alert>

                {educationProfile && (
                  <Box>
                    {educationProfile.hours_per_week && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Часов обучения в неделю:</strong> {educationProfile.hours_per_week}
                      </Typography>
                    )}
                    {educationProfile.areas_of_interest && educationProfile.areas_of_interest.length > 0 && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Области интересов:</strong> {educationProfile.areas_of_interest.join(', ')}
                      </Typography>
                    )}
                    {educationProfile.target_skills && educationProfile.target_skills.length > 0 && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Целевые навыки:</strong> {educationProfile.target_skills.join(', ')}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          {showOnboarding.finance || !financeProfile ? (
            <Card
              sx={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#ffffff',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <FinanceOnboarding onComplete={() => handleOnboardingComplete('finance')} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    💰 Финансовый профиль
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => setShowOnboarding(prev => ({ ...prev, finance: true }))}
                  >
                    Изменить настройки
                  </Button>
                </Box>

                <Alert severity="success" sx={{ mb: 3 }}>
                  <strong>Ваш профиль настроен!</strong> Для подробного анализа перейдите на{' '}
                  <Button
                    size="small"
                    onClick={() => navigate('/account/finance-planner')}
                    sx={{ textDecoration: 'underline' }}
                  >
                    страницу финансового планировщика
                  </Button>
                </Alert>

                {financeProfile && (
                  <Box>
                    {financeProfile.monthly_income && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Ежемесячный доход:</strong> {financeProfile.monthly_income.toLocaleString('ru-RU')} ₽
                      </Typography>
                    )}
                    {financeProfile.monthly_budget && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Ежемесячный бюджет:</strong> {financeProfile.monthly_budget.toLocaleString('ru-RU')} ₽
                      </Typography>
                    )}
                    {financeProfile.savings_goal && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Цель по накоплениям:</strong> {financeProfile.savings_goal.toLocaleString('ru-RU')} ₽
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </TabPanel>

        {/* Общая информация */}
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>💡 Совет:</strong> Настройте все профили для получения максимально персонализированных рекомендаций от AI-ассистента.
          </Typography>
          <Typography variant="body2">
            Ваши данные хранятся безопасно и используются только для создания индивидуального плана развития.
          </Typography>
        </Alert>
      </Container>
    </>
  );
}

