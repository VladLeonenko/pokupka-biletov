const DEFAULT_FALLBACK = '/legacy/img/online-shop.png';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

import { getApiBase as getApiBaseUtil } from './apiBase';

const getApiBase = () => {
  const base = getApiBaseUtil();
  // Для resolveImageUrl нужен абсолютный URL в некоторых случаях
  // Если base пустой, используем window.location.origin
  if (!base && typeof window !== 'undefined' && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }
  return base ? trimTrailingSlash(base) : '';
};

export const resolveImageUrl = (path?: string | null, fallback: string = DEFAULT_FALLBACK): string => {
  if (!path || typeof path !== 'string' || path.trim().length === 0) {
    // Если fallback тоже пустой, возвращаем дефолтный
    return fallback && fallback.trim().length > 0 ? fallback : DEFAULT_FALLBACK;
  }

  const trimmedPath = path.trim();

  // Если это внешний URL, возвращаем как есть
  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const normalisedPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;

  // Для путей /uploads/ используем универсальный подход:
  // - В dev: добавляем API base (бэкенд на localhost:3000)
  // - В prod: если задан VITE_API_URL - используем его, иначе window.location.origin
  // Это работает как для моно-домена (frontend + backend), так и для разделенных
  if (normalisedPath.startsWith('/uploads/')) {
    const base = getApiBase();
    // Если base есть, используем его (универсально для dev и prod)
    // Если нет (не должно быть в нормальных условиях), возвращаем относительный путь
    return base ? `${base}${normalisedPath}` : normalisedPath;
  }

  // Для статических файлов в /legacy/ не добавляем API base
  // Они должны быть доступны напрямую через статику
  if (normalisedPath.startsWith('/legacy/')) {
    return normalisedPath;
  }

  // Для остальных путей используем API base только если это не статика
  const base = getApiBase();

  if (!base) {
    return normalisedPath;
  }

  return `${base}${normalisedPath}`;
};

export const fallbackImageUrl = () => DEFAULT_FALLBACK;

