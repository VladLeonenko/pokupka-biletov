#!/usr/bin/env node
/**
 * Заполняет поля Madeo Template (content_json, summary, SEO) для кейсов.
 * Не перезаписывает URL картинок, если в патче для них указано undefined — делайте патч без ключей image/backgroundImage.
 *
 * cd backend && node scripts/apply-madeo-template-patches.mjs
 * node scripts/apply-madeo-template-patches.mjs --dry-run
 * node scripts/apply-madeo-template-patches.mjs --skip-new   # только обновление существующих slug из PATCHES
 */

import pool from '../db.js';
import { PATCHES, NEW_CASES, toolItems } from './madeo-template-patches.mjs';

function deepMerge(base, patch) {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(patch)) return patch.slice();
  if (typeof patch !== 'object') return patch;
  const out = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function ensureNewCases(dryRun) {
  for (const nc of NEW_CASES) {
    const exists = await pool.query('SELECT slug FROM cases WHERE slug = $1', [nc.slug]);
    if (exists.rows.length) continue;
    if (dryRun) {
      console.log(`[dry-run] INSERT case ${nc.slug}`);
      continue;
    }
    await pool.query(
      `INSERT INTO cases (
        slug, title, summary, content_html, hero_image_url, donor_image_url,
        donor_url, gallery, metrics, tools, content_json, is_published, category,
        seo_title, seo_description, seo_keywords
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, '{}'::jsonb, $11, $12, $13, $14, $15
      )`,
      [
        nc.slug,
        nc.title,
        nc.summary,
        nc.contentHtml || '',
        nc.heroImageUrl || null,
        null,
        nc.donorUrl || null,
        JSON.stringify(nc.gallery || []),
        JSON.stringify(nc.metrics || {}),
        JSON.stringify(nc.tools || []),
        nc.isPublished ?? false,
        nc.category || 'website',
        nc.seoTitle || null,
        nc.seoDescription || null,
        nc.seoKeywords || null,
      ]
    );
    console.log(`➕ Создан кейс: ${nc.slug}`);
  }
}

async function applyPatches(dryRun) {
  const slugs = Object.keys(PATCHES);
  const newSlugSet = new Set(NEW_CASES.map((n) => n.slug));
  const r = await pool.query('SELECT slug, summary, content_json, seo_title, seo_description, seo_keywords FROM cases WHERE slug = ANY($1)', [slugs]);
  const bySlug = Object.fromEntries(r.rows.map((row) => [row.slug, row]));

  for (const slug of slugs) {
    const row = bySlug[slug];
    if (!row) {
      if (dryRun && newSlugSet.has(slug)) {
        console.log(`[dry-run] UPDATE ${slug} content_json (после INSERT из NEW_CASES)`);
        continue;
      }
      console.warn(`⚠️ Нет в БД: ${slug} — пропуск (создайте кейс вручную или добавьте в NEW_CASES)`);
      continue;
    }
    const patch = PATCHES[slug];
    const mergedJson = deepMerge(row.content_json || {}, patch.contentJson || {});
    const nextSummary = patch.summary !== undefined ? patch.summary : row.summary;
    const nextSeoTitle = patch.seoTitle !== undefined ? patch.seoTitle : row.seo_title;
    const nextSeoDesc = patch.seoDescription !== undefined ? patch.seoDescription : row.seo_description;
    const nextSeoKw = patch.seoKeywords !== undefined ? patch.seoKeywords : row.seo_keywords;
    const nextDonorUrl =
      patch.donorUrl !== undefined ? patch.donorUrl : undefined;

    if (dryRun) {
      console.log(`[dry-run] UPDATE ${slug} content_json keys: ${Object.keys(mergedJson).join(', ')}`);
      continue;
    }

    await pool.query(
      `UPDATE cases SET
        content_json = $2::jsonb,
        summary = COALESCE($3, summary),
        seo_title = COALESCE($4, seo_title),
        seo_description = COALESCE($5, seo_description),
        seo_keywords = COALESCE($6, seo_keywords),
        donor_url = COALESCE($7, donor_url),
        updated_at = NOW()
      WHERE slug = $1`,
      [
        slug,
        JSON.stringify(mergedJson),
        nextSummary,
        nextSeoTitle,
        nextSeoDesc,
        nextSeoKw,
        nextDonorUrl !== undefined ? nextDonorUrl : null,
      ]
    );
    console.log(`✅ ${slug}`);
  }
}

const dryRun = process.argv.includes('--dry-run');
const skipNew = process.argv.includes('--skip-new');

try {
  if (!skipNew) await ensureNewCases(dryRun);
  await applyPatches(dryRun);
} finally {
  await pool.end();
}
