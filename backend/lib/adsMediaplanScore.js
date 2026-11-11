/**
 * Оценка SEO-черновика медиаплана /10 — близко к seo-audit-score.js,
 * плюс эвристики «читабельности» (не канцелярит, не переспам).
 */

export function scoreSeoDraft({ title, description, h1, keywords, body } = {}) {
  const t = String(title || '').trim();
  const d = String(description || '').trim();
  const h = String(h1 || '').trim();
  const kw = String(keywords || '').trim();
  const b = String(body || '').trim();
  const kwParts = kw.split(',').map((x) => x.trim()).filter(Boolean);

  const checks = {
    titlePresent: t.length >= 12,
    titleLenOk: t.length > 0 && t.length <= 70,
    titleCommercial: /билет|купить/i.test(t),
    titleNoOfficial: !/официальн/i.test(t),
    titleNoOfficialPhrase: !/касса театра/i.test(`${t} ${d}`),
    descPresent: d.length >= 80,
    descLenOk: d.length > 0 && d.length <= 165,
    descMechanics: /схема зала|электронный билет|оплат/i.test(d),
    descReadable: !/удобный выбор мест/i.test(d) && !/ bilетный сервис, не касса/i.test(d),
    h1Present: h.length >= 2 && h.length <= 80,
    h1NotEqualsTitle: !h || h.toLowerCase() !== t.toLowerCase() || h.length < 40,
    kwPresent: kwParts.length >= 3,
    kwHasBilety: /билет/i.test(kw),
    kwTokensShort: kwParts.every((p) => p.length <= 55),
    bodyLiterary:
      !b ||
      (b.length >= 120 &&
        !/кликабельн|трафик|конверси|целевая аудитория|seo-оптимиз/i.test(b) &&
        /[.!?]/.test(b)),
  };

  const keys = Object.keys(checks);
  const pass = keys.filter((k) => checks[k]).length;
  const score10 = Math.round((pass / keys.length) * 100) / 10;
  const fail = keys.filter((k) => !checks[k]);
  return { score10, pass, total: keys.length, fail, checks };
}
