/**
 * FE-зеркало backend/lib/seo-site-meta-catalog.js — править парой.
 * Meta V3 для всех публичных URL кроме /ticket/* (тикеты — ticketSeoCatalog.ts).
 */

const MECHANICS =
  'Схема зала, выбор мест онлайн, оплата, электронный билет';

export type SiteSeoEntry = {
  title: string;
  description: string;
  h1: string;
  keywords?: string;
};

export const SITE_PAGE_SEO: Record<string, SiteSeoEntry> = {
  '/': {
    title: 'Билеты на концерты, театр и спорт — афиша онлайн',
    description: `Афиша мероприятий: дата, площадка, цены. ${MECHANICS}. Концерты, театр, спорт.`,
    h1: 'Билеты на концерты, театр и спорт',
    keywords: 'купить билеты онлайн, афиша мероприятий, билеты на концерт',
  },
  '/events': {
    title: 'Афиша мероприятий — билеты, схема зала онлайн',
    description: `Актуальные концерты, театр и спорт: фильтры по городу, жанру и площадке. ${MECHANICS}.`,
    h1: 'Афиша мероприятий — билеты онлайн',
    keywords: 'афиша мероприятий, билеты онлайн, афиша концертов',
  },
  '/afisha': {
    title: 'Афиша — билеты на концерты, театр и спорт',
    description: `Календарь событий по дате и площадке. ${MECHANICS}.`,
    h1: 'Афиша мероприятий',
    keywords: 'афиша, билеты на мероприятия',
  },
  '/events/map': {
    title: 'Карта мероприятий — билеты рядом с вами',
    description:
      'События на карте: театр, концерты и спорт. Открывайте карточку, смотрите схему зала и покупайте электронный билет онлайн.',
    h1: 'Карта мероприятий',
  },
  '/search': {
    title: 'Поиск билетов — концерты, театр, спорт',
    description: `Быстрый поиск событий по названию и площадке. ${MECHANICS}.`,
    h1: 'Поиск билетов на мероприятия',
  },
  '/contacts': {
    title: 'Контакты — поддержка по заказу билетов',
    description:
      'Связь с поддержкой: заказ, оплата, электронный билет и возврат. Ответим по делу и поможем завершить покупку.',
    h1: 'Контакты и поддержка',
  },
  '/faq': {
    title: 'FAQ — покупка, схема зала, электронный билет',
    description:
      'Как выбрать места на схеме зала, оплатить онлайн, получить электронный билет и оформить возврат. Короткие ответы без воды.',
    h1: 'Частые вопросы о билетах',
  },
  '/returns': {
    title: 'Возврат билетов — сроки и порядок заявки',
    description:
      'Условия возврата и обмена билетов: сроки, правила организатора и пошаговое оформление заявки.',
    h1: 'Возврат и обмен билетов',
  },
  '/privacy': {
    title: 'Политика конфиденциальности',
    description:
      'Как обрабатываются и защищаются персональные данные при покупке билетов онлайн.',
    h1: 'Политика конфиденциальности',
  },
  '/politic': {
    title: 'Политика конфиденциальности',
    description:
      'Как обрабатываются и защищаются персональные данные при покупке билетов онлайн.',
    h1: 'Политика конфиденциальности',
  },
  '/offer': {
    title: 'Публичная оферта — покупка билетов онлайн',
    description:
      'Условия использования сервиса: заказ билетов, оплата, электронный билет и ответственность сторон.',
    h1: 'Публичная оферта',
  },
  '/cookies': {
    title: 'Политика cookies',
    description:
      'Какие cookies использует сервис и как управлять согласием при покупке билетов онлайн.',
    h1: 'Политика cookies',
  },
  '/requisites': {
    title: 'Реквизиты — юридическая информация',
    description:
      'Юридические и платёжные реквизиты сервиса для оплаты билетов и документооборота.',
    h1: 'Реквизиты',
  },
  '/charity': {
    title: 'Благотворительность',
    description: 'Социальные и благотворительные инициативы сервиса билетов.',
    h1: 'Благотворительность',
  },
  '/case/bilet-vsem': {
    title: 'Кейс билетной платформы — схемы залов и витрина',
    description:
      'Как устроена билетная платформа: схемы стадионов и залов, витрина, выбор мест онлайн и электронный билет.',
    h1: 'Кейс билетной платформы',
  },
};

export const CITY_LABELS: Record<string, string> = {
  moskva: 'Москва',
  'sankt-peterburg': 'Санкт-Петербург',
  kazan: 'Казань',
  ekaterinburg: 'Екатеринбург',
  novosibirsk: 'Новосибирск',
};

export const GENRE_LABELS: Record<string, string> = {
  teatr: 'Театр',
  koncert: 'Концерт',
  komediya: 'Комедия',
  detyam: 'Детям',
  sport: 'Спорт',
};

export const VENUE_LABELS: Record<string, string> = {
  'teatr-na-taganke': 'Театр на Таганке',
  'mht-chehova': 'МХТ Чехова',
  'krokus-siti-holl': 'Крокус Сити Холл',
  'vtb-arena': 'ВТБ Арена',
  luzhniki: 'Лужники',
  'bsa-luzhniki': 'БСА «Лужники»',
};

export function resolveSitePageSeo(path: string): SiteSeoEntry | null {
  const p = String(path || '').replace(/\/+$/, '') || '/';
  return SITE_PAGE_SEO[p] || null;
}

function titleCaseRuLike(text: string): string {
  const raw = String(text || '').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function resolveEventsFilterSeo(
  kind: 'city' | 'genre' | 'venue',
  rawSlug: string,
): SiteSeoEntry | null {
  const slug = decodeURIComponent(String(rawSlug || ''))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!slug && !rawSlug) return null;
  const key = String(rawSlug || '').trim();

  if (kind === 'city') {
    const label = CITY_LABELS[key] || titleCaseRuLike(slug);
    return {
      title: `Афиша ${label} — билеты, схема зала онлайн`,
      description: `Мероприятия в ${label}: концерты, театр, спорт. Дата и площадка на карточке. ${MECHANICS}.`,
      h1: `Афиша — ${label}`,
      keywords: `афиша ${label.toLowerCase()}, билеты ${label.toLowerCase()}`,
    };
  }
  if (kind === 'genre') {
    const label = GENRE_LABELS[key] || titleCaseRuLike(slug);
    return {
      title: `${label} — афиша и билеты, места онлайн`,
      description: `Подборка «${label}»: актуальные даты и площадки. ${MECHANICS}.`,
      h1: label,
      keywords: `${label.toLowerCase()} билеты, афиша ${label.toLowerCase()}`,
    };
  }
  if (kind === 'venue') {
    const label = VENUE_LABELS[key] || titleCaseRuLike(slug);
    return {
      title: `${label} — афиша площадки, билеты онлайн`,
      description: `События на площадке «${label}»: расписание и цены. ${MECHANICS}.`,
      h1: label,
      keywords: `${label.toLowerCase()} билеты, афиша ${label.toLowerCase()}`,
    };
  }
  return null;
}

export function lookupStaticLandingSeo(path: string): SiteSeoEntry | null {
  return resolveSitePageSeo(path);
}
