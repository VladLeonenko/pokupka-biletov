import express from 'express';
import pool from '../db.js';

const router = express.Router();

/** Реальные бизнес-метрики из БД */
async function fetchBusinessStats() {
  try {
    const [
      ordersRes,
      ordersMonthRes,
      clientsRes,
      clientsMonthRes,
      formsRes,
      formsNewRes,
      viewsRes,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as cnt, COALESCE(SUM(total_cents), 0) as revenue FROM orders WHERE status != 'cancelled'`),
      pool.query(`SELECT COUNT(*) as cnt, COALESCE(SUM(total_cents), 0) as revenue FROM orders WHERE status != 'cancelled' AND created_at > NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) as cnt FROM clients`),
      pool.query(`SELECT COUNT(*) as cnt FROM clients WHERE created_at > NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) as cnt FROM form_submissions`),
      pool.query(`SELECT COUNT(*) as cnt FROM form_submissions WHERE status = 'new'`),
      pool.query(`SELECT COUNT(*) as cnt FROM product_analytics WHERE event_type = 'view' AND created_at > NOW() - INTERVAL '30 days'`),
    ]);
    return {
      ordersTotal: parseInt(ordersRes.rows[0]?.cnt || 0),
      revenueTotalCents: parseInt(ordersRes.rows[0]?.revenue || 0),
      ordersMonth: parseInt(ordersMonthRes.rows[0]?.cnt || 0),
      revenueMonthCents: parseInt(ordersMonthRes.rows[0]?.revenue || 0),
      clientsTotal: parseInt(clientsRes.rows[0]?.cnt || 0),
      clientsMonth: parseInt(clientsMonthRes.rows[0]?.cnt || 0),
      formSubmissionsTotal: parseInt(formsRes.rows[0]?.cnt || 0),
      formSubmissionsNew: parseInt(formsNewRes.rows[0]?.cnt || 0),
      productViewsMonth: parseInt(viewsRes.rows[0]?.cnt || 0),
    };
  } catch (e) {
    console.warn('[metrics] fetchBusinessStats error:', e.message);
    return null;
  }
}

function rangeDays(n) {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

async function fetchYandex(daysCount) {
  try {
    const token = process.env.YANDEX_TOKEN;
    const counter = process.env.YANDEX_COUNTER_ID;
    if (!token || !counter) return null;
    const date1 = '30daysAgo';
    const date2 = 'today';
    const base = 'https://api-metrika.yandex.net/stat/v1/data';
    const headers = { Authorization: `OAuth ${token}` };
    // Time series users by day
    const usersUrl = `${base}?ids=${counter}&metrics=ym:s:users&dimensions=ym:s:date&date1=${date1}&date2=${date2}&group=Day`; 
    const usersRes = await fetch(usersUrl, { headers });
    if (!usersRes.ok) return null;
    const usersData = await usersRes.json();
    const visitors = Array.isArray(usersData?.data) ? usersData.data.map((row) => ({ date: row.dimensions?.[0]?.name, users: row.metrics?.[0] })) : null;
    if (!visitors) return null;
    // Avg session duration
    const avgUrl = `${base}?ids=${counter}&metrics=ym:s:avgVisitDurationSeconds&dimensions=ym:s:date&date1=${date1}&date2=${date2}&group=Day`;
    const avgRes = await fetch(avgUrl, { headers });
    if (!avgRes.ok) return null;
    const avgData = await avgRes.json();
    const avgSessionSec = Array.isArray(avgData?.data) ? avgData.data.map((row) => ({ date: row.dimensions?.[0]?.name, seconds: row.metrics?.[0] })) : null;
    if (!avgSessionSec) return null;
    // Top pages last 7 days
    const topUrl = `${base}?ids=${counter}&metrics=ym:pv:pageviews&dimensions=ym:pv:URL,ym:pv:title&date1=7daysAgo&date2=${date2}&sort=-ym:pv:pageviews&limit=5`;
    const topRes = await fetch(topUrl, { headers });
    if (!topRes.ok) return null;
    const topData = await topRes.json();
    const topPages = Array.isArray(topData?.data) ? topData.data.map((row) => ({ path: row.dimensions?.[0]?.name, title: row.dimensions?.[1]?.name || '', views: row.metrics?.[0] })) : [];
    return { visitors, avgSessionSec, topPages };
  } catch { return null; }
}

import jwt from 'jsonwebtoken';
async function fetchGoogle() {
  try {
    const propertyId = process.env.GA_PROPERTY_ID;
    const clientEmail = process.env.GA_CLIENT_EMAIL;
    let privateKey = process.env.GA_PRIVATE_KEY;
    if (!propertyId || !clientEmail || !privateKey) return null;
    privateKey = privateKey.replace(/\\n/g, '\n');
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }, privateKey, { algorithm: 'RS256' });
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: token }).toString(),
    });
    if (!resp.ok) return null;
    const { access_token } = await resp.json();
    if (!access_token) return null;
    const reportBody = {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'totalUsers' }, { name: 'averageSessionDuration' }],
    };
    const rep = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` }, body: JSON.stringify(reportBody),
    });
    if (!rep.ok) return null;
    const data = await rep.json();
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    if (!rows.length) return null;
    const visitors = rows.map(r => ({ date: r.dimensionValues?.[0]?.value, users: Number(r.metricValues?.[0]?.value || 0) }));
    const avgSessionSec = rows.map(r => ({ date: r.dimensionValues?.[0]?.value, seconds: Number(r.metricValues?.[1]?.value || 0) }));
    // Top pages
    const topBody = {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 5,
    };
    const topRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` }, body: JSON.stringify(topBody),
    });
    if (!topRes.ok) return { visitors, avgSessionSec, topPages: [] };
    const topJson = await topRes.json();
    const topRows = Array.isArray(topJson?.rows) ? topJson.rows : [];
    const topPages = topRows.map(r => ({ path: r.dimensionValues?.[0]?.value, title: r.dimensionValues?.[1]?.value || '', views: Number(r.metricValues?.[0]?.value || 0) }));
    return { visitors, avgSessionSec, topPages };
  } catch { return null; }
}

/** Проверка подключения к Яндекс.Метрике — экспортируется для публичного роута */
export async function checkYandexConnection() {
  const token = process.env.YANDEX_TOKEN;
  const counter = process.env.YANDEX_COUNTER_ID;
  if (!token || !counter) {
    return {
      connected: false,
      error: !token ? 'YANDEX_TOKEN не задан' : 'YANDEX_COUNTER_ID не задан',
      counterId: counter || null,
    };
  }
  const ya = await fetchYandex(1);
  if (!ya) {
    return { connected: false, error: 'Запрос к API вернул пустой ответ (проверьте токен и ID счётчика)' };
  }
  return {
    connected: true,
    counterId: counter,
    visitorsCount: ya.visitors?.length ?? 0,
  };
}

router.get('/yandex-test', async (_req, res) => {
  try {
    const result = await checkYandexConnection();
    res.json(result);
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

router.get('/overview', async (_req, res) => {
  try {
    const [ya, ga, business] = await Promise.all([fetchYandex(30), fetchGoogle(), fetchBusinessStats()]);
    const days = rangeDays(30);
    let visitors, avgSessionSec, topPages, analyticsSource = 'internal';

    if (ga) {
      visitors = ga.visitors;
      avgSessionSec = ga.avgSessionSec;
      topPages = ga.topPages || [];
      analyticsSource = 'ga';
    } else if (ya) {
      visitors = ya.visitors;
      avgSessionSec = ya.avgSessionSec;
      topPages = ya.topPages || [];
      analyticsSource = 'yandex';
    } else {
      // Топ страниц из product_analytics (просмотры товаров)
      try {
        const topRes = await pool.query(`
          SELECT product_slug as path, p.title, COUNT(*)::int as views
          FROM product_analytics pa
          LEFT JOIN products p ON p.slug = pa.product_slug
          WHERE pa.event_type = 'view' AND pa.created_at > NOW() - INTERVAL '7 days'
          GROUP BY pa.product_slug, p.title
          ORDER BY views DESC
          LIMIT 10
        `);
        topPages = topRes.rows.map((r) => ({ path: `/products/${r.path}`, title: r.title || r.path, views: r.views }));
      } catch {
        topPages = [];
      }
      // Посетители по дням из product_analytics (уникальные session_id + user_id)
      try {
        const visRes = await pool.query(`
          SELECT date_trunc('day', created_at)::date as d,
            COUNT(DISTINCT COALESCE(session_id, 'u'||user_id))::int as users
          FROM product_analytics
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY 1 ORDER BY 1
        `);
        const visMap = Object.fromEntries((visRes.rows || []).map((r) => [r.d?.toISOString?.()?.slice(0, 10) || r.d, r.users]));
        visitors = days.map((d) => ({ date: d, users: visMap[d] || 0 }));
        avgSessionSec = days.map((d) => ({ date: d, seconds: 90 }));
      } catch {
        visitors = days.map((d) => ({ date: d, users: 0 }));
        avgSessionSec = days.map((d) => ({ date: d, seconds: 0 }));
      }
    }

    res.json({
      visitors,
      avgSessionSec,
      topPages,
      analyticsSource,
      stats: business || undefined,
    });
  } catch (e) {
    console.error('[metrics] overview error:', e);
    res.status(500).json({
      visitors: rangeDays(30).map((d) => ({ date: d, users: 0 })),
      avgSessionSec: rangeDays(30).map((d) => ({ date: d, seconds: 0 })),
      topPages: [],
      analyticsSource: 'error',
    });
  }
});

export default router;


