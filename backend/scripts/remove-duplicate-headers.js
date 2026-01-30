import pool from '../db.js';

async function removeDuplicateHeaders() {
  try {
    // Обновляем страницу портфолио
    const portfolioResult = await pool.query('SELECT body FROM pages WHERE slug = $1', ['/portfolio']);
    if (portfolioResult.rows.length > 0) {
      let body = portfolioResult.rows[0].body;
      // Удаляем @@include('html/header.html')
      body = body.replace(/@@include\(['"]html\/header\.html['"]\)/gi, '');
      body = body.replace(/@@include\(['"]html\/footer\.html['"]\)/gi, '');
      // Удаляем уже включенные header теги
      body = body.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
      body = body.replace(/<header[^>]*>/gi, '');
      // Удаляем footer теги
      body = body.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
      await pool.query('UPDATE pages SET body = $1 WHERE slug = $2', [body, '/portfolio']);
      console.log('✅ Portfolio page updated - header removed');
    }

    // Обновляем страницу komanda-primecoder
    const komandaResult = await pool.query('SELECT body FROM pages WHERE slug = $1', ['/komanda-primecoder']);
    if (komandaResult.rows.length > 0) {
      let body = komandaResult.rows[0].body;
      // Удаляем @@include('html/header.html')
      body = body.replace(/@@include\(['"]html\/header\.html['"]\)/gi, '');
      body = body.replace(/@@include\(['"]html\/footer\.html['"]\)/gi, '');
      // Удаляем уже включенные header теги
      body = body.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
      body = body.replace(/<header[^>]*>/gi, '');
      // Удаляем footer теги
      body = body.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
      await pool.query('UPDATE pages SET body = $1 WHERE slug = $2', [body, '/komanda-primecoder']);
      console.log('✅ Komanda-primecoder page updated - header removed');
    }

    console.log('✅ All pages updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removeDuplicateHeaders();

