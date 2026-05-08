import { useState } from 'react';
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
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  createGetbiletStageMap,
  deleteGetbiletStageMap,
  getGetbiletStageMap,
  listCatalogStageIds,
  importStageMapsFromCatalog,
  listGetbiletStageMaps,
  updateGetbiletStageMap,
  type GetbiletStageMapListRow,
} from '@/services/getbiletAdminApi';
import { useToast } from '@/components/common/ToastProvider';

const emptyForm = {
  stage_external_id: '',
  place_external_id: '',
  title: '',
  svg_markup: '',
  layout_json_text: '{\n  "layoutMode": "auto"\n}',
  external_plan_url: '',
  notes_internal: '',
};

function formatLayoutJson(value: unknown): string {
  if (!value || typeof value !== 'object') return '{\n  "layoutMode": "auto"\n}';
  return JSON.stringify(value, null, 2);
}

function parseLayoutJsonText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('layout_json должен быть JSON-объектом');
    }
    return parsed;
  } catch (e) {
    if (e instanceof Error) throw new Error(`Некорректный layout_json: ${e.message}`);
    throw new Error('Некорректный layout_json');
  }
}

function stageMapStatus(row: GetbiletStageMapListRow): { label: string; color: 'success' | 'warning' | 'default' } {
  const layoutSeats = Number(row.layout_seat_count ?? 0);
  const nativeSeats = Number(row.native_seat_count ?? 0);
  if (layoutSeats >= 2) return { label: `координаты JSON: ${layoutSeats}`, color: 'success' };
  if (nativeSeats >= 2) return { label: `SVG-места: ${nativeSeats}`, color: 'success' };
  if (row.has_svg) return { label: 'только фон', color: 'warning' };
  return { label: 'нет координат', color: 'default' };
}

export function GetbiletStageMapsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['getbilet-stage-maps'],
    queryFn: listGetbiletStageMaps,
  });

  const { data: catalogStages, isLoading: catalogStagesLoading } = useQuery({
    queryKey: ['getbilet-catalog-stage-ids'],
    queryFn: listCatalogStageIds,
    staleTime: 60_000,
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = async (row: GetbiletStageMapListRow) => {
    setEditingId(row.id);
    try {
      const full = await getGetbiletStageMap(row.id);
      setForm({
        stage_external_id: full.stage_external_id,
        place_external_id: full.place_external_id ?? '',
        title: full.title ?? '',
        svg_markup: full.svg_markup ?? '',
        layout_json_text: formatLayoutJson(full.layout_json),
        external_plan_url: full.external_plan_url ?? '',
        notes_internal: full.notes_internal ?? '',
      });
      setDialogOpen(true);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const sid = form.stage_external_id.trim();
      if (!sid) throw new Error('Укажите StageId сцены из GetBilet');
      const body = {
        stage_external_id: sid,
        place_external_id: form.place_external_id.trim() || null,
        title: form.title.trim() || null,
        svg_markup: form.svg_markup.trim() || null,
        layout_json: parseLayoutJsonText(form.layout_json_text),
        external_plan_url: form.external_plan_url.trim() || null,
        notes_internal: form.notes_internal.trim() || null,
      };
      if (editingId != null) {
        return updateGetbiletStageMap(editingId, body);
      }
      return createGetbiletStageMap(body);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['getbilet-stage-maps'] });
      const ws = data?.layoutSanitizeWarnings;
      if (Array.isArray(ws) && ws.length) {
        showToast(ws.join(' '), 'warning');
      } else {
        showToast('Сохранено', 'success');
      }
      setDialogOpen(false);
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const del = useMutation({
    mutationFn: deleteGetbiletStageMap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getbilet-stage-maps'] });
      showToast('Удалено', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const importMut = useMutation({
    mutationFn: importStageMapsFromCatalog,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['getbilet-stage-maps'] });
      const n = data.inserted;
      const total = data.distinct_stages_in_catalog;
      if (total === 0) {
        showToast(
          'В кэше каталога нет stage_id. Сначала нажмите «Синхронизировать каталог» на странице GetBilet: мероприятия.',
          'warning',
        );
        return;
      }
      showToast(
        n > 0
          ? `Добавлено схем: ${n} (всего разных сцен в каталоге: ${total}).`
          : `Все ${total} сцен из каталога уже есть в таблице — правьте SVG по кнопке «Редактировать».`,
        'success',
      );
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
          Таблица getbilet_stage_maps — миграции 071+; одна БД: <code>GETBILET_USE_MAIN_DATABASE=1</code>.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Схемы залов (StageId)
        </Typography>
        <Tooltip title="Создать пустые строки для каждого stage_id из кэша каталога (после синхронизации мероприятий)">
          <span>
            <Button
              variant="outlined"
              onClick={() => importMut.mutate()}
              disabled={importMut.isPending}
              sx={{ mr: 1 }}
            >
              Подтянуть залы из каталога
            </Button>
          </span>
        </Tooltip>
        <Button variant="contained" onClick={openNew}>
          Добавить вручную
        </Button>
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Здесь только то, что уже лежит в PostgreSQL (<code>getbilet_stage_maps</code>). Ручные мероприятия вроде
        финала Кубка на Лужниках с <code>luzhniki-cup-final-2026-stage</code> на проде нужно один раз записать
        скриптом <code>npm run seed:luzhniki-cup-final-2026</code> в каталоге <code>backend</code> или через «Добавить
        вручную». «Подтянуть залы из каталога» добавляет строки только для <code>stage_id</code>, которые уже есть в
        кэше каталога после синхронизации.
      </Alert>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        <strong>Что такое StageId:</strong> внешний id сцены в GetBilet (то же значение, что{' '}
        <code>stageId</code> в каталоге и в ссылке на покупку). В поле «StageId» ниже нужно вставить{' '}
        <strong>ровно эту строку</strong>, чтобы подтянулись SVG / внешняя схема и публичный эндпоинт{' '}
        <code>/api/bilet/stage/:stageId/map</code>. Список значений из кэша каталога (после «Синхронизировать
        каталог» на странице мероприятий) — в таблице ниже; можно копировать оттуда.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <strong>Несколько залов:</strong> у каждой сцены свой <code>stage_id</code> — отдельная строка в этой
        таблице (один SVG / URL на StageId). <strong>Растр вместо вектора:</strong> оберните PNG/JPEG в SVG с
        тегом <code>&lt;image href="/hall-maps/…" /&gt;</code> (файл положите в <code>public/hall-maps/</code>
        при сборке). Готовый пример для основного зала МХТ — файл{' '}
        <code>public/hall-maps/mht-im-chekhova-osnovnoy-zal.embed.svg</code> (скопируйте содержимое в поле ниже).{' '}
        <strong>Важно:</strong> фактические места для брони берутся из ответа GetBilet (ряд/место в списке на
        странице билета), схема только для ориентира; если подписи на картинке расходятся с API, ошибку в заказ
        даёт неверный выбор номера, а не «формат SVG».
        <br />
        <strong>Вектор с кругами мест:</strong> если в SVG есть элементы{' '}
        <code>&lt;circle place-name=&quot;…&quot; row=&quot;…&quot; place=&quot;…&quot; /&gt;</code> (как на
        схемах с посадкой), страница билета сама накладывает кликабельные точки по координатам и сопоставляет их с
        офферами GetBilet по сектору/ряду/месту (названия сектора должны совпадать с ответом API). В{' '}
        <code>layout_json</code> можно задать <code>{`{"layoutMode":"grid"}`}</code> — принудительно старая
        условная сетка поверх картинки; <code>{`{"layoutMode":"svgNative"}`}</code> — только режим по кругам.
      </Typography>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            StageId из кэша каталога
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Счётчик — сколько карточек в кэше с этим <code>stage_id</code>; пример названия — для ориентира.
          </Typography>
        </Box>
        {catalogStagesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>stage_id (вставить в схему зала)</TableCell>
                <TableCell align="right">Карточек в кэше</TableCell>
                <TableCell>Пример спектакля</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(catalogStages?.stages?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      Пока пусто. Выполните синхронизацию каталога в разделе мероприятий GetBilet — сюда
                      попадут все <code>stage_id</code> из ответа API.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                (catalogStages?.stages ?? []).map((s) => (
                  <TableRow key={s.stage_id} hover>
                    <TableCell>
                      <code style={{ wordBreak: 'break-all' }}>{s.stage_id}</code>
                    </TableCell>
                    <TableCell align="right">{s.events_in_cache}</TableCell>
                    <TableCell>{s.sample_title || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>StageId</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Схема</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Пока пусто. Нажмите <strong>Подтянуть залы из каталога</strong> (нужна синхронизация каталога на
                    странице мероприятий) или <strong>Добавить вручную</strong> и вставьте StageId из таблицы выше /
                    из GetBilet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const status = stageMapStatus(r);
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <code>{r.stage_external_id}</code>
                    </TableCell>
                    <TableCell>{r.title || '—'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {r.has_svg ? (
                          <Chip size="small" color="success" label="SVG" />
                        ) : null}
                        {r.has_external_plan ? (
                          <Chip size="small" color="primary" variant="outlined" label="сайт" />
                        ) : null}
                        <Chip size="small" color={status.color} variant="outlined" label={status.label} />
                        {!r.has_svg && !r.has_external_plan ? (
                          <Chip size="small" label="нет подложки" />
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Редактировать">
                        <IconButton size="small" onClick={() => openEdit(r)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm('Удалить схему?')) del.mutate(r.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId != null ? 'Редактирование схемы' : 'Новая схема зала'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            required
            label="StageId (сцена GetBilet)"
            value={form.stage_external_id}
            onChange={(e) => setForm((f) => ({ ...f, stage_external_id: e.target.value }))}
            fullWidth
            helperText="Тот же id, что в каталоге в поле stageId"
            disabled={editingId != null}
          />
          <TextField
            label="PlaceId (площадка, опционально)"
            value={form.place_external_id}
            onChange={(e) => setForm((f) => ({ ...f, place_external_id: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Подпись"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            fullWidth
          />
          <TextField
            label="SVG разметка"
            value={form.svg_markup}
            onChange={(e) => setForm((f) => ({ ...f, svg_markup: e.target.value }))}
            fullWidth
            multiline
            minRows={8}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }}
            helperText="Для интерактива нужен SVG с circle[place-name] или circle[data-replaced]. Для МХТ используйте frontend/public/hall-maps/mht-chekhov-osnovnoy-zal-native.svg."
          />
          <TextField
            label="layout_json"
            value={form.layout_json_text}
            onChange={(e) => setForm((f) => ({ ...f, layout_json_text: e.target.value }))}
            fullWidth
            multiline
            minRows={6}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }}
            helperText={
              'Координаты: {"layoutMode":"svgNative","seatPositions":[{"sector":"Партер","row":"1","seat":"1","xPct":50,"yPct":70}]} — только если в SVG нет circle мест. Если circle есть, координаты из JSON игнорируются (чтобы не ломать карту). Чтобы принудительно взять точки из JSON, добавьте "preferLayoutSeatPositions": true.'
            }
          />
          <TextField
            label="Схема залов на сайте театра (URL)"
            value={form.external_plan_url}
            onChange={(e) => setForm((f) => ({ ...f, external_plan_url: e.target.value }))}
            fullWidth
            placeholder="https://mxat.ru/zritelyam/shema-zalov/"
            helperText="Если SVG нет — на странице билета покажем ссылку (в iframe сайты часто блокируют)."
          />
          <TextField
            label="Внутренние заметки"
            value={form.notes_internal}
            onChange={(e) => setForm((f) => ({ ...f, notes_internal: e.target.value }))}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
