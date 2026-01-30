import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  LinearProgress,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Rating,
  Alert,
  Container,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import {
  getAiTeamOverview,
  listAiTeamTasks,
  createAiTeamTask,
  requestAiTaskRevision,
  approveAiTask,
  rateAiTask,
  type AiTeamOverview,
  type AiTeamTask,
} from '@/services/aiTeamApi';
import { useToast } from '@/components/common/ToastProvider';

export function AccountAiTeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTaskType, setNewTaskType] = useState<'CONTENT' | 'ANALYTICS' | 'SMM' | 'ADS'>('CONTENT');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery<AiTeamOverview | null>({
    queryKey: ['aiTeamOverview'],
    queryFn: getAiTeamOverview,
  });

  const {
    data: tasks = [],
    isLoading: tasksLoading,
  } = useQuery<AiTeamTask[]>({
    queryKey: ['aiTeamTasks'],
    queryFn: () => listAiTeamTasks(),
    enabled: !!overview,
  });

  const createTaskMut = useMutation({
    mutationFn: createAiTeamTask,
    onSuccess: () => {
      setNewTitle('');
      setNewDescription('');
      queryClient.invalidateQueries({ queryKey: ['aiTeamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['aiTeamOverview'] });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при создании задачи', 'error');
    },
  });

  const revisionMut = useMutation({
    mutationFn: (taskId: number) => requestAiTaskRevision(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiTeamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['aiTeamOverview'] });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при запросе правки', 'error');
    },
  });

  const approveMut = useMutation({
    mutationFn: (taskId: number) => approveAiTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiTeamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['aiTeamOverview'] });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при одобрении задачи', 'error');
    },
  });

  const rateMut = useMutation({
    mutationFn: ({ taskId, score }: { taskId: number; score: number }) => rateAiTask(taskId, score),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiTeamTasks'] });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при сохранении оценки', 'error');
    },
  });

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Войдите, чтобы просмотреть кабинет AI Boost Team</Typography>
          <Button variant="contained" onClick={() => navigate('/admin/login')}>
            Войти
          </Button>
        </Box>
      </Container>
    );
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCreateTask = () => {
    if (!newTitle.trim()) return;
    createTaskMut.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      taskType: newTaskType,
      priority: newPriority,
    });
  };

  const renderOverview = () => {
    if (overviewLoading) {
      return (
        <Box sx={{ p: 3 }}>
          <LinearProgress />
        </Box>
      );
    }

    if (overviewError) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">Не удалось загрузить данные AI Team</Alert>
        </Box>
      );
    }

    if (!overview) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="info">
            У вас пока нет активной подписки AI Boost Team. Свяжитесь с менеджером, чтобы подключить тариф.
          </Alert>
        </Box>
      );
    }

    const { subscription, planLimits, usage, overload } = overview;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Тариф AI Boost Team
              </Typography>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {planLimits.name}
              </Typography>
              <Chip
                label={
                  subscription.status === 'active'
                    ? 'Активен'
                    : subscription.status === 'paused'
                    ? 'На паузе'
                    : 'Отключен'
                }
                color={subscription.status === 'active' ? 'success' : 'default'}
                size="small"
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Лимит: {planLimits.maxTasksPerWeek} задач в неделю
              </Typography>
              {planLimits.maxTasksPerDay && (
                <Typography variant="body2" color="text.secondary">
                  В день: {planLimits.maxTasksPerDay} задач
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Правки на задачу:{' '}
                {planLimits.maxRevisionsPerTask === null
                  ? 'неограниченно'
                  : planLimits.maxRevisionsPerTask}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Лимиты и загрузка
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Задач на этой неделе
                  </Typography>
                  <Typography variant="h5">{usage.tasksThisWeek}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    из {planLimits.maxTasksPerWeek}
                  </Typography>
                  {overload.weekUsagePercent !== null && (
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(overload.weekUsagePercent, 100)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {overload.weekUsagePercent}% от недельного лимита
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Задач сегодня
                  </Typography>
                  <Typography variant="h5">{usage.tasksToday}</Typography>
                  {planLimits.maxTasksPerDay && (
                    <Typography variant="caption" color="text.secondary">
                      из {planLimits.maxTasksPerDay}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Статус загрузки
                  </Typography>
                  {overload.weekLimitReached || overload.dayLimitReached ? (
                    <Chip label="Лимит исчерпан" color="error" size="small" />
                  ) : overload.weekUsagePercent !== null && overload.weekUsagePercent >= 90 ? (
                    <Chip label="90% лимита" color="warning" size="small" />
                  ) : (
                    <Chip label="В пределах лимита" color="success" size="small" />
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderTasks = () => {
    if (!overview) return null;

    if (tasksLoading) {
      return (
        <Box sx={{ p: 3 }}>
          <LinearProgress />
        </Box>
      );
    }

    if (!tasks.length) {
      return (
        <Card>
          <CardContent>
            <Typography color="text.secondary">
              У вас пока нет задач AI Boost Team. Создайте первую задачу через форму выше.
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Grid container spacing={2}>
        {tasks.map((task) => {
          const isCompleted = task.status === 'completed';
          const canRequestRevision = !isCompleted;
          const canApprove = !isCompleted;

          return (
            <Grid item xs={12} md={6} key={task.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {task.title}
                    </Typography>
                    <Chip
                      label={
                        task.status === 'new'
                          ? 'Новая'
                          : task.status === 'in_progress'
                          ? 'В работе'
                          : task.status === 'awaiting_client'
                          ? 'Ждём вашего ответа'
                          : task.status === 'revision'
                          ? 'На доработке'
                          : task.status === 'completed'
                          ? 'Готово'
                          : 'Отменена'
                      }
                      size="small"
                      color={
                        task.status === 'completed'
                          ? 'success'
                          : task.status === 'awaiting_client' || task.status === 'revision'
                          ? 'info'
                          : 'default'
                      }
                    />
                  </Box>

                  <Chip
                    label={task.taskType}
                    size="small"
                    sx={{ mb: 1, mr: 1 }}
                  />
                  <Chip
                    label={task.priority}
                    size="small"
                    color={
                      task.priority === 'urgent'
                        ? 'error'
                        : task.priority === 'high'
                        ? 'warning'
                        : 'default'
                    }
                    sx={{ mb: 1 }}
                  />

                  {task.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1, whiteSpace: 'pre-wrap' }}
                    >
                      {task.description}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Правок: {task.revisionsCount}
                  </Typography>

                  {task.dueDate && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Дедлайн: {new Date(task.dueDate).toLocaleString('ru-RU')}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!canRequestRevision || revisionMut.isPending}
                      onClick={() => revisionMut.mutate(task.id)}
                    >
                      Запросить правку
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={!canApprove || approveMut.isPending}
                      onClick={() => approveMut.mutate(task.id)}
                    >
                      Одобрить
                    </Button>
                  </Box>

                  {isCompleted && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Оцените качество задачи
                      </Typography>
                      <Rating
                        size="small"
                        value={task.rating || 0}
                        onChange={(_, value) => {
                          if (!value) return;
                          rateMut.mutate({ taskId: task.id, score: value });
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  return (
    <>
      <SeoMetaTags
        title="AI Boost Team - личный кабинет"
        description="Управление задачами AI Boost Team, лимитами и качеством"
        url={currentUrl}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          AI Boost Team
        </Typography>

        {renderOverview()}

        {overview && (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Новая задача
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Заголовок задачи"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Описание / ТЗ"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Тип задачи</InputLabel>
                      <Select
                        label="Тип задачи"
                        value={newTaskType}
                        onChange={(e) => setNewTaskType(e.target.value as any)}
                      >
                        <MenuItem value="CONTENT">Контент</MenuItem>
                        <MenuItem value="ANALYTICS">Аналитика</MenuItem>
                        <MenuItem value="SMM">SMM / соцсети</MenuItem>
                        <MenuItem value="ADS">Реклама</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Приоритет</InputLabel>
                      <Select
                        label="Приоритет"
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
                      >
                        <MenuItem value="low">Низкий</MenuItem>
                        <MenuItem value="medium">Средний</MenuItem>
                        <MenuItem value="high">Высокий</MenuItem>
                        <MenuItem value="urgent">Срочно</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      onClick={handleCreateTask}
                      disabled={createTaskMut.isPending || !newTitle.trim()}
                    >
                      {createTaskMut.isPending ? 'Создаём...' : 'Создать задачу'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {renderTasks()}
          </>
        )}
      </Container>
    </>
  );
}


