/**
 * Идемпотентно добавляет колонки getbilet_stage_maps, если миграции 074+ не доехали до БД.
 * Запуск: node scripts/ensure-getbilet-stage-maps-columns.js
 */
import ticketPool from '../ticketDb.js';

async function main() {
  await ticketPool.query(`
    ALTER TABLE getbilet_stage_maps
      ADD COLUMN IF NOT EXISTS external_plan_url TEXT NULL;
  `);
  await ticketPool.query(`
    COMMENT ON COLUMN getbilet_stage_maps.external_plan_url IS
      'URL схем залов на сайте театра — показываем на странице билета, если нужно';
  `);
  console.log('[ensure-getbilet-stage-maps-columns] external_plan_url OK');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
