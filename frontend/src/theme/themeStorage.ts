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
  admin: 'light',
};

/** Сброс автосохранённой тёмной темы админки на светлую по умолчанию. Дальше переключатель помнит выбор. */
const ADMIN_THEME_REV = '2';

export function readAdminThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    if (localStorage.getItem('admin.theme.rev') !== ADMIN_THEME_REV) {
      localStorage.setItem('admin.theme.rev', ADMIN_THEME_REV);
      localStorage.setItem('admin.theme', 'light');
      return 'light';
    }
    const stored = localStorage.getItem(THEME_KEYS.admin);
    if (isThemeMode(stored)) return stored;
  } catch {
    /* private mode */
  }
  return 'light';
}

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
