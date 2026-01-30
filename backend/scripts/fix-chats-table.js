import pool from '../db.js';

async function fixChatsTable() {
  try {
    console.log('🔧 Проверка и исправление таблицы chats...');

    // Проверяем, существует ли колонка last_message_at
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chats' AND column_name = 'last_message_at'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('➕ Добавляем колонку last_message_at...');
      await pool.query(`
        ALTER TABLE chats 
        ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ
      `);
      console.log('✅ Колонка last_message_at добавлена');
    } else {
      console.log('✅ Колонка last_message_at уже существует');
    }

    // Проверяем, существует ли триггер
    const checkTrigger = await pool.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'chat_messages_update_timestamp'
    `);

    if (checkTrigger.rows.length === 0) {
      console.log('➕ Создаем функцию и триггер для обновления last_message_at...');
      
      // Создаем функцию
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_chat_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          UPDATE chats
          SET updated_at = NOW(),
              last_message_at = NOW()
          WHERE id = NEW.chat_id;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Создаем триггер
      await pool.query(`
        CREATE TRIGGER chat_messages_update_timestamp
        AFTER INSERT ON chat_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_chat_timestamp();
      `);
      
      console.log('✅ Триггер создан');
    } else {
      console.log('✅ Триггер уже существует');
    }

    // Обновляем last_message_at для существующих чатов на основе последнего сообщения
    console.log('🔄 Обновляем last_message_at для существующих чатов...');
    await pool.query(`
      UPDATE chats c
      SET last_message_at = (
        SELECT MAX(created_at) 
        FROM chat_messages cm 
        WHERE cm.chat_id = c.id
      )
      WHERE EXISTS (
        SELECT 1 FROM chat_messages cm WHERE cm.chat_id = c.id
      )
    `);
    
    const updateResult = await pool.query(`
      SELECT COUNT(*) as updated FROM chats WHERE last_message_at IS NOT NULL
    `);
    console.log(`✅ Обновлено ${updateResult.rows[0].updated} чатов`);

    console.log('\n✨ Готово! Таблица chats исправлена');
  } catch (error) {
    console.error('❌ Ошибка при исправлении таблицы:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixChatsTable();








