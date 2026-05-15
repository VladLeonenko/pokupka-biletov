/**
 * Одно поле описания для карточки каталога — без дублирования description/Description/heroDescription.
 * @param {Record<string, unknown>} out
 * @param {string} text
 * @param {{ asHero?: boolean }} [opts]
 */
export function applyCatalogCardDescription(out, text, opts = {}) {
  const short = String(text || '').trim();
  if (!short) return;
  const card = short.length > 380 ? `${short.slice(0, 377).trimEnd()}…` : short;
  out.shortDescription = card;
  if (opts.asHero) {
    out.HeroDescription = card;
  }
  delete out.description;
  delete out.Description;
  delete out.heroDescription;
}
