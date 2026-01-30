import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/sites - Список всех сайтов
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        COUNT(sp.id) as pages_count,
        COUNT(sl.id) as leads_count
      FROM sites s
      LEFT JOIN site_pages sp ON s.id = sp.site_id
      LEFT JOIN site_leads sl ON s.id = sl.site_id AND sl.created_at > NOW() - INTERVAL '30 days'
      GROUP BY s.id
      ORDER BY s.is_primary DESC, s.created_at DESC
    `);
    
    res.json(result.rows.map(site => ({
      id: site.id,
      domain: site.domain,
      name: site.name,
      type: site.type,
      status: site.status,
      template: site.template,
      settings: site.settings,
      seoSettings: site.seo_settings,
      isPrimary: site.is_primary,
      pagesCount: parseInt(site.pages_count) || 0,
      leadsCount: parseInt(site.leads_count) || 0,
      createdAt: site.created_at,
      updatedAt: site.updated_at,
    })));
  } catch (err) {
    console.error('Error fetching sites:', err);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// GET /api/sites/:id - Получить сайт по ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM sites WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const site = result.rows[0];
    res.json({
      id: site.id,
      domain: site.domain,
      name: site.name,
      type: site.type,
      status: site.status,
      template: site.template,
      settings: site.settings,
      seoSettings: site.seo_settings,
      isPrimary: site.is_primary,
      createdAt: site.created_at,
      updatedAt: site.updated_at,
    });
  } catch (err) {
    console.error('Error fetching site:', err);
    res.status(500).json({ error: 'Failed to fetch site' });
  }
});

// POST /api/sites - Создать новый сайт
router.post('/', requireAuth, async (req, res) => {
  try {
    const { domain, name, type, status, template, settings, seoSettings, isPrimary } = req.body;
    
    // Если это primary, убираем флаг у других
    if (isPrimary) {
      await pool.query('UPDATE sites SET is_primary = FALSE WHERE is_primary = TRUE');
    }
    
    const result = await pool.query(
      `INSERT INTO sites (domain, name, type, status, template, settings, seo_settings, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [domain, name, type || 'landing', status || 'draft', template || 'default', settings || {}, seoSettings || {}, isPrimary || false]
    );
    
    const site = result.rows[0];
    res.status(201).json({
      id: site.id,
      domain: site.domain,
      name: site.name,
      type: site.type,
      status: site.status,
      template: site.template,
      settings: site.settings,
      seoSettings: site.seo_settings,
      isPrimary: site.is_primary,
      createdAt: site.created_at,
      updatedAt: site.updated_at,
    });
  } catch (err) {
    console.error('Error creating site:', err);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Domain already exists' });
    }
    res.status(500).json({ error: 'Failed to create site' });
  }
});

// PUT /api/sites/:id - Обновить сайт
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { domain, name, type, status, template, settings, seoSettings, isPrimary } = req.body;
    
    // Если это primary, убираем флаг у других
    if (isPrimary) {
      await pool.query('UPDATE sites SET is_primary = FALSE WHERE is_primary = TRUE AND id != $1', [id]);
    }
    
    const result = await pool.query(
      `UPDATE sites 
       SET domain = COALESCE($1, domain),
           name = COALESCE($2, name),
           type = COALESCE($3, type),
           status = COALESCE($4, status),
           template = COALESCE($5, template),
           settings = COALESCE($6, settings),
           seo_settings = COALESCE($7, seo_settings),
           is_primary = COALESCE($8, is_primary)
       WHERE id = $9
       RETURNING *`,
      [domain, name, type, status, template, settings, seoSettings, isPrimary, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const site = result.rows[0];
    res.json({
      id: site.id,
      domain: site.domain,
      name: site.name,
      type: site.type,
      status: site.status,
      template: site.template,
      settings: site.settings,
      seoSettings: site.seo_settings,
      isPrimary: site.is_primary,
      createdAt: site.created_at,
      updatedAt: site.updated_at,
    });
  } catch (err) {
    console.error('Error updating site:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Domain already exists' });
    }
    res.status(500).json({ error: 'Failed to update site' });
  }
});

// DELETE /api/sites/:id - Удалить сайт
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем, не является ли сайт primary
    const checkResult = await pool.query('SELECT is_primary FROM sites WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    if (checkResult.rows[0].is_primary) {
      return res.status(400).json({ error: 'Cannot delete primary site' });
    }
    
    await pool.query('DELETE FROM sites WHERE id = $1', [id]);
    res.json({ message: 'Site deleted successfully' });
  } catch (err) {
    console.error('Error deleting site:', err);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});

// GET /api/sites/:id/pages - Получить страницы сайта
router.get('/:id/pages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM site_pages WHERE site_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    
    res.json(result.rows.map(page => ({
      id: page.id,
      siteId: page.site_id,
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.meta_title,
      metaDescription: page.meta_description,
      ogImage: page.og_image,
      template: page.template,
      isPublished: page.is_published,
      publishedAt: page.published_at,
      createdAt: page.created_at,
      updatedAt: page.updated_at,
    })));
  } catch (err) {
    console.error('Error fetching site pages:', err);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// POST /api/sites/:id/pages - Создать страницу для сайта
router.post('/:id/pages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title, content, metaTitle, metaDescription, ogImage, template, isPublished } = req.body;
    
    const result = await pool.query(
      `INSERT INTO site_pages (site_id, slug, title, content, meta_title, meta_description, og_image, template, is_published, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, slug, title, content || {}, metaTitle, metaDescription, ogImage, template || 'default', isPublished || false, isPublished ? new Date() : null]
    );
    
    const page = result.rows[0];
    res.status(201).json({
      id: page.id,
      siteId: page.site_id,
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.meta_title,
      metaDescription: page.meta_description,
      ogImage: page.og_image,
      template: page.template,
      isPublished: page.is_published,
      publishedAt: page.published_at,
      createdAt: page.created_at,
      updatedAt: page.updated_at,
    });
  } catch (err) {
    console.error('Error creating page:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Page with this slug already exists for this site' });
    }
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// GET /api/sites/:id/leads - Получить лиды сайта
router.get('/:id/leads', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM site_leads WHERE site_id = $1';
    const params = [id];
    let paramCount = 2;
    
    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json(result.rows.map(lead => ({
      id: lead.id,
      siteId: lead.site_id,
      pageId: lead.page_id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      message: lead.message,
      formData: lead.form_data,
      utmSource: lead.utm_source,
      utmMedium: lead.utm_medium,
      utmCampaign: lead.utm_campaign,
      utmContent: lead.utm_content,
      utmTerm: lead.utm_term,
      ipAddress: lead.ip_address,
      userAgent: lead.user_agent,
      status: lead.status,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
    })));
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// POST /api/public/sites/lead - Публичный endpoint для приема лидов
router.post('/public/lead', async (req, res) => {
  try {
    const { domain, slug, name, email, phone, company, message, formData, utmParams } = req.body;
    
    // Получаем сайт по домену
    const siteResult = await pool.query('SELECT id FROM sites WHERE domain = $1 AND status = $2', [domain, 'active']);
    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteId = siteResult.rows[0].id;
    
    // Получаем страницу
    let pageId = null;
    if (slug) {
      const pageResult = await pool.query('SELECT id FROM site_pages WHERE site_id = $1 AND slug = $2', [siteId, slug]);
      if (pageResult.rows.length > 0) {
        pageId = pageResult.rows[0].id;
      }
    }
    
    // Сохраняем лид
    const result = await pool.query(
      `INSERT INTO site_leads (
        site_id, page_id, name, email, phone, company, message, form_data,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        siteId, pageId, name, email, phone, company, message, formData || {},
        utmParams?.source, utmParams?.medium, utmParams?.campaign, utmParams?.content, utmParams?.term,
        req.ip, req.headers['user-agent']
      ]
    );
    
    res.status(201).json({ 
      success: true, 
      leadId: result.rows[0].id,
      message: 'Lead submitted successfully'
    });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ error: 'Failed to submit lead' });
  }
});

export default router;


