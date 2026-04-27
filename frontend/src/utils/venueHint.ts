/**
 * Площадка, если GetBilet не отдал PlaceName: скобки в названии, «Театра …» в хвосте, арена/стадион.
 * Используется в нормализации афиши, карточках и hero, чтобы площадка не пропадала в UI.
 */
export function hintVenueFromTitle(title: string | undefined | null): string | null {
  if (!title?.trim()) return null;
  const t = title.trim();

  const paren = hintFromParentheses(t);
  if (paren) return paren;

  return hintFromTeatraSuffix(t);
}

function hintFromParentheses(t: string): string | null {
  const matches = [...t.matchAll(/\(([^)]+)\)/g)];
  for (let i = matches.length - 1; i >= 0; i--) {
    const inner = matches[i][1]?.trim() ?? '';
    if (inner.length < 4) continue;
    if (/^\d{1,2}\s*\+$/.test(inner.replace(/\s/g, ''))) continue;
    if (
      /гастрол|театр|арен[аы]|стадио|филармон|кремл|цирк|двор|зал[ае]?[мя]?|площад|музей|опер|балет/i.test(
        inner,
      )
    ) {
      return inner;
    }
  }
  return null;
}

/** «Гала-концерт Театра балета Бориса Эйфмана» — без скобок */
function hintFromTeatraSuffix(t: string): string | null {
  const idx = t.search(/\bТеатра\s+/i);
  if (idx < 0) return null;
  let rest = t.slice(idx).trim();
  rest = rest.replace(/\s*[·—]\s*.*$/u, '').replace(/\s*\.{3,}\s*.*$/, '');
  rest = rest.replace(/[.!?…]+$/g, '').trim();
  if (rest.length >= 8) return rest;
  return null;
}

/**
 * @returns Строка площадки или null
 */
export function resolveVenueDisplay(venue: string | undefined, title: string | undefined): string | null {
  const v = typeof venue === 'string' ? venue.trim() : '';
  if (v) return v;
  return hintVenueFromTitle(title);
}
