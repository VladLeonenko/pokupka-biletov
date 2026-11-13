import crypto from 'node:crypto';
import ticketPool from '../ticketDb.js';

export const DEFAULT_PROMO_POPUP_SLUG = 'except-bolshoi-10';
const COOKIE_NAME = 'bv_promo_vid';
const MAX_GRANTS_PER_IP_24H = 5;

/**
 * @param {string | null | undefined} venue
 * @param {string} pattern ILIKE, e.g. %Больш%
 */
export function venueMatchesIlike(venue, pattern) {
  const v = String(venue || '').trim();
  const p = String(pattern || '').trim();
  if (!v || !p) return false;
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  try {
    return new RegExp(`^${esc}$`, 'i').test(v);
  } catch {
    return false;
  }
}

/**
 * @param {'include'|'exclude'|'all'|string|null|undefined} scope
 * @param {string} venue
 * @param {string} pattern
 * @returns {{ ok: boolean, error?: string }}
 */
export function checkVenueScope(scope, venue, pattern) {
  const mode = String(scope || 'include').toLowerCase();
  if (mode === 'all' || !pattern) return { ok: true };
  const v = String(venue || '').trim();
  if (!v) {
    return { ok: false, error: 'Не удалось определить площадку для промокода' };
  }
  const matched = venueMatchesIlike(v, pattern);
  if (mode === 'exclude') {
    if (matched) {
      return { ok: false, error: 'Промокод не действует на события Большого театра' };
    }
    return { ok: true };
  }
  // include
  if (!matched) {
    return { ok: false, error: 'Промокод не действует на эту площадку' };
  }
  return { ok: true };
}

/**
 * @param {string} repertoireId
 * @returns {Promise<string>}
 */
export async function resolveEventVenueLabel(repertoireId) {
  const id = String(repertoireId || '').trim();
  if (!id) return '';
  try {
    const r = await ticketPool.query(
      `SELECT
         NULLIF(trim(e.venue_manual), '') AS venue_manual,
         NULLIF(trim(c.payload_json->>'PlaceName'), '') AS place_name,
         NULLIF(trim(c.payload_json->>'placeName'), '') AS place_name2,
         NULLIF(trim(c.payload_json->>'VenueName'), '') AS venue_name,
         NULLIF(trim(c.payload_json->>'venueName'), '') AS venue_name2
       FROM getbilet_events e
       LEFT JOIN getbilet_catalog_cache c
         ON c.repertoire_external_id = e.getbilet_external_id
       WHERE e.getbilet_external_id = $1
       LIMIT 1`,
      [id],
    );
    const row = r.rows[0];
    if (!row) return '';
    return (
      row.venue_manual ||
      row.place_name ||
      row.place_name2 ||
      row.venue_name ||
      row.venue_name2 ||
      ''
    );
  } catch (e) {
    console.error('[promoPopup] resolveEventVenueLabel', e instanceof Error ? e.message : e);
    return '';
  }
}

function randomCodeSuffix(len = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function newVisitorKey() {
  return crypto.randomUUID();
}

export function promoVisitorCookieName() {
  return COOKIE_NAME;
}

/**
 * @param {string} [slug]
 */
export async function getPromoPopupCampaign(slug = DEFAULT_PROMO_POPUP_SLUG) {
  const r = await ticketPool.query(
    `SELECT id, slug, is_active, headline, body_text, cta_label,
            discount_kind, discount_value, ttl_minutes, venue_ilike, venue_scope,
            code_prefix, delay_ms, notes, created_at, updated_at
     FROM promo_popup_campaigns
     WHERE slug = $1
     LIMIT 1`,
    [String(slug || DEFAULT_PROMO_POPUP_SLUG).trim()],
  );
  return r.rows[0] || null;
}

export async function listPromoPopupCampaigns() {
  const r = await ticketPool.query(
    `SELECT id, slug, is_active, headline, body_text, cta_label,
            discount_kind, discount_value, ttl_minutes, venue_ilike, venue_scope,
            code_prefix, delay_ms, notes, created_at, updated_at
     FROM promo_popup_campaigns
     ORDER BY id`,
  );
  return r.rows;
}

function campaignPublicPayload(campaign) {
  return {
    slug: campaign.slug,
    headline: campaign.headline,
    bodyText: campaign.body_text,
    ctaLabel: campaign.cta_label,
    discountKind: campaign.discount_kind,
    discountValue: Number(campaign.discount_value),
    ttlMinutes: campaign.ttl_minutes,
    delayMs: campaign.delay_ms,
    venueScope: campaign.venue_scope || 'exclude',
    venueIlike: campaign.venue_ilike,
  };
}

/**
 * Попап глобальный: eligible если кампания активна.
 * Venue проверяется только на apply в чекауте.
 */
export async function previewPromoPopup({ slug = DEFAULT_PROMO_POPUP_SLUG } = {}) {
  const campaign = await getPromoPopupCampaign(slug);
  if (!campaign || !campaign.is_active) {
    return { eligible: false, reason: 'inactive' };
  }
  return {
    eligible: true,
    campaign: campaignPublicPayload(campaign),
  };
}

function grantResponse(campaign, row, { reused, alreadyClaimed = false } = {}) {
  return {
    ok: true,
    reused: Boolean(reused),
    alreadyClaimed: Boolean(alreadyClaimed),
    code: row.code,
    expiresAt: row.expires_at,
    discountKind: campaign.discount_kind,
    discountValue: Number(campaign.discount_value),
    ttlMinutes: campaign.ttl_minutes,
    headline: campaign.headline,
    bodyText: campaign.body_text,
    ctaLabel: campaign.cta_label,
  };
}

/**
 * Одна выдача на visitor навсегда. Пока код жив и не использован — возвращаем его.
 * Venue на claim не режем: попап сайт-wide; Большой отсекается на validate.
 */
export async function claimPromoPopup({
  slug = DEFAULT_PROMO_POPUP_SLUG,
  visitorKey,
  repertoireId,
  claimIp,
} = {}) {
  const key = String(visitorKey || '').trim().slice(0, 80);
  if (!key || key.length < 8) {
    return { ok: false, error: 'visitor_key_required' };
  }

  const campaign = await getPromoPopupCampaign(slug);
  if (!campaign || !campaign.is_active) {
    return { ok: false, error: 'Кампания недоступна' };
  }

  const anyPrior = await ticketPool.query(
    `SELECT g.code, g.expires_at, p.is_active, p.uses_count, p.max_uses_total
     FROM promo_popup_grants g
     JOIN getbilet_promo_codes p ON p.id = g.promo_code_id
     WHERE g.campaign_id = $1 AND g.visitor_key = $2
     ORDER BY g.created_at DESC
     LIMIT 1`,
    [campaign.id, key],
  );

  if (anyPrior.rows.length) {
    const row = anyPrior.rows[0];
    const maxUses = row.max_uses_total != null ? Number(row.max_uses_total) : null;
    const usedUp = maxUses != null && Number(row.uses_count) >= maxUses;
    const alive = row.is_active && !usedUp && new Date(row.expires_at).getTime() > Date.now();
    if (alive) {
      return grantResponse(campaign, row, { reused: true });
    }
    // Уже получал (использовал или просрочил) — второй раз не даём
    return {
      ok: false,
      error: 'Промокод уже был выдан ранее',
      alreadyClaimed: true,
    };
  }

  const ip = String(claimIp || '').trim().slice(0, 64) || null;
  if (ip) {
    const ipCount = await ticketPool.query(
      `SELECT COUNT(*)::int AS n
       FROM promo_popup_grants
       WHERE campaign_id = $1
         AND claim_ip = $2
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [campaign.id, ip],
    );
    if ((ipCount.rows[0]?.n || 0) >= MAX_GRANTS_PER_IP_24H) {
      return { ok: false, error: 'Слишком много запросов промокода. Попробуйте позже.' };
    }
  }

  const ttlMin = Number(campaign.ttl_minutes) || 60;
  const prefix =
    String(campaign.code_prefix || 'SITE10')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 12) || 'SITE10';
  const venueScope = campaign.venue_scope || 'exclude';

  let code = '';
  let expiresAt = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const tryCode = `${prefix}-${randomCodeSuffix(6)}`;
    const client = await ticketPool.connect();
    try {
      await client.query('BEGIN');
      const insPromo = await client.query(
        `INSERT INTO getbilet_promo_codes (
           code, discount_kind, discount_value, max_uses_total, max_uses_per_user,
           valid_from, valid_until, min_order_amount, is_active, notes,
           venue_ilike, venue_scope, campaign_slug, grant_visitor_key, updated_at
         ) VALUES (
           $1, $2, $3, 1, 1,
           NOW(), NOW() + ($4::int * INTERVAL '1 minute'), NULL, TRUE,
           $5, $6, $7, $8, $9, NOW()
         )
         RETURNING id, valid_until`,
        [
          tryCode,
          campaign.discount_kind,
          campaign.discount_value,
          ttlMin,
          `popup:${campaign.slug}`,
          campaign.venue_ilike,
          venueScope,
          campaign.slug,
          key,
        ],
      );
      const promoId = insPromo.rows[0].id;
      const until = insPromo.rows[0].valid_until;
      await client.query(
        `INSERT INTO promo_popup_grants (
           campaign_id, promo_code_id, visitor_key, repertoire_id, code, expires_at, claim_ip
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          campaign.id,
          promoId,
          key,
          repertoireId ? String(repertoireId).slice(0, 80) : null,
          tryCode,
          until,
          ip,
        ],
      );
      await client.query('COMMIT');
      code = tryCode;
      expiresAt = until;
      break;
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      if (e && e.code === '23505') continue;
      throw e;
    } finally {
      client.release();
    }
  }

  if (!code || !expiresAt) {
    return { ok: false, error: 'Не удалось выдать промокод, попробуйте ещё раз' };
  }

  return grantResponse(campaign, { code, expires_at: expiresAt }, { reused: false });
}

export async function updatePromoPopupCampaign(id, body) {
  const cur = await ticketPool.query(`SELECT * FROM promo_popup_campaigns WHERE id = $1`, [id]);
  if (!cur.rows.length) return { error: 'not_found' };
  const c = cur.rows[0];

  const headline = body.headline != null ? String(body.headline).trim() : c.headline;
  const body_text = body.body_text != null ? String(body.body_text).trim() : c.body_text;
  const cta_label =
    body.cta_label != null ? String(body.cta_label).trim() || 'Скопировать код' : c.cta_label;
  const discount_kind = body.discount_kind != null ? body.discount_kind : c.discount_kind;
  if (!['percent', 'fixed'].includes(discount_kind)) return { error: 'discount_kind' };
  const discount_value =
    body.discount_value != null ? Number(body.discount_value) : Number(c.discount_value);
  if (!Number.isFinite(discount_value) || discount_value < 0) return { error: 'discount_value' };
  if (discount_kind === 'percent' && discount_value > 100) return { error: 'discount_value' };
  const ttl_minutes =
    body.ttl_minutes != null ? Number(body.ttl_minutes) : Number(c.ttl_minutes);
  if (!Number.isFinite(ttl_minutes) || ttl_minutes < 5 || ttl_minutes > 60) {
    return { error: 'ttl_minutes (5–60)' };
  }
  const venue_ilike =
    body.venue_ilike != null ? String(body.venue_ilike).trim() || '%Больш%' : c.venue_ilike;
  let venue_scope = body.venue_scope != null ? String(body.venue_scope) : c.venue_scope || 'exclude';
  if (!['include', 'exclude', 'all'].includes(venue_scope)) return { error: 'venue_scope' };
  const code_prefix =
    body.code_prefix != null
      ? String(body.code_prefix)
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 12) || 'SITE10'
      : c.code_prefix;
  const delay_ms = body.delay_ms != null ? Number(body.delay_ms) : Number(c.delay_ms);
  if (!Number.isFinite(delay_ms) || delay_ms < 0 || delay_ms > 120000) return { error: 'delay_ms' };
  const is_active = body.is_active != null ? Boolean(body.is_active) : c.is_active;
  const notes = body.notes !== undefined ? (body.notes == null ? null : String(body.notes)) : c.notes;

  if (!headline || !body_text) return { error: 'headline/body' };

  const r = await ticketPool.query(
    `UPDATE promo_popup_campaigns SET
       is_active = $2,
       headline = $3,
       body_text = $4,
       cta_label = $5,
       discount_kind = $6,
       discount_value = $7,
       ttl_minutes = $8,
       venue_ilike = $9,
       venue_scope = $10,
       code_prefix = $11,
       delay_ms = $12,
       notes = $13,
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      is_active,
      headline,
      body_text,
      cta_label,
      discount_kind,
      discount_value,
      ttl_minutes,
      venue_ilike,
      venue_scope,
      code_prefix,
      delay_ms,
      notes,
    ],
  );
  return { row: r.rows[0] };
}
