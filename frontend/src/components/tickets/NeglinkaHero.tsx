import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HeroSlideView } from '@/types/ticketsVitrine';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';
import { TicketEventPosterImg } from './TicketEventPosterImg';
import styles from './NeglinkaHero.module.css';

type Props = {
  slides?: HeroSlideView[] | null;
  loading?: boolean;
};

export function NeglinkaHero({ slides: slideInput, loading }: Props) {
  /** padSlides уже в buildHeroSlides; без props — пустой массив */
  const slides = slideInput ?? [];

  const [idx, setIdx] = useState(0);
  const [pauseAutoplay, setPauseAutoplay] = useState(false);
  const current = slides[idx] ?? slides[0];

  const go = (d: -1 | 1) => {
    if (slides.length === 0) return;
    setIdx((i) => (i + d + slides.length) % slides.length);
  };

  useEffect(() => {
    if (loading || slides.length <= 1 || pauseAutoplay) return;
    const ms = 6500;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, ms);
    return () => clearInterval(id);
  }, [loading, slides.length, pauseAutoplay]);

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

  if (slides.length === 0) {
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
  const img = current.imageUrl;

  return (
    <section
      className={styles.hero}
      data-tickets-hero
      onMouseEnter={() => setPauseAutoplay(true)}
      onMouseLeave={() => setPauseAutoplay(false)}
    >
      {img ? (
        <div
          className={styles.heroPhotoBg}
          style={{ backgroundImage: `url(${img})` }}
          aria-hidden
        />
      ) : null}
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
              {img ? (
                <TicketEventPosterImg
                  src={img}
                  gradientId={current.id}
                  className={styles.visualImg}
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div
                  className={styles.visualImg}
                  style={{ background: posterGradientFromId(current.id) }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.heroFooter}>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} aria-label="Предыдущий" onClick={() => go(-1)}>
            <svg className={styles.arrowSvg} viewBox="0 0 96 14" aria-hidden>
              <path
                d="M 88 7 H 20 M 20 1 L 8 7 L 20 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className={styles.arrow} aria-label="Следующий" onClick={() => go(1)}>
            <svg className={styles.arrowSvg} viewBox="0 0 96 14" aria-hidden>
              <path
                d="M 8 7 H 76 M 76 1 L 88 7 L 76 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className={styles.social}>
          <a href="https://t.me" target="_blank" rel="noreferrer" aria-label="Telegram" className={styles.soc}>
            TG
          </a>
          <a href="https://vk.com" target="_blank" rel="noreferrer" aria-label="VK" className={styles.soc}>
            VK
          </a>
        </div>
      </div>
    </section>
  );
}
