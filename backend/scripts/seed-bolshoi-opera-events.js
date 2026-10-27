#!/usr/bin/env node
/**
 * События Большого театра (без GetBilet, предзаказ по секторам) — как футбольный матч.
 * Один спектакль = один repertoire id, несколько дат = несколько EventDateTime в офферах.
 * npm run seed:bolshoi-opera-events
 */
import ticketPool from '../ticketDb.js';
import {
  bolshoiSellableSeatsByRow,
  expandBolshoiOffersByRows,
  remapBolshoiSeatsToSellableLabels,
} from '../utils/bolshoiSellableSectors.js';

const HISTORICAL_STAGE_ID = process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';

/**
 * 8 продаваемых зон (лейблы = bolshoiSellableSectors.js). SeatList — страховка
 * на случай, если expand по схеме не прошёл; обычно его заменяют реальные места.
 */
const SECTORS = [
  { key: 'parter_mid',     label: 'Партер (середина)',                      seatList: ['1','2','3','4','5','6','7','8'], box: false },
  { key: 'beletazh_right', label: 'Бельэтаж правая (ложи 4–6)',             seatList: ['1','3','5'], box: false },
  { key: 'lozha1_right',   label: '1 ярус правая (ложи 5–8)',               seatList: ['1','3','5'], box: false },
  { key: 'balkon2_left',   label: 'Балкон 2 яруса левая',                   seatList: ['1','2','3','4','5','6','7','8'], box: false },
  { key: 'balkon3_left',   label: 'Балкон 3 яруса левая',                   seatList: ['1','2','3','4','5','6','7','8'], box: false },
  { key: 'beletazh_box',   label: 'Ложа бельэтажа (левая 4)',               seatList: ['1','2','3','4','5','6','7','8'], box: true },
  { key: 'lozha1_box',     label: 'Ложа 1 яруса (левая 9)',                 seatList: ['1','2','3','4','5','6','7','8'], box: true },
  { key: 'vip_parter',     label: 'Партер ряд А (Вип)',                     seatList: ['1','2','3','4','5','6','7','8'], box: false },
];

/**
 * Историческая сцена: один id на спектакль, sessions[] — даты/цены.
 * siblingIds — старые отдельные карточки (снимаем с публикации при сиде).
 */
const EVENTS = [
  {
    id: 'rigoletto-2026-10-13',
    siblingIds: ['rigoletto-2026-10-14', 'rigoletto-2026-10-15'],
    title: 'Риголетто',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '13–15 октября · 12+',
    poster: '/uploads/images/bolshoi-rigoletto-1792582486308.jpg',
    sessions: [
      { iso: '2026-10-13T12:00:00.000Z', label: 'пн 13 октября · 15:00 · 12+', prices: [60000, 50000, 40000, 30000, 25000, 500000, 400000, 150000] },
      { iso: '2026-10-14T16:00:00.000Z', label: 'вт 14 октября · 19:00 · 12+', prices: [75000, 65000, 55000, 45000, 30000, 600000, 450000, 170000] },
      { iso: '2026-10-15T16:00:00.000Z', label: 'ср 15 октября · 19:00 · 12+', prices: [75000, 65000, 55000, 45000, 30000, 600000, 450000, 170000] },
    ],
  },
  {
    id: 'karmen-2026-10-26',
    siblingIds: ['karmen-2026-10-27'],
    title: 'Кармен',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '26–27 октября · 19:00 · 12+',
    poster: '/uploads/images/bolshoi-carmen-1792582486308.jpg',
    sessions: [
      { iso: '2026-10-26T16:00:00.000Z', label: 'пн 26 октября · 19:00 · 12+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
      { iso: '2026-10-27T16:00:00.000Z', label: 'вт 27 октября · 19:00 · 12+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
    ],
  },
  {
    id: 'romeo-dzhuletta-2026-10-29',
    siblingIds: ['romeo-dzhuletta-2026-10-30', 'romeo-dzhuletta-2026-10-31'],
    title: 'Ромео и Джульетта',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '29–31 октября · 19:00 · 6+',
    genre: 'Балет',
    age: '6+',
    poster: '/uploads/images/bolshoi-romeo-1792582854626.jpg',
    sessions: [
      { iso: '2026-10-29T16:00:00.000Z', label: 'чт 29 октября · 19:00 · 6+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
      { iso: '2026-10-30T16:00:00.000Z', label: 'пт 30 октября · 19:00 · 6+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
      { iso: '2026-10-31T16:00:00.000Z', label: 'сб 31 октября · 19:00 · 6+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
    ],
  },
];

const NEW_STAGE_ID = process.env.BOLSHOI_NEW_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-new-stage';

/** Новая сцена: 1 продаваемый сектор — Партер (ряды 1–8 блоком). */
const NEW_SECTORS = [{ key: 'parter', label: 'Партер', seatList: ['1'], box: false }];

/** Кармен-сюита — одна карточка, 4 сеанса. */
const NEW_EVENTS = [
  {
    id: 'karmen-syuita-2026-10-16',
    siblingIds: ['karmen-syuita-2026-10-17-12', 'karmen-syuita-2026-10-17-19', 'karmen-syuita-2026-10-18'],
    title: 'Кармен-сюита. Дивертисмент',
    venue: 'Большой театр — Новая сцена',
    address: 'ул. Большая Дмитровка, 4/2, Москва',
    cardSubtitle: '16–18 октября · 12+',
    sessions: [
      { iso: '2026-10-16T16:00:00.000Z', label: 'чт 16 октября · 19:00 · 12+', prices: [65000] },
      { iso: '2026-10-17T09:00:00.000Z', label: 'пт 17 октября · 12:00 · 12+', prices: [65000] },
      { iso: '2026-10-17T16:00:00.000Z', label: 'пт 17 октября · 19:00 · 12+', prices: [65000] },
      { iso: '2026-10-18T11:00:00.000Z', label: 'сб 18 октября · 14:00 · 12+', prices: [65000] },
    ],
  },
];

function sessionsOf(ev) {
  if (Array.isArray(ev.sessions) && ev.sessions.length) return ev.sessions;
  return [{ iso: ev.iso, label: ev.cardSubtitle, prices: ev.prices }];
}

/** Развёрнутые тексты для description_pack / description_manual (по id события). */
const EVENT_COPY = {
  'romeo-dzhuletta-2026-10-29': {
    composer: 'Сергей Прокофьев',
    about: [
      'Балет Сергея Прокофьева по трагедии Шекспира — одна из визитных карточек Большого театра. История вражды Монтекки и Капулетти и любви Ромео и Джульетты звучит в полной партитуре на Исторической сцене.',
      'В программе — классическая хореография и оркестр Большого театра. Возрастной ценз 6+: подходит и для первого знакомства с балетом.',
    ],
    how: [
      'Билеты оформляются предзаказом по секторам зала: выберите зону на схеме и количество мест — номера мест подтвердим при отправке билетов.',
      'После оплаты электронный билет придёт на email. Даты: 29, 30 и 31 октября, начало в 19:00.',
    ],
  },
  'karmen-2026-10-26': {
    composer: 'Жорж Бизе',
    about: [
      'Опера Жоржа Бизе «Кармен» — история свободолюбивой цыганки, солдата Хосе и тореро Эскамильо. Одна из самых исполняемых опер мира в постановке Большого театра на Исторической сцене.',
      'В спектакле — оркестр, хор и солисты Большого. Возраст 12+.',
    ],
    how: [
      'Предзаказ по секторам: клик по зоне на схеме → количество билетов. Места в секторе закрепляет система после оплаты.',
      'Сеансы 26 и 27 октября, начало в 19:00. Электронный билет на email.',
    ],
  },
  'rigoletto-2026-10-13': {
    composer: 'Джузеппе Верди',
    about: [
      'Опера Верди «Риголетто» — драма шута при дворе герцога Мантуанского, дочери Джильды и проклятия Монтероне. Классика итальянского bel canto на Исторической сцене Большого театра.',
      'В постановке участвуют солисты, хор и оркестр Большого. Возраст 12+.',
    ],
    how: [
      'Оформление — предзаказ по секторам зала без выбора конкретного места на схеме.',
      'Даты 13–15 октября. Электронный билет после оплаты.',
    ],
  },
  'karmen-syuita-2026-10-16': {
    composer: 'Жорж Бизе / Родион Щедрин',
    about: [
      '«Кармен-сюита» — балет на музыку Бизе в оркестровке Родиона Щедрина, один из самых узнаваемых спектаклей Новой сцены Большого театра. В программе также дивертисмент.',
      'Компактный вечер для любителей современной балетной классики. Возраст 12+.',
    ],
    how: [
      'Предзаказ мест в партере Новой сцены: сектор → количество → оплата онлайн.',
      'Сеансы 16–18 октября (включая дневные). Электронный билет на email.',
    ],
  },
};

function buildCatalogPayload(ev, stageId, stageName, genre, age) {
  const sess = sessionsOf(ev);
  const firstIso = sess[0].iso;
  const copy = EVENT_COPY[ev.id];
  const lead = copy?.about?.[0]
    || `${genre} «${ev.title}» в ${stageName}. Предзаказ билетов по секторам (${ev.cardSubtitle}).`;
  return {
    Id: ev.id,
    RepertoireId: ev.id,
    Name: ev.title,
    ShortDescription: `${genre} «${ev.title}» · ${stageName}. ${ev.cardSubtitle}`,
    Description: lead,
    GenreName: genre,
    Age: age,
    stageId,
    StageName: stageName,
    PlaceName: ev.venue,
    PlaceAddress: ev.address,
    EventDateTime: firstIso,
    beginDateTime: firstIso,
  };
}

function buildDescriptionPack(ev, stageName, genre, age) {
  const copy = EVENT_COPY[ev.id] || {};
  const aboutParas = copy.about || [
    `${genre} «${ev.title}» в ${stageName}.`,
    'Предзаказ билетов осуществляется по секторам зала.',
  ];
  const howParas = copy.how || [
    'Выберите сектор на схеме и укажите количество билетов — места подберёт система.',
    'После оплаты электронный билет придёт на email.',
  ];
  const composer = copy.composer ? ` · ${copy.composer}` : '';
  return {
    heroKicker: `${genre} · Большой театр${composer}`,
    heroSubline: `${stageName} · ${ev.cardSubtitle}`,
    heroLead: aboutParas[0],
    eventMeta: [
      { label: 'Возраст', value: age },
      { label: 'Площадка', value: stageName },
      { label: 'Адрес', value: ev.address },
      ...(copy.composer ? [{ label: 'Музыка', value: copy.composer }] : []),
    ],
    sections: [
      {
        id: 'about',
        title: 'О событии',
        paragraphs: aboutParas,
      },
      {
        id: 'tickets',
        title: 'Как купить билеты',
        paragraphs: howParas,
      },
    ],
  };
}

function buildOffers(ev, sectors) {
  const out = [];
  for (const sess of sessionsOf(ev)) {
    const prices = sess.prices || ev.prices || [];
    const day = String(sess.iso || '').slice(0, 10);
    for (let i = 0; i < prices.length; i++) {
      const s = sectors[i];
      if (!s) continue;
      const price = prices[i];
      out.push({
        Id: `${ev.id}-${day}-${s.key}`,
        Sector: s.label,
        Row: '1',
        SeatList: s.seatList,
        NominalPrice: String(price),
        AgentPrice: String(price),
        EventDateTime: sess.iso,
      });
    }
  }
  return out;
}

async function unpublishSiblings(siblingIds) {
  if (!siblingIds?.length) return;
  await ticketPool.query(
    `UPDATE getbilet_events SET is_published = FALSE, updated_at = NOW()
     WHERE getbilet_external_id = ANY($1::text[])`,
    [siblingIds],
  );
  console.log(`[seed-bolshoi] unpublished siblings: ${siblingIds.join(', ')}`);
}

async function seedOne(ev, stageId, stageName, genre, age, sectors) {
  const catalog = buildCatalogPayload(ev, stageId, stageName, genre, age);
  const desc = buildDescriptionPack(ev, stageName, genre, age);
  const offersPayload = {
    Success: true,
    Method: 'GetOfferListByRepertoireId',
    ResultData: buildOffers(ev, sectors),
  };

  const poster = String(ev.poster || '').trim() || null;
  await ticketPool.query(
    `INSERT INTO getbilet_events (
       getbilet_external_id, title_manual, description_manual, description_pack_json,
       venue_manual, venue_address_manual, card_subtitle_manual, notes_internal,
       poster_url_manual, banner_url_manual,
       is_published, sort_order, updated_at
     ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$9,TRUE,$10,NOW())
     ON CONFLICT (getbilet_external_id) DO UPDATE SET
       title_manual=EXCLUDED.title_manual, description_manual=EXCLUDED.description_manual,
       description_pack_json=EXCLUDED.description_pack_json, venue_manual=EXCLUDED.venue_manual,
       venue_address_manual=EXCLUDED.venue_address_manual, card_subtitle_manual=EXCLUDED.card_subtitle_manual,
       notes_internal=EXCLUDED.notes_internal,
       poster_url_manual=COALESCE(EXCLUDED.poster_url_manual, getbilet_events.poster_url_manual),
       banner_url_manual=COALESCE(EXCLUDED.banner_url_manual, getbilet_events.banner_url_manual),
       is_published=TRUE, sort_order=EXCLUDED.sort_order, updated_at=NOW()`,
    [
      ev.id,
      ev.title,
      catalog.Description,
      JSON.stringify(desc),
      ev.venue,
      ev.address,
      ev.cardSubtitle,
      'OFFERS_CACHE_ONLY · ручное событие Большого (предзаказ по секторам, без GetBilet).',
      poster,
      -400,
    ],
  );

  await ticketPool.query(
    `INSERT INTO getbilet_catalog_cache (repertoire_external_id, stage_id, payload_json, synced_at)
     VALUES ($1,$2,$3::jsonb,NOW())
     ON CONFLICT (repertoire_external_id) DO UPDATE SET stage_id=EXCLUDED.stage_id, payload_json=EXCLUDED.payload_json, synced_at=NOW()`,
    [ev.id, stageId, JSON.stringify(catalog)],
  );

  await ticketPool.query(
    `INSERT INTO getbilet_repertoire_offers_cache (repertoire_external_id, payload_json, fetched_at)
     VALUES ($1,$2::jsonb,NOW())
     ON CONFLICT (repertoire_external_id) DO UPDATE SET payload_json=EXCLUDED.payload_json, fetched_at=NOW()`,
    [ev.id, JSON.stringify(offersPayload)],
  );

  await unpublishSiblings(ev.siblingIds || []);

  const nSess = sessionsOf(ev).length;
  console.log(`[seed-bolshoi] ${ev.id} · ${ev.cardSubtitle} · sessions=${nSess} · offers=${offersPayload.ResultData.length}`);
}

/** Expand по рядам, сохраняя EventDateTime (отдельный expand на каждый сеанс). */
async function expandHistoricalOffersFromStageMap() {
  const map = await ticketPool.query(
    `SELECT layout_json->'seats' AS seats FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [HISTORICAL_STAGE_ID],
  );
  const seats = map.rows[0]?.seats;
  if (!Array.isArray(seats) || seats.length < 50) {
    console.warn('[seed-bolshoi] нет seats в stage map — офферы без expand по рядам');
    return;
  }
  /** Сырые sector из редактора («Партер», «Бельэтаж Правая…») → sellable labels. */
  const remapped = remapBolshoiSeatsToSellableLabels(seats);
  const byLabel = bolshoiSellableSeatsByRow(remapped);
  let sellableHits = 0;
  for (const byRow of byLabel.values()) {
    for (const list of byRow.values()) sellableHits += list.length;
  }
  console.log(`[seed-bolshoi] remap seats ${seats.length} → sellable seat-slots ${sellableHits}`);
  if (sellableHits < 10) {
    console.warn(
      '[seed-bolshoi] мало sellable после remap (часто из‑за mangled sector names в editor) — оставляем базовые SeatList из SECTORS',
    );
    return;
  }
  const onlyRaw = String(process.env.ONLY_EVENT_IDS || '').trim();
  const only = onlyRaw
    ? new Set(onlyRaw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))
    : null;
  const ids = EVENTS.map((e) => e.id).filter((id) => !only || only.has(id));
  for (const id of ids) {
    const r = await ticketPool.query(
      `SELECT payload_json FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`,
      [id],
    );
    const payload = r.rows[0]?.payload_json;
    if (!payload?.ResultData) continue;
    const base = payload.ResultData;
    /** Схлопнуть предыдущий expand: 1 оффер на сектор+дату. */
    const uniq = [];
    const seen = new Set();
    for (const off of base) {
      const key = `${off.Sector || ''}|${off.EventDateTime || ''}`;
      if (!off.Sector || seen.has(key)) continue;
      seen.add(key);
      uniq.push(off);
    }
    const byDt = new Map();
    for (const off of uniq) {
      const k = off.EventDateTime || '_';
      if (!byDt.has(k)) byDt.set(k, []);
      byDt.get(k).push(off);
    }
    const next = [];
    for (const [dt, offs] of byDt) {
      const day = String(dt).slice(0, 10);
      next.push(...expandBolshoiOffersByRows(offs, byLabel, `${id}-${day}`));
    }
    payload.ResultData = next.length ? next : uniq;
    await ticketPool.query(
      `UPDATE getbilet_repertoire_offers_cache SET payload_json = $1::jsonb, fetched_at = NOW()
       WHERE repertoire_external_id = $2`,
      [JSON.stringify(payload), id],
    );
    console.log(`[seed-bolshoi] expand offers ${id} → ${payload.ResultData.length}`);
  }
}

async function main() {
  const onlyRaw = String(process.env.ONLY_EVENT_IDS || '').trim();
  const only = onlyRaw
    ? new Set(onlyRaw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))
    : null;
  const allow = (id) => !only || only.has(id);

  for (const ev of EVENTS) {
    if (!allow(ev.id)) continue;
    await seedOne(
      ev,
      HISTORICAL_STAGE_ID,
      'Большой театр — Историческая сцена',
      ev.genre || 'Опера',
      ev.age || '12+',
      SECTORS,
    );
  }
  for (const ev of NEW_EVENTS) {
    if (!allow(ev.id)) continue;
    await seedOne(
      ev,
      NEW_STAGE_ID,
      'Большой театр — Новая сцена',
      ev.genre || 'Балет',
      ev.age || '12+',
      NEW_SECTORS,
    );
  }
  await expandHistoricalOffersFromStageMap();

  try {
    const { notifySearchIndexing, publicUrl } = await import('../lib/search-indexing.js');
    const ids = [...EVENTS, ...NEW_EVENTS].map((e) => e.id).filter((id) => !only || only.has(id));
    const urls = ids.flatMap((id) => [
      publicUrl(`/ticket/${encodeURIComponent(id)}`),
    ]);
    urls.push(publicUrl('/events'));
    await notifySearchIndexing(urls);
    console.log(`[seed-bolshoi] IndexNow pinged ${urls.length} url(s)`);
  } catch (e) {
    console.warn('[seed-bolshoi] IndexNow skip:', e?.message || e);
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
