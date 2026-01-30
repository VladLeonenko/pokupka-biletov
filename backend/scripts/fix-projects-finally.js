import pool from '../db.js';

async function fixProjects() {
  try {
    console.log('🔍 Финальная проверка и исправление проектов...\n');
    
    // Проверяем дубли еще раз
    const duplicates = await pool.query(`
      SELECT name, user_id, COUNT(*) as count 
      FROM projects 
      GROUP BY name, user_id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('⚠️  Найдены дубли:');
      for (const dup of duplicates.rows) {
        console.log(`  "${dup.name}" (user ${dup.user_id}): ${dup.count} копий`);
        
        // Удаляем все кроме самого старого
        await pool.query(`
          DELETE FROM projects 
          WHERE id NOT IN (
            SELECT MIN(id) 
            FROM projects 
            WHERE name = $1 AND user_id = $2
          ) 
          AND name = $1 AND user_id = $2
        `, [dup.name, dup.user_id]);
        
        console.log(`  ✅ Удалены дубли`);
      }
    }
    
    // Теперь добавляем constraint
    console.log('\n🔧 Добавляем unique constraint...');
    await pool.query(`
      ALTER TABLE projects 
      DROP CONSTRAINT IF EXISTS unique_user_project_name;
      
      ALTER TABLE projects 
      ADD CONSTRAINT unique_user_project_name UNIQUE (user_id, name);
    `);
    
    console.log('✅ Constraint добавлен!');
    
    // Проверяем результат
    const final = await pool.query('SELECT id, name, user_id FROM projects ORDER BY name');
    console.log('\n📋 Финальный список проектов:');
    final.rows.forEach(p => console.log(`  ${p.id}. ${p.name} (user ${p.user_id})`));
    
    console.log('\n✅ Все исправлено!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

fixProjects();


