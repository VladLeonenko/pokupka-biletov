import pool from '../db.js';

async function testChatQuery() {
  try {
    console.log('🔍 Проверка структуры таблиц...\n');

    // Проверяем структуру таблицы chats
    const chatsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'chats' 
      ORDER BY ordinal_position
    `);
    console.log('Колонки в таблице chats:');
    chatsColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Проверяем структуру таблицы clients
    const clientsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `);
    console.log('\nКолонки в таблице clients:');
    clientsColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Проверяем структуру таблицы users
    const usersColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log('\nКолонки в таблице users:');
    usersColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Тестируем запрос
    console.log('\n🧪 Тестирование запроса списка чатов...\n');
    
    const result = await pool.query(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.chat_id = c.id AND cm.sender_type = 'client' AND cm.is_read = FALSE) as unread_count,
        (SELECT message_text FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_time,
        COALESCE(u.name, u.email) as assigned_to_name,
        COALESCE(cl.total_orders, 0) as total_orders,
        COALESCE(cl.total_revenue_cents, 0) as total_revenue_cents
      FROM chats c
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.created_at DESC
      LIMIT 10 OFFSET 0
    `);

    console.log(`✅ Запрос выполнен успешно! Найдено чатов: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.log('\nПример данных первого чата:');
      const firstChat = result.rows[0];
      Object.keys(firstChat).forEach(key => {
        console.log(`  ${key}: ${firstChat[key]}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при выполнении запроса:');
    console.error('  Сообщение:', error.message);
    console.error('  Код:', error.code);
    console.error('  Детали:', error.detail);
    console.error('  Позиция:', error.position);
    if (error.hint) {
      console.error('  Подсказка:', error.hint);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testChatQuery();

