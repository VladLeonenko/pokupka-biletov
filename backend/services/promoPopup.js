import crypto from 'node:crypto';
import ticketPool from '../ticketDb.js';

/**
 * @param {string | null | undefined} venue
 * @param {string} pattern ILIKE, e.g. %Больш%
 */
export function venueMatchesIlike(venue, pattern) {
  const v = String(venue || '').trim();
  const p = String(pattern || '').trim();
  if (!v || !p) return false;
  // SQL ILIKE → JS: % → .*, _ → ., case-insensitive
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  try {
    return new RegExp(`^${esc}$`, 'i').test(v);
  } catch {
    return false;
  }
}

/**
 * Площадка события для скоупа промо (ручная → кэш каталога).
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

/**
 * @param {string} [slug]
 */
export async function getPromoPopupCampaign(slug = 'bolshoi-10') {
  const r = await ticketPool.query(
    `SELECT id, slug, is_active, headline, body_text, cta_label,
            discount_kind, discount_value, ttl_minutes, venue_ilike,
            code_prefix, delay_ms, notes, created_at, updated_at
     FROM promo_popup_campaigns
     WHERE slug = $1
     LIMIT 1`,
    [String(slug || 'bolshoi-10').trim()],
  );
  return r.rows[0] || null;
}

export async function listPromoPopupCampaigns() {
  const r = await ticketPool.query(
    `SELECT id, slug, is_active, headline, body_text, cta_label,
            discount_kind, discount_value, ttl_minutes, venue_ilike,
            code_prefix, delay_ms, notes, created_at, updated_at
     FROM promo_popup_campaigns
     ORDER BY id`,
  );
  return r.rows;
}

/**
 * Публичный превью: подходит ли площадка / активна ли кампания (без выдачи кода).
 */
export async function previewPromoPopup({ slug = 'bolshoi-10', repertoireId, venueHint } = {}) {
  const campaign = await getPromoPopupCampaign(slug);
  if (!campaign || !campaign.is_active) {
    return { eligible: false, reason: 'inactive' };
  }
  let venue = String(venueHint || '').trim();
  if (!venue && repertoireId) {
    venue = await resolveEventVenueLabel(repertoireId);
  }
  if (!venueMatchesIlike(venue, campaign.venue_ilike)) {
    return { eligible: false, reason: 'venue_mismatch', venue };
  }
  return {
    eligible: true,
    campaign: {
      slug: campaign.slug,
      headline: campaign.headline,
      bodyText: campaign.body_text,
      ctaLabel: campaign.cta_label,
      discountKind: campaign.discount_kind,
      discountValue: Number(campaign.discount_value),
      ttlMinutes: campaign.ttl_minutes,
      delayMs: campaign.delay_ms,
    },
    venue,
  };
}

/**
 * Выдать или вернуть действующий персональный код (TTL с момента первой выдачи).
 */
export async function claimPromoPopup({
  slug = 'bolshoi-10',
  visitorKey,
  repertoireId,
  venueHint,
} = {}) {
  const key = String(visitorKey || '').trim().slice(0, 80);
  if (!key || key.length < 8) {
    return { ok: false, error: 'visitor_key_required' };
  }

  const campaign = await getPromoPopupCampaign(slug);
  if (!campaign || !campaign.is_active) {
    return { ok: false, error: 'Кампания недоступна' };
  }

  let venue = String(venueHint || '').trim();
  if (!venue && repertoireId) {
    venue = await resolveEventVenueLabel(repertoireId);
  }
  if (!venueMatchesIlike(venue, campaign.venue_ilike)) {
    return { ok: false, error: 'Промокод только для событий Большого театра' };
  }

  const existing = await ticketPool.query(
    `SELECT g.code, g.expires_at, p.is_active, p.uses_count, p.max_uses_total
     FROM promo_popup_grants g
     JOIN getbilet_promo_codes p ON p.id = g.promo_code_id
     WHERE g.campaign_id = $1
       AND g.visitor_key = $2
       AND g.expires_at > NOW()
     ORDER BY g.expires_at DESC
     LIMIT 1`,
    [campaign.id, key],
  );
  if (existing.rows.length) {
    const row = existing.rows[0];
    const maxUses = row.max_uses_total != null ? Number(row.max_uses_total) : null;
    const usedUp = maxUses != null && Number(row.uses_count) >= maxUses;
    if (row.is_active && !usedUp) {
      return {
        ok: true,
        reused: true,
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
  }

  const ttlMin = Number(campaign.ttl_minutes) || 60;
  const prefix = String(campaign.code_prefix || 'BOLSH10')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12) || 'BOLSH10';

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
           venue_ilike, campaign_slug, grant_visitor_key, updated_at
         ) VALUES (
           $1, $2, $3, 1, 1,
           NOW(), NOW() + ($4::int * INTERVAL '1 minute'), NULL, TRUE,
           $5, $6, $7, $8, NOW()
         )
         RETURNING id, valid_until`,
        [
          tryCode,
          campaign.discount_kind,
          campaign.discount_value,
          ttlMin,
          `popup:${campaign.slug}`,
          campaign.venue_ilike,
          campaign.slug,
          key,
        ],
      );
      const promoId = insPromo.rows[0].id;
      const until = insPromo.rows[0].valid_until;
      await client.query(
        `INSERT INTO promo_popup_grants (
           campaign_id, promo_code_id, visitor_key, repertoire_id, code, expires_at
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          campaign.id,
          promoId,
          key,
          repertoireId ? String(repertoireId).slice(0, 80) : null,
          tryCode,
          until,
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

  return {
    ok: true,
    reused: false,
    code,
    expiresAt,
    discountKind: campaign.discount_kind,
    discountValue: Number(campaign.discount_value),
    ttlMinutes: ttlMin,
    headline: campaign.headline,
    bodyText: campaign.body_text,
    ctaLabel: campaign.cta_label,
  };
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
  const code_prefix =
    body.code_prefix != null
      ? String(body.code_prefix)
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 12) || 'BOLSH10'
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
       code_prefix = $10,
       delay_ms = $11,
       notes = $12,
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
      code_prefix,
      delay_ms,
      notes,
    ],
  );
  return { row: r.rows[0] };
}
