#!/usr/bin/env node
/**
 * Восстановить человеческие имена секторов Исторической сцены Большого.
 *
 * Редактор писал в поле «Сектор» ключ сравнения (latinize homoglyphs + lower +
 * без пробелов), и «Применить ряд» штамповал его в data-sector. На проде стало
 * «пaptep», «benyapлebaяctoponaлoжa5» → все BOLSHOI_SELLABLE_SECTOR_RULES
 * перестали матчиться.
 *
 * Решение: прогнать тот же normalizeSectorLabel по словарю канонических имён
 * и сматчить 1:1. Ничего не угадываем — только точные совпадения ключей.
 *
 *   node scripts/_unmangle-bolshoi-sector-names.mjs            # отчёт
 *   APPLY=1 node scripts/_unmangle-bolshoi-sector-names.mjs    # DB + bundle + SVG
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const STAGE_ID =
  process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';

const BUNDLE_PATH = path.join(
  REPO_ROOT,
  'backend/data/bolshoi-geodesy/hand/bolshoi-historical-stage-seats.bundle.json',
);
const ENRICHED_PATH = path.join(
  REPO_ROOT,
  'frontend/public/tools/bolshoi-historical-stage-enriched.svg',
);
const HALL_SVG_PATH = path.join(REPO_ROOT, 'frontend/public/hall-maps/bolshoi-historical-stage.svg');

/** 1:1 с luzhniki-gray-cloud-enriched-hover.html. */
const CYRILLIC_SECTOR_HOMOGLYPHS = {
  а: 'a', А: 'a', в: 'b', В: 'b', с: 'c', С: 'c',
  е: 'e', Е: 'e', к: 'k', К: 'k', м: 'm', М: 'm',
  о: 'o', О: 'o', р: 'p', Р: 'p', х: 'x', Х: 'x',
  у: 'y', У: 'y', т: 't', Т: 't', н: 'n', Н: 'n',
  д: 'd', Д: 'd', б: 'b', Б: 'b',
};

function latinizeSectorHomoglyphs(value) {
  return [...String(value)].map((ch) => CYRILLIC_SECTOR_HOMOGLYPHS[ch] ?? ch).join('');
}

function normalizeSectorLabel(value) {
  const raw = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const hasVip = /\bvip\b/i.test(raw);
  const stripped = latinizeSectorHomoglyphs(
    raw
      .replace(/^сектор\s*/i, '')
      .replace(/\bvip\b/gi, ' ')
      .replace(/([a-z])\s*-\s*(\d)/gi, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  const m = stripped.match(/^([a-z])\s*(\d{2,4})\b/i);
  if (m) {
    const code = m[1] + m[2];
    return hasVip ? `vip${code}` : code;
  }
  return stripped.replace(/\s+/g, '');
}

/** Канонический словарь имён зала (боковые ложи до 20 на всякий запас). */
function canonicalVocabulary() {
  const out = new Set([
    'Партер',
    'Амфитеатр',
    'Бельэтаж',
    'Партер (середина)',
    'Партер ряд А (Вип)',
    'Бельэтаж правая (ложи 4–6)',
    '1 ярус правая (ложи 5–8)',
    'Балкон 2 яруса левая',
    'Балкон 3 яруса левая',
    'Ложа бельэтажа целиком (левая 4)',
    'Ложа 1 яруса целиком (левая 9)',
    'Не подписано',
  ]);
  for (const side of ['Левая', 'Правая']) {
    for (const tier of ['Бенуар', 'Бельэтаж', '1 ярус', '2 ярус', '3 ярус']) {
      for (let i = 1; i <= 20; i += 1) out.add(`${tier} ${side} сторона Ложа ${i}`);
    }
    for (const b of [2, 3, 4]) {
      out.add(`Балкон ${b} яруса ${side} сторона`);
      out.add(`Балкон ${b} яруса ${side} сторона стоячие места`);
    }
  }
  return [...out];
}

function buildDecoder() {
  /** @type {Map<string, string[]>} */
  const byKey = new Map();
  for (const name of canonicalVocabulary()) {
    const k = normalizeSectorLabel(name);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(name);
  }
  const decoder = new Map();
  const ambiguous = [];
  for (const [k, names] of byKey) {
    if (names.length === 1) decoder.set(k, names[0]);
    else ambiguous.push({ key: k, names });
  }
  return { decoder, ambiguous };
}

/** @returns {string | null} канон или null, если имя уже нормальное / неизвестно */
function decodeSector(raw, decoder) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/[\sА-ЯЁ]/.test(s) && !/^[a-z0-9а-яё]+$/.test(s)) return null; // уже человеческое
  return decoder.get(normalizeSectorLabel(s)) ?? null;
}

async function main() {
  const { decoder, ambiguous } = buildDecoder();
  const ticketPool = (await import('../ticketDb.js')).default;

  const db = await ticketPool.query(
    `SELECT id, layout_json, svg_markup FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [STAGE_ID],
  );
  if (!db.rows[0]) throw new Error(`No stage map ${STAGE_ID}`);
  const { id, layout_json: layout, svg_markup: svg } = db.rows[0];
  const seats = Array.isArray(layout?.seats) ? layout.seats : [];

  const renames = new Map();
  const unresolved = new Map();
  const nextSeats = seats.map((s) => {
    const fixed = decodeSector(s.sector, decoder);
    const fixedDetail = decodeSector(s.sectorDetail, decoder);
    if (!fixed && !fixedDetail) {
      if (/^[a-zа-яё0-9]+$/.test(String(s.sector ?? '')) && String(s.sector ?? '').length > 6) {
        unresolved.set(s.sector, (unresolved.get(s.sector) || 0) + 1);
      }
      return s;
    }
    if (fixed) renames.set(`${s.sector} → ${fixed}`, (renames.get(`${s.sector} → ${fixed}`) || 0) + 1);
    return {
      ...s,
      ...(fixed ? { sector: fixed } : {}),
      ...(fixedDetail ? { sectorDetail: fixedDetail } : {}),
    };
  });

  const report = {
    apply: APPLY,
    stageMapId: id,
    seats: seats.length,
    renamedSeats: [...renames.values()].reduce((a, b) => a + b, 0),
    distinctRenames: renames.size,
    renames: Object.fromEntries([...renames].sort()),
    unresolved: Object.fromEntries(unresolved),
    ambiguousVocabKeys: ambiguous,
  };
  console.log(JSON.stringify(report, null, 2));

  if (!APPLY) {
    console.log('\nDry-run. APPLY=1 чтобы записать DB + bundle + SVG.');
    await ticketPool.end();
    return;
  }

  /** SVG: place-name / data-sector в кружках. */
  function fixSvg(xml) {
    if (!xml) return xml;
    return xml.replace(/(place-name|data-sector)="([^"]*)"/g, (full, attr, val) => {
      const fixed = decodeSector(val, decoder);
      return fixed ? `${attr}="${fixed}"` : full;
    });
  }

  const nextSvg = fixSvg(svg);
  await ticketPool.query(
    `UPDATE getbilet_stage_maps
     SET layout_json = jsonb_set(layout_json, '{seats}', $2::jsonb),
         svg_markup = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [id, JSON.stringify(nextSeats), nextSvg],
  );

  for (const p of [BUNDLE_PATH]) {
    if (!fs.existsSync(p)) continue;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(j.seats)) continue;
    fs.copyFileSync(p, `${p}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`);
    j.seats = j.seats.map((s) => {
      const fixed = decodeSector(s.sector, decoder);
      const fixedDetail = decodeSector(s.sectorDetail, decoder);
      return {
        ...s,
        ...(fixed ? { sector: fixed } : {}),
        ...(fixedDetail ? { sectorDetail: fixedDetail } : {}),
      };
    });
    j.note = `${j.note || ''} | unmangled sector names ${new Date().toISOString()}`.trim();
    fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`, 'utf8');
  }

  for (const p of [ENRICHED_PATH, HALL_SVG_PATH]) {
    if (!fs.existsSync(p)) continue;
    fs.copyFileSync(p, `${p}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`);
    fs.writeFileSync(p, fixSvg(fs.readFileSync(p, 'utf8')), 'utf8');
  }

  console.log(JSON.stringify({ written: true, stageMapId: id }, null, 2));
  await ticketPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
