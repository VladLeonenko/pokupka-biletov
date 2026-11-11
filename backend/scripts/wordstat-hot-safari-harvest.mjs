#!/usr/bin/env node
/**
 * HOT Wordstat через Safari (тот же канал, что wordstat-safari-harvest.mjs).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../data/wordstat-live-2026-11-11.json');
const JS_SUBMIT = '/tmp/ws-hot-submit.js';
const JS_READ = '/tmp/ws-hot-read.js';
const AS = '/tmp/ws-hot-run.applescript';

const QUERIES = [
  'кабала святош билеты',
  'кабала святош купить билеты',
  'гамлет мхт билеты',
  'гамлет мхт купить билеты',
  'баядерка билеты',
  'баядерка купить билет',
  'турандот билеты',
  'турандот большой театр билеты',
  'чайка большой театр билеты',
  'чайка билеты',
  'евгений онегин большой театр билеты',
  'евгений онегин билеты',
  'дочь фараона билеты',
  'мхт чехова билеты',
  'мхт чехова купить билеты',
  'большой театр билеты',
  'большой театр купить билеты',
  'щелкунчик большой театр билеты',
  'щелкунчик купить билеты',
  'новогодний балет чайковского билеты',
  'новогодний балет большой театр',
];

function writeSubmitJs(query) {
  fs.writeFileSync(
    JS_SUBMIT,
    `(function(){
  var q = ${JSON.stringify(query)};
  var input = document.querySelector('input.textinput__control');
  if (!input) return JSON.stringify({err:'no input', href: location.href});
  var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, q);
  input.dispatchEvent(new Event('input', {bubbles:true}));
  input.dispatchEvent(new Event('change', {bubbles:true}));
  input.focus();
  input.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true}));
  return JSON.stringify({ok:true, q:q});
})();`,
    'utf8',
  );
}

function writeReadJs(query) {
  fs.writeFileSync(
    JS_READ,
    `(function(){
  var body = (document.body && document.body.innerText || '').slice(0, 220);
  if (/войдите|авториз|passport\\.yandex/i.test(body) || /passport\\.yandex/.test(location.href)) {
    return JSON.stringify({err:'need_login', href: location.href, body: body});
  }
  var rows = [];
  var seen = {};
  document.querySelectorAll('tr').forEach(function(tr){
    var tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;
    var phrase = (tds[0].innerText || '').trim().replace(/\\s+/g, ' ');
    var countRaw = (tds[tds.length - 1].innerText || '').trim();
    var count = Number(countRaw.replace(/\\s+/g, '').replace(/[^0-9]/g, ''));
    if (!phrase || !count || /Запросы|Число|популярн/i.test(phrase)) return;
    if (count > 5000000) return;
    var key = phrase.toLowerCase();
    if (seen[key]) return;
    seen[key] = 1;
    rows.push({phrase: phrase, count: count});
  });
  rows.sort(function(a,b){ return b.count - a.count; });
  return JSON.stringify({
    href: location.href,
    query: ${JSON.stringify(query)},
    rows: rows.slice(0, 30),
    banner: /временно недоступны/i.test(body)
  });
})();`,
    'utf8',
  );
}

function ensureTab(region = '213') {
  const openAs = `/tmp/ws-hot-open.applescript`;
  fs.writeFileSync(
    openAs,
    `tell application "Safari"
  set tabRef to missing value
  repeat with w in windows
    repeat with t in tabs of w
      try
        if (URL of t) contains "wordstat.yandex.ru" then
          set tabRef to t
          set current tab of w to t
          exit repeat
        end if
      end try
    end repeat
    if tabRef is not missing value then exit repeat
  end repeat
  if tabRef is missing value then
    open location "https://wordstat.yandex.ru/?region=${region}&view=table"
    delay 4
  end if
end tell`,
    'utf8',
  );
  execFileSync('osascript', [openAs], { encoding: 'utf8' });
}

function runQuery(query, region = '213') {
  writeSubmitJs(query);
  writeReadJs(query);
  fs.writeFileSync(
    AS,
    `tell application "Safari"
  set tabRef to missing value
  repeat with w in windows
    repeat with t in tabs of w
      try
        if (URL of t) contains "wordstat.yandex.ru" then
          set tabRef to t
          exit repeat
        end if
      end try
    end repeat
    if tabRef is not missing value then exit repeat
  end repeat
  if tabRef is missing value then return "{\\"err\\":\\"no tab\\"}"
  set js1 to (do shell script "cat ${JS_SUBMIT}")
  do JavaScript js1 in tabRef
  delay 3.4
  set jsNav to "(function(){try{var u=new URL(location.href);if(u.searchParams.get('region')!=='${region}'){u.searchParams.set('region','${region}');u.searchParams.set('view','table');location.href=u.toString();return 'nav';}}catch(e){}return 'ok';})()"
  set nav to do JavaScript jsNav in tabRef
  if nav is "nav" then delay 3.2
  set js2 to (do shell script "cat ${JS_READ}")
  return do JavaScript js2 in tabRef
end tell
`,
    'utf8',
  );
  const raw = execFileSync('osascript', [AS], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
  try {
    return JSON.parse(raw);
  } catch {
    return { err: 'parse', raw: raw.slice(0, 500), rows: [] };
  }
}

ensureTab();
const results = [];
for (const q of QUERIES) {
  process.stderr.write(`WS: ${q} … `);
  let data;
  try {
    data = runQuery(q);
  } catch (e) {
    data = { err: String(e.message || e), rows: [] };
  }
  if (data.err === 'need_login' || data.err === 'no tab') {
    process.stderr.write(`${data.err}\n`);
    results.push({ q, err: data.err, rows: [] });
    break;
  }
  const top = (data.rows || []).slice(0, 3).map((r) => `${r.phrase}:${r.count}`).join('; ');
  process.stderr.write(`${(data.rows || []).length} | ${top || data.err || ''}${data.banner ? ' [banner]' : ''}\n`);
  results.push({
    q,
    href: data.href || null,
    rows: data.rows || [],
    topPhrases: (data.rows || []).slice(0, 6).map((r) => r.phrase),
    err: data.err || null,
    banner: !!data.banner,
  });
  execFileSync('osascript', ['-e', 'delay 0.45']);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify(
    { at: new Date().toISOString(), source: 'safari-wordstat-hot', region: '213', queries: results },
    null,
    2,
  ),
  'utf8',
);
const ok = results.filter((r) => (r.rows || []).length).length;
console.log(`Wrote ${OUT} (${ok}/${results.length} ok)`);
if (results.some((r) => r.err === 'need_login')) process.exit(2);
