/** Ручной ключ в URL (/ticket/luzhniki-cup-final-2026), не mongo id GetBilet. */
export function isManualRepertoireKey(id) {
  const t = String(id || '').trim();
  if (t.length < 8 || t.length > 130) return false;
  if (/^[a-f0-9]{24}$/i.test(t)) return false;
  return /^[a-z0-9][a-z0-9-]*$/i.test(t) && t.includes('-');
}
