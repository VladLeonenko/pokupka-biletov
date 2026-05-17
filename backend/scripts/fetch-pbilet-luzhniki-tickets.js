#!/usr/bin/env node
/**
 * Скачать снимки pbilet для Лужников и сравнить с локальным tickets.json.
 *
 * 1) Координаты чаши (всегда):
 *    GET tickets.api.pbilet.net/public/v1/hall-layouts/{layoutId}/coordinates
 *
 * 2) Дерево мест (если заданы event_*):
 *    GET api.pbilet.net/public/v2/tickets?event_source_id=…&event_date_id=…
 *
 * Примеры:
 *   cd backend
 *   PBILET_LAYOUT_ID=2564 npm run fetch:pbilet-luzhniki
 *
 *   PBILET_EVENT_SOURCE_ID=123456 PBILET_EVENT_DATE_ID=789012 \
 *     PBILET_OUTPUT=../tickets-pbilet-live.json npm run fetch:pbilet-luzhniki
 *
 *   SSD_EVENT_PAGE_URL='https://luzhniki-tickets.online/football/...' npm run fetch:pbilet-luzhniki
 *   (подскажет schemeId; event_* всё равно из Network → tickets)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketsSeatGeodesy,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_LAYOUT_ID = '2564';
const DEFAULT_SOURCE_ID = '2';
const DEFAULT_CURRENCY = 'RUB';
const DEFAULT_LANG = 'ru';

function optionalEnv(name, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

function requiredEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Задайте ${name}`);
  return v;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'biletvsem-fetch-pbilet-luzhniki/1.0',
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}\n${text.slice(0, 400)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Не JSON: ${url}\n${text.slice(0, 200)}`);
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Аудит тела tickets (как в репо tickets.json). */
export function auditTicketsPayload(ticketsPayload, width, height) {
  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];
  let sumAll = 0;
  let seatsInTree = 0;
  let sectorsWithRows = 0;
  let sectorsEmptyR = 0;
  let sectorsWithSeatXY = 0;
  const rowCounts = [];

  for (const sector of sectors) {
    const all = Number(sector?.all);
    if (Number.isFinite(all)) sumAll += all;
    const rows = Array.isArray(sector?.r) ? sector.r : [];
    if (rows.length === 0) {
      sectorsEmptyR += 1;
      if (Number.isFinite(Number(sector?.seat_x)) && Number.isFinite(Number(sector?.seat_y))) {
        sectorsWithSeatXY += 1;
        seatsInTree += 1;
      }
    } else {
      sectorsWithRows += 1;
      let sectorSeats = 0;
      for (const row of rows) {
        const s = Array.isArray(row?.s) ? row.s : [];
        sectorSeats += s.length;
        seatsInTree += s.length;
      }
      if (sectorSeats > 0) rowCounts.push(sectorSeats);
    }
  }

  const geodesySeats =
    width > 0 && height > 0 ? extractPbiletTicketsSeatGeodesy(ticketsPayload, width, height) : [];

  return {
    sectorCount: sectors.length,
    sumSectorAll: sumAll,
    seatsInTree,
    sectorsWithRows,
    sectorsEmptyR,
    sectorsWithSeatXY,
    geodesySeats: geodesySeats.length,
    isFullStadium: geodesySeats.length >= 75000,
    isPartialSnapshot: geodesySeats.length > 0 && geodesySeats.length < 20000,
  };
}

function auditLocalFile(absPath, width, height) {
  if (!fs.existsSync(absPath)) return null;
  const payload = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  return { path: absPath, ...auditTicketsPayload(payload, width, height) };
}

async function trySsdSchemeHint(pageUrl) {
  if (!pageUrl) return null;
  const res = await fetch(pageUrl, {
    headers: { accept: 'text/html', 'user-agent': 'biletvsem-fetch-pbilet-luzhniki/1.0' },
  });
  if (!res.ok) return { error: `${res.status} ${res.statusText}` };
  const html = await res.text();
  const re = /var\s+(ssd[a-zA-Z0-9_]+)\s*=\s*/g;
  let m;
  while ((m = re.exec(html))) {
    let i = m.index + m[0].length;
    while (i < html.length && /\s/.test(html[i])) i++;
    if (html[i] !== '{') continue;
    let depth = 0;
    const start = i;
    for (; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) {
          try {
            const obj = JSON.parse(html.slice(start, i + 1));
            const paramB64 = typeof obj.param === 'string' ? obj.param : null;
            if (!paramB64) continue;
            const param = JSON.parse(Buffer.from(paramB64, 'base64').toString('utf8'));
            return {
              schemeId: param.schemeId != null ? String(param.schemeId) : null,
              eventId: param.eventId,
              eventTag: param.eventTag,
            };
          } catch {
            continue;
          }
        }
      }
    }
  }
  return { error: 'SSD block not found' };
}

function parseTicketsUrl(url) {
  try {
    const u = new URL(url);
    return {
      eventSourceId: u.searchParams.get('event_source_id'),
      eventDateId: u.searchParams.get('event_date_id'),
      sourceId: u.searchParams.get('source_id') || DEFAULT_SOURCE_ID,
      currency: u.searchParams.get('currency_code') || DEFAULT_CURRENCY,
      lang: u.searchParams.get('lang') || DEFAULT_LANG,
    };
  } catch {
    return null;
  }
}

async function main() {
  const layoutId = optionalEnv('PBILET_LAYOUT_ID', DEFAULT_LAYOUT_ID);
  const ticketsUrlEnv = optionalEnv('PBILET_TICKETS_URL');
  const parsedUrl = ticketsUrlEnv ? parseTicketsUrl(ticketsUrlEnv) : null;

  let eventSourceId = optionalEnv('PBILET_EVENT_SOURCE_ID') || parsedUrl?.eventSourceId || '';
  let eventDateId = optionalEnv('PBILET_EVENT_DATE_ID') || parsedUrl?.eventDateId || '';
  const sourceId = optionalEnv('PBILET_SOURCE_ID', parsedUrl?.sourceId || DEFAULT_SOURCE_ID);
  const currency = optionalEnv('PBILET_CURRENCY', parsedUrl?.currency || DEFAULT_CURRENCY);
  const lang = optionalEnv('PBILET_LANG', parsedUrl?.lang || DEFAULT_LANG);
  const comparePath = optionalEnv(
    'PBILET_COMPARE_TICKETS_JSON',
    path.join(repoRoot, 'tickets.json'),
  );
  const outTickets = optionalEnv('PBILET_OUTPUT', path.join(repoRoot, 'tickets-pbilet-fetched.json'));
  const outCoords = optionalEnv(
    'PBILET_COORDINATES_OUTPUT',
    path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json'),
  );
  const ssdUrl = optionalEnv('SSD_EVENT_PAGE_URL');

  if (ssdUrl) {
    const hint = await trySsdSchemeHint(ssdUrl);
    console.log('SSD hint:', JSON.stringify(hint, null, 2));
    if (hint?.schemeId && !process.env.PBILET_LAYOUT_ID) {
      console.log(`→ подставьте PBILET_LAYOUT_ID=${hint.schemeId}`);
    }
  }

  const coordinatesUrl = `https://tickets.api.pbilet.net/public/v1/hall-layouts/${encodeURIComponent(layoutId)}/coordinates`;
  console.log('Fetching coordinates:', coordinatesUrl);
  const coordinatesPayload = await fetchJson(coordinatesUrl);
  const width = Number(coordinatesPayload?.width);
  const height = Number(coordinatesPayload?.height);
  const coordinateDots = extractPbiletCoordinatesSeatDots(coordinatesPayload, width, height);

  if (optionalEnv('PBILET_SAVE_COORDINATES', '1') !== '0') {
    fs.writeFileSync(outCoords, `${JSON.stringify(coordinatesPayload, null, 2)}\n`, 'utf8');
    console.log('Saved coordinates:', outCoords);
  }

  const report = {
    layoutId,
    coordinates: {
      url: coordinatesUrl,
      width,
      height,
      coordinateDots: coordinateDots.length,
      categories: Array.isArray(coordinatesPayload?.categories)
        ? coordinatesPayload.categories.length
        : 0,
      hasBg: Boolean(coordinatesPayload?.bg),
    },
    tickets: null,
    compareLocal: auditLocalFile(comparePath, width, height),
  };

  if (!eventSourceId || !eventDateId) {
    report.tickets = {
      skipped: true,
      reason:
        'Нет PBILET_EVENT_SOURCE_ID / PBILET_EVENT_DATE_ID (или PBILET_TICKETS_URL с query). Сравниваем только coordinates + локальный tickets.json.',
      hint:
        'Откройте схему на portalbilet / luzhniki-tickets → Network → GET api.pbilet.net/public/v2/tickets?... → скопируйте URL или пару id.',
    };
  } else {
    const ticketsUrl = `https://api.pbilet.net/public/v2/tickets?currency_code=${encodeURIComponent(currency)}&lang=${encodeURIComponent(lang)}&event_source_id=${encodeURIComponent(eventSourceId)}&event_date_id=${encodeURIComponent(eventDateId)}&source_id=${encodeURIComponent(sourceId)}`;
    console.log('Fetching tickets:', ticketsUrl);
    const ticketsPayload = await fetchJson(ticketsUrl);
    if (ticketsPayload?.detail) {
      throw new Error(String(ticketsPayload.detail));
    }

    const audit = auditTicketsPayload(ticketsPayload, width, height);
    report.tickets = {
      url: ticketsUrl,
      eventSourceId,
      eventDateId,
      ...audit,
      outputPath: outTickets,
    };

    fs.writeFileSync(outTickets, `${JSON.stringify(ticketsPayload, null, 2)}\n`, 'utf8');
    console.log('Saved tickets:', outTickets);
  }

  console.log('\n=== Отчёт ===\n');
  console.log(JSON.stringify(report, null, 2));

  const local = report.compareLocal;
  const live = report.tickets;
  if (local && live && !live.skipped) {
    const delta = live.geodesySeats - local.geodesySeats;
    console.log(
      `\nЛокальный tickets.json: geodesySeats=${local.geodesySeats}, live API: ${live.geodesySeats} (Δ ${delta >= 0 ? '+' : ''}${delta})`,
    );
    if (live.geodesySeats >= 75000) {
      console.log('✓ API отдал полную геодезию — можно seed с LUZHNIKI_GEODESY_MIN_SEATS=80000');
    } else if (live.geodesySeats <= local.geodesySeats + 50) {
      console.log(
        '✗ API отдаёт столько же мест, что и текущий снимок — полного tickets.json у pbilet для этого сеанса нет.',
      );
    }
  }

  if (coordinateDots.length >= 70000 && (!live || live.skipped || !live.isFullStadium)) {
    console.log(
      `\nСерая чаша (${coordinateDots.length} точек) есть в coordinates. Подписанные места — только из tickets (~${live?.geodesySeats ?? local?.geodesySeats ?? '?'}).`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
