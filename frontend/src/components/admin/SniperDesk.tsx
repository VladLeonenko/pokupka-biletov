import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Cookies from 'js-cookie';
import { getApiBase } from '@/utils/apiBase';

type Monitor = {
  name: string;
  label: string;
  show: string | null;
  venue: string | null;
  kind: 'show' | 'service';
  archived: boolean;
  status: string;
  online: boolean;
  health?: 'ok' | 'silent' | 'down';
  restarts: number;
  uptime: number;
  lastLog?: string;
};

type QueueRow = {
  id: string;
  platform: string;
  orderId: string | null;
  bookedAt: string | null;
  show: string;
  seats: string;
  buyer: string;
  amount: number | null;
  tickets: number | null;
  status: string;
  trackUntil: string | null;
  paymentUrl: string | null;
  paidAt: string | null;
  accountEmail: string | null;
  fee?: number | null;
  feeNote?: string;
};

type Buyer = {
  id: string;
  lk: string;
  fullName: string;
  email: string;
  phone: string;
  documentType: string;
  documentSeries: string;
  documentNumber: string;
  password: string;
};

type SessionStat = {
  sessionId: string;
  label: string;
  target: number;
  booked: number;
  open: boolean;
  minPrice: number | null;
};

type Captcha = { token: string; imageSrc: string; createdAt: string };

type QueueFilter = 'all' | 'pending' | 'expiring' | 'paid' | 'expired' | 'error';

const emptyBuyer = (): Buyer => ({
  id: '',
  lk: '',
  fullName: '',
  email: '',
  phone: '',
  documentType: 'PassportRf',
  documentSeries: '',
  documentNumber: '',
  password: '',
});

function headers(json = false): HeadersInit {
  const token = Cookies.get('auth_token') || '';
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${getApiBase()}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Ошибка ${res.status}`);
  return body;
}

function uptimeLabel(startedAt: number) {
  if (!startedAt) return '—';
  const min = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} ч`;
  return `${Math.floor(h / 24)} д`;
}

function whenLabel(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function holdLeft(iso: string | null) {
  if (!iso) return '—';
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return '—';
  if (ms <= 0) return 'просрочено';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  return `${h} ч ${m % 60} мин`;
}

function isExpiring(row: QueueRow) {
  if (row.status !== 'pending' || !row.trackUntil) return false;
  const left = Date.parse(row.trackUntil) - Date.now();
  return Number.isFinite(left) && left < 15 * 60_000;
}

function statusLabel(status: string) {
  if (status === 'paid') return 'оплачено';
  if (status === 'pending') return 'ждёт оплату';
  if (status === 'unchecked') return 'ещё не сверяли';
  if (status === 'lapsed' || status === 'expired' || status === 'gone') return 'холд истёк';
  if (status === 'error') return 'ошибка';
  return status || '—';
}

function matches(row: QueueRow, filter: QueueFilter) {
  if (filter === 'all') return true;
  if (filter === 'expiring') return isExpiring(row);
  if (filter === 'expired') return row.status === 'expired' || row.status === 'gone' || row.status === 'lapsed';
  if (filter === 'error') return row.status === 'error';
  return row.status === filter;
}

export function SniperDesk() {
  const [monitors, setMonitors] = useState<Monitor[] | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [sessions, setSessions] = useState<SessionStat[]>([]);
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyersMsg, setBuyersMsg] = useState<string | null>(null);
  const [buyersBusy, setBuyersBusy] = useState(false);
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [showService, setShowService] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [busyBot, setBusyBot] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [customSession, setCustomSession] = useState(false);
  const [buyerId, setBuyerId] = useState('');
  const [customBuyer, setCustomBuyer] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', phone: '' });
  const [shotBusy, setShotBusy] = useState(false);
  const [shotMsg, setShotMsg] = useState<string | null>(null);

  const loadMonitors = useCallback(async () => {
    try {
      const body = await api('/api/monitors', { headers: headers() });
      setMonitors(body.data ?? []);
    } catch (e) {
      setMonitors([]);
      setMsg(e instanceof Error ? e.message : 'Мониторы недоступны');
    }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const body = await api('/api/snipe/queue', { headers: headers() });
      setQueue(body.data ?? []);
    } catch {
      /* очередь не роняет страницу */
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const body = await api('/api/snipe/status', { headers: headers() });
      const list: SessionStat[] = body.data?.sessions ?? [];
      setSessions(list);
      setSessionId((prev) => prev || list[0]?.sessionId || '');
    } catch {
      /* */
    }
  }, []);

  const loadCaptcha = useCallback(async () => {
    try {
      const body = await api('/api/snipe/captcha', { headers: headers() });
      setCaptcha(body.data ?? null);
    } catch {
      /* */
    }
  }, []);

  const loadBuyers = useCallback(async () => {
    try {
      const body = await api('/api/snipe/buyers', { headers: headers() });
      const list: Buyer[] = body.data ?? [];
      setBuyers(list);
      setBuyerId((prev) => prev || list[0]?.id || '');
    } catch (e) {
      setBuyersMsg(e instanceof Error ? e.message : 'Справочник недоступен');
    }
  }, []);

  useEffect(() => {
    loadMonitors();
    loadQueue();
    loadStatus();
    loadCaptcha();
    loadBuyers();
    const a = setInterval(loadMonitors, 8000);
    const b = setInterval(loadQueue, 8000);
    const c = setInterval(loadCaptcha, 5000);
    const d = setInterval(loadStatus, 20000);
    return () => { clearInterval(a); clearInterval(b); clearInterval(c); clearInterval(d); };
  }, [loadMonitors, loadQueue, loadStatus, loadCaptcha, loadBuyers]);

  useEffect(() => {
    if (!captcha?.token || typeof Notification === 'undefined') return;
    const fire = () => new Notification('Снайпер ждёт капчу', { body: 'Открой «Снайпер мест» и введи символы.' });
    if (Notification.permission === 'granted') fire();
    else if (Notification.permission === 'default') Notification.requestPermission().then((p) => { if (p === 'granted') fire(); });
  }, [captcha?.token]);

  const botAction = async (name: string, act: 'start' | 'stop' | 'restart') => {
    if (act === 'stop' && !window.confirm(`Остановить ${name}?`)) return;
    setBusyBot(name);
    setMsg(null);
    try {
      await api(`/api/monitors/${name}/${act}`, { method: 'POST', headers: headers() });
      setMsg(act === 'stop' ? `Остановлен: ${name}` : act === 'restart' ? `Перезапущен: ${name}` : `Запущен: ${name}`);
      await loadMonitors();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusyBot(null);
    }
  };

  const submitCaptcha = async () => {
    if (!captcha || !captchaAnswer.trim()) return;
    setCaptchaBusy(true);
    try {
      await api('/api/snipe/captcha/answer', {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ token: captcha.token, answer: captchaAnswer.trim() }),
      });
      setCaptchaAnswer('');
      setMsg('Ответ ушёл боту');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Капча не отправилась');
    } finally {
      setCaptchaBusy(false);
    }
  };

  const checkPayments = async () => {
    setPayBusy(true);
    try {
      await api('/api/snipe/check-payments', { headers: headers() });
      await loadQueue();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Проверка оплат не прошла');
    } finally {
      setPayBusy(false);
    }
  };

  const markPaid = async (row: QueueRow) => {
    try {
      if (row.platform === 'ton' && row.accountEmail) {
        await api('/api/ton/mark-paid', { method: 'POST', headers: headers(true), body: JSON.stringify({ email: row.accountEmail }) });
      } else if (row.orderId) {
        await api('/api/snipe/mark-paid', {
          method: 'POST',
          headers: headers(true),
          body: JSON.stringify({ orderId: row.orderId, platform: row.platform }),
        });
      }
      await loadQueue();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Не отметил оплату');
    }
  };

  const unlockTon = async (email: string) => {
    try {
      await api('/api/ton/unlock', { method: 'POST', headers: headers(true), body: JSON.stringify({ email }) });
      await loadQueue();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Не сбросил аккаунт');
    }
  };

  const saveBuyers = async () => {
    setBuyersBusy(true);
    setBuyersMsg(null);
    try {
      const body = await api('/api/snipe/buyers', {
        method: 'PUT',
        headers: headers(true),
        body: JSON.stringify({ buyers }),
      });
      setBuyers(body.data ?? []);
      setBuyersMsg('Сохранено. Работающий бот подхватит список после перезапуска.');
    } catch (e) {
      setBuyersMsg(e instanceof Error ? e.message : 'Не сохранилось');
    } finally {
      setBuyersBusy(false);
    }
  };

  const shoot = async () => {
    const buyer = customBuyer ? null : buyers.find((b) => b.id === buyerId);
    const contact = buyer
      ? { name: buyer.fullName, email: buyer.email, phone: buyer.phone }
      : { name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim() };
    if (!sessionId.trim() || !contact.name || !contact.email) {
      setShotMsg('Нужны сессия, ФИО и почта');
      return;
    }
    setShotBusy(true);
    setShotMsg(null);
    try {
      const body = await api('/api/snipe', {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ sessionId: sessionId.trim(), pairCount: 1, contacts: [contact] }),
      });
      const ok = (body.data ?? []).filter((r: { success?: boolean }) => r.success).length;
      setShotMsg(ok ? `Забронировано: ${ok}` : 'Бронь не прошла — смотри очередь');
      await loadQueue();
    } catch (e) {
      setShotMsg(e instanceof Error ? e.message : 'Сбой');
    } finally {
      setShotBusy(false);
    }
  };

  const shows = (monitors ?? []).filter((m) => m.kind === 'show' && !m.archived);
  const archived = (monitors ?? []).filter((m) => m.archived);
  const service = (monitors ?? []).filter((m) => m.kind === 'service');
  const silent = (monitors ?? []).filter((m) => m.health === 'silent').length;
  const pending = queue.filter((r) => r.status === 'pending');
  const expiring = queue.filter(isExpiring);
  const feePaid = queue.reduce((s, r) => s + (r.fee || 0), 0);
  const visible = useMemo(() => queue.filter((r) => matches(r, filter)), [queue, filter]);
  const kabalaLine = sessions.map((s) => `${s.label} ${s.booked}/${s.target}${s.open ? ` · от ${s.minPrice ?? '?'}₽` : ''}`).join(' · ');

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={600}>Снайпер мест</Typography>
        <Typography variant="body2" color="text.secondary">
          Письма со ссылками на оплату уходят как раньше. Технические (капча, бот встал, «оплачено») — только на info@prime-coder.ru и vladislav.leonenko@bk.ru и в колокольчик.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Chip color={silent ? 'warning' : 'default'} label={`молчит ${silent}`} onClick={() => setShowService(true)} />
        <Chip color={pending.length ? 'warning' : 'default'} label={`ждут оплату ${pending.length}`} onClick={() => setFilter('pending')} />
        <Chip color={expiring.length ? 'error' : 'default'} label={`< 15 мин ${expiring.length}`} onClick={() => setFilter('expiring')} />
        <Chip color="success" label={`твои с оплаченных ${feePaid.toLocaleString('ru-RU')} ₽`} onClick={() => setFilter('paid')} />
        <Chip label="все" variant={filter === 'all' ? 'filled' : 'outlined'} onClick={() => setFilter('all')} />
      </Stack>

      {msg && <Alert severity="info" onClose={() => setMsg(null)}>{msg}</Alert>}

      {captcha && (
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'warning.main', borderWidth: 2 }}>
          <Typography fontWeight={600} color="warning.main" sx={{ mb: 1 }}>Капча — бот ждёт ввод</Typography>
          {captcha.imageSrc && (
            <Box sx={{ mb: 1.5, bgcolor: '#fff', p: 1, display: 'inline-block', borderRadius: 1 }}>
              <img src={captcha.imageSrc} alt="Капча" style={{ maxWidth: 280, display: 'block' }} />
            </Box>
          )}
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="Символы с картинки" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} />
            <Button variant="contained" color="warning" disabled={captchaBusy || !captchaAnswer.trim()} onClick={submitCaptcha}>
              {captchaBusy ? '…' : 'Отправить'}
            </Button>
          </Stack>
        </Paper>
      )}

      {monitors === null ? <CircularProgress size={22} /> : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1.5 }}>
          {shows.map((m) => (
            <BotCard key={m.name} m={m} busy={busyBot === m.name} extra={m.name.startsWith('sniper-monitor') && m.name !== 'sniper-monitor-wowcup' ? kabalaLine : ''} onAction={botAction} />
          ))}
        </Box>
      )}

      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={() => setShowService((v) => !v)}>Служебные ({service.length})</Button>
        <Button size="small" onClick={() => setShowArchive((v) => !v)}>Архив ({archived.length})</Button>
        <Button size="small" onClick={() => setShowManual((v) => !v)}>Ручной выстрел</Button>
      </Stack>
      <Collapse in={showService}>
        <Stack spacing={1}>{service.map((m) => <BotCard key={m.name} m={m} busy={busyBot === m.name} onAction={botAction} />)}</Stack>
      </Collapse>
      <Collapse in={showArchive}>
        <Stack spacing={1}>{archived.map((m) => <BotCard key={m.name} m={m} busy={busyBot === m.name} onAction={botAction} />)}</Stack>
      </Collapse>
      <Collapse in={showManual}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <TextField select size="small" label="Сессия" value={customSession ? '__custom' : sessionId} onChange={(e) => {
              if (e.target.value === '__custom') { setCustomSession(true); return; }
              setCustomSession(false);
              setSessionId(e.target.value);
            }}>
              {sessions.map((s) => <MenuItem key={s.sessionId} value={s.sessionId}>{s.label} · {s.sessionId}</MenuItem>)}
              <MenuItem value="__custom">другой sessionId</MenuItem>
            </TextField>
            {customSession && <TextField size="small" label="sessionId" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />}
            <TextField select size="small" label="Покупатель" value={customBuyer ? '__custom' : buyerId} onChange={(e) => {
              if (e.target.value === '__custom') { setCustomBuyer(true); return; }
              setCustomBuyer(false);
              setBuyerId(e.target.value);
            }}>
              {buyers.map((b) => <MenuItem key={b.id} value={b.id}>{b.fullName} · {b.email}</MenuItem>)}
              <MenuItem value="__custom">другой контакт</MenuItem>
            </TextField>
            {customBuyer && (
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <TextField size="small" label="ФИО" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <TextField size="small" label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                <TextField size="small" label="Телефон" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Stack>
            )}
            <Button variant="contained" disabled={shotBusy} onClick={shoot}>{shotBusy ? 'Бронирую…' : 'Забронировать одну пару'}</Button>
            {shotMsg && <Typography variant="body2">{shotMsg}</Typography>}
          </Stack>
        </Paper>
      </Collapse>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }} spacing={1}>
          <Typography fontWeight={600}>Очередь оплат</Typography>
          <Stack direction="row" spacing={1}>
            {(['pending', 'paid', 'expired', 'error'] as QueueFilter[]).map((f) => (
              <Chip key={f} size="small" label={statusLabel(f === 'expired' ? 'expired' : f === 'error' ? 'error' : f)} variant={filter === f ? 'filled' : 'outlined'} onClick={() => setFilter(f)} />
            ))}
            <Button size="small" variant="outlined" disabled={payBusy} onClick={checkPayments}>{payBusy ? 'Проверяю…' : 'Проверить Афишу'}</Button>
          </Stack>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Когда</TableCell>
                <TableCell>Шоу</TableCell>
                <TableCell>Места</TableCell>
                <TableCell>Покупатель</TableCell>
                <TableCell align="right">Сумма</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Холд</TableCell>
                <TableCell align="right">Твои</TableCell>
                <TableCell>Оплата</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.length === 0 && (
                <TableRow><TableCell colSpan={10}>Пусто</TableCell></TableRow>
              )}
              {visible.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{whenLabel(row.bookedAt)}</TableCell>
                  <TableCell>{row.show}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{row.seats || '—'}</TableCell>
                  <TableCell>{row.buyer || '—'}</TableCell>
                  <TableCell align="right">{row.amount != null ? `${row.amount.toLocaleString('ru-RU')} ₽` : '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={statusLabel(row.status)} color={row.status === 'paid' ? 'success' : row.status === 'pending' ? 'warning' : row.status === 'error' ? 'error' : 'default'} />
                  </TableCell>
                  <TableCell>{holdLeft(row.trackUntil)}</TableCell>
                  <TableCell align="right" title={row.feeNote || ''}>{row.fee != null ? `${row.fee.toLocaleString('ru-RU')} ₽` : '—'}</TableCell>
                  <TableCell>{row.paymentUrl ? <a href={row.paymentUrl} target="_blank" rel="noreferrer">открыть</a> : '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {row.status !== 'paid' && (row.orderId || row.accountEmail) && (
                        <Button size="small" color="success" onClick={() => markPaid(row)}>Оплатили</Button>
                      )}
                      {row.platform === 'ton' && row.accountEmail && (
                        <Button size="small" onClick={() => unlockTon(row.accountEmail!)}>Сбросить</Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography fontWeight={600}>Покупатели</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setBuyers((prev) => [...prev, emptyBuyer()])}>Добавить</Button>
            <Button size="small" variant="contained" disabled={buyersBusy} onClick={saveBuyers}>{buyersBusy ? '…' : 'Сохранить'}</Button>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Сюда сходятся контакты, старый бэкап контактов, паспорта и ЛК Театра Наций (почта + пароль). Пустое ФИО у ЛК — нормально, допиши. Паспорт уходит в файл паспортов только с номером, пароль — только в файл ЛК. Боты подхватывают список после рестарта.
        </Typography>
        <Stack spacing={1}>
          {buyers.map((b, i) => (
            <Stack key={b.id || `new-${i}`} direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <TextField size="small" label="ЛК" value={b.lk} onChange={(e) => setBuyers((prev) => prev.map((x, j) => j === i ? { ...x, lk: e.target.value } : x))} />
              <TextField size="small" label="ФИО" value={b.fullName} onChange={(e) => setBuyers((prev) => prev.map((x, j) => j === i ? { ...x, fullName: e.target.value } : x))} sx={{ minWidth: 180 }} />
              <TextField size="small" label="Серия" value={b.documentSeries} onChange={(e) => setBuyers((prev) => prev.map((x, j) => j === i ? { ...x, documentSeries: e.target.value } : x))} sx={{ maxWidth: 100 }} />
              <TextField size="small" label="Номер" value={b.documentNumber} onChange={(e) => setBuyers((prev) => prev.map((x, j) => j === i ? { ...x, documentNumber: e.target.value } : x))} sx={{ maxWidth: 120 }} />
              <TextField size="small" label="Телефон" value={b.phone} onChange={(e) => setBuyers((prev) => prev.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
              <TextField size="small" label="Почта" value={b.email} onChange={(e) => setBuyers((prev) => prev.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} sx={{ minWidth: 200 }} />
              <TextField size="small" label="Пароль ЛК" value={b.password || ''} onChange={(e) => setBuyers((prev) => prev.map((x, j) => j === i ? { ...x, password: e.target.value } : x))} sx={{ minWidth: 140 }} />
              <Button size="small" color="error" onClick={() => setBuyers((prev) => prev.filter((_, j) => j !== i))}>Удалить</Button>
            </Stack>
          ))}
        </Stack>
        {buyersMsg && <Typography variant="body2" sx={{ mt: 1 }}>{buyersMsg}</Typography>}
      </Paper>
    </Stack>
  );
}

function humanBot(m: Monitor) {
  if (m.name === 'bolshoi-monitor' && !m.online) {
    return 'На сервере не запущен. Код и тесты лежат локально, в pm2 процесса нет.';
  }
  if (!m.online) return m.status === 'not_found' ? 'Процесса на сервере нет' : 'Остановлен';
  if (m.health === 'silent') return 'Молчит: давно ничего не пишет в лог';
  const line = m.lastLog || '';
  if (/капч/i.test(line)) return 'Упёрся в капчу и ждёт ввод';
  if (/бронь|заброни|paymentUrl|✅/.test(line)) return 'Только что взял места';
  if (/закрыто|аншлаг|нет мест|0 мест/i.test(line)) return 'Смотрит зал, свободных мест нет';
  if (/ERR|error|403|QRATOR/i.test(line)) return 'Ошибка, в лог лучше заглянуть';
  return 'Работает и следит за залом';
}

function BotCard({ m, busy, extra, onAction }: { m: Monitor; busy: boolean; extra?: string; onAction: (name: string, act: 'start' | 'stop' | 'restart') => void }) {
  const health = m.health === 'silent' ? 'молчит' : m.online ? 'работает' : (m.status === 'not_found' ? 'не настроен' : 'остановлен');
  const color = m.health === 'silent' ? 'warning' : m.online ? 'success' : 'default';
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography fontWeight={600}>{m.show || m.label}</Typography>
          <Typography variant="caption" color="text.secondary">{m.venue || m.label} · аптайм {uptimeLabel(m.uptime)} · рестарты {m.restarts}</Typography>
        </Box>
        <Chip size="small" color={color} label={health} />
      </Stack>
      {extra && <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{extra}</Typography>}
      <Typography variant="body2" sx={{ mt: 0.5 }} title={m.lastLog || ''}>{humanBot(m)}</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button size="small" variant="contained" color="success" disabled={busy || m.online} onClick={() => onAction(m.name, 'start')}>Старт</Button>
        <Button size="small" variant="outlined" disabled={busy || !m.online} onClick={() => onAction(m.name, 'restart')}>Рестарт</Button>
        <Button size="small" variant="outlined" color="error" disabled={busy || !m.online} onClick={() => onAction(m.name, 'stop')}>Стоп</Button>
      </Stack>
    </Paper>
  );
}
