#!/usr/bin/env node

import mainPool from '../db.js';
import ticketPool from '../ticketDb.js';

const REPERTOIRE_ID = process.env.TBANK_DEMO_REPERTOIRE_ID?.trim() || 'tbank-demo-event';
const STAGE_ID = 'tbank-demo-stage';
const OFFER_ID = 'tb-demo-offer-1';
const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const catalogPayload = {
  Id: REPERTOIRE_ID,
  RepertoireId: REPERTOIRE_ID,
  Name: 'Тестовая оплата T-Банк',
  ShortDescription: 'Тестовое мероприятие для проверки интернет-эквайринга T-Банка.',
  Description:
    'Служебное событие с демо-местами. Используйте его только для проверки редиректа на тестовый платежный шлюз.',
  GenreName: 'Тест',
  Age: '0+',
  stageId: STAGE_ID,
  PlaceName: 'Тестовая площадка',
  PlaceAddress: 'Онлайн',
  EventDateTime: eventDate,
  beginDateTime: eventDate,
};

const offersPayload = {
  Success: true,
  Method: 'GetOfferListByRepertoireId',
  ResultData: [
    {
      Id: OFFER_ID,
      RepertoireId: REPERTOIRE_ID,
      EventDateTime: eventDate,
      Sector: 'Партер',
      Row: '1',
      SeatList: ['1', '2', '3', '4', '5', '6'],
      NominalPrice: '100',
      AgentPrice: '100',
      PlaceName: 'Тестовая площадка',
      PlaceAddress: 'Онлайн',
      StageName: 'Демо-зал',
    },
  ],
};

async function main() {
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
       getbilet_external_id, title_manual, description_manual, venue_manual, venue_address_manual,
       is_published, sort_order, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, TRUE, -1000, NOW())
     ON CONFLICT (getbilet_external_id) DO UPDATE SET
       title_manual = EXCLUDED.title_manual,
       description_manual = EXCLUDED.description_manual,
       venue_manual = EXCLUDED.venue_manual,
       venue_address_manual = EXCLUDED.venue_address_manual,
       is_published = TRUE,
       sort_order = -1000,
       updated_at = NOW()`,
    [
      REPERTOIRE_ID,
      catalogPayload.Name,
      catalogPayload.Description,
      catalogPayload.PlaceName,
      catalogPayload.PlaceAddress,
    ],
  );

  await ticketPool.query(
    `INSERT INTO getbilet_repertoire_offers_cache (repertoire_external_id, payload_json, fetched_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (repertoire_external_id) DO UPDATE SET
       payload_json = EXCLUDED.payload_json,
       fetched_at = NOW()`,
    [REPERTOIRE_ID, JSON.stringify(offersPayload)],
  );

  console.log(`Demo event ready: /ticket/${encodeURIComponent(REPERTOIRE_ID)}/testovaya-oplata-t-bank`);
  console.log(`Demo offer: ${OFFER_ID}, seats: ${offersPayload.ResultData[0].SeatList.join(', ')}`);
}

main()
  .catch((err) => {
    console.error('[seed-tbank-demo-event]', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await ticketPool.end().catch(() => {});
    if (ticketPool !== mainPool) {
      await mainPool.end().catch(() => {});
    }
  });
