import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
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
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Cookies from 'js-cookie';
import { getApiBase } from '@/utils/apiBase';

type TestUser = { name: string; email: string; phone: string };

type FieldErrors = { name?: string; email?: string; phone?: string };

type SnipeReportRow = {
  email: string;
  success: boolean;
  seats: string | null;
  totalPrice: number | null;
  paymentUrl: string | null;
  error?: string;
};

type TonAccount = {
  status: string;
  seats?: string;
  paymentUrl?: string;
  sessionLabel?: string;
  lockedAt?: string;
  paidAt?: string;
};

const MAX_USERS = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SNIPE_PATH = '/api/snipe';
const DEFAULT_SESSION_ID = '132338466';
const DEFAULT_APP_KEY = 'a4b793a1-fe7b-4dfd-9dff-67fd74107277';
const emptyUser = (): TestUser => ({ name: '', email: '', phone: '' });

function validateUser(user: TestUser): FieldErrors {
  const errors: FieldErrors = {};
  if (!user.name.trim()) errors.name = 'Укажите имя';
  if (!EMAIL_RE.test(user.email.trim())) errors.email = 'Некорректный email';
  if (user.phone.replace(/\D/g, '').length < 10) errors.phone = 'Телефон: минимум 10 цифр';
  return errors;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /failed to fetch|networkerror|load failed|сетью|network/i.test(msg);
}

export function CheckoutLoadTestPanel() {
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION_ID);
  const [appKey, setAppKey] = useState(DEFAULT_APP_KEY);
  const [users, setUsers] = useState<TestUser[]>([emptyUser()]);
  const [touched, setTouched] = useState<boolean[]>([false]);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [rows, setRows] = useState<SnipeReportRow[] | null>(null);
  const [history, setHistory] = useState<Array<{ sessionId: string; bookedAt: string; date?: string | null; label?: string; spectacle?: string | null; results: Array<{ name?: string; email?: string; phone?: string; seats: string; totalPrice: number; paymentUrl: string; orderId?: string; sector?: string; row?: string; seatNums?: string; paymentStatus?: string | null; paymentManual?: boolean }>; errors: Array<{ name?: string; email?: string; error: string }> }>>([]);

  const loadHistory = async () => {
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/snipe/results`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const parsed = await res.json();
        setHistory(parsed.data ?? []);
      }
    } catch {}
  };

  const checkPayments = async () => {
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/snipe/check-payments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) await loadHistory();
    } catch {}
  };

  const markKabalaPaid = async (orderId: string) => {
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/snipe/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) await loadHistory();
    } catch {}
  };

  useEffect(() => { loadHistory(); }, []);

  const [tonAccounts, setTonAccounts] = useState<Record<string, TonAccount> | null>(null);
  const loadTon = async () => {
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/ton/results`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setTonAccounts((await res.json()).data?.accounts ?? {});
    } catch {}
  };
  const markTonPaid = async (email: string) => {
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/ton/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email }),
      });
      if (res.ok) await loadTon();
    } catch {}
  };
  useEffect(() => {
    loadTon();
    const id = setInterval(loadTon, 5000);
    return () => clearInterval(id);
  }, []);

  const [captcha, setCaptcha] = useState<{ token: string; imageSrc: string; createdAt: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaSending, setCaptchaSending] = useState(false);
  const [captchaMsg, setCaptchaMsg] = useState<string | null>(null);

  const loadCaptcha = async () => {
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/snipe/captcha`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const parsed = await res.json();
        setCaptcha(parsed.data ?? null);
      }
    } catch {}
  };

  const submitCaptcha = async () => {
    if (!captcha || !captchaAnswer.trim()) return;
    setCaptchaSending(true);
    setCaptchaMsg(null);
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/snipe/captcha/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ token: captcha.token, answer: captchaAnswer.trim() }),
      });
      const parsed = await res.json().catch(() => ({}));
      if (res.ok) {
        setCaptchaMsg('Ответ отправлен снайперу — он подхватит и повторит бронь.');
        setCaptchaAnswer('');
      } else {
        setCaptchaMsg(parsed.error || 'Не удалось отправить ответ');
      }
    } catch {
      setCaptchaMsg('Сеть недоступна');
    } finally {
      setCaptchaSending(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
    const id = setInterval(loadCaptcha, 5000);
    return () => clearInterval(id);
  }, []);

  const [battleStatus, setBattleStatus] = useState<{
    sessions: Array<{ sessionId: string; label: string; target: number; booked: number; remaining: number; available: number; minPrice: number | null; open: boolean }>;
    contacts: Array<{ name: string; email: string; phone: string }>;
  } | null>(null);

  const loadStatus = async () => {
    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/snipe/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const parsed = await res.json();
        setBattleStatus(parsed.data ?? null);
      }
    } catch {}
  };

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 5000);
    return () => clearInterval(id);
  }, []);

  // Группировка истории по спектаклю + дате, с разворачиванием/сворачиванием.
  const historyGroups = useMemo(() => {
    const map = new Map<string, { key: string; spectacle: string; label: string; records: typeof history; totalOrders: number; totalSum: number }>();
    for (const rec of history) {
      const spectacle = rec.spectacle || 'Без спектакля';
      const label = rec.label || rec.date?.slice(0, 10) || rec.sessionId;
      const key = `${spectacle}::${label}`;
      if (!map.has(key)) map.set(key, { key, spectacle, label, records: [], totalOrders: 0, totalSum: 0 });
      const g = map.get(key)!;
      g.records.push(rec);
      g.totalOrders += rec.results.length;
      g.totalSum += rec.results.reduce((s, r) => s + (r.totalPrice || 0), 0);
    }
    return [...map.values()];
  }, [history]);

  // По умолчанию всё свёрнуто (expanded = {}).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isExpanded = (key: string) => !!expanded[key];
  const toggleGroup = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));
  const collapseAll = () => setExpanded({});
  const expandAll = () => setExpanded(Object.fromEntries(historyGroups.map((g) => [g.key, true])));

  // Театр Наций: активные брони (аккаунты в статусе locked) — общий раздел «История бронирований».
  const tonLocked = useMemo(() => {
    if (!tonAccounts) return [];
    return Object.entries(tonAccounts)
      .filter(([, a]) => a.status === 'locked')
      .map(([email, a]) => ({ email, ...a }));
  }, [tonAccounts]);

  const fieldErrors = useMemo(() => users.map(validateUser), [users]);
  const hasInvalidRow = fieldErrors.some((e) => Object.keys(e).length > 0);
  const overLimit = users.length > MAX_USERS;
  const runDisabled = loading || overLimit || users.length === 0;

  const updateUser = (index: number, field: keyof TestUser, value: string) => {
    setUsers((prev) => prev.map((u, i) => (i === index ? { ...u, [field]: value } : u)));
  };

  const markTouched = (index: number) => {
    setTouched((prev) => prev.map((t, i) => (i === index ? true : t)));
  };

  const addUser = () => {
    if (users.length >= MAX_USERS) return;
    setUsers((prev) => [...prev, emptyUser()]);
    setTouched((prev) => [...prev, false]);
  };

  const removeUser = (index: number) => {
    if (users.length <= 1) return;
    setUsers((prev) => prev.filter((_, i) => i !== index));
    setTouched((prev) => prev.filter((_, i) => i !== index));
  };

  const run = async () => {
    setShowAllErrors(true);
    if (hasInvalidRow || overLimit) return;

    setLoading(true);
    setNetworkError(null);
    setRows(null);

    try {
      const token = Cookies.get('auth_token') || null;
      const res = await fetch(`${getApiBase()}/api/snipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId.trim(),
          appKey: appKey.trim() || undefined,
          pairCount: 1,
          contacts: [{
            name: users[0].name.trim(),
            email: users[0].email.trim(),
            phone: users[0].phone.trim(),
          }],
        }),
      });

      const text = await res.text();
      let parsed: { success?: boolean; data?: SnipeReportRow[]; error?: string } = {};
      
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(res.ok ? 'Некорректный JSON в ответе снайпера' : `Ошибка ${res.status}`);
        }
      }
      
      if (!res.ok) {
        throw new Error(parsed.error || `Ошибка ${res.status}`);
      }
      
      setRows(parsed.data ?? []);
    } catch (err) {
      setNetworkError(isNetworkError(err) ? 'Сеть недоступна' : err instanceof Error ? err.message : 'Сеть недоступна');
    } finally {
      setLoading(false);
    }
  };


  return (
    <Stack spacing={3}>
      {battleStatus && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            «Кабала святош» — боевой статус
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Сессия</TableCell>
                  <TableCell align="center">Цель</TableCell>
                  <TableCell align="center">Забронировано</TableCell>
                  <TableCell align="center">Осталось</TableCell>
                  <TableCell align="center">Доступно</TableCell>
                  <TableCell>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {battleStatus.sessions.map((s) => (
                  <TableRow key={s.sessionId}>
                    <TableCell>{s.label}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{s.sessionId}</TableCell>
                    <TableCell align="center">{s.target} пар</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>{s.booked}</TableCell>
                    <TableCell align="center">{s.remaining}</TableCell>
                    <TableCell align="center">{s.available}</TableCell>
                    <TableCell>
                      {s.open ? (
                        <Chip size="small" color="success" label={`ОТКРЫТО · от ${s.minPrice ?? '?'}₽`} />
                      ) : (
                        <Chip size="small" color="default" label="закрыто" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
            Наши почты ({battleStatus.contacts.length}):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {battleStatus.contacts.map((c, i) => (
              <Chip key={i} size="small" label={c.email} title={`${c.name} · ${c.phone}`} />
            ))}
          </Box>
        </Paper>
      )}

      {captcha ? (
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'warning.main', borderWidth: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} color="warning.main" sx={{ mb: 1 }}>
            ⚠️ Требуется ручное решение капчи — снайпер ждёт ввода
          </Typography>
          {captcha.imageSrc ? (
            <Box sx={{ mb: 1.5, backgroundColor: '#fff', p: 1, display: 'inline-block', borderRadius: 1 }}>
              <img src={captcha.imageSrc} alt="Капча" style={{ maxWidth: 280, height: 'auto', display: 'block' }} />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Изображение капчи недоступно — см. файлы в backend/data/captcha/.
            </Typography>
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Введите цифры/буквы с картинки"
              size="small"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              disabled={captchaSending}
              autoFocus
            />
            <Button variant="contained" color="warning" onClick={submitCaptcha} disabled={captchaSending || !captchaAnswer.trim()}>
              {captchaSending ? 'Отправка…' : 'Отправить'}
            </Button>
          </Stack>
          {captchaMsg && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
              {captchaMsg}
            </Typography>
          )}
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Капча: нет активной. Если бот не решит капчу сам — она появится здесь для ручного ввода.
          </Typography>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <TextField
          label="sessionId (ID сеанса Афиши)"
          size="small"
          fullWidth
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        <TextField
          label="X-Application-Key (widget key площадки)"
          size="small"
          fullWidth
          value={appKey}
          onChange={(e) => setAppKey(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Пул тестовых профилей
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {users.length} / {MAX_USERS} · POST {SNIPE_PATH} · тело {'{ sessionId, contacts }'}
            </Typography>
          </Box>
          <Button startIcon={<AddIcon />} onClick={addUser} disabled={loading || users.length >= MAX_USERS}>
            Добавить профиль
          </Button>
        </Stack>

        <Stack spacing={2}>
          {users.map((user, index) => {
            const errors = fieldErrors[index];
            const show = showAllErrors || touched[index];
            return (
              <Stack
                key={index}
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ md: 'flex-start' }}
              >
                <TextField
                  label="Имя"
                  size="small"
                  fullWidth
                  required
                  value={user.name}
                  onChange={(e) => updateUser(index, 'name', e.target.value)}
                  onBlur={() => markTouched(index)}
                  disabled={loading}
                  error={show && Boolean(errors.name)}
                  helperText={show ? errors.name : ' '}
                />
                <TextField
                  label="Email"
                  size="small"
                  fullWidth
                  required
                  type="email"
                  value={user.email}
                  onChange={(e) => updateUser(index, 'email', e.target.value)}
                  onBlur={() => markTouched(index)}
                  disabled={loading}
                  error={show && Boolean(errors.email)}
                  helperText={show ? errors.email : ' '}
                />
                <TextField
                  label="Телефон"
                  size="small"
                  fullWidth
                  required
                  value={user.phone}
                  onChange={(e) => updateUser(index, 'phone', e.target.value)}
                  onBlur={() => markTouched(index)}
                  disabled={loading}
                  error={show && Boolean(errors.phone)}
                  helperText={show ? errors.phone : ' '}
                />
                <IconButton
                  aria-label="Удалить профиль"
                  onClick={() => removeUser(index)}
                  disabled={loading || users.length <= 1}
                  sx={{ mt: { md: 0.5 } }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            );
          })}
        </Stack>
      </Paper>

      <Box>
        <Button variant="contained" onClick={run} disabled={runDisabled}>
          Запустить снайпер (бронирование мест)
        </Button>
        {overLimit && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Максимум {MAX_USERS} профилей за один прогон
          </Typography>
        )}
        {loading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Бронируем места через API Афиши…</Typography>
          </Stack>
        )}
      </Box>

      {networkError && <Alert severity="error">{networkError}</Alert>}

      {rows && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Места</TableCell>
                <TableCell align="right">Сумма</TableCell>
                <TableCell>Ссылка на оплату</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={`${row.email}-${i}`}>
                  <TableCell>{row.email || '—'}</TableCell>
                  <TableCell>
                    {row.success ? (
                      <Chip size="small" color="success" label="Успешно" />
                    ) : (
                      <Chip
                        size="small"
                        color="error"
                        label={row.error ? `Сбой: ${row.error}` : 'Сбой'}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{row.seats || '—'}</TableCell>
                  <TableCell align="right">{row.totalPrice != null ? `${row.totalPrice} ₽` : '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {row.paymentUrl ? (
                      <a href={row.paymentUrl} target="_blank" rel="noreferrer">{row.paymentUrl}</a>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            История бронирований и ссылки на оплату
          </Typography>
          {historyGroups.length > 0 && (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={checkPayments}>Проверить оплату</Button>
              <Button size="small" onClick={expandAll}>Развернуть все</Button>
              <Button size="small" onClick={collapseAll}>Свернуть все</Button>
            </Stack>
          )}
        </Stack>
        {historyGroups.length === 0 && tonLocked.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Пока пусто — заказы и ссылки на оплату появятся здесь после открытия продаж (12:00).
          </Typography>
        ) : (
          <>
          {historyGroups.map((g) => (
            <Paper key={g.key} variant="outlined" sx={{ mb: 1.5, overflow: 'hidden' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1.5,
                  py: 1,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
                onClick={() => toggleGroup(g.key)}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {g.spectacle !== 'Без спектакля' ? `«${g.spectacle}»` : g.spectacle} · {g.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {g.totalOrders} заказов · {g.totalSum.toLocaleString('ru-RU')} ₽
                  </Typography>
                </Box>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleGroup(g.key); }} aria-label="Развернуть или свернуть">
                  {isExpanded(g.key) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={isExpanded(g.key)} timeout="auto" unmountOnExit>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Дата</TableCell>
                        <TableCell>Сектор</TableCell>
                        <TableCell align="center">Ряд</TableCell>
                        <TableCell>Места</TableCell>
                        <TableCell align="right">Сумма</TableCell>
                        <TableCell>Покупатель</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell>Ссылка на оплату</TableCell>
                        <TableCell align="center">Оплата</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {g.records
                        .slice()
                        .reverse()
                        .flatMap((rec) => {
                          const rows: Array<{ key: string; kind: 'ok' | 'err'; name?: string; email?: string; phone?: string; seats?: string; totalPrice?: number; paymentUrl?: string; error?: string; orderId?: string; sector?: string; row?: string; seatNums?: string; paymentStatus?: string | null; paymentManual?: boolean }> = [];
                          rec.results.forEach((r, j) => rows.push({ key: `${rec.sessionId}-${rec.bookedAt}-r${j}`, kind: 'ok', name: r.name, email: r.email, phone: r.phone, seats: r.seats, totalPrice: r.totalPrice, paymentUrl: r.paymentUrl, orderId: r.orderId, sector: r.sector, row: r.row, seatNums: r.seatNums, paymentStatus: r.paymentStatus, paymentManual: r.paymentManual }));
                          rec.errors.forEach((e, j) => rows.push({ key: `${rec.sessionId}-${rec.bookedAt}-e${j}`, kind: 'err', name: e.name, email: e.email, error: e.error }));
                          return rows;
                        })
                        .map((row) =>
                          row.kind === 'err' ? (
                            <TableRow key={row.key}>
                              <TableCell colSpan={3}>{row.name || row.email || '—'}</TableCell>
                              <TableCell colSpan={6} sx={{ color: 'error.main' }}>Ошибка: {row.error}</TableCell>
                            </TableRow>
                          ) : (
                            <TableRow key={row.key}>
                              <TableCell>{g.label || '—'}</TableCell>
                              <TableCell>{row.sector || '—'}</TableCell>
                              <TableCell align="center">{row.row || '—'}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{row.seatNums || row.seats}</TableCell>
                              <TableCell align="right">{row.totalPrice} ₽</TableCell>
                              <TableCell>
                                <Typography variant="body2">{row.name || '—'}</Typography>
                                <Typography variant="caption" color="text.secondary">{row.email || '—'}</Typography>
                                {row.phone && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{row.phone}</Typography>}
                              </TableCell>
                              <TableCell>
                                {row.paymentStatus === 'success' ? (
                                  <Chip size="small" color="success" label={row.paymentManual ? 'оплачено ✓' : 'оплачено'} />
                                ) : row.paymentStatus === 'cancelled' ? (
                                  <Chip size="small" color="error" label="отменено" />
                                ) : (
                                  <Chip size="small" color="default" label="не проверено" />
                                )}
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {row.paymentUrl ? <a href={row.paymentUrl} target="_blank" rel="noreferrer">открыть</a> : '—'}
                              </TableCell>
                              <TableCell align="center">
                                {row.orderId && row.paymentStatus !== 'success' ? (
                                  <Button size="small" variant="contained" color="success" onClick={() => markKabalaPaid(row.orderId!)}>Оплатили</Button>
                                ) : '—'}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Collapse>
            </Paper>
          ))}
          {tonLocked.length > 0 && (
            <Paper key="ton-accounts" variant="outlined" sx={{ mb: 1.5, overflow: 'hidden' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1.5,
                  py: 1,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
                onClick={() => toggleGroup('ton-accounts')}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    «Обыкновенная смерть» · Театр Наций
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tonLocked.length} броней · ожидают оплаты
                  </Typography>
                </Box>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleGroup('ton-accounts'); }} aria-label="Развернуть или свернуть">
                  {isExpanded('ton-accounts') ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={isExpanded('ton-accounts')} timeout="auto" unmountOnExit>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Аккаунт</TableCell>
                        <TableCell>Дата</TableCell>
                        <TableCell>Места</TableCell>
                        <TableCell>Ссылка на оплату</TableCell>
                        <TableCell align="center">Оплата</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tonLocked.map((a) => (
                        <TableRow key={a.email}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{a.email}</TableCell>
                          <TableCell>{a.sessionLabel || '—'}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{a.seats || '—'}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {a.paymentUrl ? <a href={a.paymentUrl} target="_blank" rel="noreferrer">открыть</a> : '—'}
                          </TableCell>
                          <TableCell align="center">
                            <Button size="small" variant="contained" color="success" onClick={() => markTonPaid(a.email)}>
                              Оплатили
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Collapse>
            </Paper>
          )}
          </>
        )}
      </Paper>
    </Stack>
  );
}
