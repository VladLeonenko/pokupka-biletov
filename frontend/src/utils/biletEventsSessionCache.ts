import { getTicketsCityId } from '@/utils/ticketsCity';

const KEY_PREFIX = 'pb-bilet-events-v1';

function keyForCity(cityId: string) {
  return `${KEY_PREFIX}:${cityId}`;
}

const MAX_AGE_MS = 5 * 60_000;

export function readBiletEventsSessionCache(cityId?: string): { data: unknown; updatedAt: number } | undefined {
  if (typeof window === 'undefined') return undefined;
  const cid = cityId ?? getTicketsCityId();
  try {
    const raw = sessionStorage.getItem(keyForCity(cid));
    if (!raw) return undefined;
    const j = JSON.parse(raw) as { t?: number; data?: unknown; cityId?: string };
    if (typeof j.t !== 'number' || j.data === undefined) return undefined;
    if (j.cityId != null && j.cityId !== cid) return undefined;
    if (Date.now() - j.t > MAX_AGE_MS) return undefined;
    return { data: j.data, updatedAt: j.t };
  } catch {
    return undefined;
  }
}

export function writeBiletEventsSessionCache(data: unknown, cityId?: string): void {
  if (typeof window === 'undefined') return;
  const cid = cityId ?? getTicketsCityId();
  try {
    sessionStorage.setItem(
      keyForCity(cid),
      JSON.stringify({ t: Date.now(), cityId: cid, data }),
    );
  } catch {
    /* quota / private mode */
  }
}
