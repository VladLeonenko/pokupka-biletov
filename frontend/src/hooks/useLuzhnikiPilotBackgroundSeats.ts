import { useEffect, useState } from 'react';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '@/utils/luzhnikiStadiumMap';
import { normalizeSectorLabel } from '@/utils/ticketHallSectorNormalize';

export type LuzhnikiBackgroundSeat = {
  xPct: number;
  yPct: number;
  sector?: string;
};

type LayoutLike = Record<string, unknown>;

let pilotSeatsCache: LuzhnikiBackgroundSeat[] | null = null;
let pilotSeatsPromise: Promise<LuzhnikiBackgroundSeat[]> | null = null;

function parsePilotSeatRows(raw: unknown): LuzhnikiBackgroundSeat[] {
  if (!Array.isArray(raw)) return [];
  const out: LuzhnikiBackgroundSeat[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const xPct = Number(row.xPct ?? row.x_pct);
    const yPct = Number(row.yPct ?? row.y_pct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) continue;
    const sector = String(row.sector ?? row.Sector ?? row['place-name'] ?? '').trim();
    out.push({ xPct, yPct, ...(sector ? { sector } : {}) });
  }
  return out;
}

async function fetchPilotBackgroundSeats(): Promise<LuzhnikiBackgroundSeat[]> {
  if (pilotSeatsCache) return pilotSeatsCache;
  if (!pilotSeatsPromise) {
    pilotSeatsPromise = fetch(`/api/bilet/stage/${LUZHNIKI_FOOTBALL_STAGE_MAP_KEY}/pilot-seats`, {
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`pilot-seats ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const rows = Array.isArray(data) ? data : Array.isArray(data?.seats) ? data.seats : [];
        pilotSeatsCache = parsePilotSeatRows(rows);
        return pilotSeatsCache;
      })
      .catch(() => {
        pilotSeatsCache = [];
        return pilotSeatsCache;
      })
      .finally(() => {
        pilotSeatsPromise = null;
      });
  }
  return pilotSeatsPromise;
}

export function useLuzhnikiPilotBackgroundSeats(
  layout: unknown,
  selectedSectorNorm: string | null,
): { seats: LuzhnikiBackgroundSeat[]; loading: boolean } {
  const root = layout && typeof layout === 'object' ? (layout as LayoutLike) : null;
  const enabled =
    Boolean(root?.omitClientSeatCoordinateCloud) &&
    (root?.stadiumMapKey === LUZHNIKI_FOOTBALL_STAGE_MAP_KEY || root?.luzhnikiStadiumCheckout === true);

  const [seats, setSeats] = useState<LuzhnikiBackgroundSeat[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setSeats([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPilotBackgroundSeats().then((all) => {
      if (cancelled) return;
      if (!selectedSectorNorm) {
        setSeats(all);
      } else {
        setSeats(
          all.filter((s) => s.sector && normalizeSectorLabel(s.sector) === selectedSectorNorm),
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, selectedSectorNorm]);

  return { seats, loading };
}
