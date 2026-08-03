import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CircularProgress } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import MapIcon from '@mui/icons-material/Map';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { EventsWeekMap } from '@/components/tickets/EventsWeekMap';
import {
  fetchBiletEventsLite,
  isEventActual,
  normalizeBiletEventsPayload,
} from '@/services/biletPublicApi';
import { deriveBiletEventDateParts } from '@/utils/eventDateLabels';
import {
  buildEventMapPins,
  clusterPinsByVenue,
  filterEventsThisWeek,
} from '@/utils/eventsMapWeek';
import styles from './EventsMapPage.module.css';

type UserLocation = { lat: number; lng: number };

export function EventsMapPage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    document.body.setAttribute('data-page', '/events/map');
  }, []);

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ['bilet-events-map-week'],
    queryFn: () => fetchBiletEventsLite(800),
    staleTime: 60_000,
    retry: 1,
  });

  const allEvents = useMemo(() => {
    if (isError) return [];
    return normalizeBiletEventsPayload(raw).filter(isEventActual);
  }, [raw, isError]);

  const weekEvents = useMemo(() => filterEventsThisWeek(allEvents), [allEvents]);
  const pins = useMemo(
    () => buildEventMapPins(weekEvents, userLocation),
    [weekEvents, userLocation],
  );
  const clusters = useMemo(() => clusterPinsByVenue(pins), [pins]);
  const unmappedCount = weekEvents.length - pins.length;

  const requestGeo = () => {
    if (!navigator.geolocation) {
      setGeoError('Геолокация недоступна в браузере');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError('Не удалось определить местоположение');
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 120_000 },
    );
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <>
      <SeoMetaTags
        title="Карта мероприятий на этой неделе"
        description="События рядом с вами на карте: театр, концерты и спорт в ближайшие 7 дней."
        url={`${origin}/events/map`}
      />

      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.overline}>Афиша рядом</p>
          <h1 className={styles.h1}>На этой неделе на карте</h1>
          <p className={styles.intro}>
            Мероприятия с датой в ближайшие 7 дней. Нажмите «Рядом со мной», чтобы отсортировать список
            по расстоянию.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.geoBtn} onClick={requestGeo} disabled={geoLoading}>
              {geoLoading ? (
                <CircularProgress size={16} sx={{ color: '#fff' }} />
              ) : (
                <MyLocationIcon fontSize="small" />
              )}
              Рядом со мной
            </button>
            <Link to="/events" className={styles.backLink}>
              ← Все мероприятия
            </Link>
          </div>
          {geoError && <p className={styles.geoError}>{geoError}</p>}
        </header>

        {isLoading ? (
          <div className={styles.loading}>
            <CircularProgress size={32} />
          </div>
        ) : (
          <>
            <div className={styles.stats}>
              <span>
                <MapIcon fontSize="inherit" /> {weekEvents.length} на неделе
              </span>
              <span>{clusters.length} площадок на карте</span>
              {unmappedCount > 0 && (
                <span className={styles.statsMuted}>{unmappedCount} без координат</span>
              )}
            </div>

            <div className={styles.layout}>
              <EventsWeekMap
                clusters={clusters}
                userLocation={userLocation}
                activeKey={activeKey}
                onSelectCluster={setActiveKey}
              />

              <aside className={styles.list} aria-label="Список мероприятий">
                {pins.length === 0 ? (
                  <p className={styles.empty}>
                    Нет событий с известными координатами на этой неделе.{' '}
                    <Link to="/events">Смотреть весь каталог</Link>
                  </p>
                ) : (
                  clusters.map((cluster) => (
                    <section
                      key={cluster.key}
                      className={`${styles.venueBlock} ${activeKey === cluster.key ? styles.venueBlockActive : ''}`}
                    >
                      <button
                        type="button"
                        className={styles.venueHead}
                        onClick={() => setActiveKey(cluster.key)}
                      >
                        <span className={styles.venueName}>{cluster.geocode.label}</span>
                        {cluster.distanceKm != null && (
                          <span className={styles.distance}>
                            {cluster.distanceKm < 1
                              ? `${Math.round(cluster.distanceKm * 1000)} м`
                              : `${cluster.distanceKm.toFixed(1)} км`}
                          </span>
                        )}
                      </button>
                      <ul className={styles.events}>
                        {cluster.pins.map((pin) => {
                          const dates = deriveBiletEventDateParts(pin.event.isoDate, pin.event.dateLabel);
                          return (
                            <li key={pin.id}>
                              <Link to={pin.href} className={styles.eventLink}>
                                <span className={styles.eventTitle}>{pin.event.title}</span>
                                {(dates.displayDate || dates.timeLabel) && (
                                  <span className={styles.eventDate}>
                                    {[dates.displayDate, dates.timeLabel].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </>
  );
}
