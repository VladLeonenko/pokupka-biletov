/**
 * Единый save-token для редакторов схем залов (Лужники SVG, Вахтангов JSON, …).
 * Каноничный env: LUZHNIKI_SVG_SAVE_TOKEN (историческое имя).
 */

export function resolveHallMapSaveToken() {
  return (
    process.env.LUZHNIKI_SVG_SAVE_TOKEN?.trim() ||
    process.env.HALL_MAP_SAVE_TOKEN?.trim() ||
    process.env.VAKHTANGOV_HALL_SEATS_SAVE_TOKEN?.trim() ||
    ''
  );
}

export function readHallMapSaveTokenFromRequest(req) {
  return String(
    req.headers['x-luzhniki-svg-save-token'] ||
      req.headers['x-hall-map-save-token'] ||
      req.headers['x-vakhtangov-seats-save-token'] ||
      '',
  ).trim();
}

export function isHallMapSaveTokenRequired() {
  return Boolean(resolveHallMapSaveToken());
}

/** @returns {boolean} true — можно продолжать; false — уже отправлен 403 */
export function checkHallMapSaveAuth(req, res) {
  const expected = resolveHallMapSaveToken();
  if (!expected) return true;
  if (readHallMapSaveTokenFromRequest(req) === expected) return true;
  res.status(403).json({ ok: false, error: 'invalid save token' });
  return false;
}

export const HALL_MAP_SAVE_CORS_HEADERS =
  'content-type,x-luzhniki-svg-save-token,x-hall-map-save-token,x-vakhtangov-seats-save-token';
