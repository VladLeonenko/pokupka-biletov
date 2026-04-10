/**
 * Цвета для блока «Основные показатели»: на тёмном фоне слишком тёмный palette[0]
 * нечитаем — подбираем гармоничный акцент без «кислоты».
 */

const FALLBACK = '#d9a84a';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, '');
  if (h.length === 6 || h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return null;
}

/** WCAG relative luminance 0..1 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hh / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

function formatHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function luminanceFromHex(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return 0;
  return relativeLuminance(rgb.r, rgb.g, rgb.b);
}

/**
 * Осветляет слишком тёмный цвет, сохраняя оттенок; без неоновых насыщенностей.
 */
export function liftAccentForDarkBackground(hex: string): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return FALLBACK;
  let { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
  if (lum >= 0.22) return formatHex(rgb.r, rgb.g, rgb.b);

  const targetL = clamp(0.52 + (0.22 - lum) * 0.35, 0.5, 0.62);
  const targetS = clamp(s * 0.92 + 0.06, 0.36, 0.68);
  const out = hslToRgb(h, targetS, Math.max(l, targetL));
  return formatHex(out.r, out.g, out.b);
}

export type PaletteEntry = { color?: string | null };

/**
 * Берёт первый цвет палитры; если он почти не виден на #141414 — использует
 * третий слот палитры (часто акцентный), иначе осветляет hue primary.
 */
export function pickPerformanceAccent(palette: PaletteEntry[]): string {
  const primary = palette[0]?.color?.trim();
  const tertiary = palette[2]?.color?.trim();

  if (!primary) return FALLBACK;

  const lumP = luminanceFromHex(primary);
  if (lumP >= 0.22) return primary;

  if (tertiary) {
    const lumT = luminanceFromHex(tertiary);
    if (lumT >= 0.26 && lumT > lumP + 0.06) return tertiary;
  }

  return liftAccentForDarkBackground(primary);
}

/** Полупрозрачный вариант акцента для «Нормально» / good */
export function accentWithAlpha(hex: string, alpha: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return `rgba(217, 168, 74, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
