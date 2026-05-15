/**
 * Идемпотентно добавляет getbilet_events.storefront_hidden, если миграция 080/007 не доехала.
 * Запуск: node scripts/ensure-getbilet-storefront-hidden-column.js
 */
import ticketPool from '../ticketDb.js';

async function main() {
  await ticketPool.query(`
    ALTER TABLE getbilet_events
      ADD COLUMN IF NOT EXISTS storefront_hidden BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await ticketPool.query(`
    CREATE INDEX IF NOT EXISTS idx_getbilet_events_storefront_hidden
      ON getbilet_events (storefront_hidden)
      WHERE storefront_hidden = TRUE;
  `);
  console.log('[ensure-getbilet-storefront-hidden-column] storefront_hidden OK');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
