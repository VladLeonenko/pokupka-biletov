/** Контент витрины билетов (хранится в БД как JSON, редактируется в админке) */
/** Форма кадра постера в hero: круг или декоративный clip-path */
export type HeroVisualShape = 'circle' | 'shard' | 'chevron';

export type CmsHeroSlide = {
  title?: string;
  imageUrl?: string;
  tags?: string;
  author?: string;
  director?: string;
  lineLeft?: string;
  /** Месяц.год справа в линии даты (как на референсе «05.2026») */
  lineRight?: string;
  visualShape?: HeroVisualShape;
  /** id события из каталога — подтянуть недостающие поля с витрины */
  ticketId?: string;
  /** Полный URL или путь, например /events?q=театр */
  ctaHref?: string;
  ctaLabel?: string;
};

export type TicketsVitrineContent = {
  /** Города для селектора, если GET /api/bilet/cities недоступен (rest_v2) или как доп. подписи */
  cities?: { id: string; label: string }[];
  /**
   * Порядок строк = порядок плашек и каруселей.
   * q — полнотекстовый поиск; genre — чип жанра на /events.
   * showInHeader / showOnHome: false = не показывать (по умолчанию оба видны).
   */
  directions?: {
    label: string;
    q?: string;
    genre?: string;
    showInHeader?: boolean;
    showOnHome?: boolean;
  }[];
  heroSlides?: CmsHeroSlide[];
  header?: {
    logoTitle?: string;
    logoSub?: string;
    /** Полный URL или путь `/uploads/…` — картинка логотипа в шапке */
    logoImageUrl?: string;
    /** При заданной картинке: показывать рядом строки logoTitle / logoSub (иначе только картинка) */
    logoShowTextWithImage?: boolean;
    /** Положение блока логотипа в верхней строке шапки */
    logoPlacement?: 'left' | 'center';
    /** Иконка вкладки (URL или `/uploads/…`); для билетной витрины подменяет `/favicon.svg` */
    faviconUrl?: string;
  };
  contacts?: {
    pageTitle?: string;
    intro?: string;
    address?: string;
    phone?: string;
    email?: string;
    hours?: string;
    formTitle?: string;
  };
  footer?: {
    brand?: string;
    tagline?: string;
    copy?: string;
  };
  /** HTML для /politic и /privacy */
  privacyHtml?: string;
  /** Публичная оферта / пользовательское соглашение — /offer */
  publicOfferHtml?: string;
  /** Политика cookies — /cookies */
  cookiesPolicyHtml?: string;
  /** Возврат и обмен — при заполнении заменяет встроенный шаблон на /returns */
  returnsPolicyHtml?: string;
  /** Реквизиты и сведения об операторе — /requisites */
  requisitesHtml?: string;
};

export type HeroSlideView = {
  id: string;
  title: string;
  imageUrl: string | null;
  tags: string;
  /** Площадка — отдельно от `tags`, всегда видна (подготовлено в buildHeroSlides). */
  venueLabel?: string | null;
  /** Адрес площадки (GetStageList / enrich). */
  venueAddress?: string | null;
  /** Краткое описание для главного hero. */
  description?: string;
  author?: string | null;
  director?: string | null;
  /** Обычно число дня или «15, 21» */
  lineLeft: string;
  /** Правая часть линии: MM.yyyy */
  lineRight: string;
  visualShape: HeroVisualShape;
  ticketHref: string;
  ctaLabel: string;
};
