import pool from '../db.js';
import { getTaskTemplateByProduct } from './taskTemplates.js';

// Создать сделку в воронке продаж для клиента
export async function createDealForClient(clientId, clientName, clientEmail, clientPhone, source = 'form') {
  try {
    // Находим основную воронку продаж (или создаем, если нет)
    let funnelResult = await pool.query(
      "SELECT id FROM sales_funnels WHERE name = 'Основная воронка продаж' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1"
    );

    let funnelId;
    if (funnelResult.rows.length === 0) {
      // Создаем основную воронку, если её нет
      const newFunnel = await pool.query(
        `INSERT INTO sales_funnels (name, description, is_active, sort_order)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Основная воронка продаж', 'Основная воронка продаж для всех клиентов', true, 0]
      );
      funnelId = newFunnel.rows[0].id;

      // Создаем стандартные этапы
      const defaultStages = [
        { name: 'Первичный контакт', color: '#ff9800', sortOrder: 1, probability: 10 },
        { name: 'Переговоры', color: '#2196f3', sortOrder: 2, probability: 30 },
        { name: 'Коммерческое предложение', color: '#9c27b0', sortOrder: 3, probability: 50 },
        { name: 'Согласование', color: '#00bcd4', sortOrder: 4, probability: 70 },
        { name: 'Закрытие', color: '#4caf50', sortOrder: 5, probability: 100 },
      ];

      for (const stage of defaultStages) {
        await pool.query(
          `INSERT INTO funnel_stages (funnel_id, name, color, sort_order, probability)
           VALUES ($1, $2, $3, $4, $5)`,
          [funnelId, stage.name, stage.color, stage.sortOrder, stage.probability]
        );
      }
    } else {
      funnelId = funnelResult.rows[0].id;
    }

    // Получаем первый этап воронки
    const stageResult = await pool.query(
      'SELECT id FROM funnel_stages WHERE funnel_id = $1 ORDER BY sort_order ASC LIMIT 1',
      [funnelId]
    );

    if (stageResult.rows.length === 0) {
      console.error('[funnelHelper] No stages in funnel', funnelId);
      return null;
    }

    const stageId = stageResult.rows[0].id;

    // Получаем client_id, если передан
    let finalClientId = null;
    if (clientId) {
      finalClientId = clientId;
    } else if (clientEmail || clientPhone) {
      // Пытаемся найти клиента по email или телефону
      if (clientEmail) {
        const clientRes = await pool.query('SELECT id FROM clients WHERE email = $1 LIMIT 1', [clientEmail]);
        if (clientRes.rows[0]) {
          finalClientId = clientRes.rows[0].id;
        }
      }
      if (!finalClientId && clientPhone) {
        const clientRes = await pool.query('SELECT id FROM clients WHERE phone = $1 LIMIT 1', [clientPhone]);
        if (clientRes.rows[0]) {
          finalClientId = clientRes.rows[0].id;
        }
      }
    }

    // Создаем сделку
    const dealResult = await pool.query(
      `INSERT INTO deals (funnel_id, stage_id, title, client_id, client_name, client_email, client_phone, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        funnelId,
        stageId,
        `Сделка: ${clientName || clientEmail || clientPhone || 'Новый клиент'}`,
        finalClientId || null,
        clientName || null,
        clientEmail || null,
        clientPhone || null,
        `Создано автоматически из ${source}`
      ]
    );

    return dealResult.rows[0].id;
  } catch (error) {
    console.error('[funnelHelper] Error creating deal:', error);
    return null;
  }
}

// Создать или получить воронку для клиента (Product + имя клиента/компания)
export async function getOrCreateClientFunnel(clientId, productTitle, clientName, companyName) {
  try {
    if (!clientId) {
      console.error('[funnelHelper] clientId is required');
      return null;
    }

    // Получаем информацию о клиенте
    const clientRes = await pool.query(
      'SELECT name, company FROM clients WHERE id = $1',
      [clientId]
    );
    
    if (clientRes.rows.length === 0) {
      console.error('[funnelHelper] Client not found:', clientId);
      return null;
    }

    const client = clientRes.rows[0];
    const displayName = companyName || client.company || client.name || clientName || 'Клиент';
    
    // Формируем название воронки: Product + имя/компания
    const funnelName = productTitle ? `${productTitle} - ${displayName}` : `Проект - ${displayName}`;

    // Проверяем, существует ли уже воронка для этого клиента и продукта
    const existingFunnelRes = await pool.query(
      'SELECT id FROM sales_funnels WHERE client_id = $1 AND name = $2 AND is_active = TRUE LIMIT 1',
      [clientId, funnelName]
    );

    if (existingFunnelRes.rows.length > 0) {
      return existingFunnelRes.rows[0].id;
    }

    // Создаем новую воронку для клиента
    const newFunnelRes = await pool.query(
      `INSERT INTO sales_funnels (name, description, is_active, sort_order, client_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        funnelName,
        `Воронка проекта для клиента: ${displayName}`,
        true,
        0,
        clientId
      ]
    );

    const funnelId = newFunnelRes.rows[0].id;

    // Создаем стандартные этапы для проекта
    const projectStages = [
      { name: 'Планирование', color: '#ff9800', sortOrder: 1, probability: 10 },
      { name: 'Разработка', color: '#2196f3', sortOrder: 2, probability: 50 },
      { name: 'Тестирование', color: '#9c27b0', sortOrder: 3, probability: 75 },
      { name: 'Запуск', color: '#00bcd4', sortOrder: 4, probability: 90 },
      { name: 'Завершено', color: '#4caf50', sortOrder: 5, probability: 100 },
    ];

    for (const stage of projectStages) {
      await pool.query(
        `INSERT INTO funnel_stages (funnel_id, name, color, sort_order, probability)
         VALUES ($1, $2, $3, $4, $5)`,
        [funnelId, stage.name, stage.color, stage.sortOrder, stage.probability]
      );
    }

    return funnelId;
  } catch (error) {
    console.error('[funnelHelper] Error creating client funnel:', error);
    return null;
  }
}

// Создать сделку в воронке проекта клиента
export async function createDealInClientFunnel(funnelId, clientId, dealTitle, description, clientName, clientEmail, clientPhone, createdBy, productSlug = null) {
  try {
    if (!funnelId) {
      console.error('[funnelHelper] funnelId is required');
      return null;
    }

    // Получаем первый этап воронки
    const stageResult = await pool.query(
      'SELECT id FROM funnel_stages WHERE funnel_id = $1 ORDER BY sort_order ASC LIMIT 1',
      [funnelId]
    );

    if (stageResult.rows.length === 0) {
      console.error('[funnelHelper] No stages in funnel', funnelId);
      return null;
    }

    const stageId = stageResult.rows[0].id;

    // Создаем сделку
    const dealResult = await pool.query(
      `INSERT INTO deals (funnel_id, stage_id, title, description, client_id, client_name, client_email, client_phone, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        funnelId,
        stageId,
        dealTitle || 'Проект',
        description || null,
        clientId || null,
        clientName || null,
        clientEmail || null,
        clientPhone || null,
        createdBy || null
      ]
    );

    const dealId = dealResult.rows[0].id;

    // Создаем базовые задачи для проекта на основе названия услуги
    await createDefaultTasksForDeal(dealId, dealTitle, createdBy, productSlug);

    return dealId;
  } catch (error) {
    console.error('[funnelHelper] Error creating deal in client funnel:', error);
    return null;
  }
}

// Создать базовые задачи для сделки на основе названия услуги
export async function createDefaultTasksForDeal(dealId, dealTitle, createdBy, productSlug = null) {
  try {
    if (!dealId) return;

    // Используем новую систему шаблонов
    const taskTemplates = getTaskTemplateByProduct(productSlug, dealTitle);

    if (!taskTemplates || taskTemplates.length === 0) {
      console.warn(`[funnelHelper] No template found for productSlug: ${productSlug}, dealTitle: ${dealTitle}`);
      return;
    }

    // Создаем задачи
    for (const template of taskTemplates) {
      await pool.query(
        `INSERT INTO tasks (title, description, status, priority, deal_id, created_by, category, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          template.title,
          template.description,
          'new',
          template.priority || 'medium',
          dealId,
          createdBy || null,
          'development',
        ]
      );
    }

    console.log(`[funnelHelper] Created ${taskTemplates.length} default tasks for deal ${dealId}`);
  } catch (error) {
    console.error('[funnelHelper] Error creating default tasks:', error);
    // Не прерываем выполнение, если не удалось создать задачи
  }
}

// Удалить дубликаты воронок
export async function removeDuplicateFunnels() {
  try {
    // Находим все воронки с одинаковым именем
    const duplicates = await pool.query(
      `SELECT name, COUNT(*) as count, array_agg(id ORDER BY created_at) as ids
       FROM sales_funnels
       WHERE name = 'Основная воронка продаж'
       GROUP BY name
       HAVING COUNT(*) > 1`
    );

    if (duplicates.rows.length === 0) {
      return { removed: 0, message: 'No duplicates found' };
    }

    const ids = duplicates.rows[0].ids;
    const keepId = ids[0]; // Оставляем самую старую
    const removeIds = ids.slice(1);

    // Перемещаем все сделки из дубликатов в основную воронку
    for (const removeId of removeIds) {
      // Получаем все сделки из дубликата
      const deals = await pool.query('SELECT id, stage_id FROM deals WHERE funnel_id = $1', [removeId]);
      
      for (const deal of deals.rows) {
        // Находим соответствующий этап в основной воронке
        const oldStage = await pool.query('SELECT name FROM funnel_stages WHERE id = $1', [deal.stage_id]);
        if (oldStage.rows.length > 0) {
          const stageName = oldStage.rows[0].name;
          const newStage = await pool.query(
            'SELECT id FROM funnel_stages WHERE funnel_id = $1 AND name = $2 LIMIT 1',
            [keepId, stageName]
          );
          
          if (newStage.rows.length > 0) {
            await pool.query('UPDATE deals SET funnel_id = $1, stage_id = $2 WHERE id = $3', 
              [keepId, newStage.rows[0].id, deal.id]);
          }
        }
      }

      // Удаляем этапы дубликата
      await pool.query('DELETE FROM funnel_stages WHERE funnel_id = $1', [removeId]);
      
      // Удаляем дубликат воронки
      await pool.query('DELETE FROM sales_funnels WHERE id = $1', [removeId]);
    }

    return { removed: removeIds.length, message: `Removed ${removeIds.length} duplicate funnels` };
  } catch (error) {
    console.error('[funnelHelper] Error removing duplicates:', error);
    throw error;
  }
}

// Исправить дублирование колонок в воронке
export async function fixDuplicateStages(funnelId) {
  try {
    // Находим дубликаты этапов
    const duplicates = await pool.query(
      `SELECT name, COUNT(*) as count, array_agg(id ORDER BY created_at) as ids
       FROM funnel_stages
       WHERE funnel_id = $1
       GROUP BY name
       HAVING COUNT(*) > 1`,
      [funnelId]
    );

    if (duplicates.rows.length === 0) {
      return { fixed: 0, message: 'No duplicate stages found' };
    }

    let fixed = 0;
    for (const dup of duplicates.rows) {
      const ids = dup.ids;
      const keepId = ids[0]; // Оставляем самый старый
      const removeIds = ids.slice(1);

      // Перемещаем все сделки из дубликатов в основной этап
      for (const removeId of removeIds) {
        await pool.query('UPDATE deals SET stage_id = $1 WHERE stage_id = $2', [keepId, removeId]);
        await pool.query('DELETE FROM funnel_stages WHERE id = $1', [removeId]);
        fixed++;
      }
    }

    return { fixed, message: `Fixed ${fixed} duplicate stages` };
  } catch (error) {
    console.error('[funnelHelper] Error fixing duplicate stages:', error);
    throw error;
  }
}








