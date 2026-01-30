import express from 'express';

const router = express.Router();

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

router.get('/overview', async (_req, res) => {
  try {
    const [ya, ga] = await Promise.all([fetchYandex(30), fetchGoogle()]);
    if (ga) return res.json(ga);
    if (ya) return res.json(ya);
    // fallback mock
    const days = rangeDays(30);
    const visitors = days.map((d, idx) => ({ date: d, users: 200 + Math.round(80 * Math.sin(idx / 3) + Math.random() * 30) }));
    const avgSessionSec = days.map((d, idx) => ({ date: d, seconds: 120 + Math.round(60 * Math.cos(idx / 5) + Math.random() * 20) }));
    const topPages = [
      { path: '/', title: 'Главная', views: 1523 },
      { path: '/services', title: 'Услуги', views: 974 },
      { path: '/blog', title: 'Блог', views: 812 },
      { path: '/contacts', title: 'Контакты', views: 405 },
      { path: '/portfolio', title: 'Портфолио', views: 362 },
    ];
    res.json({ visitors, avgSessionSec, topPages });
  } catch (e) {
    // never fail hard; always return mock
    const days = rangeDays(30);
    const visitors = days.map((d, idx) => ({ date: d, users: 200 + Math.round(80 * Math.sin(idx / 3) + Math.random() * 30) }));
    const avgSessionSec = days.map((d, idx) => ({ date: d, seconds: 120 + Math.round(60 * Math.cos(idx / 5) + Math.random() * 20) }));
    const topPages = [
      { path: '/', title: 'Главная', views: 1523 },
      { path: '/services', title: 'Услуги', views: 974 },
      { path: '/blog', title: 'Блог', views: 812 },
      { path: '/contacts', title: 'Контакты', views: 405 },
      { path: '/portfolio', title: 'Портфолио', views: 362 },
    ];
    res.json({ visitors, avgSessionSec, topPages });
  }
});

export default router;


