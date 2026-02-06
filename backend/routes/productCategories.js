import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Функция преобразования строки БД в объект категории
function rowToCategory(r) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    parentId: r.parent_id,
    sortOrder: r.sort_order || 0,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET все категории
router.get('/', async (req, res) => {
  try {
    const isPublic = req.originalUrl.includes('/api/public');
    const activeOnly = isPublic || req.query.active === 'true';
    
    let query = 'SELECT * FROM product_categories';
    if (activeOnly) {
      query += ' WHERE is_active = TRUE';
    }
    query += ' ORDER BY sort_order ASC, name ASC';
    
    const result = await pool.query(query);
    res.json(result.rows.map(rowToCategory));
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET категория по ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM product_categories WHERE id = $1',
      [req.params.id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(rowToCategory(result.rows[0]));
  } catch (err) {
    console.error('Error fetching category:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST создать категорию
router.post('/', async (req, res) => {
  try {
    const { slug, name, description, parentId, sortOrder, isActive } = req.body;
    
    if (!slug || !name) {
      return res.status(400).json({ error: 'slug and name are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO product_categories 
       (slug, name, description, parent_id, sort_order, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        slug,
        name,
        description || null,
        parentId || null,
        sortOrder || 0,
        isActive !== undefined ? isActive : true
      ]
    );
    
    res.status(201).json(rowToCategory(result.rows[0]));
  } catch (err) {
    console.error('Error creating category:', err);
    if (err.code === '23505') { // unique violation
      res.status(409).json({ error: 'Category with this slug already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PUT обновить категорию
router.put('/:id', async (req, res) => {
  try {
    const { slug, name, description, parentId, sortOrder, isActive } = req.body;
    
    if (!slug || !name) {
      return res.status(400).json({ error: 'slug and name are required' });
    }
    
    const result = await pool.query(
      `UPDATE product_categories 
       SET slug = $1, 
           name = $2, 
           description = $3, 
           parent_id = $4, 
           sort_order = $5, 
           is_active = $6,
           updated_at = NOW()
       WHERE id = $7 
       RETURNING *`,
      [
        slug,
        name,
        description || null,
        parentId || null,
        sortOrder || 0,
        isActive !== undefined ? isActive : true,
        req.params.id
      ]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ updated: rowToCategory(result.rows[0]) });
  } catch (err) {
    console.error('Error updating category:', err);
    if (err.code === '23505') { // unique violation
      res.status(409).json({ error: 'Category with this slug already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// DELETE удалить категорию
router.delete('/:id', async (req, res) => {
  try {
    // Проверяем, есть ли продукты с этой категорией
    const productsCheck = await pool.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1',
      [req.params.id]
    );
    
    if (parseInt(productsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with assigned products. Please reassign or delete products first.' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM product_categories WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ deleted: true, category: rowToCategory(result.rows[0]) });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
