import { addDays, endOfDay, isValid, parseISO, startOfDay } from 'date-fns';
import type { NormalizedBiletEvent } from '@/services/biletPublicApi';
import { haversineKm, resolveVenueGeocode, type VenueGeocode } from '@/data/ticketVenueGeocodes';
import { ticketCheckoutHref } from '@/services/biletPublicApi';

export type EventMapPin = {
  id: string;
  event: NormalizedBiletEvent;
  geocode: VenueGeocode;
  href: string;
  distanceKm: number | null;
};

export type VenueMapCluster = {
  key: string;
  geocode: VenueGeocode;
  pins: EventMapPin[];
  distanceKm: number | null;
};

export function eventDateMs(ev: NormalizedBiletEvent): number | null {
  const raw = ev.isoDate?.trim();
  if (!raw) return null;
  const d = parseISO(raw);
  return isValid(d) ? d.getTime() : null;
}

/** События с датой в ближайшие 7 дней (включая сегодня). */
export function filterEventsThisWeek(events: NormalizedBiletEvent[], now = new Date()): NormalizedBiletEvent[] {
  const from = startOfDay(now).getTime();
  const to = endOfDay(addDays(now, 7)).getTime();
  return events.filter((ev) => {
    const ms = eventDateMs(ev);
    if (ms == null) return false;
    return ms >= from && ms <= to;
  });
}

export function buildEventMapPins(
  events: NormalizedBiletEvent[],
  userLocation?: { lat: number; lng: number } | null,
): EventMapPin[] {
  const pins: EventMapPin[] = [];
  for (const event of events) {
    const geocode = resolveVenueGeocode(event.venue, event.venueAddress);
    if (!geocode) continue;
    const distanceKm = userLocation ? haversineKm(userLocation, geocode) : null;
    pins.push({
      id: event.id,
      event,
      geocode,
      href: ticketCheckoutHref(event),
      distanceKm,
    });
  }
  return pins.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    const ta = eventDateMs(a.event) ?? Infinity;
    const tb = eventDateMs(b.event) ?? Infinity;
    return ta - tb;
  });
}

export function clusterPinsByVenue(pins: EventMapPin[]): VenueMapCluster[] {
  const map = new Map<string, VenueMapCluster>();
  for (const pin of pins) {
    const key = `${pin.geocode.lat.toFixed(5)}:${pin.geocode.lng.toFixed(5)}`;
    const existing = map.get(key);
    if (existing) {
      existing.pins.push(pin);
      if (pin.distanceKm != null) {
        existing.distanceKm =
          existing.distanceKm == null ? pin.distanceKm : Math.min(existing.distanceKm, pin.distanceKm);
      }
    } else {
      map.set(key, {
        key,
        geocode: pin.geocode,
        pins: [pin],
        distanceKm: pin.distanceKm,
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return a.pins.length - b.pins.length;
  });
}
