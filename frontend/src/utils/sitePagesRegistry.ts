import type { SitePage } from '@/types/cms';

/**
 * Публичные маршруты приложения (см. AppRoutes.tsx).
 * При добавлении нового публичного <Route> — добавьте сюда строку,
 * чтобы страница появилась в админке «Страницы».
 */
export type PublicRouteDef = { path: string; title: string };

/** Публичные маршруты этого продукта (афиша, магазин, ЛК, юридические). Легаси из других вёрсток не перечисляем — см. AppRoutes.tsx. */
export const PUBLIC_SITE_ROUTES: readonly PublicRouteDef[] = [
  { path: '/', title: 'Главная' },
  { path: '/afisha', title: 'Афиша' },
  { path: '/events', title: 'Мероприятия' },
  { path: '/ticket/:repertoireId', title: 'Билет (оформление)' },
  { path: '/catalog', title: 'Каталог' },
  { path: '/products/:slug', title: 'Товар (slug)' },
  { path: '/cart', title: 'Корзина' },
  { path: '/wishlist', title: 'Избранное' },
  { path: '/search', title: 'Поиск' },
  { path: '/account', title: 'Личный кабинет' },
  { path: '/account/privacy-settings', title: 'ЛК — настройки приватности' },
  { path: '/politic', title: 'Политика конфиденциальности' },
  { path: '/privacy', title: 'Политика (alias)' },
  { path: '/offer', title: 'Публичная оферта' },
  { path: '/cookies', title: 'Политика cookie' },
  { path: '/requisites', title: 'Реквизиты' },
  { path: '/register', title: 'Регистрация' },
  { path: '/auth/magic', title: 'Вход по ссылке' },
  { path: '/auth/request-link', title: 'Запрос ссылки для входа' },
  { path: '/auth/forgot-password', title: 'Восстановление пароля' },
  { path: '/auth/reset-password', title: 'Новый пароль' },
  { path: '/orders/:orderNumber', title: 'Заказ (номер)' },
  { path: '/blog', title: 'Блог' },
  { path: '/blog/:slug', title: 'Статья блога (slug)' },
  { path: '/contacts', title: 'Контакты' },
  { path: '/returns', title: 'Возврат и обмен билетов' },
  { path: '/faq', title: 'Частые вопросы' },
  { path: '/404', title: 'Страница 404' },
];

export type SitePageListEntry = SitePage & {
  /** cms — строка в БД; static — только маршрут в React, без записи в pages */
  listSource: 'cms' | 'static';
};

export function normalizePagePath(path: string): string {
  const s = (path || '').trim();
  if (!s || s === '/') return '/';
  const withSlash = s.startsWith('/') ? s : `/${s}`;
  if (withSlash.length > 1 && withSlash.endsWith('/')) {
    return withSlash.replace(/\/+$/, '');
  }
  return withSlash;
}

function syntheticStatic(entry: PublicRouteDef): SitePageListEntry {
  return {
    id: entry.path,
    path: entry.path,
    title: entry.title,
    html: '',
    seo: {},
    isPublished: true,
    listSource: 'static',
  };
}

/**
 * Объединяет страницы из API с реестром публичных маршрутов.
 * Запись CMS перекрывает статический элемент с тем же путём.
 * Страницы только из CMS (например slug под /:slug) добавляются в конец.
 */
export function mergeSitePagesWithRegistry(cmsPages: SitePage[]): SitePageListEntry[] {
  const cmsByNorm = new Map<string, SitePage>();
  for (const p of cmsPages) {
    const key = normalizePagePath(p.path || p.id);
    cmsByNorm.set(key, p);
  }

  const fromManifest: SitePageListEntry[] = PUBLIC_SITE_ROUTES.map((def) => {
    const key = normalizePagePath(def.path);
    const cms = cmsByNorm.get(key);
    if (cms) {
      return { ...cms, listSource: 'cms' as const };
    }
    return syntheticStatic(def);
  });

  const seen = new Set(fromManifest.map((p) => normalizePagePath(p.path || p.id)));
  const cmsOnly: SitePageListEntry[] = [];

  for (const p of cmsPages) {
    const key = normalizePagePath(p.path || p.id);
    if (!seen.has(key)) {
      cmsOnly.push({ ...p, listSource: 'cms' });
      seen.add(key);
    }
  }

  const merged = [...fromManifest, ...cmsOnly];
  merged.sort((a, b) =>
    normalizePagePath(a.path || a.id).localeCompare(normalizePagePath(b.path || b.id), 'ru', {
      sensitivity: 'base',
    }),
  );
  return merged;
}

/** Маршрут с :param нельзя открыть в браузере без подстановки */
export function isParameterizedRoute(path: string): boolean {
  return (path || '').includes(':');
}
