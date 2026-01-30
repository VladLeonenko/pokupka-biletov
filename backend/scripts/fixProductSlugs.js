import pool from '../db.js';

// Функция транслитерации (та же, что и в frontend)
const transliterationMap = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
  'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
  'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
  'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
  'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
};

function transliterate(text) {
  return text
    .split('')
    .map(char => transliterationMap[char] || char)
    .join('');
}

function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .trim()
    .split('')
    .map(char => transliterationMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
    .replace(/-+$/, '');
}

// Проверяет, является ли slug валидным ЧПУ
function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  // Проверяем, что slug содержит только латинские буквы, цифры и дефисы
  // и не содержит кириллицу или другие спецсимволы
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && !slug.startsWith('-') && !slug.endsWith('-');
}

async function fixProductSlugs() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Откладываем проверку FK constraints (теперь они DEFERRABLE после миграции 045)
    // Это позволяет обновлять slug без ошибок FK
    try {
      await client.query('SET CONSTRAINTS ALL DEFERRED');
    } catch (e) {
      // Если constraints не DEFERRABLE, выводим предупреждение
      console.log('⚠️  Предупреждение: constraints не DEFERRABLE. Запустите миграцию 045_make_product_fk_deferrable.sql');
    }

    // Получаем все продукты
    const { rows: products } = await client.query('SELECT id, slug, title FROM products ORDER BY id');

    console.log(`Найдено продуктов: ${products.length}`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
      const { id, slug: currentSlug, title } = product;

      // Создаем точку сохранения для каждого продукта
      await client.query('SAVEPOINT before_product');

      // Если slug валидный, пропускаем
      if (isValidSlug(currentSlug)) {
        skipped++;
        await client.query('RELEASE SAVEPOINT before_product');
        continue;
      }

      // Генерируем новый slug из title
      let newSlug = slugify(title);
      
      // Если не удалось сгенерировать из title, используем fallback
      if (!newSlug) {
        newSlug = `product-${id}`;
      }

      // Проверяем, не занят ли этот slug другим продуктом
      let finalSlug = newSlug;
      let suffix = 1;
      while (true) {
        const { rows: existing } = await client.query(
          'SELECT id FROM products WHERE slug = $1 AND id != $2',
          [finalSlug, id]
        );
        if (existing.length === 0) {
          break; // Slug свободен
        }
        finalSlug = `${newSlug}-${suffix}`;
        suffix++;
      }

      // Обновляем slug с учетом связанных таблиц
      try {
        // ВАЖНО: PostgreSQL проверяет FK сразу при UPDATE.
        // Решение: используем временный slug и обновляем через DO блок PostgreSQL
        // который выполнит все обновления в одной транзакции без промежуточных проверок FK
        const tempSlug = `temp-${id}-${Date.now()}`;
        
        // Используем простой подход с отложенной проверкой FK
        // (после миграции 045 constraints стали DEFERRABLE)
        
        // Шаг 1: Создаем временный slug в products
        await client.query('UPDATE products SET slug = $1 WHERE id = $2', [tempSlug, id]);
        
        // Шаг 2: Обновляем все связанные таблицы на временный slug
        await client.query(
          'UPDATE product_analytics SET product_slug = $1 WHERE product_slug = $2',
          [tempSlug, currentSlug]
        );
        await client.query(
          'UPDATE product_cases SET product_slug = $1 WHERE product_slug = $2',
          [tempSlug, currentSlug]
        );
        await client.query(
          'UPDATE cart SET product_slug = $1 WHERE product_slug = $2',
          [tempSlug, currentSlug]
        );
        await client.query(
          'UPDATE wishlist SET product_slug = $1 WHERE product_slug = $2',
          [tempSlug, currentSlug]
        );
        
        // Шаг 3: Обновляем products на финальный slug
        await client.query('UPDATE products SET slug = $1 WHERE id = $2', [finalSlug, id]);
        
        // Шаг 4: Обновляем все связанные таблицы на финальный slug
        await client.query(
          'UPDATE product_analytics SET product_slug = $1 WHERE product_slug = $2',
          [finalSlug, tempSlug]
        );
        await client.query(
          'UPDATE product_cases SET product_slug = $1 WHERE product_slug = $2',
          [finalSlug, tempSlug]
        );
        await client.query(
          'UPDATE cart SET product_slug = $1 WHERE product_slug = $2',
          [finalSlug, tempSlug]
        );
        await client.query(
          'UPDATE wishlist SET product_slug = $1 WHERE product_slug = $2',
          [finalSlug, tempSlug]
        );
        
        // Освобождаем точку сохранения
        await client.query('RELEASE SAVEPOINT before_product');
        
        console.log(`✓ ID ${id}: "${currentSlug}" → "${finalSlug}"`);
        fixed++;
      } catch (error) {
        console.error(`✗ Ошибка при обновлении продукта ID ${id}:`, error.message);
        // Откатываем изменения для этого продукта
        try {
          await client.query('ROLLBACK TO SAVEPOINT before_product');
        } catch (rollbackError) {
          // Игнорируем ошибки отката
        }
        errors++;
      }
    }

    await client.query('COMMIT');

    console.log('\n=== Результаты ===');
    console.log(`Исправлено: ${fixed}`);
    console.log(`Пропущено (уже валидные): ${skipped}`);
    console.log(`Ошибок: ${errors}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка при исправлении slug\'ов:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixProductSlugs()
  .then(() => {
    console.log('\nГотово!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });

