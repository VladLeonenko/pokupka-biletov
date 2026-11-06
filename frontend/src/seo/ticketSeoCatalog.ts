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
  'romeo-dzhuletta-2026-10-29': {
    title: 'Ромео и Джульетта{{dateShort}} — Историческая сцена Большого{{price}}',
    description:
      'Балет Прокофьева «Ромео и Джульетта»{{price}} — {{when}}, {{venue}}. Даты 29–31 октября, 6+. ' +
      'Предзаказ по секторам зала, оплата онлайн, электронный билет.',
    h1: 'Билеты на балет «Ромео и Джульетта»',
    keywords:
      'ромео и джульетта большой театр билеты, купить билеты ромео джульетта большой, балет ромео джульетта историческая сцена, большой театр билеты октябрь',
    aliases: ['romeo-dzhuletta-2026-10-30', 'romeo-dzhuletta-2026-10-31'],
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-10-29T19:00:00+03:00',
    },
  },
  'karmen-2026-10-26': {
    title: 'Кармен{{dateShort}} — Историческая сцена Большого{{price}}',
    description:
      'Опера Бизе «Кармен»{{price}} — {{when}}, {{venue}}. Даты 26–27 октября, 12+. ' +
      'Предзаказ по секторам зала, оплата онлайн, электронный билет.',
    h1: 'Билеты на оперу «Кармен»',
    keywords:
      'кармен большой театр билеты, купить билеты кармен большой театр, опера кармен москва историческая сцена',
    aliases: ['karmen-2026-10-27'],
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-10-26T19:00:00+03:00',
    },
  },
  'rigoletto-2026-10-13': {
    title: 'Риголетто{{dateShort}} — Историческая сцена Большого{{price}}',
    description:
      'Опера Верди «Риголетто»{{price}} — {{when}}, {{venue}}. Даты 13–15 октября, 12+. ' +
      'Предзаказ по секторам зала, оплата онлайн, электронный билет.',
    h1: 'Билеты на оперу «Риголетто»',
    keywords:
      'риголетто большой театр билеты, купить билеты риголетто большой, опера риголетто москва',
    aliases: ['rigoletto-2026-10-14', 'rigoletto-2026-10-15'],
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-10-13T15:00:00+03:00',
    },
  },
  'karmen-syuita-2026-10-16': {
    title: 'Билеты на «Кармен-сюиту» — Большой, Новая сцена{{price}}',
    description:
      'Купить билеты на балет «Кармен-сюита. Дивертисмент» в Большом{{price}} — {{when}}, {{venue}}. ' +
      '16–18 октября, 12+. Партер середина, оплата онлайн, электронный билет.',
    h1: '«Кармен-сюита» — билеты на Новую сцену Большого',
    keywords:
      'кармен сюита большой театр, кармен сюита большой театр дивертисмент, кармен сюита балет большой театр, кармен сюита балет купить билеты, новая сцена большого театра билеты',
    aliases: [
      'karmen-syuita-2026-10-17-12',
      'karmen-syuita-2026-10-17-19',
      'karmen-syuita-2026-10-18',
    ],
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-10-16T19:00:00+03:00',
    },
  },
  'ivan-grozny-2026-11-11': {
    title: 'Билеты на балет «Иван Грозный» — Большой театр{{price}}',
    description:
      'Купить билеты на балет «Иван Грозный» в Большом театре{{price}} — {{when}}, {{venue}}. ' +
      '11 и 26 ноября, 6+. Сектора Исторической сцены, оплата онлайн, электронный билет.',
    h1: 'Балет «Иван Грозный» — билеты на Историческую сцену',
    keywords:
      'балет иван грозный, иван грозный балет большой театр, иван грозный большой театр, купить билеты иван грозный большой театр, иван грозный балет билеты',
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-11T13:00:00+03:00',
    },
  },
  'doch-faraona-2026-11-28': {
    title: 'Билеты на балет «Дочь Фараона» — Большой театр{{price}}',
    description:
      'Купить билеты на балет «Дочь Фараона» в Большом{{price}} — {{when}}, {{venue}}. ' +
      '28–29 ноября, 6+. Историческая сцена, оплата онлайн, электронный билет.',
    h1: 'Балет «Дочь Фараона» — билеты на Историческую сцену Большого',
    keywords:
      'дочь фараона балет, дочь фараона большой театр, балет дочь фараона большой театр, дочь фараона билеты, купить билеты дочь фараона большой',
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-28T12:00:00+03:00',
    },
  },
  'petrushka-shekherazada-zhar-ptica-2026-11-24': {
    title: 'Билеты на «Петрушка. Шехеразада. Жар-птица» — Большой{{price}}',
    description:
      'Купить билеты на вечер балетов «Петрушка», «Шехеразада», «Жар-птица»{{price}} — {{when}}, {{venue}}. ' +
      '24–25 ноября, 19:00, 6+. Историческая сцена, оплата онлайн, электронный билет.',
    h1: '«Петрушка. Шехеразада. Жар-птица» — билеты в Большой театр',
    keywords:
      'петрушка большой театр, жар птица купить билеты, шехеразада билеты, петрушка шехеразада жар птица большой, балет петрушка большой театр',
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-24T19:00:00+03:00',
    },
  },
  'turandot-2026-11-20': {
    title: 'Билеты на оперу «Турандот» — Большой театр{{price}}',
    description:
      'Купить билеты на оперу «Турандот» в Большом театре{{price}} — {{when}}, {{venue}}. ' +
      '20–22 ноября, 12+. Историческая сцена, оплата онлайн, электронный билет.',
    h1: 'Опера «Турандот» — билеты на Историческую сцену Большого',
    keywords:
      'турандот билеты, турандот купить билеты, турандот опера билеты, турандот большой театр билеты, купить билеты турандот большой, опера турандот москва',
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-20T19:00:00+03:00',
    },
  },
  'bayaderka-2026-11-13': {
    title: 'Билеты на балет «Баядерка» — Большой театр{{price}}',
    description:
      'Купить билеты на балет «Баядерка» в Большом театре{{price}} — {{when}}, {{venue}}. ' +
      '13–15 ноября, 6+. Партер и сектора Исторической сцены, оплата онлайн, электронный билет.',
    h1: 'Балет «Баядерка» — билеты на Историческую сцену Большого',
    keywords:
      'баядерка билеты, баядерка купить билет, баядерка балет, балет баядерка большой театр, баядерка большой театр купить билеты, баядерка балет билеты',
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-13T19:00:00+03:00',
    },
  },
  'koppelia-2026-11-22': {
    title: 'Билеты на балет «Коппелия» — Большой театр, Новая сцена{{price}}',
    description:
      'Купить билеты на балет «Коппелия» в Большом театре{{price}} — {{when}}, {{venue}}. ' +
      '22 ноября, 12:00 и 18:00, 6+. Партер середина, оплата онлайн, электронный билет.',
    h1: 'Балет «Коппелия» — билеты на Новую сцену Большого',
    keywords:
      'коппелия балет, балет коппелия большой театр, коппелия большой театр, балет коппелия купить билет, новая сцена большого театра билеты, делиб коппелия',
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-11-22T12:00:00+03:00',
    },
  },
  'chaika-2026-11-18': {
    title: 'Билеты на балет «Чайка» — Большой театр, Новая сцена{{price}}',
    description:
      'Купить билеты на балет «Чайка» Большого театра (Посохов / Молочников / Демутский){{price}} — {{when}}, {{venue}}. ' +
      '18–19 ноября, 19:00, 16+. Партер середина от 80 000 ₽, электронный билет.',
    h1: 'Балет «Чайка» — билеты на Новую сцену Большого',
    keywords:
      'чайка билеты, чайка купить билеты, балет чайка, балет чайка большой театр, чайка большой театр, купить билет на чайку, новая сцена большого театра билеты',
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-11-18T19:00:00+03:00',
    },
  },
  'evgeniy-onegin-2026-11-26': {
    title: 'Билеты на оперу «Евгений Онегин» — Большой театр{{price}}',
    description:
      'Купить билеты на оперу «Евгений Онегин» в Большом театре{{price}} — {{when}}, {{venue}}. ' +
      '26–28 ноября, 12+. Партер середина от 70 000 ₽, оплата онлайн, электронный билет.',
    h1: 'Опера «Евгений Онегин» — билеты на Новую сцену Большого',
    keywords:
      'евгений онегин билеты, онегин купить билеты, евгений онегин купить билеты, онегин большой театр, евгений онегин большой театр, опера евгений онегин билеты, опера евгений онегин купить билеты',
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-11-26T19:00:00+03:00',
    },
  },
  'chipollino-2026-11-06': {
    title: 'Билеты на балет «Чиполлино» — Большой театр{{price}}',
    description:
      'Купить билеты на балет «Чиполлино» в Большом театре{{price}} — {{when}}, {{venue}}. ' +
      '6–8 ноября, 6+. Партер середина Новой сцены, оплата онлайн, электронный билет.',
    h1: 'Балет «Чиполлино» — билеты на Новую сцену Большого',
    keywords:
      'балет чиполлино, чиполлино большой театр, балет чиполлино большой театр, балет чиполлино купить билеты, чиполлино большой театр купить билет, билеты на чиполлино',
    aliases: [
      'chipollino-2026-11-07-12',
      'chipollino-2026-11-07-19',
      'chipollino-2026-11-08-12',
      'chipollino-2026-11-08-18',
    ],
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-11-06T19:00:00+03:00',
    },
  },
  'kabala-svyatosh': {
    title: 'Купить билеты на «Кабала святош»',
    description:
      `Купить билеты на спектакль «Кабала святош» — {{venue}}. ${MECHANICS}.`,
    h1: 'Билеты на «Кабала святош»',
    keywords:
      'купить билеты кабала святош, кабала святош билеты, спектакль кабала святош билеты, кабала святош билеты москва',
    aliases: ['686cd69c58f79d0030278b9d'],
    defaults: { venue: 'МХТ им. А. П. Чехова, Москва' },
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
