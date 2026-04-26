import express from 'express';
import ticketPool from '../ticketDb.js';
import { probePosterImages } from '../services/posterPageProbe.js';
import { syncGetbiletCatalogFromApi } from '../services/getbiletCatalogSync.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';
import {
  isPosterSearchConfigured,
  isWebPosterSearchConfigured,
  isOpenAIPosterSearchConfigured,
  searchPosterImageByEventTitle,
} from '../services/eventPosterWebSearch.js';

/**
 * @param {string} externalId
 * @param {string | null | undefined} titleManual
 */
async function resolveTitleForPosterWebSearch(externalId, titleManual) {
  const m = titleManual != null && String(titleManual).trim() ? String(titleManual).trim() : '';
  if (m) return m;
  const r = await ticketPool.query(
    `SELECT NULLIF(trim(COALESCE(payload_json->>'Name', payload_json->>'name', '')), '') AS n
     FROM getbilet_catalog_cache WHERE repertoire_external_id = $1`,
    [externalId],
  );
  const n = r.rows[0]?.n;
  return n ? String(n) : null;
}

const router = express.Router();

/** Синхронизация каталога GetBilet → getbilet_catalog_cache + заготовки getbilet_events */
router.post('/sync-catalog', async (req, res) => {
  try {
    const r = await syncGetbiletCatalogFromApi();
    invalidateGetbiletEventsHttpCache();
    res.json({ ok: true, ...r });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
      return res.status(503).json({
        error: 'schema',
        message: 'Нет таблицы getbilet_catalog_cache — примените миграции 073',
      });
    }
    res.status(500).json({ error: e.message || String(e) });
  }
});

function parseId(param) {
  const id = parseInt(param, 10);
  return Number.isFinite(id) ? id : null;
}

// --- Events ---

router.get('/events', async (req, res) => {
  try {
    const r = await ticketPool.query(
      `SELECT e.id, e.getbilet_external_id, e.title_manual, e.description_manual, e.notes_internal,
              e.poster_url_manual, e.poster_url_web, e.banner_url_manual, e.poster_page_url,
              e.is_published, e.sort_order, e.last_seen_in_catalog_at, e.created_at, e.updated_at,
              (SELECT m.last_completed_at FROM getbilet_catalog_sync_meta m WHERE m.singleton = 1) AS catalog_last_sync_at
       FROM getbilet_events e
       ORDER BY e.sort_order ASC, e.id ASC`
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/events/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  try {
    const r = await ticketPool.query(
      `SELECT e.*, m.group_id AS group_id
       FROM getbilet_events e
       LEFT JOIN getbilet_event_group_members m ON m.event_id = e.id
       WHERE e.id = $1`,
      [id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/events', async (req, res) => {
  const {
    getbilet_external_id,
    title_manual,
    description_manual,
    notes_internal,
    poster_url_manual,
    poster_url_web,
    banner_url_manual,
    poster_page_url,
    is_published,
    sort_order,
    group_id,
  } = req.body || {};
  const ext = (getbilet_external_id || '').trim();
  if (!ext) return res.status(400).json({ error: 'Укажите внешний id GetBilet' });
  try {
    const r = await ticketPool.query(
      `INSERT INTO getbilet_events (
        getbilet_external_id, title_manual, description_manual, notes_internal,
        poster_url_manual, poster_url_web, banner_url_manual, poster_page_url, is_published, sort_order, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, TRUE), COALESCE($10, 0), NOW())
      RETURNING *`,
      [
        ext,
        title_manual?.trim() || null,
        description_manual?.trim() || null,
        notes_internal?.trim() || null,
        poster_url_manual?.trim() || null,
        poster_url_web?.trim() || null,
        banner_url_manual?.trim() || null,
        poster_page_url?.trim() || null,
        is_published,
        sort_order,
      ]
    );
    const row = r.rows[0];
    const gid = parseId(group_id);
    if (gid) {
      await ticketPool.query(
        `INSERT INTO getbilet_event_group_members (event_id, group_id) VALUES ($1, $2)
         ON CONFLICT (event_id) DO UPDATE SET group_id = EXCLUDED.group_id`,
        [row.id, gid]
      );
    }
    const full = await ticketPool.query(
      `SELECT e.*, m.group_id AS group_id FROM getbilet_events e
       LEFT JOIN getbilet_event_group_members m ON m.event_id = e.id WHERE e.id = $1`,
      [row.id]
    );
    res.status(201).json(full.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Такой внешний id уже есть' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/events/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  const {
    getbilet_external_id,
    title_manual,
    description_manual,
    description_pack_json,
    notes_internal,
    poster_url_manual,
    poster_url_web,
    banner_url_manual,
    poster_page_url,
    is_published,
    sort_order,
    group_id,
  } = req.body || {};
  try {
    const cur = await ticketPool.query(`SELECT * FROM getbilet_events WHERE id = $1`, [id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Не найдено' });
    const c = cur.rows[0];
    const ext =
      getbilet_external_id !== undefined ? String(getbilet_external_id).trim() : c.getbilet_external_id;
    if (!ext) return res.status(400).json({ error: 'Внешний id не может быть пустым' });
    const so = sort_order !== undefined ? Number(sort_order) : c.sort_order;
    if (!Number.isFinite(so)) return res.status(400).json({ error: 'Порядок сортировки: число' });

    let packJson = c.description_pack_json;
    if (description_pack_json !== undefined) {
      if (description_pack_json === null) {
        packJson = null;
      } else if (description_pack_json && typeof description_pack_json === 'object') {
        packJson = description_pack_json;
      }
    }

    await ticketPool.query(
      `UPDATE getbilet_events SET
        getbilet_external_id = $2,
        title_manual = $3,
        description_manual = $4,
        description_pack_json = $12,
        notes_internal = $5,
        poster_url_manual = $6,
        poster_url_web = $7,
        banner_url_manual = $8,
        poster_page_url = $9,
        is_published = $10,
        sort_order = $11,
        updated_at = NOW()
      WHERE id = $1`,
      [
        id,
        ext,
        title_manual !== undefined ? title_manual?.trim() || null : c.title_manual,
        description_manual !== undefined ? description_manual?.trim() || null : c.description_manual,
        notes_internal !== undefined ? notes_internal?.trim() || null : c.notes_internal,
        poster_url_manual !== undefined ? poster_url_manual?.trim() || null : c.poster_url_manual,
        poster_url_web !== undefined ? poster_url_web?.trim() || null : c.poster_url_web,
        banner_url_manual !== undefined ? banner_url_manual?.trim() || null : c.banner_url_manual,
        poster_page_url !== undefined ? poster_page_url?.trim() || null : c.poster_page_url,
        is_published !== undefined ? Boolean(is_published) : c.is_published,
        so,
        description_pack_json !== undefined ? packJson : c.description_pack_json,
      ]
    );

    if (group_id !== undefined) {
      const gid = parseId(group_id);
      await ticketPool.query(`DELETE FROM getbilet_event_group_members WHERE event_id = $1`, [id]);
      if (gid) {
        await ticketPool.query(
          `INSERT INTO getbilet_event_group_members (event_id, group_id) VALUES ($1, $2)`,
          [id, gid]
        );
      }
    }

    const full = await ticketPool.query(
      `SELECT e.*, m.group_id AS group_id FROM getbilet_events e
       LEFT JOIN getbilet_event_group_members m ON m.event_id = e.id WHERE e.id = $1`,
      [id]
    );
    res.json(full.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Такой внешний id уже есть' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/events/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  try {
    const r = await ticketPool.query(`DELETE FROM getbilet_events WHERE id = $1 RETURNING id`, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Проверка URL страницы: кандидаты превью без записи в БД */
router.post('/poster-probe', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!url) return res.status(400).json({ error: 'Укажите url' });
  try {
    const { bestUrl, candidates, finalUrl } = await probePosterImages(url);
    res.json({ bestUrl, candidates, finalUrl });
  } catch (e) {
    res.status(400).json({ error: e.message || String(e) });
  }
});

/**
 * Подтянуть постер со страницы в poster_url_manual.
 * Тело: { url?: string, also_banner?: boolean, force?: boolean } — url перекрывает poster_page_url из БД.
 */
router.post('/events/:id/fetch-poster', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  const bodyUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  const alsoBanner = Boolean(req.body?.also_banner);
  const force = Boolean(req.body?.force);
  try {
    const cur = await ticketPool.query(
      `SELECT id, poster_page_url, poster_url_manual, banner_url_manual FROM getbilet_events WHERE id = $1`,
      [id],
    );
    if (!cur.rows.length) return res.status(404).json({ error: 'Не найдено' });
    const row = cur.rows[0];
    const pageUrl = bodyUrl || (row.poster_page_url || '').trim();
    if (!pageUrl) {
      return res.status(400).json({
        error: 'Нет URL страницы: заполните «Страница афиши» или передайте url в теле запроса',
      });
    }
    if (!force && row.poster_url_manual?.trim()) {
      return res.json({
        skipped: true,
        reason: 'poster_url_manual уже задан (force=true чтобы перезаписать)',
        bestUrl: null,
        candidates: [],
      });
    }
    const { bestUrl, candidates, finalUrl } = await probePosterImages(pageUrl);
    if (!bestUrl) {
      return res.status(422).json({
        error: 'На странице не найдены og:image / twitter / JSON-LD image',
        candidates,
        finalUrl,
      });
    }

    const pageStored = (bodyUrl || row.poster_page_url || pageUrl).trim();
    if (alsoBanner) {
      await ticketPool.query(
        `UPDATE getbilet_events SET
          poster_url_manual = $2,
          poster_page_url = $3,
          banner_url_manual = COALESCE(NULLIF(trim(COALESCE(banner_url_manual, '')), ''), $2),
          updated_at = NOW()
        WHERE id = $1`,
        [id, bestUrl, pageStored],
      );
    } else {
      await ticketPool.query(
        `UPDATE getbilet_events SET poster_url_manual = $2, poster_page_url = $3, updated_at = NOW() WHERE id = $1`,
        [id, bestUrl, pageStored],
      );
    }

    const full = await ticketPool.query(
      `SELECT e.*, m.group_id AS group_id FROM getbilet_events e
       LEFT JOIN getbilet_event_group_members m ON m.event_id = e.id WHERE e.id = $1`,
      [id],
    );
    res.json({
      bestUrl,
      candidates,
      finalUrl,
      saved: true,
      row: full.rows[0],
    });
  } catch (e) {
    res.status(400).json({ error: e.message || String(e) });
  }
});

/** Статус провайдеров поиска обложек (OpenAI / Google CSE, см. POSTER_SEARCH_PROVIDER) */
router.get('/web-poster-search-status', async (_req, res) => {
  res.json({
    configured: isPosterSearchConfigured(),
    google: isWebPosterSearchConfigured(),
    openai: isOpenAIPosterSearchConfigured(),
    provider: (process.env.POSTER_SEARCH_PROVIDER || 'auto').trim(),
  });
});

/**
 * Найти картинку по названию (Google CSE) → poster_url_web. Ручной постер (poster_url_manual) не перезаписывается.
 * Тело: { force?: boolean } — перезаписать poster_url_web, если уже был автопоиск.
 */
router.post('/events/:id/fetch-poster-web', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  const force = Boolean(req.body?.force);
  try {
    if (!isPosterSearchConfigured()) {
      return res.status(503).json({
        error: 'poster_search_not_configured',
        message: 'Задайте OPENAI_API_KEY или GOOGLE_CUSTOM_SEARCH_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID в backend/.env',
      });
    }
    const cur = await ticketPool.query(
      `SELECT id, getbilet_external_id, title_manual, poster_url_manual, poster_url_web FROM getbilet_events WHERE id = $1`,
      [id],
    );
    if (!cur.rows.length) return res.status(404).json({ error: 'Не найдено' });
    const row = cur.rows[0];
    if (!force && row.poster_url_manual?.trim()) {
      return res.json({
        skipped: true,
        reason: 'Задан ручной URL постера — очистите его или force=true (автопоиск пишет только в «из веба»)',
        imageUrl: null,
        row,
      });
    }
    if (!force && row.poster_url_web?.trim()) {
      return res.json({
        skipped: true,
        reason: 'poster_url_web уже заполнен (force=true чтобы перезаписать)',
        imageUrl: null,
        row,
      });
    }
    const title = await resolveTitleForPosterWebSearch(row.getbilet_external_id, row.title_manual);
    if (!title) {
      return res.status(400).json({
        error: 'Нет названия для поиска: заполните «Название» или синхронизируйте каталог (имя из кэша)',
      });
    }
    const found = await searchPosterImageByEventTitle(title);
    if (!found?.url) {
      return res.status(422).json({
        error: 'Изображения не найдены',
        queryTitle: title,
      });
    }
    await ticketPool.query(
      `UPDATE getbilet_events SET poster_url_web = $2, updated_at = NOW() WHERE id = $1`,
      [id, found.url],
    );
    invalidateGetbiletEventsHttpCache();
    const full = await ticketPool.query(
      `SELECT e.*, m.group_id AS group_id FROM getbilet_events e
       LEFT JOIN getbilet_event_group_members m ON m.event_id = e.id WHERE e.id = $1`,
      [id],
    );
    res.json({
      saved: true,
      imageUrl: found.url,
      searchTitle: title,
      resultTitle: found.title,
      rawItems: found.rawItems,
      row: full.rows[0],
    });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42703') {
      return res.status(503).json({ error: 'Выполните миграцию 076 (poster_url_web)' });
    }
    res.status(400).json({ error: e.message || String(e) });
  }
});

/**
 * Массово: poster_url_web через Google CSE по названию (ручное или из кэша каталога).
 * Тело: { limit?: number, force?: boolean, delay_ms?: number }
 */
router.post('/events/batch-fetch-posters-web', async (req, res) => {
  const limit = Math.min(Number(req.body?.limit) || 20, 50);
  const force = Boolean(req.body?.force);
  const delayMs = Math.min(Number(req.body?.delay_ms) || 600, 8000);
  try {
    if (!isPosterSearchConfigured()) {
      return res.status(503).json({
        error: 'poster_search_not_configured',
        message: 'Задайте OPENAI_API_KEY или Google Custom Search (GOOGLE_CUSTOM_*)',
      });
    }
    const emptyWeb = force
      ? 'TRUE'
      : `(e.poster_url_web IS NULL OR trim(e.poster_url_web) = '')`;
    const r = await ticketPool.query(
      `SELECT e.id, e.getbilet_external_id, e.title_manual,
              NULLIF(trim(COALESCE(c.payload_json->>'Name', c.payload_json->>'name', '')), '') AS cache_title
       FROM getbilet_events e
       LEFT JOIN getbilet_catalog_cache c ON c.repertoire_external_id = e.getbilet_external_id
       WHERE e.is_published = TRUE
         AND (e.poster_url_manual IS NULL OR trim(e.poster_url_manual) = '')
         AND ${emptyWeb}
         AND (
           NULLIF(trim(COALESCE(e.title_manual, '')), '') IS NOT NULL
           OR NULLIF(trim(COALESCE(c.payload_json->>'Name', c.payload_json->>'name', '')), '') IS NOT NULL
         )
       ORDER BY e.id ASC
       LIMIT $1`,
      [limit],
    );
    if (r.rows.length === 0) {
      return res.json({
        processed: 0,
        results: [],
        hint:
          'Нет карточек: нужны опубликованные события без ручного постера, с названием (ручным или в кэше каталога).',
      });
    }
    const results = [];
    for (const row of r.rows) {
      const title =
        (row.title_manual && String(row.title_manual).trim()) ||
        (row.cache_title && String(row.cache_title).trim()) ||
        '';
      try {
        if (!title) {
          results.push({ id: row.id, ok: false, error: 'нет названия' });
        } else {
          const found = await searchPosterImageByEventTitle(title);
          if (!found?.url) {
            results.push({ id: row.id, ok: false, error: 'нет картинок в выдаче', searchTitle: title });
          } else {
            await ticketPool.query(
              `UPDATE getbilet_events SET poster_url_web = $2, updated_at = NOW() WHERE id = $1`,
              [row.id, found.url],
            );
            results.push({ id: row.id, ok: true, imageUrl: found.url, searchTitle: title });
          }
        }
      } catch (e) {
        results.push({ id: row.id, ok: false, error: e.message || String(e) });
      }
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    invalidateGetbiletEventsHttpCache();
    res.json({ processed: results.length, results });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42703') {
      return res.status(503).json({ error: 'Миграция 076: колонка poster_url_web' });
    }
    res.status(500).json({ error: e.message || String(e) });
  }
});

/**
 * Массово: у кого задан poster_page_url и пустой poster_url_manual (или force).
 * Тело: { limit?: number, force?: boolean, also_banner?: boolean, delay_ms?: number }
 */
router.post('/events/batch-fetch-posters', async (req, res) => {
  const limit = Math.min(Number(req.body?.limit) || 30, 80);
  const force = Boolean(req.body?.force);
  const alsoBanner = Boolean(req.body?.also_banner);
  const delayMs = Math.min(Number(req.body?.delay_ms) || 400, 5000);
  try {
    const cond = force
      ? `poster_page_url IS NOT NULL AND trim(poster_page_url) <> ''`
      : `poster_page_url IS NOT NULL AND trim(poster_page_url) <> ''
         AND (poster_url_manual IS NULL OR trim(poster_url_manual) = '')`;
    const r = await ticketPool.query(
      `SELECT id, poster_page_url FROM getbilet_events WHERE is_published = TRUE AND ${cond} ORDER BY id ASC LIMIT $1`,
      [limit],
    );
    if (r.rows.length === 0) {
      return res.json({
        processed: 0,
        results: [],
        hint:
          'Нет строк для обработки: нужен «URL страницы спектакля» (poster_page_url) в карточке и пустой постер. Сначала «Синхронизировать каталог», затем «Постеры из кэша API» (если в ответе GetBilet есть картинки), или укажите URL вручную.',
      });
    }
    const results = [];
    for (const row of r.rows) {
      try {
        const { bestUrl, candidates, finalUrl } = await probePosterImages(row.poster_page_url.trim());
        if (!bestUrl) {
          results.push({ id: row.id, ok: false, error: 'нет картинки на странице', candidates: candidates?.length ?? 0 });
        } else if (alsoBanner) {
          await ticketPool.query(
            `UPDATE getbilet_events SET
              poster_url_manual = $2,
              banner_url_manual = COALESCE(NULLIF(trim(COALESCE(banner_url_manual, '')), ''), $2),
              updated_at = NOW()
            WHERE id = $1`,
            [row.id, bestUrl],
          );
          results.push({ id: row.id, ok: true, bestUrl, finalUrl });
        } else {
          await ticketPool.query(
            `UPDATE getbilet_events SET poster_url_manual = $2, updated_at = NOW() WHERE id = $1`,
            [row.id, bestUrl],
          );
          results.push({ id: row.id, ok: true, bestUrl, finalUrl });
        }
      } catch (e) {
        results.push({ id: row.id, ok: false, error: e.message || String(e) });
      }
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
    res.json({ processed: results.length, results });
  } catch (e) {
    if (e.code === '42703' || e.message?.includes('poster_page_url')) {
      return res.status(503).json({
        error: 'Колонка poster_page_url отсутствует — выполните миграцию 072',
      });
    }
    res.status(500).json({ error: e.message });
  }
});

/**
 * Заполнить poster_url_manual из ImageUrl в getbilet_catalog_cache (после sync), где постер ещё пуст.
 */
router.post('/events/batch-posters-from-cache-images', async (req, res) => {
  try {
    const r = await ticketPool.query(`
      WITH imgs AS (
        SELECT
          repertoire_external_id AS ext_id,
          NULLIF(trim(COALESCE(payload_json->>'ImageUrl', payload_json->>'imageUrl', '')), '') AS img
        FROM getbilet_catalog_cache
      )
      UPDATE getbilet_events e
      SET poster_url_manual = i.img,
          updated_at = NOW()
      FROM imgs i
      WHERE e.getbilet_external_id = i.ext_id
        AND i.img IS NOT NULL
        AND (i.img ~ '^https?://' OR i.img ~ '^/')
        AND (e.poster_url_manual IS NULL OR trim(e.poster_url_manual) = '')
      RETURNING e.id, e.getbilet_external_id
    `);
    return res.json({
      updated: r.rowCount,
      rows: r.rows,
      hint:
        r.rowCount === 0
          ? 'В кэше нет ImageUrl или постеры уже заполнены. Выполните «Синхронизировать каталог» сначала.'
          : undefined,
    });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
      return res.status(503).json({ error: 'Таблица getbilet_catalog_cache отсутствует' });
    }
    res.status(500).json({ error: e.message || String(e) });
  }
});

/** Списки stage_id из кэша каталога — что подставлять в схемы залов / ссылки «купить билет». */
router.get('/catalog-stage-ids', async (req, res) => {
  try {
    const r = await ticketPool.query(`
      SELECT
        stage_id,
        COUNT(*)::int AS events_in_cache,
        MAX(TRIM(COALESCE(payload_json->>'Name', payload_json->>'name', ''))) AS sample_title
      FROM getbilet_catalog_cache
      WHERE stage_id IS NOT NULL AND trim(stage_id) <> ''
      GROUP BY stage_id
      ORDER BY events_in_cache DESC, stage_id
    `);
    return res.json({ stages: r.rows });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
      return res.status(503).json({ error: 'Нет таблицы getbilet_catalog_cache' });
    }
    res.status(500).json({ error: e.message || String(e) });
  }
});

// --- Groups ---

router.get('/groups', async (req, res) => {
  try {
    const r = await ticketPool.query(
      `SELECT g.id, g.name, g.slug, g.created_at, g.updated_at,
              COUNT(m.event_id)::int AS events_count
       FROM getbilet_event_groups g
       LEFT JOIN getbilet_event_group_members m ON m.group_id = g.id
       GROUP BY g.id
       ORDER BY g.name ASC`
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/groups', async (req, res) => {
  const { name, slug } = req.body || {};
  const n = (name || '').trim();
  if (!n) return res.status(400).json({ error: 'Название группы обязательно' });
  try {
    const r = await ticketPool.query(
      `INSERT INTO getbilet_event_groups (name, slug, updated_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [n, slug?.trim() || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Такой slug уже занят' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/groups/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  const { name, slug } = req.body || {};
  try {
    const cur = await ticketPool.query(`SELECT * FROM getbilet_event_groups WHERE id = $1`, [id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Не найдено' });
    const c = cur.rows[0];
    const n = name !== undefined ? String(name).trim() : c.name;
    if (!n) return res.status(400).json({ error: 'Название не может быть пустым' });
    const s =
      slug !== undefined ? (slug === null || slug === '' ? null : String(slug).trim()) : c.slug;
    const r = await ticketPool.query(
      `UPDATE getbilet_event_groups SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [n, s, id]
    );
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Такой slug уже занят' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/groups/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  try {
    const r = await ticketPool.query(`DELETE FROM getbilet_event_groups WHERE id = $1 RETURNING id`, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Markup ---

router.get('/markup', async (req, res) => {
  try {
    const globalR = await ticketPool.query(
      `SELECT id, markup_kind, markup_value, updated_at FROM getbilet_markup_rules WHERE scope = 'global' LIMIT 1`
    );
    const groupR = await ticketPool.query(
      `SELECT r.id, r.group_id, r.markup_kind, r.markup_value, r.updated_at, g.name AS group_name
       FROM getbilet_markup_rules r
       JOIN getbilet_event_groups g ON g.id = r.group_id
       WHERE r.scope = 'group'
       ORDER BY g.name`
    );
    const eventR = await ticketPool.query(
      `SELECT r.id, r.event_id, r.markup_kind, r.markup_value, r.updated_at,
              e.getbilet_external_id, e.title_manual
       FROM getbilet_markup_rules r
       JOIN getbilet_events e ON e.id = r.event_id
       WHERE r.scope = 'event'
       ORDER BY e.sort_order, e.id`
    );
    res.json({
      global: globalR.rows[0] || null,
      groupRules: groupR.rows,
      eventRules: eventR.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/markup/global', async (req, res) => {
  const { markup_kind, markup_value } = req.body || {};
  if (!['percent', 'fixed'].includes(markup_kind)) {
    return res.status(400).json({ error: 'markup_kind: percent или fixed' });
  }
  const val = Number(markup_value);
  if (!Number.isFinite(val) || val < 0) return res.status(400).json({ error: 'Некорректное значение наценки' });
  try {
    const ex = await ticketPool.query(`SELECT id FROM getbilet_markup_rules WHERE scope = 'global' LIMIT 1`);
    if (ex.rows.length) {
      const u = await ticketPool.query(
        `UPDATE getbilet_markup_rules SET markup_kind = $1, markup_value = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [markup_kind, val, ex.rows[0].id]
      );
      return res.json(u.rows[0]);
    }
    const ins = await ticketPool.query(
      `INSERT INTO getbilet_markup_rules (scope, markup_kind, markup_value) VALUES ('global', $1, $2) RETURNING *`,
      [markup_kind, val]
    );
    res.json(ins.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/markup/group/:groupId', async (req, res) => {
  const groupId = parseId(req.params.groupId);
  if (!groupId) return res.status(400).json({ error: 'Некорректный id группы' });
  const { markup_kind, markup_value } = req.body || {};
  if (!['percent', 'fixed'].includes(markup_kind)) {
    return res.status(400).json({ error: 'markup_kind: percent или fixed' });
  }
  const val = Number(markup_value);
  if (!Number.isFinite(val) || val < 0) return res.status(400).json({ error: 'Некорректное значение' });
  try {
    const g = await ticketPool.query(`SELECT id FROM getbilet_event_groups WHERE id = $1`, [groupId]);
    if (!g.rows.length) return res.status(404).json({ error: 'Группа не найдена' });

    const ex = await ticketPool.query(
      `SELECT id FROM getbilet_markup_rules WHERE scope = 'group' AND group_id = $1`,
      [groupId]
    );
    if (ex.rows.length) {
      const u = await ticketPool.query(
        `UPDATE getbilet_markup_rules SET markup_kind = $1, markup_value = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [markup_kind, val, ex.rows[0].id]
      );
      return res.json(u.rows[0]);
    }
    const ins = await ticketPool.query(
      `INSERT INTO getbilet_markup_rules (scope, group_id, markup_kind, markup_value)
       VALUES ('group', $1, $2, $3) RETURNING *`,
      [groupId, markup_kind, val]
    );
    res.json(ins.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/markup/group/:groupId', async (req, res) => {
  const groupId = parseId(req.params.groupId);
  if (!groupId) return res.status(400).json({ error: 'Некорректный id' });
  try {
    await ticketPool.query(`DELETE FROM getbilet_markup_rules WHERE scope = 'group' AND group_id = $1`, [groupId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/markup/event/:eventId', async (req, res) => {
  const eventId = parseId(req.params.eventId);
  if (!eventId) return res.status(400).json({ error: 'Некорректный id события' });
  const { markup_kind, markup_value } = req.body || {};
  if (!['percent', 'fixed'].includes(markup_kind)) {
    return res.status(400).json({ error: 'markup_kind: percent или fixed' });
  }
  const val = Number(markup_value);
  if (!Number.isFinite(val) || val < 0) return res.status(400).json({ error: 'Некорректное значение' });
  try {
    const ev = await ticketPool.query(`SELECT id FROM getbilet_events WHERE id = $1`, [eventId]);
    if (!ev.rows.length) return res.status(404).json({ error: 'Мероприятие не найдено' });

    const ex = await ticketPool.query(
      `SELECT id FROM getbilet_markup_rules WHERE scope = 'event' AND event_id = $1`,
      [eventId]
    );
    if (ex.rows.length) {
      const u = await ticketPool.query(
        `UPDATE getbilet_markup_rules SET markup_kind = $1, markup_value = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [markup_kind, val, ex.rows[0].id]
      );
      return res.json(u.rows[0]);
    }
    const ins = await ticketPool.query(
      `INSERT INTO getbilet_markup_rules (scope, event_id, markup_kind, markup_value)
       VALUES ('event', $1, $2, $3) RETURNING *`,
      [eventId, markup_kind, val]
    );
    res.json(ins.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/markup/event/:eventId', async (req, res) => {
  const eventId = parseId(req.params.eventId);
  if (!eventId) return res.status(400).json({ error: 'Некорректный id' });
  try {
    await ticketPool.query(`DELETE FROM getbilet_markup_rules WHERE scope = 'event' AND event_id = $1`, [eventId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Promos ---

router.get('/promos', async (req, res) => {
  try {
    const r = await ticketPool.query(
      `SELECT id, code, discount_kind, discount_value, max_uses_total, max_uses_per_user, uses_count,
              valid_from, valid_until, min_order_amount, is_active, notes, created_at, updated_at
       FROM getbilet_promo_codes
       ORDER BY is_active DESC, lower(code)`
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/promos', async (req, res) => {
  const parsed = parsePromoPayload(req.body || {}, null);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const row = parsed.row;
  try {
    const r = await ticketPool.query(
      `INSERT INTO getbilet_promo_codes (
        code, discount_kind, discount_value, max_uses_total, max_uses_per_user,
        valid_from, valid_until, min_order_amount, is_active, notes, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,TRUE),$10,NOW())
      RETURNING *`,
      [
        row.code,
        row.discount_kind,
        row.discount_value,
        row.max_uses_total,
        row.max_uses_per_user,
        row.valid_from,
        row.valid_until,
        row.min_order_amount,
        row.is_active,
        row.notes,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Такой промокод уже есть' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/promos/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  try {
    const cur = await ticketPool.query(`SELECT * FROM getbilet_promo_codes WHERE id = $1`, [id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Не найдено' });
    const parsed = parsePromoPayload(req.body || {}, cur.rows[0]);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const row = parsed.row;
    const r = await ticketPool.query(
      `UPDATE getbilet_promo_codes SET
        code = $2,
        discount_kind = $3,
        discount_value = $4,
        max_uses_total = $5,
        max_uses_per_user = $6,
        valid_from = $7,
        valid_until = $8,
        min_order_amount = $9,
        is_active = $10,
        notes = $11,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        row.code,
        row.discount_kind,
        row.discount_value,
        row.max_uses_total,
        row.max_uses_per_user,
        row.valid_from,
        row.valid_until,
        row.min_order_amount,
        row.is_active,
        row.notes,
      ]
    );
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Такой промокод уже есть' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/promos/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  try {
    const r = await ticketPool.query(`DELETE FROM getbilet_promo_codes WHERE id = $1 RETURNING id`, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** existing — строка из БД при PATCH; null — только создание */
function parsePromoPayload(body, existing) {
  const isCreate = !existing;
  const code =
    body.code != null
      ? String(body.code).trim().toUpperCase()
      : existing
        ? existing.code
        : '';
  if (isCreate && !code) return { error: 'Укажите код промокода' };

  const discount_kind =
    body.discount_kind != null ? body.discount_kind : existing?.discount_kind;
  if (!['percent', 'fixed'].includes(discount_kind)) {
    return { error: 'discount_kind: percent или fixed' };
  }

  const discount_value =
    body.discount_value != null ? Number(body.discount_value) : Number(existing?.discount_value);
  if (!Number.isFinite(discount_value) || discount_value < 0) {
    return { error: 'Некорректная скидка' };
  }
  if (discount_kind === 'percent' && discount_value > 100) {
    return { error: 'Процент скидки 0–100' };
  }

  const max_uses_total = pickOptionalInt(body.max_uses_total, existing?.max_uses_total);
  const max_uses_per_user = pickOptionalInt(body.max_uses_per_user, existing?.max_uses_per_user);
  if (max_uses_total != null && max_uses_total < 0) return { error: 'Лимит использований ≥ 0' };
  if (max_uses_per_user != null && max_uses_per_user < 0) return { error: 'Лимит на пользователя ≥ 0' };

  const valid_from =
    body.valid_from !== undefined ? parseOptionalDate(body.valid_from) : existing?.valid_from ?? null;
  const valid_until =
    body.valid_until !== undefined ? parseOptionalDate(body.valid_until) : existing?.valid_until ?? null;

  const min_order_amount = pickOptionalNumber(body.min_order_amount, existing?.min_order_amount);
  if (min_order_amount != null && (!Number.isFinite(min_order_amount) || min_order_amount < 0)) {
    return { error: 'Мин. сумма заказа некорректна' };
  }

  const notes =
    body.notes !== undefined ? String(body.notes).trim() || null : existing?.notes ?? null;
  const is_active =
    body.is_active !== undefined ? Boolean(body.is_active) : existing?.is_active ?? true;

  if (valid_from && valid_until && new Date(valid_from) > new Date(valid_until)) {
    return { error: 'valid_from не позже valid_until' };
  }

  return {
    row: {
      code,
      discount_kind,
      discount_value,
      max_uses_total,
      max_uses_per_user,
      valid_from,
      valid_until,
      min_order_amount,
      notes,
      is_active,
    },
  };
}

function pickOptionalInt(fromBody, fallback) {
  if (fromBody === undefined) return fallback ?? null;
  if (fromBody === '' || fromBody === null) return null;
  const n = parseInt(fromBody, 10);
  return Number.isFinite(n) ? n : null;
}

function pickOptionalNumber(fromBody, fallback) {
  if (fromBody === undefined) return fallback ?? null;
  if (fromBody === '' || fromBody === null) return null;
  const n = Number(fromBody);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalDate(v) {
  if (v === '' || v == null) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// --- Схемы залов (StageId из GetBilet) ---

router.get('/stage-maps', async (req, res) => {
  try {
    const r = await ticketPool.query(
      `SELECT id, stage_external_id, place_external_id, title,
              (svg_markup IS NOT NULL AND length(trim(svg_markup)) > 0) AS has_svg,
              (external_plan_url IS NOT NULL AND trim(external_plan_url) <> '') AS has_external_plan,
              layout_json, notes_internal, updated_at
       FROM getbilet_stage_maps
       ORDER BY title NULLS LAST, id ASC`
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Пустые строки схем для каждого stage_id из кэша каталога (уже существующие StageId не трогаем). */
router.post('/stage-maps/import-from-catalog', async (req, res) => {
  try {
    const r = await ticketPool.query(`
      WITH src AS (
        SELECT
          trim(stage_id::text) AS stage_id,
          MAX(NULLIF(TRIM(COALESCE(payload_json->>'Name', payload_json->>'name', '')), '')) AS sample_title
        FROM getbilet_catalog_cache
        WHERE stage_id IS NOT NULL AND trim(stage_id::text) <> ''
        GROUP BY trim(stage_id::text)
      ),
      ins AS (
        INSERT INTO getbilet_stage_maps (stage_external_id, title, layout_json, updated_at)
        SELECT stage_id, NULLIF(TRIM(sample_title), ''), '{}'::jsonb, NOW()
        FROM src
        ON CONFLICT (stage_external_id) DO NOTHING
        RETURNING id
      )
      SELECT
        (SELECT count(*)::int FROM ins) AS inserted,
        (SELECT count(*)::int FROM src) AS distinct_stages_in_catalog
    `);
    const row = r.rows[0];
    res.json({
      inserted: row?.inserted ?? 0,
      distinct_stages_in_catalog: row?.distinct_stages_in_catalog ?? 0,
    });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
      return res.status(503).json({
        error: 'Нет таблицы getbilet_catalog_cache или getbilet_stage_maps — примените миграции',
      });
    }
    res.status(500).json({ error: e.message || String(e) });
  }
});

router.get('/stage-maps/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  try {
    const r = await ticketPool.query(`SELECT * FROM getbilet_stage_maps WHERE id = $1`, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/stage-maps', async (req, res) => {
  const {
    stage_external_id,
    place_external_id,
    title,
    svg_markup,
    layout_json,
    notes_internal,
    external_plan_url,
  } = req.body || {};
  const sid = (stage_external_id || '').trim();
  if (!sid) return res.status(400).json({ error: 'stage_external_id обязателен (Id сцены из GetBilet)' });
  try {
    const r = await ticketPool.query(
      `INSERT INTO getbilet_stage_maps (
        stage_external_id, place_external_id, title, svg_markup, layout_json, notes_internal, external_plan_url, updated_at
      ) VALUES ($1, $2, $3, $4, COALESCE($5, '{}'::jsonb), $6, $7, NOW())
      RETURNING *`,
      [
        sid,
        place_external_id?.trim() || null,
        title?.trim() || null,
        svg_markup?.trim() || null,
        typeof layout_json === 'object' && layout_json !== null ? layout_json : {},
        notes_internal?.trim() || null,
        external_plan_url?.trim() || null,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Схема для этой сцены уже есть' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/stage-maps/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  const {
    stage_external_id,
    place_external_id,
    title,
    svg_markup,
    layout_json,
    notes_internal,
    external_plan_url,
  } = req.body || {};
  try {
    const cur = await ticketPool.query(`SELECT * FROM getbilet_stage_maps WHERE id = $1`, [id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Не найдено' });
    const c = cur.rows[0];
    const sid =
      stage_external_id !== undefined ? String(stage_external_id).trim() : c.stage_external_id;
    if (!sid) return res.status(400).json({ error: 'stage_external_id не может быть пустым' });
    const r = await ticketPool.query(
      `UPDATE getbilet_stage_maps SET
        stage_external_id = $2,
        place_external_id = $3,
        title = $4,
        svg_markup = $5,
        layout_json = COALESCE($6, '{}'::jsonb),
        notes_internal = $7,
        external_plan_url = $8,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        sid,
        place_external_id !== undefined ? place_external_id?.trim() || null : c.place_external_id,
        title !== undefined ? title?.trim() || null : c.title,
        svg_markup !== undefined ? svg_markup?.trim() || null : c.svg_markup,
        layout_json !== undefined ? layout_json : c.layout_json,
        notes_internal !== undefined ? notes_internal?.trim() || null : c.notes_internal,
        external_plan_url !== undefined ? external_plan_url?.trim() || null : c.external_plan_url,
      ]
    );
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Такой stage_external_id уже занят' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/stage-maps/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Некорректный id' });
  try {
    const r = await ticketPool.query(`DELETE FROM getbilet_stage_maps WHERE id = $1 RETURNING id`, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
