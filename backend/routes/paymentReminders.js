import express from 'express';
import pool from '../db.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// This endpoint should be called by a cron job or scheduled task
// GET /api/payment-reminders/check - Check for overdue payments and create notifications
router.get('/check', async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Find payments that are overdue and haven't had reminders sent
    const result = await pool.query(
      `SELECT dp.id, dp.deal_id, dp.amount, dp.currency, dp.due_date, dp.reminder_sent_at, d.title as deal_title
       FROM deal_payments dp
       JOIN deals d ON dp.deal_id = d.id
       WHERE dp.status = 'pending'
       AND dp.due_date < $1
       AND (dp.reminder_sent_at IS NULL OR dp.reminder_sent_at < $2)
       ORDER BY dp.due_date ASC`,
      [now, new Date(now.getTime() - 24 * 60 * 60 * 1000)] // Remind if last reminder was more than 24h ago
    );

    let created = 0;
    
    for (const row of result.rows) {
      // Create notification
      await createNotification({
        userId: 0, // For all users
        type: 'payment_due',
        title: 'Напоминание о платеже',
        message: `Платеж по сделке "${row.deal_title}" просрочен. Сумма: ${row.amount} ${row.currency || 'RUB'}. Срок оплаты: ${new Date(row.due_date).toLocaleDateString('ru-RU')}`,
        linkUrl: `/admin/funnels/${row.deal_id}`,
        relatedEntityType: 'payment',
        relatedEntityId: row.id,
      });

      // Update reminder_sent_at
      await pool.query(
        'UPDATE deal_payments SET reminder_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
        [row.id]
      );
      
      created++;
    }

    res.json({ success: true, notificationsCreated: created });
  } catch (err) {
    console.error('Error checking payment reminders:', err);
    res.status(500).json({ error: 'Failed to check payment reminders' });
  }
});

export default router;



