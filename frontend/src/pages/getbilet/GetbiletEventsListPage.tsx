import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import {
  batchFetchPosters,
  batchFetchPostersWeb,
  batchPostersFromCacheImages,
  deleteGetbiletEvent,
  listGetbiletEvents,
  syncGetbiletCatalog,
  type GetbiletEventRow,
} from '@/services/getbiletAdminApi';

function isAbsentFromLastCatalog(r: GetbiletEventRow): boolean {
  const sync = r.catalog_last_sync_at;
  if (!sync) return false;
  const seen = r.last_seen_in_catalog_at;
  if (!seen) return true;
  return new Date(seen).getTime() < new Date(sync).getTime();
}
import { useToast } from '@/components/common/ToastProvider';

export function GetbiletEventsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['getbilet-events'],
    queryFn: listGetbiletEvents,
  });

  const del = useMutation({
    mutationFn: deleteGetbiletEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getbilet-events'] });
      showToast('Удалено', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const syncCatalog = useMutation({
    mutationFn: syncGetbiletCatalog,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['getbilet-events'] });
      showToast(`Каталог синхронизирован: ${data.count} позиций`, 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const batchPosters = useMutation({
    mutationFn: () =>
      batchFetchPosters({ limit: 40, also_banner: true, delay_ms: 450, force: false }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['getbilet-events'] });
      if (data.hint) {
        showToast(data.hint, 'warning');
        return;
      }
      const ok = data.results.filter((x) => x.ok).length;
      const fail = data.results.length - ok;
      showToast(`Готово: ${ok} ок, ${fail} ошибок из ${data.results.length}`, fail ? 'warning' : 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const batchWebPosters = useMutation({
    mutationFn: () => batchFetchPostersWeb({ limit: 25, force: false, delay_ms: 700 }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['getbilet-events'] });
      if (data.hint) {
        showToast(data.hint, 'warning');
        return;
      }
      const ok = data.results.filter((x) => x.ok).length;
      const fail = data.results.length - ok;
      showToast(`Поиск Google: ${ok} ок, ${fail} без картинки`, fail ? 'warning' : 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const postersFromCache = useMutation({
    mutationFn: batchPostersFromCacheImages,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['getbilet-events'] });
      showToast(
        data.hint ?? `Обложки из API кэша: обновлено ${data.updated}`,
        data.hint ? 'warning' : 'success',
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
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => refetch()}>
          {(error as Error)?.message || 'Не удалось загрузить список'}
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Проверьте: роль admin или sales_manager; в backend/.env —{' '}
          <code>GETBILET_USE_MAIN_DATABASE=1</code> и миграции GetBilet в той же БД, что CRM; или отдельные TICKET_PG*.
        </Typography>
        <Button onClick={() => refetch()}>Повторить</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Мероприятия GetBilet
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          disabled={syncCatalog.isPending}
          onClick={() => {
            if (!window.confirm('Скачать каталог из GetBilet API в БД и создать карточки для новых спектаклей?')) return;
            syncCatalog.mutate();
          }}
        >
          Синхронизировать каталог
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          disabled={postersFromCache.isPending}
          onClick={() => {
            if (!window.confirm('Заполнить постеры из ImageUrl в кэше каталога (нужна сначала синхронизация)?')) return;
            postersFromCache.mutate();
          }}
        >
          Постеры из кэша API
        </Button>
        <Button
          variant="outlined"
          disabled={batchPosters.isPending}
          onClick={() => {
            if (
              !window.confirm(
                'Подтянуть постеры со страниц театров для всех карточек, где задан URL страницы и ещё нет постера?',
              )
            ) {
              return;
            }
            batchPosters.mutate();
          }}
        >
          Массово: постеры со страниц
        </Button>
        <Button
          variant="outlined"
          color="info"
          disabled={batchWebPosters.isPending}
          onClick={() => {
            if (
              !window.confirm(
                'Найти обложки в Google по названию (нужны ключи в .env)? Заполняется поле «из поиска», не ручной постер.',
              )
            ) {
              return;
            }
            batchWebPosters.mutate();
          }}
        >
          Массово: Google (картинки)
        </Button>
        <Button variant="contained" onClick={() => navigate('/admin/getbilet/events/new')}>
          Добавить карточку
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {rows.length === 0 ? (
          <>
            Список пустой, пока вы не загрузите каталог из GetBilet или не создадите карточку вручную. После
            появления строк укажите «Страницу спектакля» в карточке и подтяните постер.
          </>
        ) : (
          <>
            Каталог в БД не затирается при исчезновении спектакля из GetBilet: карточка и кэш остаются до следующего
            сезона. Метка «не в последнем каталоге» — не было в ответе при последней синхронизации.
          </>
        )}
      </Typography>
      {rows.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>Шаг 1.</strong> Нажмите «Синхронизировать каталог» — бэкенд запросит репертуар у GetBilet и
            создаст строки в этой таблице (и кэш в БД). Нужны рабочие ключи в <code>backend/.env</code>{' '}
            (<code>GETBILET_USER_ID</code>, <code>GETBILET_HASH</code>, протокол <code>auto</code> или{' '}
            <code>rest_v2</code>).
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>Шаг 2 (опционально).</strong> «Добавить карточку» — если нужно вручную привязать один id
            репертуара.
          </Typography>
          <Button
            variant="contained"
            size="medium"
            disabled={syncCatalog.isPending}
            onClick={() => {
              if (!window.confirm('Скачать каталог из GetBilet API в БД и создать карточки для новых спектаклей?')) {
                return;
              }
              syncCatalog.mutate();
            }}
          >
            Синхронизировать каталог сейчас
          </Button>
        </Alert>
      )}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 72 }}> </TableCell>
              <TableCell>Внешний id</TableCell>
              <TableCell>Название (ручное)</TableCell>
              <TableCell>Порядок</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Каталог</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Пока нет строк — выполните синхронизацию выше или добавьте карточку вручную.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    {(r.poster_url_manual || r.poster_url_web) ? (
                      <Box
                        component="img"
                        src={(r.poster_url_manual || r.poster_url_web) as string}
                        alt=""
                        sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 1 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{r.getbilet_external_id}</TableCell>
                  <TableCell>{r.title_manual || '—'}</TableCell>
                  <TableCell>{r.sort_order}</TableCell>
                  <TableCell>
                    {r.is_published ? (
                      <Chip size="small" label="В продаже" color="success" variant="outlined" />
                    ) : (
                      <Chip size="small" label="Скрыто" />
                    )}
                  </TableCell>
                  <TableCell>
                    {isAbsentFromLastCatalog(r) ? (
                      <Tooltip title="В последнем ответе GetBilet при синхронизации этого id не было — данные в БД сохранены">
                        <Chip size="small" label="Нет в последнем каталоге" color="warning" variant="outlined" />
                      </Tooltip>
                    ) : r.catalog_last_sync_at ? (
                      <Chip size="small" label="В каталоге" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Редактировать">
                      <IconButton size="small" onClick={() => navigate(`/admin/getbilet/events/${r.id}`)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (confirm(`Удалить карточку ${r.getbilet_external_id}?`)) del.mutate(r.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
