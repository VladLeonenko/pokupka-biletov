/** Канонический origin для SEO/JSON-LD (Vite подставляет VITE_SITE_URL при сборке). */
export function getSiteBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://biletvsem.com';
}

export const SITE_BRAND = 'Билет Всем';

export function defaultOgImageUrl(): string {
  return `${getSiteBaseUrl()}/favicon.svg`;
}
