import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useMemo, useState } from 'react';
import {
  createReferralAgent,
  deactivateReferralAgent,
  getReferralAnalytics,
  listReferralAgentOrders,
  ReferralAgent,
  ReferralOrderRow,
  updateReferralAgent,
} from '@/services/referralAdminApi';
import { buildDeepReferralLink } from '@/utils/referral';
import { useToast } from '@/components/common/ToastProvider';

function money(cents: number) {
  return `${(Number(cents) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;
}

function emptyForm(): Record<string, unknown> {
  return {
    code: '',
    name: '',
    email: '',
    phone: '',
    commission_type: 'percent',
    commission_value: 5,
    cookie_days: 30,
    is_active: true,
    notes: '',
  };
}

function rowToForm(r: ReferralAgent): Record<string, unknown> {
  return {
    code: r.code,
    name: r.name,
    email: r.email || '',
    phone: r.phone || '',
    commission_type: r.commission_type,
    commission_value: r.commission_value,
    cookie_days: r.cookie_days,
    is_active: r.is_active,
    notes: r.notes || '',
  };
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

function HowToBlock() {
  return (
    <Accordion defaultExpanded sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight={700}>Как пользоваться — пошагово</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="subtitle2">1. Создайте агента</Typography>
        <Typography variant="body2" color="text.secondary">
          Кнопка «Агент» → укажите <b>код</b> (латиница, для URL), имя, % комиссии. Email/телефон
          агента — для антифрода: его собственные покупки не засчитаются.
        </Typography>

        <Typography variant="subtitle2">2. Выдайте ссылку</Typography>
        <Typography variant="body2" color="text.secondary">
          Скопируйте ссылку из таблицы (иконка копирования). Формат:{' '}
          <code>https://biletvsem.com/r/КОД?utm_source=referral&amp;…</code>
          <br />
          Deep-link на событие: добавьте{' '}
          <code>&amp;to=/ticket/slug-события</code> (генератор ниже у каждого агента в «Заказы» /
          при копировании).
        </Typography>

        <Typography variant="subtitle2">3. Что происходит у покупателя</Typography>
        <Typography variant="body2" color="text.secondary">
          Переход по ссылке → cookie <code>bv_ref</code> на 30 дней (настраивается) → при оформлении
          билета заказ привязывается к агенту → после <b>оплаты (paid)</b> появляется конверсия и
          комиссия.
        </Typography>

        <Typography variant="subtitle2">4. Где смотреть результат</Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <b>Клики / Люди</b> — переходы по ссылке (уники по visitor)
            </li>
            <li>
              <b>Чекауты</b> — созданные заказы с этим агентом (нажали «оплатить»)
            </li>
            <li>
              <b>Брошенные</b> — чекауты без оплаты (pending/failed)
            </li>
            <li>
              <b>Оплаты / GMV</b> — только <code>payment_status=paid</code>
            </li>
            <li>
              Кнопка <b>«Заказы»</b> — список заказов агента с суммами
            </li>
            <li>
              Колонка <b>Метрика</b> — визиты/юзеры из Яндекс.Метрики по utm_campaign (доп. слой;
              деньги — только из БД)
            </li>
          </ul>
        </Typography>

        <Typography variant="subtitle2">5. Быстрая проверка</Typography>
        <Typography variant="body2" color="text.secondary">
          Откройте ссылку агента в инкогнито → в таблице «Клики/Люди» +1 → оформите тестовый заказ до
          банка → «Чекауты/Брошенные» +1 → после реальной оплаты — «Оплаты».
        </Typography>

        <Alert severity="info" sx={{ mt: 1 }}>
          Успех агента = только оплаты. Last-click: последняя ссылка агента за окно cookie побеждает.
          Возврат/отмена paid → комиссия уходит в reversed.
        </Alert>
      </AccordionDetails>
    </Accordion>
  );
}

export function ReferralAgentsPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyForm);
  const [ordersAgent, setOrdersAgent] = useState<ReferralAgent | null>(null);
  const [deepPath, setDeepPath] = useState('/ticket/');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['referral-analytics', from, to],
    queryFn: () => getReferralAnalytics({ from, to }),
  });

  const ordersQ = useQuery({
    queryKey: ['referral-orders', ordersAgent?.id, from, to],
    queryFn: () => listReferralAgentOrders(ordersAgent!.id, { from, to }),
    enabled: !!ordersAgent?.id,
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (r: ReferralAgent) => {
    setEditingId(r.id);
    setForm(rowToForm(r));
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        code: String(form.code || '').trim().toLowerCase(),
        name: String(form.name || '').trim(),
        email: String(form.email || '').trim() || null,
        phone: String(form.phone || '').trim() || null,
        commission_type: form.commission_type as 'percent' | 'fixed',
        commission_value: Number(form.commission_value) || 0,
        cookie_days: Number(form.cookie_days) || 30,
        is_active: Boolean(form.is_active),
        notes: String(form.notes || '').trim() || null,
      };
      if (editingId) return updateReferralAgent(editingId, payload);
      return createReferralAgent(payload as typeof payload & { code: string; name: string });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referral-analytics'] });
      setOpen(false);
      showToast('Сохранено', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const deactivateMut = useMutation({
    mutationFn: deactivateReferralAgent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referral-analytics'] });
      setOpen(false);
      showToast('Агент деактивирован', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const totals = data?.totals;
  const agents = data?.agents || [];

  const copyText = async (text: string, okMsg = 'Скопировано') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(okMsg, 'success');
    } catch {
      showToast('Не удалось скопировать', 'error');
    }
  };

  const metrikaNote = useMemo(() => {
    if (!data?.metrika) return null;
    if (data.metrika.ok) return 'Метрика: данные по utm_campaign подтянуты';
    return `Метрика: ${data.metrika.reason || 'нет данных'} (деньги считаем только по БД)`;
  }, [data?.metrika]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Реферальные агенты
        </Typography>
        <TextField
          size="small"
          type="date"
          label="С"
          InputLabelProps={{ shrink: true }}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          size="small"
          type="date"
          label="По"
          InputLabelProps={{ shrink: true }}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Button variant="outlined" onClick={() => refetch()}>
          Обновить
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Агент
        </Button>
      </Box>

      <HowToBlock />

      {metrikaNote && (
        <Alert severity={data?.metrika?.ok ? 'success' : 'info'} sx={{ mb: 2 }}>
          {metrikaNote}
        </Alert>
      )}

      {totals && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Клики', value: totals.clicks },
            { label: 'Люди (уники)', value: totals.visitors },
            { label: 'Чекауты', value: totals.checkouts },
            { label: 'Брошенные', value: totals.abandoned },
            { label: 'Оплаты', value: totals.paidOrders },
            { label: 'GMV', value: money(totals.paidCents) },
            { label: 'Комиссия', value: money(totals.commissionCents) },
          ].map((c) => (
            <Grid item xs={6} sm={4} md={3} lg={true} key={c.label}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">
                    {c.label}
                  </Typography>
                  <Typography variant="h6">{c.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error)?.message || 'Ошибка загрузки'}
        </Alert>
      )}

      {!isLoading && (
        <Paper variant="outlined" sx={{ overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Агент</TableCell>
                <TableCell>Ссылка</TableCell>
                <TableCell align="right">Клики</TableCell>
                <TableCell align="right">Люди</TableCell>
                <TableCell align="right">Метрика</TableCell>
                <TableCell align="right">Чекауты</TableCell>
                <TableCell align="right">Брошенные</TableCell>
                <TableCell align="right">Оплаты</TableCell>
                <TableCell align="right">CR%</TableCell>
                <TableCell align="right">GMV</TableCell>
                <TableCell align="right">Комиссия</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {a.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Chip size="small" label={a.code} />
                        {!a.is_active && <Chip size="small" color="default" label="off" />}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 160,
                        }}
                        title={a.public_link}
                      >
                        {a.public_link}
                      </Typography>
                      <IconButton
                        size="small"
                        title="Копировать ссылку"
                        onClick={() => copyText(a.public_link, 'Ссылка скопирована')}
                      >
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="Открыть ссылку"
                        component="a"
                        href={a.public_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <OpenInNewIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{a.clicks}</TableCell>
                  <TableCell align="right">{a.visitors}</TableCell>
                  <TableCell align="right">
                    {a.metrika ? `${a.metrika.users}/${a.metrika.visits}` : '—'}
                  </TableCell>
                  <TableCell align="right">{a.checkouts}</TableCell>
                  <TableCell align="right">{a.abandoned}</TableCell>
                  <TableCell align="right">{a.paid_orders}</TableCell>
                  <TableCell align="right">{a.conversion_rate}%</TableCell>
                  <TableCell align="right">{money(a.paid_cents)}</TableCell>
                  <TableCell align="right">{money(a.commission_cents)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => setOrdersAgent(a)}>
                      Заказы
                    </Button>
                    <IconButton size="small" onClick={() => openEdit(a)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {agents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      Агентов пока нет — нажмите «Агент», создайте код и выдайте ссылку /r/код
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Редактировать агента' : 'Новый агент'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Код (для URL)"
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })
            }
            helperText="2–32 символа: a-z, 0-9, _, - → /r/код (не admin/api/orders…)"
            disabled={!!editingId}
            required
          />
          <TextField
            label="Имя"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <TextField
            label="Email (антифрод self-order)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextField
            label="Телефон (антифрод)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <FormControl>
            <InputLabel>Комиссия</InputLabel>
            <Select
              label="Комиссия"
              value={form.commission_type}
              onChange={(e) => setForm({ ...form, commission_type: e.target.value })}
            >
              <MenuItem value="percent">% от суммы заказа</MenuItem>
              <MenuItem value="fixed">Фикс, ₽ за заказ</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={form.commission_type === 'fixed' ? 'Сумма, ₽' : 'Процент'}
            type="number"
            value={form.commission_value}
            onChange={(e) => setForm({ ...form, commission_value: e.target.value })}
          />
          <TextField
            label="Окно cookie, дней"
            type="number"
            value={form.cookie_days}
            onChange={(e) => setForm({ ...form, cookie_days: e.target.value })}
          />
          <TextField
            label="Заметки"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            multiline
            minRows={2}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.is_active)}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
            }
            label="Активен"
          />
        </DialogContent>
        <DialogActions>
          {editingId && (
            <Button
              color="warning"
              onClick={() => {
                if (confirm('Деактивировать агента?')) deactivateMut.mutate(editingId);
              }}
            >
              Деактивировать
            </Button>
          )}
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!ordersAgent} onClose={() => setOrdersAgent(null)} fullWidth maxWidth="md">
        <DialogTitle>Заказы: {ordersAgent?.name}</DialogTitle>
        <DialogContent>
          {ordersAgent && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>
              <TextField
                size="small"
                label="Путь события для deep-link"
                value={deepPath}
                onChange={(e) => setDeepPath(e.target.value)}
                sx={{ minWidth: 260, flex: 1 }}
                helperText="Напр. /ticket/gamlet"
              />
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={() =>
                  copyText(
                    buildDeepReferralLink(ordersAgent.public_link, deepPath),
                    'Deep-link скопирован',
                  )
                }
              >
                Копировать deep-link
              </Button>
            </Box>
          )}
          {ordersQ.isLoading && <CircularProgress size={24} />}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Заказ</TableCell>
                <TableCell>Событие</TableCell>
                <TableCell>Клиент</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell align="right">Сумма</TableCell>
                <TableCell align="right">Комиссия</TableCell>
                <TableCell>Дата</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(ordersQ.data || []).map((o: ReferralOrderRow) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Button
                      size="small"
                      href={`/admin/orders/${encodeURIComponent(o.order_number)}`}
                      target="_blank"
                    >
                      {o.order_number}
                    </Button>
                  </TableCell>
                  <TableCell>{o.event_title || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                      {o.customer_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.customer_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={o.payment_status}
                      color={o.payment_status === 'paid' ? 'success' : 'default'}
                    />
                    {o.conversion_status && (
                      <Chip size="small" sx={{ ml: 0.5 }} label={o.conversion_status} />
                    )}
                  </TableCell>
                  <TableCell align="right">{money(o.total_cents)}</TableCell>
                  <TableCell align="right">
                    {o.commission_cents != null ? money(o.commission_cents) : '—'}
                  </TableCell>
                  <TableCell>
                    {o.created_at ? new Date(o.created_at).toLocaleString('ru-RU') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {!ordersQ.isLoading && (ordersQ.data || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary">Нет заказов за период</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrdersAgent(null)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
