import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper function to convert DB row to team member object
function rowToTeamMember(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    imageUrl: row.image_url,
    bio: row.bio || '',
    skills: row.skills || [],
    portfolioUrls: row.portfolio_urls || [],
    isActive: row.is_active !== false,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Team API is working' });
});

// Get all team members (admin only)
router.get('/', requireAuth, async (req, res) => {
  const { active } = req.query;
  let query = 'SELECT * FROM team_members';
  const params = [];
  
  if (active === 'true') {
    query += ' WHERE is_active = true';
  } else if (active === 'false') {
    query += ' WHERE is_active = false';
  }
  
  query += ' ORDER BY sort_order ASC, created_at DESC';
  
  const r = await pool.query(query, params);
  res.json(r.rows.map(rowToTeamMember));
});

// Get public team members (for product pages)
router.get('/public', async (req, res) => {
  const r = await pool.query(
    'SELECT * FROM team_members WHERE is_active = true ORDER BY sort_order ASC, created_at DESC'
  );
  res.json(r.rows.map(rowToTeamMember));
});

// Get single team member
router.get('/:id', requireAuth, async (req, res) => {
  const r = await pool.query('SELECT * FROM team_members WHERE id=$1', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rowToTeamMember(r.rows[0]));
});

// Create team member
router.post('/', requireAuth, async (req, res) => {
  const {
    name, role, imageUrl, bio, skills, portfolioUrls, isActive, sortOrder
  } = req.body || {};
  
  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }
  
  const r = await pool.query(
    `INSERT INTO team_members(
      name, role, image_url, bio, skills, portfolio_urls, is_active, sort_order
    ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      name, role, imageUrl || null, bio || null,
      skills || [], portfolioUrls || [],
      isActive !== false, sortOrder || 0
    ]
  );
  
  res.json({ created: rowToTeamMember(r.rows[0]) });
});

// Update team member
router.put('/:id', requireAuth, async (req, res) => {
  const {
    name, role, imageUrl, bio, skills, portfolioUrls, isActive, sortOrder
  } = req.body || {};
  
  const r = await pool.query(
    `UPDATE team_members SET
      name=COALESCE($2, name),
      role=COALESCE($3, role),
      image_url=$4,
      bio=$5,
      skills=COALESCE($6, skills),
      portfolio_urls=COALESCE($7, portfolio_urls),
      is_active=COALESCE($8, is_active),
      sort_order=COALESCE($9, sort_order),
      updated_at=NOW()
    WHERE id=$1 RETURNING *`,
    [
      req.params.id, name, role, imageUrl, bio,
      skills || [], portfolioUrls || [],
      isActive, sortOrder
    ]
  );
  
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ updated: rowToTeamMember(r.rows[0]) });
});

// Delete team member
router.delete('/:id', requireAuth, async (req, res) => {
  const r = await pool.query('DELETE FROM team_members WHERE id=$1 RETURNING *', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: rowToTeamMember(r.rows[0]) });
});

// Update sort order (for drag & drop)
router.post('/reorder', requireAuth, async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const item of items) {
      await client.query(
        'UPDATE team_members SET sort_order=$1 WHERE id=$2',
        [item.sortOrder, item.id]
      );
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export default router;

