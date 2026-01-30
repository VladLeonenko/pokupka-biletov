import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Paper,
  LinearProgress,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFinanceProfile, saveFinanceProfile } from '@/services/plannerApi';
import { FinanceOnboarding } from '@/components/planner/FinanceOnboarding';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SavingsIcon from '@mui/icons-material/Savings';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import EditIcon from '@mui/icons-material/Edit';
import type { FinanceProfile } from '@/types/planner';

export function UserFinancePlannerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: profile, isLoading } = useQuery({
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
    // Если профиль пустой, показываем онбординг
    if (!isLoading && !profile) {
      setShowOnboarding(true);
    }
  }, [profile, isLoading]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    queryClient.invalidateQueries({ queryKey: ['financeProfile'] });
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Загрузка финансового профиля...</Typography>
      </Box>
    );
  }

  if (showOnboarding || !profile) {
    return (
      <>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Button
            variant="text"
            onClick={() => navigate('/account')}
            sx={{ mb: 3 }}
          >
            ← Вернуться в кабинет
          </Button>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              color: '#ffffff',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <FinanceOnboarding onComplete={handleOnboardingComplete} />
            </CardContent>
          </Card>
        </Container>
      </>
    );
  }

  // Расчёты для дашборда
  const monthlyIncome = profile.monthly_income || 0;
  const monthlyBudget = profile.monthly_budget || 0;
  const savingsGoal = profile.savings_goal || 0;
  const investmentGoal = profile.investment_goal || 0;

  const monthlySavings = monthlyIncome - monthlyBudget;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const monthsToSavingsGoal = monthlySavings > 0 ? Math.ceil(savingsGoal / monthlySavings) : 0;
  const monthsToInvestmentGoal = monthlySavings > 0 ? Math.ceil(investmentGoal / monthlySavings) : 0;

  // Распределение расходов
  const expenseCategories = profile.expense_categories || [];
  const totalBudgeted = expenseCategories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
  const unallocated = monthlyBudget - totalBudgeted;

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Заголовок */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Button
              variant="text"
              onClick={() => navigate('/account')}
              sx={{ mb: 2 }}
            >
              ← Вернуться в кабинет
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              💰 Финансовый планировщик
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Управляйте личными финансами и достигайте целей
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setShowOnboarding(true)}
          >
            Изменить настройки
          </Button>
        </Box>

        {/* Главные метрики */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccountBalanceWalletIcon sx={{ mr: 1, color: '#4caf50' }} />
                  <Typography variant="body2" color="text.secondary">
                    Доход
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {monthlyIncome.toLocaleString('ru-RU')} ₽
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  в месяц
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon sx={{ mr: 1, color: '#ff9800' }} />
                  <Typography variant="body2" color="text.secondary">
                    Бюджет
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {monthlyBudget.toLocaleString('ru-RU')} ₽
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  планируемые расходы
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SavingsIcon sx={{ mr: 1, color: '#2196f3' }} />
                  <Typography variant="body2" color="text.secondary">
                    Накопления
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: monthlySavings > 0 ? '#4caf50' : '#f44336' }}>
                  {monthlySavings.toLocaleString('ru-RU')} ₽
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {savingsRate.toFixed(1)}% от дохода
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ShowChartIcon sx={{ mr: 1, color: '#9c27b0' }} />
                  <Typography variant="body2" color="text.secondary">
                    Норма сбережений
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {savingsRate.toFixed(0)}%
                </Typography>
                <Chip
                  label={savingsRate >= 20 ? '✓ Отлично' : savingsRate >= 10 ? '~ Хорошо' : '⚠ Низко'}
                  size="small"
                  color={savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'warning' : 'error'}
                  sx={{ mt: 0.5 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Цели */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  🎯 Цель по накоплениям
                </Typography>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
                  {savingsGoal.toLocaleString('ru-RU')} ₽
                </Typography>
                {monthsToSavingsGoal > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    При текущем темпе накоплений цель будет достигнута через <strong>{monthsToSavingsGoal} мес.</strong>
                    {monthsToSavingsGoal > 12 && ` (${(monthsToSavingsGoal / 12).toFixed(1)} лет)`}
                  </Alert>
                )}
                {monthlySavings <= 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Необходимо увеличить доход или снизить расходы для достижения цели
                  </Alert>
                )}
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Прогресс (гипотетический)</Typography>
                    <Typography variant="body2">0%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={0} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  📈 Цель по инвестициям
                </Typography>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
                  {investmentGoal.toLocaleString('ru-RU')} ₽
                </Typography>
                {monthsToInvestmentGoal > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    При текущем темпе цель будет достигнута через <strong>{monthsToInvestmentGoal} мес.</strong>
                    {monthsToInvestmentGoal > 12 && ` (${(monthsToInvestmentGoal / 12).toFixed(1)} лет)`}
                  </Alert>
                )}
                {monthlySavings <= 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Необходимо увеличить доход или снизить расходы для достижения цели
                  </Alert>
                )}
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Прогресс (гипотетический)</Typography>
                    <Typography variant="body2">0%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={0} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Категории расходов */}
        {expenseCategories.length > 0 && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                📊 Распределение бюджета
              </Typography>
              <Grid container spacing={2}>
                {expenseCategories.map((cat, index) => {
                  const percentage = monthlyBudget > 0 ? (cat.budget / monthlyBudget) * 100 : 0;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                          {cat.name}
                        </Typography>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {cat.budget?.toLocaleString('ru-RU')} ₽
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(percentage, 100)}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {percentage.toFixed(0)}%
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
              {unallocated !== 0 && (
                <Alert severity={unallocated > 0 ? 'info' : 'warning'} sx={{ mt: 3 }}>
                  {unallocated > 0 ? (
                    <>Нераспределённый бюджет: <strong>{unallocated.toLocaleString('ru-RU')} ₽</strong></>
                  ) : (
                    <>Превышение бюджета: <strong>{Math.abs(unallocated).toLocaleString('ru-RU')} ₽</strong></>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Рекомендации */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              💡 Рекомендации
            </Typography>
            <Grid container spacing={2}>
              {savingsRate < 10 && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    <strong>Низкий уровень сбережений.</strong> Рекомендуется откладывать минимум 10-20% от дохода. 
                    Попробуйте сократить необязательные расходы или найти дополнительные источники дохода.
                  </Alert>
                </Grid>
              )}
              {savingsRate >= 20 && savingsRate < 30 && (
                <Grid item xs={12}>
                  <Alert severity="success">
                    <strong>Отличный уровень сбережений!</strong> Вы откладываете {savingsRate.toFixed(0)}% дохода. 
                    Продолжайте в том же духе и рассмотрите варианты инвестирования.
                  </Alert>
                </Grid>
              )}
              {savingsRate >= 30 && (
                <Grid item xs={12}>
                  <Alert severity="success">
                    <strong>Превосходный уровень сбережений!</strong> Вы откладываете {savingsRate.toFixed(0)}% дохода. 
                    Рассмотрите агрессивные стратегии инвестирования для ускорения роста капитала.
                  </Alert>
                </Grid>
              )}
              {monthlyBudget > monthlyIncome && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    <strong>Дефицит бюджета!</strong> Ваши расходы превышают доходы на {(monthlyBudget - monthlyIncome).toLocaleString('ru-RU')} ₽. 
                    Срочно пересмотрите бюджет и сократите необязательные траты.
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <Alert severity="info">
                  <strong>Правило 50/30/20:</strong> Рекомендуется распределять доход следующим образом:
                  50% на обязательные расходы, 30% на желания, 20% на накопления и инвестиции.
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}

