/**
 * Разбор экспорта GSC (Страницы.csv / Запросы.csv) — playbook §9.
 *
 * Usage:
 *   node backend/scripts/analyze-gsc-export.js data/gsc
 *   node backend/scripts/analyze-gsc-export.js path/to/Страницы.csv
 */
import fs from 'fs';
import path from 'path';

const arg = process.argv[2] || 'data/gsc';
const root = path.resolve(process.cwd(), arg);

function findCsv(base, names) {
  for (const n of names) {
    const p = fs.existsSync(base) && fs.statSync(base).isDirectory()
      ? path.join(base, n)
      : base.endsWith(n) || base.endsWith('.csv')
        ? base
        : null;
    if (p && fs.existsSync(p)) return p;
  }
  if (fs.existsSync(base) && base.endsWith('.csv')) return base;
  return null;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ?? '';
    });
    return obj;
  });
  return { headers, rows };
}

function num(v) {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  // case-insensitive
  const map = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of keys) {
    const hit = map[k.toLowerCase()];
    if (hit != null && hit !== '') return hit;
  }
  return '';
}

const pagesPath = findCsv(root, ['Страницы.csv', 'Pages.csv', 'pages.csv']);
const queriesPath = findCsv(root, ['Запросы.csv', 'Queries.csv', 'queries.csv']);

if (!pagesPath && !queriesPath) {
  console.error(`Нет CSV в ${root}
Положи экспорт GSC: Страницы.csv / Запросы.csv
См. docs/seo/GSC-BILETVSEM.md`);
  process.exit(1);
}

if (pagesPath) {
  const { rows } = parseCsv(fs.readFileSync(pagesPath, 'utf8'));
  const enriched = rows
    .map((r) => {
      const url = pick(r, 'Топ страниц', 'Страница', 'Page', 'URL', 'Верхние страницы');
      const clicks = num(pick(r, 'Клики', 'Clicks'));
      const impressions = num(pick(r, 'Показы', 'Impressions'));
      const ctr = num(pick(r, 'CTR'));
      const position = num(pick(r, 'Позиция', 'Position'));
      return { url, clicks, impressions, ctr: ctr <= 1 ? ctr * 100 : ctr, position };
    })
    .filter((r) => r.url && r.impressions > 0)
    .sort((a, b) => b.impressions - a.impressions);

  const money = enriched.filter((r) =>
    /\/ticket\/|\/events/.test(r.url),
  );

  console.log('\n=== Money URL: показы есть, CTR слабый (топ-20) ===');
  money
    .filter((r) => r.ctr < 1 && r.impressions >= 50)
    .slice(0, 20)
    .forEach((r) => {
      console.log(
        `${r.impressions}\tclk=${r.clicks}\tCTR=${r.ctr.toFixed(2)}%\tpos=${r.position.toFixed(1)}\t${r.url}`,
      );
    });

  console.log('\n=== Money URL: позиция >20 при показах (тянуть в ТОП) ===');
  money
    .filter((r) => r.position > 20 && r.impressions >= 50)
    .slice(0, 20)
    .forEach((r) => {
      console.log(
        `${r.impressions}\tpos=${r.position.toFixed(1)}\tCTR=${r.ctr.toFixed(2)}%\t${r.url}`,
      );
    });

  console.log('\n=== Топ по показам (все) ===');
  enriched.slice(0, 15).forEach((r) => {
    console.log(
      `${r.impressions}\tclk=${r.clicks}\tCTR=${r.ctr.toFixed(2)}%\tpos=${r.position.toFixed(1)}\t${r.url}`,
    );
  });
}

if (queriesPath) {
  const { rows } = parseCsv(fs.readFileSync(queriesPath, 'utf8'));
  const enriched = rows
    .map((r) => {
      const q = pick(r, 'Топ запросы', 'Запрос', 'Query', 'Верхние запросы');
      const clicks = num(pick(r, 'Клики', 'Clicks'));
      const impressions = num(pick(r, 'Показы', 'Impressions'));
      const ctr = num(pick(r, 'CTR'));
      const position = num(pick(r, 'Позиция', 'Position'));
      return { q, clicks, impressions, ctr: ctr <= 1 ? ctr * 100 : ctr, position };
    })
    .filter((r) => r.q && r.impressions > 0)
    .sort((a, b) => b.impressions - a.impressions);

  console.log('\n=== Запросы: показы / 0 кликов (кластеры) ===');
  enriched
    .filter((r) => r.clicks === 0 && r.impressions >= 100)
    .slice(0, 25)
    .forEach((r) => {
      console.log(
        `${r.impressions}\tpos=${r.position.toFixed(1)}\t${r.q}`,
      );
    });
}

console.log('\nГотово. Интерпретация: docs/seo/GSC-BILETVSEM.md');
