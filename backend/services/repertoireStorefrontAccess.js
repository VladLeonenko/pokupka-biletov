/**
 * Доступность репертуара на публичной витрине (/ticket, resolve-slug).
 */

import ticketPool from '../ticketDb.js';
import { isManualRepertoireKey } from '../utils/repertoireRouteKey.js';
import { isStorefrontHidden } from './getbiletStorefrontVisibility.js';

export class RepertoireNotAvailableError extends Error {
  constructor(message = 'Мероприятие недоступно') {
    super(message);
    this.name = 'RepertoireNotAvailableError';
  }
}

/** @param {string} repertoireId */
async function loadEventVisibilityRow(repertoireId) {
  const rid = String(repertoireId || '').trim();
  if (!rid) return null;
  try {
    const r = await ticketPool.query(
      `SELECT id, is_published, storefront_hidden
       FROM getbilet_events
       WHERE getbilet_external_id = $1`,
      [rid],
    );
    return r.rows[0] ?? null;
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? /** @type {{ code?: string }} */ (e).code : '';
    if (code === '42703') {
      const r = await ticketPool.query(
        `SELECT id, is_published FROM getbilet_events WHERE getbilet_external_id = $1`,
        [rid],
      );
      return r.rows[0] ?? null;
    }
    if (code === '42P01') return null;
    throw e;
  }
}

/**
 * @param {string} repertoireId
 * @returns {Promise<{ allowed: boolean; reason?: string }>}
 */
export async function getRepertoireStorefrontAccess(repertoireId) {
  const rid = String(repertoireId || '').trim();
  if (!rid) return { allowed: false, reason: 'empty' };

  const row = await loadEventVisibilityRow(rid);

  if (isManualRepertoireKey(rid)) {
    if (!row) return { allowed: false, reason: 'manual_no_event' };
    if (row.is_published === false) return { allowed: false, reason: 'unpublished' };
    if (isStorefrontHidden(row)) return { allowed: false, reason: 'hidden' };
    return { allowed: true };
  }

  if (row) {
    if (row.is_published === false) return { allowed: false, reason: 'unpublished' };
    if (isStorefrontHidden(row)) return { allowed: false, reason: 'hidden' };
  }

  return { allowed: true };
}

/** @param {string} repertoireId */
export async function assertRepertoireStorefrontAccess(repertoireId) {
  const access = await getRepertoireStorefrontAccess(repertoireId);
  if (!access.allowed) {
    throw new RepertoireNotAvailableError('Мероприятие снято с продажи или недоступно');
  }
}
