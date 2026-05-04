import type { TicketsVitrineContent } from '@/types/ticketsVitrine';
import { TICKETS_VITRINE_LEGAL_HTML } from './ticketsVitrineLegalHtml';

const DEFAULTS: TicketsVitrineContent = {
  cities: [
    { id: '1', label: 'Москва' },
    { id: '2', label: 'Санкт-Петербург' },
    { id: '3', label: 'Екатеринбург' },
    { id: '4', label: 'Казань' },
    { id: '5', label: 'Новосибирск' },
    { id: '6', label: 'Нижний Новгород' },
    { id: '7', label: 'Краснодар' },
    { id: '8', label: 'Челябинск' },
  ],
  /** Порядок = плашки в шапке + горизонтальные карусели на главной (без дублей: хоккей входит в «Спорт» с genre) */
  directions: [
    { label: 'Театр', genre: 'Театр' },
    { label: 'Спорт', genre: 'Спорт' },
    { label: 'Цирк', q: 'цирк' },
    { label: 'Большой театр', q: 'большой театр' },
    { label: 'Концерты', genre: 'Концерт' },
    { label: 'Детям', genre: 'Детям' },
  ],
  header: {
    logoTitle: 'Афиша',
    logoSub: 'билеты на мероприятия',
    logoPlacement: 'left',
    logoShowTextWithImage: true,
  },
  contacts: {
    pageTitle: 'Контакты',
    intro: 'Свяжитесь с нами по вопросам заказа билетов и работы сервиса.',
    address: '',
    phone: '',
    email: '',
    hours: 'Пн–Вс 10:00–20:00',
    formTitle: 'Написать нам',
  },
  footer: {
    brand: 'Афиша',
    tagline: 'Подбор и покупка билетов на концерты, театр и спорт.',
    copy: '',
  },
  ...TICKETS_VITRINE_LEGAL_HTML,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Ключ не задан в БД → шаблон. Непустая строка → из админки. Явно "" в БД → пусто (и подсказка на странице).
 */
function coalesceHtmlField(
  s: Record<string, unknown>,
  key: 'privacyHtml' | 'publicOfferHtml' | 'cookiesPolicyHtml' | 'returnsPolicyHtml' | 'requisitesHtml',
  fallback: string
): string {
  if (!Object.prototype.hasOwnProperty.call(s, key)) return fallback;
  const v = s[key];
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  return typeof v === 'string' ? '' : fallback;
}

/** Поверх дефолтов накладываем сохранённый JSON (массивы из CMS — целиком, если ключ есть) */
export function mergeTicketsVitrine(saved: unknown): TicketsVitrineContent {
  const s = isPlainObject(saved) ? saved : {};
  const dirs = Array.isArray(s.directions)
    ? (s.directions as TicketsVitrineContent['directions'])
    : DEFAULTS.directions;
  const rawCities = Array.isArray(s.cities) ? s.cities : null;
  const cities =
    rawCities && rawCities.length > 0
      ? (rawCities as TicketsVitrineContent['cities'])
      : DEFAULTS.cities;
  return {
    ...DEFAULTS,
    ...s,
    cities,
    directions: dirs,
    header: { ...DEFAULTS.header, ...(isPlainObject(s.header) ? s.header : {}) },
    contacts: { ...DEFAULTS.contacts, ...(isPlainObject(s.contacts) ? s.contacts : {}) },
    footer: { ...DEFAULTS.footer, ...(isPlainObject(s.footer) ? s.footer : {}) },
    privacyHtml: coalesceHtmlField(s, 'privacyHtml', DEFAULTS.privacyHtml ?? ''),
    publicOfferHtml: coalesceHtmlField(s, 'publicOfferHtml', DEFAULTS.publicOfferHtml ?? ''),
    cookiesPolicyHtml: coalesceHtmlField(s, 'cookiesPolicyHtml', DEFAULTS.cookiesPolicyHtml ?? ''),
    returnsPolicyHtml: coalesceHtmlField(s, 'returnsPolicyHtml', DEFAULTS.returnsPolicyHtml ?? ''),
    requisitesHtml: coalesceHtmlField(s, 'requisitesHtml', DEFAULTS.requisitesHtml ?? ''),
  };
}
