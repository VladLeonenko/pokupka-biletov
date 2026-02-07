const { Pool } = require('pg');
const fs = require('fs');

const products = JSON.parse(fs.readFileSync('products.json', 'utf8'));

const pool = new Pool({
  user: 'primecoder_user',
  host: 'localhost',
  database: 'primecoder_prod',
  password: 'primePass_2001-1995!',
  port: 5432,
});

async function importProducts() {
  const client = await pool.connect();
  try {
    for (const p of products) {
      await client.query(`
        INSERT INTO products (
          id, slug, title, description_html, price_cents, currency, price_period,
          features, is_active, sort_order, created_at, updated_at, category_id,
          image_url, gallery, stock_quantity, sku, tags, meta_title, meta_description,
          meta_keywords, case_slugs, summary, full_description_html, content_json
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          description_html = EXCLUDED.description_html,
          price_cents = EXCLUDED.price_cents,
          updated_at = NOW()
      `, [
        p.id, p.slug, p.title, p.description_html, p.price_cents, p.currency,
        p.price_period, p.features, p.is_active, p.sort_order, p.created_at,
        p.updated_at, p.category_id, p.image_url, p.gallery, p.stock_quantity,
        p.sku, p.tags, p.meta_title, p.meta_description, p.meta_keywords,
        p.case_slugs, p.summary, p.full_description_html, 
        p.content_json ? JSON.stringify(p.content_json) : null
      ]);
      console.log(`✅ Импортирован: ${p.title}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

importProducts().then(() => console.log('🎉 Все товары импортированы!'));
