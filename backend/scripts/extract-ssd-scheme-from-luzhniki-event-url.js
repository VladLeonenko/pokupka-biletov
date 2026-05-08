/**
 * С страницы билетного сайта на WordPress + плагин SSD (класс ssd-chart, data-ssduuid)
 * вытаскивает schemeId для pbilet hall-layouts и метаданные события.
 *
 * Пример:
 *   export SSD_EVENT_PAGE_URL='https://luzhniki-tickets.online/football/cup-of-russia/57057/'
 *   node scripts/extract-ssd-scheme-from-luzhniki-event-url.js
 *
 * Дальше в DevTools → Network отфильтровать запрос к api.pbilet.net/public/v2/tickets
 * и скопировать event_source_id / event_date_id → STAGE_MAP_STAGE_ID из GetBilet (сцена «футбол»)
 * → npm run import:pbilet-stage-map
 */

const url = process.env.SSD_EVENT_PAGE_URL?.trim();
if (!url) {
  console.error('Задайте SSD_EVENT_PAGE_URL=…');
  process.exit(1);
}

function extractSsdJsonBlocks(html) {
  const re = /var\s+(ssd[a-zA-Z0-9_]+)\s*=\s*/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const varName = m[1];
    let i = m.index + m[0].length;
    while (i < html.length && /\s/.test(html[i])) i++;
    if (html[i] !== '{') continue;
    let depth = 0;
    const start = i;
    for (; i < html.length; i++) {
      const c = html[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          out.push({ varName, raw: html.slice(start, i + 1) });
          break;
        }
      }
    }
  }
  return out;
}

async function main() {
  const res = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'biletvsem-ssd-scheme-extract/1.0',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const html = await res.text();

  const blocks = extractSsdJsonBlocks(html);
  if (!blocks.length) {
    console.error('Не найден блок var ssd… — страница без SSD-конфига или другая вёрстка.');
    process.exit(2);
  }

  const decoded = [];
  for (const { varName, raw } of blocks) {
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch {
      continue;
    }
    const paramB64 = typeof obj.param === 'string' ? obj.param : null;
    if (!paramB64) continue;
    let param;
    try {
      param = JSON.parse(Buffer.from(paramB64, 'base64').toString('utf8'));
    } catch {
      continue;
    }
    decoded.push({ varName, param });
  }

  if (!decoded.length) {
    console.error('Не удалось распарсить SSD JSON с полем param (base64).');
    process.exit(3);
  }

  console.log(
    JSON.stringify(
      {
        pageUrl: url,
        blocks: decoded.map(({ varName, param }) => ({
          varName,
          uuid: param.uuid,
          schemeId: param.schemeId,
          eventId: param.eventId,
          eventTag: param.eventTag,
          /** подставить в PBILET_LAYOUT_ID */
          PBILET_LAYOUT_ID: String(param.schemeId ?? ''),
          hint:
            'В DevTools → Network найдите GET api.pbilet.net/public/v2/tickets?... и возьмите event_source_id и event_date_id для import:pbilet-stage-map',
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
