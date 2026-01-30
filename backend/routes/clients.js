import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(requireAuth);

// Получить список клиентов с фильтрацией и сортировкой
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      source = '',
      status = '',
      minLTV = '',
      maxLTV = '',
      minAvgOrder = '',
      maxAvgOrder = '',
      minOrders = '',
      maxOrders = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortColumns = ['created_at', 'name', 'email', 'total_revenue_cents', 'average_order_value_cents', 'total_orders', 'last_order_date'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Строим WHERE условия
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR 
        phone ILIKE $${paramIndex} OR 
        company ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (source) {
      conditions.push(`source = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (minLTV) {
      conditions.push(`total_revenue_cents >= $${paramIndex}`);
      params.push(parseInt(minLTV) * 100); // Конвертируем рубли в копейки
      paramIndex++;
    }

    if (maxLTV) {
      conditions.push(`total_revenue_cents <= $${paramIndex}`);
      params.push(parseInt(maxLTV) * 100);
      paramIndex++;
    }

    if (minAvgOrder) {
      conditions.push(`average_order_value_cents >= $${paramIndex}`);
      params.push(parseInt(minAvgOrder) * 100);
      paramIndex++;
    }

    if (maxAvgOrder) {
      conditions.push(`average_order_value_cents <= $${paramIndex}`);
      params.push(parseInt(maxAvgOrder) * 100);
      paramIndex++;
    }

    if (minOrders) {
      conditions.push(`total_orders >= $${paramIndex}`);
      params.push(parseInt(minOrders));
      paramIndex++;
    }

    if (maxOrders) {
      conditions.push(`total_orders <= $${paramIndex}`);
      params.push(parseInt(maxOrders));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Получаем общее количество
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM clients ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Получаем клиентов
    const result = await pool.query(
      `SELECT 
        c.*,
        COALESCE(u.name, u.email) as created_by_name
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      ${whereClause}
      ORDER BY c.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      clients: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[clients] Error fetching clients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить клиента по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        c.*,
        COALESCE(u.name, u.email) as created_by_name,
        json_agg(
          json_build_object(
            'id', o.id,
            'order_number', o.order_number,
            'status', o.status,
            'total_cents', o.total_cents,
            'created_at', o.created_at
          )
        ) FILTER (WHERE o.id IS NOT NULL) as orders
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN client_orders co ON c.id = co.client_id
      LEFT JOIN orders o ON co.order_id = o.id
      WHERE c.id = $1
      GROUP BY c.id, u.name, u.email`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[clients] Error fetching client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создать клиента
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      source = 'manual',
      source_details,
      status = 'lead',
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const userId = req.user.id;
    const result = await pool.query(
      `INSERT INTO clients (
        name, email, phone, company, source, source_details, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [name, email || null, phone || null, company || null, source, source_details || null, status, notes || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[clients] Error creating client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновить клиента
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      company,
      source,
      source_details,
      status,
      notes
    } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      params.push(email || null);
      paramIndex++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      params.push(phone || null);
      paramIndex++;
    }
    if (company !== undefined) {
      updates.push(`company = $${paramIndex}`);
      params.push(company || null);
      paramIndex++;
    }
    if (source !== undefined) {
      updates.push(`source = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }
    if (source_details !== undefined) {
      updates.push(`source_details = $${paramIndex}`);
      params.push(source_details || null);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(notes || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE clients SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[clients] Error updating client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить клиента
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[clients] Error deleting client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Связать клиента с заказом
router.post('/:id/orders/:orderId', async (req, res) => {
  try {
    const { id, orderId } = req.params;
    
    // Проверяем существование клиента и заказа
    const clientCheck = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const orderCheck = await pool.query('SELECT id FROM orders WHERE id = $1', [orderId]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Создаем связь
    await pool.query(
      'INSERT INTO client_orders (client_id, order_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, orderId]
    );

    // Обновляем метрики клиента
    await pool.query('SELECT update_client_metrics($1)', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('[clients] Error linking order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Экспорт клиентов в CSV
router.get('/export/csv', async (req, res) => {
  try {
    const {
      search = '',
      source = '',
      status = '',
      minLTV = '',
      maxLTV = '',
      minAvgOrder = '',
      maxAvgOrder = '',
      minOrders = '',
      maxOrders = ''
    } = req.query;

    // Используем те же условия фильтрации, что и в GET /
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR 
        phone ILIKE $${paramIndex} OR 
        company ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (source) {
      conditions.push(`source = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (minLTV) {
      conditions.push(`total_revenue_cents >= $${paramIndex}`);
      params.push(parseInt(minLTV) * 100);
      paramIndex++;
    }

    if (maxLTV) {
      conditions.push(`total_revenue_cents <= $${paramIndex}`);
      params.push(parseInt(maxLTV) * 100);
      paramIndex++;
    }

    if (minAvgOrder) {
      conditions.push(`average_order_value_cents >= $${paramIndex}`);
      params.push(parseInt(minAvgOrder) * 100);
      paramIndex++;
    }

    if (maxAvgOrder) {
      conditions.push(`average_order_value_cents <= $${paramIndex}`);
      params.push(parseInt(maxAvgOrder) * 100);
      paramIndex++;
    }

    if (minOrders) {
      conditions.push(`total_orders >= $${paramIndex}`);
      params.push(parseInt(minOrders));
      paramIndex++;
    }

    if (maxOrders) {
      conditions.push(`total_orders <= $${paramIndex}`);
      params.push(parseInt(maxOrders));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.company,
        c.source,
        c.source_details,
        c.status,
        c.notes,
        c.total_orders,
        ROUND(c.total_revenue_cents / 100.0, 2) as ltv_rub,
        ROUND(c.average_order_value_cents / 100.0, 2) as avg_order_rub,
        c.first_order_date,
        c.last_order_date,
        c.created_at,
        COALESCE(u.name, u.email) as created_by_name
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      ${whereClause}
      ORDER BY c.created_at DESC`,
      params
    );

    // Формируем CSV
    const headers = [
      'ID', 'Имя', 'Email', 'Телефон', 'Компания', 'Источник', 'Детали источника',
      'Статус', 'Заметки', 'Количество заказов', 'LTV (руб)', 'Средний чек (руб)',
      'Первый заказ', 'Последний заказ', 'Дата создания', 'Создал'
    ];

    const rows = result.rows.map(client => [
      client.id,
      client.name || '',
      client.email || '',
      client.phone || '',
      client.company || '',
      client.source || '',
      client.source_details || '',
      client.status || '',
      (client.notes || '').replace(/"/g, '""'), // Экранируем кавычки
      client.total_orders || 0,
      client.ltv_rub || 0,
      client.avg_order_rub || 0,
      client.first_order_date ? new Date(client.first_order_date).toLocaleString('ru-RU') : '',
      client.last_order_date ? new Date(client.last_order_date).toLocaleString('ru-RU') : '',
      new Date(client.created_at).toLocaleString('ru-RU'),
      client.created_by_name || ''
    ]);

    // Формируем CSV с BOM для правильного отображения кириллицы в Excel
    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clients_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('[clients] Error exporting clients:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

