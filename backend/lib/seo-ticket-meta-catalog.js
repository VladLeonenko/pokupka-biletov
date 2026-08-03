/**
 * Meta V3 catalog — ручные override title/description/H1 для money ticket URL.
 * Ключ: repertoireId или ЧПУ-slug. Catalog побеждает auto-generated meta в SSR/CSR.
 *
 * Плейсхолдеры:
 *   {{price}}      → « от 6800 ₽» | ''
 *   {{priceNum}}   → «6800» | ''
 *   {{venue}}      → площадка
 *   {{date}}       → «28 августа 2026»
 *   {{time}}       → «22:00»
 *   {{when}}       → «28 августа 2026, 22:00»
 *   {{dateShort}}  → «28 авг»
 *
 * defaults.beginDateTime / defaults.venue — если API не отдал дату/площадку.
 */

/** @typedef {{
 *   title: string;
 *   description: string;
 *   h1: string;
 *   keywords?: string;
 *   aliases?: string[];
 *   defaults?: { venue?: string; beginDateTime?: string };
 * }} TicketSeoEntry */

const MECHANICS =
  'Схема зала, выбор мест онлайн, оплата, электронный билет';

/** @type {Record<string, TicketSeoEntry>} */
export const TICKET_SEO = {
  // --- Футбол / арены ---
  'olimpbet-superkubok-rossii': {
    title: 'Суперкубок Спартак — Зенит{{dateShort}}: билеты{{price}}',
    description:
      'Суперкубок России Спартак — Зенит: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Суперкубок России: Спартак — Зенит',
    keywords: 'суперкубок россии билеты, спартак зенит билеты, совкомбанк арена',
    aliases: ['6a46656d46a4d000309ed0a2'],
    defaults: {
      venue: 'Совкомбанк Арена, Нижний Новгород',
    },
  },
  '6a46656d46a4d000309ed0a2': {
    title: 'Суперкубок Спартак — Зенит{{dateShort}}: билеты{{price}}',
    description:
      'Суперкубок России Спартак — Зенит: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Суперкубок России: Спартак — Зенит',
    keywords: 'суперкубок россии билеты, спартак зенит билеты',
    defaults: {
      venue: 'Совкомбанк Арена, Нижний Новгород',
    },
  },
  'luzhniki-cup-final-2026': {
    title: 'Финал Кубка России{{dateShort}} — Лужники{{price}}',
    description:
      'Финал Кубка России 2026: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Финал Кубка России 2026 — Лужники',
    keywords: 'финал кубка россии билеты, лужники билеты футбол',
    defaults: {
      venue: 'Стадион «Лужники», Москва',
    },
  },
  '69e0cfa246a4d000309ecdd7': {
    title: 'Бивол vs Айферт{{dateShort}}: билеты{{price}}',
    description:
      'Бой Дмитрий Бивол — Михаэль Айферт (RCC): {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Бивол vs Айферт: вечер бокса RCC',
    keywords: 'бивол бой билеты, rcc бокс билеты',
  },

  // --- Концерты ---
  'basta-guf': {
    title: 'Баста и Guf{{dateShort}} — билеты{{price}}',
    description:
      'Концерт Баста — Guf: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Концерт Баста — Guf в Лужниках',
    keywords: 'баста гуф билеты, basta guf билеты, концерт баста лужники 28 августа',
    aliases: ['69ac1c5246a4d000309ecd5c'],
    defaults: {
      venue: 'БСА «Лужники», Москва',
      beginDateTime: '2026-08-28T19:00:00+03:00',
    },
  },
  '69ac1c5246a4d000309ecd5c': {
    title: 'Баста и Guf{{dateShort}} — билеты{{price}}',
    description:
      'Концерт Баста — Guf: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Концерт Баста — Guf в Лужниках',
    keywords: 'баста гуф билеты, basta guf билеты, концерт баста лужники 28 августа',
    defaults: {
      venue: 'БСА «Лужники», Москва',
      beginDateTime: '2026-08-28T19:00:00+03:00',
    },
  },
  '6735c3a7569a15f2087b852b': {
    title: 'Курентзис / MusicAeterna{{dateShort}}{{price}}',
    description:
      'Теодор Курентзис и MusicAeterna: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Теодор Курентзис и MusicAeterna',
    keywords: 'курентзис билеты, musicaeterna билеты',
  },
  '67de5b9e58f79d0030278720': {
    title: 'Пресняков{{dateShort}} — концерт, билеты{{price}}',
    description:
      'Концерт Владимира Преснякова: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Концерт Владимира Преснякова',
    keywords: 'пресняков билеты, концерт пресняков',
  },
  '69e7bdaa46a4d000309ece1d': {
    title: '«Песни Победы»{{dateShort}}: билеты{{price}}',
    description:
      'Концерт «Песни Победы»: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Концерт «Песни Победы»',
    keywords: 'песни победы билеты, концерт песни победы',
  },
  '6735c3a8569a15f2087b9e5f': {
    title: 'Ансамбль Моисеева{{dateShort}}: билеты{{price}}',
    description:
      'Ансамбль народного танца Игоря Моисеева: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Ансамбль танца Игоря Моисеева',
    keywords: 'моисеев билеты, ансамбль моисеева билеты',
  },

  // --- Театр ---
  '6735c3a7569a15f2087b8069': {
    title: '«Три сестры»{{dateShort}} — билеты{{price}}',
    description:
      'Спектакль «Три сестры»: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Спектакль «Три сестры»',
    keywords: 'три сестры билеты, спектакль три сестры',
  },
  '69e7bbaa46a4d000309ece18': {
    title: '«Честная женщина»{{dateShort}}: билеты{{price}}',
    description:
      '«Честная женщина» (гастроли Александринки): {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Честная женщина» — Александринский театр',
    keywords: 'честная женщина билеты, александринский театр билеты',
  },
  '69cfdf2246a4d000309ecdb4': {
    title: '«Призраки»{{dateShort}} — билеты{{price}}',
    description:
      'Спектакль «Призраки»: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Спектакль «Призраки»',
    keywords: 'призраки спектакль билеты',
  },
  '6735c3a8569a15f2087ba146': {
    title: '«Летучая мышь»{{dateShort}}: билеты{{price}}',
    description:
      'Оперетта «Летучая мышь»: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Оперетта «Летучая мышь»',
    keywords: 'летучая мышь билеты, оперетта летучая мышь',
  },
  '6735c3a7569a15f2087b8b16': {
    title: '«Ночь перед Рождеством»{{dateShort}}{{price}}',
    description:
      '«Ночь перед Рождеством»: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Ночь перед Рождеством»',
    keywords: 'ночь перед рождеством билеты',
  },
  '69e8d6f046a4d000309ece81': {
    title: '«День закрытых дверей»{{dateShort}}{{price}}',
    description:
      '«День закрытых дверей» (Театр Наций): {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«День закрытых дверей» — Театр Наций',
    keywords: 'день закрытых дверей билеты, театр наций билеты',
  },
  '69e8d68346a4d000309ece7d': {
    title: '«Тартюф»{{dateShort}} — билеты{{price}}',
    description:
      '«Тартюф» (гастроли Театра Наций): {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Тартюф» — Театр Наций',
    keywords: 'тартюф билеты, театр наций тартюф',
  },
  '69e7bd3146a4d000309ece1b': {
    title: '«Иов»{{dateShort}} — билеты{{price}}',
    description:
      '«Иов» (гастроли Александринки): {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Иов» — Александринский театр',
    keywords: 'иов спектакль билеты, александринский театр',
  },
  '6735c3a7569a15f2087b8b9b': {
    title: '«Кролик Эдвард»{{dateShort}}: билеты{{price}}',
    description:
      '«Кролик Эдвард»: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Спектакль «Кролик Эдвард»',
    keywords: 'кролик эдвард билеты',
  },
  '6735c3a7569a15f2087b806d': {
    title: '«Красная Шапочка»{{dateShort}}: билеты{{price}}',
    description:
      '«Красная Шапочка»: {{price}}. {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Красная Шапочка»',
    keywords: 'красная шапочка билеты детский спектакль',
  },
};

/** @type {Record<string, TicketSeoEntry>} */
export const STATIC_LANDING_SEO = {
  '/events': {
    title: 'Афиша мероприятий — билеты, схема зала онлайн',
    description:
      'Концерты, театр и спорт: дата, площадка, цены. Интерактивная схема зала, выбор мест, оплата онлайн, электронный билет.',
    h1: 'Афиша мероприятий — билеты онлайн',
  },
  '/afisha': {
    title: 'Афиша — билеты на концерты, театр и спорт',
    description:
      'Календарь событий по дате и площадке. Схема зала, выбор мест онлайн, оплата, электронный билет после оплаты.',
    h1: 'Афиша мероприятий',
  },
};

/**
 * @param {string | null | undefined} iso
 */
export function parseEventDateParts(iso) {
  if (!iso) return { date: '', time: '', when: '', dateShort: '' };
  let raw = String(iso).trim();
  // «2026-08-28T19:00» / без зоны → Москва
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) raw = `${raw}:00+03:00`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) raw = `${raw}+03:00`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { date: '', time: '', when: '', dateShort: '' };
  const date = d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  });
  const time = d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
  const dateShort = d
    .toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Moscow',
    })
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    date,
    time,
    when: `${date}, ${time}`,
    dateShort: dateShort ? `, ${dateShort}` : '',
  };
}

/**
 * @param {{
 *   minPrice?: number | null;
 *   venueLabel?: string | null;
 *   beginDateTime?: string | null;
 *   defaults?: { venue?: string; beginDateTime?: string };
 * }} opts
 */
export function buildTicketSeoFacts(opts = {}) {
  const minPrice =
    opts.minPrice != null && Number.isFinite(Number(opts.minPrice))
      ? Math.round(Number(opts.minPrice))
      : null;
  const begin =
    opts.beginDateTime || opts.defaults?.beginDateTime || null;
  const parts = parseEventDateParts(begin);
  const venue = String(opts.venueLabel || opts.defaults?.venue || '').trim();
  return {
    minPrice,
    price: minPrice != null ? ` от ${minPrice} ₽` : '',
    priceNum: minPrice != null ? String(minPrice) : '',
    venue,
    date: parts.date,
    time: parts.time,
    when: parts.when,
    dateShort: parts.dateShort,
    beginDateTime: begin,
  };
}

function cleanupMeta(s) {
  return String(s || '')
    .replace(/\{\{[a-zA-Z]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/:\s*\./g, '.')
    .replace(/\.\s*\./g, '.')
    .replace(/\s+([,.])/g, '$1')
    .replace(/,\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function clipMeta(s, max) {
  const t = cleanupMeta(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > Math.floor(max * 0.6) ? cut.slice(0, sp) : cut).trim();
}

/**
 * @param {TicketSeoEntry} entry
 * @param {{ minPrice?: number | null; venueLabel?: string | null; beginDateTime?: string | null }} [opts]
 */
export function applyTicketSeoPlaceholders(entry, opts = {}) {
  if (!entry) return null;
  const facts = buildTicketSeoFacts({ ...opts, defaults: entry.defaults });
  const fill = (s) =>
    cleanupMeta(
      String(s || '')
        .replace(/\{\{price\}\}/g, facts.price)
        .replace(/\{\{priceNum\}\}/g, facts.priceNum)
        .replace(/\{\{venue\}\}/g, facts.venue)
        .replace(/\{\{date\}\}/g, facts.date)
        .replace(/\{\{time\}\}/g, facts.time)
        .replace(/\{\{when\}\}/g, facts.when)
        .replace(/\{\{dateShort\}\}/g, facts.dateShort),
    );
  return {
    title: clipMeta(fill(entry.title), 70),
    description: clipMeta(fill(entry.description), 160),
    h1: clipMeta(fill(entry.h1), 80),
    keywords: entry.keywords || '',
    facts,
  };
}

/**
 * Авто-description, если нет catalog.
 * @param {{
 *   displayTitle: string;
 *   minPrice?: number | null;
 *   venueLabel?: string | null;
 *   beginDateTime?: string | null;
 *   lead?: string | null;
 * }} p
 */
export function composeAutoTicketDescription(p) {
  const facts = buildTicketSeoFacts(p);
  const bits = [];
  if (facts.when) bits.push(facts.when);
  if (facts.venue) bits.push(facts.venue);
  const head = `Билеты на «${p.displayTitle}»${facts.price}.`;
  const mid = bits.length ? ` ${bits.join(', ')}.` : '';
  const lead = p.lead ? ` ${String(p.lead).trim().slice(0, 60)}` : '';
  // lead только если мало фактов
  const body = bits.length >= 2 ? `${head}${mid} ${MECHANICS}.` : `${head}${mid}${lead} ${MECHANICS}.`;
  return clipMeta(body, 160);
}

/**
 * @param {string} key
 * @param {{ minPrice?: number | null; venueLabel?: string | null; beginDateTime?: string | null }} [opts]
 */
export function resolveTicketSeo(key, opts = {}) {
  const entry = lookupTicketSeo(key);
  if (!entry) return null;
  return applyTicketSeoPlaceholders(entry, opts);
}

/**
 * @param {string} key repertoireId или slug
 * @returns {TicketSeoEntry | null}
 */
export function lookupTicketSeo(key) {
  const k = String(key || '').trim().toLowerCase();
  if (!k) return null;
  if (TICKET_SEO[k]) return TICKET_SEO[k];
  for (const [canon, entry] of Object.entries(TICKET_SEO)) {
    const aliases = entry.aliases || [];
    if (aliases.some((a) => String(a).toLowerCase() === k)) {
      return TICKET_SEO[canon] || entry;
    }
  }
  return null;
}

export function lookupStaticLandingSeo(path) {
  const p = String(path || '').replace(/\/+$/, '') || '/';
  return STATIC_LANDING_SEO[p] || null;
}
