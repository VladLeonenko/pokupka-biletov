import express from 'express';
import { Carousel } from '../models/carousel.js';

const router = express.Router();

/**
 * GET /api/carousels - Get all carousels (admin only)
 * NOTE: requireAuth is applied at the router level in app.js
 */
router.get('/', async (req, res) => {
  try {
    const carousels = await Carousel.findAll();
    res.json(carousels);
  } catch (error) {
    console.error('[GET /api/carousels] Error fetching carousels:', error);
    res.status(500).json({ error: 'Failed to fetch carousels' });
  }
});

/**
 * GET /api/carousels/public - Get active carousels (public)
 */
router.get('/public', async (req, res) => {
  try {
    const carousels = await Carousel.findActive();
    res.json(carousels);
  } catch (error) {
    console.error('Error fetching public carousels:', error);
    res.status(500).json({ error: 'Failed to fetch carousels' });
  }
});

/**
 * POST /api/carousels - Create new carousel (admin only)
 * NOTE: requireAuth is applied at the router level in app.js
 */
router.post('/', async (req, res) => {
  try {
    const { slug, name, type, settings, items, is_active } = req.body;

    if (!slug || !name) {
      return res.status(400).json({ error: 'Slug and name are required' });
    }

    // Check if slug already exists
    const existing = await Carousel.findBySlug(slug);
    if (existing) {
      return res.status(400).json({ error: 'Carousel with this slug already exists' });
    }

    const carousel = await Carousel.create({
      slug,
      name,
      type,
      settings: settings || {},
      items: items || [],
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json(carousel);
  } catch (error) {
    console.error('Error creating carousel:', error);
    res.status(500).json({ error: 'Failed to create carousel' });
  }
});

/**
 * PUT /api/carousels/:id - Update carousel (admin only)
 * NOTE: This must come before GET /:slug to avoid conflicts
 * NOTE: requireAuth is applied at the router level in app.js
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = parseInt(id, 10);
    
    // Проверяем, что id - число
    if (isNaN(idNum)) {
      // Если это не число, возможно это slug - пропускаем этот маршрут
      return res.status(404).json({ error: 'Not found' });
    }

    const { slug, name, type, settings, items, is_active } = req.body;

    // Check if carousel exists
    const existing = await Carousel.findById(idNum);
    if (!existing) {
      return res.status(404).json({ error: 'Carousel not found' });
    }

    // Check if new slug conflicts with another carousel
    if (slug && slug !== existing.slug) {
      const slugExists = await Carousel.findBySlug(slug);
      if (slugExists) {
        return res.status(400).json({ error: 'Carousel with this slug already exists' });
      }
    }

    const carousel = await Carousel.update(idNum, {
      slug,
      name,
      type,
      settings,
      items,
      is_active
    });
    res.json(carousel);
  } catch (error) {
    console.error('[PUT /api/carousels/:id] Error updating carousel:', error);
    res.status(500).json({ error: 'Failed to update carousel', details: error.message });
  }
});

/**
 * DELETE /api/carousels/:id - Delete carousel (admin only)
 * NOTE: This must come before GET /:slug to avoid conflicts
 * NOTE: requireAuth is applied at the router level in app.js
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const carousel = await Carousel.delete(id);
    
    if (!carousel) {
      return res.status(404).json({ error: 'Carousel not found' });
    }
    
    res.json({ message: 'Carousel deleted successfully', carousel });
  } catch (error) {
    console.error('Error deleting carousel:', error);
    res.status(500).json({ error: 'Failed to delete carousel' });
  }
});

/**
 * GET /api/carousels/id/:id - Get carousel by ID (admin only)
 * NOTE: Using /id/:id to avoid conflict with /:slug
 * NOTE: requireAuth is applied at the router level in app.js
 */
router.get('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const carousel = await Carousel.findById(id);
    
    if (!carousel) {
      return res.status(404).json({ error: 'Carousel not found' });
    }
    
    res.json(carousel);
  } catch (error) {
    console.error('Error fetching carousel:', error);
    res.status(500).json({ error: 'Failed to fetch carousel' });
  }
});

/**
 * GET /api/carousels/slug/:slug - Get carousel by slug (public)
 * NOTE: Using /slug/:slug to avoid conflicts with /:id routes
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const carousel = await Carousel.findBySlug(slug);
    
    if (!carousel) {
      return res.status(404).json({ error: 'Carousel not found' });
    }
    
    if (!carousel.is_active && !req.user) {
      return res.status(404).json({ error: 'Carousel not found' });
    }
    
    res.json(carousel);
  } catch (error) {
    console.error('[GET /api/carousels/slug/:slug] Error fetching carousel:', error);
    res.status(500).json({ error: 'Failed to fetch carousel' });
  }
});

export default router;
