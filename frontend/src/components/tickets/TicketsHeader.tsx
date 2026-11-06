import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BILET_EVENTS_LITE_LIMIT,
  biletEventsLiteQueryKey,
  fetchBiletEventsLite,
} from '@/services/biletPublicApi';
import { useTicketsCityId } from '@/hooks/useTicketsCityId';
import {
  addDays,
  addMonths,
  differenceInCalendarMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isValid,
  max as dfMax,
  parseISO,
  startOfMonth,
  startOfToday,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import { directionsForHeader } from '@/utils/ticketsDirectionsFilter';
import { buildEventsDirectionHref, directionRowKey } from '@/utils/eventsDirectionHref';
import { matchesTicketsChromePath } from '@/utils/ticketsChrome';
import { setTicketsVitrineFaviconBase } from '@/utils/faviconUpdater';
import styles from './TicketsHeader.module.css';
import { TicketsUserMenu } from '@/components/tickets/TicketsUserMenu';
import { TicketsSiteLogo } from '@/components/tickets/TicketsSiteLogo';

const NAV = [
  { to: '/', label: 'Афиша' },
  { to: '/events', label: 'Мероприятия' },
  { to: '/contacts', label: 'Контакты' },
];

function isYearMonth(s: string | null): s is string {
  return s != null && /^\d{4}-\d{2}$/.test(s);
}

export function TicketsHeader() {
  const [open, setOpen] = useState(false);
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const calendarBodyRef = useRef<HTMLDivElement>(null);
  const calendarBodyInnerRef = useRef<HTMLDivElement>(null);
  const [calendarBodyMaxH, setCalendarBodyMaxH] = useState<number | null>(null);
  const loc = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedDate = params.get('date');
  const qFromEvents = loc.pathname === '/events' ? (params.get('q') ?? '') : '';
  const queryClient = useQueryClient();
  const cityId = useTicketsCityId();

  const prefetchEventsCatalog = useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: biletEventsLiteQueryKey(cityId),
      queryFn: () => fetchBiletEventsLite(BILET_EVENTS_LITE_LIMIT),
      staleTime: 120_000,
    });
    // Параллельно греем chunk страницы каталога
    void import('@/pages/public/EventsSearchPage');
  }, [queryClient, cityId]);

  const [searchInput, setSearchInput] = useState('');
  const [monthBlock, setMonthBlock] = useState(0);

  useEffect(() => {
    setSearchInput(qFromEvents);
  }, [qFromEvents]);

  const { data: vitrineRes } = useQuery({
    queryKey: ['tickets-vitrine'],
    queryFn: fetchPublicTicketsVitrine,
    staleTime: 120_000,
  });

  const vitrine = useMemo(() => mergeTicketsVitrine(vitrineRes?.content), [vitrineRes]);
  const directions = directionsForHeader(vitrine.directions);
  const logoTitle = vitrine.header?.logoTitle ?? 'Афиша';
  const logoSub = vitrine.header?.logoSub ?? 'билеты на мероприятия';
  const logoImageUrl = vitrine.header?.logoImageUrl?.trim();
  const logoShowTextWithImage = vitrine.header?.logoShowTextWithImage !== false;
  const logoPlacement = vitrine.header?.logoPlacement === 'center' ? 'center' : 'left';
  const faviconUrl = vitrine.header?.faviconUrl?.trim();

  const ticketsChrome = matchesTicketsChromePath(loc.pathname);

  useEffect(() => {
    if (!ticketsChrome) {
      setTicketsVitrineFaviconBase(null);
      return;
    }
    if (!faviconUrl) {
      setTicketsVitrineFaviconBase(null);
      return;
    }
    setTicketsVitrineFaviconBase(faviconUrl);
    return () => setTicketsVitrineFaviconBase(null);
  }, [ticketsChrome, faviconUrl]);

  const homePaths = loc.pathname === '/' || loc.pathname === '/afisha';

  const today = useMemo(() => startOfToday(), []);
  const dayStripRef = useRef<HTMLDivElement>(null);

  // Авто-скрытие только вниз по скроллу. Обратно — только «Показать даты».
  useEffect(() => {
    if (!homePaths) {
      setCalendarCollapsed(false);
      return;
    }
    let raf = 0;
    let lastY = window.scrollY || document.documentElement.scrollTop || 0;
    const sync = () => {
      raf = 0;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const goingDown = y > lastY + 2;
      lastY = y;
      if (!goingDown) return;
      setCalendarCollapsed((collapsed) => {
        if (collapsed) return collapsed;
        const bodyH = calendarBodyRef.current?.scrollHeight ?? 130;
        if (y >= Math.min(72, bodyH * 0.35)) return true;
        return collapsed;
      });
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(sync);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [homePaths]);

  /** Какой месяц показывают плитки дней (не фильтр афиши). */
  const [viewYm, setViewYm] = useState(() => format(today, 'yyyy-MM'));

  // Плавная высота дат в px — hero поднимается вместе с transition (без scrollTo-рывков)
  useLayoutEffect(() => {
    if (!homePaths) return;
    const inner = calendarBodyInnerRef.current;
    if (!inner) return;
    const contentH = () => Math.max(inner.scrollHeight, 1);
    if (!calendarCollapsed) {
      setCalendarBodyMaxH(contentH());
      return;
    }
    const from = Math.max(contentH(), calendarBodyMaxH ?? 0, 1);
    setCalendarBodyMaxH(from);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setCalendarBodyMaxH(0));
    });
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- анимация только при смене collapsed
  }, [homePaths, calendarCollapsed]);

  useEffect(() => {
    if (!homePaths || calendarCollapsed) return;
    const inner = calendarBodyInnerRef.current;
    if (!inner) return;
    const syncH = () => setCalendarBodyMaxH(Math.max(inner.scrollHeight, 1));
    syncH();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncH) : null;
    ro?.observe(inner);
    return () => ro?.disconnect();
  }, [homePaths, calendarCollapsed, viewYm, monthBlock]);

  // Legacy ?date=yyyy-MM → только вид месяца, без фильтра «весь месяц»
  useEffect(() => {
    if (!homePaths || !isYearMonth(selectedDate)) return;
    const ym = selectedDate;
    setViewYm(ym);
    const monthStart = parseISO(`${ym}-01`);
    if (isValid(monthStart)) {
      const diff = differenceInCalendarMonths(startOfMonth(monthStart), startOfMonth(today));
      if (diff >= 0) setMonthBlock(Math.floor(diff / 3));
    }
    const next = new URLSearchParams(params);
    if (!next.has('date')) return;
    next.delete('date');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при legacy yyyy-MM в URL
  }, [homePaths, selectedDate, today, setParams]);

  // Синхрон viewYm с выбранным днём
  useEffect(() => {
    if (!homePaths || !selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
    const d = parseISO(selectedDate);
    if (!isValid(d)) return;
    const ym = format(d, 'yyyy-MM');
    setViewYm((prev) => (prev === ym ? prev : ym));
    const diff = differenceInCalendarMonths(startOfMonth(d), startOfMonth(today));
    if (diff >= 0) setMonthBlock(Math.floor(diff / 3));
  }, [homePaths, selectedDate, today]);

  const days = useMemo(() => {
    if (!homePaths) {
      return Array.from({ length: 14 }, (_, i) => addDays(today, i));
    }
    const monthStart = parseISO(`${viewYm}-01`);
    if (!isValid(monthStart)) {
      return Array.from({ length: 14 }, (_, i) => addDays(today, i));
    }
    const start = dfMax([today, startOfMonth(monthStart)]);
    const monthEnd = endOfMonth(monthStart);
    if (start > monthEnd) {
      return Array.from({ length: 14 }, (_, i) => addDays(today, i));
    }
    return eachDayOfInterval({ start, end: monthEnd });
  }, [homePaths, viewYm, today]);

  const monthPills = useMemo(() => {
    const base = addMonths(startOfMonth(today), monthBlock * 3);
    return [0, 1, 2].map((i) => addMonths(base, i));
  }, [today, monthBlock]);

  const setDate = (iso: string) => {
    if (homePaths) {
      const next = new URLSearchParams(params);
      if (selectedDate === iso) {
        next.delete('date');
      } else {
        next.set('date', iso);
      }
      setParams(next, { replace: true });
      return;
    }
    navigate(`/?date=${encodeURIComponent(iso)}`);
  };

  /** Пилюля месяца: только лента дней, без выбора всех дат. */
  const focusMonthYm = (ym: string) => {
    setViewYm(ym);
    if (homePaths && isYearMonth(selectedDate)) {
      const next = new URLSearchParams(params);
      next.delete('date');
      setParams(next, { replace: true });
    }
  };

  // Смена месяца → в начало ленты; выбор дня → центрируем плитку
  useEffect(() => {
    const el = dayStripRef.current;
    if (!el || calendarCollapsed) return;
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) && selectedDate.startsWith(viewYm)) {
      const btn = el.querySelector<HTMLElement>(`[data-day-iso="${selectedDate}"]`);
      if (btn) {
        btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        return;
      }
    }
    el.scrollTo({ left: 0, behavior: 'smooth' });
  }, [viewYm, calendarCollapsed]); // не на каждый selectedDate — иначе дёргает при клике

  useEffect(() => {
    const el = dayStripRef.current;
    if (!el || calendarCollapsed) return;
    if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
    if (!selectedDate.startsWith(viewYm)) return;
    const btn = el.querySelector<HTMLElement>(`[data-day-iso="${selectedDate}"]`);
    btn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [selectedDate, viewYm, calendarCollapsed]);

  /**
   * Лента дат — предсказуемо:
   * - тач / горизонтальный тачпад: нативный overflow-x
   * - ЛКМ: drag после порога 8px (клик по дню не ломается)
   * - вертикальный тачпад: страница (не перехватываем)
   * - shift+wheel: горизонтально по ленте
   */
  useEffect(() => {
    const el = dayStripRef.current;
    if (!el || calendarCollapsed) return;

    const DRAG_THRESHOLD = 8;
    let activeId: number | null = null;
    let startX = 0;
    let originScroll = 0;
    let dragging = false;

    const endDrag = (e: PointerEvent) => {
      if (activeId !== e.pointerId) return;
      const wasDragging = dragging;
      activeId = null;
      dragging = false;
      el.classList.remove(styles.calendarStripDragging);
      try {
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (wasDragging) {
        const suppress = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          el.removeEventListener('click', suppress, true);
        };
        el.addEventListener('click', suppress, true);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      activeId = e.pointerId;
      startX = e.clientX;
      originScroll = el.scrollLeft;
      dragging = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activeId !== e.pointerId) return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        dragging = true;
        el.classList.add(styles.calendarStripDragging);
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      el.scrollLeft = originScroll - dx;
    };

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const line = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1;
      const rawX = e.deltaX * line;
      const rawY = e.deltaY * line;
      const absX = Math.abs(rawX);
      const absY = Math.abs(rawY);
      if (absX < 0.5 && absY < 0.5) return;

      // Горизонтальный жест — нативный overflow (не дублируем scrollLeft)
      if (absX >= absY && !e.shiftKey) return;

      // Вертикальный (или shift+wheel) → листаем даты; у края отдаём скролл странице
      const dx = e.shiftKey || absY >= absX ? rawY || rawX : rawX;
      const max = el.scrollWidth - el.clientWidth;
      const atStart = el.scrollLeft <= 0.5;
      const atEnd = el.scrollLeft >= max - 0.5;
      if (dx < 0 && atStart) return;
      if (dx > 0 && atEnd) return;
      e.preventDefault();
      el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + dx));
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('wheel', onWheel);
      el.classList.remove(styles.calendarStripDragging);
    };
  }, [calendarCollapsed, viewYm, days.length]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    navigate(q ? `/events?q=${encodeURIComponent(q)}` : '/events');
  };

  const monthPillLabel = (d: Date) => {
    const y = d.getFullYear();
    const curY = today.getFullYear();
    if (y === curY) {
      return format(d, 'LLLL', { locale: ru });
    }
    return format(d, 'LLLL yyyy', { locale: ru });
  };

  const monthPillKey = (d: Date) => format(d, 'yyyy-MM');

  const isMonthActive = (d: Date) => format(d, 'yyyy-MM') === viewYm;

  return (
    <div role="banner" className={styles.wrap} data-tickets-nav>
      <div className={styles.inner}>
        <div
          className={`${styles.rowTop} ${logoPlacement === 'center' ? styles.rowTopLogoCenter : ''}`.trim()}
        >
          <Link to="/" className={styles.logo} title={`${logoTitle} — ${logoSub}`}>
            <TicketsSiteLogo
              title={logoTitle}
              sub={logoSub}
              imageUrl={logoImageUrl}
              showTextWithImage={logoShowTextWithImage}
            />
          </Link>

          <nav className={styles.nav} aria-label="Основное меню">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onMouseEnter={item.to === '/events' ? prefetchEventsCatalog : undefined}
                onFocus={item.to === '/events' ? prefetchEventsCatalog : undefined}
                onTouchStart={item.to === '/events' ? prefetchEventsCatalog : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.icons}>
            <Tooltip title="Поиск мероприятий">
              <IconButton
                component={Link}
                to="/events"
                size="medium"
                className={styles.iconBtn}
                sx={{ color: 'inherit' }}
                onMouseEnter={prefetchEventsCatalog}
                onFocus={prefetchEventsCatalog}
                onTouchStart={prefetchEventsCatalog}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Избранное">
              <IconButton
                component={Link}
                to="/wishlist"
                size="medium"
                className={styles.iconBtn}
                sx={{ color: 'inherit' }}
              >
                <FavoriteBorderIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Корзина">
              <IconButton component={Link} to="/cart" size="medium" className={styles.iconBtn} sx={{ color: 'inherit' }}>
                <ShoppingCartOutlinedIcon />
              </IconButton>
            </Tooltip>
            <TicketsUserMenu />
            <button
              type="button"
              className={styles.burger}
              aria-label="Меню"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <div
          className={styles.directionsRow}
          aria-label={directions.length > 0 ? 'Направления и поиск' : 'Поиск мероприятий'}
        >
          {directions.length > 0 && (
            <>
              <span className={styles.directionsLabel}>Направления</span>
              <div className={styles.directionsStrip}>
                {directions.map((d) => (
                  <Link
                    key={directionRowKey(d)}
                    to={buildEventsDirectionHref(d)}
                    className={styles.dirPill}
                  >
                    {d.label}
                  </Link>
                ))}
              </div>
            </>
          )}
          <form className={styles.inlineSearch} onSubmit={onSearchSubmit} role="search">
            <input
              type="search"
              name="q"
              className={styles.searchInput}
              placeholder="Поиск по афише…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit" className={styles.searchSubmitIcon} aria-label="Найти">
              <SearchIcon sx={{ fontSize: 18 }} />
            </button>
          </form>
        </div>

        {homePaths ? (
        <div className={styles.calendarRow}>
          <div className={styles.calendarTitleRow}>
            <div className={styles.calendarLabel}>Календарь мероприятий</div>
            <button
              type="button"
              className={styles.calendarToggle}
              aria-expanded={!calendarCollapsed}
              onClick={() => setCalendarCollapsed((value) => !value)}
            >
              {calendarCollapsed ? 'Показать даты' : 'Скрыть даты'}
            </button>
          </div>
          <div
            ref={calendarBodyRef}
            className={`${styles.calendarBody} ${calendarCollapsed ? styles.calendarBodyCollapsed : ''}`}
            style={{
              maxHeight: calendarBodyMaxH == null ? undefined : calendarBodyMaxH,
            }}
            aria-hidden={calendarCollapsed ? 'true' : undefined}
          >
            <div ref={calendarBodyInnerRef} className={styles.calendarBodyInner}>
              <div className={styles.monthNav} aria-label="Быстрый выбор месяца">
                <button
                  type="button"
                  className={styles.monthArrow}
                  aria-label="Предыдущие три месяца"
                  disabled={monthBlock === 0}
                  onClick={() => setMonthBlock((b) => Math.max(0, b - 1))}
                >
                  <ChevronLeftIcon sx={{ fontSize: 22 }} />
                </button>
                <div className={styles.monthPills}>
                  {monthPills.map((d) => {
                    const ym = monthPillKey(d);
                    return (
                      <button
                        key={ym}
                        type="button"
                        className={`${styles.monthPill} ${isMonthActive(d) ? styles.monthPillActive : ''}`}
                        onClick={() => focusMonthYm(ym)}
                      >
                        {monthPillLabel(d)}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={styles.monthArrow}
                  aria-label="Следующие три месяца"
                  onClick={() => setMonthBlock((b) => b + 1)}
                >
                  <ChevronRightIcon sx={{ fontSize: 22 }} />
                </button>
              </div>
              <div
                ref={dayStripRef}
                className={styles.calendarStrip}
                role="list"
                aria-label="Даты выбранного месяца"
              >
                {days.map((d) => {
                  const iso = format(d, 'yyyy-MM-dd');
                  const active = homePaths && selectedDate === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="listitem"
                      data-day-iso={iso}
                      data-tickets-day-active={active ? 'true' : undefined}
                      className={`${styles.dayBtn} ${active ? styles.dayBtnActive : ''}`}
                      onClick={() => setDate(iso)}
                      title={format(d, 'd MMMM yyyy', { locale: ru })}
                    >
                      <div className={styles.dayNum}>{format(d, 'd')}</div>
                      <div className={styles.dayWeek}>{format(d, 'EEE', { locale: ru })}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        ) : null}

        {open && (
          <nav className={styles.mobileNav} aria-label="Мобильное меню">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                onMouseEnter={item.to === '/events' ? prefetchEventsCatalog : undefined}
                onTouchStart={item.to === '/events' ? prefetchEventsCatalog : undefined}
              >
                {item.label}
              </Link>
            ))}
            {directions.map((d) => (
              <Link
                key={`m-${directionRowKey(d)}`}
                to={buildEventsDirectionHref(d)}
                onClick={() => setOpen(false)}
              >
                {d.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
