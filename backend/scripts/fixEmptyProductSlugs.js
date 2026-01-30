import pool from '../db.js';

// Упрощённый генератор slug (как в importServices.js)
function createSlug(title, fallbackSuffix = '') {
  const base = (title || '').toLowerCase()
    .replace(/[^\w\s-а-яё]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);

  if (base) return base;
  return `service${fallbackSuffix ? `-${fallbackSuffix}` : ''}`;
}

async function fixEmptyProductSlugs() {
  const client = await pool.connect();
  try {
    console.log('🔎 Поиск продуктов с пустым slug...');
    const res = await client.query(
      `SELECT id, slug, title
       FROM products
       WHERE slug IS NULL OR slug = '' OR trim(slug) = ''`
    );

    if (res.rows.length === 0) {
      console.log('✅ Пустых slug не найдено, ничего делать не нужно.');
      return;
    }

    console.log(`Найдено записей с пустым slug: ${res.rows.length}`);

    for (const row of res.rows) {
      const { id, title } = row;

      // Генерируем базовый slug
      let newSlug = createSlug(title, String(id));

      // Проверяем уникальность и при необходимости добавляем суффикс
      let suffix = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const check = await client.query(
          'SELECT id FROM products WHERE slug = $1 AND id <> $2 LIMIT 1',
          [newSlug, id]
        );
        if (check.rows.length === 0) break;
        suffix += 1;
        newSlug = `${createSlug(title, String(id))}-${suffix}`;
      }

      console.log(`  • id=${id}: "${title}" -> slug="${newSlug}"`);

      await client.query('UPDATE products SET slug = $1, updated_at = NOW() WHERE id = $2', [
        newSlug,
        id,
      ]);
    }

    console.log('✅ Обновление slug завершено.');
  } catch (err) {
    console.error('❌ Ошибка при обновлении slug:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

fixEmptyProductSlugs();







