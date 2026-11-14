import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { ContactFormSection } from '@/components/contacts/ContactFormSection';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import { OPERATOR } from '@/utils/operatorLegalInfo';
import { TicketStage } from '@/components/tickets/TicketStage';
import { TicketsSiteLogo } from '@/components/tickets/TicketsSiteLogo';
import shell from './TicketsHelpPages.module.css';
import styles from './ContactsPage.module.css';

const JUMPS = [
  { to: '/events', kicker: 'Смотреть', title: 'Афиша' },
  { to: '/returns', kicker: 'Билет', title: 'Возврат' },
  { to: '/faq', kicker: 'Справка', title: 'Вопросы' },
  { to: '/account', kicker: 'Заказы', title: 'Кабинет' },
] as const;

export function ContactsPage() {
  const { data: vitrineRes } = useQuery({
    queryKey: ['tickets-vitrine'],
    queryFn: fetchPublicTicketsVitrine,
    staleTime: 120_000,
  });

  const vitrine = useMemo(() => mergeTicketsVitrine(vitrineRes?.content), [vitrineRes]);
  const c = vitrine.contacts ?? {};
  const phone = (c.phone ?? '').trim() || OPERATOR.phone;
  const email = (c.email ?? '').trim() || OPERATOR.email;
  const hours = (c.hours ?? '').trim() || OPERATOR.hours;
  const address = (c.address ?? '').trim() || OPERATOR.postalAddress;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Контакты — билет, оплата, возврат"
        description="Поддержка по билетам: почта, телефон и форма. Ответим по заказу, оплате и возврату."
        url={currentUrl}
      />

      <main>
        <TicketStage
          kicker="Поддержка"
          title="Напишите — разберёмся"
          lead="Не пришло письмо, спорная оплата или нужен возврат. Почта в рабочее время, срочное — по телефону."
          mark={<TicketsSiteLogo hero />}
          extra={
            <nav className={styles.jumps} aria-label="Куда дальше">
              {JUMPS.map((item) => (
                <Link key={item.to} to={item.to} className={styles.jump}>
                  <span>{item.kicker}</span>
                  <strong>{item.title}</strong>
                </Link>
              ))}
            </nav>
          }
        >
        <div className={shell.shell}>
          <div className={styles.grid}>
            <ul className={`${shell.card} ${styles.facts}`}>
              <li>
                <span className={styles.factLabel}>Телефон</span>
                <a className={styles.factValue} href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                  {phone}
                </a>
                <span className={styles.factNote}>{hours}</span>
              </li>
              <li>
                <span className={styles.factLabel}>Почта</span>
                <a className={styles.factValue} href={`mailto:${email}`}>
                  {email}
                </a>
                <span className={styles.factNote}>Для номера заказа и чека</span>
              </li>
              <li>
                <span className={styles.factLabel}>Адрес</span>
                <p className={styles.factStatic}>{address}</p>
              </li>
            </ul>

            <ContactFormSection
              title="Сообщение"
              subtitle="Номер заказа, почта с оплаты и что случилось. Ответим на указанный email."
            />
          </div>

          <p className={styles.legal}>
            {OPERATOR.shortName}, ИНН {OPERATOR.inn}, ОГРНИП {OPERATOR.ogrnip}. Возврат — по правилам организатора,
            заявку помогаем оформить. <Link to="/requisites">Реквизиты</Link>
            {' · '}
            <Link to="/offer">оферта</Link>
          </p>
        </div>
        </TicketStage>
      </main>
    </>
  );
}
