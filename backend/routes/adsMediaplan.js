/**
 * Админка медиаплана Директ: CRUD + скан ассортимента/спроса.
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

/** Стартовый медиаплан под текущий HOT-контур 75к. */
const SEED = [
  {
    event_slug: 'kabala-svyatosh',
    event_title: 'Кабала святош',
    venue: 'МХТ им. А. П. Чехова',
    event_date: '2026-11-20',
    lp_url: 'https://biletvsem.com/ticket/kabala-svyatosh',
    status: 'planned',
    priority: 100,
    sort_order: 10,
    daily_budget_rub: 450,
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
    forecast_notes: 'День-1 на низком бюджете; после минусов — поднять daily. Speculative.',
    hot_keywords: [
      'кабала святош билеты',
      'кабала святош купить билет',
      'купить билеты кабала святош',
      'кабала святош мхт билеты',
      'кабала святош мхт купить билеты',
      'спектакль кабала святош билеты',
    ],
    negative_keywords: [
      ...COMMON_NEG,
      'книга',
      'анализ',
      'урок',
      'аудиокнига',
      'школьный',
      'александринский',
      'гастроли',
    ],
    ad_titles: [
      'Купить билеты Кабала святош',
      'Кабала святош - билеты МХТ',
      'Билеты на Кабала святош',
    ],
    ad_texts: [
      'МХТ им. Чехова, 20 ноября. Схема зала, места онлайн, оплата картой, e-билет.',
      'Выбор мест на схеме. Дата 20.11, оплата онлайн, электронный билет на почту.',
    ],
    notes: 'РК уже в Директе (OFF). Не писать «официальная продажа».',
  },
  {
    event_slug: 'gamlet',
    event_title: 'Гамлет',
    venue: 'МХТ им. А. П. Чехова',
    event_date: '2026-11-25',
    lp_url: 'https://biletvsem.com/ticket/gamlet',
    status: 'planned',
    priority: 90,
    sort_order: 20,
    daily_budget_rub: 350,
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
    hot_keywords: [
      'гамлет мхт билеты',
      'мхт гамлет купить билеты',
      'гамлет мхт чехова билеты',
      'купить билеты гамлет мхт',
      'билеты на гамлет мхт',
    ],
    negative_keywords: [
      ...COMMON_NEG,
      'ленком',
      'мдт',
      'около дома станиславского',
      'шекспир текст',
      'перевод',
      'отелло',
      'король лир',
    ],
    ad_titles: ['Билеты на Гамлет - МХТ', 'Купить билеты Гамлет МХТ'],
    ad_texts: [
      'Чехова, схема зала. Выбор мест онлайн, оплата картой, e-билет.',
      'Дата 25 ноября. Места на схеме, без очереди в кассу.',
    ],
    notes: 'В каталоге несколько Гамлетов — LP только МХТ (6735c3a8569a15f2087ba5ee).',
  },
  {
    event_slug: 'bayaderka-2026-11-13',
    event_title: 'Баядерка',
    venue: 'Большой театр — Историческая сцена',
    event_date: '2026-11-13',
    lp_url: 'https://biletvsem.com/ticket/bayaderka-2026-11-13',
    status: 'planned',
    priority: 85,
    sort_order: 30,
    daily_budget_rub: 250,
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
    hot_keywords: [
      'баядерка билеты',
      'баядерка купить билет',
      'баядерка балет билеты',
      'баядерка большой театр купить билеты',
      'балет баядерка большой театр',
    ],
    negative_keywords: [...COMMON_NEG, 'история балета', 'либретто', 'партия', 'вариация'],
    ad_titles: ['Купить билеты Баядерка', 'Баядерка - билеты Большой'],
    ad_texts: [
      'Большой, 13-15.11. Историческая сцена. Зоны на схеме, оплата онлайн, e-билет.',
      'Зоны на схеме, оплата онлайн, электронный билет на почту.',
    ],
    notes: 'EndDate РК 15.11. После — не продлевать без наличия.',
  },
  {
    event_slug: 'novogodniy-balet-chaykovskogo-2026-12',
    event_title: 'Щелкунчик',
    venue: 'Большой театр — Историческая сцена',
    event_date: '2026-12-18',
    lp_url: 'https://biletvsem.com/ticket/novogodniy-balet-chaykovskogo-2026-12',
    status: 'planned',
    priority: 95,
    sort_order: 40,
    daily_budget_rub: 300,
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
    forecast_notes: 'Разгон с mid-Nov; основной spend в декабре. High ticket ~70к. Speculative.',
    hot_keywords: [
      'щелкунчик большой театр билеты',
      'большой театр щелкунчик купить билет',
      'щелкунчик купить билеты',
      'щелкунчик балет купить билеты',
      'щелкунчик большой театр билеты 2026',
      'билеты на щелкунчик москва большой театр',
    ],
    negative_keywords: [
      ...COMMON_NEG,
      'мультфильм',
      'сказка читать',
      'ноты',
      'партия',
      'мариинский',
      'вахтангова',
      'сталинас',
    ],
    ad_titles: ['Купить билеты Щелкунчик', 'Щелкунчик - билеты Большой'],
    ad_texts: [
      'Чайковский, 18 дек-10 янв. Схема зала, оплата онлайн, e-билет.',
      'Выбор мест на схеме, оплата онлайн, электронный билет на почту.',
    ],
    notes: 'Slug LP старый (novogodniy-balet…), в UI/SEO — Щелкунчик. Бюджет растить после минусов.',
  },
];

async function ensureTable() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/088_ads_mediaplan.sql'),
    'utf8',
  );
  await ticketPool.query(sql);
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
  return {
    ...r,
    research_json: r.research_json || {},
    hot_keywords: r.hot_keywords || [],
    negative_keywords: r.negative_keywords || [],
    ad_titles: r.ad_titles || [],
    ad_texts: r.ad_texts || [],
    seo_score_live: scored.score10,
    seo_score_fail: scored.fail,
  };
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
      `INSERT INTO ads_mediaplan_events (
        event_slug, event_title, venue, event_date, lp_url, status, priority, sort_order,
        daily_budget_rub, total_budget_rub, campaign_name, campaign_id, research_json,
        seo_title, seo_description, seo_h1, seo_keywords, seo_score, seo_score_notes, body_excerpt,
        forecast_impressions, forecast_clicks, forecast_cpc_rub, forecast_conversions, forecast_notes,
        hot_keywords, negative_keywords, ad_titles, ad_texts, notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13::jsonb,
        $14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,
        $26,$27,$28,$29,$30
      ) ON CONFLICT (event_slug) DO NOTHING`,
      [
        s.event_slug,
        s.event_title,
        s.venue,
        s.event_date,
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
        s.notes,
      ],
    );
    n += 1;
  }
  return { seeded: n };
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
      // Колонки SEO/даты на проде есть; локально могут отсутствовать — fallback без них.
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
        try {
          const { rows } = await ticketPool.query(
            `INSERT INTO ads_mediaplan_events (
              event_slug, event_title, venue, event_date, lp_url, status, priority,
              research_json, seo_title, seo_description, seo_h1, seo_keywords,
              seo_score, seo_score_notes, hot_keywords, negative_keywords, notes
            ) VALUES (
              $1,$2,$3,$4,$5,'planned',$6,
              $7::jsonb,$8,$9,$10,$11,
              $12,$13,$14,$15,$16
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
              c.wordstat.map((w) => w.phrase),
              COMMON_NEG,
              'Добавлено сканом. Проверьте минуса и бюджет вручную.',
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
    const { rows } = await ticketPool.query(
      `INSERT INTO ads_mediaplan_events (
        event_slug, event_title, venue, event_date, lp_url, status, priority, sort_order,
        daily_budget_rub, total_budget_rub, campaign_name, campaign_id, research_json,
        seo_title, seo_description, seo_h1, seo_keywords, seo_score, seo_score_notes, body_excerpt,
        forecast_impressions, forecast_clicks, forecast_cpc_rub, forecast_conversions, forecast_notes,
        hot_keywords, negative_keywords, ad_titles, ad_texts, notes
      ) VALUES (
        $1,$2,$3,$4,$5,COALESCE($6,'planned'),COALESCE($7,50),COALESCE($8,100),
        $9,$10,$11,$12,COALESCE($13::jsonb,'{}'::jsonb),
        $14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,
        COALESCE($26,'{}'),COALESCE($27,'{}'),COALESCE($28,'{}'),COALESCE($29,'{}'),$30
      )
      RETURNING *`,
      [
        String(b.event_slug).trim(),
        String(b.event_title).trim(),
        b.venue || null,
        b.event_date || null,
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
        b.hot_keywords || [],
        b.negative_keywords || [],
        b.ad_titles || [],
        b.ad_texts || [],
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
    const { rows } = await ticketPool.query(
      `UPDATE ads_mediaplan_events SET
        event_slug = COALESCE($2, event_slug),
        event_title = COALESCE($3, event_title),
        venue = COALESCE($4, venue),
        event_date = COALESCE($5, event_date),
        lp_url = COALESCE($6, lp_url),
        status = COALESCE($7, status),
        priority = COALESCE($8, priority),
        sort_order = COALESCE($9, sort_order),
        daily_budget_rub = COALESCE($10, daily_budget_rub),
        total_budget_rub = COALESCE($11, total_budget_rub),
        campaign_name = COALESCE($12, campaign_name),
        campaign_id = COALESCE($13, campaign_id),
        research_json = COALESCE($14::jsonb, research_json),
        seo_title = COALESCE($15, seo_title),
        seo_description = COALESCE($16, seo_description),
        seo_h1 = COALESCE($17, seo_h1),
        seo_keywords = COALESCE($18, seo_keywords),
        seo_score = $19,
        seo_score_notes = COALESCE($20, seo_score_notes),
        body_excerpt = COALESCE($21, body_excerpt),
        forecast_impressions = COALESCE($22, forecast_impressions),
        forecast_clicks = COALESCE($23, forecast_clicks),
        forecast_cpc_rub = COALESCE($24, forecast_cpc_rub),
        forecast_conversions = COALESCE($25, forecast_conversions),
        forecast_notes = COALESCE($26, forecast_notes),
        hot_keywords = COALESCE($27, hot_keywords),
        negative_keywords = COALESCE($28, negative_keywords),
        ad_titles = COALESCE($29, ad_titles),
        ad_texts = COALESCE($30, ad_texts),
        notes = COALESCE($31, notes),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        b.event_slug ?? null,
        b.event_title ?? null,
        b.venue ?? null,
        b.event_date ?? null,
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
        b.hot_keywords ?? null,
        b.negative_keywords ?? null,
        b.ad_titles ?? null,
        b.ad_texts ?? null,
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

export default router;
