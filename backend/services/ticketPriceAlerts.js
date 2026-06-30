import crypto from 'node:crypto';
import ticketPool from '../ticketDb.js';
import { getOfferListByRepertoireIdCached } from './getbiletOffersCache.js';
import { sendTransactionalMail } from './mail/transporter.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TICKET_ALERT_COOLDOWN_MS =
  Math.max(1, Number(process.env.TICKET_ALERT_COOLDOWN_HOURS) || 24) * 60 * 60 * 1000;

/** @param {unknown} payload */
export function parseOfferRows(payload) {
  const rd = payload && typeof payload === 'object' ? payload.ResultData : null;
  return Array.isArray(rd) ? rd.filter((r) => r && typeof r === 'object') : [];
}

/** @param {Record<string, unknown>} row */
export function seatCountForOfferRow(row) {
  const sl = row.SeatList ?? row.seatList ?? row.Seats;
  if (Array.isArray(sl)) return sl.length;
  if (typeof sl === 'string' && sl.trim()) {
    return sl.split(/[,\s]+/).filter(Boolean).length;
  }
  return 1;
}

/** @param {Record<string, unknown>} row */
export function unitPriceForOfferRow(row) {
  const p = Number(row.AgentPrice ?? row.NominalPrice ?? row.Price ?? 0);
  return Number.isFinite(p) && p > 0 ? p : null;
}

/**
 * @param {unknown} offersPayload
 * @param {{ session_dt?: string | null; zone_filter?: string | null; max_price_rub?: number | null }} alert
 */
export function computeOffersSnapshot(offersPayload, alert = {}) {
  let rows = parseOfferRows(offersPayload);
  const sessionDt = alert.session_dt?.trim();
  if (sessionDt) {
    rows = rows.filter((r) => String(r.EventDateTime ?? '') === sessionDt);
  }
  const zone = alert.zone_filter?.trim().toLowerCase();
  if (zone) {
    rows = rows.filter((r) => String(r.Sector ?? '').toLowerCase().includes(zone));
  }

  const maxPrice =
    alert.max_price_rub != null && Number.isFinite(Number(alert.max_price_rub))
      ? Number(alert.max_price_rub)
      : null;

  let totalSeats = 0;
  let minPrice = null;
  let maxPriceSeen = null;
  let matchingOffers = 0;

  for (const row of rows) {
    const p = unitPriceForOfferRow(row);
    if (p == null) continue;
    if (maxPrice != null && p > maxPrice) continue;
    matchingOffers += 1;
    totalSeats += seatCountForOfferRow(row);
    if (minPrice == null || p < minPrice) minPrice = p;
    if (maxPriceSeen == null || p > maxPriceSeen) maxPriceSeen = p;
  }

  return {
    totalSeats,
    minPrice,
    maxPrice: maxPriceSeen,
    matchingOffers,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * @param {ReturnType<typeof computeOffersSnapshot> | null | undefined} prev
 * @param {ReturnType<typeof computeOffersSnapshot>} curr
 * @param {{ max_price_rub?: number | null }} alert
 */
export function detectAlertReasons(prev, curr, alert = {}) {
  const reasons = [];
  const prevSeats = prev?.totalSeats ?? 0;
  if (prevSeats === 0 && curr.totalSeats > 0) {
    reasons.push('appeared');
  }

  const max = alert.max_price_rub != null ? Number(alert.max_price_rub) : null;
  if (max != null && Number.isFinite(max) && curr.minPrice != null && curr.minPrice <= max) {
    const prevMin = prev?.minPrice;
    if (prevMin == null || prevMin > max) {
      reasons.push('price_drop');
    }
  }

  return reasons;
}

function siteBaseUrl() {
  return (process.env.SITE_URL || process.env.FRONTEND_URL || 'https://biletvsem.ru').replace(/\/$/, '');
}

function reasonLabel(reason) {
  if (reason === 'appeared') return 'Появились билеты';
  if (reason === 'price_drop') return 'Цена снизилась';
  return 'Обновление';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {Record<string, unknown>} alert @param {string[]} reasons @param {ReturnType<typeof computeOffersSnapshot>} snapshot */
export async function sendTicketPriceAlertEmail(alert, reasons, snapshot) {
  const site = siteBaseUrl();
  const path = alert.ticket_path?.trim() || `/ticket/${alert.repertoire_id}`;
  const ticketUrl = path.startsWith('http') ? path : `${site}${path.startsWith('/') ? '' : '/'}${path}`;
  const unsubscribeUrl = `${site}/api/bilet/price-alert/unsubscribe/${alert.unsubscribe_token}`;
  const title = alert.event_title?.trim() || 'Мероприятие';
  const reasonText = reasons.map(reasonLabel).join(' · ');
  const priceLine =
    snapshot.minPrice != null
      ? `от ${Math.round(snapshot.minPrice).toLocaleString('ru-RU')} ₽`
      : 'уточняется';

  const subject = `${reasonText}: ${title}`;
  const text = [
    reasonText,
    '',
    title,
    `Билеты ${priceLine}, доступно мест: ${snapshot.totalSeats}.`,
    '',
    `Купить: ${ticketUrl}`,
    '',
    `Отписаться: ${unsubscribeUrl}`,
  ].join('\n');

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.55;color:#111;max-width:520px">
  <p style="margin:0 0 8px;font-size:13px;color:#666">${escapeHtml(reasonText)}</p>
  <h2 style="margin:0 0 12px;font-size:20px">${escapeHtml(title)}</h2>
  <p style="margin:0 0 16px">Билеты <strong>${escapeHtml(priceLine)}</strong>, доступно мест: <strong>${snapshot.totalSeats}</strong>.</p>
  <p style="margin:0 0 20px"><a href="${escapeHtml(ticketUrl)}" style="display:inline-block;background:#ff4e18;color:#fff;text-decoration:none;padding:12px 20px;font-weight:700;border-radius:2px">Выбрать места</a></p>
  <p style="margin:0;font-size:12px;color:#888"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#888">Отписаться от уведомлений</a></p>
</div>`;

  return sendTransactionalMail({
    to: String(alert.email),
    subject,
    text,
    html,
  });
}

export function normalizeAlertEmail(email) {
  const s = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(s)) throw new Error('Некорректный email');
  return s;
}

/**
 * @param {{
 *   email: string;
 *   repertoireId: string;
 *   eventTitle?: string;
 *   ticketPath?: string;
 *   maxPriceRub?: number | null;
 *   sessionDateTime?: string | null;
 *   zoneFilter?: string | null;
 * }} input
 */
export async function createTicketPriceAlert(input) {
  const email = normalizeAlertEmail(input.email);
  const repertoireId = String(input.repertoireId || '').trim();
  if (!repertoireId) throw new Error('repertoireId обязателен');

  let maxPriceRub = null;
  if (input.maxPriceRub != null && input.maxPriceRub !== '') {
    const n = Number(input.maxPriceRub);
    if (!Number.isFinite(n) || n <= 0) throw new Error('Некорректный бюджет');
    maxPriceRub = n;
  }

  const token = crypto.randomBytes(24).toString('hex');
  const { data } = await getOfferListByRepertoireIdCached(repertoireId, { forceRefresh: false });
  const snapshot = computeOffersSnapshot(data, {
    session_dt: input.sessionDateTime,
    zone_filter: input.zoneFilter,
    max_price_rub: maxPriceRub,
  });

  const upd = await ticketPool.query(
    `UPDATE ticket_price_alerts SET
      event_title = COALESCE($3, event_title),
      ticket_path = COALESCE($4, ticket_path),
      max_price_rub = $5,
      session_dt = $6,
      zone_filter = $7,
      last_snapshot_json = $8::jsonb,
      active = TRUE,
      updated_at = NOW()
     WHERE email = $1 AND repertoire_id = $2
       AND COALESCE(session_dt, '') = COALESCE($6, '')
       AND COALESCE(zone_filter, '') = COALESCE($7, '')
       AND (max_price_rub IS NOT DISTINCT FROM $5)
     RETURNING *`,
    [
      email,
      repertoireId,
      input.eventTitle?.trim()?.slice(0, 300) || null,
      input.ticketPath?.trim()?.slice(0, 500) || null,
      maxPriceRub,
      input.sessionDateTime?.trim() || null,
      input.zoneFilter?.trim()?.slice(0, 120) || null,
      JSON.stringify(snapshot),
    ],
  );

  if (upd.rows.length > 0) {
    return { alert: upd.rows[0], snapshot, created: false };
  }

  const ins = await ticketPool.query(
    `INSERT INTO ticket_price_alerts (
      email, repertoire_id, event_title, ticket_path, max_price_rub,
      session_dt, zone_filter, last_snapshot_json, unsubscribe_token, active, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,TRUE,NOW())
    RETURNING *`,
    [
      email,
      repertoireId,
      input.eventTitle?.trim()?.slice(0, 300) || null,
      input.ticketPath?.trim()?.slice(0, 500) || null,
      maxPriceRub,
      input.sessionDateTime?.trim() || null,
      input.zoneFilter?.trim()?.slice(0, 120) || null,
      JSON.stringify(snapshot),
      token,
    ],
  );

  return { alert: ins.rows[0], snapshot, created: true };
}

export async function unsubscribeTicketPriceAlert(token) {
  const t = String(token || '').trim();
  if (!t) return false;
  const r = await ticketPool.query(
    `UPDATE ticket_price_alerts SET active = FALSE, updated_at = NOW()
     WHERE unsubscribe_token = $1 AND active = TRUE
     RETURNING id`,
    [t],
  );
  return r.rows.length > 0;
}

/** @param {{ forceRefresh?: boolean }} [opts] */
export async function processTicketPriceAlerts(opts = {}) {
  const forceRefresh = Boolean(opts.forceRefresh);
  const alertsRes = await ticketPool.query(
    `SELECT * FROM ticket_price_alerts WHERE active = TRUE ORDER BY repertoire_id, id`,
  );
  const alerts = alertsRes.rows;
  if (alerts.length === 0) {
    return { checked: 0, notified: 0, errors: 0 };
  }

  /** @type {Map<string, unknown>} */
  const offersByRep = new Map();
  let notified = 0;
  let errors = 0;

  for (const alert of alerts) {
    try {
      const rep = String(alert.repertoire_id);
      if (!offersByRep.has(rep)) {
        const { data } = await getOfferListByRepertoireIdCached(rep, { forceRefresh });
        offersByRep.set(rep, data);
      }
      const offersPayload = offersByRep.get(rep);
      const prev =
        alert.last_snapshot_json && typeof alert.last_snapshot_json === 'object'
          ? alert.last_snapshot_json
          : null;
      const curr = computeOffersSnapshot(offersPayload, alert);
      const reasons = detectAlertReasons(prev, curr, alert);

      const cooldownOk =
        !alert.last_notified_at ||
        Date.now() - new Date(alert.last_notified_at).getTime() >= TICKET_ALERT_COOLDOWN_MS;

      if (reasons.length > 0 && cooldownOk && curr.totalSeats > 0) {
        const mail = await sendTicketPriceAlertEmail(alert, reasons, curr);
        if (mail.ok) {
          await ticketPool.query(
            `UPDATE ticket_price_alerts SET
              last_notified_at = NOW(),
              last_notify_reason = $2,
              notify_count = notify_count + 1,
              last_snapshot_json = $3::jsonb,
              updated_at = NOW()
             WHERE id = $1`,
            [alert.id, reasons.join(','), JSON.stringify(curr)],
          );
          notified += 1;
          continue;
        }
        errors += 1;
      }

      await ticketPool.query(
        `UPDATE ticket_price_alerts SET last_snapshot_json = $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [alert.id, JSON.stringify(curr)],
      );
    } catch (e) {
      errors += 1;
      console.error('[ticketPriceAlerts] alert', alert.id, e instanceof Error ? e.message : e);
    }
  }

  return { checked: alerts.length, notified, errors };
}
