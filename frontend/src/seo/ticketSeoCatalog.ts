/**
 * FE-зеркало backend/lib/seo-ticket-meta-catalog.js — править парой.
 *
 * Плейсхолдеры: {{price}} {{venue}} {{date}} {{time}} {{when}} {{dateShort}}
 */

export type TicketSeoEntry = {
  title: string;
  description: string;
  h1: string;
  keywords?: string;
  aliases?: string[];
  defaults?: { venue?: string; beginDateTime?: string };
};

const MECHANICS =
  'Схема зала, выбор мест онлайн, оплата, электронный билет';

export const TICKET_SEO: Record<string, TicketSeoEntry> = {
  'basta-guf': {
    title: 'Баста и Guf{{dateShort}} — билеты{{price}}',
    description:
      `Билеты на Баста — Guf{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Концерт Баста — Guf в Лужниках',
    aliases: ['69ac1c5246a4d000309ecd5c'],
    defaults: {
      venue: 'БСА «Лужники», Москва',
      beginDateTime: '2026-08-28T19:00:00+03:00',
    },
  },
  '69ac1c5246a4d000309ecd5c': {
    title: 'Баста и Guf{{dateShort}} — билеты{{price}}',
    description:
      `Билеты на Баста — Guf{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Концерт Баста — Guf в Лужниках',
    defaults: {
      venue: 'БСА «Лужники», Москва',
      beginDateTime: '2026-08-28T19:00:00+03:00',
    },
  },
  'olimpbet-superkubok-rossii': {
    title: 'Суперкубок Спартак — Зенит{{dateShort}}: билеты{{price}}',
    description:
      `Суперкубок России Спартак — Зенит{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Суперкубок России: Спартак — Зенит',
    aliases: ['6a46656d46a4d000309ed0a2'],
    defaults: { venue: 'Совкомбанк Арена, Нижний Новгород' },
  },
  '6a46656d46a4d000309ed0a2': {
    title: 'Суперкубок Спартак — Зенит{{dateShort}}: билеты{{price}}',
    description:
      `Суперкубок России Спартак — Зенит{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Суперкубок России: Спартак — Зенит',
    defaults: { venue: 'Совкомбанк Арена, Нижний Новгород' },
  },
  'luzhniki-cup-final-2026': {
    title: 'Финал Кубка России{{dateShort}} — Лужники{{price}}',
    description:
      `Финал Кубка России 2026{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Финал Кубка России 2026 — Лужники',
    defaults: { venue: 'Стадион «Лужники», Москва' },
  },
  '69e0cfa246a4d000309ecdd7': {
    title: 'Бивол vs Айферт{{dateShort}}: билеты{{price}}',
    description:
      `Бой Дмитрий Бивол — Михаэль Айферт (RCC){{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Бивол vs Айферт: вечер бокса RCC',
  },
  '6735c3a7569a15f2087b852b': {
    title: 'Курентзис / MusicAeterna{{dateShort}}{{price}}',
    description:
      `Теодор Курентзис и MusicAeterna{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Теодор Курентзис и MusicAeterna',
  },
  '67de5b9e58f79d0030278720': {
    title: 'Пресняков{{dateShort}} — концерт, билеты{{price}}',
    description:
      `Концерт Владимира Преснякова{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Концерт Владимира Преснякова',
  },
  '69e7bdaa46a4d000309ece1d': {
    title: '«Песни Победы»{{dateShort}}: билеты{{price}}',
    description:
      `Концерт «Песни Победы»{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Концерт «Песни Победы»',
  },
  '6735c3a8569a15f2087b9e5f': {
    title: 'Ансамбль Моисеева{{dateShort}}: билеты{{price}}',
    description:
      `Ансамбль народного танца Игоря Моисеева{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Ансамбль танца Игоря Моисеева',
  },
  '6735c3a7569a15f2087b8069': {
    title: '«Три сестры»{{dateShort}} — билеты{{price}}',
    description:
      `Спектакль «Три сестры»{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Спектакль «Три сестры»',
  },
  '69e7bbaa46a4d000309ece18': {
    title: '«Честная женщина»{{dateShort}}: билеты{{price}}',
    description:
      `«Честная женщина» (гастроли Александринки){{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: '«Честная женщина» — Александринский театр',
  },
  '69cfdf2246a4d000309ecdb4': {
    title: '«Призраки»{{dateShort}} — билеты{{price}}',
    description:
      `Спектакль «Призраки»{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Спектакль «Призраки»',
  },
  '6735c3a8569a15f2087ba146': {
    title: '«Летучая мышь»{{dateShort}}: билеты{{price}}',
    description:
      `Оперетта «Летучая мышь»{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Оперетта «Летучая мышь»',
  },
  '6735c3a7569a15f2087b8b16': {
    title: '«Ночь перед Рождеством»{{dateShort}}{{price}}',
    description:
      `«Ночь перед Рождеством»{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: '«Ночь перед Рождеством»',
  },
  '69e8d6f046a4d000309ece81': {
    title: '«День закрытых дверей»{{dateShort}}{{price}}',
    description:
      `«День закрытых дверей» (Театр Наций){{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: '«День закрытых дверей» — Театр Наций',
  },
  '69e8d68346a4d000309ece7d': {
    title: '«Тартюф»{{dateShort}} — билеты{{price}}',
    description:
      `«Тартюф» (гастроли Театра Наций){{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: '«Тартюф» — Театр Наций',
  },
  '69e7bd3146a4d000309ece1b': {
    title: '«Иов»{{dateShort}} — билеты{{price}}',
    description:
      `«Иов» (гастроли Александринки){{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: '«Иов» — Александринский театр',
  },
  '6735c3a7569a15f2087b8b9b': {
    title: '«Кролик Эдвард»{{dateShort}}: билеты{{price}}',
    description:
      `«Кролик Эдвард»{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: 'Спектакль «Кролик Эдвард»',
  },
  '6735c3a7569a15f2087b806d': {
    title: '«Красная Шапочка»{{dateShort}}: билеты{{price}}',
    description:
      `«Красная Шапочка»{{price}} — {{when}}, {{venue}}. ${MECHANICS}.`,
    h1: '«Красная Шапочка»',
  },
};

function parseEventDateParts(iso?: string | null) {
  if (!iso) return { date: '', time: '', when: '', dateShort: '' };
  let raw = String(iso).trim();
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

function cleanupMeta(s: string) {
  return String(s || '')
    .replace(/\{\{[a-zA-Z]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/:\s*\./g, '.')
    .replace(/\.\s*\./g, '.')
    .replace(/\s+([,.])/g, '$1')
    .replace(/,\s*$/g, '')
    .trim();
}

function clipMeta(s: string, max: number) {
  const t = cleanupMeta(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > Math.floor(max * 0.6) ? cut.slice(0, sp) : cut).trim();
}

function lookupTicketSeo(key: string): TicketSeoEntry | null {
  const k = String(key || '').trim().toLowerCase();
  if (!k) return null;
  if (TICKET_SEO[k]) return TICKET_SEO[k];
  for (const [canon, entry] of Object.entries(TICKET_SEO)) {
    if ((entry.aliases || []).some((a) => String(a).toLowerCase() === k)) {
      return TICKET_SEO[canon] || entry;
    }
  }
  return null;
}

export function resolveTicketSeo(
  key: string,
  opts: {
    minPrice?: number | null;
    venueLabel?: string | null;
    beginDateTime?: string | null;
  } = {},
): { title: string; description: string; h1: string; keywords?: string } | null {
  const entry = lookupTicketSeo(key);
  if (!entry) return null;
  const minPrice =
    opts.minPrice != null && Number.isFinite(Number(opts.minPrice))
      ? Math.round(Number(opts.minPrice))
      : null;
  const begin = opts.beginDateTime || entry.defaults?.beginDateTime || null;
  const parts = parseEventDateParts(begin);
  const venue = String(opts.venueLabel || entry.defaults?.venue || '').trim();
  const price = minPrice != null ? ` от ${minPrice} ₽` : '';
  const fill = (s: string) =>
    cleanupMeta(
      String(s || '')
        .replace(/\{\{price\}\}/g, price)
        .replace(/\{\{priceNum\}\}/g, minPrice != null ? String(minPrice) : '')
        .replace(/\{\{venue\}\}/g, venue)
        .replace(/\{\{date\}\}/g, parts.date)
        .replace(/\{\{time\}\}/g, parts.time)
        .replace(/\{\{when\}\}/g, parts.when)
        .replace(/\{\{dateShort\}\}/g, parts.dateShort),
    );
  return {
    title: clipMeta(fill(entry.title), 70),
    description: clipMeta(fill(entry.description), 160),
    h1: clipMeta(fill(entry.h1), 80),
    keywords: entry.keywords,
  };
}
