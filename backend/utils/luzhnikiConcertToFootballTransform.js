/**
 * Концертная схема Яндекс (viewBox 9699×7980) → координаты luzhniki-football (11413×9676).
 * Подогнано по общим секторам A/C/D (mean centroid err ≈ 44px).
 *
 * fx ≈ 11420 − cy; fy ≈ cx  (≈ поворот 90° CW + сдвиг)
 */

export const LUZHNIKI_FOOTBALL_VIEWBOX = { width: 11413, height: 9676 };
export const LUZHNIKI_CONCERT_VIEWBOX = { width: 9699, height: 7980 };

/** x' = a*x + b*y + c ; y' = d*x + e*y + f */
export const CONCERT_TO_FOOTBALL_AFFINE = {
  a: -0.0007783064999249412,
  b: -0.9944051013673472,
  c: 11419.6173135515,
  d: 1.0049377563550046,
  e: 0.000011029932150176131,
  f: -27.08874146664111,
};

export function transformConcertPoint(x, y, aff = CONCERT_TO_FOOTBALL_AFFINE) {
  return {
    x: aff.a * x + aff.b * y + aff.c,
    y: aff.d * x + aff.e * y + aff.f,
  };
}

/**
 * Трансформ absolute SVG path `d` (M/L/C/Q/H/V/Z, числа парами).
 * Relative-команды (m/l/c…) не поддерживаются — концертная схема их не использует.
 */
export function transformAbsoluteSvgPathD(d, aff = CONCERT_TO_FOOTBALL_AFFINE) {
  const src = String(d || '').trim();
  if (!src) return src;

  const tokens = src.match(/[MmLlHhVvCcQqSsTtAaZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens?.length) return src;

  const out = [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;

  const num = () => {
    const v = Number(tokens[i++]);
    if (!Number.isFinite(v)) throw new Error(`bad path number near: ${tokens.slice(Math.max(0, i - 3), i + 3).join(' ')}`);
    return v;
  };

  const pushPoint = (px, py) => {
    const t = transformConcertPoint(px, py, aff);
    x = px;
    y = py;
    out.push(Number(t.x.toFixed(3)), Number(t.y.toFixed(3)));
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[MmLlHhVvCcQqSsTtAaZz]$/.test(t)) {
      cmd = t;
      i += 1;
      if (cmd === 'Z' || cmd === 'z') {
        out.push('Z');
        continue;
      }
      if (cmd !== cmd.toUpperCase()) {
        throw new Error(`relative path command "${cmd}" not supported`);
      }
    }
    if (!cmd) throw new Error('path starts without command');

    switch (cmd) {
      case 'M':
      case 'L': {
        const px = num();
        const py = num();
        out.push(cmd === 'M' && out.length === 0 ? 'M' : cmd === 'M' ? 'M' : 'L');
        // after first M pair, subsequent pairs are implicit L
        pushPoint(px, py);
        if (cmd === 'M') cmd = 'L';
        break;
      }
      case 'H': {
        const px = num();
        out.push('L');
        pushPoint(px, y);
        break;
      }
      case 'V': {
        const py = num();
        out.push('L');
        pushPoint(x, py);
        break;
      }
      case 'C': {
        out.push('C');
        for (let k = 0; k < 3; k += 1) pushPoint(num(), num());
        break;
      }
      case 'Q':
      case 'S': {
        out.push(cmd);
        for (let k = 0; k < 2; k += 1) pushPoint(num(), num());
        break;
      }
      case 'T': {
        out.push('T');
        pushPoint(num(), num());
        break;
      }
      default:
        throw new Error(`unsupported path command "${cmd}"`);
    }
  }

  // serialize: command then numbers
  let s = '';
  for (const tok of out) {
    if (typeof tok === 'string') s += (s ? ' ' : '') + tok;
    else s += ` ${tok}`;
  }
  return s.trim();
}

export function transformConcertSectorPath(pathD) {
  return transformAbsoluteSvgPathD(pathD, CONCERT_TO_FOOTBALL_AFFINE);
}

/**
 * Football → концертный вид «сцена снизу» (как Яндекс): 90° CW + swap сторон.
 * (x,y) в 0..W×0..H → (y, W−x) в 0..H×0..W.
 */
export function footballPointToConcertStageBottom(x, y, vb = LUZHNIKI_FOOTBALL_VIEWBOX) {
  const W = vb.width;
  return { x: y, y: W - x };
}

/** xPct/yPct в football → pct в concert stage-bottom (viewBox H×W). */
export function footballPctToConcertStageBottom(xPct, yPct) {
  return { xPct: Number(yPct), yPct: 100 - Number(xPct) };
}

export const LUZHNIKI_CONCERT_STAGE_BOTTOM_VIEWBOX = {
  width: LUZHNIKI_FOOTBALL_VIEWBOX.height,
  height: LUZHNIKI_FOOTBALL_VIEWBOX.width,
};

/** Affine: x' = 0*x + 1*y + 0; y' = -1*x + 0*y + W */
export function footballPathToConcertStageBottom(pathD, vb = LUZHNIKI_FOOTBALL_VIEWBOX) {
  return transformAbsoluteSvgPathD(pathD, {
    a: 0,
    b: 1,
    c: 0,
    d: -1,
    e: 0,
    f: vb.width,
  });
}
