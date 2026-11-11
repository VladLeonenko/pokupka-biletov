import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useToast } from '@/components/common/ToastProvider';
import {
  arrToLines,
  createAdsMediaplanItem,
  deleteAdsMediaplanItem,
  emptyGroup,
  fetchAdsMediaplan,
  linesToArr,
  rescoreAdsMediaplan,
  scanAdsMediaplan,
  updateAdsMediaplanItem,
  type AdsMediaplanGroup,
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

type DraftGroup = AdsMediaplanGroup & {
  hot_text?: string;
  neg_text?: string;
};

type Draft = AdsMediaplanItem & {
  campaign_negatives_text?: string;
  event_negatives_text?: string;
  groups?: DraftGroup[];
  showLegacy?: boolean;
  research_why?: string;
  research_competitors?: string;
  research_snippets?: string;
  research_sources?: string;
  research_wordstat?: string;
};

function toDraftGroup(g: AdsMediaplanGroup): DraftGroup {
  return {
    ...g,
    ads: (g.ads || []).map((a) => ({
      title: a.title || '',
      title2: a.title2 || '',
      text: a.text || '',
    })),
    hot_text: arrToLines(g.hot_keywords),
    neg_text: arrToLines(g.negative_keywords),
  };
}

function toDraft(item: AdsMediaplanItem): Draft {
  const r = item.research_json || {};
  const structure =
    item.structure_json && item.structure_json.length
      ? item.structure_json
      : [
          emptyGroup(item.lp_url || ''),
        ];
  return {
    ...item,
    campaign_negatives_text: arrToLines(item.campaign_negatives),
    event_negatives_text: arrToLines(item.negative_keywords),
    groups: structure.map(toDraftGroup),
    showLegacy: false,
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
  const structure: AdsMediaplanGroup[] = (d.groups || []).map((g, i) => ({
    id: g.id || `group-${i + 1}`,
    name: g.name || `Группа ${i + 1}`,
    landing_url: g.landing_url || '',
    hot_keywords: linesToArr(g.hot_text || ''),
    negative_keywords: linesToArr(g.neg_text || ''),
    ads: (g.ads || []).map((a) => ({
      title: (a.title || '').trim(),
      title2: (a.title2 || '').trim(),
      text: (a.text || '').trim(),
    })),
  }));
  return {
    event_slug: d.event_slug,
    event_title: d.event_title,
    venue: d.venue,
    event_date: d.event_date ? String(d.event_date).slice(0, 10) : null,
    date_label: d.date_label || null,
    date_from: d.date_from ? String(d.date_from).slice(0, 10) : null,
    date_to: d.date_to ? String(d.date_to).slice(0, 10) : null,
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
    campaign_negatives: linesToArr(d.campaign_negatives_text || ''),
    negative_keywords: linesToArr(d.event_negatives_text || ''),
    structure_json: structure,
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
    campaign_negatives: [],
    structure_json: [emptyGroup('')],
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

  const updateGroup = (idx: number, patch: Partial<DraftGroup>) => {
    setDraft((prev) => {
      if (!prev?.groups) return prev;
      const groups = prev.groups.map((g, i) => (i === idx ? { ...g, ...patch } : g));
      return { ...prev, groups };
    });
  };

  const updateAd = (
    gIdx: number,
    aIdx: number,
    patch: Partial<{ title: string; title2: string; text: string }>,
  ) => {
    setDraft((prev) => {
      if (!prev?.groups) return prev;
      const groups = prev.groups.map((g, i) => {
        if (i !== gIdx) return g;
        const ads = (g.ads || []).map((a, j) => (j === aIdx ? { ...a, ...patch } : a));
        return { ...g, ads };
      });
      return { ...prev, groups };
    });
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
            1 строка = 1 LP/РК. Группы по интенту. День-1 ≈ {totalDaily} ₽/день · success = purchase
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
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.date_label || row.venue || row.event_slug}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(row.structure_json || []).length || 0} гр.
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
                <Alert
                  severity={(draft.seo_score_live ?? draft.seo_score ?? 0) >= 8 ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                >
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
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Приоритет"
                    type="number"
                    fullWidth
                    value={draft.priority ?? 50}
                    onChange={(e) => setField('priority', Number(e.target.value) || 50)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography fontWeight={700} gutterBottom>
                    Даты LP / креативов
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Много дат на одном LP = одна РК; группы по интенту, не по дням. Диапазон — в
                    date_label / объявлениях.
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="date_label"
                    fullWidth
                    placeholder="20 ноября / 18 дек – 10 янв"
                    value={draft.date_label || ''}
                    onChange={(e) => setField('date_label', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="date_from"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={draft.date_from ? String(draft.date_from).slice(0, 10) : ''}
                    onChange={(e) => setField('date_from', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="date_to"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={draft.date_to ? String(draft.date_to).slice(0, 10) : ''}
                    onChange={(e) => setField('date_to', e.target.value)}
                  />
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
                    SEO / тексты
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
                    Минуса кампании
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Общий мусор РК (бесплатно / скачать / вики / отзывы…). Слой 1 из 3.
                  </Typography>
                  <TextField
                    label="campaign_negatives (по строке)"
                    fullWidth
                    multiline
                    minRows={4}
                    value={draft.campaign_negatives_text || ''}
                    onChange={(e) => setField('campaign_negatives_text', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Минуса события (event-level)"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.event_negatives_text || ''}
                    onChange={(e) => setField('event_negatives_text', e.target.value)}
                    helperText="Слой 2: конфликты / чужие постановки. Групповые — внутри групп ниже."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box>
                      <Typography fontWeight={700}>Группы объявлений</Typography>
                      <Typography variant="caption" color="text.secondary">
                        По интенту + landing. Не дробить по календарным дням.
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                groups: [
                                  ...(prev.groups || []),
                                  toDraftGroup(emptyGroup(prev.lp_url || '')),
                                ],
                              }
                            : prev,
                        )
                      }
                    >
                      Группа
                    </Button>
                  </Stack>
                </Grid>

                {(draft.groups || []).map((g, gi) => (
                  <Grid item xs={12} key={g.id || gi}>
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.5,
                        mb: 1,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography fontWeight={600} variant="body2">
                          Группа {gi + 1}
                          {g.name ? `: ${g.name}` : ''}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          disabled={(draft.groups || []).length <= 1}
                          onClick={() =>
                            setDraft((prev) =>
                              prev
                                ? { ...prev, groups: (prev.groups || []).filter((_, i) => i !== gi) }
                                : prev,
                            )
                          }
                        >
                          Удалить группу
                        </Button>
                      </Stack>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Название группы"
                            fullWidth
                            size="small"
                            value={g.name || ''}
                            onChange={(e) => updateGroup(gi, { name: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="id"
                            fullWidth
                            size="small"
                            value={g.id || ''}
                            onChange={(e) => updateGroup(gi, { id: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Landing URL"
                            fullWidth
                            size="small"
                            value={g.landing_url || ''}
                            onChange={(e) => updateGroup(gi, { landing_url: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="HOT-ключи группы"
                            fullWidth
                            size="small"
                            multiline
                            minRows={4}
                            value={g.hot_text || ''}
                            onChange={(e) => updateGroup(gi, { hot_text: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Минуса группы"
                            fullWidth
                            size="small"
                            multiline
                            minRows={4}
                            value={g.neg_text || ''}
                            onChange={(e) => updateGroup(gi, { neg_text: e.target.value })}
                            helperText="Слой 3: чужие площадки, «официальный», конфликт-события"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={0.5}
                          >
                            <Typography variant="body2" fontWeight={600}>
                              Объявления ({(g.ads || []).length})
                            </Typography>
                            <Button
                              size="small"
                              onClick={() =>
                                updateGroup(gi, {
                                  ads: [...(g.ads || []), { title: '', title2: '', text: '' }],
                                })
                              }
                            >
                              + объявление
                            </Button>
                          </Stack>
                          {(g.ads || []).map((ad, ai) => (
                            <Box
                              key={ai}
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1.4fr auto' },
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <TextField
                                label="Title"
                                size="small"
                                value={ad.title || ''}
                                onChange={(e) => updateAd(gi, ai, { title: e.target.value })}
                              />
                              <TextField
                                label="Title2"
                                size="small"
                                value={ad.title2 || ''}
                                onChange={(e) => updateAd(gi, ai, { title2: e.target.value })}
                              />
                              <TextField
                                label="Text"
                                size="small"
                                value={ad.text || ''}
                                onChange={(e) => updateAd(gi, ai, { text: e.target.value })}
                              />
                              <Button
                                size="small"
                                color="error"
                                disabled={(g.ads || []).length <= 1}
                                onClick={() =>
                                  updateGroup(gi, {
                                    ads: (g.ads || []).filter((_, j) => j !== ai),
                                  })
                                }
                              >
                                ✕
                              </Button>
                            </Box>
                          ))}
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                ))}

                <Grid item xs={12}>
                  <Button
                    size="small"
                    startIcon={draft.showLegacy ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => setField('showLegacy', !draft.showLegacy)}
                  >
                    Legacy flat (синхронизируется с 1-й/union групп)
                  </Button>
                  <Collapse in={!!draft.showLegacy}>
                    <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                      Редактируйте через группы выше. Flat-поля бэкенд пересобирает при сохранении
                      structure_json.
                    </Alert>
                    <Typography variant="caption" color="text.secondary" component="div">
                      HOT union: {(draft.groups || []).flatMap((g) => linesToArr(g.hot_text || '')).join(' · ') || '—'}
                    </Typography>
                  </Collapse>
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
