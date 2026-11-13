export type ThemeMode = 'light' | 'dark';
export type ThemeScope = 'public' | 'admin';

const THEME_KEYS: Record<ThemeScope, string> = {
  public: 'public.theme',
  admin: 'admin.theme',
};

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

const DEFAULT_THEME: Record<ThemeScope, ThemeMode> = {
  public: 'dark',
  admin: 'dark',
};

export function readStoredThemeMode(scope: ThemeScope = 'public'): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_THEME[scope];
  try {
    const scopedValue = localStorage.getItem(THEME_KEYS[scope]);
    if (isThemeMode(scopedValue)) return scopedValue;
  } catch {
    /* private mode */
  }
  return DEFAULT_THEME[scope];
}

export function persistThemeMode(mode: ThemeMode, scope: ThemeScope = 'public'): void {
  try {
    localStorage.setItem(THEME_KEYS[scope], mode);
  } catch {
    /* private mode */
  }
}
