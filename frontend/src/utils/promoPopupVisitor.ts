const VISITOR_KEY = 'bv_promo_visitor_v1';
const GRANT_PREFIX = 'bv_promo_grant:';

export type StoredPromoGrant = {
  code: string;
  expiresAt: string;
  slug: string;
  dismissedModal?: boolean;
  headline?: string;
  bodyText?: string;
  ctaLabel?: string;
};

function uuidLike() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreatePromoVisitorKey(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
    const next = uuidLike();
    localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return uuidLike();
  }
}

export function readStoredPromoGrant(slug: string): StoredPromoGrant | null {
  try {
    const raw = localStorage.getItem(`${GRANT_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPromoGrant;
    if (!parsed?.code || !parsed?.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(`${GRANT_PREFIX}${slug}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredPromoGrant(grant: StoredPromoGrant) {
  try {
    localStorage.setItem(`${GRANT_PREFIX}${grant.slug}`, JSON.stringify(grant));
  } catch {
    /* ignore */
  }
}

export function markPromoModalDismissed(slug: string) {
  const g = readStoredPromoGrant(slug);
  if (!g) return;
  writeStoredPromoGrant({ ...g, dismissedModal: true });
}

/** Код для автоподстановки в форму оплаты. */
export function peekPendingCheckoutPromo(): string | null {
  try {
    const code = sessionStorage.getItem('bv_pending_promo');
    return code && code.trim() ? code.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function setPendingCheckoutPromo(code: string) {
  try {
    sessionStorage.setItem('bv_pending_promo', code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

export const PROMO_CODE_APPLIED_EVENT = 'bv-promo-code-applied';

export function broadcastPromoCode(code: string) {
  setPendingCheckoutPromo(code);
  try {
    window.dispatchEvent(new CustomEvent(PROMO_CODE_APPLIED_EVENT, { detail: { code } }));
  } catch {
    /* ignore */
  }
}
