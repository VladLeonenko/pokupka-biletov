import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { HeroSlideView } from '@/types/ticketsVitrine';
import {
  eventCategoryPlaceholderUrl,
  resolveEventCoverUrl,
} from '@/utils/ticketsPlaceholders';
import { IMAGE_OPT, toWebpUrl } from '@/utils/optimizedImage';
import { TicketEventPosterImg } from './TicketEventPosterImg';
import styles from './NeglinkaHero.module.css';

type Props = {
  slides?: HeroSlideView[] | null;
  loading?: boolean;
  telegramUrl?: string | null;
  vkUrl?: string | null;
};

export function NeglinkaHero({ slides: slideInput, loading, telegramUrl, vkUrl }: Props) {
  /** padSlides уже в buildHeroSlides; без props — пустой массив */
  const slides = slideInput ?? [];

  const [idx, setIdx] = useState(0);
  const firstSlideId = slides[0]?.id ?? '';
  const current = slides[idx] ?? slides[0];

  const go = useCallback((d: -1 | 1) => {
    if (slides.length === 0) return;
    setIdx((i) => (i + d + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    setIdx(0);
  }, [firstSlideId]);

  const coverInput = current
    ? { title: current.title, imageUrl: current.imageUrl }
    : null;
  const img = coverInput ? resolveEventCoverUrl(coverInput) : '';
  const placeholderSrc = coverInput ? eventCategoryPlaceholderUrl(coverInput) : '';
  const heroBg =
    (img && toWebpUrl(img, { w: IMAGE_OPT.cover.w, q: IMAGE_OPT.cover.q })) || img || '';
  const heroStyle = heroBg
    ? ({
        '--hero-image': `url("${heroBg.replace(/["\\]/g, '')}")`,
      } as CSSProperties)
    : undefined;

  // LCP preload текущего + прогрев следующего слайда
  useEffect(() => {
    if (loading || !heroBg || typeof document === 'undefined') return;
    const id = 'tickets-hero-preload';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'preload';
      link.as = 'image';
      link.type = 'image/webp';
      document.head.appendChild(link);
    }
    try {
      const abs = new URL(heroBg, window.location.origin).href;
      if (link.href !== abs) link.href = heroBg;
    } catch {
      link.href = heroBg;
    }

    if (slides.length < 2) return;
    const next = slides[(idx + 1) % slides.length];
    if (!next) return;
    const nextCover = resolveEventCoverUrl({ title: next.title, imageUrl: next.imageUrl });
    const nextWebp = nextCover
      ? toWebpUrl(nextCover, { w: IMAGE_OPT.cover.w, q: IMAGE_OPT.cover.q })
      : null;
    if (!nextWebp) return;
    const t = window.setTimeout(() => {
      const imgEl = new Image();
      imgEl.decoding = 'async';
      imgEl.src = nextWebp;
    }, 300);
    return () => window.clearTimeout(t);
  }, [loading, heroBg, idx, slides]);

  if (loading) {
    return (
      <section className={styles.hero} data-tickets-hero aria-busy="true">
        <div className={styles.inner}>
          <div className={styles.skeletonLeft} />
          <div className={styles.skeletonVisual} data-shape="circle" />
        </div>
      </section>
    );
  }

  if (slides.length === 0 || !current) {
    return (
      <section className={styles.hero} data-tickets-hero>
        <div className={styles.inner}>
          <div className={styles.left}>
            <h1 className={styles.emptyTitle}>Нет событий на выбранную дату</h1>
            <p className={styles.emptyHint}>В ответе API нет даты для фильтра — сбросьте день или выберите другой.</p>
            <Link to="/" className={styles.cta}>
              Сбросить календарь
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const title = current.title;

  return (
    <section
      className={styles.hero}
      style={heroStyle}
      data-tickets-hero
    >
      <div className={styles.heroPhotoOverlay} aria-hidden />
      <div className={styles.heroBody}>
        <Link
          to={current.ticketHref}
          className={styles.heroClick}
          aria-label={`${current.ctaLabel}: ${title}`}
        />
        <div className={styles.inner}>
          <div className={styles.left}>
            <div className={styles.dateLine}>
              <span>{current.lineLeft}</span>
              <span className={styles.dateLineMid} />
              <span>{current.lineRight}</span>
            </div>

            <p className={styles.tags}>{current.tags}</p>

            {current.venueLabel || current.venueAddress ? (
              <p className={styles.venueInHero} data-hero-venue>
                {current.venueLabel ? <span className={styles.venueInHeroV}>{current.venueLabel}</span> : null}
                {current.venueAddress ? (
                  <span className={styles.venueInHeroAddr}>{current.venueAddress}</span>
                ) : null}
              </p>
            ) : null}

            <h1 className={styles.title}>{title}</h1>

            {current.description ? (
              <p className={styles.description}>{current.description}</p>
            ) : null}

            {(current.author || current.director) && (
              <div className={styles.credits}>
                {current.author && (
                  <div className={styles.creditBlock}>
                    <span className={styles.creditLabel}>Автор</span>
                    <span className={styles.creditVal}>{current.author}</span>
                  </div>
                )}
                {current.director && (
                  <div className={styles.creditBlock}>
                    <span className={styles.creditLabel}>Режиссёр</span>
                    <span className={styles.creditVal}>{current.director}</span>
                  </div>
                )}
              </div>
            )}

            <span className={styles.cta}>{current.ctaLabel}</span>
          </div>

          <div className={styles.right}>
            <div className={styles.visualFrame}>
              <TicketEventPosterImg
                src={img}
                fallbackSrc={placeholderSrc}
                gradientId={current.id}
                className={styles.visualImg}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                role="cover"
                width={480}
                height={640}
                alt=""
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.heroFooter}>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} aria-label="Предыдущий" onClick={() => go(-1)}>
            <svg className={styles.arrowSvg} viewBox="0 0 24 24" aria-hidden>
              <path
                d="M15 6L9 12l6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className={styles.arrow} aria-label="Следующий" onClick={() => go(1)}>
            <svg className={styles.arrowSvg} viewBox="0 0 24 24" aria-hidden>
              <path
                d="M9 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {(telegramUrl?.trim() || vkUrl?.trim()) && (
          <div className={styles.social}>
            {telegramUrl?.trim() ? (
              <a
                href={telegramUrl.trim()}
                target="_blank"
                rel="noreferrer"
                aria-label="Telegram"
                className={styles.soc}
              >
                TG
              </a>
            ) : null}
            {vkUrl?.trim() ? (
              <a href={vkUrl.trim()} target="_blank" rel="noreferrer" aria-label="VK" className={styles.soc}>
                VK
              </a>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
