/**
 * Валидация и нормализация description_pack_json (офлайн OpenAI → БД → публичный контекст).
 */

/**
 * @param {unknown} raw
 * @returns {{ sections: { id: string; title: string; paragraphs: string[] }[]; totalChars: number; heroKicker: string | null; heroSubline: string | null; heroLead: string | null; eventMeta: { label: string; value: string }[] } | null}
 */
export function descPackFromStoredJson(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const sec = o.sections ?? o.descriptionSections;
  if (!Array.isArray(sec) || sec.length === 0) return null;

  /** @type {{ id: string; title: string; paragraphs: string[] }[]} */
  const sections = [];
  for (let i = 0; i < sec.length; i++) {
    const s = sec[i];
    if (!s || typeof s !== 'object') return null;
    const r = /** @type {Record<string, unknown>} */ (s);
    const title = String(r.title ?? '').trim();
    const paras = r.paragraphs;
    if (!title || !Array.isArray(paras) || paras.length === 0) return null;
    const paragraphs = paras.map((x) => String(x).trim()).filter(Boolean);
    if (paragraphs.length === 0) return null;
    const idRaw = r.id != null ? String(r.id).trim() : '';
    sections.push({
      id: idRaw || `stored-${i + 1}`,
      title,
      paragraphs,
    });
  }

  const plainLen =
    typeof o.totalChars === 'number' && Number.isFinite(o.totalChars) && o.totalChars > 0
      ? o.totalChars
      : null;

  let totalChars = plainLen ?? 0;
  if (!plainLen) {
    for (const s of sections) {
      totalChars += s.title.length + 2 + s.paragraphs.join('\n\n').length + 2;
    }
  }

  /** @type {{ label: string; value: string }[]} */
  const eventMeta = [];
  if (Array.isArray(o.eventMeta)) {
    for (const item of o.eventMeta) {
      if (!item || typeof item !== 'object') continue;
      const m = /** @type {Record<string, unknown>} */ (item);
      const label = String(m.label ?? m.Label ?? '').trim();
      const value = String(m.value ?? m.Value ?? '').trim();
      if (label && value) eventMeta.push({ label, value });
    }
  }

  const heroLead = o.heroLead != null ? String(o.heroLead).trim() || null : null;
  const heroKicker = o.heroKicker != null ? String(o.heroKicker).trim() || null : null;
  const heroSubline = o.heroSubline != null ? String(o.heroSubline).trim() || null : null;

  return {
    sections,
    totalChars,
    heroKicker,
    heroSubline,
    heroLead,
    eventMeta,
  };
}
