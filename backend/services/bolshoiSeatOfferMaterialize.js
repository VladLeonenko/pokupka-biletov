import ticketPool from '../ticketDb.js';
import { isBolshoiZonePreorderRepertoire } from '../utils/bolshoiCheckoutMode.js';
import {
  expandBolshoiNewStageZoneOffers,
  offersAreNewStageZonePlaceholders,
} from '../utils/bolshoiNewStageSeatOffers.js';

const NEW_STAGE_ID = process.env.BOLSHOI_NEW_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-new-stage';

/** @type {Promise<unknown[]> | null} */
let seatsPromise = null;

function loadNewStageSeats() {
  if (!seatsPromise) {
    seatsPromise = ticketPool
      .query(`SELECT layout_json->'seats' AS seats FROM getbilet_stage_maps WHERE stage_external_id = $1`, [
        NEW_STAGE_ID,
      ])
      .then((r) => (Array.isArray(r.rows[0]?.seats) ? r.rows[0].seats : []))
      .catch((err) => {
        seatsPromise = null;
        throw err;
      });
  }
  return seatsPromise;
}

/**
 * Щелкунчик и уже разложенные офферы не трогаем.
 * Плейсхолдер Новой сцены → оффер на каждый ряд 1–8 с реальными местами.
 * @param {string} repertoireId
 * @param {unknown} payload
 */
export async function materializeBolshoiNewStageSeatOffers(repertoireId, payload) {
  if (!payload || typeof payload !== 'object') return payload;
  if (isBolshoiZonePreorderRepertoire(repertoireId)) return payload;
  const body = /** @type {Record<string, unknown>} */ (payload);
  const rows = Array.isArray(body.ResultData) ? body.ResultData : null;
  if (!rows || !offersAreNewStageZonePlaceholders(rows)) return payload;
  const seats = await loadNewStageSeats();
  if (!Array.isArray(seats) || seats.length < 20) return payload;
  const next = expandBolshoiNewStageZoneOffers(
    /** @type {Record<string, unknown>[]} */ (rows),
    seats,
  );
  if (next === rows) return payload;
  return { ...body, ResultData: next };
}
