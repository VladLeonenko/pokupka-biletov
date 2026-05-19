/**
 * Каноническое отображение сектора (Сектор A 101) + lookup по norm (a101).
 * Не зависит от регистра и префикса «сектор».
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TICKETS = path.resolve(__dirname, '../../tickets.json');

/** @type {Map<string, string> | null} */
let cachedByNorm = null;

/**
 * @param {string} norm
 * @returns {string}
 */
export function formatSectorDisplayFromNorm(norm) {
  const n = normalizeSectorLabel(norm);
  const vip = /^vip([a-d])(\d{2,4})$/i.exec(n);
  if (vip) {
    return `VIP ${vip[1].toUpperCase()} ${vip[2]}`;
  }
  const trib = /^([a-d])(\d{2,4})$/i.exec(n);
  if (trib) {
    return `Сектор ${trib[1].toUpperCase()} ${trib[2]}`;
  }
  return String(norm || '').trim();
}

/**
 * @param {unknown} ticketsPayload
 * @returns {Map<string, string>} norm → label как в pbilet/tickets
 */
export function buildCanonicalSectorLabelByNorm(ticketsPayload) {
  const byNorm = new Map();
  const push = (label) => {
    const raw = String(label ?? '').trim();
    if (!raw) return;
    const norm = normalizeSectorLabel(raw);
    if (!norm) return;
    if (!byNorm.has(norm)) byNorm.set(norm, raw);
  };

  const sectors = ticketsPayload?.sectors ?? ticketsPayload?.Sectors;
  if (Array.isArray(sectors)) {
    for (const s of sectors) {
      push(
        s?.i ??
          s?.I ??
          s?.name ??
          s?.Name ??
          s?.label ??
          s?.Label ??
          s?.title,
      );
    }
  }

  const places = ticketsPayload?.places ?? ticketsPayload?.Places;
  if (Array.isArray(places)) {
    for (const p of places) {
      push(p?.name ?? p?.['place-name'] ?? p?.placeName);
    }
  }

  return byNorm;
}

/**
 * @param {string} rawSector
 * @param {Map<string, string>} [byNorm]
 */
export function resolveCanonicalSectorLabel(rawSector, byNorm = null) {
  const raw = String(rawSector ?? '').trim();
  if (!raw) return raw;
  const norm = normalizeSectorLabel(raw);
  if (!norm) return raw;

  const map = byNorm ?? getCachedTicketsSectorLabelByNorm();
  const fromTickets = map.get(norm);
  if (fromTickets) return fromTickets;

  return formatSectorDisplayFromNorm(norm);
}

export function getCachedTicketsSectorLabelByNorm(ticketsPath = DEFAULT_TICKETS) {
  if (cachedByNorm && cachedByNorm.path === ticketsPath) return cachedByNorm.map;
  if (!fs.existsSync(ticketsPath)) {
    cachedByNorm = { path: ticketsPath, map: new Map() };
    return cachedByNorm.map;
  }
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const map = buildCanonicalSectorLabelByNorm(ticketsPayload);
  cachedByNorm = { path: ticketsPath, map };
  return map;
}

export function resetCanonicalSectorLabelCache() {
  cachedByNorm = null;
}
