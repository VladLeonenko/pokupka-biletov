import { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect, SyntheticEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, CircularProgress, Chip, IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { listPublicCases } from '@/services/publicApi';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import {
  clearMoveSamples,
  pushMoveSample,
  scrollVelocityPerFrameFromSamples,
} from '@/utils/portfolioCarouselLane';
import {
  getHorizontalWheelDelta,
  isClearlyVerticalPageScroll,
  scaleWheelDelta,
} from '@/utils/portfolioCarouselWheel';

type Category = 'all' | 'website' | 'mobile' | 'ai' | 'seo' | 'advertising' | 'design' | 'marketing';

const CATS: { val: Category; label: string }[] = [
  { val: 'all', label: 'Все' },
  { val: 'website', label: 'Сайты' },
  { val: 'mobile', label: 'Мобильные' },
  { val: 'ai', label: 'AI' },
  { val: 'seo', label: 'SEO' },
  { val: 'advertising', label: 'Реклама' },
  { val: 'design', label: 'Дизайн' },
  { val: 'marketing', label: 'Маркетинг' },
];

function getCat(c: any): Category {
  if (c.category && ['website', 'mobile', 'ai', 'seo', 'advertising', 'design', 'marketing'].includes(c.category)) return c.category;
  const t = ((c.title || '') + ' ' + (c.summary || '')).toLowerCase();
  const tags = (c.tags || []).join(' ').toLowerCase();
  const all = t + ' ' + tags;
  if (all.includes('ai') || all.includes('boost')) return 'ai';
  if (all.includes('seo') || all.includes('продвижение')) return 'seo';
  if (all.includes('маркетинг') || all.includes('smm')) return 'marketing';
  if (all.includes('реклама') || all.includes('контекст') || all.includes('таргет')) return 'advertising';
  if (all.includes('дизайн') || all.includes('figma') || all.includes('ui/ux')) return 'design';
  if (all.includes('мобил') || all.includes('app') || all.includes('flutter') || all.includes('react native')) return 'mobile';
  return 'website';
}

function getCategories(c: any): Category[] {
  const valid: Category[] = ['website', 'mobile', 'ai', 'seo', 'advertising', 'design', 'marketing'];
  if (Array.isArray(c.categories) && c.categories.length) {
    return c.categories.filter((x: string) => valid.includes(x as Category));
  }
  if (c.category && valid.includes(c.category as Category)) return [c.category as Category];
  return [getCat(c)];
}

/** Сколько карточек одновременно в «окне» на md+ (логика шагов и счётчика) */
const VISIBLE = 3;

export function PortfolioPage() {
  const navigate = useNavigate();
  const [cat, setCat] = useState<Category>('all');
  const [current, setCurrent] = useState(0);
  const [maxSlideIndex, setMaxSlideIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const dragRef = useRef<{ pointerId: number } | null>(null);
  const moveSamplesRef = useRef<{ list: { dx: number; t: number }[] }>({ list: [] });
  const momentumRafRef = useRef<number | null>(null);
  const suppressCardClickRef = useRef(false);
  const lastPointerXRef = useRef<number | null>(null);
  const [laneDragging, setLaneDragging] = useState(false);

  const { data: cases = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['publicCases'],
    queryFn: listPublicCases,
    retry: 1,
    staleTime: 60000,
  });
  const filtered = useMemo(() => {
    const f = cat === 'all' ? cases : cases.filter((c: any) => getCategories(c).includes(cat));
    return f;
  }, [cases, cat]);

  const handleCatChange = useCallback((val: Category) => {
    setCat(val);
    setCurrent(0);
  }, []);

  const getScrollStep = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.children.length === 0) return 0;
    const first = el.children[0] as HTMLElement;
    const gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || '0') || 0;
    return first.offsetWidth + gap;
  }, []);

  const syncCurrentFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || filtered.length === 0) return;
    const step = getScrollStep();
    if (step <= 0) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const maxIdx = maxScroll < 1 ? 0 : Math.round(maxScroll / step);
    const idx = Math.min(maxIdx, Math.max(0, Math.round(el.scrollLeft / step)));
    setCurrent(idx);
    setMaxSlideIndex(maxIdx);
  }, [filtered.length, getScrollStep]);

  const handleScroll = useCallback(() => {
    if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = null;
      syncCurrentFromScroll();
    });
  }, [syncCurrentFromScroll]);

  const scrollBySlides = useCallback(
    (direction: -1 | 1) => {
      const el = scrollRef.current;
      if (!el) return;
      const step = getScrollStep();
      if (step <= 0) return;
      el.scrollBy({ left: direction * step, behavior: 'smooth' });
    },
    [getScrollStep],
  );

  const cancelMomentum = useCallback(() => {
    if (momentumRafRef.current != null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
  }, []);

  const snapLaneToNearest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const step = getScrollStep();
    if (step <= 0) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const snapped = Math.round(el.scrollLeft / step) * step;
    el.scrollTo({ left: Math.min(maxScroll, Math.max(0, snapped)), behavior: 'smooth' });
  }, [getScrollStep]);

  const prev = () => scrollBySlides(-1);
  const next = () => scrollBySlides(1);
  const handleCardNavigate = useCallback(
    (slug: string) => {
      if (suppressCardClickRef.current) {
        suppressCardClickRef.current = false;
        return;
      }
      navigate(`/cases/${slug}`);
    },
    [navigate],
  );

  const onLanePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 1) return;
    cancelMomentum();
    clearMoveSamples(moveSamplesRef.current);
    lastPointerXRef.current = e.clientX;
    el.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId };
    setLaneDragging(true);
  }, [cancelMomentum]);

  const onLanePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const el = scrollRef.current;
    if (!el) return;
    let mx = e.movementX;
    if (mx === 0 && lastPointerXRef.current != null) {
      const fb = e.clientX - lastPointerXRef.current;
      if (Math.abs(fb) > 0) mx = fb;
    }
    lastPointerXRef.current = e.clientX;
    el.scrollLeft -= mx;
    if (Math.abs(mx) > 2) suppressCardClickRef.current = true;
    pushMoveSample(moveSamplesRef.current, mx);
  }, []);

  const onLanePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      dragRef.current = null;
      lastPointerXRef.current = null;
      setLaneDragging(false);
      try {
        scrollRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      let vel = scrollVelocityPerFrameFromSamples(moveSamplesRef.current);
      clearMoveSamples(moveSamplesRef.current);
      const cap = 72;
      vel = Math.max(-cap, Math.min(cap, vel));
      if (Math.abs(vel) < 8) {
        snapLaneToNearest();
        return;
      }

      const tick = () => {
        const lane = scrollRef.current;
        if (!lane) {
          cancelMomentum();
          return;
        }
        vel *= 0.935;
        lane.scrollLeft += vel;
        const maxScroll = lane.scrollWidth - lane.clientWidth;
        if (lane.scrollLeft <= 0 || lane.scrollLeft >= maxScroll - 0.5) {
          cancelMomentum();
          snapLaneToNearest();
          return;
        }
        if (Math.abs(vel) < 0.65) {
          cancelMomentum();
          snapLaneToNearest();
          return;
        }
        momentumRafRef.current = requestAnimationFrame(tick);
      };
      momentumRafRef.current = requestAnimationFrame(tick);
    },
    [cancelMomentum, snapLaneToNearest],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
    setCurrent(0);
    setMaxSlideIndex(0);
  }, [cat, filtered.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || filtered.length === 0) return;
    const ro = new ResizeObserver(() => syncCurrentFromScroll());
    ro.observe(el);
    syncCurrentFromScroll();
    return () => ro.disconnect();
  }, [filtered.length, syncCurrentFromScroll]);

  useEffect(
    () => () => {
      if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current);
      if (momentumRafRef.current != null) cancelAnimationFrame(momentumRafRef.current);
    },
    [],
  );

  /**
   * Тачпад: как BlogCarousel/TeamCarousel — wheel на самом overflow-контейнере, passive: false.
   * Причины прошлых сбоев: (1) hit-test через elementFromPoint давал false, если top element не child;
   * (2) scroll-snap mandatory «съедал» мелкие scrollLeft — на время жеста отключаем snap.
   */
  useLayoutEffect(() => {
    if (filtered.length === 0 || isLoading || isError) return;
    const el = scrollRef.current;
    if (!el) return;

    let snapIdleTimer: ReturnType<typeof setTimeout> | null = null;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;

      const t = e.target;
      if (!(t instanceof Node) || !el.contains(t)) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 1) return;

      const dx = getHorizontalWheelDelta(e, el);
      const dy = scaleWheelDelta(e.deltaY, e.deltaMode, el);

      if (isClearlyVerticalPageScroll(e, dx, dy)) return;

      if (Math.abs(dx) < 0.001 && !e.shiftKey) return;

      const atStart = el.scrollLeft <= 0.5;
      const atEnd = el.scrollLeft >= maxScroll - 0.5;
      if ((atStart && dx < 0) || (atEnd && dx > 0)) return;

      cancelMomentum();

      el.style.setProperty('scroll-snap-type', 'none');
      if (snapIdleTimer != null) clearTimeout(snapIdleTimer);
      snapIdleTimer = setTimeout(() => {
        el.style.removeProperty('scroll-snap-type');
        snapIdleTimer = null;
      }, 220);

      e.preventDefault();
      e.stopPropagation();
      el.scrollLeft += dx;
    };

    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener('wheel', onWheel, { capture: true });
      if (snapIdleTimer != null) clearTimeout(snapIdleTimer);
      el.style.removeProperty('scroll-snap-type');
    };
  }, [filtered.length, isLoading, isError, cancelMomentum]);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress sx={{ color: '#ffbb00' }} /></Box>;
  }
  if (isError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 20 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
          Не удалось загрузить кейсы: {(error as Error)?.message || 'Ошибка'}
        </Typography>
        <Box
          component="button"
          onClick={() => refetch()}
          sx={{
            bgcolor: '#ffbb00', color: '#141414', fontWeight: 600,
            px: 3, py: 1.5, borderRadius: 2, border: 'none', cursor: 'pointer',
            '&:hover': { bgcolor: '#e5a800' },
          }}
        >
          Повторить
        </Box>
      </Box>
    );
  }

  return (
    <>
      <SeoMetaTags
        title="Портфолио PrimeCoder — кейсы и примеры сайтов"
        description="Реальные проекты: корпоративные сайты, интернет-магазины, лендинги, SEO. Убедитесь в качестве — смотрите 150+ кейсов."
        keywords="портфолио веб-студии, кейсы разработки сайтов, примеры работ, PrimeCoder"
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />

      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader
            overline="Портфолио"
            title="Наши кейсы"
            description="Реальные проекты — от разработки сайтов и мобильных приложений до SEO, рекламы и комплексного маркетинга."
            decoText="PORTFOLIO"
          />

          {/* Category filters */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
            {CATS.map((c) => (
              <Chip
                key={c.val}
                label={c.label}
                onClick={() => handleCatChange(c.val)}
                sx={{
                  bgcolor: cat === c.val ? 'rgba(255,187,0,0.15)' : 'rgba(255,255,255,0.04)',
                  color: cat === c.val ? '#ffbb00' : 'rgba(255,255,255,0.5)',
                  border: '1px solid',
                  borderColor: cat === c.val ? 'rgba(255,187,0,0.4)' : 'transparent',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(255,187,0,0.1)' },
                }}
              />
            ))}
          </Box>

          {filtered.length > 0 && (
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', mb: 3, fontSize: '0.85rem' }}>
              {filtered.length} {filtered.length === 1 ? 'проект' : filtered.length < 5 ? 'проекта' : 'проектов'}
            </Typography>
          )}

          {/* Carousel */}
          {filtered.length > 0 ? (
            <>
              <Box
                ref={scrollRef}
                onScroll={handleScroll}
                onPointerDown={onLanePointerDown}
                onPointerMove={onLanePointerMove}
                onPointerUp={onLanePointerUp}
                onPointerCancel={onLanePointerUp}
                onLostPointerCapture={() => {
                  dragRef.current = null;
                  lastPointerXRef.current = null;
                  setLaneDragging(false);
                }}
                sx={{
                  position: 'relative',
                  mb: 4,
                  display: 'flex',
                  gap: 3,
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  '@media (pointer: fine)': { touchAction: 'pan-x' },
                  scrollSnapType: laneDragging ? 'none' : { xs: 'x proximity', md: 'x mandatory' },
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehaviorX: 'contain',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                  cursor: laneDragging ? 'grabbing' : 'grab',
                  userSelect: laneDragging ? 'none' : 'auto',
                }}
              >
                  {filtered.map((c: any) => {
                    const imgSrc = resolveImageUrl(c.listingPreviewImageUrl || c.heroImageUrl || c.donorImageUrl || '');
                    const hasImg = !!imgSrc;
                    return (
                      <Box
                        key={c.slug}
                        onClick={() => handleCardNavigate(c.slug)}
                        data-anim-child
                        sx={{
                          flexShrink: 0,
                          scrollSnapAlign: 'start',
                          width: { xs: '85%', sm: `calc(50% - 12px)`, md: `calc(${100 / VISIBLE}% - ${24 * (VISIBLE - 1) / VISIBLE}px)` },
                          height: { xs: 360, md: 440 },
                          borderRadius: 4,
                          overflow: 'hidden',
                          position: 'relative',
                          cursor: laneDragging ? 'grabbing' : 'pointer',
                          border: '1px solid rgba(255,255,255,0.06)',
                          transition: 'border-color 0.4s, transform 0.4s',
                          '&:hover': { borderColor: 'rgba(255,187,0,0.3)', transform: 'translateY(-6px)' },
                          '&:hover .pf-overlay': { opacity: 1 },
                        }}
                      >
                        {hasImg ? (
                          <Box
                            component="img"
                            src={imgSrc}
                            alt={c.title}
                            loading="lazy"
                            draggable={false}
                            onDragStart={(e: SyntheticEvent<HTMLImageElement>) => e.preventDefault()}
                            onError={(e: SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).src = fallbackImageUrl(); }}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'auto' }}
                          />
                        ) : (
                          <Box sx={{ width: '100%', height: '100%', bgcolor: 'rgba(30,30,30,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ fontSize: '4rem', fontWeight: 900, color: 'rgba(255,255,255,0.06)' }}>
                              {(c.title || 'КЕ').substring(0, 2).toUpperCase()}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />

                        <Box
                          className="pf-overlay"
                          sx={{
                            position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.55)',
                            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                            opacity: 0, transition: 'opacity 0.4s', p: 3,
                          }}
                        >
                          <Typography sx={{ color: '#ffbb00', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                            Подробнее
                          </Typography>
                        </Box>

                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: { xs: 2, md: 2.5 }, zIndex: 2 }}>
                          <Chip
                            label={CATS.find((cc) => cc.val === getCat(c))?.label || 'Сайт'}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,187,0,0.15)', color: '#ffbb00', fontWeight: 600, mb: 1 }}
                          />
                          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: { xs: '1rem', md: '1.2rem' }, lineHeight: 1.25, mb: 0.5 }}>
                            {c.title}
                          </Typography>
                          {c.summary && (
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {c.summary}
                            </Typography>
                          )}
                          {c.tools && c.tools.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                              {c.tools.slice(0, 4).map((tool: string) => (
                                <Typography key={tool} variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1, px: 0.8, py: 0.15 }}>
                                  {tool}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
              </Box>

              {/* Navigation */}
              {maxSlideIndex > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <IconButton
                    onClick={prev}
                    disabled={current === 0}
                    sx={{
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      '&:hover': { borderColor: '#ffbb00', color: '#ffbb00' },
                      '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.06)' },
                    }}
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', minWidth: 60, textAlign: 'center' }}>
                    {current + 1} / {Math.max(1, maxSlideIndex + 1)}
                  </Typography>
                  <IconButton
                    onClick={next}
                    disabled={current >= maxSlideIndex}
                    sx={{
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      '&:hover': { borderColor: '#ffbb00', color: '#ffbb00' },
                      '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.06)' },
                    }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>Кейсы не найдены</Typography>
            </Box>
          )}

          {/* CTA */}
          <Box sx={{ py: { xs: 6, md: 8 }, textAlign: 'center' }} data-anim="fade-up">
            <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 1.5 }}>
              Хотите такой же проект?
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
              Расскажите о задаче — подготовим КП за 24 часа.
            </Typography>
            <Box
              component="a"
              href="/new-client"
              className="new-client-cta"
              sx={{
                display: 'inline-block', bgcolor: '#ffbb00', color: '#141414', fontWeight: 700,
                px: 5, py: 1.5, borderRadius: 2, textDecoration: 'none',
                transition: 'background 0.3s', '&:hover': { bgcolor: '#e5a800', color: '#141414' },
              }}
            >
              Обсудить проект
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
