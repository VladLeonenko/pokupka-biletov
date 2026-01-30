import { useQuery } from '@tanstack/react-query';
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
import { getTaskStats, TaskStats } from '@/services/cmsApi';
import { useState } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AssignmentIcon from '@mui/icons-material/Assignment';

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

export function TaskPlanner() {
  const [daysFilter, setDaysFilter] = useState(30);

  const { data: stats, isLoading, error } = useQuery<TaskStats>({
    queryKey: ['taskStats', daysFilter],
    queryFn: () => getTaskStats(daysFilter),
    retry: 1,
    onError: (err: any) => {
      console.error('[TaskPlanner] Error loading stats:', err);
    },
  });

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
          <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.8 }}>
            Проверьте консоль браузера для деталей
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

  // График создания и завершения задач по дням
  const dailyChartData = {
    labels: stats.dailyStats.map((d) => new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
    datasets: [
      {
        label: 'Создано',
        data: stats.dailyStats.map((d) => parseInt(d.created) || 0),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Завершено',
        data: stats.dailyStats.map((d) => parseInt(d.completed) || 0),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // График по приоритетам
  const priorityData = {
    labels: ['Срочные', 'Высокие', 'Средние', 'Низкие'],
    datasets: [
      {
        data: [
          parseInt(total.urgent_count) || 0,
          parseInt(total.high_count) || 0,
          parseInt(total.medium_count) || 0,
          parseInt(total.low_count) || 0,
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // График по статусам
  const statusData = {
    labels: ['Новые', 'В работе', 'Завершены', 'Отменены'],
    datasets: [
      {
        data: [
          parseInt(total.new_count) || 0,
          parseInt(total.in_progress_count) || 0,
          parseInt(total.completed_count) || 0,
          parseInt(total.cancelled_count) || 0,
        ],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // График продуктивности по неделям
  const productivityData = {
    labels: stats.productivity.map((p) => {
      const date = new Date(p.week);
      return `Неделя ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
    }),
    datasets: [
      {
        label: 'Завершено задач',
        data: stats.productivity.map((p) => parseInt(p.completed) || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
      },
    ],
  };

  // График загрузки по дням
  const workloadData = {
    labels: stats.workloadByDate.map((w) => new Date(w.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
    datasets: [
      {
        label: 'Задач к выполнению',
        data: stats.workloadByDate.map((w) => parseInt(w.tasks_due) || 0),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 2,
      },
    ],
  };

  // График активности по часам дня
  const hourlyData = {
    labels: stats.hourlyStats.map((h) => `${h.hour}:00`),
    datasets: [
      {
        label: 'Создано задач',
        data: stats.hourlyStats.map((h) => parseInt(h.count) || 0),
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 2,
      },
    ],
  };

  // График активности по дням недели
  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const weeklyData = {
    labels: stats.weeklyStats.map((w) => weekDays[w.day_of_week] || ''),
    datasets: [
      {
        label: 'Создано задач',
        data: stats.weeklyStats.map((w) => parseInt(w.count) || 0),
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgb(139, 92, 246)',
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
      tooltip: {
        mode: 'index' as const,
        intersect: false,
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

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
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

      {/* Дополнительные метрики */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
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
              <Chip
                label={`Новые: ${newNum}`}
                color="primary"
                size="small"
              />
              <Chip
                label={`В работе: ${inProgressNum}`}
                color="info"
                size="small"
              />
              <Chip
                label={`Завершены: ${completedNum}`}
                color="success"
                size="small"
              />
              <Chip
                label={`Отменены: ${parseInt(total.cancelled_count) || 0}`}
                color="default"
                size="small"
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Графики */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Динамика создания и завершения задач
            </Typography>
            <Box sx={{ height: 320 }}>
              <LineChart data={dailyChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Распределение по приоритетам
            </Typography>
            <Box sx={{ height: 320 }}>
              <DoughnutChart data={priorityData} options={pieOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Распределение по статусам
            </Typography>
            <Box sx={{ height: 270 }}>
              <PieChart data={statusData} options={pieOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Продуктивность по неделям
            </Typography>
            <Box sx={{ height: 270 }}>
              <BarChart data={productivityData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Загрузка по дням (предстоящие задачи)
            </Typography>
            <Box sx={{ height: 270 }}>
              <BarChart data={workloadData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Активность по часам дня
            </Typography>
            <Box sx={{ height: 270 }}>
              <BarChart data={hourlyData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Активность по дням недели
            </Typography>
            <Box sx={{ height: 270 }}>
              <BarChart data={weeklyData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

