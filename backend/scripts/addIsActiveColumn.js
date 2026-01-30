import pool from '../db.js';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Проверяем, существует ли таблица product_categories
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'product_categories'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      // Проверяем, существует ли колонка is_active
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'product_categories' 
          AND column_name = 'is_active'
        );
      `);
      
      if (!columnExists.rows[0].exists) {
        console.log('Adding is_active column to product_categories...');
        await client.query(`
          ALTER TABLE product_categories 
          ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        `);
        console.log('✅ Column is_active added successfully');
      } else {
        console.log('ℹ️  Column is_active already exists');
      }
    } else {
      console.log('ℹ️  Table product_categories does not exist yet');
    }
    
    await client.query('COMMIT');
    console.log('✅ Operation completed');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();

