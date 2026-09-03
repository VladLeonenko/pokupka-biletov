import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import {
  discoverExternalCompetitorUrls,
  getCompetitorPricesEvent,
  getCompetitorPricesOverview,
  getExternalCompetitorEvent,
  getExternalCompetitorOverview,
  saveExternalCompetitorUrls,
  scanCompetitorPrices,
  scanExternalCompetitorPrices,
} from '@/services/getbiletAdminApi';
import { useToast } from '@/components/common/ToastProvider';

function rub(n: unknown) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return `${Math.round(x).toLocaleString('ru-RU')} ₽`;
}

function fmtDate(raw: string | null | undefined) {
  if (!raw) return '—';
  const s = String(raw).slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}.${m}.${y}`;
}

const SOURCE_LABEL: Record<string, string> = {
  yandex_afisha: 'Яндекс Афиша',
  afisha_ru: 'Афиша',
  portbilet: 'Портбилет',
  kassir: 'Кассир',
  ticketland: 'Ticketland',
  ponominalu: 'Ponominalu',
  mts_live: 'МТС Live',
  other: 'Другой',
};

function ExternalTab() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['getbilet-external-competitors'],
    queryFn: () => getExternalCompetitorOverview(14),
  });

  const detailQ = useQuery({
    queryKey: ['getbilet-external-competitors-event', selectedId],
    queryFn: () => getExternalCompetitorEvent(selectedId as string, 14),
    enabled: Boolean(selectedId),
  });

  const scan = useMutation({
    mutationFn: () => scanExternalCompetitorPrices({ discover: false }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['getbilet-external-competitors'] });
      showToast(
        `Скан сайтов: ${r.scannedUrls ?? 0} URL, цен ${r.withPrice ?? 0}, дороже конкурентов: ${r.losing ?? 0}`,
        'success',
      );
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const discover = useMutation({
    mutationFn: () => discoverExternalCompetitorUrls(12),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['getbilet-external-competitors'] });
      showToast(`Нашли ссылок: ${r.added} (событий без URL: ${r.events})`, 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const saveUrls = useMutation({
    mutationFn: () => {
      const existing = (detailQ.data?.urls || []).map((u) => u.url).join('\n');
      return saveExternalCompetitorUrls(detailQ.data?.eventId as number, urlDraft || existing);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['getbilet-external-competitors-event', selectedId] });
      showToast('URL сохранены', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const events = data?.events ?? [];
  const losingNow = events.filter((e) => {
    const ours = Number(e.our_min_rub);
    const th = Number(e.competitor_min_rub);
    return Number.isFinite(ours) && Number.isFinite(th) && ours > th;
  }).length;

  const selectedTitle = useMemo(() => {
    const row = events.find((e) => e.repertoire_external_id === selectedId);
    return row?.event_title || selectedId;
  }, [events, selectedId]);

  const detailUrlsText = (detailQ.data?.urls || []).map((u) => u.url).join('\n');

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (isError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {(error as Error)?.message || 'Ошибка'}{' '}
        <Button size="small" onClick={() => refetch()}>
          Повторить
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Сравниваем нашу «от N ₽» с публичными страницами Яндекс Афиши, Портбилета, Афиши.ru, Кассира и
        т.д. Ссылки — в карточке события или сюда. Скан читает JSON-LD / «от N ₽». Если мы дороже, витрина
        сама опускает свои места (не ниже закупа + 5%).
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Button variant="contained" disabled={scan.isPending} onClick={() => scan.mutate()}>
          {scan.isPending ? 'Сканирую сайты…' : 'Просканировать сайты'}
        </Button>
        <Button variant="outlined" disabled={discover.isPending || !data?.cseConfigured} onClick={() => discover.mutate()}>
          {discover.isPending ? 'Ищу ссылки…' : 'Найти URL в Google'}
        </Button>
        <Chip size="small" label={`Снимок: ${fmtDate(data?.snapshotDate)}`} />
        <Chip size="small" color={losingNow > 0 ? 'warning' : 'success'} label={`Дороже конкурентов: ${losingNow}`} />
        <Chip size="small" label={`Без ссылок: ${data?.eventsWithoutUrls ?? 0}`} />
      </Box>
      {!data?.cseConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Автопоиск ссылок выключен: в .env нет GOOGLE_CUSTOM_SEARCH_API_KEY / ENGINE_ID. Вставьте URL
          руками в карточке события.
        </Alert>
      )}

      {(data?.history?.length || 0) > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Динамика по дням
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>День</TableCell>
                <TableCell align="right">Событий</TableCell>
                <TableCell align="right">Где мы дороже</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data!.history.map((h) => (
                <TableRow key={h.snapshot_date}>
                  <TableCell>{fmtDate(h.snapshot_date)}</TableCell>
                  <TableCell align="right">{h.events}</TableCell>
                  <TableCell align="right">{h.losing}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ overflow: 'auto', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Событие</TableCell>
              <TableCell align="right">Мы «от»</TableCell>
              <TableCell align="right">Конкурент «от»</TableCell>
              <TableCell>Самый дешёвый сайт</TableCell>
              <TableCell>Статус</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  Нет снимков. Добавьте URL конкурентов в карточке события и нажмите «Просканировать сайты».
                </TableCell>
              </TableRow>
            ) : (
              events.map((ev) => {
                const ours = Number(ev.our_min_rub);
                const th = Number(ev.competitor_min_rub);
                const lose = Number.isFinite(ours) && Number.isFinite(th) && ours > th;
                return (
                  <TableRow
                    key={ev.repertoire_external_id}
                    hover
                    selected={selectedId === ev.repertoire_external_id}
                    onClick={() => {
                      setSelectedId(ev.repertoire_external_id);
                      setUrlDraft('');
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2">{ev.event_title || ev.repertoire_external_id}</Typography>
                    </TableCell>
                    <TableCell align="right">{rub(ev.our_min_rub)}</TableCell>
                    <TableCell align="right">{rub(ev.competitor_min_rub)}</TableCell>
                    <TableCell>
                      {ev.cheapest_url ? (
                        <Link href={ev.cheapest_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                          {SOURCE_LABEL[ev.cheapest_source || ''] || ev.cheapest_source}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {!Number.isFinite(th) ? (
                        <Chip size="small" label="Нет цены" />
                      ) : lose ? (
                        <Chip size="small" color="warning" label="Дороже" />
                      ) : (
                        <Chip size="small" color="success" label="Мы не дороже" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      {selectedId && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {selectedTitle}
          </Typography>
          {detailQ.isLoading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <TextField
                label="URL конкурентов (по одному в строке)"
                value={urlDraft || detailUrlsText}
                onChange={(e) => setUrlDraft(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                sx={{ mb: 1 }}
              />
              <Button
                size="small"
                variant="outlined"
                disabled={!detailQ.data?.eventId || saveUrls.isPending}
                onClick={() => saveUrls.mutate()}
                sx={{ mb: 2 }}
              >
                Сохранить URL
              </Button>
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>День</TableCell>
                    <TableCell align="right">Мы</TableCell>
                    <TableCell align="right">Они</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detailQ.data?.daily || []).map((d) => (
                    <TableRow key={d.snapshot_date}>
                      <TableCell>{fmtDate(d.snapshot_date)}</TableCell>
                      <TableCell align="right">{rub(d.our_min_rub)}</TableCell>
                      <TableCell align="right">{rub(d.competitor_min_rub)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Сайт</TableCell>
                    <TableCell align="right">От</TableCell>
                    <TableCell>Как сняли</TableCell>
                    <TableCell>Ошибка</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detailQ.data?.sources || []).map((s) => (
                    <TableRow key={s.url}>
                      <TableCell>
                        <Link href={s.url} target="_blank" rel="noreferrer">
                          {SOURCE_LABEL[s.source] || s.source}
                        </Link>
                      </TableCell>
                      <TableCell align="right">{rub(s.min_price_rub)}</TableCell>
                      <TableCell>{s.extract_method || '—'}</TableCell>
                      <TableCell>{s.error || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}

function GetbiletAgentsTab() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['getbilet-competitor-prices'],
    queryFn: () => getCompetitorPricesOverview(14),
  });
  const detailQ = useQuery({
    queryKey: ['getbilet-competitor-prices-event', selectedId],
    queryFn: () => getCompetitorPricesEvent(selectedId as string, 14),
    enabled: Boolean(selectedId),
  });
  const scan = useMutation({
    mutationFn: scanCompetitorPrices,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['getbilet-competitor-prices'] });
      showToast(`Агенты GetBilet: ${r.scanned}, проигрываем ${r.losing}`, 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });
  const events = data?.events ?? [];

  if (isLoading) return <CircularProgress sx={{ m: 3 }} />;
  if (isError) {
    return <Alert severity="error">{(error as Error).message}</Alert>;
  }
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Это другие продавцы <strong>внутри GetBilet</strong> (AgentId), не внешние сайты.
      </Typography>
      <Button variant="outlined" disabled={scan.isPending} onClick={() => scan.mutate()} sx={{ mb: 2 }}>
        Скан агентов GetBilet
      </Button>
      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Событие</TableCell>
              <TableCell align="right">Наши места</TableCell>
              <TableCell align="right">Проигрываем</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev) => (
              <TableRow
                key={ev.repertoire_external_id}
                hover
                onClick={() => setSelectedId(ev.repertoire_external_id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{ev.event_title || ev.repertoire_external_id}</TableCell>
                <TableCell align="right">{ev.own_seats}</TableCell>
                <TableCell align="right">{ev.seats_we_lose}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {selectedId && detailQ.data && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Снимок {fmtDate(detailQ.data.snapshotDate)}, агентов {detailQ.data.agents.length}
        </Typography>
      )}
      <Button size="small" sx={{ mt: 1 }} onClick={() => refetch()}>
        Обновить
      </Button>
    </Box>
  );
}

export function GetbiletCompetitorPricesPage() {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Цены конкурентов
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Сайты (Афиша, Портбилет…)" />
        <Tab label="Агенты GetBilet" />
      </Tabs>
      {tab === 0 ? <ExternalTab /> : <GetbiletAgentsTab />}
    </Box>
  );
}
