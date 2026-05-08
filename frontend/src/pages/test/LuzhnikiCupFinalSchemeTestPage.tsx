import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { TicketEventPosterImg } from '@/components/tickets/TicketEventPosterImg';
import {
  TicketHallInteractiveBlock,
  type HallOfferRow,
  type HallSelectedSeat,
} from '@/components/tickets/TicketHallInteractiveBlock';
import { fetchLuzhnikiFootballStadiumPreview } from '@/services/biletPublicApi';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';
import ticketStyles from '@/pages/public/TicketCheckoutPage.module.css';

const DEMO_EVENT_ISO = '2026-05-24T15:00:00.000Z';
const DISPLAY_TITLE = 'Финал Кубка России по футболу — Спартак Москва · Краснодар';
const VENUE = 'Стадион «Лужники»';
const VENUE_ADDRESS = 'ул. Лужники, 24, Москва';

const PRICE_COLORS = ['#1a237e', '#2e7d32', '#f9a825', '#0277bd', '#e65100', '#6a1b9a', '#37474f'];

function priceKey(o: HallOfferRow): string {
  return String(o.AgentPrice ?? o.NominalPrice ?? '0');
}

function colorForPrice(priceMap: Map<string, number>, p: string): string {
  const idx = priceMap.get(p) ?? 0;
  return PRICE_COLORS[idx % PRICE_COLORS.length];
}

function minPriceForOffers(rows: HallOfferRow[]): number | null {
  const nums = rows.map((r) => Number(priceKey(r))).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

export function LuzhnikiCupFinalSchemeTestPage() {
  const theme = useTheme();
  const fullScreenMap = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [draftSrc, setDraftSrc] = useState(searchParams.get('eventSourceId') ?? '');
  const [draftDate, setDraftDate] = useState(searchParams.get('eventDateId') ?? '');

  const eventSourceId = searchParams.get('eventSourceId') ?? undefined;
  const eventDateId = searchParams.get('eventDateId') ?? undefined;
  const sourceMode: 'pbilet' | 'inkscape' =
    searchParams.get('source') === 'inkscape' ? 'inkscape' : 'pbilet';

  const setSourceMode = (mode: 'pbilet' | 'inkscape') => {
    const next = new URLSearchParams(searchParams);
    if (mode === 'inkscape') next.set('source', 'inkscape');
    else next.delete('source');
    setSearchParams(next);
  };

  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [mapSelectedSeats, setMapSelectedSeats] = useState<HallSelectedSeat[]>([]);
  const [demoReserveOpen, setDemoReserveOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['luzhniki-football-stadium-preview', sourceMode, eventSourceId, eventDateId],
    queryFn: () =>
      fetchLuzhnikiFootballStadiumPreview({
        ...(sourceMode === 'inkscape' ? { source: 'inkscape' as const } : {}),
        ...(sourceMode === 'pbilet' ? { eventSourceId, eventDateId } : {}),
        demoEventIso: DEMO_EVENT_ISO,
      }),
    staleTime: 60_000,
  });

  const offers = (data?.demoOffers ?? []) as HallOfferRow[];

  const selectedSessionKey = DEMO_EVENT_ISO;

  const offersForMap = useMemo(
    () => offers.filter((o) => (o as HallOfferRow & { EventDateTime?: string }).EventDateTime === selectedSessionKey),
    [offers, selectedSessionKey],
  );

  const hallSvg = data?.svg_markup ?? null;
  const hallMapSessionKey = hallSvg ? selectedSessionKey : null;

  const priceMap = useMemo(() => {
    const sorted = Array.from(new Set(offers.map(priceKey))).sort((a, b) => Number(a) - Number(b));
    const m = new Map<string, number>();
    sorted.forEach((p, i) => m.set(p, i));
    return m;
  }, [offers]);

  const colorSeat = useCallback((p: string) => colorForPrice(priceMap, p), [priceMap]);

  const minPriceHero = offers.length > 0 ? minPriceForOffers(offers) : null;

  const selectedOfferForMap = useMemo(
    () => (offerId ? (offersForMap.find((o) => String(o.Id ?? '') === offerId) ?? null) : null),
    [offerId, offersForMap],
  );

  const baseTotalRub = useMemo(() => {
    if (mapSelectedSeats.length > 0) {
      return mapSelectedSeats.reduce((sum, seat) => {
        const price = Number(seat.priceKey);
        return Number.isFinite(price) ? sum + price : sum;
      }, 0);
    }
    if (!offerId || seats.length === 0) return 0;
    const row = offersForMap.find((o) => String(o.Id ?? '') === offerId);
    if (!row) return 0;
    const u = Number(priceKey(row));
    if (!Number.isFinite(u)) return 0;
    return u * seats.length;
  }, [mapSelectedSeats, offerId, seats, offersForMap]);

  const toggleSeat = (oid: string, seat: string, available: string[]) => {
    setMapSelectedSeats([]);
    if (offerId !== oid) {
      setOfferId(oid);
      setSeats([seat]);
      return;
    }
    setSeats((prev) => {
      if (prev.includes(seat)) return prev.filter((s) => s !== seat);
      if (!available.includes(seat)) return prev;
      return [...prev, seat];
    });
  };

  const handleMapSelectionChange = useCallback((details: HallSelectedSeat[]) => {
    setMapSelectedSeats(details);
    if (details.length === 0) {
      setOfferId(null);
      setSeats([]);
      setDemoReserveOpen(false);
      return;
    }
    const primaryOfferId = details[0].offerId;
    setOfferId(primaryOfferId);
    setSeats(details.filter((d) => d.offerId === primaryOfferId).map((d) => d.seat));
  }, []);

  const resetSelectedSeats = useCallback(() => {
    setOfferId(null);
    setSeats([]);
    setMapSelectedSeats([]);
    setDemoReserveOpen(false);
  }, []);

  const navigateToPlacesList = useCallback(() => {
    setMapDialogOpen(false);
    requestAnimationFrame(() => {
      document.getElementById('luzhniki-test-debug')?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const applyPbiletIds = () => {
    const next = new URLSearchParams(searchParams);
    const s = draftSrc.trim();
    const d = draftDate.trim();
    if (s) next.set('eventSourceId', s);
    else next.delete('eventSourceId');
    if (d) next.set('eventDateId', d);
    else next.delete('eventDateId');
    setSearchParams(next);
  };

  const sessionLabelRu = useMemo(() => {
    try {
      const d = new Date(DEMO_EVENT_ISO);
      return d.toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
    } catch {
      return DEMO_EVENT_ISO;
    }
  }, []);

  const heroLead =
    'Тестовая страница: та же оболочка и интерактив схемы, что на странице билета (театр МХТ и стадион Лукойл в проде). Оформление заказа здесь отключено — только превью геометрии Лужников.';

  return (
    <>
      <SeoMetaTags
        title="Тест: схема Лужники — финал Кубка России"
        description="Отладочная страница схемы стадиона (pbilet layout). Не для продвижения."
        noindex
      />
      <Box className={ticketStyles.page}>
        <div className={ticketStyles.hero}>
          <div className={ticketStyles.heroMedia}>
            <div
              className={ticketStyles.heroImg}
              style={{ background: posterGradientFromId('luzhniki-cup-final-preview') }}
              aria-hidden
            />
            <div className={ticketStyles.heroVignette} />
            <div className={ticketStyles.heroGradientBottom} />
          </div>
          <div className={ticketStyles.heroShell}>
            <div className={ticketStyles.heroGrid}>
              <div className={ticketStyles.heroCopy}>
                <Link to="/events" className={ticketStyles.heroCrumb}>
                  ← К афише
                </Link>
                <Typography variant="h4" component="h1" className={ticketStyles.heroTitle}>
                  {DISPLAY_TITLE}
                </Typography>
                <div className={ticketStyles.heroVenueBlock}>
                  <Typography variant="caption" component="p" className={ticketStyles.heroVenueKicker}>
                    Площадка проведения
                  </Typography>
                  <Typography variant="body2" component="p" className={ticketStyles.heroVenue}>
                    {VENUE}
                  </Typography>
                  <Typography variant="body2" component="p" className={ticketStyles.heroVenueAddress}>
                    {VENUE_ADDRESS}
                  </Typography>
                </div>
                <Typography variant="body2" component="p" className={ticketStyles.heroSubline}>
                  {sessionLabelRu}
                </Typography>
                <Typography variant="body2" component="p" className={ticketStyles.heroLead}>
                  {heroLead}
                </Typography>
                {minPriceHero != null ? (
                  <div className={ticketStyles.heroChips}>
                    <span className={`${ticketStyles.heroChip} ${ticketStyles.heroChipAccent}`}>
                      от {minPriceHero.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className={ticketStyles.heroChip}>демо-цены для кликов на схеме</span>
                  </div>
                ) : null}
              </div>
              <div className={ticketStyles.heroPosterWrap}>
                <TicketEventPosterImg
                  src=""
                  gradientId="luzhniki-cup-final-side"
                  className={ticketStyles.heroPosterImg}
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>

        <Box className={ticketStyles.wrap} sx={{ maxWidth: 960, mx: 'auto', p: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Источник схемы
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={sourceMode}
              onChange={(_, v) => {
                if (v === 'pbilet' || v === 'inkscape') setSourceMode(v);
              }}
              aria-label="Источник превью схемы"
            >
              <ToggleButton value="pbilet">pbilet</ToggleButton>
              <ToggleButton value="inkscape">Inkscape (локально)</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {isError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(error as Error)?.message || 'Не удалось загрузить превью схемы'}
            </Alert>
          ) : null}

          {data?.meta ? (
            <Alert
              severity={
                data.meta.mode === 'pbilet_tickets'
                  ? 'success'
                  : data.meta.mode === 'inkscape_synthetic'
                    ? 'warning'
                    : 'info'
              }
              sx={{ mb: 2 }}
            >
              Режим данных: <strong>{data.meta.mode}</strong> · layout <strong>{data.meta.layoutId}</strong> · секторов{' '}
              {data.meta.sectorCount}, точек мест {data.meta.seatCount}.
              {data.meta.mode === 'inkscape_synthetic' && data.meta.svgPath ? (
                <>
                  {' '}
                  Файл на сервере: <code style={{ wordBreak: 'break-all' }}>{data.meta.svgPath}</code>
                </>
              ) : null}
              {data.meta.mode !== 'pbilet_tickets' && data.meta.mode !== 'inkscape_synthetic'
                ? ' Для координат как у донора передайте event_source_id и event_date_id (ниже или env на backend).'
                : null}
              {data.meta.mode === 'inkscape_synthetic'
                ? ' Места синтетические по bbox сектора; положите экспорт в frontend/public/maps/luzhniki-go.svg или задайте LUZHNIKI_INKSCAPE_SVG_PATH.'
                : null}
            </Alert>
          ) : null}
        </Box>

        <Box id="ticket-places-and-prices" className={ticketStyles.wrap} sx={{ maxWidth: 960, mx: 'auto', px: 2, pb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 1,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>
              Выберите места
            </Typography>
          </Box>

          {isLoading ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Загрузка схемы…
            </Typography>
          ) : null}

          {hallSvg && hallMapSessionKey ? (
            <Paper className={ticketStyles.primaryHallMap} elevation={0}>
              <Box className={ticketStyles.primaryHallMapHead}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Схема зала
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Кликните по свободному месту на схеме. На боевой странице события здесь же будет кнопка «Забронировать»
                    с переходом к оплате GetBilet.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EventSeatIcon />}
                  onClick={() => setMapDialogOpen(true)}
                >
                  На весь экран
                </Button>
              </Box>
              <TicketHallInteractiveBlock
                hallSvgHtml={hallSvg}
                layoutJson={data?.layout_json}
                offers={offersForMap}
                getPriceKey={priceKey}
                colorForSeat={colorSeat}
                activeOfferId={offerId}
                selectedSeats={seats}
                onToggleSeat={toggleSeat}
                selectedOffer={selectedOfferForMap}
                onReserveFromMap={() => setDemoReserveOpen(true)}
                onClearSelection={resetSelectedSeats}
                onSelectionChange={handleMapSelectionChange}
                reservePending={false}
                onNavigateToList={navigateToPlacesList}
              />
            </Paper>
          ) : null}

          <Accordion id="luzhniki-test-debug" defaultExpanded={false} sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 700 }}>Отладка: живой pbilet tickets и метаданные</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Строк офферов (демо): {offers.length}. Это не страница продажи — только проверка отрисовки.
                  {sourceMode === 'inkscape'
                    ? ' Режим Inkscape не использует pbilet tickets — поля ниже отключены.'
                    : null}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    disabled={sourceMode === 'inkscape'}
                    label="event_source_id"
                    value={draftSrc}
                    onChange={(e) => setDraftSrc(e.target.value)}
                    sx={{ minWidth: 200 }}
                  />
                  <TextField
                    size="small"
                    disabled={sourceMode === 'inkscape'}
                    label="event_date_id"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    sx={{ minWidth: 200 }}
                  />
                  <Button
                    variant="contained"
                    size="medium"
                    onClick={applyPbiletIds}
                    disabled={sourceMode === 'inkscape'}
                  >
                    Применить и перезагрузить
                  </Button>
                  <Button variant="text" size="small" onClick={() => refetch()}>
                    Обновить
                  </Button>
                </Box>
              </Paper>
            </AccordionDetails>
          </Accordion>
        </Box>

        <Dialog
          open={Boolean(mapDialogOpen && hallSvg && hallMapSessionKey)}
          onClose={() => setMapDialogOpen(false)}
          fullScreen={fullScreenMap}
          maxWidth="lg"
          fullWidth
          scroll="paper"
          slotProps={{
            paper: {
              sx: {
                display: 'flex',
                flexDirection: 'column',
                maxHeight: fullScreenMap ? '100%' : '95vh',
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
              pr: 1,
              py: 1.5,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                План рассадки
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {sessionLabelRu}
              </Typography>
            </Box>
            <IconButton aria-label="Закрыть" onClick={() => setMapDialogOpen(false)} edge="end" size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent
            sx={{
              flex: '1 1 auto',
              minHeight: 0,
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: '#fafafa',
            }}
          >
            {hallSvg && hallMapSessionKey ? (
              <Box sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', px: 0 }}>
                <TicketHallInteractiveBlock
                  variant="dialog"
                  hallSvgHtml={hallSvg}
                  layoutJson={data?.layout_json}
                  offers={offersForMap}
                  getPriceKey={priceKey}
                  colorForSeat={colorSeat}
                  activeOfferId={offerId}
                  selectedSeats={seats}
                  onToggleSeat={toggleSeat}
                  selectedOffer={selectedOfferForMap}
                  onReserveFromMap={() => setDemoReserveOpen(true)}
                  onClearSelection={resetSelectedSeats}
                  onSelectionChange={handleMapSelectionChange}
                  reservePending={false}
                  onNavigateToList={navigateToPlacesList}
                />
              </Box>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={demoReserveOpen} onClose={() => setDemoReserveOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Тестовая страница</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Оформление заказа на этом URL отключено: это превью схемы Лужников с демо-офферами. На продакшене для
              реального события блок будет тем же, но «Забронировать» откроет оплату через GetBilet.
            </Typography>
            {baseTotalRub > 0 ? (
              <Typography variant="body2" color="text.secondary">
                Условная сумма выбранных мест: {baseTotalRub.toLocaleString('ru-RU')} ₽
              </Typography>
            ) : null}
            <Button sx={{ mt: 2 }} variant="contained" fullWidth onClick={() => setDemoReserveOpen(false)}>
              Понятно
            </Button>
          </DialogContent>
        </Dialog>
      </Box>
    </>
  );
}
