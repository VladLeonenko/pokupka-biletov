import { format, isValid, parseISO } from 'date-fns';
import { ticketCheckoutHref, type NormalizedBiletEvent } from '@/services/biletPublicApi';
import type { CmsHeroSlide, HeroSlideView, HeroVisualShape } from '@/types/ticketsVitrine';
import {
  FEATURED_HERO_HREF,
  FEATURED_HERO_REPERTOIRE_ID,
  FEATURED_HERO_SLUG,
  featuredHeroImageUrl,
  heroSlideImageUrl,
  isFeaturedHeroActive,
  isFeaturedHeroEventTitle,
  isFeaturedHeroHref,
  isFeaturedHeroSlideId,
  isLegacyFeaturedHeroHref,
  isLegacyFeaturedHeroSlideId,
} from '@/utils/heroFeaturedEvent';
import { slugify } from '@/utils/slugify';
import { venueFromApiOnly } from '@/utils/venueHint';

/** В герое — рамка-постер (без круга), фон — полноэкранное фото */
const SHAPES: HeroVisualShape[] = ['shard'];

function whenLine(ev: NormalizedBiletEvent): string {
  const parts = [ev.weekday, ev.displayDate, ev.timeLabel].filter(Boolean);
  return parts.length ? parts.join(' · ') : '';
}

function slideDescription(ev: NormalizedBiletEvent | undefined, fallback?: string): string | undefined {
  const s = (fallback || ev?.heroDescription || ev?.subtitle || '').trim();
  if (!s) return undefined;
  return s.length > 220 ? `${s.slice(0, 217).trimEnd()}…` : s;
}

function eventDateLines(ev: NormalizedBiletEvent): { lineLeft: string; lineRight: string } {
  let lineRight = format(new Date(), 'MM.yyyy');
  if (ev.isoDate?.trim()) {
    const d = parseISO(ev.isoDate.trim());
    if (isValid(d)) lineRight = format(d, 'MM.yyyy');
  } else if (ev.displayDate?.match(/^\d{1,2}\.\d{1,2}$/)) {
    const [dd, mm] = ev.displayDate.split('.').map(Number);
    const y = new Date().getFullYear();
    const d = new Date(y, mm - 1, dd);
    if (isValid(d)) lineRight = format(d, 'MM.yyyy');
  }

  let lineLeft = '—';
  const disp = ev.displayDate?.trim();
  if (disp) {
    const head = disp.split(/[.,\s]+/)[0];
    if (head && /^\d{1,2}$/.test(head)) lineLeft = head;
    else lineLeft = disp.replace(/\./g, ', ');
  }

  return { lineLeft, lineRight };
}

/** Слайд CMS хранит ticketId = репертуар; в афише id может быть vitrineRowId (rep::сессия) — сопоставляем оба. */
function findEventForHeroSlide(
  events: NormalizedBiletEvent[],
  ticketId: string | undefined,
): NormalizedBiletEvent | undefined {
  if (!ticketId?.trim()) return undefined;
  const t = String(ticketId).trim();
  return events.find(
    (e) => String(e.id) === t || String(e.repertoireId ?? '') === t || (e.id.includes('::') && e.id.split('::')[0] === t),
  );
}

function eventToSlide(ev: NormalizedBiletEvent, shapeIdx: number): HeroSlideView {
  const when = whenLine(ev);
  const venueLabel = venueFromApiOnly(ev.venue);
  const venueAddress = venueFromApiOnly(ev.venueAddress);
  const tags = [when || null, ev.isPremiere ? 'ПРЕМЬЕРА' : null, ev.age, ev.genre]
    .filter(Boolean)
    .join(' · ');
  const { lineLeft, lineRight } = eventDateLines(ev);
  return {
    id: ev.id,
    title: ev.title.toUpperCase(),
    imageUrl: heroSlideImageUrl(ev),
    tags,
    venueLabel,
    venueAddress: venueAddress || null,
    description: slideDescription(ev),
    author: ev.author,
    director: ev.director,
    lineLeft,
    lineRight,
    visualShape: SHAPES[shapeIdx % SHAPES.length],
    ticketHref: ticketCheckoutHref(ev),
    ctaLabel: 'КУПИТЬ БИЛЕТ',
  };
}

function cmsToSlide(c: CmsHeroSlide, i: number, events: NormalizedBiletEvent[]): HeroSlideView {
  const ev = c.ticketId ? findEventForHeroSlide(events, c.ticketId) : undefined;
  const baseTitle = c.title || ev?.title || 'Событие';
  const lines = ev ? eventDateLines(ev) : { lineLeft: '—', lineRight: format(new Date(), 'MM.yyyy') };
  const title = baseTitle.toUpperCase();
  const evWhen = ev ? whenLine(ev) : '';
  const venueLabel = ev ? venueFromApiOnly(ev.venue) : null;
  const venueAddress = ev ? venueFromApiOnly(ev.venueAddress) : null;
  const autoTags = [evWhen || null, ev?.isPremiere ? 'ПРЕМЬЕРА' : null, ev?.age, ev?.genre]
    .filter(Boolean)
    .join(' · ');
  const tags = c.tags?.trim() || autoTags;
  const lineLeft = c.lineLeft ?? lines.lineLeft;
  const lineRight = c.lineRight ?? lines.lineRight;
  const imageUrl = heroSlideImageUrl(ev, c.imageUrl) ?? heroSlideImageUrl(ev);
  const id = c.ticketId ? String(c.ticketId) : `cms-${i}`;
  const ticketHref = c.ctaHref || (ev ? ticketCheckoutHref(ev) : '/events');
  const shape: HeroVisualShape = c.visualShape ?? SHAPES[i % SHAPES.length];
  return {
    id,
    title,
    imageUrl,
    tags,
    venueLabel,
    venueAddress: venueAddress || null,
    description: slideDescription(ev),
    author: c.author ?? ev?.author,
    director: c.director ?? ev?.director,
    lineLeft,
    lineRight,
    visualShape: shape,
    ticketHref,
    ctaLabel: (c.ctaLabel || 'КУПИТЬ БИЛЕТ').trim(),
  };
}

function padSlides(slides: HeroSlideView[]): HeroSlideView[] {
  if (slides.length === 0) return [];
  if (slides.length >= 3) return slides;
  return [...slides, ...slides, ...slides].slice(0, 3);
}

function findFeaturedEvent(events: NormalizedBiletEvent[]): NormalizedBiletEvent | undefined {
  if (!isFeaturedHeroActive()) return undefined;
  return events.find((ev) => {
    const rep = String(ev.repertoireId ?? '').trim().toLowerCase();
    if (FEATURED_HERO_REPERTOIRE_ID && rep === FEATURED_HERO_REPERTOIRE_ID.toLowerCase()) return true;
    if (FEATURED_HERO_REPERTOIRE_ID && String(ev.id).toLowerCase().includes(FEATURED_HERO_REPERTOIRE_ID.toLowerCase())) {
      return true;
    }
    if (slugify(ev.title) === FEATURED_HERO_SLUG) return true;
    if (isFeaturedHeroEventTitle(ev.title)) return true;
    return false;
  });
}

function isDuplicateFeatured(slide: HeroSlideView, featuredId: string): boolean {
  if (slide.id === featuredId) return true;
  if (isFeaturedHeroSlideId(slide.id)) return true;
  if (isFeaturedHeroHref(slide.ticketHref)) return true;
  if (isLegacyFeaturedHeroSlideId(slide.id)) return true;
  if (isLegacyFeaturedHeroHref(slide.ticketHref)) return true;
  return false;
}

/** OLIMPBET Суперкубок — первый слайд, пока мероприятие в продаже / до 19.07.2026. */
function withFeaturedFirst(slides: HeroSlideView[], events: NormalizedBiletEvent[]): HeroSlideView[] {
  if (slides.length === 0 || !isFeaturedHeroActive()) return slides;

  const featuredEv = findFeaturedEvent(events);
  const featuredFromEv = featuredEv
    ? {
        ...eventToSlide(featuredEv, 0),
        imageUrl: featuredHeroImageUrl(featuredEv),
        ticketHref: featuredEv.repertoireId ? ticketCheckoutHref(featuredEv) : FEATURED_HERO_HREF,
      }
    : null;

  const pinnedIdx = slides.findIndex(
    (s) => isFeaturedHeroSlideId(s.id) || isFeaturedHeroHref(s.ticketHref),
  );
  const pinnedRaw = pinnedIdx >= 0 ? { ...slides[pinnedIdx], ticketHref: FEATURED_HERO_HREF } : null;
  const pinned =
    pinnedRaw && !pinnedRaw.imageUrl?.trim()
      ? { ...pinnedRaw, imageUrl: featuredHeroImageUrl(featuredEv) }
      : pinnedRaw;
  const featured = featuredFromEv ?? pinned;
  if (!featured) {
    const fallback: HeroSlideView = {
      id: FEATURED_HERO_SLUG,
      title: 'OLIMPBET СУПЕРКУБОК РОССИИ — ЗЕНИТ / СПАРТАК',
      imageUrl: featuredHeroImageUrl(null),
      tags: 'СБ · 18.07.2026 · 19:30 · СПОРТ',
      venueLabel: 'СТАДИОН «НИЖНИЙ НОВГОРОД»',
      venueAddress: 'Нижний Новгород',
      lineLeft: '18',
      lineRight: '07.2026',
      visualShape: 'shard',
      ticketHref: FEATURED_HERO_HREF,
      ctaLabel: 'КУПИТЬ БИЛЕТ',
    };
    const rest = slides.filter((s) => !isDuplicateFeatured(s, fallback.id));
    return padSlides([fallback, ...rest]);
  }

  const rest = slides.filter((s, i) => i !== pinnedIdx && !isDuplicateFeatured(s, featured.id));
  return padSlides([featured, ...rest]);
}

/** Слайды hero: при непустом heroSlides в CMS — они; иначе из событий API */
export function buildHeroSlides(
  cmsSlides: CmsHeroSlide[] | undefined,
  events: NormalizedBiletEvent[],
): HeroSlideView[] {
  let slides: HeroSlideView[];
  if (cmsSlides && cmsSlides.length > 0) {
    slides = padSlides(cmsSlides.map((c, i) => cmsToSlide(c, i, events)));
  } else {
    slides = padSlides(events.slice(0, 5).map((ev, i) => eventToSlide(ev, i)));
  }
  return withFeaturedFirst(slides, events);
}
