import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [calendarAutoHidden, setCalendarAutoHidden] = useState(false);
  const calendarAutoHiddenRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (!ticketsChrome) return undefined;
    if (window.matchMedia('(max-width: 899px)').matches) {
      calendarAutoHiddenRef.current = false;
      setCalendarAutoHidden(false);
      setCalendarCollapsed(false);
      return undefined;
    }
    const updateCalendarVisibility = () => {
      scrollRafRef.current = null;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      // Плашка видна только у самого верха страницы.
      const hidden = y > 8;
      lastScrollYRef.current = y;
      if (calendarAutoHiddenRef.current !== hidden) {
        calendarAutoHiddenRef.current = hidden;
        setCalendarAutoHidden(hidden);
      }
      if (!hidden) {
        setCalendarCollapsed(false);
      }
    };
    const scheduleCalendarVisibilityUpdate = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(updateCalendarVisibility);
    };
    updateCalendarVisibility();
    window.addEventListener('scroll', scheduleCalendarVisibilityUpdate, { passive: true });
    return () => {
      window.removeEventListener('scroll', scheduleCalendarVisibilityUpdate);
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [ticketsChrome]);

  const homePaths = loc.pathname === '/' || loc.pathname === '/afisha';

  const today = useMemo(() => startOfToday(), []);
  const dayStripRef = useRef<HTMLDivElement>(null);

  /** Какой месяц показывают плитки дней (не фильтр афиши). */
  const [viewYm, setViewYm] = useState(() => format(today, 'yyyy-MM'));

  // Legacy ?date=yyyy-MM раньше «выбирал весь месяц» — теперь только листаем ленту дней
  useEffect(() => {
    if (!homePaths || !isYearMonth(selectedDate)) return;
    setViewYm(selectedDate);
    const monthStart = parseISO(`${selectedDate}-01`);
    if (isValid(monthStart)) {
      const diff = differenceInCalendarMonths(startOfMonth(monthStart), startOfMonth(today));
      if (diff >= 0) setMonthBlock(Math.floor(diff / 3));
    }
    const next = new URLSearchParams(params);
    next.delete('date');
    setParams(next, { replace: true });
  }, [homePaths, selectedDate, today, params, setParams]);

  // Синхрон viewYm с выбранным днём
  useEffect(() => {
    if (!homePaths || !selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
    const d = parseISO(selectedDate);
    if (!isValid(d)) return;
    const ym = format(d, 'yyyy-MM');
    setViewYm(ym);
    const diff = differenceInCalendarMonths(startOfMonth(d), startOfMonth(today));
    if (diff >= 0) setMonthBlock(Math.floor(diff / 3));
  }, [homePaths, selectedDate, today]);

  // Сброс скролла дней при смене месяца
  useEffect(() => {
    const el = dayStripRef.current;
    if (!el) return;
    el.scrollLeft = 0;
  }, [viewYm]);

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
    // Кликнули день — только конкретная дата в URL (не весь месяц)
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

  /** Пилюля месяца: переключает ленту дней, не выбирает «все даты месяца». */
  const focusMonthYm = (ym: string) => {
    setViewYm(ym);
    // Если в URL застрял legacy ?date=yyyy-MM — убираем, иначе афиша фильтрует весь месяц
    if (homePaths && isYearMonth(selectedDate)) {
      const next = new URLSearchParams(params);
      next.delete('date');
      setParams(next, { replace: true });
    }
  };

  const scrollDayStrip = (dir: -1 | 1) => {
    const el = dayStripRef.current;
    if (!el) return;
    const step = Math.max(160, Math.floor(el.clientWidth * 0.7));
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // Drag-to-scroll ленты дат (колёсико мыши на десктопе крутит страницу, а не дни)
  useEffect(() => {
    const el = dayStripRef.current;
    if (!el || calendarCollapsed) return;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // native touch scroll
      dragging = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (moved) {
        // подавить клик по дню после драга
        const block = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          el.removeEventListener('click', block, true);
        };
        el.addEventListener('click', block, true);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
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
        <div
          className={`${styles.calendarRow} ${calendarAutoHidden ? styles.calendarRowAutoHidden : ''}`}
          aria-hidden={calendarAutoHidden ? 'true' : undefined}
        >
          <div className={styles.calendarRowInner}>
            <div className={styles.calendarHead}>
              <div className={styles.calendarTitleRow}>
                <div className={styles.calendarLabel}>Календарь мероприятий</div>
                <button
                  type="button"
                  className={styles.calendarToggle}
                  onClick={() => setCalendarCollapsed((value) => !value)}
                >
                  {calendarCollapsed ? 'Показать даты' : 'Скрыть даты'}
                </button>
              </div>
              {!calendarCollapsed ? (
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
              ) : null}
            </div>

            {!calendarCollapsed ? (
            <div className={styles.dayNav} aria-label="Даты выбранного месяца">
              <button
                type="button"
                className={styles.dayArrow}
                aria-label="Прокрутить даты влево"
                onClick={() => scrollDayStrip(-1)}
              >
                <ChevronLeftIcon sx={{ fontSize: 22 }} />
              </button>
              <div ref={dayStripRef} className={styles.calendarStrip} role="list">
                {days.map((d) => {
                  const iso = format(d, 'yyyy-MM-dd');
                  const active = homePaths && selectedDate === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="listitem"
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
              <button
                type="button"
                className={styles.dayArrow}
                aria-label="Прокрутить даты вправо"
                onClick={() => scrollDayStrip(1)}
              >
                <ChevronRightIcon sx={{ fontSize: 22 }} />
              </button>
            </div>
            ) : null}
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
