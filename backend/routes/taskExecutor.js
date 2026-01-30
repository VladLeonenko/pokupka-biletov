import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/task-executor/execute-next - Execute the next task in queue
router.post('/execute-next', requireAuth, async (req, res) => {
  try {
    // Get the next task with status 'new' or 'in_progress'
    const result = await pool.query(
      `SELECT id, title, description, status, priority, due_date, tags, deal_id
       FROM tasks 
       WHERE status IN ('new', 'in_progress')
       AND is_archived = false
       ORDER BY 
         CASE priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         due_date NULLS LAST,
         created_at ASC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'No tasks to execute', task: null });
    }

    const task = result.rows[0];

    // Update status to 'in_progress'
    await pool.query(
      'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['in_progress', task.id]
    );

    // Return task info for execution
    res.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        tags: task.tags || [],
        dealId: task.deal_id,
      },
      message: 'Task ready for execution'
    });
  } catch (err) {
    console.error('Error in execute-next:', err);
    res.status(500).json({ error: 'Failed to get next task' });
  }
});

// POST /api/task-executor/complete/:id - Mark task as completed
router.post('/complete/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await pool.query(
      `UPDATE tasks 
       SET status = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
           description = COALESCE($2, description)
       WHERE id = $3`,
      ['completed', notes ? `${req.body.description || ''}\n\n✅ Выполнено: ${notes}` : undefined, id]
    );

    res.json({ success: true, message: 'Task marked as completed' });
  } catch (err) {
    console.error('Error completing task:', err);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// POST /api/task-executor/fail/:id - Mark task as failed/cancelled
router.post('/fail/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await pool.query(
      `UPDATE tasks 
       SET status = $1, updated_at = CURRENT_TIMESTAMP,
           description = COALESCE($2, description)
       WHERE id = $3`,
      ['cancelled', reason ? `${req.body.description || ''}\n\n❌ Отменено: ${reason}` : undefined, id]
    );

    res.json({ success: true, message: 'Task marked as cancelled' });
  } catch (err) {
    console.error('Error failing task:', err);
    res.status(500).json({ error: 'Failed to cancel task' });
  }
});

// GET /api/task-executor/pending - Get all pending tasks
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, status, priority, due_date, tags, created_at
       FROM tasks 
       WHERE status IN ('new', 'in_progress')
       AND is_archived = false
       ORDER BY 
         CASE priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         due_date NULLS LAST,
         created_at ASC`
    );

    res.json(result.rows.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      tags: t.tags || [],
      createdAt: t.created_at,
    })));
  } catch (err) {
    console.error('Error fetching pending tasks:', err);
    res.status(500).json({ error: 'Failed to fetch pending tasks' });
  }
});

export default router;



