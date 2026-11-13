/**
 * Админка медиаплана Директ: CRUD + скан ассортимента/спроса.
 * 1 row = 1 event/LP; группы по интенту+landing; минуса: кампания / событие / группа.
 */
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';
import { scoreSeoDraft } from '../lib/adsMediaplanScore.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

const COMMON_NEG = [
  'бесплатно',
  'скачать',
  'торрент',
  'youtube',
  'ютуб',
  'википедия',
  'реферат',
  'сочинение',
  'краткое содержание',
  'смотреть онлайн',
  'фильм',
  'сериал',
  'официальный сайт',
  'официальные билеты',
];

const CAMPAIGN_NEG_DEFAULT = [
  ...COMMON_NEG,
  'содержание',
  'анализ',
  'сюжет',
  'трансляция',
  'отзывы',
  'вики',
  'ticketland',
  'kassir',
  'яндекс афиша',
  'афиша',
];

function uniqArr(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const s = String(x || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function normalizeAd(a) {
  if (!a || typeof a !== 'object') return { title: '', title2: '', text: '' };
  return {
    title: String(a.title || '').trim(),
    title2: String(a.title2 || '').trim(),
    text: String(a.text || '').trim(),
  };
}

function normalizeGroup(g, idx = 0) {
  const id = String(g?.id || `group-${idx + 1}`).trim() || `group-${idx + 1}`;
  return {
    id,
    name: String(g?.name || `Группа ${idx + 1}`).trim(),
    landing_url: String(g?.landing_url || '').trim(),
    hot_keywords: uniqArr(g?.hot_keywords),
    negative_keywords: uniqArr(g?.negative_keywords),
    ads: Array.isArray(g?.ads) && g.ads.length
      ? g.ads.map(normalizeAd)
      : [{ title: '', title2: '', text: '' }],
  };
}

function normalizeStructure(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((g, i) => normalizeGroup(g, i));
}

function isStructureEmpty(raw) {
  if (raw == null) return true;
  if (typeof raw === 'string') {
    const t = raw.trim();
    return !t || t === '[]' || t === 'null';
  }
  if (Array.isArray(raw)) return raw.length === 0;
  return true;
}

/** Legacy flat → одна группа «HOT купить». */
function synthesizeStructureFromLegacy(row) {
  const titles = row.ad_titles || [];
  const texts = row.ad_texts || [];
  const ads = [];
  const n = Math.max(titles.length, texts.length, 1);
  for (let i = 0; i < n; i += 1) {
    ads.push({
      title: titles[i] || '',
      title2: '',
      text: texts[i] || '',
    });
  }
  return [
    normalizeGroup(
      {
        id: 'hot-buy',
        name: 'HOT купить',
        landing_url: row.lp_url || '',
        hot_keywords: row.hot_keywords || [],
        negative_keywords: [],
        ads,
      },
      0,
    ),
  ];
}

/** Flat-поля из структуры (union) — совместимость со старым UI/API. */
function syncFlatFromStructure(structure, eventNegatives = []) {
  const groups = normalizeStructure(structure);
  const hot = [];
  const titles = [];
  const texts = [];
  const groupNeg = [];
  for (const g of groups) {
    hot.push(...(g.hot_keywords || []));
    groupNeg.push(...(g.negative_keywords || []));
    for (const a of g.ads || []) {
      if (a.title) titles.push(a.title);
      if (a.text) texts.push(a.text);
    }
  }
  return {
    hot_keywords: uniqArr(hot),
    negative_keywords: uniqArr([...(eventNegatives || []), ...groupNeg]),
    ad_titles: uniqArr(titles),
    ad_texts: uniqArr(texts),
  };
}

function skeletonStructure({ lp_url, hot_keywords = [], ads = [] }) {
  return [
    normalizeGroup(
      {
        id: 'hot-buy',
        name: 'HOT купить',
        landing_url: lp_url || '',
        hot_keywords,
        negative_keywords: [],
        ads: ads.length ? ads : [{ title: '', title2: '', text: '' }],
      },
      0,
    ),
  ];
}

function resolveStructureAndFlat(input) {
  const hasStructure =
    input.structure_json != null && !isStructureEmpty(input.structure_json);
  let structure = hasStructure
    ? normalizeStructure(input.structure_json)
    : synthesizeStructureFromLegacy(input);
  if (!structure.length) {
    structure = skeletonStructure({
      lp_url: input.lp_url,
      hot_keywords: input.hot_keywords || [],
    });
  }
  const eventNeg = uniqArr(input.negative_keywords || []);
  const flat = syncFlatFromStructure(structure, eventNeg);
  // event-level negatives остаются отдельно; flat.negative_keywords = event ∪ group
  return {
    structure_json: structure,
    hot_keywords: flat.hot_keywords.length ? flat.hot_keywords : uniqArr(input.hot_keywords || []),
    negative_keywords: eventNeg.length ? eventNeg : flat.negative_keywords,
    ad_titles: flat.ad_titles.length ? flat.ad_titles : uniqArr(input.ad_titles || []),
    ad_texts: flat.ad_texts.length ? flat.ad_texts : uniqArr(input.ad_texts || []),
    campaign_negatives: uniqArr(input.campaign_negatives || []),
  };
}

/** Стартовый медиаплан под текущий HOT-контур 75к. */
const SEED = [
  {
    event_slug: 'kabala-svyatosh',
    event_title: 'Кабала святош',
    venue: 'МХТ им. А. П. Чехова',
    event_date: '2026-11-20',
    date_label: '20 ноября',
    date_from: '2026-11-20',
    date_to: '2026-11-20',
    lp_url: 'https://biletvsem.com/ticket/kabala-svyatosh',
    status: 'planned',
    priority: 100,
    sort_order: 10,
    daily_budget_rub: 850,
    total_budget_rub: 12000,
    campaign_name: 'POISK_KABALA_SVYATOSH',
    campaign_id: 709742229,
    research_json: {
      wordstat: [
        { phrase: 'кабала святош билеты', count: 1470, region: 213, at: '2026-11-11' },
        { phrase: 'кабала святош купить билет', count: 1141, region: 213, at: '2026-11-11' },
        { phrase: 'кабала святош мхт билеты', count: 521, region: 213, at: '2026-11-11' },
      ],
      competitors: [
        'Яндекс Афиша / Ticketland / агрегаторы по запросу «кабала святош билеты»',
        'Официальный МХТ — не копировать «официальные билеты»',
      ],
      snippets: [
        'Типичный паттерн: «Купить билеты», дата, МХТ, схема/места, e-билет',
      ],
      sources: ['safari-wordstat-hot 2026-11-11', 'Direct campaign 709742229'],
      why: 'Максимальный HOT-спрос при адекватном чеке (~от 12к). Ядро бюджета.',
    },
    seo_title: 'Купить билеты на «Кабала святош»',
    seo_description:
      'Купить билеты на спектакль «Кабала святош» — МХТ им. А. П. Чехова. Схема зала, выбор мест онлайн, оплата, электронный билет.',
    seo_h1: 'Билеты на «Кабала святош»',
    seo_keywords:
      'купить билеты кабала святош, кабала святош билеты, спектакль кабала святош билеты, кабала святош билеты москва, кабала святош мхт билеты',
    body_excerpt:
      'Спектакль МХТ на Камергерском: дата, места на схеме и оплата онлайн. После оплаты — электронный билет на почту.',
    forecast_impressions: 900,
    forecast_clicks: 45,
    forecast_cpc_rub: 80,
    forecast_conversions: 2.5,
    forecast_notes:
      'Высший near-term daily (Wordstat ~1470 core). День-1 дисциплина: минуса сразу, purchase only. Speculative.',
    campaign_negatives: [
      ...CAMPAIGN_NEG_DEFAULT,
      'либретто',
      'книга',
      'аудиокнига',
      'школьный',
      'урок',
      'официальный',
      'содержание',
      'смотреть',
      'хабенский',
      'цискаридзе',
    ],
    negative_keywords: ['александринский', 'гастроли', 'булгаков музей'],
    structure_json: [
      {
        id: 'kabala_hot_buy',
        name: 'kabala_hot_buy',
        landing_url: 'https://biletvsem.com/ticket/kabala-svyatosh',
        hot_keywords: [
          'купить билеты кабала святош',
          'кабала святош билеты',
          'кабала святош билеты купить',
          'спектакль кабала святош купить билет',
          'кабала святош билеты онлайн',
        ],
        negative_keywords: ['турандот', 'чайка', 'официальный', 'хабенский', 'цискаридзе'],
        ads: [
          {
            title: 'Купить билеты Кабала святош',
            title2: 'От 12 325 ₽, все даты',
            text: 'Лучшие места в продаже. Эксклюзив — оформите, пока есть',
          },
          {
            title: 'Кабала святош — купить билет',
            title2: 'Цены от 12 325 ₽',
            text: 'Все доступные даты. Выберите место на схеме и оплатите',
          },
          {
            title: 'Билеты на Кабала святош',
            title2: 'Успейте взять лучшие места',
            text: 'Ещё есть сильные ряды. От 12 325 ₽ — купить онлайн',
          },
        ],
      },
      {
        id: 'kabala_mht',
        name: 'kabala_mht',
        landing_url: 'https://biletvsem.com/ticket/kabala-svyatosh',
        hot_keywords: [
          'кабала святош мхт билеты',
          'купить билеты кабала святош мхт',
          'кабала святош мхт купить билеты',
        ],
        negative_keywords: ['ленком', 'сатирикон', 'вахтангова', 'официальный сайт мхт'],
        ads: [
          {
            title: 'Кабала святош — билеты МХТ',
            title2: 'От 12 325 ₽',
            text: 'Места, которых нет у других. Все даты — купить сейчас',
          },
          {
            title: 'Билеты МХТ на Кабала святош',
            title2: 'Эксклюзивное наличие',
            text: 'Лучшие ряды ещё в продаже. Успейте оформить онлайн',
          },
        ],
      },
      {
        id: 'kabala_seats',
        name: 'kabala_seats',
        landing_url: 'https://biletvsem.com/ticket/kabala-svyatosh',
        hot_keywords: [
          'кабала святош билеты москва',
          'спектакль кабала святош билеты',
        ],
        negative_keywords: ['дешево', 'бронь без оплаты', 'vip перекуп'],
        ads: [
          {
            title: 'Кабала святош — лучшие места',
            title2: 'Купить от 12 325 ₽',
            text: 'Эксклюзив по наличию. Дата и место — на схеме, оплата сразу',
          },
          {
            title: 'Билеты Кабала святош — все даты',
            title2: 'Пока есть хорошие места',
            text: 'Оплата онлайн. После оплаты билет на почту',
          },
        ],
      },
    ],
    notes:
      'FINAL pack в Директе (группы kabala_hot_buy / kabala_mht / kabala_seats). DailyBudget 850. Старые группы suspended.',
  },
  {
    event_slug: 'gamlet',
    event_title: 'Гамлет',
    venue: 'МХТ им. А. П. Чехова',
    event_date: '2026-11-25',
    date_label: '25 ноября',
    date_from: '2026-11-25',
    date_to: '2026-11-25',
    lp_url: 'https://biletvsem.com/ticket/gamlet',
    status: 'planned',
    priority: 90,
    sort_order: 20,
    daily_budget_rub: 250,
    total_budget_rub: 8000,
    campaign_name: 'POISK_GAMLET_MHT_HOT',
    campaign_id: 716098596,
    research_json: {
      wordstat: [
        { phrase: 'гамлет мхт билеты', count: 99, region: 213, at: '2026-11-11' },
        { phrase: 'мхт гамлет купить билеты', count: 78, region: 213, at: '2026-11-11' },
        { phrase: 'гамлет мхт чехова билеты', count: 72, region: 213, at: '2026-11-11' },
      ],
      competitors: ['Несколько «Гамлетов» в Москве — только МХТ в объявлении и LP'],
      snippets: ['«Билеты на Гамлет — МХТ», дата, схема'],
      sources: ['safari-wordstat-hot 2026-11-11'],
      why: 'Узкий HOT + низкий входной чек. Жёстко минусовать другие театры.',
    },
    seo_title: 'Билеты на «Гамлет» — МХТ им. Чехова',
    seo_description:
      'Купить билеты на «Гамлет» в МХТ им. Чехова. Схема зала, оплата онлайн, электронный билет.',
    seo_h1: 'Билеты на «Гамлет» — МХТ им. Чехова',
    seo_keywords:
      'гамлет мхт билеты, купить билеты гамлет мхт, гамлет мхт чехова билеты, билеты на гамлет мхт',
    body_excerpt:
      'Гамлет на сцене МХТ: выберите места на схеме и оформите билет онлайн. Электронный билет придёт на e-mail.',
    forecast_impressions: 250,
    forecast_clicks: 20,
    forecast_cpc_rub: 70,
    forecast_conversions: 1.5,
    forecast_notes: 'Малый объём — не раздувать ставку. Speculative.',
    campaign_negatives: [
      ...CAMPAIGN_NEG_DEFAULT,
      'шекспир текст',
      'перевод',
      'либретто',
    ],
    negative_keywords: ['отелло', 'король лир', 'гамлет балет'],
    structure_json: [
      {
        id: 'hot-buy',
        name: 'HOT купить',
        landing_url: 'https://biletvsem.com/ticket/gamlet',
        hot_keywords: [
          'гамлет мхт билеты',
          'купить билеты гамлет мхт',
          'билеты на гамлет мхт',
          'мхт гамлет купить билеты',
        ],
        negative_keywords: ['ленком', 'мдт', 'около дома станиславского'],
        ads: [
          {
            title: 'Билеты на Гамлет — МХТ',
            title2: '25 ноября',
            text: 'Чехова: схема зала, места онлайн, оплата картой, e-билет.',
          },
          {
            title: 'Купить билеты Гамлет МХТ',
            title2: 'Схема · e-билет',
            text: 'Дата 25.11. Без очереди в кассу — билет на почту после оплаты.',
          },
        ],
      },
      {
        id: 'venue-scene',
        name: 'Venue МХТ Чехова',
        landing_url: 'https://biletvsem.com/ticket/gamlet',
        hot_keywords: [
          'гамлет мхт чехова билеты',
          'гамлет театр чехова билеты',
          'билеты гамлет мхт им чехова',
        ],
        negative_keywords: ['сатирикон', 'вахтангова', 'официальный сайт мхт'],
        ads: [
          {
            title: 'Гамлет — МХТ им. Чехова',
            title2: 'Билеты онлайн',
            text: '25 ноября. Схема зала, оплата картой, электронный билет.',
          },
          {
            title: 'Билеты Гамлет · Чехова',
            title2: 'Камергерский',
            text: 'Только МХТ. Места на схеме, e-билет после оплаты.',
          },
        ],
      },
      {
        id: 'seats-price',
        name: 'Места / цена',
        landing_url: 'https://biletvsem.com/ticket/gamlet',
        hot_keywords: [
          'гамлет мхт цена билетов',
          'гамлет мхт схема зала',
          'билеты гамлет мхт купить места',
        ],
        negative_keywords: ['бесплатно', 'текст пьесы'],
        ads: [
          {
            title: 'Гамлет МХТ — места на схеме',
            title2: 'Цена до оплаты',
            text: '25 ноября. Выберите ряд и место — e-билет на почту.',
          },
          {
            title: 'Билеты Гамлет — схема МХТ',
            title2: 'Оплата онлайн',
            text: 'Сектора и цены на схеме. Электронный билет сразу.',
          },
        ],
      },
    ],
    notes: 'В каталоге несколько Гамлетов — LP только МХТ (6735c3a8569a15f2087ba5ee).',
  },
  {
    event_slug: 'bayaderka-2026-11-13',
    event_title: 'Баядерка',
    venue: 'Большой театр — Историческая сцена',
    event_date: '2026-11-13',
    date_label: '13–15 ноября',
    date_from: '2026-11-13',
    date_to: '2026-11-15',
    lp_url: 'https://biletvsem.com/ticket/bayaderka-2026-11-13',
    status: 'planned',
    priority: 85,
    sort_order: 30,
    daily_budget_rub: 200,
    total_budget_rub: 1500,
    campaign_name: 'POISK_BAYADERKA_HOT',
    campaign_id: 716098615,
    research_json: {
      wordstat: [
        { phrase: 'баядерка билеты', count: 112, region: 213, at: '2026-11-11' },
        { phrase: 'баядерка купить билет', count: 85, region: 213, at: '2026-11-11' },
        { phrase: 'баядерка балет билеты', count: 57, region: 213, at: '2026-11-11' },
      ],
      competitors: ['Большой касса / агрегаторы; не мимикрировать под официальный сайт'],
      snippets: ['Баядерка + Большой + дата 13–15.11 + Историческая'],
      sources: ['safari-wordstat-hot 2026-11-11'],
      why: 'Короткое окно до 13–15.11. Спринт, потом бюджет на Кабалу/Гамлет/Щелкунчик.',
    },
    seo_title: 'Купить билеты «Баядерка» — Большой, 13.11',
    seo_description:
      'Балет «Баядерка» — Большой, Историческая сцена, 13 ноября. Сеансы 13–15.11. Сектора на схеме, оплата онлайн, электронный билет.',
    seo_h1: 'Баядерка — билеты в Большой, Историческая',
    seo_keywords:
      'баядерка билеты, баядерка купить билет, баядерка балет, балет баядерка большой театр, баядерка большой театр купить билеты',
    body_excerpt:
      'Баядерка на Исторической сцене Большого: ближайшие даты 13–15 ноября. Выберите зону на схеме и оплатите онлайн.',
    forecast_impressions: 180,
    forecast_clicks: 12,
    forecast_cpc_rub: 90,
    forecast_conversions: 0.8,
    forecast_notes: 'Высокий floor цены (~от 40к) — мало оплат, осторожный spend. Speculative.',
    campaign_negatives: [
      ...CAMPAIGN_NEG_DEFAULT,
      'либретто',
      'история балета',
      'партия',
      'вариация',
      'льготн',
      'пенсионер',
    ],
    negative_keywords: ['мариинский', 'новая сцена баядерка'],
    structure_json: [
      {
        id: 'hot-buy',
        name: 'HOT купить',
        landing_url: 'https://biletvsem.com/ticket/bayaderka-2026-11-13',
        hot_keywords: [
          'баядерка билеты',
          'баядерка купить билет',
          'баядерка балет билеты',
          'купить билеты баядерка',
        ],
        negative_keywords: ['официальный', 'официальный сайт большого'],
        ads: [
          {
            title: 'Купить билеты Баядерка',
            title2: '13–15 ноября',
            text: 'Большой, Историческая. Зоны на схеме, оплата онлайн, e-билет.',
          },
          {
            title: 'Баядерка — билеты онлайн',
            title2: 'Историческая сцена',
            text: '13–15.11. Сектора на схеме, оплата картой, билет на почту.',
          },
        ],
      },
      {
        id: 'venue-scene',
        name: 'Большой · Историческая',
        landing_url: 'https://biletvsem.com/ticket/bayaderka-2026-11-13',
        hot_keywords: [
          'баядерка большой театр купить билеты',
          'балет баядерка большой театр',
          'баядерка большой театр билеты',
        ],
        negative_keywords: ['новая сцена', 'филиал', 'официальный сайт большого театра'],
        ads: [
          {
            title: 'Баядерка — билеты Большой',
            title2: 'Историческая сцена',
            text: '13–15.11. Зоны на схеме, оплата онлайн, электронный билет.',
          },
          {
            title: 'Билеты Баядерка · Большой',
            title2: '13–15 ноября',
            text: 'Историческая сцена. Выбор зоны, e-билет после оплаты.',
          },
        ],
      },
      {
        id: 'seats-price',
        name: 'Места / цена',
        landing_url: 'https://biletvsem.com/ticket/bayaderka-2026-11-13',
        hot_keywords: [
          'баядерка билеты цена',
          'баядерка схема зала большой',
          'баядерка партер билеты',
        ],
        negative_keywords: ['бесплатно', 'льготный'],
        ads: [
          {
            title: 'Баядерка — зоны на схеме',
            title2: 'Цена до оплаты',
            text: 'Большой 13–15.11. Сектора видны на схеме, e-билет на почту.',
          },
          {
            title: 'Билеты Баядерка — схема',
            title2: 'Историческая',
            text: 'Выбор зоны онлайн. Оплата картой, электронный билет.',
          },
        ],
      },
    ],
    notes: 'EndDate РК 15.11. Много дат на одном LP = одна РК; даты в креативах.',
  },
  {
    event_slug: 'novogodniy-balet-chaykovskogo-2026-12',
    event_title: 'Щелкунчик',
    venue: 'Большой театр — Историческая сцена',
    event_date: '2026-12-18',
    date_label: '18 дек – 10 янв',
    date_from: '2026-12-18',
    date_to: '2027-01-10',
    lp_url: 'https://biletvsem.com/ticket/novogodniy-balet-chaykovskogo-2026-12',
    status: 'planned',
    priority: 95,
    sort_order: 40,
    daily_budget_rub: 700,
    total_budget_rub: 25000,
    campaign_name: 'POISK_SHELKUNCHIK_BOLSHOI_HOT',
    campaign_id: 716098640,
    research_json: {
      wordstat: [
        { phrase: 'щелкунчик большой театр билеты', count: 2338, region: 213, at: '2026-11-11' },
        { phrase: 'щелкунчик купить билеты', count: 2422, region: 213, at: '2026-11-11' },
        { phrase: 'большой театр щелкунчик купить билет', count: 763, region: 213, at: '2026-11-11' },
        { phrase: 'новогодний балет чайковского билеты', count: 0, region: 213, at: '2026-11-11' },
      ],
      competitors: [
        'Официальный Большой / крупные агрегаторы',
        'Не использовать «официальные билеты» и логотип театра',
      ],
      snippets: ['Щелкунчик + Большой + Историческая + декабрь/новый год + купить'],
      sources: ['safari-wordstat-hot 2026-11-11'],
      why: 'Продукт = Щелкунчик; название «Новогодний балет» в поиске мёртвое (0). Крутить как Щелкунчик.',
    },
    seo_title: 'Купить билеты «Щелкунчик» — Большой',
    seo_description:
      'Балет «Щелкунчик» Чайковского в Большом — Историческая сцена, 18 дек — 10 янв, 6+. Схема зала, оплата онлайн, электронный билет.',
    seo_h1: 'Щелкунчик — билеты в Большой театр',
    seo_keywords:
      'щелкунчик большой театр билеты, щелкунчик купить билеты, большой театр щелкунчик купить билет, щелкунчик балет купить билеты, щелкунчик большой театр билеты 2026',
    body_excerpt:
      'Щелкунчик Чайковского на Исторической сцене Большого — даты с 18 декабря по 10 января. На схеме видны зоны и цены; после оплаты билет приходит на почту.',
    forecast_impressions: 2000,
    forecast_clicks: 60,
    forecast_cpc_rub: 85,
    forecast_conversions: 3,
    forecast_notes:
      'High demand (Wordstat 2k+), даты с 18.12 — daily 700 сейчас; ramp выше ближе к 18 дек. High ticket ~70к. Speculative.',
    campaign_negatives: [
      ...CAMPAIGN_NEG_DEFAULT,
      'мультфильм',
      'сказка читать',
      'ноты',
      'партия',
      'либретто',
      'льготн',
      'пенсионер',
      'официальный',
      'bolshoi.ru',
      'смотреть',
      'казань',
      'спб',
    ],
    negative_keywords: ['мариинский', 'вахтангова', 'сталинас', 'детский сад'],
    structure_json: [
      {
        id: 'shelk_hot_buy',
        name: 'shelk_hot_buy',
        landing_url: 'https://biletvsem.com/ticket/novogodniy-balet-chaykovskogo-2026-12',
        hot_keywords: [
          'щелкунчик купить билеты',
          'щелкунчик балет купить билеты',
          'купить билеты щелкунчик',
        ],
        negative_keywords: ['официальный', 'официальный сайт большого', 'мультфильм'],
        ads: [
          {
            title: 'Купить билеты Щелкунчик',
            title2: 'От 70 000 ₽',
            text: 'Все даты 18 дек – 10 янв. Лучшие места — успейте купить',
          },
          {
            title: 'Щелкунчик — купить билет',
            title2: 'Большой, Новый год',
            text: 'Эксклюзивное наличие. Выберите дату и оформите онлайн',
          },
          {
            title: 'Билеты на Щелкунчик',
            title2: 'Успейте на лучшие места',
            text: 'Цены от 70 000 ₽. Все ближайшие даты в продаже',
          },
        ],
      },
      {
        id: 'shelk_bolshoi',
        name: 'shelk_bolshoi',
        landing_url: 'https://biletvsem.com/ticket/novogodniy-balet-chaykovskogo-2026-12',
        hot_keywords: [
          'щелкунчик большой театр билеты',
          'большой театр щелкунчик купить билет',
          'щелкунчик большой театр билеты 2026',
        ],
        negative_keywords: [
          'новая сцена',
          'официальный сайт большого театра',
          'филиал',
          'bolshoi.ru',
        ],
        ads: [
          {
            title: 'Щелкунчик — билеты Большой',
            title2: 'Историческая сцена',
            text: 'Места, которых нет у агрегаторов. Купить на все даты',
          },
          {
            title: 'Билеты Щелкунчик — Большой',
            title2: 'От 70 000 ₽',
            text: '18 декабря – 10 января. Лучшие места — оформите сейчас',
          },
        ],
      },
      {
        id: 'shelk_dates',
        name: 'shelk_dates',
        landing_url: 'https://biletvsem.com/ticket/novogodniy-balet-chaykovskogo-2026-12',
        hot_keywords: [
          'билеты на щелкунчик москва большой театр',
          'щелкунчик балет большой театр купить билеты',
        ],
        negative_keywords: ['бесплатно', 'мульт', 'казань', 'спб'],
        ads: [
          {
            title: 'Щелкунчик: все даты в продаже',
            title2: '18.12 – 10.01',
            text: 'Эксклюзив по наличию. Выберите вечер и место на схеме',
          },
          {
            title: 'Щелкунчик — лучшие места',
            title2: 'Купить от 70 000 ₽',
            text: 'Пока есть сильные места. Оплата онлайн сразу',
          },
        ],
      },
    ],
    notes:
      'FINAL pack в Директе (shelk_hot_buy / shelk_bolshoi / shelk_dates). DailyBudget 700. · в Title запрещён API — используем —. Старый shelkunchik_buy suspended.',
  },
];

// Синхронизация flat из structure для SEED
for (const s of SEED) {
  const flat = syncFlatFromStructure(s.structure_json, s.negative_keywords || []);
  s.hot_keywords = flat.hot_keywords;
  s.ad_titles = flat.ad_titles;
  s.ad_texts = flat.ad_texts;
  // event-level negatives остаются как заданы; не затираем union в negative_keywords seed
}

async function ensureTable() {
  for (const name of ['088_ads_mediaplan.sql', '089_ads_mediaplan_groups.sql']) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
    await ticketPool.query(sql);
  }
}

function rowOut(r) {
  if (!r) return null;
  const scored = scoreSeoDraft({
    title: r.seo_title,
    description: r.seo_description,
    h1: r.seo_h1,
    keywords: r.seo_keywords,
    body: r.body_excerpt,
  });
  let structure = r.structure_json;
  if (typeof structure === 'string') {
    try {
      structure = JSON.parse(structure);
    } catch {
      structure = [];
    }
  }
  if (isStructureEmpty(structure)) {
    structure = synthesizeStructureFromLegacy(r);
  } else {
    structure = normalizeStructure(structure);
  }
  return {
    ...r,
    research_json: r.research_json || {},
    date_label: r.date_label || null,
    date_from: r.date_from || null,
    date_to: r.date_to || null,
    campaign_negatives: r.campaign_negatives || [],
    structure_json: structure,
    hot_keywords: r.hot_keywords || [],
    negative_keywords: r.negative_keywords || [],
    ad_titles: r.ad_titles || [],
    ad_texts: r.ad_texts || [],
    seo_score_live: scored.score10,
    seo_score_fail: scored.fail,
  };
}

const SEED_INSERT_COLS = `
  event_slug, event_title, venue, event_date, date_label, date_from, date_to, lp_url,
  status, priority, sort_order,
  daily_budget_rub, total_budget_rub, campaign_name, campaign_id, research_json,
  seo_title, seo_description, seo_h1, seo_keywords, seo_score, seo_score_notes, body_excerpt,
  forecast_impressions, forecast_clicks, forecast_cpc_rub, forecast_conversions, forecast_notes,
  hot_keywords, negative_keywords, ad_titles, ad_texts, campaign_negatives, structure_json, notes
`;

function seedParams(s, scored) {
  return [
    s.event_slug,
    s.event_title,
    s.venue,
    s.event_date,
    s.date_label || null,
    s.date_from || null,
    s.date_to || null,
    s.lp_url,
    s.status,
    s.priority,
    s.sort_order,
    s.daily_budget_rub,
    s.total_budget_rub,
    s.campaign_name,
    s.campaign_id,
    JSON.stringify(s.research_json || {}),
    s.seo_title,
    s.seo_description,
    s.seo_h1,
    s.seo_keywords,
    scored.score10,
    scored.fail.length ? `Слабые места: ${scored.fail.join(', ')}` : 'Ок по чеклисту',
    s.body_excerpt,
    s.forecast_impressions,
    s.forecast_clicks,
    s.forecast_cpc_rub,
    s.forecast_conversions,
    s.forecast_notes,
    s.hot_keywords,
    s.negative_keywords,
    s.ad_titles,
    s.ad_texts,
    s.campaign_negatives || [],
    JSON.stringify(s.structure_json || []),
    s.notes,
  ];
}

async function seedIfEmpty() {
  const { rows } = await ticketPool.query('SELECT COUNT(*)::int AS n FROM ads_mediaplan_events');
  if (rows[0].n > 0) return { seeded: 0 };
  let n = 0;
  for (const s of SEED) {
    const scored = scoreSeoDraft({
      title: s.seo_title,
      description: s.seo_description,
      h1: s.seo_h1,
      keywords: s.seo_keywords,
      body: s.body_excerpt,
    });
    await ticketPool.query(
      `INSERT INTO ads_mediaplan_events (${SEED_INSERT_COLS})
       VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,
         $9,$10,$11,
         $12,$13,$14,$15,$16::jsonb,
         $17,$18,$19,$20,$21,$22,$23,
         $24,$25,$26,$27,$28,
         $29,$30,$31,$32,$33,$34::jsonb,$35
       ) ON CONFLICT (event_slug) DO NOTHING`,
      seedParams(s, scored),
    );
    n += 1;
  }
  return { seeded: n };
}

/**
 * Для уже существующих seed-строк без structure_json — заполняем структуру
 * и даты/campaign_negatives, не трогая пользовательские правки если structure уже есть.
 */
async function seedStructureIfMissing() {
  const bySlug = new Map(SEED.map((s) => [s.event_slug, s]));
  const { rows } = await ticketPool.query(
    `SELECT id, event_slug, structure_json, hot_keywords, negative_keywords,
            ad_titles, ad_texts, lp_url, date_label, campaign_negatives
     FROM ads_mediaplan_events`,
  );
  let updated = 0;
  for (const r of rows) {
    const empty = isStructureEmpty(r.structure_json);
    const seed = bySlug.get(r.event_slug);
    if (!empty) continue;
    let structure;
    let date_label = r.date_label;
    let date_from = null;
    let date_to = null;
    let campaign_negatives = r.campaign_negatives || [];
    let negative_keywords = r.negative_keywords || [];
    if (seed) {
      structure = seed.structure_json;
      date_label = date_label || seed.date_label;
      date_from = seed.date_from;
      date_to = seed.date_to;
      if (!campaign_negatives?.length) campaign_negatives = seed.campaign_negatives || [];
      if (!negative_keywords?.length) negative_keywords = seed.negative_keywords || [];
    } else {
      structure = synthesizeStructureFromLegacy(r);
    }
    const flat = syncFlatFromStructure(structure, negative_keywords);
    await ticketPool.query(
      `UPDATE ads_mediaplan_events SET
         structure_json = $2::jsonb,
         date_label = COALESCE(date_label, $3),
         date_from = COALESCE(date_from, $4::date),
         date_to = COALESCE(date_to, $5::date),
         campaign_negatives = CASE
           WHEN campaign_negatives IS NULL OR cardinality(campaign_negatives) = 0 THEN $6
           ELSE campaign_negatives
         END,
         hot_keywords = CASE WHEN cardinality(hot_keywords) = 0 THEN $7 ELSE hot_keywords END,
         negative_keywords = CASE WHEN cardinality(negative_keywords) = 0 THEN $8 ELSE negative_keywords END,
         ad_titles = CASE WHEN cardinality(ad_titles) = 0 THEN $9 ELSE ad_titles END,
         ad_texts = CASE WHEN cardinality(ad_texts) = 0 THEN $10 ELSE ad_texts END,
         updated_at = NOW()
       WHERE id = $1`,
      [
        r.id,
        JSON.stringify(structure),
        date_label || null,
        date_from,
        date_to,
        campaign_negatives,
        flat.hot_keywords,
        negative_keywords,
        flat.ad_titles,
        flat.ad_texts,
      ],
    );
    updated += 1;
  }
  return { updated };
}

function loadWordstatHints() {
  const files = [
    'wordstat-live-2026-11-11.json',
    'wordstat-live.json',
    'wordstat-bolshoi-nov.json',
  ];
  const phrases = [];
  for (const f of files) {
    const p = path.join(DATA_DIR, f);
    if (!fs.existsSync(p)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      const queries = data.queries || [];
      for (const q of queries) {
        for (const row of q.rows || []) {
          if (row.phrase && row.count)
            phrases.push({ phrase: row.phrase, count: row.count, file: f, seed: q.q || q.query });
        }
      }
    } catch {
      // ignore broken file
    }
  }
  return phrases;
}

router.get('/', async (req, res) => {
  try {
    await ensureTable();
    await seedIfEmpty();
    await seedStructureIfMissing();
    const { rows } = await ticketPool.query(
      `SELECT * FROM ads_mediaplan_events
       ORDER BY priority DESC, sort_order ASC, id ASC`,
    );
    res.json({ items: rows.map(rowOut) });
  } catch (e) {
    console.error('[adsMediaplan] list', e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

router.post('/actions/scan', async (req, res) => {
  try {
    await ensureTable();
    await seedIfEmpty();
    const add = Boolean(req.body?.add);
    const limit = Math.min(40, Math.max(5, Number(req.body?.limit) || 20));

    const existing = await ticketPool.query(`SELECT event_slug FROM ads_mediaplan_events`);
    const have = new Set(existing.rows.map((r) => String(r.event_slug).toLowerCase()));

    let events = [];
    try {
      const ev = await ticketPool.query(
        `SELECT getbilet_external_id AS id,
                title_manual AS title,
                venue_manual AS venue,
                NULLIF(card_subtitle_manual, '') AS subtitle
         FROM getbilet_events
         WHERE COALESCE(is_published, TRUE) = TRUE
           AND COALESCE(storefront_hidden, FALSE) = FALSE
         ORDER BY updated_at DESC NULLS LAST
         LIMIT 200`,
      );
      events = ev.rows;
      try {
        const seo = await ticketPool.query(
          `SELECT getbilet_external_id AS id,
                  seo_title_manual, seo_description_manual, seo_h1_manual, seo_keywords_manual
           FROM getbilet_events
           WHERE getbilet_external_id = ANY($1::text[])`,
          [events.map((e) => e.id)],
        );
        const byId = new Map(seo.rows.map((r) => [r.id, r]));
        events = events.map((e) => ({ ...e, ...(byId.get(e.id) || {}) }));
      } catch {
        /* seo_* columns optional */
      }
    } catch (e) {
      console.warn('[adsMediaplan] scan events', e.message);
    }

    const ws = loadWordstatHints();
    const candidates = [];

    for (const ev of events) {
      const slug = String(ev.id || '').trim();
      if (!slug || have.has(slug.toLowerCase())) continue;
      const title = String(ev.title || '').trim();
      if (!title) continue;
      const titleL = title.toLowerCase();
      const matched = ws
        .filter((w) => {
          const p = w.phrase.toLowerCase();
          const tokens = titleL.split(/\s+/).filter((t) => t.length > 3).slice(0, 3);
          return tokens.some((t) => p.includes(t)) && /билет|купить/i.test(p);
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      const demand = matched.reduce((s, x) => s + Number(x.count || 0), 0);
      candidates.push({
        event_slug: slug,
        event_title: title,
        venue: ev.venue || null,
        event_date: null,
        lp_url: `https://biletvsem.com/ticket/${encodeURIComponent(slug)}`,
        demandScore: demand,
        wordstat: matched,
        seo_title: ev.seo_title_manual || null,
        seo_description: ev.seo_description_manual || null,
        seo_h1: ev.seo_h1_manual || null,
        seo_keywords: ev.seo_keywords_manual || null,
        notesHint: ev.subtitle || null,
      });
    }

    candidates.sort((a, b) => b.demandScore - a.demandScore);
    const top = candidates.slice(0, limit);

    const added = [];
    if (add) {
      for (const c of top.filter((x) => x.demandScore > 0).slice(0, 10)) {
        const scored = scoreSeoDraft(c);
        const hot = c.wordstat.map((w) => w.phrase);
        const structure = skeletonStructure({
          lp_url: c.lp_url,
          hot_keywords: hot,
          ads: [
            {
              title: `Купить билеты ${c.event_title}`.slice(0, 56),
              title2: '',
              text: 'Схема зала, оплата онлайн, электронный билет на почту.',
            },
          ],
        });
        try {
          const { rows } = await ticketPool.query(
            `INSERT INTO ads_mediaplan_events (
              event_slug, event_title, venue, event_date, lp_url, status, priority,
              research_json, seo_title, seo_description, seo_h1, seo_keywords,
              seo_score, seo_score_notes, hot_keywords, negative_keywords,
              campaign_negatives, structure_json, ad_titles, ad_texts, notes
            ) VALUES (
              $1,$2,$3,$4,$5,'planned',$6,
              $7::jsonb,$8,$9,$10,$11,
              $12,$13,$14,$15,
              $16,$17::jsonb,$18,$19,$20
            )
            ON CONFLICT (event_slug) DO NOTHING
            RETURNING *`,
            [
              c.event_slug,
              c.event_title,
              c.venue,
              c.event_date,
              c.lp_url,
              Math.min(80, 40 + Math.round(c.demandScore / 100)),
              JSON.stringify({
                wordstat: c.wordstat,
                sources: ['scan assortment+wordstat files'],
                scannedAt: new Date().toISOString(),
                why: 'Кандидат со скана: есть пересечение с Wordstat HOT',
              }),
              c.seo_title,
              c.seo_description,
              c.seo_h1,
              c.seo_keywords,
              scored.score10,
              scored.fail.length ? `Слабые места: ${scored.fail.join(', ')}` : null,
              hot,
              [],
              CAMPAIGN_NEG_DEFAULT,
              JSON.stringify(structure),
              structure[0].ads.map((a) => a.title).filter(Boolean),
              structure[0].ads.map((a) => a.text).filter(Boolean),
              'Добавлено сканом. Проверьте группы, минуса и бюджет вручную.',
            ],
          );
          if (rows[0]) added.push(rowOut(rows[0]));
        } catch (e) {
          console.warn('[adsMediaplan] add candidate', e.message);
        }
      }
    }

    res.json({
      scannedEvents: events.length,
      wordstatPhrases: ws.length,
      candidates: top,
      added,
    });
  } catch (e) {
    console.error('[adsMediaplan] scan', e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

router.get('/:id', async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await ticketPool.query(
      `SELECT * FROM ads_mediaplan_events WHERE id = $1`,
      [Number(req.params.id)],
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json({ item: rowOut(rows[0]) });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureTable();
    const b = req.body || {};
    if (!b.event_slug || !b.event_title) {
      return res.status(400).json({ error: 'event_slug и event_title обязательны' });
    }
    const scored = scoreSeoDraft(b);
    const resolved = resolveStructureAndFlat(b);
    const { rows } = await ticketPool.query(
      `INSERT INTO ads_mediaplan_events (
        event_slug, event_title, venue, event_date, date_label, date_from, date_to, lp_url,
        status, priority, sort_order,
        daily_budget_rub, total_budget_rub, campaign_name, campaign_id, research_json,
        seo_title, seo_description, seo_h1, seo_keywords, seo_score, seo_score_notes, body_excerpt,
        forecast_impressions, forecast_clicks, forecast_cpc_rub, forecast_conversions, forecast_notes,
        hot_keywords, negative_keywords, ad_titles, ad_texts, campaign_negatives, structure_json, notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        COALESCE($9,'planned'),COALESCE($10,50),COALESCE($11,100),
        $12,$13,$14,$15,COALESCE($16::jsonb,'{}'::jsonb),
        $17,$18,$19,$20,$21,$22,$23,
        $24,$25,$26,$27,$28,
        COALESCE($29,'{}'),COALESCE($30,'{}'),COALESCE($31,'{}'),COALESCE($32,'{}'),
        COALESCE($33,'{}'),COALESCE($34::jsonb,'[]'::jsonb),$35
      )
      RETURNING *`,
      [
        String(b.event_slug).trim(),
        String(b.event_title).trim(),
        b.venue || null,
        b.event_date || null,
        b.date_label || null,
        b.date_from || null,
        b.date_to || null,
        b.lp_url || null,
        b.status || 'planned',
        b.priority ?? 50,
        b.sort_order ?? 100,
        b.daily_budget_rub ?? null,
        b.total_budget_rub ?? null,
        b.campaign_name || null,
        b.campaign_id ?? null,
        JSON.stringify(b.research_json || {}),
        b.seo_title || null,
        b.seo_description || null,
        b.seo_h1 || null,
        b.seo_keywords || null,
        scored.score10,
        b.seo_score_notes ||
          (scored.fail.length ? `Слабые места: ${scored.fail.join(', ')}` : null),
        b.body_excerpt || null,
        b.forecast_impressions ?? null,
        b.forecast_clicks ?? null,
        b.forecast_cpc_rub ?? null,
        b.forecast_conversions ?? null,
        b.forecast_notes || null,
        resolved.hot_keywords,
        resolved.negative_keywords,
        resolved.ad_titles,
        resolved.ad_texts,
        resolved.campaign_negatives.length
          ? resolved.campaign_negatives
          : CAMPAIGN_NEG_DEFAULT,
        JSON.stringify(resolved.structure_json),
        b.notes || null,
      ],
    );
    res.status(201).json({ item: rowOut(rows[0]) });
  } catch (e) {
    if (String(e.message || '').includes('ads_mediaplan_events_slug_uniq')) {
      return res.status(409).json({ error: 'Событие с таким slug уже есть' });
    }
    console.error('[adsMediaplan] create', e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await ensureTable();
    const id = Number(req.params.id);
    const b = req.body || {};
    const scored = scoreSeoDraft(b);

    const hasStructure = b.structure_json != null && !isStructureEmpty(b.structure_json);
    const hasFlatArrays =
      b.hot_keywords != null ||
      b.negative_keywords != null ||
      b.ad_titles != null ||
      b.ad_texts != null;
    let resolved = null;
    if (hasStructure || hasFlatArrays || b.campaign_negatives != null) {
      resolved = resolveStructureAndFlat({
        ...b,
        structure_json: hasStructure
          ? b.structure_json
          : b.structure_json === null
            ? []
            : b.structure_json,
        lp_url: b.lp_url,
      });
      // если structure не прислали, но есть flat — синтезируем
      if (!hasStructure && hasFlatArrays) {
        resolved.structure_json = synthesizeStructureFromLegacy({
          lp_url: b.lp_url,
          hot_keywords: b.hot_keywords || [],
          ad_titles: b.ad_titles || [],
          ad_texts: b.ad_texts || [],
        });
        const flat = syncFlatFromStructure(
          resolved.structure_json,
          uniqArr(b.negative_keywords || []),
        );
        resolved.hot_keywords = flat.hot_keywords;
        resolved.ad_titles = flat.ad_titles;
        resolved.ad_texts = flat.ad_texts;
        resolved.negative_keywords = uniqArr(b.negative_keywords || []);
      }
    }

    const { rows } = await ticketPool.query(
      `UPDATE ads_mediaplan_events SET
        event_slug = COALESCE($2, event_slug),
        event_title = COALESCE($3, event_title),
        venue = COALESCE($4, venue),
        event_date = COALESCE($5, event_date),
        date_label = COALESCE($6, date_label),
        date_from = COALESCE($7, date_from),
        date_to = COALESCE($8, date_to),
        lp_url = COALESCE($9, lp_url),
        status = COALESCE($10, status),
        priority = COALESCE($11, priority),
        sort_order = COALESCE($12, sort_order),
        daily_budget_rub = COALESCE($13, daily_budget_rub),
        total_budget_rub = COALESCE($14, total_budget_rub),
        campaign_name = COALESCE($15, campaign_name),
        campaign_id = COALESCE($16, campaign_id),
        research_json = COALESCE($17::jsonb, research_json),
        seo_title = COALESCE($18, seo_title),
        seo_description = COALESCE($19, seo_description),
        seo_h1 = COALESCE($20, seo_h1),
        seo_keywords = COALESCE($21, seo_keywords),
        seo_score = $22,
        seo_score_notes = COALESCE($23, seo_score_notes),
        body_excerpt = COALESCE($24, body_excerpt),
        forecast_impressions = COALESCE($25, forecast_impressions),
        forecast_clicks = COALESCE($26, forecast_clicks),
        forecast_cpc_rub = COALESCE($27, forecast_cpc_rub),
        forecast_conversions = COALESCE($28, forecast_conversions),
        forecast_notes = COALESCE($29, forecast_notes),
        hot_keywords = COALESCE($30, hot_keywords),
        negative_keywords = COALESCE($31, negative_keywords),
        ad_titles = COALESCE($32, ad_titles),
        ad_texts = COALESCE($33, ad_texts),
        campaign_negatives = COALESCE($34, campaign_negatives),
        structure_json = COALESCE($35::jsonb, structure_json),
        notes = COALESCE($36, notes),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        b.event_slug ?? null,
        b.event_title ?? null,
        b.venue ?? null,
        b.event_date ?? null,
        b.date_label ?? null,
        b.date_from ?? null,
        b.date_to ?? null,
        b.lp_url ?? null,
        b.status ?? null,
        b.priority ?? null,
        b.sort_order ?? null,
        b.daily_budget_rub ?? null,
        b.total_budget_rub ?? null,
        b.campaign_name ?? null,
        b.campaign_id ?? null,
        b.research_json != null ? JSON.stringify(b.research_json) : null,
        b.seo_title ?? null,
        b.seo_description ?? null,
        b.seo_h1 ?? null,
        b.seo_keywords ?? null,
        scored.score10,
        b.seo_score_notes ??
          (scored.fail.length ? `Слабые места: ${scored.fail.join(', ')}` : 'Ок по чеклисту'),
        b.body_excerpt ?? null,
        b.forecast_impressions ?? null,
        b.forecast_clicks ?? null,
        b.forecast_cpc_rub ?? null,
        b.forecast_conversions ?? null,
        b.forecast_notes ?? null,
        resolved ? resolved.hot_keywords : b.hot_keywords ?? null,
        resolved ? resolved.negative_keywords : b.negative_keywords ?? null,
        resolved ? resolved.ad_titles : b.ad_titles ?? null,
        resolved ? resolved.ad_texts : b.ad_texts ?? null,
        resolved ? resolved.campaign_negatives : b.campaign_negatives ?? null,
        resolved ? JSON.stringify(resolved.structure_json) : null,
        b.notes ?? null,
      ],
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json({ item: rowOut(rows[0]) });
  } catch (e) {
    console.error('[adsMediaplan] update', e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureTable();
    const { rowCount } = await ticketPool.query(
      `DELETE FROM ads_mediaplan_events WHERE id = $1`,
      [Number(req.params.id)],
    );
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

router.post('/actions/rescore/:id', async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await ticketPool.query(
      `SELECT * FROM ads_mediaplan_events WHERE id = $1`,
      [Number(req.params.id)],
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    const r = rows[0];
    const scored = scoreSeoDraft({
      title: r.seo_title,
      description: r.seo_description,
      h1: r.seo_h1,
      keywords: r.seo_keywords,
      body: r.body_excerpt,
    });
    const upd = await ticketPool.query(
      `UPDATE ads_mediaplan_events SET
         seo_score = $2,
         seo_score_notes = $3,
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [
        r.id,
        scored.score10,
        scored.fail.length ? `Слабые места: ${scored.fail.join(', ')}` : 'Ок по чеклисту',
      ],
    );
    res.json({ item: rowOut(upd.rows[0]), score: scored });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

export { ensureTable, seedIfEmpty, seedStructureIfMissing, SEED };

export default router;
