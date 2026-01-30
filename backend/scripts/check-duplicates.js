import pool from '../db.js';

async function checkDuplicates() {
  try {
    console.log('🔍 Проверка дублей проектов...\n');
    
    const result = await pool.query(`
      SELECT id, user_id, name, created_at 
      FROM projects 
      ORDER BY name, created_at
    `);
    
    console.log('📋 Все проекты:');
    result.rows.forEach(p => {
      console.log(`  ${p.id}. ${p.name} (user_id: ${p.user_id}, created: ${p.created_at})`);
    });
    
    // Ищем дубли по имени
    const duplicates = await pool.query(`
      SELECT name, COUNT(*) as count 
      FROM projects 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('\n⚠️  НАЙДЕНЫ ДУБЛИ:');
      duplicates.rows.forEach(d => {
        console.log(`  "${d.name}" - ${d.count} копий`);
      });
      
      console.log('\n🔧 Удаляем дубли (оставляем самые старые)...');
      
      for (const dup of duplicates.rows) {
        await pool.query(`
          DELETE FROM projects 
          WHERE id NOT IN (
            SELECT MIN(id) 
            FROM projects 
            WHERE name = $1
          ) AND name = $1
        `, [dup.name]);
        console.log(`  ✅ Удалены дубли "${dup.name}"`);
      }
      
      console.log('\n✅ Дубли удалены!');
    } else {
      console.log('\n✅ Дублей не найдено');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkDuplicates();


