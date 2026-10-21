#!/usr/bin/env node
/**
 * События Большого театра (без GetBilet, предзаказ по секторам) — как футбольный матч.
 * npm run seed:bolshoi-opera-events
 */
import ticketPool from '../ticketDb.js';
import {
  bolshoiSellableSeatsByRow,
  expandBolshoiOffersByRows,
} from '../utils/bolshoiSellableSectors.js';

const HISTORICAL_STAGE_ID = process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';

/** 8 продаваемых зон (лейблы = bolshoiSellableSectors.js). */
const SECTORS = [
  { key: 'parter_mid',     label: 'Партер (середина)',                      seatList: ['1'], box: false },
  { key: 'beletazh_right', label: 'Бельэтаж правая (ложи 4–6)',             seatList: ['1'], box: false },
  { key: 'lozha1_right',   label: '1 ярус правая (ложи 5–8)',               seatList: ['1'], box: false },
  { key: 'balkon2_left',   label: 'Балкон 2 яруса левая',                   seatList: ['1'], box: false },
  { key: 'balkon3_left',   label: 'Балкон 3 яруса левая',                   seatList: ['1'], box: false },
  { key: 'beletazh_box',   label: 'Ложа бельэтажа целиком (левая 4)',       seatList: ['1','2','3','4','5','6','7','8'], box: true },
  { key: 'lozha1_box',     label: 'Ложа 1 яруса целиком (левая 9)',         seatList: ['1','2','3','4','5','6'], box: true },
  { key: 'vip_parter',     label: 'Партер ряд А (Вип)',                     seatList: ['1'], box: false },
];

/** Цены в рублях (8 категорий, порядок SECTORS). */
const EVENTS = [
  { id: 'rigoletto-2026-10-13', title: 'Риголетто', venue: 'Большой театр — Историческая сцена', address: 'Театральная пл., 1, Москва', iso: '2026-10-13T12:00:00.000Z', cardSubtitle: 'пн 13 октября · 15:00 · 12+', poster: '/uploads/images/bolshoi-rigoletto-1792582486308.jpg', prices: [60000, 50000, 40000, 30000, 25000, 500000, 400000, 150000] },
  { id: 'rigoletto-2026-10-14', title: 'Риголетто', venue: 'Большой театр — Историческая сцена', address: 'Театральная пл., 1, Москва', iso: '2026-10-14T16:00:00.000Z', cardSubtitle: 'вт 14 октября · 19:00 · 12+', poster: '/uploads/images/bolshoi-rigoletto-1792582486308.jpg', prices: [75000, 65000, 55000, 45000, 30000, 600000, 450000, 170000] },
  { id: 'rigoletto-2026-10-15', title: 'Риголетто', venue: 'Большой театр — Историческая сцена', address: 'Театральная пл., 1, Москва', iso: '2026-10-15T16:00:00.000Z', cardSubtitle: 'ср 15 октября · 19:00 · 12+', poster: '/uploads/images/bolshoi-rigoletto-1792582486308.jpg', prices: [75000, 65000, 55000, 45000, 30000, 600000, 450000, 170000] },
  { id: 'karmen-2026-10-26', title: 'Кармен', venue: 'Большой театр — Историческая сцена', address: 'Театральная пл., 1, Москва', iso: '2026-10-26T16:00:00.000Z', cardSubtitle: 'пн 26 октября · 19:00 · 12+', poster: '/uploads/images/bolshoi-carmen-1792582486308.jpg', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
  { id: 'karmen-2026-10-27', title: 'Кармен', venue: 'Большой театр — Историческая сцена', address: 'Театральная пл., 1, Москва', iso: '2026-10-27T16:00:00.000Z', cardSubtitle: 'вт 27 октября · 19:00 · 12+', poster: '/uploads/images/bolshoi-carmen-1792582486308.jpg', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
  /** Балет; цены как у Кармен (премиум Историческая), пока нет отдельного прайса. */
  { id: 'romeo-dzhuletta-2026-10-29', title: 'Ромео и Джульетта', venue: 'Большой театр — Историческая сцена', address: 'Театральная пл., 1, Москва', iso: '2026-10-29T16:00:00.000Z', cardSubtitle: 'чт 29 октября · 19:00 · 6+', genre: 'Балет', age: '6+', poster: '/uploads/images/bolshoi-romeo-1792582486308.jpg', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
  { id: 'romeo-dzhuletta-2026-10-30', title: 'Ромео и Джульетта', venue: 'Большой театр — Историческая сцена', address: 'Театральная пл., 1, Москва', iso: '2026-10-30T16:00:00.000Z', cardSubtitle: 'пт 30 октября · 19:00 · 6+', genre: 'Балет', age: '6+', poster: '/uploads/images/bolshoi-romeo-1792582486308.jpg', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
  { id: 'romeo-dzhuletta-2026-10-31', title: 'Ромео и Джульетта', venue: 'Большой театр — Историческая сцена', address: 'Театральная пл., 1, Москва', iso: '2026-10-31T16:00:00.000Z', cardSubtitle: 'сб 31 октября · 19:00 · 6+', genre: 'Балет', age: '6+', poster: '/uploads/images/bolshoi-romeo-1792582486308.jpg', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
];

const NEW_STAGE_ID = process.env.BOLSHOI_NEW_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-new-stage';

/** Новая сцена: 1 продаваемый сектор — Партер (ряды 1–8 блоком). */
const NEW_SECTORS = [{ key: 'parter', label: 'Партер', seatList: ['1'], box: false }];

/** Кармен-сюита. Дивертисмент (Новая сцена) — все даты 65000 ₽. */
const NEW_EVENTS = [
  { id: 'karmen-syuita-2026-10-16', title: 'Кармен-сюита. Дивертисмент', venue: 'Большой театр — Новая сцена', address: 'ул. Большая Дмитровка, 4/2, Москва', iso: '2026-10-16T16:00:00.000Z', cardSubtitle: 'чт 16 октября · 19:00 · 12+', prices: [65000] },
  { id: 'karmen-syuita-2026-10-17-12', title: 'Кармен-сюита. Дивертисмент', venue: 'Большой театр — Новая сцена', address: 'ул. Большая Дмитровка, 4/2, Москва', iso: '2026-10-17T09:00:00.000Z', cardSubtitle: 'пт 17 октября · 12:00 · 12+', prices: [65000] },
  { id: 'karmen-syuita-2026-10-17-19', title: 'Кармен-сюита. Дивертисмент', venue: 'Большой театр — Новая сцена', address: 'ул. Большая Дмитровка, 4/2, Москва', iso: '2026-10-17T16:00:00.000Z', cardSubtitle: 'пт 17 октября · 19:00 · 12+', prices: [65000] },
  { id: 'karmen-syuita-2026-10-18', title: 'Кармен-сюита. Дивертисмент', venue: 'Большой театр — Новая сцена', address: 'ул. Большая Дмитровка, 4/2, Москва', iso: '2026-10-18T11:00:00.000Z', cardSubtitle: 'сб 18 октября · 14:00 · 12+', prices: [65000] },
];


function buildCatalogPayload(ev, stageId, stageName, genre, age) {
  return {
    Id: ev.id,
    RepertoireId: ev.id,
    Name: ev.title,
    ShortDescription: `${genre} «${ev.title}» · ${stageName}. ${ev.cardSubtitle}`,
    Description: `${genre} «${ev.title}» на ${stageName}. Предзаказ билетов по секторам (${ev.cardSubtitle}).`,
    GenreName: genre,
    Age: age,
    stageId,
    StageName: stageName,
    PlaceName: ev.venue,
    PlaceAddress: ev.address,
    EventDateTime: ev.iso,
    beginDateTime: ev.iso,
  };
}

function buildDescriptionPack(ev, stageName, genre, age) {
  return {
    heroKicker: `${genre} · Большой театр`,
    heroSubline: `${stageName} · ${ev.cardSubtitle}`,
    heroLead: `${genre} «${ev.title}» на ${stageName}. Предзаказ мест по секторам.`,
    eventMeta: [
      { label: 'Возраст', value: age },
      { label: 'Площадка', value: stageName },
      { label: 'Адрес', value: ev.address },
    ],
    sections: [
      {
        id: 'about',
        title: 'О событии',
        paragraphs: [
          `${genre} «${ev.title}» на ${stageName}.`,
          'Предзаказ билетов осуществляется по секторам зала.',
        ],
      },
    ],
  };
}

function buildOffers(ev, sectors) {
  return ev.prices.map((price, i) => {
    const s = sectors[i];
    return {
      Id: `${ev.id}-${s.key}`,
      Sector: s.label,
      Row: '1',
      SeatList: s.seatList,
      NominalPrice: String(price),
      AgentPrice: String(price),
      EventDateTime: ev.iso,
    };
  });
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
      `${ev.title} — ${ev.cardSubtitle}`,
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

  console.log(`[seed-bolshoi] ${ev.id} · ${ev.cardSubtitle} · offers=${ev.prices.length}`);
}

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
  const byLabel = bolshoiSellableSeatsByRow(seats);
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
    /** Схлопнуть предыдущий expand обратно в 1 оффер/сектор по цене. */
    const uniq = [];
    const seen = new Set();
    for (const off of base) {
      const lab = String(off.Sector || '');
      if (!lab || seen.has(lab)) continue;
      seen.add(lab);
      uniq.push(off);
    }
    payload.ResultData = expandBolshoiOffersByRows(uniq, byLabel, id);
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
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });

