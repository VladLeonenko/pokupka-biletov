import pool from '../db.js';
import { createNotification } from '../routes/notifications.js';

async function testNotifications() {
  try {
    console.log('Тестируем создание уведомления...');
    
    const notification = await createNotification({
      userId: 0,
      type: 'test',
      title: 'Тестовое уведомление',
      message: 'Это тестовое уведомление для проверки',
      linkUrl: '/admin/test',
      relatedEntityType: 'test',
      relatedEntityId: 1
    });
    
    console.log('✅ Уведомление создано:', notification);
    
    // Проверяем, что уведомление можно получить
    const result = await pool.query(
      'SELECT * FROM notifications WHERE id = $1',
      [notification.id]
    );
    
    console.log('✅ Уведомление найдено в БД:', result.rows[0]);
    
    // Проверяем запрос для всех пользователей
    const allNotifications = await pool.query(
      'SELECT * FROM notifications WHERE user_id = 0 OR user_id = 0 ORDER BY created_at DESC LIMIT 10'
    );
    
    console.log('✅ Всего уведомлений для всех пользователей:', allNotifications.rows.length);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message, error.stack);
    process.exit(1);
  }
}

testNotifications();







