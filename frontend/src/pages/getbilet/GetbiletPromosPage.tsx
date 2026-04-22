import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import { createPromo, deletePromo, listPromos, PromoRow, updatePromo } from '@/services/getbiletAdminApi';
import { useToast } from '@/components/common/ToastProvider';

function emptyForm(): Record<string, unknown> {
  return {
    code: '',
    discount_kind: 'percent',
    discount_value: 0,
    max_uses_total: '',
    max_uses_per_user: '',
    valid_from: '',
    valid_until: '',
    min_order_amount: '',
    is_active: true,
    notes: '',
  };
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rowToForm(r: PromoRow): Record<string, unknown> {
  return {
    code: r.code,
    discount_kind: r.discount_kind,
    discount_value: Number(r.discount_value),
    max_uses_total: r.max_uses_total ?? '',
    max_uses_per_user: r.max_uses_per_user ?? '',
    valid_from: toDatetimeLocal(r.valid_from),
    valid_until: toDatetimeLocal(r.valid_until),
    min_order_amount: r.min_order_amount ?? '',
    is_active: r.is_active,
    notes: r.notes ?? '',
  };
}

function fmt(dt: string | null) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('ru-RU');
  } catch {
    return dt;
  }
}

export function GetbiletPromosPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['getbilet-promos'],
    queryFn: listPromos,
  });
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyForm);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (r: PromoRow) => {
    setEditingId(r.id);
    setForm(rowToForm(r));
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editingId) return updatePromo(editingId, form);
      return createPromo(form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['getbilet-promos'] });
      setOpen(false);
      showToast('Сохранено', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const delMut = useMutation({
    mutationFn: deletePromo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['getbilet-promos'] });
      showToast('Удалено', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" onClose={() => refetch()}>
          {(error as Error)?.message || 'Ошибка'}
        </Alert>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Таблица getbilet_promo_codes — примените миграции ticket-БД; при одной БД с CRM:{' '}
          <code>GETBILET_USE_MAIN_DATABASE=1</code> и <code>npm run migrate:tickets</code>.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Промокоды GetBilet
        </Typography>
        <Button variant="contained" onClick={openNew}>
          Новый промокод
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Скидка в процентах или фикс в валюте; лимиты и окно действия. Код без учёта регистра (хранится в верхнем
        регистре).
      </Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Код</TableCell>
              <TableCell>Скидка</TableCell>
              <TableCell>Лимиты</TableCell>
              <TableCell>Срок</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Нет промокодов
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.code}</TableCell>
                  <TableCell>
                    {r.discount_kind === 'percent'
                      ? `${Number(r.discount_value)}%`
                      : `${Number(r.discount_value)} ₽`}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                      всего: {r.max_uses_total ?? '∞'}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      на пользователя: {r.max_uses_per_user ?? '∞'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      использовано: {r.uses_count}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                      {fmt(r.valid_from)} — {fmt(r.valid_until)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {r.is_active ? (
                      <Chip size="small" label="Активен" color="success" variant="outlined" />
                    ) : (
                      <Chip size="small" label="Выкл" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(r)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (confirm(`Удалить промокод ${r.code}?`)) delMut.mutate(r.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Редактирование промокода' : 'Новый промокод'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Код"
            value={String(form.code ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            disabled={!!editingId}
            required
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Тип скидки</InputLabel>
            <Select
              value={String(form.discount_kind ?? 'percent')}
              label="Тип скидки"
              onChange={(e) => setForm((f) => ({ ...f, discount_kind: e.target.value }))}
            >
              <MenuItem value="percent">Процент</MenuItem>
              <MenuItem value="fixed">Фикс (₽)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            type="number"
            label="Значение"
            value={form.discount_value ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
            inputProps={{ step: '0.01', min: 0 }}
            fullWidth
          />
          <TextField
            type="number"
            label="Макс. использований (всего)"
            value={form.max_uses_total ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, max_uses_total: e.target.value }))}
            helperText="Пусто — без лимита"
          />
          <TextField
            type="number"
            label="Макс. на одного пользователя"
            value={form.max_uses_per_user ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, max_uses_per_user: e.target.value }))}
          />
          <TextField
            type="datetime-local"
            label="Действует с"
            value={String(form.valid_from ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            type="datetime-local"
            label="Действует до"
            value={String(form.valid_until ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            type="number"
            label="Мин. сумма заказа (₽)"
            value={form.min_order_amount ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
            inputProps={{ step: '0.01', min: 0 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.is_active)}
                onChange={(_, v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            }
            label="Активен"
          />
          <TextField
            label="Заметки"
            value={String(form.notes ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            multiline
            minRows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
