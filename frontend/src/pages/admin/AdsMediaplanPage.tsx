import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import RadarIcon from '@mui/icons-material/Radar';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import { useToast } from '@/components/common/ToastProvider';
import {
  arrToLines,
  createAdsMediaplanItem,
  deleteAdsMediaplanItem,
  fetchAdsMediaplan,
  linesToArr,
  rescoreAdsMediaplan,
  scanAdsMediaplan,
  updateAdsMediaplanItem,
  type AdsMediaplanItem,
  type AdsMediaplanStatus,
} from '@/services/adsMediaplanApi';

const STATUS_LABEL: Record<AdsMediaplanStatus, string> = {
  planned: 'План',
  active: 'В работе',
  paused: 'Пауза',
  done: 'Готово',
  rejected: 'Отказ',
};

type Draft = AdsMediaplanItem & {
  hot_keywords_text?: string;
  negative_keywords_text?: string;
  ad_titles_text?: string;
  ad_texts_text?: string;
  research_why?: string;
  research_competitors?: string;
  research_snippets?: string;
  research_sources?: string;
  research_wordstat?: string;
};

function toDraft(item: AdsMediaplanItem): Draft {
  const r = item.research_json || {};
  return {
    ...item,
    hot_keywords_text: arrToLines(item.hot_keywords),
    negative_keywords_text: arrToLines(item.negative_keywords),
    ad_titles_text: arrToLines(item.ad_titles),
    ad_texts_text: arrToLines(item.ad_texts),
    research_why: r.why || '',
    research_competitors: (r.competitors || []).join('\n'),
    research_snippets: (r.snippets || []).join('\n'),
    research_sources: (r.sources || []).join('\n'),
    research_wordstat: (r.wordstat || [])
      .map((w) => `${w.phrase}\t${w.count ?? ''}`)
      .join('\n'),
  };
}

function fromDraft(d: Draft): Partial<AdsMediaplanItem> {
  const wordstat = linesToArr(d.research_wordstat || '').map((line) => {
    const [phrase, count] = line.split(/\t|;/);
    return { phrase: phrase.trim(), count: count ? Number(count) : undefined };
  });
  return {
    event_slug: d.event_slug,
    event_title: d.event_title,
    venue: d.venue,
    event_date: d.event_date ? String(d.event_date).slice(0, 10) : null,
    lp_url: d.lp_url,
    status: d.status,
    priority: Number(d.priority) || 50,
    sort_order: Number(d.sort_order) || 100,
    daily_budget_rub: d.daily_budget_rub != null ? Number(d.daily_budget_rub) : null,
    total_budget_rub: d.total_budget_rub != null ? Number(d.total_budget_rub) : null,
    campaign_name: d.campaign_name,
    campaign_id: d.campaign_id != null ? Number(d.campaign_id) : null,
    seo_title: d.seo_title,
    seo_description: d.seo_description,
    seo_h1: d.seo_h1,
    seo_keywords: d.seo_keywords,
    seo_score_notes: d.seo_score_notes,
    body_excerpt: d.body_excerpt,
    forecast_impressions: d.forecast_impressions != null ? Number(d.forecast_impressions) : null,
    forecast_clicks: d.forecast_clicks != null ? Number(d.forecast_clicks) : null,
    forecast_cpc_rub: d.forecast_cpc_rub != null ? Number(d.forecast_cpc_rub) : null,
    forecast_conversions: d.forecast_conversions != null ? Number(d.forecast_conversions) : null,
    forecast_notes: d.forecast_notes,
    hot_keywords: linesToArr(d.hot_keywords_text || ''),
    negative_keywords: linesToArr(d.negative_keywords_text || ''),
    ad_titles: linesToArr(d.ad_titles_text || ''),
    ad_texts: linesToArr(d.ad_texts_text || ''),
    notes: d.notes,
    research_json: {
      why: d.research_why || '',
      competitors: linesToArr(d.research_competitors || ''),
      snippets: linesToArr(d.research_snippets || ''),
      sources: linesToArr(d.research_sources || ''),
      wordstat,
    },
  };
}

const emptyNew = (): Draft =>
  toDraft({
    id: 0,
    event_slug: '',
    event_title: '',
    status: 'planned',
    priority: 50,
    sort_order: 100,
    hot_keywords: [],
    negative_keywords: [],
    ad_titles: [],
    ad_texts: [],
    research_json: {},
  });

export function AdsMediaplanPage() {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['ads-mediaplan'],
    queryFn: fetchAdsMediaplan,
  });
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [scanPreview, setScanPreview] = useState<Awaited<ReturnType<typeof scanAdsMediaplan>> | null>(
    null,
  );

  const selected = useMemo(
    () => (typeof selectedId === 'number' ? data.find((x) => x.id === selectedId) : null),
    [data, selectedId],
  );

  useEffect(() => {
    if (selectedId === 'new') setDraft(emptyNew());
    else if (selected) setDraft(toDraft(selected));
    else setDraft(null);
  }, [selectedId, selected]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Нет черновика');
      const body = fromDraft(draft);
      if (selectedId === 'new') return createAdsMediaplanItem(body);
      if (typeof selectedId !== 'number') throw new Error('Не выбрано');
      return updateAdsMediaplanItem(selectedId, body);
    },
    onSuccess: (item) => {
      showToast('Сохранено', 'success');
      qc.invalidateQueries({ queryKey: ['ads-mediaplan'] });
      setSelectedId(item.id);
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (typeof selectedId !== 'number') throw new Error('Не выбрано');
      await deleteAdsMediaplanItem(selectedId);
    },
    onSuccess: () => {
      showToast('Удалено', 'success');
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ['ads-mediaplan'] });
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const scan = useMutation({
    mutationFn: (add: boolean) => scanAdsMediaplan({ add, limit: 25 }),
    onSuccess: (r, add) => {
      setScanPreview(r);
      showToast(
        add
          ? `Скан: +${r.added.length} в план (из ${r.candidates.length} кандидатов)`
          : `Скан: ${r.candidates.length} кандидатов, событий ${r.scannedEvents}`,
        'success',
      );
      if (add) qc.invalidateQueries({ queryKey: ['ads-mediaplan'] });
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const rescore = useMutation({
    mutationFn: async () => {
      if (typeof selectedId !== 'number') throw new Error('Не выбрано');
      return rescoreAdsMediaplan(selectedId);
    },
    onSuccess: (item) => {
      showToast(`Оценка SEO: ${item.seo_score_live ?? item.seo_score}/10`, 'success');
      qc.invalidateQueries({ queryKey: ['ads-mediaplan'] });
      setDraft(toDraft(item));
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const totalDaily = data
    .filter((x) => x.status === 'planned' || x.status === 'active')
    .reduce((s, x) => s + (Number(x.daily_budget_rub) || 0), 0);

  return (
    <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Медиаплан рекламы
          </Typography>
          <Typography color="text.secondary" variant="body2">
            События в Директе: семантика, ориентиры, SEO, бюджет, минуса. День-1 план ≈ {totalDaily} ₽/день
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RadarIcon />}
            disabled={scan.isPending}
            onClick={() => scan.mutate(false)}
          >
            Скан спроса
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            disabled={scan.isPending}
            onClick={() => scan.mutate(true)}
          >
            Скан + добавить топ
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSelectedId('new')}>
            Новое событие
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{(error as Error).message}</Alert> : null}

      {scanPreview ? (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={600} mb={1}>
            Результат скана: {scanPreview.scannedEvents} событий афиши, {scanPreview.wordstatPhrases}{' '}
            фраз Wordstat
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Событие</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell align="right">Спрос</TableCell>
                <TableCell>Топ-фразы</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scanPreview.candidates.slice(0, 12).map((c) => (
                <TableRow key={c.event_slug}>
                  <TableCell>{c.event_title}</TableCell>
                  <TableCell>
                    <code>{c.event_slug}</code>
                  </TableCell>
                  <TableCell align="right">{c.demandScore}</TableCell>
                  <TableCell>
                    {(c.wordstat || [])
                      .slice(0, 3)
                      .map((w) => `${w.phrase} (${w.count ?? '—'})`)
                      .join('; ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : null}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Событие</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">₽/день</TableCell>
                  <TableCell align="right">SEO</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Загрузка…</TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      selected={selectedId === row.id}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <TableCell>
                        <Typography fontWeight={600} variant="body2">
                          {row.event_title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.venue || row.event_slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={STATUS_LABEL[row.status] || row.status} />
                      </TableCell>
                      <TableCell align="right">{row.daily_budget_rub ?? '—'}</TableCell>
                      <TableCell align="right">
                        {row.seo_score_live ?? row.seo_score ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {!draft ? (
            <Paper sx={{ p: 3 }}>
              <Typography color="text.secondary">Выберите событие слева или создайте новое.</Typography>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  {selectedId === 'new' ? 'Новое событие' : draft.event_title}
                </Typography>
                <Stack direction="row" gap={1}>
                  {typeof selectedId === 'number' ? (
                    <Button
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={() => rescore.mutate()}
                      disabled={rescore.isPending}
                    >
                      Пересчитать SEO
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                  >
                    Сохранить
                  </Button>
                  {typeof selectedId === 'number' ? (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={() => {
                        if (confirm('Удалить из медиаплана?')) remove.mutate();
                      }}
                    >
                      Удалить
                    </Button>
                  ) : null}
                </Stack>
              </Stack>

              {(draft.seo_score_live != null || draft.seo_score != null) && (
                <Alert severity={(draft.seo_score_live ?? draft.seo_score ?? 0) >= 8 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                  Оценка текстов: <b>{draft.seo_score_live ?? draft.seo_score}/10</b>
                  {draft.seo_score_notes ? ` — ${draft.seo_score_notes}` : ''}
                  {draft.seo_score_fail?.length
                    ? ` (провалы: ${draft.seo_score_fail.join(', ')})`
                    : ''}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Название"
                    fullWidth
                    value={draft.event_title || ''}
                    onChange={(e) => setField('event_title', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Slug / repertoireId"
                    fullWidth
                    value={draft.event_slug || ''}
                    onChange={(e) => setField('event_slug', e.target.value)}
                    disabled={selectedId !== 'new'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Площадка"
                    fullWidth
                    value={draft.venue || ''}
                    onChange={(e) => setField('venue', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Дата"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={draft.event_date ? String(draft.event_date).slice(0, 10) : ''}
                    onChange={(e) => setField('event_date', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel>Статус</InputLabel>
                    <Select
                      label="Статус"
                      value={draft.status}
                      onChange={(e) => setField('status', e.target.value as AdsMediaplanStatus)}
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <MenuItem key={k} value={k}>
                          {v}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="LP URL"
                    fullWidth
                    value={draft.lp_url || ''}
                    onChange={(e) => setField('lp_url', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography fontWeight={700} gutterBottom>
                    Бюджет и прогноз
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="₽/день"
                    type="number"
                    fullWidth
                    value={draft.daily_budget_rub ?? ''}
                    onChange={(e) =>
                      setField('daily_budget_rub', e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Бюджет всего ₽"
                    type="number"
                    fullWidth
                    value={draft.total_budget_rub ?? ''}
                    onChange={(e) =>
                      setField('total_budget_rub', e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Показы (оценка)"
                    type="number"
                    fullWidth
                    value={draft.forecast_impressions ?? ''}
                    onChange={(e) =>
                      setField(
                        'forecast_impressions',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Клики (оценка)"
                    type="number"
                    fullWidth
                    value={draft.forecast_clicks ?? ''}
                    onChange={(e) =>
                      setField('forecast_clicks', e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="CPC ₽"
                    type="number"
                    fullWidth
                    value={draft.forecast_cpc_rub ?? ''}
                    onChange={(e) =>
                      setField('forecast_cpc_rub', e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Оплаты (оценка)"
                    type="number"
                    fullWidth
                    value={draft.forecast_conversions ?? ''}
                    onChange={(e) =>
                      setField(
                        'forecast_conversions',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="РК name"
                    fullWidth
                    value={draft.campaign_name || ''}
                    onChange={(e) => setField('campaign_name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="РК id Директа"
                    type="number"
                    fullWidth
                    value={draft.campaign_id ?? ''}
                    onChange={(e) =>
                      setField('campaign_id', e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Комментарий к прогнозу"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.forecast_notes || ''}
                    onChange={(e) => setField('forecast_notes', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography fontWeight={700} gutterBottom>
                    На что ориентируемся
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Почему в рекламе"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.research_why || ''}
                    onChange={(e) => setField('research_why', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Wordstat (фраза + Tab + частота, по строке)"
                    fullWidth
                    multiline
                    minRows={3}
                    value={draft.research_wordstat || ''}
                    onChange={(e) => setField('research_wordstat', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Конкуренты (по строке)"
                    fullWidth
                    multiline
                    minRows={3}
                    value={draft.research_competitors || ''}
                    onChange={(e) => setField('research_competitors', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Сниппеты / паттерны объявлений"
                    fullWidth
                    multiline
                    minRows={3}
                    value={draft.research_snippets || ''}
                    onChange={(e) => setField('research_snippets', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Источники"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.research_sources || ''}
                    onChange={(e) => setField('research_sources', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography fontWeight={700} gutterBottom>
                    SEO / тексты (литературно, ёмко)
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Title"
                    fullWidth
                    value={draft.seo_title || ''}
                    onChange={(e) => setField('seo_title', e.target.value)}
                    helperText={`${(draft.seo_title || '').length}/70`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.seo_description || ''}
                    onChange={(e) => setField('seo_description', e.target.value)}
                    helperText={`${(draft.seo_description || '').length}/160`}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="H1"
                    fullWidth
                    value={draft.seo_h1 || ''}
                    onChange={(e) => setField('seo_h1', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Keywords"
                    fullWidth
                    value={draft.seo_keywords || ''}
                    onChange={(e) => setField('seo_keywords', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Короткий текст карточки / body"
                    fullWidth
                    multiline
                    minRows={3}
                    value={draft.body_excerpt || ''}
                    onChange={(e) => setField('body_excerpt', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography fontWeight={700} gutterBottom>
                    Ключи и минуса
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="HOT-ключи (по строке)"
                    fullWidth
                    multiline
                    minRows={5}
                    value={draft.hot_keywords_text || ''}
                    onChange={(e) => setField('hot_keywords_text', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Минус-слова (по строке)"
                    fullWidth
                    multiline
                    minRows={5}
                    value={draft.negative_keywords_text || ''}
                    onChange={(e) => setField('negative_keywords_text', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Заголовки объявлений"
                    fullWidth
                    multiline
                    minRows={3}
                    value={draft.ad_titles_text || ''}
                    onChange={(e) => setField('ad_titles_text', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Тексты объявлений"
                    fullWidth
                    multiline
                    minRows={3}
                    value={draft.ad_texts_text || ''}
                    onChange={(e) => setField('ad_texts_text', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Заметки"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.notes || ''}
                    onChange={(e) => setField('notes', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdsMediaplanPage;
