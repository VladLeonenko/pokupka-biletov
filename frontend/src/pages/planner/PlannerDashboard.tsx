import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  Paper,
  Divider,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  CheckCircle,
  LocalFireDepartment,
  SmartToy,
  Add,
  Edit,
  Visibility,
  TrendingDown,
  CalendarToday,
} from '@mui/icons-material';
import { getDashboard } from '@/services/plannerApi';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';

const MotionCard = motion.create(Card);
const MotionBox = motion.create(Box);

export default function PlannerDashboard() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Отладка авторизации
  console.log('[PlannerDashboard] Auth state:', { 
    hasToken: !!token, 
    hasUser: !!user,
    tokenFromStorage: localStorage.getItem('token'),
    userEmail: user?.email 
  });

  // Проверка авторизации
  if (!token || !user) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: '#141414',
        flexDirection: 'column',
        gap: 3,
        px: 2
      }}>
        <Typography variant="h4" sx={{ color: '#ffffff', textAlign: 'center' }}>
          🔐 Требуется авторизация
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 500 }}>
          Для доступа к планировщику необходимо войти в систему
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, mb: 2 }}>
          Debug: token={token ? 'есть' : 'нет'}, user={user ? user.email : 'нет'}
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          sx={{ 
            px: 4, 
            py: 1.5,
            bgcolor: '#667eea',
            '&:hover': { bgcolor: '#5568d3' }
          }}
          onClick={() => navigate('/admin/login')}
        >
          Войти в систему
        </Button>
      </Box>
    );
  }

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard', selectedDate],
    queryFn: getDashboard,
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#141414' }}>
        <Typography sx={{ color: '#ffffff' }}>Загрузка планировщика...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: '#141414',
        flexDirection: 'column', 
        gap: 2,
        px: 2
      }}>
        <Typography variant="h5" sx={{ color: '#ff6b6b' }}>
          ⚠️ Ошибка загрузки данных
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 500 }}>
          {error instanceof Error ? error.message : 'Неизвестная ошибка'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5568d3' } }}
          >
            Обновить страницу
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/admin/tasks')}
            sx={{ borderColor: '#ffffff', color: '#ffffff' }}
          >
            Перейти к задачам
          </Button>
        </Box>
      </Box>
    );
  }

  const today = dashboard?.today;
  const projects = dashboard?.projects || [];
  const recommendations = dashboard?.recommendations || [];
  const streaks = dashboard?.streaks || [];
  const weeklyTrend = dashboard?.weekly_trend || [];

  const completionRate = today?.completion_rate || 0;
  const tasksCompleted = today?.tasks_completed || 0;
  const tasksTotal = today?.tasks_total || 0;

  return (
    <Box sx={{ bgcolor: '#141414', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Заголовок */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#ffffff', mb: 1 }}>
            🎯 Личный планировщик
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarToday sx={{ color: 'rgba(255,255,255,0.7)' }} />
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {new Date().toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Левая колонка */}
          <Grid item xs={12} lg={8}>
            {/* Сегодняшняя продуктивность */}
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              sx={{ mb: 3, bgcolor: '#1a1a1a' }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
                    📊 Сегодня
                  </Typography>
                  <Chip
                    label={`${completionRate}%`}
                    sx={{
                      bgcolor: completionRate >= 70 ? '#4caf50' : completionRate >= 40 ? '#ff9800' : '#f44336',
                      color: '#ffffff',
                      fontWeight: 700,
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Выполнено задач: {tasksCompleted} / {tasksTotal}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      {completionRate}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={completionRate}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: completionRate >= 70 ? '#4caf50' : completionRate >= 40 ? '#ff9800' : '#f44336',
                      },
                    }}
                  />
                </Box>

                <Grid container spacing={2}>
                  {today?.energy_level && (
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.05)' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                          ⚡ Энергия
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                          {today.energy_level}/10
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  {today?.mood && (
                    <Grid item xs={6} sm={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.05)' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                          😊 Настроение
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                          {today.mood}/10
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.05)' }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                        📅 Задач сегодня
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                        {tasksTotal}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </MotionCard>

            {/* Проекты */}
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              sx={{ mb: 3, bgcolor: '#1a1a1a' }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
                    📂 Проекты
                  </Typography>
                  <Button
                    startIcon={<Add />}
                    variant="outlined"
                    size="small"
                    sx={{ borderColor: '#ffffff', color: '#ffffff' }}
                  >
                    Добавить
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  {projects.map((project, index) => (
                    <Grid item xs={12} sm={6} key={project.id}>
                      <MotionBox
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.08)',
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: project.color,
                            }}
                          />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff', flex: 1 }}>
                            {project.name}
                          </Typography>
                          <Chip
                            label={`${project.active_tasks} задач`}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
                          />
                        </Box>

                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              Прогресс
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 600 }}>
                              {project.progress}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={project.progress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'rgba(255,255,255,0.1)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: project.color,
                              },
                            }}
                          />
                        </Box>

                        {project.deadline && (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            📅 Дедлайн: {new Date(project.deadline).toLocaleDateString('ru-RU')}
                          </Typography>
                        )}
                      </MotionBox>
                    </Grid>
                  ))}
                </Grid>

                {projects.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      Нет активных проектов. Создайте первый проект!
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </MotionCard>

            {/* Недельная статистика */}
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              sx={{ bgcolor: '#1a1a1a' }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', mb: 3 }}>
                  📈 Неделя
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                  {weeklyTrend.map((day, index) => {
                    const height = Math.max(20, (day.completion_rate / 100) * 100);
                    return (
                      <Box key={index} sx={{ flex: 1, textAlign: 'center' }}>
                        <Box
                          sx={{
                            height: 100,
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              height: `${height}px`,
                              bgcolor: day.completion_rate >= 70 ? '#4caf50' : day.completion_rate >= 40 ? '#ff9800' : '#f44336',
                              borderRadius: '4px 4px 0 0',
                              transition: 'all 0.3s',
                              '&:hover': {
                                opacity: 0.8,
                              },
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </MotionCard>
          </Grid>

          {/* Правая колонка */}
          <Grid item xs={12} lg={4}>
            {/* AI Рекомендации */}
            <MotionCard
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              sx={{ mb: 3, bgcolor: '#1a1a1a' }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <SmartToy sx={{ color: '#667eea', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
                    Boost Assistant
                  </Typography>
                </Box>

                {recommendations.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {recommendations.map((rec) => (
                      <Alert
                        key={rec.id}
                        severity={
                          rec.type === 'warning' ? 'warning' :
                          rec.type === 'achievement' ? 'success' :
                          'info'
                        }
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.05)',
                          color: '#ffffff',
                          '& .MuiAlert-icon': {
                            color: rec.type === 'warning' ? '#ff9800' : 
                                   rec.type === 'achievement' ? '#4caf50' : '#2196f3',
                          },
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {rec.title}
                        </Typography>
                        {rec.description && (
                          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                            {rec.description}
                          </Typography>
                        )}
                        {rec.action_text && (
                          <Button
                            size="small"
                            sx={{ mt: 1, color: '#ffffff', borderColor: '#ffffff' }}
                            variant="outlined"
                          >
                            {rec.action_text}
                          </Button>
                        )}
                      </Alert>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <SmartToy sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)', mb: 2 }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      Пока нет рекомендаций. Продолжайте работать, и AI начнет давать советы!
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </MotionCard>

            {/* Стрики */}
            <MotionCard
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              sx={{ bgcolor: '#1a1a1a' }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <LocalFireDepartment sx={{ color: '#ff6b6b', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
                    Стрики
                  </Typography>
                </Box>

                {streaks.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {streaks.map((streak) => (
                      <Box
                        key={streak.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                              {streak.type === 'tasks' ? '✅ Задачи' :
                               streak.type === 'workouts' ? '💪 Тренировки' :
                               streak.type === 'reading' ? '📖 Чтение' :
                               streak.type}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              Лучший: {streak.best_count} дней
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#ff6b6b' }}>
                              {streak.current_count}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              🔥 дней
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <LocalFireDepartment sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)', mb: 2 }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      Начните выполнять задачи каждый день, чтобы создать стрик!
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </MotionCard>
          </Grid>
        </Grid>

        {/* Быстрые действия */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: '#667eea',
              color: '#ffffff',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#5568d3',
              },
            }}
            onClick={() => navigate('/admin/tasks')}
          >
            📋 Перейти к задачам
          </Button>
          <Button
            variant="contained"
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: '#51cf66',
              color: '#ffffff',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#40b857',
              },
            }}
            onClick={() => navigate('/admin/planner/personal')}
          >
            💪 Личное развитие
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

