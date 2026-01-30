import express from 'express';
import pool from '../db.js';

const router = express.Router();

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
    category: r.category || undefined,
    donorUrl: r.donor_url || undefined,
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
  const r = await pool.query('SELECT * FROM cases WHERE slug=$1', [req.params.slug]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rowToCase(r.rows[0]));
});

router.post('/', async (req, res) => {
  const { slug, title, summary, contentHtml, content_html, heroImageUrl, hero_image_url, donorImageUrl, donor_image_url, gallery, metrics, tools, contentJson, content_json, templateType, template_type, isTemplate, is_template, isPublished, is_published, category, donorUrl, donor_url } = req.body || {};
  const content = contentHtml || content_html;
  const heroImage = heroImageUrl || hero_image_url;
  const donorImage = donorImageUrl || donor_image_url || null;
  const contentJsonData = contentJson || content_json;
  const template = templateType || template_type;
  const isTemplateFlag = isTemplate !== undefined ? isTemplate : (is_template !== undefined ? is_template : false);
  const published = isPublished !== undefined ? isPublished : (is_published !== undefined ? is_published : false);
  const validCategories = ['website', 'mobile', 'ai', 'seo', 'advertising', 'design', 'marketing'];
  const caseCategory = category && validCategories.includes(category) ? category : null;
  const donor = donorUrl || donor_url || null;
  
  await pool.query(
    'INSERT INTO cases(slug,title,summary,content_html,hero_image_url,donor_image_url,gallery,metrics,tools,content_json,template_type,is_template,is_published,category,donor_url) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15)',
    [slug, title, summary, content, heroImage, donorImage, gallery ? JSON.stringify(gallery) : null, metrics ? JSON.stringify(metrics) : null, tools ? JSON.stringify(tools) : null, contentJsonData ? JSON.stringify(contentJsonData) : null, template || null, isTemplateFlag, published, caseCategory, donor]
  );
  const r = await pool.query('SELECT * FROM cases WHERE slug=$1', [slug]);
  res.json({ created: rowToCase(r.rows[0]) });
});

router.put('/:slug', async (req, res) => {
  const { title, summary, contentHtml, content_html, heroImageUrl, hero_image_url, donorImageUrl, donor_image_url, gallery, metrics, tools, contentJson, content_json, templateType, template_type, isTemplate, is_template, isPublished, is_published, category, donorUrl, donor_url } = req.body || {};
  const content = contentHtml || content_html;
  const heroImage = heroImageUrl || hero_image_url;
  const donorImage = donorImageUrl !== undefined ? (donorImageUrl || donor_image_url || null) : undefined;
  const contentJsonData = contentJson || content_json;
  const template = templateType || template_type;
  const isTemplateFlag = isTemplate !== undefined ? isTemplate : (is_template !== undefined ? is_template : false);
  // isPublished может быть явно передан, даже если false - важно правильно обработать
  const published = (isPublished !== undefined) ? !!isPublished : ((is_published !== undefined) ? !!is_published : false);
  console.log('[DEBUG] PUT /:slug isPublished:', { isPublished, is_published, published, rawIsPublished: req.body?.isPublished, rawIs_published: req.body?.is_published });
  const validCategories = ['website', 'mobile', 'ai', 'seo', 'advertising', 'design', 'marketing'];
  const caseCategory = category !== undefined ? (category && validCategories.includes(category) ? category : null) : undefined;
  const donor = donorUrl !== undefined ? (donorUrl || donor_url || null) : undefined;
  
  // Строим параметры и их индексы динамически
  const params = [req.params.slug, title, summary, content, heroImage];
  let paramIndex = 5; // Текущий индекс параметра ($1-$5 уже заняты)
  
  const updateFields = [
    'title=COALESCE($2,title)',
    'summary=$3',
    'content_html=COALESCE($4,content_html)',
    'hero_image_url=COALESCE($5,hero_image_url)',
  ];
  
  // donor_image_url
  if (donorImage !== undefined) {
    paramIndex++;
    updateFields.push(`donor_image_url=$${paramIndex}`);
    params.push(donorImage);
  } else {
    updateFields.push('donor_image_url=donor_image_url');
  }
  
  // gallery - сериализуем массив в JSON строку для JSONB
  // Используем прямое присваивание с CAST, так как существующая колонка может быть text[] или jsonb
  paramIndex++;
  updateFields.push(`gallery=$${paramIndex}::jsonb`);
  // Всегда сериализуем в JSON строку, даже если это пустой массив
  const galleryJson = gallery != null ? JSON.stringify(gallery) : '[]';
  console.log('gallery type:', typeof gallery, Array.isArray(gallery) ? 'array' : '');
  console.log('galleryJson type:', typeof galleryJson);
  params.push(galleryJson);
  
  // metrics - сериализуем объект в JSON строку для JSONB
  paramIndex++;
  updateFields.push(`metrics=$${paramIndex}::jsonb`);
  // Всегда сериализуем в JSON строку, даже если это пустой объект
  const metricsJson = metrics != null ? JSON.stringify(metrics) : '{}';
  params.push(metricsJson);
  
  // tools - сериализуем массив в JSON строку для JSONB
  paramIndex++;
  updateFields.push(`tools=$${paramIndex}::jsonb`);
  // Всегда сериализуем в JSON строку, даже если это пустой массив
  const toolsJson = tools != null ? JSON.stringify(tools) : '[]';
  params.push(toolsJson);
  
  // content_json - всегда обновляем, даже если null (чтобы сохранить пустой объект)
  paramIndex++;
  // Используем JSON.stringify как в products.js для правильной сериализации в JSONB
  let contentJsonForDb = null;
  if (contentJsonData != null) {
    try {
      // Если это уже строка - проверяем что это валидный JSON
      if (typeof contentJsonData === 'string') {
        // Проверяем что это валидный JSON
        JSON.parse(contentJsonData);
        contentJsonForDb = contentJsonData;
      } else if (typeof contentJsonData === 'object') {
        // Если это объект (включая пустой {}) - сериализуем в JSON строку
        const jsonString = JSON.stringify(contentJsonData);
        // Пустой объект {} становится строкой "{}" - это валидный JSON
        contentJsonForDb = jsonString;
      }
    } catch (e) {
      console.error('Error processing contentJson:', e);
      contentJsonForDb = null;
    }
  }
  // Всегда добавляем параметр, даже если null (используем COALESCE для null)
  updateFields.push(`content_json=COALESCE($${paramIndex}::jsonb,content_json)`);
  params.push(contentJsonForDb);
  
  console.log('contentJsonForDb type:', typeof contentJsonForDb);
  console.log('contentJsonForDb preview:', contentJsonForDb ? (typeof contentJsonForDb === 'string' ? contentJsonForDb.substring(0, 200) : String(contentJsonForDb).substring(0, 200)) : 'null');
  
  // template_type
  paramIndex++;
  updateFields.push(`template_type=COALESCE($${paramIndex},template_type)`);
  params.push(template || null);
  
  // is_template
  paramIndex++;
  updateFields.push(`is_template=COALESCE($${paramIndex},is_template)`);
  params.push(isTemplateFlag);
  
  // is_published - всегда обновляем, даже если false
  paramIndex++;
  updateFields.push(`is_published=$${paramIndex}`);
  // published уже вычислен на строке 78 как boolean, просто используем его
  params.push(published);
  console.log('[DEBUG] PUT /:slug is_published update:', { 
    isPublishedFromBody: isPublished, 
    is_publishedFromBody: is_published, 
    publishedComputed: published, 
    paramIndex, 
    sqlField: `is_published=$${paramIndex}`,
    paramsLength: params.length,
    willPush: published 
  });
  
  // category
  if (caseCategory !== undefined) {
    paramIndex++;
    updateFields.push(`category=$${paramIndex}`);
    params.push(caseCategory);
  } else {
    updateFields.push('category=category');
  }
  
  // donor_url
  if (donor !== undefined) {
    paramIndex++;
    updateFields.push(`donor_url=$${paramIndex}`);
    params.push(donor);
  } else {
    updateFields.push('donor_url=donor_url');
  }
  
  updateFields.push('updated_at=NOW()');
  
  try {
    // Проверяем количество плейсхолдеров в SQL запросе
    const sqlQuery = `UPDATE cases SET ${updateFields.join(', ')} WHERE slug=$1 RETURNING *`;
    const placeholdersCount = (sqlQuery.match(/\$\d+/g) || []).length;
    
    console.log('Updating case:', req.params.slug);
    console.log('Update fields:', updateFields.length);
    console.log('Params count:', params.length);
    console.log('Placeholders count:', placeholdersCount);
    
    if (params.length !== placeholdersCount) {
      throw new Error(`Mismatch: ${params.length} params but ${placeholdersCount} placeholders in SQL`);
    }
    
    const r = await pool.query(sqlQuery, params);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ updated: rowToCase(r.rows[0]) });
  } catch (error) {
    console.error('Error updating case:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('SQL query:', `UPDATE cases SET ${updateFields.join(', ')} WHERE slug=$1 RETURNING *`);
    console.error('Params count:', params.length);
    console.error('Params types:', params.map((p, i) => {
      const type = typeof p;
      const isArr = Array.isArray(p);
      const constructor = p?.constructor?.name || 'null';
      const preview = type === 'object' && !isArr && p !== null ? JSON.stringify(p).substring(0, 100) : String(p).substring(0, 50);
      return `${i + 1}: ${type} ${isArr ? 'array' : ''} ${constructor} (${preview})`;
    }));
    res.status(500).json({ 
      error: error.message || 'Failed to update case',
      code: error.code,
      detail: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

router.post('/:slug/publish', async (req, res) => {
  const { is_published } = req.body || {};
  const r = await pool.query('UPDATE cases SET is_published=$2, updated_at=NOW() WHERE slug=$1 RETURNING *', [req.params.slug, !!is_published]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ updated: rowToCase(r.rows[0]) });
});

router.delete('/:slug', async (req, res) => {
  await pool.query('DELETE FROM cases WHERE slug=$1', [req.params.slug]);
  res.json({ ok: true });
});

export default router;


