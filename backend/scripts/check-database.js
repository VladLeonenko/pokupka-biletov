#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

async function checkDatabase() {
  console.error(`📊 Database: ${process.env.PGDATABASE}`);
  console.error(`👤 User: ${process.env.PGUSER}`);
  console.error(`\n📦 Checking data...\n`);
  
  try {
    // Blog posts
    const blogResult = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
    console.error(`📝 Blog posts: ${blogResult.rows[0].count}`);
    
    // Blog categories
    const categoriesResult = await pool.query('SELECT COUNT(*) as count FROM blog_categories');
    console.error(`📂 Blog categories: ${categoriesResult.rows[0].count}`);
    
    // Products
    const productsResult = await pool.query('SELECT COUNT(*) as count FROM products');
    console.error(`🛍️  Products: ${productsResult.rows[0].count}`);
    
    // Sample products
    const sampleProducts = await pool.query('SELECT slug, title FROM products LIMIT 5');
    console.error(`\n📋 Sample products:`);
    sampleProducts.rows.forEach(p => {
      console.error(`   - ${p.slug}: ${p.title}`);
    });
    
    // Sample blog posts
    const sampleBlog = await pool.query('SELECT slug, title FROM blog_posts LIMIT 3');
    console.error(`\n📝 Sample blog posts:`);
    sampleBlog.rows.forEach(p => {
      console.error(`   - ${p.slug}: ${p.title.substring(0, 50)}...`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDatabase();
