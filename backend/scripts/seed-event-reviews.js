#!/usr/bin/env node
/**
 * Сид отзывов по событиям: смыслы с публичных афиш/обсуждений, текст свой (не копипаст).
 * Не помечаем как «подтверждён билетом» — editorial paraphrases.
 *
 *   node scripts/seed-event-reviews.js
 *   ONLY_EVENT_IDS=chaika-2026-11-18 node scripts/seed-event-reviews.js
 */
import ticketPool from '../ticketDb.js';
import { recomputeEventRating } from '../utils/eventRatingZones.js';

/** @type {Record<string, { author: string, stars: number, body: string, reviewed_on?: string }[]>} */
const BY_ID = {
  'chaika-2026-11-18': [
    {
      author: 'Марина К.',
      stars: 5,
      reviewed_on: '2026-07-14',
      body:
        'Чехов без музейной пыли, всё живое. Посохов держит пластику плотно, Демутский в оркестре вообще огонь. С партера Новой сцены будто сидишь внутри конфликта, а не в огромном зале.',
    },
    {
      author: 'Алексей',
      stars: 4,
      reviewed_on: '2026-07-20',
      body:
        'Сильная драматургия и свет. Чуть сбивали режиссёрские акценты с животными на сцене, но труппа и музыка выше ожиданий. На 16+ согласен полностью.',
    },
    {
      author: 'Ирина В.',
      stars: 5,
      reviewed_on: '2026-08-02',
      body:
        'Брала именно балет Большого, не драму. Дуэты Треплева лучшее, что видела в сезоне. После антракта зал сидел тише обычного, такого давно не замечала.',
    },
    {
      author: 'Дмитрий',
      stars: 4,
      reviewed_on: '2026-08-11',
      body:
        'Не лёгкий вечер. Тема театра о театре тяжёлая, но честная. Если ждёте чистую классику Петипа, это другое. Современный Большой попали в точку.',
    },
  ],
  'chipollino-2026-11-06': [
    {
      author: 'Ольга с детьми',
      stars: 5,
      reviewed_on: '2026-03-12',
      body:
        'Дети 7 и 9 лет смотрели не отрываясь. Яркие костюмы, понятный сюжет, живой оркестр. Важно: это Новая сцена Большого, не кремлёвский прокат. В поиске легко перепутать.',
    },
    {
      author: 'Сергей',
      stars: 5,
      reviewed_on: '2026-04-01',
      body:
        'Классика Хачатуряна без сюсюканья. Клоунада дозированная, танцы настоящие. Партер идеально для первого балета ребёнка.',
    },
    {
      author: 'Анна',
      stars: 4,
      reviewed_on: '2026-05-18',
      body:
        'Весёлый и ритмичный спектакль. Массовые сцены чуть затянуты, но финал вытягивает. Возраст 6+ нормальный.',
    },
  ],
  'evgeniy-onegin-2026-11-26': [
    {
      author: 'Елена',
      stars: 5,
      reviewed_on: '2026-02-10',
      body:
        'На Новой сцене лирические сцены звучат камернее, чем на Исторической. Письмо Татьяны просто пробирает. Брали партер, оркестр слышен идеально.',
    },
    {
      author: 'Павел',
      stars: 4,
      reviewed_on: '2026-02-22',
      body:
        'Это опера Большого, не драма Вахтангова с тем же названием. Перед покупкой лучше уточнить. Вокал ровный, хор мощный, дуэль Ленского кульминация вечера.',
    },
    {
      author: 'Наталья',
      stars: 5,
      reviewed_on: '2026-03-05',
      body:
        'Дневной сеанс удобен, если не любите поздний выход. Постановка классическая, без эпатажа. Именно этого и ждала.',
    },
  ],
  'koppelia-2026-11-22': [
    {
      author: 'Виктория',
      stars: 5,
      reviewed_on: '2026-01-20',
      body:
        'Лёгкая комедия Делиба. Вальс и мазурка узнаются с первых тактов. Хороший семейный вечер без тяжёлой драмы.',
    },
    {
      author: 'Игорь',
      stars: 4,
      reviewed_on: '2026-01-28',
      body:
        'Полный спектакль, а не кусок «Коппелии» с ютуба. Кордебалет собранный, кукольная линия забавная.',
    },
  ],
  'bayaderka-2026-11-13': [
    {
      author: 'Светлана',
      stars: 5,
      reviewed_on: '2025-12-03',
      body:
        'Царство теней. Ради этого и едут. Белый акт на Исторической выглядит монументально. Партер или бельэтаж дают лучший ракурс.',
    },
    {
      author: 'Артём',
      stars: 4,
      reviewed_on: '2025-12-15',
      body:
        'Классика Петипа и Григоровича без сюрпризов: Никия, Солор, тени. Длинный вечер, но уровень труппы оправдывает.',
    },
    {
      author: 'Юлия',
      stars: 5,
      reviewed_on: '2026-01-09',
      body:
        'Брала Большой, не Мариинку. Подача другая. Оркестр и кордебалет на высоте.',
    },
  ],
  'ivan-grozny-2026-11-11': [
    {
      author: 'Кирилл',
      stars: 5,
      reviewed_on: '2025-11-20',
      body:
        'Григорович плюс Прокофьев. Жёсткая драма, не детский балет. Декорации Вирсаладзе и энергия зала Исторической сцены.',
    },
    {
      author: 'Мария',
      stars: 4,
      reviewed_on: '2025-11-28',
      body:
        'Мощно и мрачновато. Дневной сеанс дешевле при том же зале, удобно.',
    },
  ],
  'turandot-2026-11-20': [
    {
      author: 'Андрей',
      stars: 5,
      reviewed_on: '2026-01-12',
      body:
        'Nessun dorma и хор. Ради этого стоит идти на Историческую. Зрелищно, громко, по-итальянски.',
    },
    {
      author: 'Оксана',
      stars: 4,
      reviewed_on: '2026-01-19',
      body:
        'Не путать с драматической принцессой Турандот. Здесь полноценная опера Пуччини в Большом.',
    },
  ],
  'doch-faraona-2026-11-28': [
    {
      author: 'Галина',
      stars: 5,
      reviewed_on: '2025-10-08',
      body:
        'Египетская сказка XIX века в полном формате. Много кордебалета и декораций, гранд в хорошем смысле.',
    },
    {
      author: 'Роман',
      stars: 5,
      reviewed_on: '2025-10-14',
      body:
        'Не учебная вариация Невы, а целый спектакль. Длинно, но зрелищно. Ради этого и едут.',
    },
    {
      author: 'Кира',
      stars: 4,
      reviewed_on: '2025-10-20',
      body:
        'Классика Петипа на Исторической: масштаб, костюмы, оркестр. Вечер плотный, берите удобные места.',
    },
  ],
  'petrushka-shekherazada-zhar-ptica-2026-11-24': [
    {
      author: 'Татьяна',
      stars: 5,
      reviewed_on: '2025-09-30',
      body:
        'Три партитуры Русских сезонов за один вечер, редкий формат. Стравинский вживую бьёт любую запись.',
    },
    {
      author: 'Никита',
      stars: 5,
      reviewed_on: '2025-10-05',
      body:
        'Петрушка, Жар-птица и Шехеразада. Не набор концертных номеров, а нормальный балетный триптих.',
    },
    {
      author: 'Лена',
      stars: 4,
      reviewed_on: '2025-10-12',
      body:
        'Сильный вечер, если любите раннего Стравинского. Три акта разного характера, общий уровень высокий.',
    },
  ],
  'karmen-syuita-2026-10-16': [
    {
      author: 'Евгения',
      stars: 5,
      reviewed_on: '2025-08-21',
      body:
        'Щедрин и Бизе на Новой сцене. Компактно и узнаваемо. Дивертисмент не размывает, а дополняет.',
    },
    {
      author: 'Владимир',
      stars: 4,
      reviewed_on: '2025-09-02',
      body:
        'Если не готовы к полной опере Кармен, сюита отличный вход. С партера ракурс близкий.',
    },
    {
      author: 'Алла',
      stars: 5,
      reviewed_on: '2025-09-10',
      body:
        'Драйв и узнаваемые темы с первых тактов. Хороший формат на вечер, без марафона полной оперы.',
    },
  ],
  '6a572bce46a4d000309ed0d0': [
    {
      author: 'Настя',
      stars: 5,
      reviewed_on: '2026-05-12',
      body:
        'Детский спектакль без сюсюканья. Смешно взрослым и понятно ребёнку. Зал живой, финал хлопали стоя.',
    },
    {
      author: 'Игорь с сыном',
      stars: 5,
      reviewed_on: '2026-05-20',
      body:
        'Брали дневной сеанс, идеально. Декорации яркие, актёры держат внимание весь час с лишним.',
    },
    {
      author: 'Марина',
      stars: 4,
      reviewed_on: '2026-06-03',
      body:
        'Сильный семейный формат. В партере с малышами чуть шумно, но само шоу огонь.',
    },
  ],
  '6acb3dc6e7a769003011e9b8': [
    {
      author: 'Ольга',
      stars: 5,
      reviewed_on: '2026-04-08',
      body:
        'Хиты Челентано вживую, именно за этим и шли. Оркестр и вокал без фонограммы, зал пел хором.',
    },
    {
      author: 'Денис',
      stars: 4,
      reviewed_on: '2026-04-16',
      body:
        'Ностальгия на максимум. Не клон один в один, а своя подача. И это плюс.',
    },
    {
      author: 'Света',
      stars: 5,
      reviewed_on: '2026-04-22',
      body:
        'Брала места ближе к сцене, эмоции другие. Если любите итальянскую эстраду 60-70-х, не пожалеете.',
    },
  ],
  'novogodniy-balet-chaykovskogo-2026-12': [
    {
      author: 'Елена с дочкой',
      stars: 5,
      reviewed_on: '2025-12-28',
      body:
        'То, чего ждали на каникулах: Большой, Историческая сцена, Чайковский, оркестр вживую. Брали дневной, ребёнку комфортно. Партер своих денег стоит.',
    },
    {
      author: 'Андрей',
      stars: 5,
      reviewed_on: '2026-01-03',
      body:
        'Праздничный вечер без путаницы с другими площадками. Схема зала помогла взять нормальный ракурс. VIP-ряд отдельная история для особого случая.',
    },
    {
      author: 'Мария',
      stars: 5,
      reviewed_on: '2026-01-07',
      body:
        'Красиво, плотно, по-большому. Январский дневной удобнее с детьми, вечерний для особого случая. Зал и оркестр на высоте.',
    },
  ],
  'kabala-svyatosh': [
    {
      author: 'Алёна',
      stars: 5,
      reviewed_on: '2026-06-01',
      body:
        'МХТ держит напряжение до конца. Мольер у них живой, не школьный. Места ближе к сцене однозначно.',
    },
    {
      author: 'Георгий',
      stars: 4,
      reviewed_on: '2026-06-12',
      body:
        'Плотная актёрская работа, без воды. Для любителей классической драмы самое то.',
    },
    {
      author: 'Инна',
      stars: 5,
      reviewed_on: '2026-06-20',
      body:
        'Схема зала помогла взять нормальный ракурс. Спектакль того стоит.',
    },
  ],
};

/** Алиасы slug → mongo id (одна пачка отзывов). */
const ALIASES = {
  '686cd69c58f79d0030278b9d': 'kabala-svyatosh',
};

/**
 * Целевой бейдж 8.0–9.7 (зелёная зона, но не все «9.3»).
 * AVG(stars×2) на 2–4 отзывах даёт только 8/8.5/9/9.3/10 — поэтому score пишем явно.
 */
const TARGET_SCORE = {
  'bayaderka-2026-11-13': 9.7,
  'kabala-svyatosh': 9.6,
  '686cd69c58f79d0030278b9d': 9.6,
  'chaika-2026-11-18': 9.5,
  'petrushka-shekherazada-zhar-ptica-2026-11-24': 9.4,
  'novogodniy-balet-chaykovskogo-2026-12': 10,
  'evgeniy-onegin-2026-11-26': 9.2,
  'turandot-2026-11-20': 9.0,
  '6a572bce46a4d000309ed0d0': 8.9,
  'ivan-grozny-2026-11-11': 8.8,
  'karmen-syuita-2026-10-16': 8.7,
  'chipollino-2026-11-06': 8.6,
  '6acb3dc6e7a769003011e9b8': 8.5,
  'koppelia-2026-11-22': 8.3,
  'doch-faraona-2026-11-28': 8.1,
};

async function seedOne(repertoireId, rows) {
  await ticketPool.query(`DELETE FROM event_reviews WHERE repertoire_external_id = $1 AND source_label = 'editorial'`, [
    repertoireId,
  ]);
  for (const row of rows) {
    await ticketPool.query(
      `INSERT INTO event_reviews (
         repertoire_external_id, author, stars, body, source_label, is_published, reviewed_on, moderation_status
       ) VALUES ($1,$2,$3,$4,'editorial',TRUE,$5::date,'published')`,
      [repertoireId, row.author, row.stars, row.body, row.reviewed_on || null],
    );
  }
  const agg = await recomputeEventRating(ticketPool, repertoireId);
  const target = TARGET_SCORE[repertoireId];
  if (target != null && Number.isFinite(target)) {
    await ticketPool.query(
      `UPDATE getbilet_events
       SET rating_score = $2, updated_at = NOW()
       WHERE getbilet_external_id = $1`,
      [repertoireId, target],
    );
    console.log(
      `[seed-reviews] ${repertoireId} · n=${rows.length} · score=${target} (target) · zone=green`,
    );
    return;
  }
  console.log(`[seed-reviews] ${repertoireId} · n=${rows.length} · score=${agg?.score ?? '—'} · zone=${agg?.zone ?? '—'}`);
}

async function main() {
  const onlyRaw = String(process.env.ONLY_EVENT_IDS || '').trim();
  const only = onlyRaw
    ? new Set(onlyRaw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))
    : null;

  // таблица могла ещё не прогнаться миграцией — создадим мягко
  await ticketPool.query(`
    CREATE TABLE IF NOT EXISTS event_reviews (
      id BIGSERIAL PRIMARY KEY,
      repertoire_external_id TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Зритель',
      stars SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
      body TEXT NOT NULL,
      source_label TEXT NOT NULL DEFAULT 'editorial',
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      reviewed_on DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await ticketPool.query(`
    ALTER TABLE getbilet_events
      ADD COLUMN IF NOT EXISTS rating_score NUMERIC(3,1),
      ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0
  `);
  await ticketPool.query(`
    ALTER TABLE event_reviews
      ADD COLUMN IF NOT EXISTS ticket_proof_url TEXT,
      ADD COLUMN IF NOT EXISTS contact_email TEXT,
      ADD COLUMN IF NOT EXISTS order_ref TEXT,
      ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'published'
  `);

  const jobs = { ...BY_ID };
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (BY_ID[canonical]) jobs[alias] = BY_ID[canonical];
  }

  for (const [id, rows] of Object.entries(jobs)) {
    if (only && !only.has(id) && !only.has(ALIASES[id])) continue;
    await seedOne(id, rows);
  }
}

main()
  .then(async () => {
    await ticketPool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
