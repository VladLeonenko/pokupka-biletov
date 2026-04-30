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

const descriptionPack = {
  heroKicker: 'Тест интернет-эквайринга',
  heroSubline: 'Тестовая площадка · Онлайн',
  heroLead:
    'Служебное мероприятие для проверки оплаты через тестовый терминал T-Банка. Выберите любое место и перейдите на защищенную страницу оплаты.',
  eventMeta: [
    { label: 'Площадка', value: 'Тестовая площадка' },
    { label: 'Формат', value: 'Онлайн-тест' },
  ],
  sections: [
    {
      id: 'about',
      title: 'О тестовом мероприятии',
      paragraphs: [
        'Это событие создано только для проверки интеграции интернет-эквайринга T-Банка.',
        'Оплата проходит через тестовый терминал, реальные билеты и места у организатора не бронируются.',
      ],
    },
  ],
};
descriptionPack.totalChars = descriptionPack.sections.reduce((sum, section) => {
  return sum + section.title.length + section.paragraphs.join('\n\n').length;
}, 0);

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
       getbilet_external_id, title_manual, description_manual, description_pack_json, venue_manual, venue_address_manual,
       is_published, sort_order, updated_at
     )
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, TRUE, -1000, NOW())
     ON CONFLICT (getbilet_external_id) DO UPDATE SET
       title_manual = EXCLUDED.title_manual,
       description_manual = EXCLUDED.description_manual,
       description_pack_json = EXCLUDED.description_pack_json,
       venue_manual = EXCLUDED.venue_manual,
       venue_address_manual = EXCLUDED.venue_address_manual,
       is_published = TRUE,
       sort_order = -1000,
       updated_at = NOW()`,
    [
      REPERTOIRE_ID,
      catalogPayload.Name,
      catalogPayload.Description,
      JSON.stringify(descriptionPack),
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

  await ticketPool.query(
    `INSERT INTO getbilet_promo_codes (
       code, discount_kind, discount_value, max_uses_total, uses_count,
       valid_from, valid_until, min_order_amount, is_active, notes, updated_at
     )
     VALUES ('TBANK10', 'percent', 10, NULL, 0, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 50, TRUE,
       'Демо-промокод для проверки T-Bank checkout', NOW())
     ON CONFLICT (lower(trim(code))) DO UPDATE SET
       discount_kind = EXCLUDED.discount_kind,
       discount_value = EXCLUDED.discount_value,
       max_uses_total = EXCLUDED.max_uses_total,
       valid_from = EXCLUDED.valid_from,
       valid_until = EXCLUDED.valid_until,
       min_order_amount = EXCLUDED.min_order_amount,
       is_active = TRUE,
       notes = EXCLUDED.notes,
       updated_at = NOW()`,
  );

  console.log(`Demo event ready: /ticket/${encodeURIComponent(REPERTOIRE_ID)}/testovaya-oplata-t-bank`);
  console.log(`Demo offer: ${OFFER_ID}, seats: ${offersPayload.ResultData[0].SeatList.join(', ')}`);
  console.log('Demo promo: TBANK10 (-10%)');
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
