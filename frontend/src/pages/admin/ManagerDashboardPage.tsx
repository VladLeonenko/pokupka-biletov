import { Box, Card, CardContent, Grid, LinearProgress, Paper, Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getManagerDashboard } from '@/services/salesAnalyticsApi';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DescriptionIcon from '@mui/icons-material/Description';
import SchoolIcon from '@mui/icons-material/School';

function MetricCard({ label, value, plan, suffix = '' }: { label: string; value: number; plan?: number; suffix?: string }) {
  const pct = plan && plan > 0 ? Math.min(100, Math.round((value / plan) * 100)) : null;
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h4" sx={{ mt: 0.5 }}>
          {value.toLocaleString('ru-RU')}{suffix}
        </Typography>
        {plan != null && plan > 0 && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress variant="determinate" value={pct ?? 0} color={pct && pct >= 100 ? 'success' : 'primary'} sx={{ height: 6, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">План: {plan.toLocaleString('ru-RU')}{suffix}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function ManagerDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['manager-dashboard'], queryFn: () => getManagerDashboard() });

  if (isLoading || !data) {
    return <Box sx={{ p: 3 }}><Typography>Загрузка...</Typography></Box>;
  }

  const { adaptationPercent, newClients, salesRub, proposals, plan, planProgress } = data;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon /> Адаптация и план
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Прогресс адаптации</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <LinearProgress variant="determinate" value={adaptationPercent} sx={{ flex: 1, height: 8, borderRadius: 1 }} color="secondary" />
                    <Typography variant="h6">{adaptationPercent}%</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard label="Новых клиентов (месяц)" value={newClients} plan={planProgress.newClients.plan} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard label="Продажи (месяц)" value={salesRub} plan={planProgress.salesRub.plan} suffix=" ₽" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard label="КП создано (месяц)" value={proposals} plan={planProgress.deals.plan} />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Мои метрики</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <PeopleIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5">{newClients}</Typography>
                <Typography variant="caption">Клиентов заведено</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <TrendingUpIcon sx={{ fontSize: 32, color: 'success.main' }} />
                <Typography variant="h5">{salesRub.toLocaleString('ru-RU')} ₽</Typography>
                <Typography variant="caption">Продажи</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <DescriptionIcon sx={{ fontSize: 32, color: 'info.main' }} />
                <Typography variant="h5">{proposals}</Typography>
                <Typography variant="caption">КП</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <ShoppingCartIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
                <Typography variant="h5">{plan?.plan_calls ?? 0}</Typography>
                <Typography variant="caption">План звонков</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Быстрые ссылки</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Link component={RouterLink} to="/admin/clients" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Клиенты</Link>
            <span>·</span>
            <Link component={RouterLink} to="/admin/commercial-proposals" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>КП</Link>
            <span>·</span>
            <Link component={RouterLink} to="/admin/sales-academy" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Обучение</Link>
            <span>·</span>
            <Link component={RouterLink} to="/admin/funnels" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Воронки</Link>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
