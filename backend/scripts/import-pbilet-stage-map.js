/**
 * Импорт схемы стадиона из публичной coordinate-модели pbilet в getbilet_stage_maps.
 *
 * Для Лукойл Арены / Спартак - ЦСКА:
 *   PBILET_LAYOUT_ID=333 \
 *   PBILET_EVENT_SOURCE_ID=228840 \
 *   PBILET_EVENT_DATE_ID=391626 \
 *   STAGE_MAP_STAGE_ID=66f16a8c09a369003081a02f \
 *   STAGE_MAP_TITLE="Лукойл Арена — Спартак - ЦСКА" \
 *   npm run import:pbilet-stage-map
 *
 * Лужники (футбол, SSD на сайте донора — schemeId = PBILET_LAYOUT_ID):
 *   Резервная копия подложки pbilet для layout 1173: frontend/public/maps/luzhniki-pbilet-1173.svg
 *   (тот же файл, что coordinates.bg на CDN; боевой импорт всё равно тянет bg по URL из API).
 *   SSD_EVENT_PAGE_URL='https://luzhniki-tickets.online/football/cup-of-russia/57057/' \
 *     node scripts/extract-ssd-scheme-from-luzhniki-event-url.js
 *   В ответе schemeId (например 1173). Пару event_source_id / event_date_id возьмите из Network
 *   запроса к api.pbilet.net/public/v2/tickets при открытии схемы на том же сайте.
 *
 * Пример переменных для Кубка России (layout 1173 — проверяйте актуальность в Network):
 *   PBILET_LAYOUT_ID=1173 \
 *   PBILET_EVENT_SOURCE_ID=<из запроса tickets> \
 *   PBILET_EVENT_DATE_ID=<из запроса tickets> \
 *   STAGE_MAP_STAGE_ID=<Mongo ObjectId Stage из GetBilet> \
 *   STAGE_MAP_TITLE="Лужники — финал Кубка России" \
 *   npm run import:pbilet-stage-map
 *
 * Концерты на том же стадионе — другая схема и обычно другой schemeId / другой StageId в GetBilet:
 * отдельная строка в getbilet_stage_maps на каждый StageId.
 */

import ticketPool from '../ticketDb.js';
import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';

const DEFAULT_SOURCE_ID = '2';
const DEFAULT_CURRENCY = 'RUB';
const DEFAULT_LANG = 'ru';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} обязателен`);
  return value;
}

function optionalEnv(name, fallback = null) {
  return process.env[name]?.trim() || fallback;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'biletvsem-stage-map-import/1.0',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'image/svg+xml,text/plain,*/*',
      'user-agent': 'biletvsem-stage-map-import/1.0',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}

function normalizeText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function seatKey(sector, row, seat) {
  return `${sector.toLowerCase()}|${row.toLowerCase()}|${seat.toLowerCase()}`;
}

function collectLayoutSeats(ticketsPayload, width, height) {
  const out = [];
  const seen = new Set();
  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];

  for (const sector of sectors) {
    const sectorLabel = normalizeText(sector?.i);
    if (!sectorLabel) continue;
    const rows = Array.isArray(sector?.r) ? sector.r : [];

    if (rows.length === 0) {
      const x = Number(sector?.seat_x);
      const y = Number(sector?.seat_y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const rowLabel = '—';
      const seatLabel = '1';
      const key = seatKey(sectorLabel, rowLabel, seatLabel);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        sector: sectorLabel,
        row: rowLabel,
        seat: seatLabel,
        xPct: (x / width) * 100,
        yPct: (y / height) * 100,
      });
      continue;
    }

    for (const row of rows) {
      const rowLabel = normalizeText(row?.i);
      const seats = Array.isArray(row?.s) ? row.s : [];
      if (!rowLabel || seats.length === 0) continue;

      for (const seat of seats) {
        const seatLabel = normalizeText(seat?.i ?? seat?.k?.x);
        const x = Number(seat?.x);
        const y = Number(seat?.y);
        if (!seatLabel || !Number.isFinite(x) || !Number.isFinite(y)) continue;

        const key = seatKey(sectorLabel, rowLabel, seatLabel);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          sector: sectorLabel,
          row: rowLabel,
          seat: seatLabel,
          xPct: (x / width) * 100,
          yPct: (y / height) * 100,
        });
      }
    }
  }

  return out;
}

function collectAllSeatCoordinates(coordinatesPayload, width, height) {
  const coordinates = Array.isArray(coordinatesPayload?.coordinates) ? coordinatesPayload.coordinates : [];
  return coordinates
    .map((item) => {
      const x = Number(item?.x);
      const y = Number(item?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        xPct: (x / width) * 100,
        yPct: (y / height) * 100,
      };
    })
    .filter(Boolean);
}

function collectSectorMeta(ticketsPayload) {
  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];
  return sectors
    .map((sector) => {
      const label = normalizeText(sector?.i);
      const id = normalizeText(sector?.d);
      const path = normalizeText(sector?.o);
      if (!label || !id) return null;
      const rows = Array.isArray(sector?.r) ? sector.r : [];
      let availableSeats = rows.reduce(
        (sum, row) => sum + (Array.isArray(row?.s) ? row.s.length : 0),
        0,
      );
      if (
        availableSeats === 0 &&
        Number.isFinite(Number(sector?.seat_x)) &&
        Number.isFinite(Number(sector?.seat_y))
      ) {
        availableSeats = 1;
      }
      const prices = [];
      for (const row of rows) {
        for (const seat of Array.isArray(row?.s) ? row.s : []) {
          const price = Number(seat?.p ?? seat?.k?.p);
          if (Number.isFinite(price)) prices.push(price);
        }
      }
      return {
        id,
        label,
        path,
        totalSeats: Number.isFinite(Number(sector?.all)) ? Number(sector.all) : null,
        availableSeats,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
      };
    })
    .filter(Boolean);
}

async function main() {
  const stageId = requiredEnv('STAGE_MAP_STAGE_ID');
  const title = requiredEnv('STAGE_MAP_TITLE');
  const layoutId = requiredEnv('PBILET_LAYOUT_ID');
  const eventSourceId = requiredEnv('PBILET_EVENT_SOURCE_ID');
  const eventDateId = requiredEnv('PBILET_EVENT_DATE_ID');
  const sourceId = optionalEnv('PBILET_SOURCE_ID', DEFAULT_SOURCE_ID);
  const currency = optionalEnv('PBILET_CURRENCY', DEFAULT_CURRENCY);
  const lang = optionalEnv('PBILET_LANG', DEFAULT_LANG);

  const coordinatesUrl = `https://tickets.api.pbilet.net/public/v1/hall-layouts/${encodeURIComponent(layoutId)}/coordinates`;
  const ticketsUrl = `https://api.pbilet.net/public/v2/tickets?currency_code=${encodeURIComponent(currency)}&lang=${encodeURIComponent(lang)}&event_source_id=${encodeURIComponent(eventSourceId)}&event_date_id=${encodeURIComponent(eventDateId)}&source_id=${encodeURIComponent(sourceId)}`;

  const coordinatesPayload = await fetchJson(coordinatesUrl);
  const width = Number(coordinatesPayload?.width);
  const height = Number(coordinatesPayload?.height);
  const bgUrl = normalizeText(coordinatesPayload?.bg);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Некорректные размеры схемы pbilet');
  }
  if (!bgUrl) throw new Error('В pbilet coordinates нет bg SVG');

  const [ticketsPayload, svgMarkupRaw] = await Promise.all([
    fetchJson(ticketsUrl),
    fetchText(bgUrl),
  ]);
  let svgMarkup = svgMarkupRaw.trim();
  svgMarkup = normalizeHallSvgDataIds(svgMarkup);
  if (!svgMarkup.includes('<svg')) throw new Error(`bg не похож на SVG: ${bgUrl}`);

  const seats = collectLayoutSeats(ticketsPayload, width, height);
  const allSeatCoordinates = collectAllSeatCoordinates(coordinatesPayload, width, height);
  const sectors = collectSectorMeta(ticketsPayload);
  if (seats.length === 0) throw new Error('Не удалось извлечь координаты мест из pbilet tickets');

  const layoutJson = {
    layoutMode: 'svgNative',
    showUnavailableSeats: false,
    grayHallWhenNoOffers: true,
    seats,
    allSeatCoordinates,
    sectorMode: {
      enabled: true,
      source: 'pbilet',
      sectors,
    },
    pbilet: {
      layoutId,
      eventSourceId,
      eventDateId,
      sourceId,
      currency,
      coordinatesUrl,
      ticketsUrl,
      bgUrl,
      importedAt: new Date().toISOString(),
    },
    note:
      'pbilet import: seats используются только как координатная модель; доступность и цены берутся из GetBilet',
  };

  const result = await ticketPool.query(
    `INSERT INTO getbilet_stage_maps (
       stage_external_id, place_external_id, title, svg_markup, layout_json,
       notes_internal, external_plan_url, updated_at
     )
     VALUES ($1, NULL, $2, $3, $4::jsonb, $5, $6, NOW())
     ON CONFLICT (stage_external_id) DO UPDATE SET
       title = EXCLUDED.title,
       svg_markup = EXCLUDED.svg_markup,
       layout_json = EXCLUDED.layout_json,
       notes_internal = EXCLUDED.notes_internal,
       external_plan_url = EXCLUDED.external_plan_url,
       updated_at = NOW()
     RETURNING id, stage_external_id, title`,
    [
      stageId,
      title,
      svgMarkup,
      JSON.stringify(layoutJson),
      `Импортировано из pbilet layout ${layoutId}; seats=${seats.length}; allSeatCoordinates=${allSeatCoordinates.length}; sectors=${sectors.length}`,
      'https://sm-tickets.com/events/290778',
    ],
  );

  console.log(
    JSON.stringify(
      {
        saved: result.rows[0],
        seats: seats.length,
        allSeatCoordinates: allSeatCoordinates.length,
        sectors: sectors.length,
        bgUrl,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
