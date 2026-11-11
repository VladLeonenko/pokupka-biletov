/**
 * Каноническая схема основной сцены Театра им. Вахтангова (getbilet_stage_maps).
 */

import ticketPool from '../ticketDb.js';

export const VAKHTANGOV_MAIN_STAGE_MAP_KEY =
  process.env.VAKHTANGOV_STAGE_EXTERNAL_ID?.trim() ||
  process.env.GETBILET_VAKHTANGOV_MAIN_STAGE_MAP_KEY?.trim() ||
  '5f3dedaa08192a003157dc6d';

const DEFAULT_VAKHTANGOV_MAIN_STAGE_IDS = new Set([
  VAKHTANGOV_MAIN_STAGE_MAP_KEY,
  '5f3dee4f08192a003157dc71',
]);

function parseEnvVakhtangovStageIds() {
  const raw = process.env.GETBILET_VAKHTANGOV_MAIN_STAGE_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function normText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function looksLikeVakhtangovVenue(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  return text.includes('вахтанг') || text.includes('vakhtangov');
}

export function looksLikeVakhtangovMainStageHall(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  if (!looksLikeVakhtangovVenue(text)) return false;
  if (/малый|малый зал|камерн|новая сцен|репетиц/.test(text)) return false;
  return true;
}

/** @param {string | null | undefined} stageId */
export function isVakhtangovMainStageId(stageId) {
  const sid = String(stageId || '').trim();
  if (!sid) return false;
  if (DEFAULT_VAKHTANGOV_MAIN_STAGE_IDS.has(sid)) return true;
  return parseEnvVakhtangovStageIds().has(sid);
}

/** @param {string | null | undefined} repertoireId */
export function vakhtangovMainStageMapKeyForRepertoire(repertoireId) {
  const raw = process.env.GETBILET_VAKHTANGOV_MAIN_REPERTOIRE_IDS?.trim();
  if (!raw) return null;
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return null;
  const hit = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(id);
  return hit ? VAKHTANGOV_MAIN_STAGE_MAP_KEY : null;
}

/**
 * @param {{ title?: string; venueManual?: string | null; venueFromPayload?: string | null; repertoireId?: string | null; hall?: string | null; stageId?: string | null }} ctx
 * @param {string | null | undefined} placeFromMapsVenue
 * @param {string | null | undefined} hall
 */
export function shouldUseVakhtangovMainStageCanonicalMap(ctx, placeFromMapsVenue, hall) {
  if (vakhtangovMainStageMapKeyForRepertoire(ctx?.repertoireId)) return true;
  if (isVakhtangovMainStageId(ctx?.stageId)) return true;
  const hallText = hall || ctx?.hall || '';
  const venue = [ctx?.venueManual, ctx?.venueFromPayload, placeFromMapsVenue].filter(Boolean).join(' ');
  return looksLikeVakhtangovMainStageHall(venue, hallText, ctx?.title);
}

/** Как Новая сцена Большого: белые сектора на сером фоне, без смены path. */
export const VAKHTANGOV_HALL_VIEWPORT_BG = '#f5f5f5';
export const VAKHTANGOV_SECTOR_FILL = '#ffffff';

/**
 * Подложка SVG: серый фон схемы (геометрию path не трогаем).
 * @param {string | null | undefined} svgMarkup
 */
export function ensureVakhtangovHallSvgGrayBackground(svgMarkup) {
  const raw = String(svgMarkup || '');
  if (!raw.includes('<svg')) return raw;
  let out = raw;
  if (!/style\s*=\s*["'][^"']*background\s*:\s*#f5f5f5/i.test(out)) {
    out = out.replace(/<svg\b([^>]*)>/i, (m, attrs) => {
      if (/\bstyle\s*=/i.test(attrs)) {
        return `<svg${attrs.replace(
          /\bstyle\s*=\s*(["'])([\s\S]*?)\1/i,
          (_, q, style) => ` style=${q}${String(style).replace(/;?\s*$/, '')};background:#f5f5f5${q}`,
        )}>`;
      }
      return `<svg${attrs} style="background:#f5f5f5">`;
    });
  }
  if (!/fill\s*=\s*["']#f5f5f5["']/i.test(out)) {
    out = out.replace(
      /(<svg\b[^>]*>)/i,
      '$1\n  <rect width="100%" height="100%" x="0" y="0" fill="#f5f5f5" pointer-events="none"/>',
    );
  }
  return out;
}

/**
 * layout_json: белые заливки секторов + серый viewport (эталон — Новая сцена Большого).
 * @param {unknown} layoutJson
 */
export function applyVakhtangovWhiteSectorScheme(layoutJson) {
  if (!layoutJson || typeof layoutJson !== 'object') return layoutJson;
  const lj = { ...layoutJson };
  lj.hallViewportBackground = VAKHTANGOV_HALL_VIEWPORT_BG;
  const sm = lj.sectorMode && typeof lj.sectorMode === 'object' ? { ...lj.sectorMode } : null;
  if (sm && Array.isArray(sm.sectors)) {
    sm.sectors = sm.sectors.map((sec) => {
      if (!sec || typeof sec !== 'object') return sec;
      return { ...sec, fill: VAKHTANGOV_SECTOR_FILL, accent: VAKHTANGOV_SECTOR_FILL };
    });
    lj.sectorMode = sm;
  }
  return lj;
}

/** Декор строки схемы перед отдачей клиенту / записью в БД. */
export function decorateVakhtangovStageMapRow(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    svg_markup: ensureVakhtangovHallSvgGrayBackground(row.svg_markup),
    layout_json: applyVakhtangovWhiteSectorScheme(row.layout_json),
  };
}

export async function loadVakhtangovMainStageMapRow() {
  const r = await ticketPool.query(
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [VAKHTANGOV_MAIN_STAGE_MAP_KEY],
  );
  const row = r.rows[0] || null;
  return row ? decorateVakhtangovStageMapRow(row) : null;
}
