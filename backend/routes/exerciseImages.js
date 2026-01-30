import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/exercise-images - Получить все изображения или по категории
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM exercise_images WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (search) {
      query += ` AND name ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[ExerciseImages] Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// GET /api/exercise-images/:id - Получить изображение по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM exercise_images WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[ExerciseImages] Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// POST /api/exercise-images - Создать новое изображение
router.post('/', async (req, res) => {
  try {
    const { name, category, image_url, source, unsplash_id } = req.body;

    if (!name || !category || !image_url) {
      return res.status(400).json({ error: 'Name, category, and image_url are required' });
    }

    const result = await pool.query(
      `INSERT INTO exercise_images (name, category, image_url, source, unsplash_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name, category) 
       DO UPDATE SET image_url = EXCLUDED.image_url, source = EXCLUDED.source, unsplash_id = EXCLUDED.unsplash_id, updated_at = NOW()
       RETURNING *`,
      [name, category, image_url, source || 'manual', unsplash_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[ExerciseImages] Error creating image:', error);
    res.status(500).json({ error: 'Failed to create image' });
  }
});

// PUT /api/exercise-images/:id - Обновить изображение
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, image_url, source, unsplash_id } = req.body;

    const result = await pool.query(
      `UPDATE exercise_images
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           image_url = COALESCE($3, image_url),
           source = COALESCE($4, source),
           unsplash_id = COALESCE($5, unsplash_id),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, category, image_url, source, unsplash_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[ExerciseImages] Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// DELETE /api/exercise-images/:id - Удалить изображение
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM exercise_images WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('[ExerciseImages] Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// GET /api/exercise-images/search/pixabay - Поиск изображений в Pixabay
router.get('/search/pixabay', async (req, res) => {
  try {
    const { query, category } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Используем Pixabay API для поиска (бесплатный, доступен в России)
    const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || 'YOUR_PIXABAY_API_KEY';
    
    // Если ключ не настроен, возвращаем пустой массив
    if (!PIXABAY_API_KEY || PIXABAY_API_KEY === 'YOUR_PIXABAY_API_KEY') {
      console.warn('[ExerciseImages] Pixabay API key not configured');
      return res.json([]);
    }

    const searchQuery = category ? `${query} ${category}` : query;
    // Pixabay API: https://pixabay.com/api/docs/
    const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(searchQuery)}&image_type=photo&per_page=20&safesearch=true`;

    const response = await fetch(pixabayUrl);
    
    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = await response.json();
    const images = data.hits.map((hit) => ({
      id: hit.id,
      url: hit.largeImageURL || hit.webformatURL,
      thumb: hit.previewURL,
      small: hit.webformatURL,
      full: hit.fullHDURL || hit.largeImageURL,
      description: hit.tags || '',
      author: hit.user,
      author_url: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
    }));

    res.json(images);
  } catch (error) {
    console.error('[ExerciseImages] Error searching Pixabay:', error);
    res.status(500).json({ error: 'Failed to search Pixabay', details: error.message });
  }
});

export default router;

