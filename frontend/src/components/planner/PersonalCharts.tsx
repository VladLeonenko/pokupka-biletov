import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import type { PersonalEntry } from '@/types/planner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PersonalChartsProps {
  entries: PersonalEntry[];
  categoryName: string;
  categoryColor: string;
}

export function PersonalCharts({ entries, categoryName, categoryColor }: PersonalChartsProps) {
  const [tabValue, setTabValue] = useState(0);

  // Подготовка данных для графиков
  const chartData = useMemo(() => {
    if (entries.length === 0) return null;

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    switch (categoryName) {
      case 'workouts':
        return {
          labels: sortedEntries.map(e => new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
          datasets: [
            {
              label: 'Длительность (мин)',
              data: sortedEntries.map(e => e.workout_duration || 0),
              borderColor: categoryColor,
              backgroundColor: `${categoryColor}40`,
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Вес (кг)',
              data: sortedEntries.map(e => e.workout_weight || 0),
              borderColor: '#ff6b6b',
              backgroundColor: '#ff6b6b40',
              fill: true,
              tension: 0.4,
            },
          ],
        };

      case 'nutrition':
        return {
          labels: sortedEntries.map(e => new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
          datasets: [
            {
              label: 'Калории',
              data: sortedEntries.map(e => e.nutrition_calories || 0),
              borderColor: categoryColor,
              backgroundColor: `${categoryColor}40`,
              fill: true,
            },
            {
              label: 'Белки (г)',
              data: sortedEntries.map(e => e.nutrition_protein || 0),
              borderColor: '#4c6ef5',
              backgroundColor: '#4c6ef540',
            },
            {
              label: 'Углеводы (г)',
              data: sortedEntries.map(e => e.nutrition_carbs || 0),
              borderColor: '#51cf66',
              backgroundColor: '#51cf6640',
            },
            {
              label: 'Жиры (г)',
              data: sortedEntries.map(e => e.nutrition_fats || 0),
              borderColor: '#f59f00',
              backgroundColor: '#f59f0040',
            },
          ],
        };

      case 'education':
        return {
          labels: sortedEntries.map(e => new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
          datasets: [
            {
              label: 'Часов обучения',
              data: sortedEntries.map(e => e.education_hours || 0),
              borderColor: categoryColor,
              backgroundColor: `${categoryColor}40`,
              fill: true,
            },
            {
              label: 'Прогресс (%)',
              data: sortedEntries.map(e => e.education_progress || 0),
              borderColor: '#51cf66',
              backgroundColor: '#51cf6640',
              yAxisID: 'y1',
            },
          ],
        };

      case 'reading':
        return {
          labels: sortedEntries.map(e => new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
          datasets: [
            {
              label: 'Страниц прочитано',
              data: sortedEntries.map(e => e.reading_pages || 0),
              borderColor: categoryColor,
              backgroundColor: `${categoryColor}40`,
              fill: true,
            },
          ],
        };

      case 'finance':
        const income = sortedEntries.reduce((sum, e) => sum + (e.finance_income || 0), 0);
        const expenses = sortedEntries.reduce((sum, e) => sum + (e.finance_expenses || 0), 0);
        return {
          labels: sortedEntries.map(e => new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
          datasets: [
            {
              label: 'Доходы (₽)',
              data: sortedEntries.map(e => e.finance_income || 0),
              borderColor: '#51cf66',
              backgroundColor: '#51cf6640',
            },
            {
              label: 'Расходы (₽)',
              data: sortedEntries.map(e => e.finance_expenses || 0),
              borderColor: '#ff6b6b',
              backgroundColor: '#ff6b6b40',
            },
          ],
          summary: { income, expenses, balance: income - expenses },
        };

      default:
        return null;
    }
  }, [entries, categoryName, categoryColor]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#ffffff',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.7)' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.7)' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
      ...(categoryName === 'education' && {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          ticks: { color: 'rgba(255,255,255,0.7)' },
          grid: { drawOnChartArea: false },
        },
      }),
    },
  };

  if (!chartData || entries.length === 0) {
    return (
      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Добавьте записи, чтобы увидеть графики
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'rgba(255,255,255,0.7)' },
          '& .Mui-selected': { color: '#ffffff !important' },
        }}
      >
        <Tab label="Линейный график" />
        <Tab label="Столбчатая диаграмма" />
        {categoryName === 'finance' && <Tab label="Сводка" />}
      </Tabs>

      <Box sx={{ height: 300 }}>
        {tabValue === 0 && chartData && 'datasets' in chartData && (
          <Line data={chartData as any} options={chartOptions} />
        )}
        {tabValue === 1 && chartData && 'datasets' in chartData && (
          <Bar data={chartData as any} options={chartOptions} />
        )}
        {tabValue === 2 && categoryName === 'finance' && chartData && 'summary' in chartData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  Доходы
                </Typography>
                <Typography variant="h5" sx={{ color: '#51cf66', fontWeight: 700 }}>
                  {(chartData as any).summary.income.toLocaleString()} ₽
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  Расходы
                </Typography>
                <Typography variant="h5" sx={{ color: '#ff6b6b', fontWeight: 700 }}>
                  {(chartData as any).summary.expenses.toLocaleString()} ₽
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                  Баланс
                </Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: (chartData as any).summary.balance >= 0 ? '#51cf66' : '#ff6b6b',
                    fontWeight: 700 
                  }}
                >
                  {(chartData as any).summary.balance.toLocaleString()} ₽
                </Typography>
              </Box>
            </Box>
            <Doughnut
              data={{
                labels: ['Доходы', 'Расходы'],
                datasets: [{
                  data: [(chartData as any).summary.income, (chartData as any).summary.expenses],
                  backgroundColor: ['#51cf66', '#ff6b6b'],
                }],
              }}
              options={{
                plugins: {
                  legend: {
                    labels: { color: '#ffffff' },
                  },
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

