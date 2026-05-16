const DEFAULT_FAN_ID_REPERTOIRE_IDS = new Set([
  '6a05d17b46a4d000309ecf4e',
]);

const DEFAULT_FAN_ID_SLUGS = new Set([
  'superfinal-fonbet-kubka-rossii-spartak-krasnodar',
]);

function parseEnvIds(): Set<string> {
  const raw = import.meta.env.VITE_FAN_ID_REPERTOIRE_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isFanIdRequiredForRepertoire(repertoireId: string | null | undefined): boolean {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  if (DEFAULT_FAN_ID_REPERTOIRE_IDS.has(id)) return true;
  return parseEnvIds().has(id);
}

export function isFanIdRequiredForSlug(slug: string | null | undefined): boolean {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return false;
  if (DEFAULT_FAN_ID_SLUGS.has(s)) return true;
  return isFanIdRequiredForRepertoire(s);
}

export function normalizeFanId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidFanId(raw: string): boolean {
  const v = normalizeFanId(raw);
  if (v.length < 8 || v.length > 20) return false;
  return /^[A-Z0-9]+$/.test(v);
}

export const FAN_ID_NOTICE =
  'Билеты на это мероприятие продаются только при наличии FAN ID (карта болельщика). Номер FAN ID обязателен при оформлении заказа.';
