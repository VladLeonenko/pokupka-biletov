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
  return {
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    contentHtml: r.content_html,
    heroImageUrl: r.hero_image_url,
    donorImageUrl: r.donor_image_url || undefined,
    gallery: r.gallery || [],
    metrics: r.metrics || {},
    tools: r.tools || [],
    contentJson: r.content_json || {},
    templateType: r.template_type,
    isTemplate: r.is_template,
    isPublished: r.is_published,
    category: r.category || null,
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

router.get('/', async (req, res) => {
  const isPublic = req.originalUrl.includes('/api/public');
  const publishedOnly = isPublic || req.query.published === 'true';
  
  let query = 'SELECT * FROM cases';
  if (publishedOnly) {
    query += ' WHERE is_published = TRUE';
  }
  query += ' ORDER BY created_at DESC';
  
  const r = await pool.query(query);
  res.json(r.rows.map(rowToCase));
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
    ogImageUrl, og_image_url
  } = req.body || {};
  
  const content = contentHtml || content_html;
  const heroImage = heroImageUrl || hero_image_url;
  const donorImage = donorImageUrl || donor_image_url || null;
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
    'INSERT INTO cases(slug,title,summary,content_html,hero_image_url,donor_image_url,gallery,metrics,tools,content_json,template_type,is_template,is_published,category,donor_url,seo_title,seo_description,seo_keywords,og_image_url) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19)',
    [slug, title, summary, content, heroImage, donorImage, 
     gallery ? JSON.stringify(gallery) : null, 
     metrics ? JSON.stringify(metrics) : null, 
     tools ? JSON.stringify(tools) : null, 
     contentJsonData ? JSON.stringify(contentJsonData) : null, 
     template || null, isTemplateFlag, published, caseCategory, donor,
     seoTitleValue, seoDescValue, seoKeywordsValue, ogImageValue]
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
    ogImageUrl, og_image_url
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

export default router;
