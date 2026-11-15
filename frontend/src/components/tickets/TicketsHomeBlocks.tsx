import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  dedupeBiletEventsByShow,
  type NormalizedBiletEvent,
} from '@/services/biletPublicApi';
import { FaqAccordion } from './FaqAccordion';
import { OPERATOR } from '@/utils/operatorLegalInfo';
import { sortEventsByTheaterDemand, theaterDemandScore } from '@/utils/eventDemandRank';
import { AfishaMoreRow } from './TicketsCategoryCarousels';
import styles from './TicketsHomeBlocks.module.css';

const HIGHLIGHTS = 12;

/** HOT-спрос (Wordstat «… билеты»): это то, что нам выгоднее всего продавать. */
function pickHighlights(events: NormalizedBiletEvent[]): NormalizedBiletEvent[] {
  const ranked = sortEventsByTheaterDemand(dedupeBiletEventsByShow(events));
  const hot = ranked.filter((ev) => theaterDemandScore(ev) > 40);
  return (hot.length >= 6 ? hot : ranked).slice(0, HIGHLIGHTS);
}

type FaqItem = { q: string; a: ReactNode };

/** Hot FAQ на главной: закрывают возражения до оплаты + SEO FAQPage. Полный список — /faq */
const FAQ: FaqItem[] = [
  {
    q: 'Как купить билет на сайте?',
    a: (
      <>
        Откройте событие в <Link to="/events">афише</Link> или на странице{' '}
        <Link to="/events/venues">площадки</Link>, выберите сеанс и места на схеме, укажите контакты и оплатите
        онлайн. После оплаты электронный билет придёт на e-mail.
      </>
    ),
  },
  {
    q: 'Когда придёт электронный билет?',
    a: (
      <>
        Обычно в течение нескольких минут после успешной оплаты, иногда до 24 часов — зависит от организатора.
        Проверьте «Спам» и «Промоакции». Дубликат — в <Link to="/account">личных заказах</Link>, если покупали с
        аккаунтом.
      </>
    ),
  },
  {
    q: 'Билет не пришёл на почту — что делать?',
    a: (
      <>
        Поищите письмо по названию мероприятия и проверьте спам. Если письма нет — напишите на{' '}
        <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> или позвоните{' '}
        <a href={`tel:${OPERATOR.phoneTel}`}>{OPERATOR.phone}</a>, укажите e-mail и время оплаты.
      </>
    ),
  },
  {
    q: 'Какие способы оплаты доступны?',
    a: (
      <>
        На шаге оплаты показываются доступные способы через платёжного провайдера — обычно банковские карты Visa /
        Mastercard / Мир. Платёж проходит на защищённой странице банка.
      </>
    ),
  },
  {
    q: 'Можно ли вернуть билет, если передумал?',
    a: (
      <>
        Да, по правилам организатора и ст. 52.1 закона о культуре: чем раньше заявление — тем выше сумма возврата.
        Порядок и сроки — на странице <Link to="/returns">«Возврат и обмен»</Link>. Заявку можно подать через{' '}
        <Link to="/contacts">контакты</Link>.
      </>
    ),
  },
  {
    q: 'Что если спектакль отменили или перенесли?',
    a: (
      <>
        При отмене обычно полный возврат. При переносе организатор предлагает новую дату или возврат. Следите за
        письмом на e-mail; по спорным случаям —{' '}
        <Link to="/contacts">поддержка</Link> с номером заказа.
      </>
    ),
  },
  {
    q: 'Нужна ли регистрация для покупки?',
    a: (
      <>
        Нет: достаточно имени, телефона и e-mail. Аккаунт удобен, чтобы хранить все билеты в одном месте и быстрее
        повторять покупку.
      </>
    ),
  },
  {
    q: 'Как пройти на мероприятие с электронным билетом?',
    a: (
      <>
        Покажите QR или билет с экрана телефона на входе. Можно сохранить письмо или распечатать. Не выкладывайте
        билет в открытый доступ — им могут воспользоваться мошенники.
      </>
    ),
  },
];

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripNodesToText(item.a),
      },
    })),
  };
}

/** Для JSON-LD: плоский текст без React-узлов. */
function stripNodesToText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(stripNodesToText).join('');
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return stripNodesToText(props?.children);
  }
  return '';
}

type Props = {
  events: NormalizedBiletEvent[];
};

/** Блоки после основной афишы: хайлайты спроса и FAQ */
export function TicketsHomeExtras({ events }: Props) {
  const highlights = useMemo(() => pickHighlights(events), [events]);

  return (
    <>
      <AfishaMoreRow events={highlights} />

      <section className={styles.faq} aria-labelledby="faq-heading">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
        />
        <div className={styles.faqWrap}>
          <div className={styles.faqHead}>
            <div>
              <p className={styles.faqOverline}>Перед покупкой</p>
              <h2 id="faq-heading" className={styles.faqTitle}>
                Частые вопросы
              </h2>
            </div>
            <Link to="/faq" className={styles.faqAllLink}>
              Полный FAQ →
            </Link>
          </div>
          <FaqAccordion items={FAQ} />
        </div>
      </section>
    </>
  );
}
