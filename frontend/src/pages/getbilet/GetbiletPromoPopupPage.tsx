import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  fetchPromoPopupCampaignStats,
  listPromoPopupCampaigns,
  type PromoPopupCampaignRow,
  updatePromoPopupCampaign,
} from '@/services/getbiletAdminApi';
import { useToast } from '@/components/common/ToastProvider';

function rowToForm(r: PromoPopupCampaignRow) {
  return {
    is_active: Boolean(r.is_active),
    headline: r.headline || '',
    body_text: r.body_text || '',
    cta_label: r.cta_label || 'Скопировать код',
    discount_kind: r.discount_kind || 'percent',
    discount_value: Number(r.discount_value) || 10,
    ttl_minutes: Number(r.ttl_minutes) || 60,
    venue_ilike: r.venue_ilike || '%Больш%',
    code_prefix: r.code_prefix || 'BOLSH10',
    delay_ms: Number(r.delay_ms) || 2500,
    notes: r.notes || '',
  };
}

export function GetbiletPromoPopupPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['promo-popup-campaigns'],
    queryFn: listPromoPopupCampaigns,
  });
  const campaign = rows[0] || null;
  const statsQ = useQuery({
    queryKey: ['promo-popup-stats', campaign?.id],
    queryFn: () => fetchPromoPopupCampaignStats(campaign!.id),
    enabled: Boolean(campaign?.id),
  });
  const [form, setForm] = useState(() =>
    campaign
      ? rowToForm(campaign)
      : {
          is_active: false,
          headline: '',
          body_text: '',
          cta_label: 'Скопировать код',
          discount_kind: 'percent',
          discount_value: 10,
          ttl_minutes: 60,
          venue_ilike: '%Больш%',
          code_prefix: 'BOLSH10',
          delay_ms: 2500,
          notes: '',
        },
  );

  useEffect(() => {
    if (campaign) setForm(rowToForm(campaign));
  }, [campaign]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!campaign) throw new Error('Кампания не найдена — примените ticket-миграцию 011');
      return updatePromoPopupCampaign(campaign.id, form);
    },
    onSuccess: () => {
      showToast('Сохранено', 'success');
      void qc.invalidateQueries({ queryKey: ['promo-popup-campaigns'] });
      void qc.invalidateQueries({ queryKey: ['promo-popup-stats'] });
    },
    onError: (e: Error) => showToast(e.message || 'Ошибка', 'error'),
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        >
          {(error as Error)?.message || 'Не удалось загрузить кампанию'}
        </Alert>
      </Box>
    );
  }

  if (!campaign) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Кампания не создана. На сервере: `node scripts/apply-ticket-migrations.js` (файл
          011_promo_popup.sql).
        </Alert>
      </Box>
    );
  }

  const stats = statsQ.data;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 860 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Промо-попап (Большой)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Персональный код на скидку с TTL. Показывается на страницах событий, у которых площадка
        подходит под шаблон venue_ilike. Код живёт не дольше указанного TTL с момента выдачи.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip label={`slug: ${campaign.slug}`} size="small" />
        <Chip
          label={form.is_active ? 'Активна' : 'Выключена'}
          color={form.is_active ? 'success' : 'default'}
          size="small"
        />
        {stats ? (
          <>
            <Chip label={`Выдано: ${stats.grants_total}`} size="small" variant="outlined" />
            <Chip label={`Живых: ${stats.grants_active}`} size="small" variant="outlined" />
            <Chip label={`Использовано: ${stats.used}`} size="small" variant="outlined" />
          </>
        ) : null}
      </Box>

      <Paper sx={{ p: 2.5 }}>
        <FormControlLabel
          control={
            <Switch
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
          }
          label="Показывать попап клиентам"
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Заголовок"
          value={form.headline}
          onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          minRows={4}
          label="Текст поздравления"
          value={form.body_text}
          onChange={(e) => setForm((f) => ({ ...f, body_text: e.target.value }))}
          sx={{ mb: 2 }}
          helperText="Литературный тон. Переносы строк сохраняются."
        />
        <TextField
          fullWidth
          label="Текст кнопки"
          value={form.cta_label}
          onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <TextField
            label="Скидка %"
            type="number"
            value={form.discount_value}
            onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
          />
          <TextField
            label="TTL, минут"
            type="number"
            value={form.ttl_minutes}
            onChange={(e) => setForm((f) => ({ ...f, ttl_minutes: Number(e.target.value) }))}
            helperText="Не больше 60 для этой акции"
          />
          <TextField
            label="Префикс кода"
            value={form.code_prefix}
            onChange={(e) =>
              setForm((f) => ({ ...f, code_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))
            }
          />
          <TextField
            label="Задержка показа, мс"
            type="number"
            value={form.delay_ms}
            onChange={(e) => setForm((f) => ({ ...f, delay_ms: Number(e.target.value) }))}
          />
        </Box>
        <TextField
          fullWidth
          label="Шаблон площадки (ILIKE)"
          value={form.venue_ilike}
          onChange={(e) => setForm((f) => ({ ...f, venue_ilike: e.target.value }))}
          sx={{ mb: 2 }}
          helperText="Например %Больш% — все события Большого (Историческая / Новая сцена)."
        />
        <TextField
          fullWidth
          label="Заметки"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          disabled={saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          {saveMut.isPending ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </Paper>
    </Box>
  );
}
