import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { defaultOgImageUrl, getSiteBaseUrl, SITE_BRAND } from '@/config/site';

const NOINDEX_PATHS = [
  '/admin',
  '/account',
  '/cart',
  '/wishlist',
  '/register',
  '/auth',
  '/orders',
  '/commercial-proposals',
  '/tools',
  '/ai-chat',
  '/404',
];

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Билеты на концерты, театр и шоу - афиша и лучшие места',
    description:
      'Покупайте билеты онлайн за пару минут: актуальная афиша, удобный выбор мест и быстрая оплата.',
  },
  '/events': {
    title: 'Афиша мероприятий - концерты, театр, шоу и спорт',
    description:
      'Найдите событие по дате, площадке или жанру и оформите билет онлайн без лишних шагов.',
  },
  '/search': {
    title: 'Поиск билетов на мероприятия',
    description:
      'Быстрый поиск билетов на концерты, спектакли и шоу: выбирайте событие и бронируйте лучшие места.',
  },
  '/afisha': {
    title: 'Афиша мероприятий - концерты, театр, шоу и спорт',
    description:
      'Полная афиша событий с удобной фильтрацией и покупкой билетов онлайн без лишних шагов.',
  },
  '/contacts': {
    title: 'Контакты - поддержка Билет Всем',
    description:
      'Свяжитесь с нами по вопросам заказа, оплаты и возврата билетов. Поможем быстро и по делу.',
  },
  '/faq': {
    title: 'FAQ - как купить, оплатить и вернуть билет',
    description:
      'Понятные ответы на частые вопросы: оформление заказа, оплата, доставка электронного билета и возврат.',
  },
  '/returns': {
    title: 'Возврат билетов - условия и порядок',
    description:
      'Правила возврата и обмена билетов: сроки, условия и пошаговый порядок оформления заявки.',
  },
  '/offer': {
    title: 'Публичная оферта - Билет Всем',
    description:
      'Официальные условия сервиса Билет Всем: порядок покупки билетов, оплаты и предоставления услуг.',
  },
  '/privacy': {
    title: 'Политика конфиденциальности',
    description:
      'Как мы обрабатываем и защищаем персональные данные пользователей сервиса Билет Всем.',
  },
  '/politic': {
    title: 'Политика конфиденциальности',
    description:
      'Как мы обрабатываем и защищаем персональные данные пользователей сервиса Билет Всем.',
  },
  '/cookies': {
    title: 'Политика cookies',
    description:
      'Информация об использовании cookie-файлов и настройках согласия на сайте Билет Всем.',
  },
  '/requisites': {
    title: 'Реквизиты компании - Билет Всем',
    description:
      'Официальные реквизиты и юридическая информация сервиса Билет Всем.',
  },
  '/charity': {
    title: 'Благотворительность - Билет Всем',
    description:
      'Социальные и благотворительные инициативы сервиса Билет Всем.',
  },
};

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}

function escapeJson(value: string): string {
  return value.replace(/</g, '\\u003c');
}

export function RouteSeoDefaults() {
  const location = useLocation();

  const meta = useMemo(() => {
    const path = normalizePath(location.pathname);
    const custom = PAGE_META[path];
    const isEventsSubroute =
      path.startsWith('/events/city/') ||
      path.startsWith('/events/genre/') ||
      path.startsWith('/events/venue/');
    const isTicketRoute = path.startsWith('/ticket/');
    const isPublicBlogPage = path === '/blog' || path.startsWith('/blog/');
    const isPublicAiLanding = path === '/ai-team' || path === '/ai-team-v2';

    const title = custom?.title
      ?? (isEventsSubroute
        ? 'Афиша по фильтру - актуальные билеты на события'
        : isPublicBlogPage
          ? 'Блог Билет Всем - новости, гиды и советы по мероприятиям'
          : isPublicAiLanding
            ? 'AI Team - интеллектуальные инструменты для роста бизнеса'
        : isTicketRoute
          ? 'Купить билет онлайн - выбор мест и безопасная оплата'
          : `${SITE_BRAND} - билеты на мероприятия онлайн`);
    const description =
      custom?.description ??
      (isEventsSubroute
        ? 'Подборка мероприятий по вашему фильтру: удобный выбор события, мест и быстрая покупка билетов онлайн.'
        : isPublicBlogPage
          ? 'Полезные статьи, кейсы и практические рекомендации для организаторов и зрителей.'
          : isPublicAiLanding
            ? 'Платформа AI-инструментов для автоматизации процессов, аналитики и роста конверсии.'
        : isTicketRoute
          ? 'Оформите билет онлайн: выберите удобные места, оплатите за пару минут и получите электронный билет.'
          : 'Покупка билетов на концерты, театр и мероприятия онлайн с удобным выбором мест и моментальным оформлением.');
    const noindex = NOINDEX_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    return { path, title, description, noindex };
  }, [location.pathname]);

  useEffect(() => {
    const baseUrl = getSiteBaseUrl();
    const canonicalUrl = `${baseUrl}${meta.path === '/' ? '/' : meta.path}`;
    const defaultImage = defaultOgImageUrl();

    const setMetaTag = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const setLinkTag = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      let link = document.querySelector(selector);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        if (hreflang) link.setAttribute('hreflang', hreflang);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    document.title = meta.title;
    setMetaTag('description', meta.description);
    setMetaTag('robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:site_name', SITE_BRAND, true);
    setMetaTag('og:locale', 'ru_RU', true);
    setMetaTag('og:title', meta.title, true);
    setMetaTag('og:description', meta.description, true);
    setMetaTag('og:url', canonicalUrl, true);
    setMetaTag('og:image', defaultImage, true);
    setMetaTag('og:image:alt', `${meta.title} - ${SITE_BRAND}`, true);
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', meta.title);
    setMetaTag('twitter:description', meta.description);
    setMetaTag('twitter:image', defaultImage);
    setMetaTag('twitter:url', canonicalUrl);
    setLinkTag('canonical', canonicalUrl);
    setLinkTag('alternate', canonicalUrl, 'ru-RU');
    setLinkTag('alternate', canonicalUrl, 'x-default');

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: meta.title,
      description: meta.description,
      url: canonicalUrl,
      inLanguage: 'ru-RU',
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_BRAND,
        url: `${baseUrl}/`,
      },
    };

    let schema = document.querySelector(
      'script[type="application/ld+json"][data-route-seo-schema]',
    ) as HTMLScriptElement | null;
    if (!schema) {
      schema = document.createElement('script');
      schema.type = 'application/ld+json';
      schema.setAttribute('data-route-seo-schema', 'true');
      document.head.appendChild(schema);
    }
    schema.textContent = escapeJson(JSON.stringify(schemaData));
  }, [meta]);

  return null;
}
