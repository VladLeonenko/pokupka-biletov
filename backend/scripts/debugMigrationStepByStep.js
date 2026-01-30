import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const dir = path.join(__dirname, '../migrations');
  const all = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && !f.includes('bak') && !f.includes('_fixed') && !f.includes('_v2'))
    .sort();
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const file of all) {
      console.log(`\n=== Processing ${file} ===`);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      
      try {
        await client.query(sql);
        console.log(`✅ ${file} completed successfully`);
      } catch (e) {
        console.error(`\n❌ ERROR in ${file}:`);
        console.error(`Error: ${e.message}`);
        console.error(`SQL position: ${e.position || 'unknown'}`);
        
        // Попробуем найти проблемную строку
        if (e.position) {
          const lines = sql.substring(0, e.position).split('\n');
          const lineNum = lines.length;
          const problemLine = sql.split('\n')[lineNum - 1];
          console.error(`Problem line (${lineNum}): ${problemLine?.substring(0, 200)}`);
        }
        
        throw e;
      }
    }
    
    await client.query('COMMIT');
    console.log('\n✅ All migrations completed successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed');
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();

