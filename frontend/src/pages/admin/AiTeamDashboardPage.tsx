import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WarningIcon from '@mui/icons-material/Warning';
import PersonIcon from '@mui/icons-material/Person';
import { listAiTeamSubscriptions, listAiTeamIncidents, type AiTeamSubscriptionAdmin, type AiTeamIncident } from '@/services/aiTeamApi';

export default function AiTeamDashboardPage() {
  const { data: subscriptions = [], isLoading: subsLoading, error: subsError } = useQuery<AiTeamSubscriptionAdmin[]>({
    queryKey: ['aiTeamAdminSubscriptions'],
    queryFn: () => listAiTeamSubscriptions('active'),
  });

  const { data: incidents = [], isLoading: incLoading, error: incError } = useQuery<AiTeamIncident[]>({
    queryKey: ['aiTeamAdminIncidents'],
    queryFn: () => listAiTeamIncidents({ status: 'open' }),
  });

  const totalActive = subscriptions.length;
  const juniors = subscriptions.filter((s) => s.planCode === 'JUNIOR').length;
  const pros = subscriptions.filter((s) => s.planCode === 'PRO').length;
  const enterprises = subscriptions.filter((s) => s.planCode === 'ENTERPRISE').length;

  const openQualityIssues = incidents.filter((i) => i.type === 'QUALITY').length;
  const openSilenceIssues = incidents.filter((i) => i.type === 'SILENCE').length;
  const aggressiveClients = incidents.filter((i) => i.type === 'AGGRESSIVE').length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartToyIcon /> AI Boost Team (админ)
      </Typography>

      {(subsLoading || incLoading) && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {(subsError || incError) && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error">Не удалось загрузить данные AI Team</Alert>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Активных клиентов AI Team
              </Typography>
              <Typography variant="h4">{totalActive}</Typography>
              <Typography variant="caption" color="text.secondary">
                J: {juniors} · PRO: {pros} · ENT: {enterprises}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Проблемы качества
              </Typography>
              <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color={openQualityIssues > 0 ? 'error' : 'disabled'} /> {openQualityIssues}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Открытые инциденты QUALITY
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Клиенты в тишине &gt; 24ч
              </Typography>
              <Typography variant="h4">{openSilenceIssues}</Typography>
              <Typography variant="caption" color="text.secondary">
                Открытые SILENCE инциденты
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Агрессивные клиенты
              </Typography>
              <Typography variant="h4">{aggressiveClients}</Typography>
              <Typography variant="caption" color="text.secondary">
                Открытые AGGRESSIVE инциденты
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Подписки AI Boost Team
              </Typography>
              {!subscriptions.length ? (
                <Typography color="text.secondary">
                  Пока нет активных подписок AI Team
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Клиент</TableCell>
                      <TableCell>Пользователь</TableCell>
                      <TableCell>Тариф</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Тип задач (JUNIOR)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subscriptions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {s.client_name || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {s.client_email || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PersonIcon fontSize="small" />
                            <Box>
                              <Typography variant="body2">{s.user_name || '—'}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {s.user_email || '—'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.planCode}
                            size="small"
                            color={
                              s.planCode === 'ENTERPRISE'
                                ? 'secondary'
                                : s.planCode === 'PRO'
                                ? 'primary'
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.status}
                            size="small"
                            color={s.status === 'active' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {s.planCode === 'JUNIOR'
                              ? s.primaryTaskType || 'не выбран'
                              : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Red flags / инциденты
              </Typography>
              {!incidents.length ? (
                <Typography color="text.secondary">
                  Нет открытых инцидентов AI Team
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
                  {incidents.map((i) => (
                    <Box
                      key={i.id}
                      sx={{
                        mb: 1.5,
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor:
                          i.severity === 'high'
                            ? 'error.light'
                            : i.severity === 'medium'
                            ? 'warning.light'
                            : 'background.default',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="subtitle2">
                          {i.type}
                        </Typography>
                        <Chip
                          label={i.severity}
                          size="small"
                          color={
                            i.severity === 'high'
                              ? 'error'
                              : i.severity === 'medium'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {i.description || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {i.client_name || 'Клиент'} ({i.client_email || '—'}) ·{' '}
                        {new Date(i.created_at).toLocaleString('ru-RU')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}






