import express from 'express';
import { Carousel } from '../models/carousel.js';

const router = express.Router();

/**
 * GET /api/public/carousels - Get active carousels (public)
 */
router.get('/', async (req, res) => {
  try {
    const carousels = await Carousel.findActive();
    res.json(carousels);
  } catch (error) {
    console.error('Error fetching public carousels:', error);
    res.status(500).json({ error: 'Failed to fetch carousels' });
  }
});

/**
 * GET /api/public/carousels/:slug - Get carousel by slug (public)
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const carousel = await Carousel.findBySlug(slug);
    
    if (!carousel || !carousel.is_active) {
      return res.status(404).json({ error: 'Carousel not found' });
    }
    
    res.json(carousel);
  } catch (error) {
    console.error('Error fetching carousel:', error);
    res.status(500).json({ error: 'Failed to fetch carousel' });
  }
});

export default router;



