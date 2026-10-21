import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
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

type MonitorStatus = {
  name: string;
  label: string;
  status: string;
  online: boolean;
  restarts: number;
  uptime: number;
};

export function MonitorControlPanel() {
  const [monitors, setMonitors] = useState<MonitorStatus[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/monitors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setMonitors((await res.json()).data ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const action = async (name: string, act: 'start' | 'stop') => {
    setBusy(name);
    setMsg(null);
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/monitors/${name}/${act}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const parsed = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(`${act === 'start' ? 'Запущен' : 'Остановлен'}: ${name}`);
        await load();
      } else {
        setMsg(parsed.error || 'Ошибка');
      }
    } catch {
      setMsg('Сеть недоступна');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Управление сниперами (старт/стоп)
      </Typography>
      {monitors === null ? (
        <CircularProgress size={20} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Монитор</TableCell>
                <TableCell align="center">Статус</TableCell>
                <TableCell align="center">Рестарты</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {monitors.map((m) => (
                <TableRow key={m.name}>
                  <TableCell>{m.label}</TableCell>
                  <TableCell align="center">
                    {m.online ? (
                      <Chip size="small" color="success" label="работает" />
                    ) : (
                      <Chip size="small" color="default" label={m.status === 'not_found' ? 'не настроен' : 'остановлен'} />
                    )}
                  </TableCell>
                  <TableCell align="center">{m.restarts}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={busy === m.name || m.online}
                        onClick={() => action(m.name, 'start')}
                      >
                        {busy === m.name ? '…' : 'Запустить'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={busy === m.name || !m.online}
                        onClick={() => action(m.name, 'stop')}
                      >
                        {busy === m.name ? '…' : 'Стоп'}
                      </Button>
                    </Stack>
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
