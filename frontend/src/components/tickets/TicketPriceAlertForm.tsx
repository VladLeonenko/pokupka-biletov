import { useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import { subscribeTicketPriceAlert } from '@/services/biletPublicApi';
import styles from './TicketPriceAlertForm.module.css';

type Props = {
  repertoireId: string;
  eventTitle: string;
  ticketPath: string;
  sessionDateTime?: string | null;
  /** Компактный вид — одна строка + кнопка */
  compact?: boolean;
  defaultMaxPrice?: number | null;
};

export function TicketPriceAlertForm({
  repertoireId,
  eventTitle,
  ticketPath,
  sessionDateTime,
  compact = false,
  defaultMaxPrice = null,
}: Props) {
  const [email, setEmail] = useState('');
  const [maxPrice, setMaxPrice] = useState(
    defaultMaxPrice != null && Number.isFinite(defaultMaxPrice) ? String(Math.round(defaultMaxPrice)) : '',
  );
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setMessage('');
    try {
      const r = await subscribeTicketPriceAlert({
        email: email.trim(),
        repertoireId,
        eventTitle,
        ticketPath,
        sessionDateTime: sessionDateTime ?? undefined,
        maxPriceRub: maxPrice.trim() ? Number(maxPrice) : undefined,
      });
      setStatus('sent');
      setMessage(r.message || 'Подписка оформлена');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Не удалось подписаться');
    }
  };

  if (status === 'sent') {
    return (
      <Alert severity="success" sx={{ mt: compact ? 0 : 2 }}>
        {message}
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={(e) => void submit(e)} className={compact ? styles.compact : styles.root}>
      {!compact ? (
        <>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActiveOutlinedIcon sx={{ color: 'var(--neg-orange, #ff4e18)' }} />
            Сообщить, когда появятся билеты
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
            Напишем на email, если откроется продажа или цена опустится ниже вашего бюджета.
          </Typography>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" className={styles.compactLead}>
          Нет подходящих мест? Уведомим по email.
        </Typography>
      )}
      <div className={styles.fields}>
        <TextField
          label="Email"
          type="email"
          size="small"
          required
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          fullWidth
          autoComplete="email"
        />
        <TextField
          label="Бюджет до, ₽"
          size="small"
          value={maxPrice}
          onChange={(ev) => setMaxPrice(ev.target.value.replace(/[^\d]/g, ''))}
          placeholder="Необязательно"
          fullWidth
        />
      </div>
      {status === 'error' && message ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {message}
        </Alert>
      ) : null}
      <Button
        type="submit"
        variant={compact ? 'outlined' : 'contained'}
        disabled={status === 'sending'}
        sx={
          compact
            ? { mt: 1.5, fontWeight: 700 }
            : {
                mt: 2,
                bgcolor: 'var(--neg-orange, #ff4e18)',
                color: '#fff',
                fontWeight: 800,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#e54414', boxShadow: 'none' },
              }
        }
      >
        {status === 'sending' ? 'Подписываем…' : 'Подписаться на уведомления'}
      </Button>
    </Box>
  );
}
