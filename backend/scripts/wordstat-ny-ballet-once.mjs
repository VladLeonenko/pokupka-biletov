#!/usr/bin/env node
/** Разовый Wordstat (Safari) под новогодний балет Чайковского — без «Щелкунчик» в наших текстах. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../data/wordstat-ny-ballet-tchaikovsky.json');
const JS_SUBMIT = '/tmp/ws-ny-submit.js';
const JS_READ = '/tmp/ws-ny-read.js';
const AS = '/tmp/ws-ny-run.applescript';

const QUERIES = [
  'новогодний балет большой театр',
  'новогодний балет билеты',
  'новогодний балет чайковского',
  'балет чайковского билеты',
  'балет чайковского большой театр',
  'рождественский балет большой',
  'большой театр декабрь билеты',
  'большой театр новый год билеты',
  'историческая сцена большого театра билеты',
  'купить билеты большой театр декабрь',
  'балет на новый год москва',
  'новогодние балеты москва билеты',
];

function writeSubmitJs(query) {
  fs.writeFileSync(
    JS_SUBMIT,
    `(function(){
  var q = ${JSON.stringify(query)};
  var input = document.querySelector('input.textinput__control');
  if (!input) return JSON.stringify({err:'no input'});
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
    rows: rows.slice(0, 25)
  });
})();`,
    'utf8',
  );
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
  if tabRef is missing value then
    open location "https://wordstat.yandex.ru/?region=${region}&view=table"
    delay 4
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
  end if
  if tabRef is missing value then return "{\\"err\\":\\"no tab\\"}"
  set js1 to (do shell script "cat ${JS_SUBMIT}")
  do JavaScript js1 in tabRef
  delay 3.5
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
    return { err: 'parse', raw: raw.slice(0, 400), rows: [] };
  }
}

const results = [];
for (const q of QUERIES) {
  process.stderr.write(`WS: ${q} … `);
  let data;
  try {
    data = runQuery(q);
  } catch (e) {
    data = { err: String(e.message || e), rows: [] };
  }
  const top = (data.rows || []).slice(0, 3).map((r) => `${r.phrase}:${r.count}`).join('; ');
  process.stderr.write(`${(data.rows || []).length} | ${top}\n`);
  results.push({
    q,
    href: data.href || null,
    rows: data.rows || [],
    topPhrases: (data.rows || []).slice(0, 8).map((r) => r.phrase),
    err: data.err || null,
  });
  execFileSync('osascript', ['-e', 'delay 0.5']);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify({ at: new Date().toISOString(), region: '213', queries: results }, null, 2),
  'utf8',
);
console.log(`Wrote ${OUT}`);
