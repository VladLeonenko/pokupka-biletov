#!/usr/bin/env node
/**
 * OLIMPBET Суперкубок России 2026 — Нижний Новгород (ручная карточка + схема pbilet).
 *
 *   cd backend && npm run seed:supercup-nn-2026
 *
 * Страница: /ticket/olimpbet-superkubok-rossii
 * Схема: pbilet layout 1800 (Совкомбанк Арена), демо-места до живых офферов GetBilet.
 *
 * Живые tickets pbilet (когда появятся в Network portalbilet):
 *   PBILET_EVENT_SOURCE_ID=… PBILET_EVENT_DATE_ID=… PBILET_LAYOUT_ID=1800 npm run seed:supercup-nn-2026
 */

import ticketPool from '../ticketDb.js';
import { buildPbiletCategoryStadiumPreview } from '../services/pbiletLuzhnikiFootballPreview.js';
import { footballStadiumCheckoutLayoutFlags } from '../utils/footballStadiumCheckoutLayout.js';
import {
  SUPERKUP_NN_REPERTOIRE_ID,
  SUPERKUP_NN_STAGE_MAP_KEY,
} from '../utils/footballStadiumRepertoires.js';

const REPERTOIRE_ID = process.env.SUPERKUP_REP_ID?.trim() || SUPERKUP_NN_REPERTOIRE_ID;
const STAGE_ID = process.env.SUPERKUP_STAGE_ID?.trim() || 'supercup-nn-2026-stage';
const STAGE_MAP_KEY = process.env.SUPERKUP_STAGE_MAP_KEY?.trim() || SUPERKUP_NN_STAGE_MAP_KEY;
const PBILET_LAYOUT_ID = process.env.PBILET_LAYOUT_ID?.trim() || '1800';

/** Сб 18.07.2026, 19:30 МСК */
const EVENT_ISO = '2026-07-18T16:30:00.000Z';

const TITLE = 'OLIMPBET Суперкубок России — Спартак / Зенит';
const CARD_TITLE = 'Матч Спартак — Зенит, Суперкубок России по футболу 2026';
const STAGE_MAP_TITLE = 'Совкомбанк Арена — Суперкубок России 2026';

/** РФС — матч Зенит / Спартак, Суперкубок 2026 */
const HERO_POSTER_URL =
  process.env.SUPERKUP_HERO_POSTER_URL?.trim() ||
  'https://hb.bizmrg.com/websiterfs/news/224597/6a424b6fbd659_582x388.jpg';
const HERO_POSTER_PAGE_URL =
  process.env.SUPERKUP_HERO_POSTER_PAGE_URL?.trim() || 'https://www.rfs.ru/news/224597';

const catalogPayload = {
  Id: REPERTOIRE_ID,
  RepertoireId: REPERTOIRE_ID,
  Name: CARD_TITLE,
  ImageUrl: HERO_POSTER_URL,
  BannerUrl: HERO_POSTER_URL,
  ShortDescription:
    'Футбол · Суперкубок России · Совкомбанк Арена, Нижний Новгород · 18 июля 2026, 19:30 · FAN ID обязателен.',
  Description:
    'Матч за OLIMPBET Суперкубок России 2026 между «Спартаком» и «Зенитом» на стадионе «Совкомбанк Арена» в Нижнем Новгороде. Дерби двух столиц в борьбе за главный футбольный трофей страны.',
  GenreName: 'Спорт',
  Age: '0+',
  stageId: STAGE_ID,
  StageName: 'Совкомбанк Арена',
  PlaceName: 'Совкомбанк Арена (бывш. Стадион «Нижний Новгород»)',
  PlaceAddress: 'Россия, Нижний Новгород, ул. Бетанкура, 1А',
  EventDateTime: EVENT_ISO,
  beginDateTime: EVENT_ISO,
};

const descriptionPack = {
  heroKicker: 'Футбол · Суперкубок России',
  heroSubline: 'Совкомбанк Арена · сб 18 июля 2026 · 19:30',
  heroLead:
    'Дерби двух столиц в борьбе за главный футбольный трофей страны. Для посещения матча необходима карта болельщика (FAN ID).',
  eventMeta: [
    { label: 'Возраст', value: '0+' },
    { label: 'Площадка', value: 'Совкомбанк Арена' },
    { label: 'Адрес', value: 'ул. Бетанкура, 1А, Нижний Новгород' },
    { label: 'FAN ID', value: 'Обязателен' },
  ],
  sections: [
    {
      id: 'about',
      title: 'О матче',
      paragraphs: [
        '18 июля 2026 года состоится OLIMPBET Суперкубок России — матч между обладателем Кубка «Спартаком» и чемпионом страны «Зенитом».',
        'Стадион «Совкомбанк Арена» в Нижнем Новгороде примет главное футбольное событие открытия сезона.',
      ],
    },
    {
      id: 'fan-id',
      title: 'FAN ID',
      paragraphs: [
        'Покупка и оформление билетов возможна только при наличии персонифицированной карты болельщика.',
      ],
    },
  ],
};
descriptionPack.totalChars = descriptionPack.sections.reduce((sum, section) => {
  return sum + section.title.length + section.paragraphs.join('\n\n').length;
}, 0);

function demoOffersPayload(offers) {
  return {
    Success: true,
    Method: 'GetOfferListByRepertoireId',
    ResultData: offers.map((o) => ({
      ...o,
      NominalPrice: '1500',
      AgentPrice: '1500',
      PlaceName: catalogPayload.PlaceName,
      PlaceAddress: catalogPayload.PlaceAddress,
    })),
  };
}

async function main() {
  const preview = await buildPbiletCategoryStadiumPreview({
    layoutId: PBILET_LAYOUT_ID,
    eventSourceId: process.env.PBILET_EVENT_SOURCE_ID?.trim() || '',
    eventDateId: process.env.PBILET_EVENT_DATE_ID?.trim() || '',
    ticketsSnapshotPath: process.env.SUPERKUP_PBILET_TICKETS_JSON?.trim() || '',
    demoEventIso: EVENT_ISO,
  });

  console.log(
    '[seed:supercup-nn-2026]',
    `pbilet layout ${PBILET_LAYOUT_ID}`,
    preview.meta?.mode ?? '',
    'seats',
    preview.meta?.seatCount ?? 0,
  );

  const layoutJson = footballStadiumCheckoutLayoutFlags(
    {
      ...preview.layout_json,
      seatSelectionDisabled: false,
    },
    STAGE_MAP_KEY,
  );

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
      STAGE_MAP_KEY,
      STAGE_MAP_TITLE,
      preview.svg_markup,
      JSON.stringify(layoutJson),
      `seed seed-supercup-nn-2026-event.js · pbilet ${PBILET_LAYOUT_ID} · ${preview.meta?.mode ?? 'preview'}`,
      null,
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
       poster_url_manual, banner_url_manual, poster_page_url,
       is_published, storefront_hidden, sort_order, updated_at
     )
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, TRUE, FALSE, $12, NOW())
     ON CONFLICT (getbilet_external_id) DO UPDATE SET
       title_manual = EXCLUDED.title_manual,
       description_manual = EXCLUDED.description_manual,
       description_pack_json = EXCLUDED.description_pack_json,
       venue_manual = EXCLUDED.venue_manual,
       venue_address_manual = EXCLUDED.venue_address_manual,
       card_subtitle_manual = EXCLUDED.card_subtitle_manual,
       notes_internal = EXCLUDED.notes_internal,
       poster_url_manual = EXCLUDED.poster_url_manual,
       banner_url_manual = EXCLUDED.banner_url_manual,
       poster_page_url = EXCLUDED.poster_page_url,
       is_published = TRUE,
       storefront_hidden = FALSE,
       sort_order = EXCLUDED.sort_order,
       updated_at = NOW()`,
    [
      REPERTOIRE_ID,
      CARD_TITLE,
      catalogPayload.Description,
      JSON.stringify(descriptionPack),
      catalogPayload.PlaceName,
      catalogPayload.PlaceAddress,
      'сб 18 июля · 19:30 · 0+',
      'OFFERS_CACHE_ONLY · ручной Суперкубок NN; живые офферы GetBilet подключить позже.',
      HERO_POSTER_URL,
      HERO_POSTER_URL,
      HERO_POSTER_PAGE_URL,
      -500,
    ],
  );

  const offersPayload = demoOffersPayload(preview.demoOffers || []);
  await ticketPool.query(
    `INSERT INTO getbilet_repertoire_offers_cache (repertoire_external_id, payload_json, fetched_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (repertoire_external_id) DO UPDATE SET
       payload_json = EXCLUDED.payload_json,
       fetched_at = NOW()`,
    [REPERTOIRE_ID, JSON.stringify(offersPayload)],
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        repertoireId: REPERTOIRE_ID,
        stageId: STAGE_ID,
        stageMapKey: STAGE_MAP_KEY,
        urls: [
          `/ticket/${encodeURIComponent(REPERTOIRE_ID)}`,
          '/ticket/olimpbet-superkubok-rossii',
          '/ticket/superkubok-rossii-po-futbolu',
        ],
        hint: 'pm2 restart all --update-env; curl -sS "https://biletvsem.com/api/bilet/resolve-slug/olimpbet-superkubok-rossii"',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error('[seed:supercup-nn-2026]', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await ticketPool.end().catch(() => {});
  });
