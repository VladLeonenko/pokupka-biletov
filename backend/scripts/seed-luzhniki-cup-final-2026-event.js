#!/usr/bin/env node
/**
 * Мероприятие «Финал Кубка России по футболу 2026» — карточка в каталоге, схема Лужников.
 * Лента: mergePinnedCatalogCacheIntoActions (sort_order ≤ -400).
 *
 * Про подложку pbilet:
 * - **1173** (~586×505): схема со строкой «Сцена» — типичный schemeId SSD для страниц Кубка на сайте донора.
 *   Это не полный «овал» чаши; если нужна большая схема стадиона на CDN pbilet — смотри **1175** (~7570×6417).
 * - Переключение: `PBILET_LAYOUT_ID=1175` — только вместе с JSON **`…/v2/tickets`**, посчитанным в той же системе координат (или живые PBILET_EVENT_* для этого сеанса).
 *
 * Свой чертёж чаши: `LUZHNIKI_PREVIEW_SOURCE=inkscape` и файл SVG (`LUZHNIKI_INKSCAPE_SVG_PATH` или дефолт `frontend/public/maps/luzhniki-go.svg`).
 *
 * OFFERS_CACHE_ONLY — не дергаем GetBilet по офферам для несуществующего там репертуара.
 *
 *   npm run seed:luzhniki-cup-final-2026
 *
 * Координаты мест: GET https://api.pbilet.net/public/v2/tickets — `LUZHNIKI_PBILET_TICKETS_JSON=…` или PBILET_EVENT_*.
 * Синтетика по bbox: `LUZHNIKI_ALLOW_SYNTHETIC_SEATS=1` (не рекомендуется).
 *
 * Страница: /ticket/luzhniki-cup-final-2026
 */

import ticketPool from '../ticketDb.js';
import {
  buildLuzhnikiFootballStadiumInkscapePreview,
  buildLuzhnikiFootballStadiumPreview,
} from '../services/pbiletLuzhnikiFootballPreview.js';

const REPERTOIRE_ID = process.env.LUZHNIKI_CUP_REP_ID?.trim() || 'luzhniki-cup-final-2026';
const STAGE_ID = process.env.LUZHNIKI_CUP_STAGE_ID?.trim() || 'luzhniki-cup-final-2026-stage';
const PREVIEW_SOURCE = process.env.LUZHNIKI_PREVIEW_SOURCE?.trim().toLowerCase() || 'pbilet';
const PBILET_LAYOUT_ID = process.env.PBILET_LAYOUT_ID?.trim() || '1173';

/** Воскресенье 24 мая 2026, 18:00 МСК (UTC+3) */
const EVENT_ISO = '2026-05-24T15:00:00.000Z';

const TITLE = 'Финал Кубка России по футболу 2026';
const STAGE_MAP_TITLE = 'Лужники — финал Кубка России 2026';

const catalogPayload = {
  Id: REPERTOIRE_ID,
  RepertoireId: REPERTOIRE_ID,
  Name: TITLE,
  ShortDescription: 'Футбол · Кубок России · стадион «Лужники». Продажа билетов будет объявлена позже.',
  Description:
    'Финал Кубка России по футболу 2026 на стадионе «Лужники». На странице представлена условная схема мест для ориентира (геометрия по открытым данным билетного оператора). Выбор мест и оплата станут доступны после запуска продаж.',
  GenreName: 'Спорт',
  Age: '0+',
  stageId: STAGE_ID,
  StageName: 'Стадион «Лужники»',
  PlaceName: 'Стадион «Лужники»',
  PlaceAddress: 'ул. Лужники, 24, Москва',
  EventDateTime: EVENT_ISO,
  beginDateTime: EVENT_ISO,
};

const emptyOffersPayload = {
  Success: true,
  Method: 'GetOfferListByRepertoireId',
  ResultData: [],
};

const descriptionPack = {
  heroKicker: 'Футбол · Кубок России',
  heroSubline: 'Стадион «Лужники» · вс 24 мая 2026 · 18:00',
  heroLead:
    'Финал Кубка России — главный матч сезона на стадионе «Лужники». Сейчас доступна только схема мест для ориентира; продажа билетов будет подключена позже.',
  eventMeta: [
    { label: 'Возраст', value: '0+' },
    { label: 'Площадка', value: 'Стадион «Лужники»' },
    { label: 'Адрес', value: 'ул. Лужники, 24, Москва' },
  ],
  sections: [
    {
      id: 'about',
      title: 'О событии',
      paragraphs: [
        'Матч пройдёт в Москве на стадионе «Лужники». Точное время и программа могут быть уточнены организатором.',
        'Интерактивная продажа билетов через сайт будет включена после интеграции офферов с билетной системой.',
      ],
    },
  ],
};
descriptionPack.totalChars = descriptionPack.sections.reduce((sum, section) => {
  return sum + section.title.length + section.paragraphs.join('\n\n').length;
}, 0);

async function main() {
  let preview;
  if (PREVIEW_SOURCE === 'inkscape') {
    preview = await buildLuzhnikiFootballStadiumInkscapePreview({
      demoEventIso: EVENT_ISO,
      svgPath: process.env.LUZHNIKI_INKSCAPE_SVG_PATH?.trim(),
    });
  } else {
    preview = await buildLuzhnikiFootballStadiumPreview({
      layoutId: PBILET_LAYOUT_ID,
      eventSourceId: process.env.PBILET_EVENT_SOURCE_ID?.trim() || '',
      eventDateId: process.env.PBILET_EVENT_DATE_ID?.trim() || '',
      ticketsSnapshotPath: process.env.LUZHNIKI_PBILET_TICKETS_JSON?.trim() || '',
      demoEventIso: EVENT_ISO,
    });
  }

  console.log(
    '[seed:luzhniki-cup-final-2026]',
    PREVIEW_SOURCE === 'inkscape' ? 'inkscape' : `pbilet layout ${PBILET_LAYOUT_ID}`,
    preview.meta?.mode ?? '',
    'seats',
    preview.meta?.seatCount ?? 0,
  );

  const layoutJson = {
    ...preview.layout_json,
    seatSelectionDisabled: true,
  };

  const notesSeed = `seed seed-luzhniki-cup-final-2026-event.js · ${PREVIEW_SOURCE === 'inkscape' ? 'inkscape SVG' : `pbilet layout ${PBILET_LAYOUT_ID}`} · seatSelectionDisabled`;

  await ticketPool.query(
    `INSERT INTO getbilet_stage_maps (
       stage_external_id, place_external_id, title, svg_markup, layout_json,
       notes_internal, external_plan_url, updated_at
     )
     VALUES ($1, NULL, $2, $3, $4::jsonb, $5, $6, NOW())
     ON CONFLICT (stage_external_id) DO UPDATE SET
       title = EXCLUDED.title,
       svg_markup = EXCLUDED.svg_markup,
       layout_json = EXCLUDED.layout_json,
       notes_internal = EXCLUDED.notes_internal,
       external_plan_url = EXCLUDED.external_plan_url,
       updated_at = NOW()`,
    [
      STAGE_ID,
      STAGE_MAP_TITLE,
      preview.svg_markup,
      JSON.stringify(layoutJson),
      notesSeed,
      'https://luzhnikikassa.ru/final-kubka-rossii-po-futbolu',
    ],
  );

  await ticketPool.query(
    `INSERT INTO getbilet_catalog_cache (repertoire_external_id, stage_id, payload_json, synced_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (repertoire_external_id) DO UPDATE SET
       stage_id = EXCLUDED.stage_id,
       payload_json = EXCLUDED.payload_json,
       synced_at = NOW()`,
    [REPERTOIRE_ID, STAGE_ID, JSON.stringify(catalogPayload)],
  );

  await ticketPool.query(
    `INSERT INTO getbilet_events (
       getbilet_external_id, title_manual, description_manual, description_pack_json,
       venue_manual, venue_address_manual, card_subtitle_manual, notes_internal,
       is_published, sort_order, updated_at
     )
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, TRUE, $9, NOW())
     ON CONFLICT (getbilet_external_id) DO UPDATE SET
       title_manual = EXCLUDED.title_manual,
       description_manual = EXCLUDED.description_manual,
       description_pack_json = EXCLUDED.description_pack_json,
       venue_manual = EXCLUDED.venue_manual,
       venue_address_manual = EXCLUDED.venue_address_manual,
       card_subtitle_manual = EXCLUDED.card_subtitle_manual,
       notes_internal = EXCLUDED.notes_internal,
       is_published = TRUE,
       sort_order = EXCLUDED.sort_order,
       updated_at = NOW()`,
    [
      REPERTOIRE_ID,
      TITLE,
      catalogPayload.Description,
      JSON.stringify(descriptionPack),
      catalogPayload.PlaceName,
      catalogPayload.PlaceAddress,
      'вс 24 мая · 18:00 · 0+',
      'OFFERS_CACHE_ONLY · ручное событие: офферы только из кэша, без GetOfferList к апстриму.',
      -500,
    ],
  );

  await ticketPool.query(
    `INSERT INTO getbilet_repertoire_offers_cache (repertoire_external_id, payload_json, fetched_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (repertoire_external_id) DO UPDATE SET
       payload_json = EXCLUDED.payload_json,
       fetched_at = NOW()`,
    [REPERTOIRE_ID, JSON.stringify(emptyOffersPayload)],
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        repertoireId: REPERTOIRE_ID,
        stageId: STAGE_ID,
        urls: [
          `/ticket/${encodeURIComponent(REPERTOIRE_ID)}`,
          `/ticket/${encodeURIComponent(REPERTOIRE_ID)}/final-kubka-rossii-po-futbolu-2026`,
        ],
        hint: 'Обновите каталог на фронте (?refresh=1) или перезапустите backend, если ответ /api/bilet/events закэширован.',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error('[seed-luzhniki-cup-final-2026-event]', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await ticketPool.end().catch(() => {});
  });
