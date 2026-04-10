import express from 'express';
import pool from '../db.js';

const router = express.Router();

const CASE_CATEGORIES = {
  website: 'Разработка сайтов',
  mobile: 'Мобильная разработка',
  ai: 'AI и ML',
  seo: 'SEO и продвижение',
  advertising: 'Реклама',
  design: 'Дизайн',
  marketing: 'Маркетинг',
  ecommerce: 'E-commerce'
};

function rowToCase(r) {
  const isPublished = !!r.is_published;
  const contentJson = r.content_json || {};
  const categories = Array.isArray(contentJson.categories) && contentJson.categories.length
    ? contentJson.categories
    : (r.category ? [r.category] : []);
  return {
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    contentHtml: r.content_html,
    heroImageUrl: r.hero_image_url,
    listingPreviewImageUrl: r.listing_preview_image_url || null,
    homeCard: r.home_card || null,
    donorImageUrl: r.donor_image_url || undefined,
    gallery: r.gallery || [],
    metrics: r.metrics || {},
    tools: r.tools || [],
    contentJson,
    templateType: r.template_type,
    isTemplate: r.is_template,
    isPublished,
    is_published: isPublished,
    category: r.category || null,
    categories,
    categoryLabel: r.category ? CASE_CATEGORIES[r.category] || r.category : null,
    donorUrl: r.donor_url || undefined,
    seoTitle: r.seo_title || "",
    seoDescription: r.seo_description || "",
    seoKeywords: r.seo_keywords || "",
    ogImageUrl: r.og_image_url || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Колонки без content_html/content_json (тяжёлые) — для списка. home_order опционален.
const CASE_LIST_COLUMNS = 'slug, title, summary, hero_image_url, listing_preview_image_url, donor_image_url, gallery, metrics, tools, template_type, is_template, is_published, category, donor_url, seo_title, seo_description, seo_keywords, og_image_url, created_at, updated_at, home_order';

router.get('/', async (req, res) => {
  const isPublic = req.originalUrl.includes('/api/public');
  const publishedOnly = isPublic || req.query.published === 'true';

  let r;
  try {
    let query = `SELECT ${CASE_LIST_COLUMNS} FROM cases`;
    if (publishedOnly) {
      query += ' WHERE is_published = TRUE ORDER BY home_order ASC NULLS LAST, created_at DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }
    r = await pool.query(query);
  } catch (err) {
    if (err.message && (err.message.includes('home_order') || err.message.includes('does not exist'))) {
      // Fallback: SELECT * — только колонки, которые точно есть. Без home_order в ORDER BY.
      const baseQuery = publishedOnly
        ? 'SELECT * FROM cases WHERE is_published = TRUE ORDER BY created_at DESC'
        : 'SELECT * FROM cases ORDER BY created_at DESC';
      r = await pool.query(baseQuery);
    } else {
      throw err;
    }
  }
  res.json(r.rows.map(rowToCase));
});

router.get('/home', async (req, res) => {
  let r;
  try {
    r = await pool.query(
      `SELECT slug, title, hero_image_url, home_card, created_at FROM cases 
       WHERE is_published = TRUE AND home_order IS NOT NULL 
       ORDER BY home_order ASC`
    );
  } catch (err) {
    if (err.message && (err.message.includes('home_order') || err.message.includes('home_card'))) {
      r = await pool.query(
        `SELECT slug, title, hero_image_url, created_at FROM cases 
         WHERE is_published = TRUE ORDER BY created_at DESC LIMIT 12`
      );
      r.rows = r.rows.map((row) => ({ ...row, home_card: {} }));
    } else {
      throw err;
    }
  }
  const items = r.rows.map((row) => {
    const card = row.home_card || {};
    const createdYear = row.created_at ? new Date(row.created_at).getFullYear().toString() : '2024';
    return {
      id: row.slug.replace(/-case$/, '') || row.slug,
      slug: row.slug,
      title: (row.title || '').toUpperCase(),
      year: card.year || createdYear,
      type: card.type || 'кейс по разработке САЙТа',
      image: card.image || row.hero_image_url || `/legacy/img/${row.slug}.png`,
      link: `/cases/${row.slug}`,
    };
  });
  res.json(items);
});

router.put('/home-order', async (req, res) => {
  const { slugs } = req.body || {};
  if (!Array.isArray(slugs)) {
    return res.status(400).json({ error: 'slugs must be an array' });
  }
  await pool.query('UPDATE cases SET home_order = NULL');
  for (let i = 0; i < slugs.length; i++) {
    await pool.query('UPDATE cases SET home_order = $1 WHERE slug = $2', [i, slugs[i]]);
  }
  res.json({ success: true });
});

router.get('/:slug', async (req, res) => {
  console.log('GET case by slug:', req.params.slug);
  const r = await pool.query('SELECT * FROM cases WHERE slug=$1', [req.params.slug]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rowToCase(r.rows[0]));
});

router.post('/', async (req, res) => {
  const { 
    slug, title, summary, 
    contentHtml, content_html, 
    heroImageUrl, hero_image_url, 
    donorImageUrl, donor_image_url, 
    gallery, metrics, tools, 
    contentJson, content_json, 
    templateType, template_type, 
    isTemplate, is_template, 
    isPublished, is_published, 
    category, 
    donorUrl, donor_url,
    seoTitle, seo_title,
    seoDescription, seo_description,
    seoKeywords, seo_keywords,
    ogImageUrl, og_image_url,
    listingPreviewImageUrl, listing_preview_image_url,
    homeCard, home_card,
  } = req.body || {};
  
  const content = contentHtml || content_html;
  const heroImage = heroImageUrl || hero_image_url;
  const donorImage = donorImageUrl || donor_image_url || null;
  const listingPreview = listingPreviewImageUrl ?? listing_preview_image_url ?? null;
  const homeCardData = homeCard ?? home_card ?? null;
  const contentJsonData = contentJson || content_json;
  const template = templateType || template_type;
  const isTemplateFlag = isTemplate !== undefined ? isTemplate : (is_template !== undefined ? is_template : false);
  const published = isPublished !== undefined ? isPublished : (is_published !== undefined ? is_published : false);
  const validCategories = ['website', 'mobile', 'ai', 'seo', 'advertising', 'design', 'marketing', 'ecommerce'];
  const caseCategory = category && validCategories.includes(category) ? category : null;
  const donor = donorUrl || donor_url || null;
  
  // SEO поля
  const seoTitleValue = seoTitle || seo_title || '';
  const seoDescValue = seoDescription || seo_description || '';
  const seoKeywordsValue = seoKeywords || seo_keywords || '';
  const ogImageValue = ogImageUrl || og_image_url || '';
  
  await pool.query(
    'INSERT INTO cases(slug,title,summary,content_html,hero_image_url,donor_image_url,gallery,metrics,tools,content_json,template_type,is_template,is_published,category,donor_url,seo_title,seo_description,seo_keywords,og_image_url,listing_preview_image_url,home_card) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb)',
    [slug, title, summary, content, heroImage, donorImage, 
     gallery ? JSON.stringify(gallery) : null, 
     metrics ? JSON.stringify(metrics) : null, 
     tools ? JSON.stringify(tools) : null, 
     contentJsonData ? JSON.stringify(contentJsonData) : null, 
     template || null, isTemplateFlag, published, caseCategory, donor,
     seoTitleValue, seoDescValue, seoKeywordsValue, ogImageValue,
     listingPreview,
     homeCardData ? JSON.stringify(homeCardData) : null]
  );
  const r = await pool.query('SELECT * FROM cases WHERE slug=$1', [slug]);
  res.json({ created: rowToCase(r.rows[0]) });
});

router.put('/:slug', async (req, res) => {
  const { 
    title, summary, 
    contentHtml, content_html, 
    heroImageUrl, hero_image_url, 
    donorImageUrl, donor_image_url, 
    gallery, metrics, tools, 
    contentJson, content_json, 
    templateType, template_type, 
    isTemplate, is_template, 
    isPublished, is_published, 
    category, 
    donorUrl, donor_url,
    seoTitle, seo_title,
    seoDescription, seo_description,
    seoKeywords, seo_keywords,
    ogImageUrl, og_image_url,
    listingPreviewImageUrl, listing_preview_image_url,
    homeCard, home_card,
  } = req.body || {};
  
  const content = contentHtml || content_html;
  const heroImage = heroImageUrl || hero_image_url;
  const donorImage = donorImageUrl !== undefined ? (donorImageUrl || donor_image_url || null) : undefined;
  const contentJsonData = contentJson || content_json;
  const template = templateType || template_type;
  const isTemplateFlag = isTemplate !== undefined ? isTemplate : (is_template !== undefined ? is_template : false);
  const published = (isPublished !== undefined) ? !!isPublished : ((is_published !== undefined) ? !!is_published : false);
  const validCategories = ['website', 'mobile', 'ai', 'seo', 'advertising', 'design', 'marketing', 'ecommerce'];
  const caseCategory = category !== undefined ? (category && validCategories.includes(category) ? category : null) : undefined;
  const donor = donorUrl !== undefined ? (donorUrl || donor_url || null) : undefined;
  
  // SEO поля
  const seoTitleValue = seoTitle !== undefined ? (seoTitle || seo_title || '') : undefined;
  const seoDescValue = seoDescription !== undefined ? (seoDescription || seo_description || '') : undefined;
  const seoKeywordsValue = seoKeywords !== undefined ? (seoKeywords || seo_keywords || '') : undefined;
  const ogImageValue = ogImageUrl !== undefined ? (ogImageUrl || og_image_url || '') : undefined;
  
  const params = [req.params.slug, title, summary, content, heroImage];
  let paramIndex = 5;
  
  const updateFields = [
    'title=COALESCE($2,title)',
    'summary=$3',
    'content_html=COALESCE($4,content_html)',
    'hero_image_url=COALESCE($5,hero_image_url)',
  ];
  
  if (donorImage !== undefined) {
    paramIndex++;
    updateFields.push(`donor_image_url=$${paramIndex}`);
    params.push(donorImage);
  }
  
  paramIndex++;
  updateFields.push(`gallery=$${paramIndex}::jsonb`);
  params.push(gallery != null ? JSON.stringify(gallery) : '[]');
  
  paramIndex++;
  updateFields.push(`metrics=$${paramIndex}::jsonb`);
  params.push(metrics != null ? JSON.stringify(metrics) : '{}');
  
  paramIndex++;
  updateFields.push(`tools=$${paramIndex}::jsonb`);
  params.push(tools != null ? JSON.stringify(tools) : '[]');
  
  paramIndex++;
  let contentJsonForDb = null;
  if (contentJsonData != null) {
    try {
      if (typeof contentJsonData === 'string') {
        JSON.parse(contentJsonData);
        contentJsonForDb = contentJsonData;
      } else if (typeof contentJsonData === 'object') {
        contentJsonForDb = JSON.stringify(contentJsonData);
      }
    } catch (e) {
      console.error('Error processing contentJson:', e);
    }
  }
  updateFields.push(`content_json=COALESCE($${paramIndex}::jsonb,content_json)`);
  params.push(contentJsonForDb);
  
  paramIndex++;
  updateFields.push(`template_type=COALESCE($${paramIndex},template_type)`);
  params.push(template || null);
  
  paramIndex++;
  updateFields.push(`is_template=COALESCE($${paramIndex},is_template)`);
  params.push(isTemplateFlag);
  
  paramIndex++;
  updateFields.push(`is_published=$${paramIndex}`);
  params.push(published);
  
  if (caseCategory !== undefined) {
    paramIndex++;
    updateFields.push(`category=$${paramIndex}`);
    params.push(caseCategory);
  }
  
  if (donor !== undefined) {
    paramIndex++;
    updateFields.push(`donor_url=$${paramIndex}`);
    params.push(donor);
  }
  
  // SEO поля
  if (seoTitleValue !== undefined) {
    paramIndex++;
    updateFields.push(`seo_title=$${paramIndex}`);
    params.push(seoTitleValue);
  }
  
  if (seoDescValue !== undefined) {
    paramIndex++;
    updateFields.push(`seo_description=$${paramIndex}`);
    params.push(seoDescValue);
  }
  
  if (seoKeywordsValue !== undefined) {
    paramIndex++;
    updateFields.push(`seo_keywords=$${paramIndex}`);
    params.push(seoKeywordsValue);
  }
  
  if (ogImageValue !== undefined) {
    paramIndex++;
    updateFields.push(`og_image_url=$${paramIndex}`);
    params.push(ogImageValue);
  }

  const listingPreviewIn = listingPreviewImageUrl !== undefined ? listingPreviewImageUrl : listing_preview_image_url;
  if (listingPreviewIn !== undefined) {
    paramIndex++;
    updateFields.push(`listing_preview_image_url=$${paramIndex}`);
    params.push(listingPreviewIn || null);
  }

  const homeCardIn = homeCard !== undefined ? homeCard : home_card;
  if (homeCardIn !== undefined) {
    paramIndex++;
    updateFields.push(`home_card=$${paramIndex}::jsonb`);
    params.push(homeCardIn == null ? null : JSON.stringify(homeCardIn));
  }
  
  updateFields.push('updated_at=NOW()');
  
  try {
    const sqlQuery = `UPDATE cases SET ${updateFields.join(', ')} WHERE slug=$1 RETURNING *`;
    const r = await pool.query(sqlQuery, params);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ updated: rowToCase(r.rows[0]) });
  } catch (err) {
    console.error('Error updating case:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:slug', async (req, res) => {
  await pool.query('DELETE FROM cases WHERE slug=$1', [req.params.slug]);
  res.json({ deleted: true });
});

router.post('/:slug/publish', async (req, res) => {
  const { is_published } = req.body;
  const r = await pool.query(
    'UPDATE cases SET is_published=$1, updated_at=NOW() WHERE slug=$2 RETURNING *',
    [Boolean(is_published), req.params.slug]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ updated: rowToCase(r.rows[0]) });
});

export default router;
