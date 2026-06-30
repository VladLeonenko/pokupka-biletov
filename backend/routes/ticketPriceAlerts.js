import {
  createTicketPriceAlert,
  processTicketPriceAlerts,
  unsubscribeTicketPriceAlert,
} from '../services/ticketPriceAlerts.js';
import { assertRepertoireStorefrontAccess, RepertoireNotAvailableError } from '../services/repertoireStorefrontAccess.js';

function requireCronSecret(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.status(503).json({ error: 'cron_not_configured' });
    return false;
  }
  const provided = req.query.secret ?? req.headers['x-cron-secret'];
  if (String(provided || '') !== cronSecret) {
    res.status(403).json({ error: 'forbidden' });
    return false;
  }
  return true;
}

/**
 * @param {import('express').Router} router
 */
export function registerTicketPriceAlertRoutes(router) {
  router.post('/price-alert', async (req, res) => {
    try {
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      const repertoireId = String(b.repertoireId ?? b.repertoire_id ?? '').trim();
      if (!repertoireId) {
        return res.status(400).json({ ok: false, error: 'repertoireId обязателен' });
      }
      await assertRepertoireStorefrontAccess(repertoireId);

      const result = await createTicketPriceAlert({
        email: b.email,
        repertoireId,
        eventTitle: b.eventTitle ?? b.event_title,
        ticketPath: b.ticketPath ?? b.ticket_path,
        maxPriceRub: b.maxPriceRub ?? b.max_price_rub,
        sessionDateTime: b.sessionDateTime ?? b.session_dt,
        zoneFilter: b.zoneFilter ?? b.zone_filter,
      });

      return res.json({
        ok: true,
        created: result.created,
        message: result.created
          ? 'Подписка оформлена — напишем, когда появятся билеты или цена снизится'
          : 'Подписка уже была — мы её обновили',
      });
    } catch (err) {
      if (err instanceof RepertoireNotAvailableError) {
        return res.status(404).json({ ok: false, error: err.message });
      }
      const msg = err instanceof Error ? err.message : 'Ошибка подписки';
      return res.status(400).json({ ok: false, error: msg });
    }
  });

  router.get('/price-alert/unsubscribe/:token', async (req, res) => {
    try {
      const ok = await unsubscribeTicketPriceAlert(req.params.token);
      const html = ok
        ? `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Отписка</title></head><body style="font-family:system-ui,sans-serif;padding:32px"><h1>Вы отписались</h1><p>Уведомления по этому событию больше не будут приходить.</p></body></html>`
        : `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Отписка</title></head><body style="font-family:system-ui,sans-serif;padding:32px"><h1>Ссылка недействительна</h1><p>Подписка уже отменена или ссылка устарела.</p></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(ok ? 200 : 404).send(html);
    } catch (e) {
      console.error('[bilet/price-alert/unsubscribe]', e);
      return res.status(500).send('Ошибка');
    }
  });

  router.get('/cron/check-price-alerts', async (req, res) => {
    if (!requireCronSecret(req, res)) return;
    try {
      const forceRefresh = req.query.refresh === '1' || req.query.fresh === '1';
      const result = await processTicketPriceAlerts({ forceRefresh });
      return res.json({ ok: true, ...result });
    } catch (e) {
      console.error('[bilet/cron/check-price-alerts]', e);
      return res.status(500).json({ ok: false, error: e.message || 'cron_failed' });
    }
  });
}
