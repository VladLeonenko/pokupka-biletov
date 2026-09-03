import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Checkbox,
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
  getGetbiletManualOffers,
  listGetbiletGroups,
  probePosterPage,
  putGetbiletManualOffers,
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
  const { data: manualOffersData, refetch: refetchManualOffers } = useQuery({
    queryKey: ['getbilet-manual-offers', numId],
    queryFn: () => getGetbiletManualOffers(numId),
    enabled: idValid,
  });
  const manualOffers = manualOffersData?.offers ?? [];

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
  const [competitorUrlsText, setCompetitorUrlsText] = useState('');
  const [is_published, setPub] = useState(true);
  const [sort_order, setSort] = useState(0);
  const [group_id, setGroup] = useState<number | ''>('');
  const [checkoutHideSeatList, setCheckoutHideSeatList] = useState(false);
  const [vipSector, setVipSector] = useState('VIP');
  const [vipRow, setVipRow] = useState('1');
  const [vipSeatCount, setVipSeatCount] = useState(10);
  const [vipCost, setVipCost] = useState(10000);
  const [vipMarkupKind, setVipMarkupKind] = useState<'percent' | 'fixed'>('percent');
  const [vipMarkupValue, setVipMarkupValue] = useState(20);
  const [vipEventDateTime, setVipEventDateTime] = useState('');
  const posterFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existing) return;
    setExt(existing.getbilet_external_id);
    const r = existing.resolved_for_form;
    setTitle((r?.title ?? existing.title_manual) || '');
    setPosterUrl(existing.poster_url_manual || '');
    setPosterWeb(existing.poster_url_web || '');
    setBannerUrl(existing.banner_url_manual || '');
    setPosterPageUrl(existing.poster_page_url || '');
    setVenueManual((r?.venue ?? existing.venue_manual) || '');
    setVenueAddressManual((r?.venue_address ?? existing.venue_address_manual) || '');
    setCardSubtitleManual((r?.card_subtitle ?? existing.card_subtitle_manual) || '');
    setDesc((r?.description ?? existing.description_manual) || '');
    setNotes(existing.notes_internal || '');
    setCompetitorUrlsText(
      Array.isArray(existing.competitor_urls_json)
        ? existing.competitor_urls_json.map((u) => u.url).join('\n')
        : '',
    );
    setPub(existing.is_published);
    setSort(existing.sort_order);
    setGroup(existing.group_id ?? '');
    const pack = existing.description_pack_json;
    const co =
      pack && typeof pack === 'object' && pack.checkout && typeof pack.checkout === 'object'
        ? (pack.checkout as { hideSeatList?: boolean })
        : null;
    setCheckoutHideSeatList(co?.hideSeatList === true);
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const basePack =
        existing?.description_pack_json && typeof existing.description_pack_json === 'object'
          ? { ...existing.description_pack_json }
          : {};
      const description_pack_json = {
        ...basePack,
        checkout: { ...(typeof basePack.checkout === 'object' ? basePack.checkout : {}), hideSeatList: checkoutHideSeatList },
      };
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
        description_pack_json,
        notes_internal: notes_internal || null,
        competitor_urls_json: competitorUrlsText,
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
      {!isNew && existing?.resolved_for_form && (
        <Alert severity="info" sx={{ mb: 0 }}>
          Ниже подставлено то же, что на витрине: кэш каталога GetBilet в БД и при необходимости текст из пакета
          описания. Сохранение записывает значения в карточку.
        </Alert>
      )}
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
        <TextField
          label="Конкуренты: Яндекс Афиша, Портбилет и др. (URL, по одному в строке)"
          value={competitorUrlsText}
          onChange={(e) => setCompetitorUrlsText(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          helperText="С этих страниц снимаем «от N ₽» и сравниваем с нашей витриной"
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
        <FormControlLabel
          control={
            <Checkbox
              checked={checkoutHideSeatList}
              onChange={(e) => setCheckoutHideSeatList(e.target.checked)}
            />
          }
          label="Скрыть «Список мест» на странице билета (стадион / категории)"
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

        {idValid ? (
          <Box sx={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 2, p: 2, display: 'grid', gap: 1.5 }}>
            <Typography variant="h6">VIP / ручные билеты</Typography>
            <Typography variant="body2" color="text.secondary">
              Добавляются поверх GetBilet. Розница = себестоимость + наценка (глобальная наценка на них не
              накладывается повторно).
            </Typography>
            {manualOffersData?.migration_required ? (
              <Alert severity="warning">Нужна миграция 081_getbilet_events_manual_offers_json на сервере.</Alert>
            ) : null}
            {manualOffers.length > 0 ? (
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {manualOffers.map((o, idx) => {
                  const seats = Array.isArray(o.SeatList) ? o.SeatList.length : 0;
                  return (
                    <li key={String(o.Id ?? idx)}>
                      {String(o.Sector ?? '—')} · ряд {String(o.Row ?? '—')} · {seats} мест ·{' '}
                      {String(o.AgentPrice ?? '—')} ₽
                      <Button
                        size="small"
                        color="error"
                        sx={{ ml: 1 }}
                        onClick={async () => {
                          try {
                            const next = manualOffers.filter((_, i) => i !== idx);
                            await putGetbiletManualOffers(numId, { offers: next });
                            await refetchManualOffers();
                            showToast('Удалено', 'success');
                          } catch (e) {
                            showToast(e instanceof Error ? e.message : 'Ошибка', 'error');
                          }
                        }}
                      >
                        Удалить
                      </Button>
                    </li>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2">Пока нет ручных офферов.</Typography>
            )}
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField label="Сектор / зона" value={vipSector} onChange={(e) => setVipSector(e.target.value)} />
              <TextField label="Ряд" value={vipRow} onChange={(e) => setVipRow(e.target.value)} />
              <TextField
                type="number"
                label="Кол-во мест"
                value={vipSeatCount}
                onChange={(e) => setVipSeatCount(Number(e.target.value))}
              />
              <TextField
                type="number"
                label="Себестоимость, ₽"
                value={vipCost}
                onChange={(e) => setVipCost(Number(e.target.value))}
              />
              <FormControl fullWidth>
                <InputLabel id="vip-mk">Наценка</InputLabel>
                <Select
                  labelId="vip-mk"
                  label="Наценка"
                  value={vipMarkupKind}
                  onChange={(e) => setVipMarkupKind(e.target.value as 'percent' | 'fixed')}
                >
                  <MenuItem value="percent">%</MenuItem>
                  <MenuItem value="fixed">фикс, ₽</MenuItem>
                </Select>
              </FormControl>
              <TextField
                type="number"
                label={vipMarkupKind === 'percent' ? 'Наценка %' : 'Наценка, ₽'}
                value={vipMarkupValue}
                onChange={(e) => setVipMarkupValue(Number(e.target.value))}
              />
              <TextField
                label="Дата сеанса (ISO, опц.)"
                placeholder="2026-09-19T19:00"
                value={vipEventDateTime}
                onChange={(e) => setVipEventDateTime(e.target.value)}
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
            </Box>
            <Typography variant="body2">
              Розница ≈{' '}
              {Math.round(
                vipMarkupKind === 'fixed'
                  ? vipCost + vipMarkupValue
                  : vipCost * (1 + vipMarkupValue / 100),
              )}{' '}
              ₽
            </Typography>
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  await putGetbiletManualOffers(numId, {
                    offer: {
                      sector: vipSector,
                      row: vipRow,
                      seatCount: vipSeatCount,
                      supplierPrice: vipCost,
                      markupKind: vipMarkupKind,
                      markupValue: vipMarkupValue,
                      eventDateTime: vipEventDateTime.trim() || undefined,
                      label: vipSector,
                    },
                  });
                  await refetchManualOffers();
                  showToast('Ручной оффер добавлен', 'success');
                } catch (e) {
                  showToast(e instanceof Error ? e.message : 'Ошибка', 'error');
                }
              }}
            >
              Добавить VIP / ручной оффер
            </Button>
          </Box>
        ) : null}

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
