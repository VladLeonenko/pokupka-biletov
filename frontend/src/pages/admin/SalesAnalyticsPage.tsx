import { Box, Card, CardContent, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalesOverview, savePlan, getManagerDynamics, getPlans } from '@/services/salesAnalyticsApi';
import { listAdmins } from '@/services/adminsApi';
import AddIcon from '@mui/icons-material/Add';
import { useToast } from '@/components/common/ToastProvider';

const MONTHS_BACK = 12;
function getMonthOptions(): string[] {
  const opts: string[] = [];
  const now = new Date();
  for (let i = 0; i < MONTHS_BACK; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return opts;
}

export function SalesAnalyticsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [planModal, setPlanModal] = useState<{ userId: number; name: string; month: string } | null>(null);
  const [planCalls, setPlanCalls] = useState(0);
  const [planSales, setPlanSales] = useState(0);
  const [planDeals, setPlanDeals] = useState(0);
  const [planClients, setPlanClients] = useState(0);
  const [addPlanManagerId, setAddPlanManagerId] = useState<number | ''>('');
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);

  const { data: overview } = useQuery({ queryKey: ['sales-overview', selectedMonth], queryFn: () => getSalesOverview(selectedMonth) });
  const { data: plans } = useQuery({ queryKey: ['plans', selectedMonth], queryFn: () => getPlans(selectedMonth) });
  const { data: dynamics } = useQuery({ queryKey: ['manager-dynamics', MONTHS_BACK], queryFn: () => getManagerDynamics(MONTHS_BACK) });
  const { data: managers } = useQuery({ queryKey: ['admins'], queryFn: listAdmins });
  const plansByUserId = (plans || []).reduce<Record<number, any>>((acc, p) => ({ ...acc, [p.user_id]: p }), {});
  const savePlanMutation = useMutation({
    mutationFn: savePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['manager-dynamics'] });
      queryClient.refetchQueries({ queryKey: ['plans', selectedMonth] });
      queryClient.refetchQueries({ queryKey: ['sales-overview', selectedMonth] });
      setPlanModal(null);
      showToast('План сохранён', 'success');
    },
    onError: (e) => showToast(e.message, 'error'),
  });

  const salesManagers = managers?.filter((m) => m.role === 'sales_manager') ?? [];

  const handleSavePlan = () => {
    if (!planModal) return;
    savePlanMutation.mutate({
      user_id: planModal.userId,
      month: planModal.month,
      plan_calls: planCalls,
      plan_sales_rub: planSales,
      plan_deals: planDeals,
      plan_new_clients: planClients,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Аналитика продаж</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Общий срез по менеджерам, планы на месяц
      </Typography>

      {overview?.totals && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Всего клиентов (мес)</Typography>
                <Typography variant="h4">{overview.totals.newClients}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Продажи (мес)</Typography>
                <Typography variant="h4">{overview.totals.salesRub.toLocaleString('ru-RU')} ₽</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Менеджеры</Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Месяц</InputLabel>
              <Select value={selectedMonth} label="Месяц" onChange={(e) => setSelectedMonth(e.target.value)}>
                {monthOptions.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              const m = salesManagers.find((x) => x.id === addPlanManagerId) || salesManagers[0];
              if (m) {
                setPlanModal({ userId: m.id, name: m.name || m.email, month: selectedMonth });
                setPlanCalls(0);
                setPlanSales(0);
                setPlanDeals(0);
                setPlanClients(0);
              }
            }}
          >
            Установить план
          </Button>
          {salesManagers.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 180, ml: 1 }}>
              <InputLabel>Менеджер</InputLabel>
              <Select
                value={addPlanManagerId || salesManagers[0]?.id || ''}
                label="Менеджер"
                onChange={(e) => setAddPlanManagerId(Number(e.target.value))}
              >
                {salesManagers.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.name || m.email}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Менеджер</TableCell>
              <TableCell align="right">Клиентов</TableCell>
              <TableCell align="right">Продажи</TableCell>
              <TableCell>План</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overview?.managers?.map((m) => {
              const plan = m.plan || plansByUserId[m.userId];
              return (
              <TableRow key={m.userId}>
                <TableCell>{m.name}</TableCell>
                <TableCell align="right">{m.newClients}</TableCell>
                <TableCell align="right">{m.salesRub.toLocaleString('ru-RU')} ₽</TableCell>
                <TableCell>
                  {plan ? (
                    [
                      plan.plan_new_clients != null && `Клиенты: ${plan.plan_new_clients}`,
                      plan.plan_sales_rub != null && `Продажи: ${plan.plan_sales_rub.toLocaleString('ru-RU')} ₽`,
                      plan.plan_deals != null && `Сделки: ${plan.plan_deals}`,
                      plan.plan_calls != null && `Звонки: ${plan.plan_calls}`,
                    ].filter(Boolean).join(' · ') || '—'
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => {
                    const p = m.plan || plansByUserId[m.userId];
                    setPlanModal({ userId: m.userId, name: m.name, month: selectedMonth });
                    setPlanCalls(p?.plan_calls ?? 0);
                    setPlanSales(p?.plan_sales_rub ?? 0);
                    setPlanDeals(p?.plan_deals ?? 0);
                    setPlanClients(p?.plan_new_clients ?? 0);
                  }}>
                    План
                  </Button>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </Paper>

      {dynamics?.dynamics && dynamics.dynamics.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Динамика по менеджерам</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Менеджер</TableCell>
                  {dynamics.dynamics[0]?.months.map((mo) => (
                    <TableCell key={mo.month} align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {mo.month}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dynamics.dynamics.map((d) => (
                  <TableRow key={d.userId}>
                    <TableCell>{d.name}</TableCell>
                    {d.months.map((mo) => (
                      <TableCell key={mo.month} align="right" sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {mo.newClients} кл{mo.planNewClients != null ? ` / ${mo.planNewClients}` : ''}
                        <br />
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          {(mo.salesRub / 1000).toFixed(0)}k ₽{mo.planSalesRub != null ? ` / ${(mo.planSalesRub / 1000).toFixed(0)}k` : ''}
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      <Dialog open={!!planModal} onClose={() => setPlanModal(null)} maxWidth="sm" fullWidth disableScrollLock>
        <DialogTitle>План на {planModal?.month}: {planModal?.name}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField fullWidth label="Звонков" type="number" value={planCalls} onChange={(e) => setPlanCalls(parseInt(e.target.value) || 0)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Продажи (₽)" type="number" value={planSales} onChange={(e) => setPlanSales(parseInt(e.target.value) || 0)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Сделок/КП" type="number" value={planDeals} onChange={(e) => setPlanDeals(parseInt(e.target.value) || 0)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Новых клиентов" type="number" value={planClients} onChange={(e) => setPlanClients(parseInt(e.target.value) || 0)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanModal(null)}>Отмена</Button>
          <Button variant="contained" onClick={handleSavePlan} disabled={savePlanMutation.isPending}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
