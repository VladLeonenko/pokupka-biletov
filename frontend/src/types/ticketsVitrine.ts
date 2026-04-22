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
};

export type HeroSlideView = {
  id: string;
  title: string;
  imageUrl: string | null;
  tags: string;
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
