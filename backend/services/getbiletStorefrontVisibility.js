/**
 * Публичная витрина: live-каталог GetBilet показываем всегда, кроме явного storefront_hidden.
 */

/** @param {unknown} row */
export function isStorefrontHidden(row) {
  if (!row || typeof row !== 'object') return false;
  const r = /** @type {Record<string, unknown>} */ (row);
  if (r.storefront_hidden === true) return true;
  return false;
}

/** Админский переключатель «Опубликовано» → явное скрытие с витрины. */
export function storefrontHiddenFromPublished(isPublished) {
  return isPublished === false;
}
