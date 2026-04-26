/** Канонический домен и бренд для SEO, sitemap, SSR-мета. */
export function siteBaseUrl() {
  return (process.env.SITE_URL || 'https://biletvsem.com').replace(/\/$/, '');
}

export function siteBrand() {
  return (process.env.SITE_BRAND || 'Билет Всем').trim();
}
