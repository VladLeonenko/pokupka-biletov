import express from 'express';
import pool from '../db.js';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Helper function to generate share token
function generateShareToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper to transform proposal from DB
function rowToProposal(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    dealId: r.deal_id,
    userId: r.user_id,
    title: r.title,
    clientName: r.client_name,
    clientEmail: r.client_email,
    description: r.description,
    status: r.status,
    shareToken: r.share_token,
    pdfPath: r.pdf_path,
    settings: r.settings || {},
    viewCount: r.view_count,
    lastViewedAt: r.last_viewed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Helper to transform slide from DB
function rowToSlide(r) {
  return {
    id: r.id,
    proposalId: r.proposal_id,
    slideType: r.slide_type,
    sortOrder: r.sort_order,
    content: r.content || {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/commercial-proposals - List all proposals (admin + sales_manager)
router.get('/', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { clientId, dealId, status } = req.query;
    let query = 'SELECT * FROM commercial_proposals WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (req.user?.role === 'sales_manager') {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    if (clientId) {
      query += ` AND client_id = $${paramIndex++}`;
      params.push(clientId);
    }
    if (dealId) {
      query += ` AND deal_id = $${paramIndex++}`;
      params.push(dealId);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows.map(rowToProposal));
  } catch (err) {
    console.error('Error fetching proposals:', err);
    // Check if it's a relation does not exist error
    if (err.code === '42P01') {
      return res.status(500).json({ 
        error: 'Database tables do not exist. Please run migration 046_commercial_proposals.sql' 
      });
    }
    res.status(500).json({ error: 'Failed to fetch proposals', details: err.message });
  }
});

// POST /api/commercial-proposals/:id/generate-share-link - Generate new share token (must be before /:id)
router.post('/:id/generate-share-link', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { id } = req.params;
    const shareToken = generateShareToken();
    const updateCondition = req.user?.role === 'sales_manager' ? 'id = $2 AND user_id = $3' : 'id = $2';
    const updateParams = req.user?.role === 'sales_manager' ? [shareToken, id, req.user.id] : [shareToken, id];
    const result = await pool.query(
      `UPDATE commercial_proposals SET share_token = $1 WHERE ${updateCondition} RETURNING share_token`,
      updateParams
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({ shareToken: result.rows[0].share_token });
  } catch (err) {
    console.error('Error generating share link:', err);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// GET /api/commercial-proposals/:id - Get proposal with slides (public if shareToken, else admin+manager)
const getProposalOrAuth = (req, res, next) => {
  if (req.query.shareToken) return next();
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    requireAdminOrSalesManager(req, res, next);
  });
};
router.get('/:id', getProposalOrAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { shareToken } = req.query;

    // Check if it's a public share link
    if (shareToken) {
      const proposalResult = await pool.query(
        'SELECT * FROM commercial_proposals WHERE share_token = $1',
        [shareToken]
      );
      if (proposalResult.rows.length === 0) {
        return res.status(404).json({ error: 'Proposal not found' });
      }
      
      const proposal = rowToProposal(proposalResult.rows[0]);
      
      // Update view count
      await pool.query(
        'UPDATE commercial_proposals SET view_count = view_count + 1, last_viewed_at = NOW() WHERE id = $1',
        [proposal.id]
      );
      
      // Get slides
      const slidesResult = await pool.query(
        'SELECT * FROM proposal_slides WHERE proposal_id = $1 ORDER BY sort_order ASC',
        [proposal.id]
      );
      
      return res.json({
        ...proposal,
        slides: slidesResult.rows.map(rowToSlide),
      });
    }

    // Private access - require auth
    const proposalResult = await pool.query(
      'SELECT * FROM commercial_proposals WHERE id = $1',
      [id]
    );
    
    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    if (req.user?.role === 'sales_manager' && proposalResult.rows[0].user_id !== req.user.id) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const proposal = rowToProposal(proposalResult.rows[0]);
    
    // Get slides
    const slidesResult = await pool.query(
      'SELECT * FROM proposal_slides WHERE proposal_id = $1 ORDER BY sort_order ASC',
      [id]
    );
    
    res.json({
      ...proposal,
      slides: slidesResult.rows.map(rowToSlide),
    });
  } catch (err) {
    console.error('Error fetching proposal:', err);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// POST /api/commercial-proposals - Create new proposal
router.post('/', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const {
      clientId,
      dealId,
      title,
      clientName,
      clientEmail,
      description,
      settings,
      slides,
    } = req.body;

    const userId = req.user?.id || null;
    const shareToken = generateShareToken();

    // Create proposal
    const proposalResult = await pool.query(
      `INSERT INTO commercial_proposals 
       (client_id, deal_id, user_id, title, client_name, client_email, description, share_token, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        clientId || null,
        dealId || null,
        userId,
        title || 'Новое коммерческое предложение',
        clientName || null,
        clientEmail || null,
        description || null,
        shareToken,
        settings || {},
      ]
    );

    const proposal = rowToProposal(proposalResult.rows[0]);

    // Create slides if provided
    if (slides && Array.isArray(slides) && slides.length > 0) {
      const slidePromises = slides.map((slide, index) =>
        pool.query(
          `INSERT INTO proposal_slides (proposal_id, slide_type, sort_order, content)
           VALUES ($1, $2, $3, $4::jsonb)
           RETURNING *`,
          [proposal.id, slide.slideType, slide.sortOrder || index, JSON.stringify(slide.content || {})]
        )
      );
      
      await Promise.all(slidePromises);
    }

    // Fetch with slides
    const slidesResult = await pool.query(
      'SELECT * FROM proposal_slides WHERE proposal_id = $1 ORDER BY sort_order ASC',
      [proposal.id]
    );

    res.status(201).json({
      ...proposal,
      slides: slidesResult.rows.map(rowToSlide),
    });
  } catch (err) {
    console.error('Error creating proposal:', err);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// PUT /api/commercial-proposals/:id - Update proposal
router.put('/:id', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'sales_manager') {
      const check = await pool.query('SELECT id FROM commercial_proposals WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
    }
    const {
      title,
      clientName,
      clientEmail,
      description,
      status,
      settings,
      slides,
    } = req.body;

    // Update proposal
    const updateFields = [];
    const params = [id];
    let paramIndex = 2;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (clientName !== undefined) {
      updateFields.push(`client_name = $${paramIndex++}`);
      params.push(clientName);
    }
    if (clientEmail !== undefined) {
      updateFields.push(`client_email = $${paramIndex++}`);
      params.push(clientEmail);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (settings !== undefined) {
      updateFields.push(`settings = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(settings));
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      await pool.query(
        `UPDATE commercial_proposals SET ${updateFields.join(', ')} WHERE id = $1`,
        params
      );
    }

    // Update slides if provided
    if (slides !== undefined && Array.isArray(slides)) {
      // Delete existing slides
      await pool.query('DELETE FROM proposal_slides WHERE proposal_id = $1', [id]);
      
      // Insert new slides
      if (slides.length > 0) {
        const slidePromises = slides.map((slide, index) =>
          pool.query(
            `INSERT INTO proposal_slides (proposal_id, slide_type, sort_order, content)
             VALUES ($1, $2, $3, $4::jsonb)`,
            [id, slide.slideType, slide.sortOrder !== undefined ? slide.sortOrder : index, JSON.stringify(slide.content || {})]
          )
        );
        await Promise.all(slidePromises);
      }
    }

    // Fetch updated proposal
    const proposalResult = await pool.query(
      'SELECT * FROM commercial_proposals WHERE id = $1',
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const proposal = rowToProposal(proposalResult.rows[0]);
    
    const slidesResult = await pool.query(
      'SELECT * FROM proposal_slides WHERE proposal_id = $1 ORDER BY sort_order ASC',
      [id]
    );

    res.json({
      ...proposal,
      slides: slidesResult.rows.map(rowToSlide),
    });
  } catch (err) {
    console.error('Error updating proposal:', err);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// DELETE /api/commercial-proposals/:id - Delete proposal
router.delete('/:id', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { id } = req.params;
    const delCondition = req.user?.role === 'sales_manager' ? 'id = $1 AND user_id = $2' : 'id = $1';
    const delParams = req.user?.role === 'sales_manager' ? [id, req.user.id] : [id];

    await pool.query('DELETE FROM proposal_slides WHERE proposal_id = $1', [id]);
    const result = await pool.query(`DELETE FROM commercial_proposals WHERE ${delCondition} RETURNING id`, delParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting proposal:', err);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
});

export default router;

