import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  createGetbiletEvent,
  fetchPosterForEvent,
  fetchPosterWebForEvent,
  getGetbiletEvent,
  listGetbiletGroups,
  probePosterPage,
  updateGetbiletEvent,
  uploadAdminImage,
} from '@/services/getbiletAdminApi';
import { useToast } from '@/components/common/ToastProvider';

export function GetbiletEventEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isNew = id === 'new';
  const numId = isNew ? NaN : Number(id);

  const { data: groups = [] } = useQuery({
    queryKey: ['getbilet-groups'],
    queryFn: listGetbiletGroups,
  });

  const idValid = !isNew && Number.isFinite(numId);
  const { data: existing, isLoading } = useQuery({
    queryKey: ['getbilet-event', numId],
    queryFn: () => getGetbiletEvent(numId),
    enabled: idValid,
  });

  const [getbilet_external_id, setExt] = useState('');
  const [title_manual, setTitle] = useState('');
  const [poster_url_manual, setPosterUrl] = useState('');
  const [poster_url_web, setPosterWeb] = useState('');
  const [banner_url_manual, setBannerUrl] = useState('');
  const [poster_page_url, setPosterPageUrl] = useState('');
  const [alsoBannerOnFetch, setAlsoBannerOnFetch] = useState(true);
  const [probePreview, setProbePreview] = useState<string | null>(null);
  const [venue_manual, setVenueManual] = useState('');
  const [venue_address_manual, setVenueAddressManual] = useState('');
  const [card_subtitle_manual, setCardSubtitleManual] = useState('');
  const [description_manual, setDesc] = useState('');
  const [notes_internal, setNotes] = useState('');
  const [is_published, setPub] = useState(true);
  const [sort_order, setSort] = useState(0);
  const [group_id, setGroup] = useState<number | ''>('');
  const posterFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existing) return;
    setExt(existing.getbilet_external_id);
    setTitle(existing.title_manual || '');
    setPosterUrl(existing.poster_url_manual || '');
    setPosterWeb(existing.poster_url_web || '');
    setBannerUrl(existing.banner_url_manual || '');
    setPosterPageUrl(existing.poster_page_url || '');
    setVenueManual(existing.venue_manual || '');
    setVenueAddressManual(existing.venue_address_manual || '');
    setCardSubtitleManual(existing.card_subtitle_manual || '');
    setDesc(existing.description_manual || '');
    setNotes(existing.notes_internal || '');
    setPub(existing.is_published);
    setSort(existing.sort_order);
    setGroup(existing.group_id ?? '');
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        getbilet_external_id,
        title_manual: title_manual || null,
        venue_manual: venue_manual?.trim() || null,
        venue_address_manual: venue_address_manual?.trim() || null,
        card_subtitle_manual: card_subtitle_manual?.trim() || null,
        poster_url_manual: poster_url_manual?.trim() || null,
        poster_url_web: poster_url_web?.trim() || null,
        banner_url_manual: banner_url_manual?.trim() || null,
        poster_page_url: poster_page_url?.trim() || null,
        description_manual: description_manual || null,
        notes_internal: notes_internal || null,
        is_published,
        sort_order: Number(sort_order) || 0,
        group_id: group_id === '' ? null : group_id,
      };
      if (isNew) {
        return createGetbiletEvent({
          ...payload,
          getbilet_external_id: getbilet_external_id.trim(),
        });
      }
      return updateGetbiletEvent(numId, payload);
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ['getbilet-events'] });
      queryClient.invalidateQueries({ queryKey: ['getbilet-event'] });
      showToast('Сохранено', 'success');
      if (isNew && row?.id) navigate(`/admin/getbilet/events/${row.id}`, { replace: true });
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  if (!isNew && !idValid) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error" gutterBottom>
          Некорректный адрес.
        </Typography>
        <Button onClick={() => navigate('/admin/getbilet/events')}>К списку</Button>
      </Box>
    );
  }

  if (!isNew && (isLoading || !existing)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {isNew ? 'Новая карточка мероприятия' : 'Редактирование мероприятия'}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          required
          label="Внешний id (GetBilet)"
          value={getbilet_external_id}
          onChange={(e) => setExt(e.target.value)}
          helperText="Тот же id, что в API поставщика"
          fullWidth
          disabled={!isNew}
        />
        <TextField label="Название (ручное)" value={title_manual} onChange={(e) => setTitle(e.target.value)} fullWidth />
        <TextField
          label="Площадка (как на сайте)"
          value={venue_manual}
          onChange={(e) => setVenueManual(e.target.value)}
          fullWidth
          helperText="Перекрывает название площадки из GetBilet. Пусто — из API и справочников"
        />
        <TextField
          label="Адрес площадки"
          value={venue_address_manual}
          onChange={(e) => setVenueAddressManual(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <TextField
          label="Краткий текст на карточке"
          value={card_subtitle_manual}
          onChange={(e) => setCardSubtitleManual(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          helperText="Одна–две строки под заголовком на афише. Если пусто — краткое из «Описание (ручное)» или из API"
        />
        <TextField
          label="URL постера (ручной, приоритет)"
          value={poster_url_manual}
          onChange={(e) => setPosterUrl(e.target.value)}
          fullWidth
          helperText="Задаётся вручную или «Подтянуть постер»; перекрывает картинку из API, шаблон и автопоиск"
        />
        <TextField
          label="URL постера (из поиска)"
          value={poster_url_web}
          onChange={(e) => setPosterWeb(e.target.value)}
          fullWidth
          helperText="Заполняется кнопкой ниже (Google). Если картинка не та — очистите и укажите ручной URL выше"
        />
        <input
          ref={posterFileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const { url } = await uploadAdminImage(f);
              setPosterUrl(url);
              showToast('Постер загружен', 'success');
            } catch (err) {
              showToast((err as Error).message, 'error');
            }
          }}
        />
        <Button variant="outlined" onClick={() => posterFileRef.current?.click()}>
          Загрузить постер с компьютера
        </Button>
        <TextField
          label="URL баннера (hero / широкий)"
          value={banner_url_manual}
          onChange={(e) => setBannerUrl(e.target.value)}
          fullWidth
          helperText="Поле BannerUrl в enrich; для карточек подставляется как fallback, если нет постера"
        />
        <input
          ref={bannerFileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const { url } = await uploadAdminImage(f);
              setBannerUrl(url);
              showToast('Баннер загружен', 'success');
            } catch (err) {
              showToast((err as Error).message, 'error');
            }
          }}
        />
        <Button variant="outlined" onClick={() => bannerFileRef.current?.click()}>
          Загрузить баннер с компьютера
        </Button>
        <TextField
          label="Страница спектакля на сайте театра"
          value={poster_page_url}
          onChange={(e) => setPosterPageUrl(e.target.value)}
          fullWidth
          helperText="Страница с афишей (как на neglinka29.ru / мхат): оттуда берём og:image или картинку из текста"
        />
        <FormControlLabel
          control={
            <Switch checked={alsoBannerOnFetch} onChange={(_, v) => setAlsoBannerOnFetch(v)} />
          }
          label="При подтягивании дублировать в пустой баннер (hero)"
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            color="info"
            disabled={isNew}
            onClick={async () => {
              try {
                const r = await fetchPosterWebForEvent(numId, { force: true });
                if (r.skipped) {
                  showToast(r.reason || 'Пропуск', 'warning');
                  return;
                }
                if (r.row) {
                  setPosterWeb(r.row.poster_url_web || '');
                }
                showToast(r.imageUrl ? 'Обложка из поиска сохранена' : 'Готово', 'success');
              } catch (e) {
                showToast((e as Error).message, 'error');
              }
            }}
          >
            Найти обложку в Google
          </Button>
          <Button
            variant="outlined"
            disabled={!poster_page_url.trim()}
            onClick={async () => {
              setProbePreview(null);
              try {
                const r = await probePosterPage(poster_page_url.trim());
                const lines = r.candidates
                  .slice(0, 6)
                  .map((c) => `${c.source}: ${c.url} (${c.width || '?'}×${c.height || '?'})`);
                setProbePreview(
                  r.bestUrl
                    ? `Лучший: ${r.bestUrl}\n\n${lines.join('\n')}`
                    : 'Картинки не найдены (og / JSON-LD / контент)',
                );
              } catch (e) {
                showToast((e as Error).message, 'error');
              }
            }}
          >
            Проверить страницу
          </Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={isNew || !poster_page_url.trim()}
            onClick={async () => {
              try {
                const r = await fetchPosterForEvent(numId, {
                  url: poster_page_url.trim(),
                  also_banner: alsoBannerOnFetch,
                  force: true,
                });
                if (r.skipped) {
                  showToast(r.reason || 'Пропуск', 'warning');
                  return;
                }
                if (r.row) {
                  setPosterUrl(r.row.poster_url_manual || '');
                  setBannerUrl(r.row.banner_url_manual || '');
                  setPosterPageUrl(r.row.poster_page_url || '');
                }
                showToast('Постер подтянут', 'success');
              } catch (e) {
                showToast((e as Error).message, 'error');
              }
            }}
          >
            Подтянуть постер в карточку
          </Button>
        </Box>
        {probePreview && (
          <Typography component="pre" variant="caption" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
            {probePreview}
          </Typography>
        )}
        <TextField
          label="Описание (ручное)"
          value={description_manual}
          onChange={(e) => setDesc(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          helperText="Необязательно. Разделы: «## Заголовок». Пустое или короткое поле + ключ OpenAI на бэкенде — на сайте подтянется ИИ-текст по названию; длинная уникальная редакция сохраняется как есть."
        />
        <TextField
          label="Внутренние заметки"
          value={notes_internal}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <TextField
          type="number"
          label="Порядок в списке"
          value={sort_order}
          onChange={(e) => setSort(Number(e.target.value))}
          sx={{ maxWidth: 200 }}
        />
        <FormControlLabel
          control={<Switch checked={is_published} onChange={(_, v) => setPub(v)} />}
          label="Показывать на витрине (флаг)"
        />
        <FormControl fullWidth>
          <InputLabel id="gb-group">Группа (для наценки «по группе»)</InputLabel>
          <Select
            labelId="gb-group"
            label="Группа (для наценки «по группе»)"
            value={group_id === '' ? '' : String(group_id)}
            onChange={(e) => {
              const v = e.target.value;
              setGroup(v === '' ? '' : Number(v));
            }}
          >
            <MenuItem value="">— не в группе —</MenuItem>
            {groups.map((g) => (
              <MenuItem key={g.id} value={String(g.id)}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Сохранить
          </Button>
          <Button onClick={() => navigate('/admin/getbilet/events')}>К списку</Button>
        </Box>
      </Box>
    </Box>
  );
}
