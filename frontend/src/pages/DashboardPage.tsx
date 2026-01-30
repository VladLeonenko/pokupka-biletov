import { useMemo, useState } from 'react';
import { Card, CardContent, Grid, Typography, Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMetricsOverview, MetricsOverview, clearGlobalCache } from '@/services/cmsApi';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useToast } from '@/components/common/ToastProvider';
import { getStoredCacheVersion } from '@/utils/cacheVersion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function DashboardPage() {
  const { showToast } = useToast();
  const [cacheVersion, setCacheVersion] = useState(() => getStoredCacheVersion() || '');
  const { data } = useQuery<MetricsOverview>({ queryKey: ['metrics-overview'], queryFn: getMetricsOverview });
  const cacheVersionLabel = useMemo(() => {
    if (!cacheVersion) return '—';
    const timestamp = Number(cacheVersion);
    if (!Number.isNaN(timestamp)) {
      const date = new Date(timestamp);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    }
    return cacheVersion;
  }, [cacheVersion]);

  const cacheMutation = useMutation({
    mutationFn: () => clearGlobalCache(),
    onSuccess: (result) => {
      setCacheVersion(result?.version || '');
      showToast('Кэш сброшен. Пользователи получат обновлённые данные.', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Не удалось сбросить кэш';
      showToast(message, 'error');
    },
  });

  const handleClearCache = () => {
    if (cacheMutation.isPending) return;
    const confirmed = window.confirm('Сбросить кэш для всех пользователей? Все посетители увидят актуальные данные после обновления страницы.');
    if (confirmed) {
      cacheMutation.mutate();
    }
  };

  const visitorsData = {
    labels: (data?.visitors || []).map(d => d.date.slice(5)),
    datasets: [{ label: 'Посетители', data: (data?.visitors || []).map(d => d.users), borderColor: '#1976d2', backgroundColor: 'rgba(25,118,210,0.2)', tension: 0.3 }],
  };
  const sessionData = {
    labels: (data?.avgSessionSec || []).map(d => d.date.slice(5)),
    datasets: [{ label: 'Среднее время (сек)', data: (data?.avgSessionSec || []).map(d => d.seconds), borderColor: '#2e7d32', backgroundColor: 'rgba(46,125,50,0.2)', tension: 0.3 }],
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>Управление кэшем</Typography>
            <Typography variant="body2" color="text.secondary">
              Текущая версия: {cacheVersionLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Нажмите, чтобы принудительно обновить ресурсы сайта для всех пользователей.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="warning"
            startIcon={<RestartAltIcon />}
            onClick={handleClearCache}
            disabled={cacheMutation.isPending}
          >
            {cacheMutation.isPending ? 'Сброс...' : 'Сбросить кэш'}
          </Button>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Посетители (30 дней)</Typography>
          <Box sx={{ height: 260 }}>
            <Line data={visitorsData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Среднее время на сайте</Typography>
          <Box sx={{ height: 260 }}>
            <Line data={sessionData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Топ страниц</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Страница</TableCell>
                <TableCell>Заголовок</TableCell>
                <TableCell align="right">Просмотры</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.topPages || []).map((p) => (
                <TableRow key={p.path} hover>
                  <TableCell>{p.path}</TableCell>
                  <TableCell>{p.title}</TableCell>
                  <TableCell align="right">{p.views}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
    </Grid>
  );
}


