import { useMemo, useState } from 'react';
import { Card, CardContent, Grid, Typography, Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMetricsOverview, MetricsOverview, clearGlobalCache } from '@/services/cmsApi';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useToast } from '@/components/common/ToastProvider';
import { getStoredCacheVersion } from '@/utils/cacheVersion';

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 60) return `${Math.round(seconds)} сек`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m} мин ${s} сек` : `${m} мин`;
}

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

  const stats = data?.stats;
  const summary = data?.summary;
  const trafficSources = data?.trafficSources || [];
  const devices = data?.devices || [];
  const bounceRateData = data?.bounceRate || [];
  const analyticsLabel = data?.analyticsSource === 'ga' ? 'Google Analytics' : data?.analyticsSource === 'yandex' ? 'Яндекс.Метрика' : 'Внутренняя аналитика';

  const trafficChartData = trafficSources.length
    ? {
        labels: trafficSources.map((s) => s.name),
        datasets: [{ data: trafficSources.map((s) => s.users), backgroundColor: ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1', '#5c6bc0', '#00897b'] }],
      }
    : null;

  const devicesChartData = devices.length
    ? {
        labels: devices.map((d) => d.name),
        datasets: [{ data: devices.map((d) => d.users), backgroundColor: ['#1976d2', '#2e7d32', '#ed6c02'] }],
      }
    : null;

  const bounceData = {
    labels: bounceRateData.map((d) => d.date?.slice(5)),
    datasets: [{ label: 'Отказы %', data: bounceRateData.map((d) => d.rate), borderColor: '#ed6c02', backgroundColor: 'rgba(237,108,0,0.2)', tension: 0.3 }],
  };

  return (
    <Grid container spacing={2}>
      {summary && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Сводка за 30 дней</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Посетители</Typography>
                  <Typography variant="h5">{summary.users?.toLocaleString('ru-RU') ?? '—'}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Визиты</Typography>
                  <Typography variant="h5">{summary.visits?.toLocaleString('ru-RU') ?? '—'}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Просмотры</Typography>
                  <Typography variant="h5">{summary.pageviews?.toLocaleString('ru-RU') ?? '—'}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Отказы</Typography>
                  <Typography variant="h5">{(summary.bounceRate ?? 0).toFixed(1)}%</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Время на сайте</Typography>
                  <Typography variant="h6">{formatDuration(summary.avgVisitDurationSeconds ?? 0)}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Глубина просмотра</Typography>
                  <Typography variant="h5">{(summary.avgPageViews ?? 0).toFixed(1)} стр</Typography>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      )}
      {stats && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Бизнес-метрики</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Заказов всего</Typography>
                  <Typography variant="h5">{stats.ordersTotal}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Заказов за 30 дней</Typography>
                  <Typography variant="h5">{stats.ordersMonth}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Выручка всего</Typography>
                  <Typography variant="h6">{(stats.revenueTotalCents / 100).toLocaleString('ru-RU')} ₽</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Клиентов</Typography>
                  <Typography variant="h5">{stats.clientsTotal}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Заявок (форм)</Typography>
                  <Typography variant="h5">{stats.formSubmissionsTotal}</Typography>
                  {stats.formSubmissionsNew > 0 && (
                    <Typography variant="caption" color="error">+{stats.formSubmissionsNew} новых</Typography>
                  )}
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Просмотров товаров (30 д)</Typography>
                  <Typography variant="h5">{stats.productViewsMonth}</Typography>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      )}
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
          <Typography variant="h6" sx={{ mb: 1 }}>
            Посетители (30 дней)
            {analyticsLabel && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>— {analyticsLabel}</Typography>
            )}
          </Typography>
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
      {bounceRateData.length > 0 && (
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Показатель отказов</Typography>
            <Box sx={{ height: 220 }}>
              <Line data={bounceData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }} />
            </Box>
          </Paper>
        </Grid>
      )}
      {trafficChartData && (
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Источники трафика</Typography>
            <Box sx={{ height: 220 }}>
              <Doughnut data={trafficChartData} options={{ maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>
      )}
      {devicesChartData && (
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Устройства</Typography>
            <Box sx={{ height: 220 }}>
              <Doughnut data={devicesChartData} options={{ maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>
      )}
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
              {(data?.topPages || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary' }}>Нет данных</TableCell>
                </TableRow>
              ) : (data?.topPages || []).map((p) => (
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


