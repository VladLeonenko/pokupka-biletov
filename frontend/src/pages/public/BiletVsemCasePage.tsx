import { Link } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { CaseStudyJsonLd } from '@/components/common/CaseStudyJsonLd';
import { getSiteBaseUrl, SITE_BRAND } from '@/config/site';
import styles from './BiletVsemCasePage.module.css';

const PRIME = 'https://prime-coder.ru';
const PRIME_REACT = 'https://prime-coder.ru/products/react-prilozhenie';

const STACK = [
  'React 18 + Vite',
  'TypeScript',
  'Node.js / Express API',
  'PostgreSQL',
  'MUI + CSS Modules',
  'SSR meta / JSON-LD',
  'PM2 + nginx',
  'GetBilet / платёжный шлюз',
];

const HIGHLIGHTS = [
  {
    title: 'Схемы стадионов уровня Яндекса',
    text: 'Интерактивные SVG/canvas-карты с десятками тысяч мест: сектора, ряды, цветовая легенда по цене, fullscreen, hold мест и нормализация алиасов площадок (Лужники football/concert и др.). Не «картинка с точками», а продающий UX выбора места.',
  },
  {
    title: 'Витрина + админка + API',
    text: 'Публичная афиша, карточка события, бронирование и оплата; админ-панель контента витрины, репертуара и схем; REST API для каталога, офферов, seat hold и checkout — единый продукт, а не лендинг поверх чужой системы.',
  },
  {
    title: 'SEO и скорость покупки',
    text: 'ЧПУ событий, sitemap, Event/Offer schema, SSR head для краулеров. На стороне UX — sticky-корзина, таймер брони, промокоды, gift-билеты, FAN ID там, где нужно организатору.',
  },
];

const METRICS = [
  { value: '77k+', label: 'точек на схеме стадиона' },
  { value: '< 3 мин', label: 'путь от афиши до оплаты' },
  { value: 'SSR', label: 'meta + JSON-LD для поиска' },
  { value: '1 код', label: 'витрина · админка · API' },
];

export function BiletVsemCasePage() {
  const origin = getSiteBaseUrl();
  const pageUrl = `${origin}/case/bilet-vsem`;
  const title = `Кейс ${SITE_BRAND}: билетная платформа с схемами стадионов | PrimeCoder`;
  const description =
    'Кейс разработки билетной платформы «Билет Всем»: интерактивные схемы залов и стадионов, витрина, админка и API. Реализация PrimeCoder — React, Node.js, PostgreSQL.';

  return (
    <>
      <SeoMetaTags
        title={title}
        description={description}
        keywords="кейс билетная платформа, схема стадиона, React билеты, разработка афиши, PrimeCoder, Билет Всем"
        url={pageUrl}
        image={`${origin}/favicon.svg`}
      />
      <CaseStudyJsonLd
        name={`Кейс: билетная платформа ${SITE_BRAND}`}
        description={description}
        url={pageUrl}
        image={`${origin}/favicon.svg`}
        datePublished="2026-01-15"
        authorName="PrimeCoder"
        authorUrl={PRIME}
      />

      <article className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden />
          <p className={styles.kicker}>Кейс · продукт под ключ</p>
          <h1 className={styles.title}>
            {SITE_BRAND}
            <span className={styles.titleAccent}> — билетная платформа</span>
          </h1>
          <p className={styles.lead}>
            Полный цикл покупки билетов: афиша, карточка события, интерактивная схема зала/стадиона,
            бронь мест, оплата и электронный билет. Спроектировано и разработано{' '}
            <a href={PRIME} target="_blank" rel="noopener noreferrer">
              PrimeCoder
            </a>
            .
          </p>
          <div className={styles.heroCtas}>
            <a className={styles.btnPrimary} href={PRIME} target="_blank" rel="noopener noreferrer">
              Сайт разработчика
            </a>
            <a className={styles.btnGhost} href={PRIME_REACT} target="_blank" rel="noopener noreferrer">
              React / Next.js под ключ
            </a>
            <Link className={styles.btnGhost} to="/">
              Открыть афишу
            </Link>
          </div>
        </header>

        <section className={styles.metrics} aria-label="Ключевые цифры">
          {METRICS.map((m) => (
            <div key={m.label} className={styles.metric}>
              <div className={styles.metricValue}>{m.value}</div>
              <div className={styles.metricLabel}>{m.label}</div>
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Задача</h2>
          <p className={styles.prose}>
            Собрать продающую витрину билетов, где пользователь за минуты находит событие, видит реальную
            схему площадки и оплачивает выбранные места — без «оставьте заявку, менеджер перезвонит».
            Параллельно — админка контента и API интеграций с поставщиком билетов и платежами.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Что получилось</h2>
          <div className={styles.cards}>
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className={styles.card}>
                <h3 className={styles.h3}>{h.title}</h3>
                <p>{h.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Уникальность: схемы залов и стадионов</h2>
          <p className={styles.prose}>
            Для крупных площадок (в том числе Лужники) реализован пайплайн нормализации секторов,
            трансформации concert ↔ football layout и отрисовки на canvas при десятках тысяч точек —
            с плавным зумом, фильтрами по цене и режимом «сначала сектор → потом места» на мобильных.
            По ощущению выбора места это ближе к картографическим продуктам Яндекса, чем к типичным
            «квадратикам в таблице» билетных агрегаторов.
          </p>
          <ul className={styles.list}>
            <li>Seat hold с таймером — места не «испаряются» без предупреждения</li>
            <li>Цветовая легенда цен и фокус на сектор</li>
            <li>Fullscreen-режим схемы на телефоне и десктопе</li>
            <li>Админ-загрузка SVG/layout JSON без релиза фронта</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Слои продукта</h2>
          <div className={styles.layers}>
            <div className={styles.layer}>
              <span className={styles.layerTag}>Сайт</span>
              <p>Афиша, поиск, SEO-лендинги city/genre/venue, карточка события, checkout, кабинет заказа.</p>
            </div>
            <div className={styles.layer}>
              <span className={styles.layerTag}>Админка</span>
              <p>Витрина (hero, направления, контакты, legal HTML), события GetBilet, схемы залов, промо.</p>
            </div>
            <div className={styles.layer}>
              <span className={styles.layerTag}>API</span>
              <p>
                Публичные эндпоинты каталога и репертуара, seat reserve/cancel, checkout → payment URL,
                sitemap и SSR head для индексации.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Стек</h2>
          <div className={styles.stack}>
            {STACK.map((s) => (
              <span key={s} className={styles.chip}>
                {s}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.ctaBand}>
          <h2 className={styles.h2}>Нужна похожая платформа?</h2>
          <p className={styles.prose}>
            PrimeCoder делает React/Next.js SaaS и сложные веб-приложения под бизнес-метрики — не «страницу
            ради страницы». Этот кейс — живой продукт в продакшене.
          </p>
          <div className={styles.heroCtas}>
            <a className={styles.btnPrimary} href={PRIME_REACT} target="_blank" rel="noopener noreferrer">
              React/Next.js от 850 000 ₽
            </a>
            <a className={styles.btnGhost} href={PRIME} target="_blank" rel="noopener noreferrer">
              prime-coder.ru
            </a>
          </div>
        </section>

        <footer className={styles.footer}>
          <p>
            Разработка:{' '}
            <a href={PRIME} target="_blank" rel="noopener noreferrer">
              PrimeCoder
            </a>
            . Продукт:{' '}
            <Link to="/">{SITE_BRAND}</Link>.
          </p>
        </footer>
      </article>
    </>
  );
}
