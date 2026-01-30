import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const dir = path.join(__dirname, '../migrations');
  const all = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const file of all) {
      console.log(`\n=== Processing ${file} ===`);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const statements = sql.split(';').filter(s => s.trim().length > 0);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;
        
        try {
          // Пропускаем комментарии
          if (stmt.startsWith('--')) continue;
          
          console.log(`  Executing statement ${i + 1}/${statements.length}...`);
          await client.query(stmt + ';');
        } catch (e) {
          console.error(`\n❌ ERROR in ${file}, statement ${i + 1}:`);
          console.error(`Statement: ${stmt.substring(0, 200)}...`);
          console.error(`Error: ${e.message}`);
          throw e;
        }
      }
      console.log(`✅ ${file} completed`);
    }
    
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();

