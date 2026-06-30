import { useEffect, useRef } from 'react';
import { loadLeaflet } from '@/utils/loadLeaflet';
import type { VenueMapCluster } from '@/utils/eventsMapWeek';
import styles from './EventsWeekMap.module.css';

type LatLng = { lat: number; lng: number };

type Props = {
  clusters: VenueMapCluster[];
  userLocation?: LatLng | null;
  activeKey?: string | null;
  onSelectCluster?: (key: string) => void;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function popupHtml(cluster: VenueMapCluster): string {
  const items = cluster.pins
    .slice(0, 6)
    .map((pin) => {
      const title = escapeHtml(pin.event.title);
      const date = escapeHtml(pin.event.dateLabel || pin.event.isoDate || '');
      return `<li><a href="${escapeHtml(pin.href)}">${title}</a>${date ? `<span> · ${date}</span>` : ''}</li>`;
    })
    .join('');
  const more =
    cluster.pins.length > 6
      ? `<p class="more">+ ещё ${cluster.pins.length - 6} на этой площадке</p>`
      : '';
  return `<div class="ev-map-popup"><strong>${escapeHtml(cluster.geocode.label)}</strong><ul>${items}</ul>${more}</div>`;
}

export function EventsWeekMap({ clusters, userLocation, activeKey, onSelectCluster }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ setView: (c: [number, number], z: number) => void; fitBounds: (b: unknown, o?: object) => void; remove: () => void } | null>(null);
  const markersRef = useRef<Map<string, { remove: () => void; openPopup: () => void }>>(new Map());
  const userMarkerRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          scrollWheelZoom: true,
          zoomControl: true,
        }).setView([55.7558, 37.6173], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
      })
      .catch(() => {
        /* список рядом работает без карты */
      });

    return () => {
      cancelled = true;
      markersRef.current.clear();
      userMarkerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    loadLeaflet().then((L) => {
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();

      const bounds: [number, number][] = [];

      for (const cluster of clusters) {
        const { lat, lng } = cluster.geocode;
        bounds.push([lat, lng]);
        const marker = L.marker([lat, lng], {
          title: cluster.geocode.label,
        })
          .addTo(map)
          .bindPopup(popupHtml(cluster), { maxWidth: 280 });

        marker.on('click', () => onSelectCluster?.(cluster.key));
        markersRef.current.set(cluster.key, marker);

        if (activeKey === cluster.key) {
          marker.openPopup();
        }
      }

      if (userLocation) {
        if (userMarkerRef.current) userMarkerRef.current.remove();
        userMarkerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 8,
          color: '#ff4e18',
          fillColor: '#ff4e18',
          fillOpacity: 0.85,
          weight: 2,
        }).addTo(map);
        bounds.push([userLocation.lat, userLocation.lng]);
      }

      if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 13 });
      }
    });
  }, [clusters, userLocation, activeKey, onSelectCluster]);

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.map} aria-label="Карта мероприятий" />
    </div>
  );
}
