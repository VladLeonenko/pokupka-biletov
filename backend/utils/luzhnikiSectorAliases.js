/**
 * Алиасы секторов Лужников: GetBilet ↔ layout.seats / SVG.
 * Генерация списка VIP: node scripts/audit-luzhniki-sector-normalize.js
 */

/** Секторы, у которых на схеме только «… VIP», а в оффере часто «сектор a107» без vip. */
export const LUZHNIKI_VIP_TRIBUNE_CODES = new Set([
  'vipa107',
  'vipa108',
  'vipa109',
  'vipa110',
  'vipc136',
  'vipc137',
]);

/** Доп. пары вне VIP (исторические расхождения GetBilet ↔ pbilet). */
export const LUZHNIKI_SECTOR_ALIAS_PAIRS = [
  ['vipc138', 'c138'],
];
