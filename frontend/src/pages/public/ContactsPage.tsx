import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneInTalkOutlinedIcon from '@mui/icons-material/PhoneInTalkOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { ContactFormSection } from '@/components/contacts/ContactFormSection';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import styles from './ContactsPage.module.css';

export function ContactsPage() {
  const { data: vitrineRes } = useQuery({
    queryKey: ['tickets-vitrine'],
    queryFn: fetchPublicTicketsVitrine,
    staleTime: 120_000,
  });

  const vitrine = useMemo(() => mergeTicketsVitrine(vitrineRes?.content), [vitrineRes]);
  const c = vitrine.contacts ?? {};
  const pageTitle = c.pageTitle ?? 'Контакты';
  const intro =
    c.intro ||
    'Заказ билетов, оплата, вход на мероприятие — всё, что касается сервиса, можно решить здесь.';
  const address = (c.address ?? '').trim();
  const phone = (c.phone ?? '').trim();
  const email = (c.email ?? '').trim();
  const hours = (c.hours ?? '').trim();
  const formTitle = c.formTitle ?? 'Сообщение в поддержку';

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const hasChannels = Boolean(address || phone || email || hours);

  return (
    <>
      <SeoMetaTags
        title={`${pageTitle} — билеты и афиша`}
        description={intro.slice(0, 155)}
        url={currentUrl}
      />

      <main className={styles.root}>
        <section className={styles.hero} aria-label="Заголовок">
          <div className={styles.heroGrid}>
            <div className={styles.heroText}>
              <span className={styles.heroKicker}>Поддержка</span>
              <h1 className={styles.heroTitle}>{pageTitle}</h1>
              <p className={styles.heroLead}>{intro}</p>
              <div className={styles.heroLinks}>
                <Link className={styles.heroCta} to="/events">
                  Каталог событий
                  <ArrowForwardIcon sx={{ fontSize: 18 }} aria-hidden />
                </Link>
                <Link className={styles.heroGhost} to="/account">
                  Личный кабинет
                </Link>
              </div>
            </div>
            <div className={styles.heroPanel} aria-hidden>
              <div className={styles.heroPanelInner}>
                <span className={styles.heroPanelLine} />
                <span className={styles.heroPanelLine} />
                <span className={styles.heroPanelLine} />
              </div>
            </div>
          </div>
        </section>

        <div className={styles.shell}>
          {!hasChannels ? (
            <p className={styles.channelsEmpty}>
              Блок контактов пока не заполнен в админке («Витрина билетов»). Форма ниже всё равно доставит письмо в
              поддержку.
            </p>
          ) : (
            <ul className={styles.channelGrid} aria-label="Каналы связи">
              {phone ? (
                <li className={styles.channelCard}>
                  <span className={styles.channelIcon}>
                    <PhoneInTalkOutlinedIcon sx={{ fontSize: 30 }} />
                  </span>
                  <span className={styles.channelLabel}>Телефон</span>
                  <a className={styles.channelValue} href={`tel:${phone.replace(/\s/g, '')}`}>
                    {phone}
                  </a>
                </li>
              ) : null}
              {email ? (
                <li className={styles.channelCard}>
                  <span className={styles.channelIcon}>
                    <EmailOutlinedIcon sx={{ fontSize: 30 }} />
                  </span>
                  <span className={styles.channelLabel}>Email</span>
                  <a className={styles.channelValue} href={`mailto:${email}`}>
                    {email}
                  </a>
                </li>
              ) : null}
              {address ? (
                <li className={`${styles.channelCard} ${styles.channelCardWide}`}>
                  <span className={styles.channelIcon}>
                    <LocationOnOutlinedIcon sx={{ fontSize: 30 }} />
                  </span>
                  <span className={styles.channelLabel}>Адрес</span>
                  <p className={styles.channelStatic}>{address}</p>
                </li>
              ) : null}
              {hours ? (
                <li className={styles.channelCard}>
                  <span className={styles.channelIcon}>
                    <ScheduleOutlinedIcon sx={{ fontSize: 30 }} />
                  </span>
                  <span className={styles.channelLabel}>Часы работы</span>
                  <p className={styles.channelStatic}>{hours}</p>
                </li>
              ) : null}
            </ul>
          )}

          <ContactFormSection
            title={formTitle}
            subtitle="Опишите заказ или вопрос — ответим на почту. Срочно — лучше позвоните по номеру выше, если он указан."
          />

          <footer className={styles.legal}>
            Возврат и обмен билетов регулирует правила организатора и площадки; мы помогаем оформить обращение через
            сервис.
          </footer>
        </div>
      </main>
    </>
  );
}
