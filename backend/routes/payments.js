import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// GET /api/payments?dealId=:dealId - List payments for a deal
router.get('/', requireAuth, async (req, res) => {
  try {
    const { dealId } = req.query;
    if (!dealId) {
      return res.status(400).json({ error: 'dealId is required' });
    }
    const result = await pool.query(
      'SELECT * FROM deal_payments WHERE deal_id = $1 ORDER BY due_date ASC',
      [dealId]
    );
    res.json(result.rows.map(p => ({
      id: p.id,
      dealId: p.deal_id,
      amount: p.amount ? parseFloat(p.amount) : null,
      currency: p.currency,
      dueDate: p.due_date,
      paidDate: p.paid_date,
      status: p.status,
      description: p.description,
      reminderSentAt: p.reminder_sent_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })));
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/payments - Create payment
router.post('/', requireAuth, async (req, res) => {
  try {
    const { dealId, amount, currency, dueDate, description } = req.body;
    if (!dealId || !amount || !dueDate) {
      return res.status(400).json({ error: 'dealId, amount, and dueDate are required' });
    }
    const result = await pool.query(
      `INSERT INTO deal_payments (deal_id, amount, currency, due_date, description, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [dealId, amount, currency || 'RUB', dueDate, description || null]
    );
    const p = result.rows[0];
    
    // Check if payment is overdue and create notification
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    if (dueDateObj < now) {
      // Get deal info for notification (including funnel_id)
      const dealResult = await pool.query('SELECT title, funnel_id FROM deals WHERE id = $1', [dealId]);
      const deal = dealResult.rows[0];
      const dealTitle = deal?.title || 'Сделка';
      const funnelId = deal?.funnel_id;
      
      await createNotification({
        userId: 0, // For all users
        type: 'payment_overdue',
        title: 'Просроченный платеж',
        message: `Платеж по сделке "${dealTitle}" просрочен. Сумма: ${amount} ${currency || 'RUB'}`,
        linkUrl: funnelId ? `/admin/funnels/${funnelId}` : `/admin/funnels`,
        relatedEntityType: 'payment',
        relatedEntityId: p.id,
      });
    }
    res.status(201).json({
      id: p.id,
      dealId: p.deal_id,
      amount: p.amount ? parseFloat(p.amount) : null,
      currency: p.currency,
      dueDate: p.due_date,
      paidDate: p.paid_date,
      status: p.status,
      description: p.description,
      reminderSentAt: p.reminder_sent_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    });
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// PUT /api/payments/:id - Update payment
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, currency, dueDate, paidDate, status, description } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (amount !== undefined) {
      updates.push(`amount = $${paramCount++}`);
      values.push(amount);
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      values.push(currency);
    }
    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(dueDate);
    }
    if (paidDate !== undefined) {
      updates.push(`paid_date = $${paramCount++}`);
      values.push(paidDate === null ? null : paidDate);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE deal_payments SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const p = result.rows[0];
    res.json({
      id: p.id,
      dealId: p.deal_id,
      amount: p.amount ? parseFloat(p.amount) : null,
      currency: p.currency,
      dueDate: p.due_date,
      paidDate: p.paid_date,
      status: p.status,
      description: p.description,
      reminderSentAt: p.reminder_sent_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    });
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM deal_payments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting payment:', err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

export default router;

