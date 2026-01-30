import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  AlertTitle,
  Divider,
  Button,
  Snackbar,
} from '@mui/material';
import {
  Line,
  Bar,
  Pie,
  Doughnut,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Line as LineChart, Bar as BarChart, Pie as PieChart, Doughnut as DoughnutChart } from 'react-chartjs-2';
import { getTaskStats, listTasks, getAITaskRecommendations, upsertTask, TaskStats, Task, AIRecommendation, SuggestedTask, RecommendationTask } from '@/services/cmsApi';
import { useState, useMemo } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CodeIcon from '@mui/icons-material/Code';
import CampaignIcon from '@mui/icons-material/Campaign';
import BusinessIcon from '@mui/icons-material/Business';
import SettingsIcon from '@mui/icons-material/Settings';
import SupportIcon from '@mui/icons-material/Support';
import FolderIcon from '@mui/icons-material/Folder';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

const categoryLabels: Record<string, string> = {
  development: 'Разработка',
  marketing: 'Маркетинг',
  business: 'Построение бизнеса',
  operations: 'Операции',
  support: 'Поддержка',
  other: 'Другое',
};

const categoryIcons: Record<string, any> = {
  development: CodeIcon,
  marketing: CampaignIcon,
  business: BusinessIcon,
  operations: SettingsIcon,
  support: SupportIcon,
  other: FolderIcon,
};

const categoryColors: Record<string, string> = {
  development: '#3b82f6',
  marketing: '#8b5cf6',
  business: '#10b981',
  operations: '#f59e0b',
  support: '#ef4444',
  other: '#6b7280',
};

export function TaskPlannerEnhanced() {
  const [daysFilter, setDaysFilter] = useState(30);
  const [tabValue, setTabValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const queryClient = useQueryClient();
  const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: stats, isLoading, error } = useQuery<TaskStats>({
    queryKey: ['taskStats', daysFilter],
    queryFn: () => getTaskStats(daysFilter),
    retry: 1,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', selectedCategory],
    queryFn: () => listTasks({ 
      archived: false,
      ...(selectedCategory !== 'all' ? { category: selectedCategory } : {})
    }),
  });

  const { data: aiRecommendationsData, isLoading: aiLoading } = useQuery<{ recommendations: AIRecommendation[]; suggestedTasks: SuggestedTask[] }>({
    queryKey: ['aiTaskRecommendations'],
    queryFn: () => getAITaskRecommendations(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // Кэшируем на 5 минут
  });

  // Группировка задач по категориям
  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(task => {
      const cat = task.category || 'development';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(task);
    });
    return grouped;
  }, [tasks]);

  // Объединяем ИИ-рекомендации с базовыми
  const recommendations = useMemo(() => {
    const recs: Array<{ type: 'success' | 'warning' | 'info' | 'error'; title: string; message: string; action?: string }> = [];
    
    // Добавляем ИИ-рекомендации, если они есть
    if (aiRecommendationsData?.recommendations && aiRecommendationsData.recommendations.length > 0) {
      recs.push(...aiRecommendationsData.recommendations);
    } else if (!stats) {
      // Если нет статистики, возвращаем пустой массив
      return [];
    } else {
      // Базовые рекомендации, если ИИ недоступен
      const totalNum = parseInt(stats.total.total) || 0;
      const completedNum = parseInt(stats.total.completed_count) || 0;
      const overdueNum = parseInt(stats.total.overdue_count) || 0;
      const completionRate = totalNum > 0 ? (completedNum / totalNum) * 100 : 0;
      const avgDays = stats.avgCompletionDays || 0;

      if (completionRate >= 80) {
        recs.push({
          type: 'success',
          title: 'Отличная продуктивность!',
          message: `Вы завершили ${completionRate.toFixed(1)}% задач. Продолжайте в том же духе!`,
          action: 'Поддерживайте текущий темп работы',
        });
      } else if (completionRate < 50) {
        recs.push({
          type: 'warning',
          title: 'Низкий процент выполнения',
          message: `Завершено только ${completionRate.toFixed(1)}% задач. Рекомендуется пересмотреть приоритеты и сроки.`,
          action: 'Проанализируйте задачи и определите приоритеты',
        });
      }

      if (overdueNum > 0) {
        recs.push({
          type: 'warning',
          title: 'Есть просроченные задачи',
          message: `У вас ${overdueNum} просроченных задач. Рекомендуется срочно их обработать или перенести сроки.`,
          action: 'Проверьте просроченные задачи и обновите их статус или сроки',
        });
      }

      if (avgDays > 7) {
        recs.push({
          type: 'info',
          title: 'Долгое время выполнения',
          message: `Среднее время выполнения задачи: ${avgDays.toFixed(1)} дней. Рассмотрите возможность разбиения больших задач на меньшие.`,
          action: 'Разбейте крупные задачи на более мелкие подзадачи',
        });
      }

      if (stats.categoryStats && stats.categoryStats.length > 0) {
        const unbalanced = stats.categoryStats.find(cat => {
          const total = parseInt(cat.total) || 0;
          const completed = parseInt(cat.completed) || 0;
          return total > 5 && (completed / total) < 0.3;
        });
        if (unbalanced) {
          recs.push({
            type: 'info',
            title: 'Несбалансированная нагрузка',
            message: `Категория "${categoryLabels[unbalanced.category] || unbalanced.category}" имеет низкий процент выполнения. Обратите на неё внимание.`,
            action: `Сфокусируйтесь на задачах категории "${categoryLabels[unbalanced.category] || unbalanced.category}"`,
          });
        }
      }
    }

    return recs;
  }, [stats, aiRecommendationsData]);

  // Мутация для создания задачи из рекомендации
  const createTaskMutation = useMutation({
    mutationFn: async (task: SuggestedTask | RecommendationTask) => {
      return await upsertTask({
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: 'new',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
      setSnackbar({ open: true, message: 'Задача успешно создана!', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: `Ошибка создания задачи: ${error.message}`, severity: 'error' });
    },
  });

  const handleCreateTask = async (suggestedTask: SuggestedTask, taskId: string) => {
    setCreatingTaskId(taskId);
    try {
      await createTaskMutation.mutateAsync(suggestedTask);
    } finally {
      setCreatingTaskId(null);
    }
  };

  const handleCreateTaskFromRecommendation = async (task: RecommendationTask, recId: string, taskIdx: number) => {
    const taskId = `${recId}-task-${taskIdx}`;
    setCreatingTaskId(taskId);
    try {
      await createTaskMutation.mutateAsync(task);
    } finally {
      setCreatingTaskId(null);
    }
  };

  // Календарь задач (группировка по датам)
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const date = new Date(task.dueDate).toLocaleDateString('ru-RU');
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Ошибка загрузки статистики
          </Typography>
          <Typography variant="body2">
            {error instanceof Error ? error.message : 'Неизвестная ошибка'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography>Нет данных для отображения</Typography>
      </Box>
    );
  }

  const total = stats.total;
  const totalNum = parseInt(total.total) || 0;
  const completedNum = parseInt(total.completed_count) || 0;
  const inProgressNum = parseInt(total.in_progress_count) || 0;
  const newNum = parseInt(total.new_count) || 0;
  const overdueNum = parseInt(total.overdue_count) || 0;
  const completionRate = totalNum > 0 ? (completedNum / totalNum) * 100 : 0;

  // График по категориям
  const categoryChartData = {
    labels: stats.categoryStats?.map(c => categoryLabels[c.category] || c.category) || [],
    datasets: [
      {
        label: 'Всего задач',
        data: stats.categoryStats?.map(c => parseInt(c.total) || 0) || [],
        backgroundColor: stats.categoryStats?.map(c => categoryColors[c.category] || '#6b7280') || [],
        borderColor: stats.categoryStats?.map(c => categoryColors[c.category] || '#6b7280') || [],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Планировщик задач</Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Период</InputLabel>
          <Select
            value={daysFilter}
            label="Период"
            onChange={(e) => setDaysFilter(Number(e.target.value))}
          >
            <MenuItem value={7}>7 дней</MenuItem>
            <MenuItem value={30}>30 дней</MenuItem>
            <MenuItem value={90}>90 дней</MenuItem>
            <MenuItem value={180}>180 дней</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Рекомендации */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LightbulbIcon color="primary" />
          Рекомендации
          {aiLoading && (
            <CircularProgress size={20} sx={{ ml: 1 }} />
          )}
        </Typography>
        {recommendations.length > 0 ? (
          <Grid container spacing={2}>
            {recommendations.map((rec, recIdx) => {
              const recId = `rec-${recIdx}`;
              return (
                <Grid item xs={12} key={recIdx}>
                  <Alert 
                    severity={rec.type}
                    sx={{
                      '& .MuiAlert-message': {
                        width: '100%',
                      },
                    }}
                  >
                    <AlertTitle>{rec.title}</AlertTitle>
                    <Typography variant="body2" sx={{ mb: rec.tasks && rec.tasks.length > 0 ? 2 : rec.action ? 1 : 0 }}>
                      {rec.message}
                    </Typography>
                    
                    {rec.tasks && rec.tasks.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                          Рекомендуемые задачи:
                        </Typography>
                        <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, p: 1 }}>
                          {rec.tasks.map((task, taskIdx) => {
                            const taskId = `${recId}-task-${taskIdx}`;
                            const isCreating = creatingTaskId === taskId;
                            const Icon = categoryIcons[task.category] || FolderIcon;
                            const color = categoryColors[task.category] || '#6b7280';
                            
                            return (
                              <ListItem
                                key={taskIdx}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  mb: 1,
                                  bgcolor: 'grey.50',
                                  '&:hover': {
                                    bgcolor: 'grey.100',
                                  },
                                }}
                                secondaryAction={
                                  <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={isCreating ? <CircularProgress size={16} /> : <AddIcon />}
                                    onClick={() => handleCreateTaskFromRecommendation(task, recId, taskIdx)}
                                    disabled={isCreating}
                                    sx={{ minWidth: 140 }}
                                  >
                                    {isCreating ? 'Создание...' : 'Добавить задачу'}
                                  </Button>
                                }
                              >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <Icon sx={{ color, fontSize: 20 }} />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                      <Typography variant="subtitle2" fontWeight={600}>
                                        {taskIdx + 1}. {task.title}
                                      </Typography>
                                      <Chip
                                        label={task.priority === 'urgent' ? 'Срочно' : task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                                        size="small"
                                        color={task.priority === 'urgent' ? 'error' : task.priority === 'high' ? 'warning' : 'default'}
                                        sx={{ height: 20, fontSize: '0.65rem' }}
                                      />
                                      <Chip
                                        label={categoryLabels[task.category] || task.category}
                                        size="small"
                                        sx={{ bgcolor: color, color: 'white', height: 20, fontSize: '0.65rem' }}
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <Typography variant="body2" color="text.secondary">
                                      {task.description}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    )}
                    
                    {rec.action && !rec.tasks && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic', opacity: 0.8 }}>
                        💡 {rec.action}
                      </Typography>
                    )}
                  </Alert>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
            <Typography color="text.secondary">
              {aiLoading ? 'Загрузка рекомендаций...' : 'Нет рекомендаций на данный момент'}
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Предлагаемые задачи */}
      {aiRecommendationsData?.suggestedTasks && aiRecommendationsData.suggestedTasks.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon color="primary" />
            Рекомендуемые задачи
          </Typography>
          <Grid container spacing={2}>
            {aiRecommendationsData.suggestedTasks.map((suggestedTask, idx) => {
              const taskId = `suggested-${idx}`;
              const isCreating = creatingTaskId === taskId;
              const Icon = categoryIcons[suggestedTask.category] || FolderIcon;
              const color = categoryColors[suggestedTask.category] || '#6b7280';
              
              return (
                <Grid item xs={12} md={6} lg={4} key={taskId}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        boxShadow: 4,
                        borderColor: 'primary.main',
                      },
                      transition: 'all 0.2s',
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Icon sx={{ color, fontSize: 20 }} />
                        <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                          {suggestedTask.title}
                        </Typography>
                        <Chip 
                          label={suggestedTask.priority === 'urgent' ? 'Срочно' : suggestedTask.priority === 'high' ? 'Высокий' : suggestedTask.priority === 'medium' ? 'Средний' : 'Низкий'}
                          size="small"
                          color={suggestedTask.priority === 'urgent' ? 'error' : suggestedTask.priority === 'high' ? 'warning' : 'default'}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {suggestedTask.description}
                      </Typography>
                      
                      <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                          💡 Почему это важно:
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {suggestedTask.reason}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip 
                          label={categoryLabels[suggestedTask.category] || suggestedTask.category}
                          size="small"
                          sx={{ bgcolor: color, color: 'white', fontSize: '0.7rem' }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={isCreating ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                          onClick={() => handleCreateTask(suggestedTask, taskId)}
                          disabled={isCreating}
                          sx={{ ml: 'auto' }}
                        >
                          {isCreating ? 'Создание...' : 'Создать задачу'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Основные метрики */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {totalNum}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Всего задач
                  </Typography>
                </Box>
                <AssignmentIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {completedNum}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Завершено
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={completionRate}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'white',
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                      {completionRate.toFixed(1)}% выполнено
                    </Typography>
                  </Box>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {inProgressNum}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    В работе
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: overdueNum > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {overdueNum}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Просрочено
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Вкладки */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="По категориям" />
          <Tab label="Календарь" />
          <Tab label="Статистика" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Фильтр категории</InputLabel>
              <Select
                value={selectedCategory}
                label="Фильтр категории"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">Все категории</MenuItem>
                <MenuItem value="development">Разработка</MenuItem>
                <MenuItem value="marketing">Маркетинг</MenuItem>
                <MenuItem value="business">Построение бизнеса</MenuItem>
                <MenuItem value="operations">Операции</MenuItem>
                <MenuItem value="support">Поддержка</MenuItem>
                <MenuItem value="other">Другое</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {selectedCategory === 'all' ? (
            <Grid container spacing={3}>
              {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
                const Icon = categoryIcons[category] || FolderIcon;
                const color = categoryColors[category] || '#6b7280';
                const completed = categoryTasks.filter(t => t.status === 'completed').length;
                const inProgress = categoryTasks.filter(t => t.status === 'in_progress').length;
                const overdue = categoryTasks.filter(t => {
                  if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
                  return new Date(t.dueDate) < new Date();
                }).length;

                return (
                  <Grid item xs={12} md={6} lg={4} key={category}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Icon sx={{ color }} />
                          <Typography variant="h6" fontWeight={600}>
                            {categoryLabels[category] || category}
                          </Typography>
                          <Chip label={categoryTasks.length} size="small" sx={{ ml: 'auto' }} />
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={categoryTasks.length > 0 ? (completed / categoryTasks.length) * 100 : 0}
                            sx={{ height: 8, borderRadius: 4, mb: 1 }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'text.secondary' }}>
                            <span>Завершено: {completed}</span>
                            <span>В работе: {inProgress}</span>
                            {overdue > 0 && <span style={{ color: '#ef4444' }}>Просрочено: {overdue}</span>}
                          </Box>
                        </Box>
                        <List dense>
                          {categoryTasks.slice(0, 5).map(task => (
                            <ListItem key={task.id} sx={{ px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                {task.status === 'completed' ? (
                                  <CheckCircleIcon color="success" fontSize="small" />
                                ) : task.status === 'in_progress' ? (
                                  <ScheduleIcon color="info" fontSize="small" />
                                ) : (
                                  <AssignmentIcon fontSize="small" />
                                )}
                              </ListItemIcon>
                              <ListItemText
                                primary={task.title}
                                secondary={task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Без срока'}
                              />
                            </ListItem>
                          ))}
                          {categoryTasks.length > 5 && (
                            <Typography variant="caption" color="text.secondary" sx={{ pl: 4.5 }}>
                              и ещё {categoryTasks.length - 5} задач...
                            </Typography>
                          )}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Box>
              {tasks.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Нет задач в категории "{categoryLabels[selectedCategory] || selectedCategory}"
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {tasks.map(task => {
                    const Icon = categoryIcons[task.category || 'development'] || FolderIcon;
                    const color = categoryColors[task.category || 'development'] || '#6b7280';
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';

                    return (
                      <Grid item xs={12} md={6} lg={4} key={task.id}>
                        <Card sx={{ bgcolor: isOverdue ? 'error.light' : 'transparent' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Icon sx={{ color }} fontSize="small" />
                              <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                                {task.title}
                              </Typography>
                              {task.status === 'completed' ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                              ) : task.status === 'in_progress' ? (
                                <ScheduleIcon color="info" fontSize="small" />
                              ) : (
                                <AssignmentIcon fontSize="small" />
                              )}
                            </Box>
                            {task.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {task.description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                              <Chip
                                label={task.status === 'new' ? 'Новая' : task.status === 'in_progress' ? 'В работе' : task.status === 'completed' ? 'Завершена' : 'Отменена'}
                                size="small"
                                color={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'info' : 'default'}
                              />
                              <Chip
                                label={task.priority}
                                size="small"
                                color={task.priority === 'urgent' ? 'error' : task.priority === 'high' ? 'warning' : 'default'}
                              />
                              {task.dueDate && (
                                <Chip
                                  label={new Date(task.dueDate).toLocaleDateString('ru-RU')}
                                  size="small"
                                  color={isOverdue ? 'error' : 'default'}
                                />
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          )}

          {stats.categoryStats && stats.categoryStats.length > 0 && (
            <Paper sx={{ p: 3, mt: 3, height: 400 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Распределение задач по категориям
              </Typography>
              <Box sx={{ height: 320 }}>
                <BarChart data={categoryChartData} options={chartOptions} />
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarTodayIcon />
            Календарь задач
          </Typography>
          {Object.keys(tasksByDate).length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">Нет задач с установленными сроками</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {Object.entries(tasksByDate)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([date, dateTasks]) => (
                  <Grid item xs={12} md={6} lg={4} key={date}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                          {date}
                        </Typography>
                        <List dense>
                          {dateTasks.map(task => {
                            const isOverdue = new Date(task.dueDate!) < new Date() && task.status !== 'completed';
                            return (
                              <ListItem key={task.id} sx={{ px: 0, bgcolor: isOverdue ? 'error.light' : 'transparent', borderRadius: 1, mb: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  {task.status === 'completed' ? (
                                    <CheckCircleIcon color="success" fontSize="small" />
                                  ) : isOverdue ? (
                                    <WarningIcon color="error" fontSize="small" />
                                  ) : (
                                    <ScheduleIcon color="info" fontSize="small" />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primary={task.title}
                                  secondary={
                                    <Box>
                                      <Chip
                                        label={categoryLabels[task.category || 'development'] || task.category}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.7rem', mr: 0.5 }}
                                      />
                                      <Chip
                                        label={task.priority}
                                        size="small"
                                        color={task.priority === 'urgent' ? 'error' : task.priority === 'high' ? 'warning' : 'default'}
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                      />
                                    </Box>
                                  }
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          )}
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Детальная статистика
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Среднее время выполнения
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h3" color="primary" fontWeight={700}>
                    {stats.avgCompletionDays ? stats.avgCompletionDays.toFixed(1) : '0'}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    дней
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Распределение по статусам
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`Новые: ${newNum}`} color="primary" size="small" />
                  <Chip label={`В работе: ${inProgressNum}`} color="info" size="small" />
                  <Chip label={`Завершены: ${completedNum}`} color="success" size="small" />
                  <Chip label={`Отменены: ${parseInt(total.cancelled_count) || 0}`} color="default" size="small" />
                </Box>
              </Paper>
            </Grid>

            {stats.categoryStats && stats.categoryStats.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Статистика по категориям
                  </Typography>
                  <Grid container spacing={2}>
                    {stats.categoryStats.map(cat => {
                      const total = parseInt(cat.total) || 0;
                      const completed = parseInt(cat.completed) || 0;
                      const inProgress = parseInt(cat.in_progress) || 0;
                      const overdue = parseInt(cat.overdue) || 0;
                      const completionRate = total > 0 ? (completed / total) * 100 : 0;
                      const Icon = categoryIcons[cat.category] || FolderIcon;
                      const color = categoryColors[cat.category] || '#6b7280';

                      return (
                        <Grid item xs={12} sm={6} md={4} key={cat.category}>
                          <Card>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Icon sx={{ color }} />
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {categoryLabels[cat.category] || cat.category}
                                </Typography>
                              </Box>
                              <Typography variant="h4" sx={{ mb: 1 }}>
                                {total}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Всего задач
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={completionRate}
                                sx={{ height: 8, borderRadius: 4, mb: 1 }}
                              />
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'text.secondary' }}>
                                <span>✓ {completed}</span>
                                <span>⏳ {inProgress}</span>
                                {overdue > 0 && <span style={{ color: '#ef4444' }}>⚠ {overdue}</span>}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

