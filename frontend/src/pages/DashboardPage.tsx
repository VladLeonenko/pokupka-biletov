import { useMemo, useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  Paper,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TextField,
  Chip,
  Alert,
  Collapse,
  FormGroup,
  FormControlLabel,
  Switch,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  useTheme,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMetricsOverview,
  MetricsOverview,
  MetricsPeriod,
  clearGlobalCache,
  getYandexMetrikaStatus,
  getYandexMetrikaAuthUrl,
  exchangeYandexMetrikaCode,
} from '@/services/cmsApi';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useToast } from '@/components/common/ToastProvider';
import { getStoredCacheVersion } from '@/utils/cacheVersion';
import { useAuth } from '@/auth/AuthProvider';
import { ManagerDashboardPage } from '@/pages/admin/ManagerDashboardPage';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

type ReportKey =
  | 'kpi'
  | 'visitors'
  | 'session'
  | 'bounce'
  | 'byHour'
  | 'pageDepth'
  | 'pageLoad'
  | 'devices'
  | 'browsers'
  | 'os'
  | 'newVsReturning'
  | 'gender'
  | 'age'
  | 'sources'
  | 'engines'
  | 'phrases'
  | 'referers'
  | 'social'
  | 'utm'
  | 'goals'
  | 'regions'
  | 'countries'
  | 'pages'
  | 'entryPages'
  | 'exitPages';

type ReportGroup = { id: string; title: string; keys: ReportKey[] };

const REPORT_GROUPS: ReportGroup[] = [
  { id: 'summary', title: 'Сводка', keys: ['kpi', 'goals'] },
  {
    id: 'dynamics',
    title: 'Динамика',
    keys: ['visitors', 'session', 'bounce', 'byHour', 'pageDepth', 'pageLoad'],
  },
  {
    id: 'audience',
    title: 'Аудитория',
    keys: ['devices', 'browsers', 'os', 'newVsReturning', 'gender', 'age', 'regions', 'countries'],
  },
  {
    id: 'traffic',
    title: 'Трафик',
    keys: ['sources', 'engines', 'phrases', 'utm', 'referers', 'social'],
  },
  { id: 'content', title: 'Контент', keys: ['pages', 'entryPages', 'exitPages'] },
];

const REPORT_LABELS: Record<ReportKey, string> = {
  kpi: 'KPI + сравнение с прошлым периодом',
  visitors: 'Посетители',
  session: 'Время на сайте',
  bounce: 'Отказы',
  byHour: 'Активность по часам',
  pageDepth: 'Глубина просмотра',
  pageLoad: 'Скорость загрузки',
  devices: 'Устройства',
  browsers: 'Браузеры',
  os: 'ОС',
  newVsReturning: 'Новые / вернувшиеся',
  gender: 'Пол',
  age: 'Возраст',
  sources: 'Источники трафика',
  engines: 'Поисковые системы',
  phrases: 'Поисковые запросы',
  referers: 'Рефереры',
  social: 'Соцсети',
  utm: 'UTM (source / medium / campaign)',
  goals: 'Цели / конверсии',
  regions: 'Города',
  countries: 'Страны',
  pages: 'Топ страниц',
  entryPages: 'Страницы входа',
  exitPages: 'Страницы выхода',
};

const STORAGE_KEY = 'bilet_dashboard_reports_v1';
const PERIOD_KEY = 'bilet_dashboard_period_v1';

const DEFAULT_VISIBLE: Record<ReportKey, boolean> = {
  kpi: true,
  visitors: true,
  session: true,
  bounce: true,
  byHour: true,
  pageDepth: true,
  pageLoad: true,
  devices: true,
  browsers: true,
  os: false,
  newVsReturning: true,
  gender: true,
  age: true,
  sources: true,
  engines: true,
  phrases: true,
  referers: false,
  social: false,
  utm: true,
  goals: true,
  regions: true,
  countries: false,
  pages: true,
  entryPages: true,
  exitPages: false,
};

const PERIODS: Array<{ value: MetricsPeriod; label: string }> = [
  { value: 'today', label: 'Сегодня' },
  { value: 'yesterday', label: 'Вчера' },
  { value: '7d', label: '7 дней' },
  { value: '14d', label: '14 дней' },
  { value: '30d', label: '30 дней' },
  { value: '90d', label: '90 дней' },
  { value: 'month', label: 'Этот месяц' },
  { value: 'lastMonth', label: 'Прошлый месяц' },
  { value: 'custom', label: 'Свой' },
];

const PERIOD_LABELS: Record<string, string> = Object.fromEntries(PERIODS.map((p) => [p.value, p.label]));

const CHART_COLORS = ['#e8a317', '#5b8def', '#3dba8c', '#e85d75', '#9b7bff', '#45c4d9', '#f0a060', '#7a8ba8'];

function loadVisible(): Record<ReportKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VISIBLE };
    return { ...DEFAULT_VISIBLE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_VISIBLE };
  }
}

function loadPeriod(): MetricsPeriod {
  try {
    const v = localStorage.getItem(PERIOD_KEY) as MetricsPeriod | null;
    if (v && PERIODS.some((p) => p.value === v)) return v;
  } catch {
    /* ignore */
  }
  return '30d';
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPct(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const n = v > 1 ? v : v * 100;
  return `${n.toFixed(1)}%`;
}

/** delta % vs previous; invertGood=true → рост хуже (отказы) */
function DeltaChip({ value, invertGood }: { value?: number | null; invertGood?: boolean }) {
  if (value == null || !Number.isFinite(value)) return null;
  const up = value > 0;
  const good = invertGood ? !up : up;
  const color = Math.abs(value) < 0.05 ? 'default' : good ? 'success' : 'error';
  const sign = value > 0 ? '+' : '';
  return (
    <Chip
      size="small"
      color={color as 'default' | 'success' | 'error'}
      variant="outlined"
      label={`${sign}${value.toFixed(1)}%`}
      sx={{ height: 22, mt: 0.5, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
    />
  );
}

function namedChartData(rows: Array<{ name: string; users: number }> | undefined) {
  const list = rows || [];
  return {
    labels: list.map((r) => (r.name.length > 28 ? `${r.name.slice(0, 26)}…` : r.name)),
    datasets: [
      {
        data: list.map((r) => r.users),
        backgroundColor: list.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 0,
      },
    ],
  };
}

function PeriodFigure({ value, hint }: { value: string; hint: string }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Typography sx={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 340, lineHeight: 1.45 }}>
        {hint}
      </Typography>
    </Box>
  );
}

function padHours(rows: Array<{ hour: string; users: number }> | undefined) {
  const map = new Map<number, number>();
  for (const row of rows || []) {
    const h = Number(String(row.hour).split(':')[0]);
    if (Number.isFinite(h) && h >= 0 && h <= 23) map.set(h, (map.get(h) || 0) + Number(row.users || 0));
  }
  return Array.from({ length: 24 }, (_, hour) => ({ hour, users: map.get(hour) || 0 }));
}

function lineDataset(label: string, values: number[], color: string) {
  return {
    label,
    data: values,
    borderColor: color,
    backgroundColor: `${color}22`,
    fill: true,
    tension: 0.35,
    borderWidth: 2,
    pointRadius: values.length > 12 ? 0 : 4,
    pointHoverRadius: 5,
    pointBackgroundColor: color,
  };
}

function ReportCard({ title, children, height }: { title: string; children: React.ReactNode; height?: number }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)',
        background: dark ? 'rgba(255,255,255,0.02)' : '#fff',
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, letterSpacing: '0.02em' }}>
        {title}
      </Typography>
      <Box sx={{ height: height ?? 'auto' }}>{children}</Box>
    </Paper>
  );
}

function NamedTable({
  rows,
  nameHeader,
  empty,
}: {
  rows?: Array<{ name: string; users: number }>;
  nameHeader: string;
  empty?: string;
}) {
  if (!rows?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {empty || 'Нет данных за период'}
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{nameHeader}</TableCell>
          <TableCell align="right">Польз.</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.name} hover>
            <TableCell sx={{ maxWidth: 340, wordBreak: 'break-all' }}>{r.name}</TableCell>
            <TableCell align="right">{Math.round(r.users)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'sales_manager') {
    return <ManagerDashboardPage />;
  }
  return <AdminMetricsDashboard />;
}

function AdminMetricsDashboard() {
  const theme = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [cacheVersion, setCacheVersion] = useState(() => getStoredCacheVersion() || '');
  const [oauthCode, setOauthCode] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visible, setVisible] = useState<Record<ReportKey, boolean>>(loadVisible);
  const [period, setPeriod] = useState<MetricsPeriod>(loadPeriod);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const queryParams = useMemo(() => {
    if (period === 'custom' && customFrom && customTo) {
      return { period: 'custom' as const, date1: customFrom, date2: customTo };
    }
    if (period === 'custom') return { period: '30d' as const };
    return { period };
  }, [period, customFrom, customTo]);

  const { data, isLoading, isError, isFetching } = useQuery<MetricsOverview>({
    queryKey: ['metrics-overview', queryParams],
    queryFn: () => getMetricsOverview(queryParams),
    enabled: period !== 'custom' || Boolean(customFrom && customTo),
  });
  const { data: ymStatus } = useQuery({
    queryKey: ['yandex-metrika-status'],
    queryFn: getYandexMetrikaStatus,
    retry: false,
  });

  const exchangeMut = useMutation({
    mutationFn: (code: string) => exchangeYandexMetrikaCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yandex-metrika-status'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-overview'] });
      setOauthCode('');
      showToast('Яндекс.Метрика подключена', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const openYandexOAuth = async () => {
    try {
      const { url } = await getYandexMetrikaAuthUrl();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const cacheVersionLabel = useMemo(() => {
    if (!cacheVersion) return '—';
    const timestamp = Number(cacheVersion);
    if (!Number.isNaN(timestamp)) {
      const date = new Date(timestamp);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString();
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
    const confirmed = window.confirm(
      'Сбросить кэш для всех пользователей? Все посетители увидят актуальные данные после обновления страницы.',
    );
    if (confirmed) cacheMutation.mutate();
  };

  const persistVisible = (next: Record<ReportKey, boolean>) => {
    setVisible(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleReport = (key: ReportKey) => {
    persistVisible({ ...visible, [key]: !visible[key] });
  };

  const setGroup = (keys: ReportKey[], on: boolean) => {
    const next = { ...visible };
    keys.forEach((k) => {
      next[k] = on;
    });
    persistVisible(next);
  };

  const handlePeriod = (_: unknown, value: MetricsPeriod | null) => {
    if (!value) return;
    setPeriod(value);
    localStorage.setItem(PERIOD_KEY, value);
  };

  const dark = theme.palette.mode === 'dark';
  const gridColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)';
  const tickColor = dark ? 'rgba(255,255,255,0.62)' : 'rgba(17,17,17,0.55)';
  const chartOpts = {
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: tickColor, maxTicksLimit: 6, font: { size: 11 } },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { color: tickColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 11 } },
        border: { display: false },
      },
    },
  };

  const doughnutOpts = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
  };

  const dayLabels = (rows: Array<{ date?: string }> | undefined) =>
    (rows || []).map((d) => d.date?.slice(5) || d.date || '');
  const visitorsSeries = data?.visitors || [];
  const sessionSeries = data?.avgSessionSec || [];
  const bounceSeries = data?.bounceRate || [];
  const hours = padHours(data?.byHour);
  const visitorsByHour = visitorsSeries.length < 2 && hours.some((h) => h.users > 0);
  const visitorsData = visitorsByHour
    ? {
        labels: hours.map((h) => String(h.hour).padStart(2, '0')),
        datasets: [lineDataset('Посетители', hours.map((h) => h.users), '#ff4e18')],
      }
    : {
        labels: dayLabels(visitorsSeries),
        datasets: [lineDataset('Посетители', visitorsSeries.map((d) => d.users), '#ff4e18')],
      };
  const sessionData = {
    labels: dayLabels(sessionSeries),
    datasets: [lineDataset('Секунды', sessionSeries.map((d) => d.seconds), dark ? '#f5f5f5' : '#111111')],
  };
  const bounceData = {
    labels: dayLabels(bounceSeries),
    datasets: [
      lineDataset(
        'Отказы %',
        bounceSeries.map((d) => (d.rate > 1 ? d.rate : d.rate * 100)),
        '#c62828',
      ),
    ],
  };
  const hourData = {
    labels: hours.map((h) => String(h.hour).padStart(2, '0')),
    datasets: [
      {
        label: 'Посетители',
        data: hours.map((h) => h.users),
        backgroundColor: '#ff4e18',
        borderRadius: 6,
        maxBarThickness: 18,
      },
    ],
  };
  const depthData = {
    labels: dayLabels(data?.pageDepth),
    datasets: [lineDataset('Глубина', (data?.pageDepth || []).map((d) => d.depth), '#1565c0')],
  };
  const loadData = {
    labels: dayLabels(data?.pageLoadTime),
    datasets: [
      lineDataset(
        'Секунды',
        (data?.pageLoadTime || []).map((d) => {
          const v = Number(d.seconds) || 0;
          return v > 100 ? v / 1000 : v;
        }),
        '#00838f',
      ),
    ],
  };

  const summary = data?.summary;
  const comparison = data?.comparison;
  const stats = data?.stats;
  const periodLabel =
    period === 'custom' && customFrom && customTo
      ? `${customFrom} — ${customTo}`
      : PERIOD_LABELS[data?.period || period] || period;
  const sourceLabel =
    data?.analyticsSource === 'yandex'
      ? 'Яндекс.Метрика'
      : data?.analyticsSource === 'ga'
        ? 'Google Analytics'
        : data?.analyticsSource === 'internal'
          ? 'Внутренняя статистика'
          : data?.analyticsSource || '—';

  // overview уже тянет Яндекс → считаем подключенной даже если status упёрся в quota
  const metrikaLive = Boolean(ymStatus?.connected || data?.analyticsSource === 'yandex');
  const needsOauth = !metrikaLive;
  const statusWarn = ymStatus?.warning || (!metrikaLive ? ymStatus?.error : undefined);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1.5 }}>
            <Typography variant="h6" sx={{ mr: 1 }}>
              Обзор аналитики
            </Typography>
            <Chip
              size="small"
              label={metrikaLive ? `Метрика · ${ymStatus?.counterId || '109119282'}` : 'Метрика не подключена'}
              color={metrikaLive ? 'success' : 'default'}
            />
            {data?.analyticsSource && <Chip size="small" variant="outlined" label={sourceLabel} />}
            {isFetching && <Chip size="small" label="Обновление…" />}
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              startIcon={<SettingsOutlinedIcon />}
              variant="outlined"
              onClick={() => setSettingsOpen(true)}
            >
              Настройка отчётов
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Период
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={period}
            onChange={handlePeriod}
            sx={{ flexWrap: 'wrap', gap: 0.5, mb: period === 'custom' ? 1.5 : 0 }}
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.value} value={p.value} sx={{ px: 1.25, py: 0.5, textTransform: 'none' }}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Collapse in={period === 'custom'}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }} alignItems="center">
              <TextField
                size="small"
                type="date"
                label="С"
                InputLabelProps={{ shrink: true }}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <TextField
                size="small"
                type="date"
                label="По"
                InputLabelProps={{ shrink: true }}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </Stack>
          </Collapse>

          {statusWarn && (
            <Alert severity="warning" sx={{ mt: 1.5, mb: needsOauth ? 1 : 0 }}>
              {statusWarn}
              {String(statusWarn).toLowerCase().includes('quota') ||
              String(statusWarn).toLowerCase().includes('parallel')
                ? ' — это лимит Яндекса, не «отвал» токена. Подожди минуту и обнови страницу.'
                : null}
            </Alert>
          )}

          {needsOauth && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 1 }}>
                Счётчик 109119282. OAuth → код с verification_code → вставь ниже.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button variant="outlined" size="small" onClick={() => void openYandexOAuth()}>
                  Открыть OAuth
                </Button>
                <TextField
                  size="small"
                  placeholder="Код из oauth.yandex.ru/verification_code"
                  value={oauthCode}
                  onChange={(e) => setOauthCode(e.target.value)}
                  sx={{ minWidth: 280, flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={!oauthCode.trim() || exchangeMut.isPending}
                  onClick={() => exchangeMut.mutate(oauthCode.trim())}
                >
                  {exchangeMut.isPending ? '…' : 'Подключить'}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Grid>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Настройка отчётов</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Включай/выключай блоки. Настройки сохраняются в браузере. Период меняется на панели Обзора.
          </Typography>
          {REPORT_GROUPS.map((group) => (
            <Box key={group.id} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle2">{group.title}</Typography>
                <Button size="small" onClick={() => setGroup(group.keys, true)}>
                  все
                </Button>
                <Button size="small" onClick={() => setGroup(group.keys, false)}>
                  сброс
                </Button>
              </Box>
              <FormGroup>
                {group.keys.map((key) => (
                  <FormControlLabel
                    key={key}
                    control={<Switch size="small" checked={visible[key]} onChange={() => toggleReport(key)} />}
                    label={REPORT_LABELS[key]}
                  />
                ))}
              </FormGroup>
              <Divider sx={{ mt: 1 }} />
            </Box>
          ))}
          <Button size="small" onClick={() => persistVisible({ ...DEFAULT_VISIBLE })}>
            Вернуть по умолчанию
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Готово</Button>
        </DialogActions>
      </Dialog>

      {stats && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Бизнес-метрики
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Заказов всего
                  </Typography>
                  <Typography variant="h5">{stats.ordersTotal}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Заказов за 30 дней
                  </Typography>
                  <Typography variant="h5">{stats.ordersMonth}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Выручка всего
                  </Typography>
                  <Typography variant="h6">
                    {(stats.revenueTotalCents / 100).toLocaleString('ru-RU')} ₽
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Клиентов
                  </Typography>
                  <Typography variant="h5">{stats.clientsTotal}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Заявок (форм)
                  </Typography>
                  <Typography variant="h5">{stats.formSubmissionsTotal}</Typography>
                  {stats.formSubmissionsNew > 0 && (
                    <Typography variant="caption" color="error">
                      +{stats.formSubmissionsNew} новых
                    </Typography>
                  )}
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Просмотров товаров (30 д)
                  </Typography>
                  <Typography variant="h5">{stats.productViewsMonth}</Typography>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      )}

      <Grid item xs={12}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Управление кэшем
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Текущая версия: {cacheVersionLabel}
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

      {isError && (
        <Grid item xs={12}>
          <Alert severity="error">Не удалось загрузить метрики</Alert>
        </Grid>
      )}
      {isLoading && (
        <Grid item xs={12}>
          <Typography color="text.secondary">Загрузка отчётов…</Typography>
        </Grid>
      )}

      {visible.kpi && summary && (
        <Grid item xs={12}>
          {data?.previousPeriod && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Сравнение с {data.previousPeriod.date1} — {data.previousPeriod.date2}
            </Typography>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
            {(
              [
                {
                  label: 'Посетители',
                  value: Math.round(summary.users).toLocaleString('ru-RU'),
                  delta: comparison?.users,
                },
                {
                  label: 'Визиты',
                  value: Math.round(summary.visits).toLocaleString('ru-RU'),
                  delta: comparison?.visits,
                },
                {
                  label: 'Просмотры',
                  value: Math.round(summary.pageviews).toLocaleString('ru-RU'),
                  delta: comparison?.pageviews,
                },
                {
                  label: 'Новые',
                  value:
                    summary.newUsers != null ? Math.round(summary.newUsers).toLocaleString('ru-RU') : '—',
                  delta: comparison?.newUsers,
                },
                {
                  label: 'Отказы',
                  value: formatPct(summary.bounceRate),
                  delta: comparison?.bounceRate,
                  invertGood: true,
                },
                {
                  label: 'Время на сайте',
                  value: formatDuration(summary.avgVisitDurationSeconds),
                  delta: comparison?.avgVisitDurationSeconds,
                },
                {
                  label: 'Глубина',
                  value: Number(summary.avgPageViews).toFixed(1),
                  delta: comparison?.avgPageViews,
                },
                {
                  label: 'Цели',
                  value:
                    summary.goalReaches != null
                      ? Math.round(summary.goalReaches).toLocaleString('ru-RU')
                      : '—',
                  delta: null,
                },
              ] as Array<{
                label: string;
                value: string;
                delta?: number | null;
                invertGood?: boolean;
              }>
            ).map((kpi) => (
              <Paper
                key={kpi.label}
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1.5,
                  minWidth: 130,
                  flex: '1 1 130px',
                  borderColor: 'rgba(232,163,23,0.25)',
                  background: 'linear-gradient(145deg, rgba(232,163,23,0.08), transparent)',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {kpi.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {kpi.value}
                </Typography>
                <DeltaChip value={kpi.delta} invertGood={kpi.invertGood} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {periodLabel}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Grid>
      )}

      {visible.visitors && (
        <Grid item xs={12} md={8}>
          <ReportCard title={visitorsByHour ? `Посетители по часам · ${periodLabel}` : `Посетители · ${periodLabel}`} height={260}>
            {visitorsByHour ? (
              <Bar data={hourData} options={chartOpts} />
            ) : visitorsSeries.length < 2 ? (
              <PeriodFigure
                value={String(summary?.users ?? visitorsSeries[0]?.users ?? 0)}
                hint="За день нет ряда по часам. На «7 дней» здесь линия по дням."
              />
            ) : (
              <Line data={visitorsData} options={chartOpts} />
            )}
          </ReportCard>
        </Grid>
      )}
      {visible.session && (
        <Grid item xs={12} md={4}>
          <ReportCard title="Среднее время на сайте" height={260}>
            {sessionSeries.length < 2 ? (
              <PeriodFigure
                value={formatDuration(Number(summary?.avgVisitDurationSeconds) || 0)}
                hint="За один день график — одна точка. Динамика видна с периода «7 дней»."
              />
            ) : (
              <Line data={sessionData} options={chartOpts} />
            )}
          </ReportCard>
        </Grid>
      )}

      {visible.bounce && (bounceSeries.length > 0 || summary?.bounceRate != null) && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Показатель отказов" height={240}>
            {bounceSeries.length < 2 ? (
              <PeriodFigure
                value={formatPct(summary?.bounceRate ?? bounceSeries[0]?.rate ?? 0)}
                hint="Отказы за выбранный день. Линия по дням — на периоде от 7 дней."
              />
            ) : (
              <Line data={bounceData} options={chartOpts} />
            )}
          </ReportCard>
        </Grid>
      )}
      {visible.byHour && !visitorsByHour && hours.some((h) => h.users > 0) && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Активность по часам" height={240}>
            <Bar data={hourData} options={chartOpts} />
          </ReportCard>
        </Grid>
      )}
      {visible.pageDepth && (data?.pageDepth?.length ?? 0) > 0 && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Глубина просмотра по дням" height={240}>
            {(data?.pageDepth?.length ?? 0) < 2 ? (
              <PeriodFigure
                value={String(Math.round((summary?.avgPageViews || data?.pageDepth?.[0]?.depth || 0) * 10) / 10)}
                hint="Средняя глубина за день. По дням — на периоде от 7 дней."
              />
            ) : (
              <Line data={depthData} options={chartOpts} />
            )}
          </ReportCard>
        </Grid>
      )}
      {visible.pageLoad && (data?.pageLoadTime?.length ?? 0) > 0 && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Скорость загрузки (сек)" height={240}>
            {(data?.pageLoadTime?.length ?? 0) < 2 ? (
              <PeriodFigure value={`${loadData.datasets[0].data[0] ?? 0} с`} hint="Одно измерение за день." />
            ) : (
              <Line data={loadData} options={chartOpts} />
            )}
          </ReportCard>
        </Grid>
      )}

      {visible.goals && (
        <Grid item xs={12}>
          <ReportCard title="Цели / конверсии">
            {(data?.goals?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Цели не заведены в счётчике или нет достижений за период.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Цель</TableCell>
                    <TableCell align="right">Достижения</TableCell>
                    <TableCell align="right">Конверсия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.goals || []).map((g) => (
                    <TableRow key={String(g.id)} hover>
                      <TableCell>{g.name}</TableCell>
                      <TableCell align="right">{Math.round(g.reaches)}</TableCell>
                      <TableCell align="right">{formatPct(g.conversionRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ReportCard>
        </Grid>
      )}

      {visible.devices && (data?.devices?.length ?? 0) > 0 && (
        <Grid item xs={12} md={4}>
          <ReportCard title="Устройства" height={240}>
            <Doughnut data={namedChartData(data?.devices)} options={doughnutOpts} />
          </ReportCard>
        </Grid>
      )}
      {visible.newVsReturning && (data?.newVsReturning?.length ?? 0) > 0 && (
        <Grid item xs={12} md={4}>
          <ReportCard title="Новые / вернувшиеся" height={240}>
            <Doughnut data={namedChartData(data?.newVsReturning)} options={doughnutOpts} />
          </ReportCard>
        </Grid>
      )}
      {visible.gender && (
        <Grid item xs={12} md={4}>
          <ReportCard title="Пол" height={240}>
            {(data?.gender?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Нет данных (демография не собирается или мало трафика).
              </Typography>
            ) : (
              <Doughnut data={namedChartData(data?.gender)} options={doughnutOpts} />
            )}
          </ReportCard>
        </Grid>
      )}
      {visible.age && (
        <Grid item xs={12} md={4}>
          <ReportCard title="Возраст">
            <NamedTable
              rows={data?.age}
              nameHeader="Интервал"
              empty="Нет данных (демография не собирается или мало трафика)"
            />
          </ReportCard>
        </Grid>
      )}
      {visible.browsers && (data?.browsers?.length ?? 0) > 0 && (
        <Grid item xs={12} md={4}>
          <ReportCard title="Браузеры" height={240}>
            <Doughnut data={namedChartData(data?.browsers)} options={doughnutOpts} />
          </ReportCard>
        </Grid>
      )}

      {visible.os && (data?.operatingSystems?.length ?? 0) > 0 && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Операционные системы" height={240}>
            <Bar
              data={{
                labels: (data?.operatingSystems || []).map((r) => r.name),
                datasets: [
                  {
                    data: (data?.operatingSystems || []).map((r) => r.users),
                    backgroundColor: '#45c4d9',
                    borderRadius: 4,
                  },
                ],
              }}
              options={{ ...chartOpts, indexAxis: 'y' as const }}
            />
          </ReportCard>
        </Grid>
      )}
      {visible.sources && (data?.trafficSources?.length ?? 0) > 0 && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Источники трафика" height={260}>
            <Bar
              data={{
                labels: (data?.trafficSources || []).map((r) => r.name),
                datasets: [
                  {
                    label: 'Пользователи',
                    data: (data?.trafficSources || []).map((r) => r.users),
                    backgroundColor: '#e8a317',
                    borderRadius: 4,
                  },
                ],
              }}
              options={{ ...chartOpts, indexAxis: 'y' as const }}
            />
          </ReportCard>
        </Grid>
      )}

      {visible.engines && (data?.searchEngines?.length ?? 0) > 0 && (
        <Grid item xs={12} md={4}>
          <ReportCard title="Поисковые системы" height={240}>
            <Doughnut data={namedChartData(data?.searchEngines)} options={doughnutOpts} />
          </ReportCard>
        </Grid>
      )}
      {visible.social && (data?.socialNetworks?.length ?? 0) > 0 && (
        <Grid item xs={12} md={4}>
          <ReportCard title="Соцсети" height={240}>
            <Doughnut data={namedChartData(data?.socialNetworks)} options={doughnutOpts} />
          </ReportCard>
        </Grid>
      )}
      {visible.countries && (data?.countries?.length ?? 0) > 0 && (
        <Grid item xs={12} md={4}>
          <ReportCard title="Страны">
            <NamedTable rows={data?.countries} nameHeader="Страна" />
          </ReportCard>
        </Grid>
      )}

      {visible.regions && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Города">
            <NamedTable rows={data?.regions} nameHeader="Город" />
          </ReportCard>
        </Grid>
      )}
      {visible.phrases && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Поисковые запросы">
            <NamedTable
              rows={data?.searchPhrases}
              nameHeader="Запрос"
              empty="Нет данных (мало органики или фразы скрыты Метрикой)"
            />
          </ReportCard>
        </Grid>
      )}

      {visible.utm && (
        <>
          <Grid item xs={12} md={4}>
            <ReportCard title="UTM Source">
              <NamedTable rows={data?.utmSource} nameHeader="Source" empty="Нет UTM-меток за период" />
            </ReportCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <ReportCard title="UTM Medium">
              <NamedTable rows={data?.utmMedium} nameHeader="Medium" empty="Нет UTM-меток за период" />
            </ReportCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <ReportCard title="UTM Campaign">
              <NamedTable rows={data?.utmCampaign} nameHeader="Campaign" empty="Нет UTM-меток за период" />
            </ReportCard>
          </Grid>
        </>
      )}

      {visible.referers && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Рефереры">
            <NamedTable rows={data?.referers} nameHeader="Источник" />
          </ReportCard>
        </Grid>
      )}
      {visible.entryPages && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Страницы входа">
            <NamedTable rows={data?.entryPages} nameHeader="URL" />
          </ReportCard>
        </Grid>
      )}
      {visible.exitPages && (
        <Grid item xs={12} md={6}>
          <ReportCard title="Страницы выхода">
            <NamedTable rows={data?.exitPages} nameHeader="URL" />
          </ReportCard>
        </Grid>
      )}

      {visible.pages && (
        <Grid item xs={12}>
          <ReportCard title={`Топ страниц · ${periodLabel}`}>
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
                    <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.path}
                    </TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell align="right">{p.views}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ReportCard>
        </Grid>
      )}
    </Grid>
  );
}
