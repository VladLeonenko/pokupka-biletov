import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { getProjectsAdminOverview } from '@/services/projectsApi';

export default function ProjectsDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projectsAdminOverview'],
    queryFn: getProjectsAdminOverview,
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Проектные услуги / Upsell
      </Typography>

      {isLoading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Не удалось загрузить статистику по проектам
        </Alert>
      )}

      {data && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Активных проектов
                  </Typography>
                  <Typography variant="h5">
                    {data.totals.totalActiveProjects.toLocaleString('ru-RU')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Потенциал допродаж
                  </Typography>
                  <Typography variant="h5">
                    {(data.totals.upsellPotentialCents / 100).toLocaleString('ru-RU')} ₽
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Конверсия в апгрейд
                  </Typography>
                  <Typography variant="h5">
                    {(data.totals.conversion * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data.totals.accepted} / {data.totals.accepted + data.totals.declined} офферов
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Средний чек допродаж
                  </Typography>
                  <Typography variant="h5">
                    {(data.totals.avgUpsellCheckCents / 100).toLocaleString('ru-RU')} ₽
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                <Typography variant="h6">Alerts</Typography>
                <Chip label={data.alerts.length} size="small" />
              </Box>
              {data.alerts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Критичных сигналов сейчас нет.
                </Typography>
              ) : (
                <List>
                  {data.alerts.map((alert, idx) => (
                    <ListItem key={idx} alignItems="flex-start">
                      <ListItemText
                        primary={alert.message}
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {alert.type} · {alert.clientName}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}

