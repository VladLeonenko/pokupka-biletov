const DEFAULT_FAN_ID_REPERTOIRE_IDS = new Set([
  '6a05d17b46a4d000309ecf4e',
]);

const DEFAULT_FAN_ID_SLUGS = new Set([
  'superfinal-fonbet-kubka-rossii-spartak-krasnodar',
]);

/** GetBilet иногда пишет «именной билет» в Extra, но на витрине продажи нет — не показываем этот UX. */
const NAMED_TICKET_UX_DISABLED_REPERTOIRE_IDS = new Set([
  '6a05d17b46a4d000309ecf4e',
]);

const NAMED_TICKET_UX_DISABLED_SLUGS = new Set([
  'superfinal-fonbet-kubka-rossii-spartak-krasnodar',
]);

const TICKET_SLUG_TO_REPERTOIRE: Record<string, string> = {
  'superfinal-fonbet-kubka-rossii-spartak-krasnodar': '6a05d17b46a4d000309ecf4e',
};

const BLOCKED_TICKET_SLUGS = new Set(['final-kubka-rossii-po-futbolu-2026']);

export function isBlockedTicketSlug(slug: string | null | undefined): boolean {
  return BLOCKED_TICKET_SLUGS.has(String(slug || '').trim().toLowerCase());
}

/** Маркетинговый ЧПУ → repertoire id (если resolve-slug на бэке ещё старый). */
export function repertoireIdForTicketSlug(slug: string | null | undefined): string | null {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return null;
  if (TICKET_SLUG_TO_REPERTOIRE[s]) return TICKET_SLUG_TO_REPERTOIRE[s];
  const raw = import.meta.env.VITE_TICKET_SLUG_ALIASES?.trim();
  if (!raw) return null;
  for (const part of raw.split(/[,;]/)) {
    const [slugPart, repPart] = part.split(':').map((x) => x.trim().toLowerCase());
    if (slugPart && repPart && slugPart === s) return repPart;
  }
  return null;
}

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

export function isNamedTicketUxEnabledForRepertoire(repertoireId: string | null | undefined): boolean {
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return true;
  return !NAMED_TICKET_UX_DISABLED_REPERTOIRE_IDS.has(id);
}

export function isNamedTicketUxEnabledForSlug(slug: string | null | undefined): boolean {
  const s = String(slug || '').trim().toLowerCase();
  if (!s) return true;
  if (NAMED_TICKET_UX_DISABLED_SLUGS.has(s)) return false;
  return isNamedTicketUxEnabledForRepertoire(repertoireIdForTicketSlug(s));
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
