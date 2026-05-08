import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Paper, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import {
  fetchBiletEvents,
  isEventActual,
  normalizeBiletEventsPayload,
  dedupeBiletEventsByShow,
} from '@/services/biletPublicApi';
import type { NormalizedBiletEvent, RepertoireDescriptionSection } from '@/services/biletPublicApi';
import { EventPosterCard } from '@/components/tickets/EventPosterCard';
import { useTicketRecentRepertoires } from '@/hooks/useTicketRecentRepertoires';
import { useTicketsCityId } from '@/hooks/useTicketsCityId';
import styles from './TicketCheckoutPageExtras.module.css';

type Props = {
  repertoireId: string;
  displayTitle: string;
  descriptionSnippet: string | null | undefined;
  descriptionSections?: RepertoireDescriptionSection[] | null;
  venueLabel: string | null;
  /** Адрес площадки (как в GetStageListByPlaceId). */
  venueAddress?: string | null;
  /** Тот же текст уже под заголовком в шапке страницы — не повторяем абзац */
  hasDescriptionInHero: boolean;
};

function eventMatchesRepertoire(ev: NormalizedBiletEvent, rep: string): boolean {
  const r = rep.trim();
  if (!r) return false;
  if ((ev.repertoireId?.trim() ?? '') === r) return true;
  if (ev.id === r) return true;
  if (ev.id.includes('::') && ev.id.split('::')[0] === r) return true;
  return false;
}

export function TicketCheckoutPageExtras({
  repertoireId,
  displayTitle,
  descriptionSnippet,
  descriptionSections,
  venueLabel,
  venueAddress,
  hasDescriptionInHero,
}: Props) {
  const recentIds = useTicketRecentRepertoires(repertoireId);
  const cityId = useTicketsCityId();

  const { data: rawEvents } = useQuery({
    queryKey: ['bilet-events-public', cityId],
    queryFn: () => fetchBiletEvents(),
    staleTime: 120_000,
  });

  const catalog = useMemo(
    () => dedupeBiletEventsByShow(normalizeBiletEventsPayload(rawEvents ?? []).filter(isEventActual)),
    [rawEvents],
  );

  const popular = useMemo(
    () =>
      catalog.filter((e) => !eventMatchesRepertoire(e, repertoireId)).slice(0, 4),
    [catalog, repertoireId],
  );

  const watched = useMemo(() => {
    if (recentIds.length === 0) return [];
    const out: NormalizedBiletEvent[] = [];
    for (const rid of recentIds) {
      const hit = catalog.find((e) => eventMatchesRepertoire(e, rid));
      if (hit && !eventMatchesRepertoire(hit, repertoireId)) out.push(hit);
      if (out.length >= 4) break;
    }
    return out;
  }, [catalog, recentIds, repertoireId]);

  const aboutFallback = (() => {
    if (hasDescriptionInHero) {
      return `Условия для зрителей и изменения в программе уточняйте у организатора. Оформление билетов — на этой странице.`;
    }
    return (
      descriptionSnippet?.trim() ||
      `Событие «${displayTitle}». Подробности уточняйте у организатора; билеты оформляются онлайн здесь.`
    );
  })();

  const sections = descriptionSections?.filter((s) => s.title?.trim() && s.paragraphs?.length) ?? [];

  return (
    <div className={styles.root}>
      <section className={styles.block} aria-labelledby="ticket-about">
        <h2 id="ticket-about" className={styles.h2}>
          О мероприятии
        </h2>
        {sections.length > 0 ? (
          <article id="ticket-event-description" className={styles.article}>
            {sections.map((s) => (
              <div key={s.id} className={styles.articleSection}>
                <h3 className={styles.articleH3}>{s.title}</h3>
                {s.paragraphs.map((p, i) => (
                  <p key={`${s.id}-p-${i}`} className={styles.articleP}>
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </article>
        ) : (
          <p className={styles.bodyText}>{aboutFallback}</p>
        )}
      </section>

      <section className={styles.block} aria-labelledby="ticket-reviews">
        <h2 id="ticket-reviews" className={styles.h2}>
          <StarOutlineIcon className={styles.h2Icon} sx={{ fontSize: 22 }} aria-hidden />
          Отзывы и оценки
        </h2>
        <Paper variant="outlined" className={styles.stubCard} elevation={0}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            После посещения вы сможете оценить событие. Мы собираем обратную связь, чтобы афиша и сервис были удобнее.
          </Typography>
        </Paper>
      </section>

      <section className={styles.block} aria-labelledby="ticket-venue">
        <h2 id="ticket-venue" className={styles.h2}>
          <PlaceOutlinedIcon className={styles.h2Icon} sx={{ fontSize: 22 }} aria-hidden />
          Площадка
        </h2>
        {venueLabel || venueAddress ? (
          <div>
            {venueLabel ? <p className={styles.venueLine}>{venueLabel}</p> : null}
            {venueAddress ? (
              <p className={styles.venueAddress}>{venueAddress}</p>
            ) : null}
          </div>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Адрес и название площадки подгружаются из каталога GetBilet (при отсутствии данных у агента).
          </Typography>
        )}
      </section>

      {popular.length > 0 ? (
        <section className={styles.block} aria-labelledby="ticket-popular">
          <div className={styles.rowHead}>
            <h2 id="ticket-popular" className={styles.h2}>
              Популярное сейчас
            </h2>
            <Link to="/events" className={styles.moreLink}>
              Весь каталог
            </Link>
          </div>
          <div className={styles.cardRow}>
            {popular.map((ev) => (
              <div key={ev.id} className={styles.cardCell}>
                <EventPosterCard event={ev} variant="compact" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {watched.length > 0 ? (
        <section className={styles.block} aria-labelledby="ticket-watched">
          <h2 id="ticket-watched" className={styles.h2}>
            Вы недавно смотрели
          </h2>
          <div className={styles.cardRow}>
            {watched.map((ev) => (
              <div key={ev.id} className={styles.cardCell}>
                <EventPosterCard event={ev} variant="compact" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Box sx={{ pt: 1 }}>
        <Button
          component={Link}
          to="/events"
          variant="contained"
          fullWidth
          sx={{
            py: 1.5,
            bgcolor: 'var(--neg-orange, #ff4e18)',
            color: '#fff',
            fontWeight: 700,
            boxShadow: 'none',
            '&:hover': { bgcolor: '#e54414', boxShadow: 'none' },
          }}
        >
          Вернуться к афише
        </Button>
      </Box>
    </div>
  );
}
