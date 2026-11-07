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
        'Современный взгляд на Чехова без музейной пыли. Посохов держит пластику очень плотно, Демутский в оркестре — отдельный кайф. Партер Новой сцены даёт ощущение, что ты внутри конфликта, а не в «зале-амфитеатре».',
    },
    {
      author: 'Алексей',
      stars: 4,
      reviewed_on: '2026-07-20',
      body:
        'Сильная драматургия и свет. Единственное, что сбивало — отдельные режиссёрские акценты (животные на сцене), но общий уровень труппы и музыки выше ожиданий. На 16+ согласен полностью.',
    },
    {
      author: 'Ирина В.',
      stars: 5,
      reviewed_on: '2026-08-02',
      body:
        'Брала билеты именно на балет Большого, не путать с драмой. Дуэты Треплева — самое сильное, что видела в сезоне. После антракта зал сидел тише обычного — редкость.',
    },
    {
      author: 'Дмитрий',
      stars: 4,
      reviewed_on: '2026-08-11',
      body:
        'Не «лёгкий» вечер: тема театра о театре тяжёлая, но честная. Если ищете чистую классику Петипа — это другое. Если современный Большой — попадание.',
    },
  ],
  'chipollino-2026-11-06': [
    {
      author: 'Ольга с детьми',
      stars: 5,
      reviewed_on: '2026-03-12',
      body:
        'Дети 7 и 9 лет смотрели не отрываясь. Яркие костюмы, понятный сюжет, живой оркестр. Важно: это Новая сцена Большого, не кремлёвский прокат — путаница в поиске бывает.',
    },
    {
      author: 'Сергей',
      stars: 5,
      reviewed_on: '2026-04-01',
      body:
        'Классика Хачатуряна без сюсюканья. Клоунада дозирована, танцы настоящие. Партер — идеально для первого балета ребёнка.',
    },
    {
      author: 'Анна',
      stars: 4,
      reviewed_on: '2026-05-18',
      body:
        'Весёлый и ритмичный спектакль. Чуть затянуты массовые сцены, но финал вытягивает. Возраст 6+ — адекватно.',
    },
  ],
  'evgeniy-onegin-2026-11-26': [
    {
      author: 'Елена',
      stars: 5,
      reviewed_on: '2026-02-10',
      body:
        'Лирические сцены на Новой сцене звучат камернее Исторической — письмо Татьяны просто пробирает. Брали партер, оркестр слышен идеально.',
    },
    {
      author: 'Павел',
      stars: 4,
      reviewed_on: '2026-02-22',
      body:
        'Это опера Большого, не драма Вахтангова с тем же названием — уточняйте перед покупкой. Вокал ровный, хор мощный, дуэль Ленского — кульминация.',
    },
    {
      author: 'Наталья',
      stars: 5,
      reviewed_on: '2026-03-05',
      body:
        'Дневной сеанс удобен, если не любите поздний выход. Постановка классическая, без эпатажа — именно этого и ждала.',
    },
  ],
  'koppelia-2026-11-22': [
    {
      author: 'Виктория',
      stars: 5,
      reviewed_on: '2026-01-20',
      body:
        'Лёгкая комедия Делиба, вальс и мазурка — узнаваемые с первых тактов. Хороший семейный вечер без тяжёлой драмы.',
    },
    {
      author: 'Игорь',
      stars: 4,
      reviewed_on: '2026-01-28',
      body:
        'Полный спектакль, а не «вариация из Коппелии» с ютуба. Кордебалет собранный, кукольная линия забавная.',
    },
  ],
  'bayaderka-2026-11-13': [
    {
      author: 'Светлана',
      stars: 5,
      reviewed_on: '2025-12-03',
      body:
        'Царство теней — ради этого и едут. Белый акт на Исторической сцене выглядит монументально. Партер или бельэтаж — лучший ракурс.',
    },
    {
      author: 'Артём',
      stars: 4,
      reviewed_on: '2025-12-15',
      body:
        'Классика Петипа/Григоровича без сюрпризов: Никия, Солор, тени. Длинный вечер, но уровень труппы оправдывает.',
    },
    {
      author: 'Юлия',
      stars: 5,
      reviewed_on: '2026-01-09',
      body:
        'Брала Большой, не Мариинку — отличается подача. Оркестр и кордебалет на высоте.',
    },
  ],
  'ivan-grozny-2026-11-11': [
    {
      author: 'Кирилл',
      stars: 5,
      reviewed_on: '2025-11-20',
      body:
        'Григорович + Прокофьев — жёсткая драма, не «детский балет». Декорации Вирсаладзе и энергия зала Исторической сцены.',
    },
    {
      author: 'Мария',
      stars: 4,
      reviewed_on: '2025-11-28',
      body:
        'Мощно и мрачновато. Дневной сеанс дешевле при том же зале — удобный лайфхак.',
    },
  ],
  'turandot-2026-11-20': [
    {
      author: 'Андрей',
      stars: 5,
      reviewed_on: '2026-01-12',
      body:
        'Nessun dorma и хор — ради этого и стоит идти на Историческую. Зрелищно, громко, по-итальянски.',
    },
    {
      author: 'Оксана',
      stars: 4,
      reviewed_on: '2026-01-19',
      body:
        'Не путать с драматической «принцессой Турандот». Здесь полноценная опера Пуччини Большого.',
    },
  ],
  'doch-faraona-2026-11-28': [
    {
      author: 'Галина',
      stars: 5,
      reviewed_on: '2025-10-08',
      body:
        'Египетская сказка XIX века в полном формате. Много кордебалета и декораций — «гранд» в хорошем смысле.',
    },
    {
      author: 'Роман',
      stars: 5,
      reviewed_on: '2025-10-14',
      body:
        'Не учебная вариация «Невы», а целый спектакль. Длинно, но зрелищно — ради этого и едут.',
    },
    {
      author: 'Кира',
      stars: 4,
      reviewed_on: '2025-10-20',
      body:
        'Классика Петипа на Исторической: масштаб, костюмы, оркестр. Вечер плотный — берите удобные места.',
    },
  ],
  'petrushka-shekherazada-zhar-ptica-2026-11-24': [
    {
      author: 'Татьяна',
      stars: 5,
      reviewed_on: '2025-09-30',
      body:
        'Три партитуры «Русских сезонов» за один вечер — редкий формат. Стравинский вживую бьёт любую запись.',
    },
    {
      author: 'Никита',
      stars: 5,
      reviewed_on: '2025-10-05',
      body:
        'Петрушка + Жар-птица + Шехеразада без пауз между «концертными номерами» — полноценный балетный триптих.',
    },
    {
      author: 'Лена',
      stars: 4,
      reviewed_on: '2025-10-12',
      body:
        'Сильный вечер для тех, кто любит раннего Стравинского. Три акта — разный характер, общий уровень высокий.',
    },
  ],
  'karmen-syuita-2026-10-16': [
    {
      author: 'Евгения',
      stars: 5,
      reviewed_on: '2025-08-21',
      body:
        'Щедрин/Бизе на Новой сцене — компактно и узнаваемо. Дивертисмент не размывает, а дополняет.',
    },
    {
      author: 'Владимир',
      stars: 4,
      reviewed_on: '2025-09-02',
      body:
        'Если не готовы к полной опере «Кармен» — сюита отличный вход. Партер даёт близкий ракурс.',
    },
    {
      author: 'Алла',
      stars: 5,
      reviewed_on: '2025-09-10',
      body:
        'Драйв и узнаваемые темы с первых тактов. Хороший формат на вечер без «марафона» полной оперы.',
    },
  ],
  '6a572bce46a4d000309ed0d0': [
    {
      author: 'Настя',
      stars: 5,
      reviewed_on: '2026-05-12',
      body:
        'Детский спектакль без сюсюканья: смешно взрослым и понятно ребёнку. Зал живой, финал хлопали стоя.',
    },
    {
      author: 'Игорь с сыном',
      stars: 5,
      reviewed_on: '2026-05-20',
      body:
        'Брали дневной сеанс — идеально. Декорации яркие, актёры держат внимание весь час с лишним.',
    },
    {
      author: 'Марина',
      stars: 4,
      reviewed_on: '2026-06-03',
      body:
        'Сильный семейный формат. Чуть шумно в партере с малышами, но само шоу — огонь.',
    },
  ],
  '6acb3dc6e7a769003011e9b8': [
    {
      author: 'Ольга',
      stars: 5,
      reviewed_on: '2026-04-08',
      body:
        'Хиты Челентано вживую — именно то, за чем шли. Оркестр и вокал без фонограммы, зал пел хором.',
    },
    {
      author: 'Денис',
      stars: 4,
      reviewed_on: '2026-04-16',
      body:
        'Ностальгия на максимум. Не концерт-клон «один в один», а своя подача — и это плюс.',
    },
    {
      author: 'Света',
      stars: 5,
      reviewed_on: '2026-04-22',
      body:
        'Брала места ближе к сцене — эмоции другие. Если любите итальянскую эстраду 60–70-х, не пожалеете.',
    },
  ],
  'kabala-svyatosh': [
    {
      author: 'Алёна',
      stars: 5,
      reviewed_on: '2026-06-01',
      body:
        'МХТ держит напряжение до конца. Мольер у них живой, не школьный. Места ближе к сцене — однозначно.',
    },
    {
      author: 'Георгий',
      stars: 4,
      reviewed_on: '2026-06-12',
      body:
        'Плотная актёрская работа, без воды. Для любителей классической драмы — must.',
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
