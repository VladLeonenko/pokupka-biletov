import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import Cookies from 'js-cookie';
import { getApiBase } from '@/utils/apiBase';

type TonAccount = {
  status: string;
  seats?: string;
  paymentUrl?: string;
  sessionLabel?: string;
  lockedAt?: string;
  paidAt?: string;
};

export function TonSniperPanel() {
  const [data, setData] = useState<{ results: unknown[]; accounts: Record<string, TonAccount> } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/ton/results`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData((await res.json()).data ?? null);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const markPaid = async (email: string) => {
    setMsg(null);
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/ton/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setMsg(`Аккаунт ${email} разблокирован — можно бронировать снова.`);
        await load();
      } else {
        setMsg('Не удалось отметить оплату');
      }
    } catch {
      setMsg('Сеть недоступна');
    }
  };

  const accounts = data?.accounts ?? {};
  const locked = Object.entries(accounts).filter(([, a]) => a.status === 'locked');
  const total = Object.keys(accounts).length;

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Театр Наций — брони и статус аккаунтов
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Забронировано на аккаунтах: {total}. Нажми «Оплатили», когда оплатишь — бот снова сможет использовать этот аккаунт.
      </Typography>
      {locked.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Нет активных броней — все аккаунты свободны для бронирования.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Аккаунт</TableCell>
                <TableCell>Дата</TableCell>
                <TableCell>Места</TableCell>
                <TableCell>Ссылка на оплату</TableCell>
                <TableCell align="center">Действие</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locked.map(([email, a]) => (
                <TableRow key={email}>
                  <TableCell>{email}</TableCell>
                  <TableCell>{a.sessionLabel || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{a.seats || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {a.paymentUrl ? (
                      <a href={a.paymentUrl} target="_blank" rel="noreferrer">открыть</a>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="contained" color="success" onClick={() => markPaid(email)}>
                      Оплатили
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {msg && (
        <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
          {msg}
        </Typography>
      )}
    </Paper>
  );
}
