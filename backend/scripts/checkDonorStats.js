import pool from '../db.js';

async function checkStats() {
  const r1 = await pool.query('SELECT COUNT(DISTINCT slug) as cases FROM cases WHERE is_published = TRUE');
  const r2 = await pool.query(`
    SELECT COUNT(DISTINCT donor_url) as donors 
    FROM cases 
    WHERE is_published = TRUE AND donor_url IS NOT NULL AND donor_url != ''
  `);
  const r3 = await pool.query('SELECT COUNT(*) as donors_table FROM donors WHERE is_active = TRUE');
  
  const allDonors = await pool.query(`
    SELECT url FROM donors WHERE is_active = TRUE
    UNION
    SELECT DISTINCT donor_url as url FROM cases 
    WHERE is_published = TRUE AND donor_url IS NOT NULL AND donor_url != ''
  `);
  
  console.log('Кейсов:', r1.rows[0].cases);
  console.log('Уникальных donor_url в кейсах:', r2.rows[0].donors);
  console.log('Доноров в таблице donors:', r3.rows[0].donors_table);
  console.log('Всего уникальных доноров (объединение):', allDonors.rows.length);
  
  await pool.end();
}

checkStats();
