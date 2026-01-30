import db from '../db.js';

/**
 * Carousel model - адаптирован под существующую структуру БД
 */
export class Carousel {
  /**
   * Get all carousels with their slides
   */
  static async findAll() {
    const result = await db.query(
      `SELECT 
        c.id,
        c.slug,
        c.title as name,
        c.created_at,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'kind', s.kind,
              'image_url', s.image_url,
              'caption_html', s.caption_html,
              'width', s.width,
              'height', s.height,
              'link_url', s.link_url,
              'sort_order', s.sort_order,
              'is_active', s.is_active
            ) ORDER BY s.sort_order
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::json
        ) as items,
        json_build_object(
          'type', 'horizontal',
          'autoplay', true,
          'speed', 1000,
          'loop', true,
          'margin', 30,
          'items', 4,
          'nav', false,
          'dots', false
        ) as settings,
        true as is_active
      FROM carousels c
      LEFT JOIN carousel_slides s ON c.id = s.carousel_id AND s.is_active = true
      GROUP BY c.id, c.slug, c.title, c.created_at, c.updated_at
      ORDER BY c.created_at DESC`
    );
    return result.rows.map(row => ({
      ...row,
      items: row.items || [],
      settings: row.settings || {}
    }));
  }

  /**
   * Get active carousels only
   */
  static async findActive() {
    return this.findAll(); // В текущей структуре все активны
  }

  /**
   * Get carousel by slug with slides
   */
  static async findBySlug(slug) {
    const result = await db.query(
      `SELECT 
        c.id,
        c.slug,
        c.title as name,
        c.created_at,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'kind', s.kind,
              'image_url', s.image_url,
              'caption_html', s.caption_html,
              'width', s.width,
              'height', s.height,
              'link_url', s.link_url,
              'sort_order', s.sort_order,
              'is_active', s.is_active
            ) ORDER BY s.sort_order
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::json
        ) as items,
        json_build_object(
          'type', 'horizontal',
          'autoplay', true,
          'speed', 1000,
          'loop', true,
          'margin', 30,
          'items', 4,
          'nav', false,
          'dots', false
        ) as settings,
        true as is_active
      FROM carousels c
      LEFT JOIN carousel_slides s ON c.id = s.carousel_id AND s.is_active = true
      WHERE c.slug = $1
      GROUP BY c.id, c.slug, c.title, c.created_at, c.updated_at`,
      [slug]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      ...row,
      items: row.items || [],
      settings: row.settings || {}
    };
  }

  /**
   * Get carousel by ID with slides
   */
  static async findById(id) {
    const result = await db.query(
      `SELECT 
        c.id,
        c.slug,
        c.title as name,
        c.created_at,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'kind', s.kind,
              'image_url', s.image_url,
              'caption_html', s.caption_html,
              'width', s.width,
              'height', s.height,
              'link_url', s.link_url,
              'sort_order', s.sort_order,
              'is_active', s.is_active
            ) ORDER BY s.sort_order
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::json
        ) as items,
        json_build_object(
          'type', 'horizontal',
          'autoplay', true,
          'speed', 1000,
          'loop', true,
          'margin', 30,
          'items', 4,
          'nav', false,
          'dots', false
        ) as settings,
        true as is_active
      FROM carousels c
      LEFT JOIN carousel_slides s ON c.id = s.carousel_id AND s.is_active = true
      WHERE c.id = $1
      GROUP BY c.id, c.slug, c.title, c.created_at, c.updated_at`,
      [id]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      ...row,
      items: row.items || [],
      settings: row.settings || {}
    };
  }

  /**
   * Create new carousel
   */
  static async create(data) {
    const {
      slug,
      name,
      type = 'horizontal',
      settings = {},
      items = [],
      is_active = true
    } = data;

    // Create carousel
    const carouselResult = await db.query(
      `INSERT INTO carousels (slug, title)
       VALUES ($1, $2)
       RETURNING *`,
      [slug, name]
    );
    const carousel = carouselResult.rows[0];

    // Create slides
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await db.query(
          `INSERT INTO carousel_slides 
           (carousel_id, kind, image_url, caption_html, width, height, link_url, sort_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            carousel.id,
            item.kind || 'image',
            item.image_url || item.image,
            item.caption_html || item.text || '',
            item.width || null,
            item.height || null,
            item.link_url || item.link || null,
            item.sort_order || i,
            item.is_active !== undefined ? item.is_active : true
          ]
        );
      }
    }

    return this.findById(carousel.id);
  }

  /**
   * Update carousel
   */
  static async update(id, data) {
    const {
      slug,
      name,
      type,
      settings,
      items,
      is_active
    } = data;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (slug !== undefined) {
      updates.push(`slug = $${paramCount++}`);
      values.push(slug);
    }
    if (name !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(name);
    }
    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      await db.query(
        `UPDATE carousels 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}`,
        values
      );
    }

    // Update slides if provided
    if (items !== undefined) {
      // Delete existing slides
      await db.query('DELETE FROM carousel_slides WHERE carousel_id = $1', [id]);
      
      // Insert new slides
      if (items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await db.query(
            `INSERT INTO carousel_slides 
             (carousel_id, kind, image_url, caption_html, width, height, link_url, sort_order, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              id,
              item.kind || 'image',
              item.image_url || item.image,
              item.caption_html || item.text || '',
              item.width || null,
              item.height || null,
              item.link_url || item.link || null,
              item.sort_order || i,
              item.is_active !== undefined ? item.is_active : true
            ]
          );
        }
      }
    }

    return this.findById(id);
  }

  /**
   * Delete carousel (cascade will delete slides)
   */
  static async delete(id) {
    const result = await db.query(
      'DELETE FROM carousels WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }
}

