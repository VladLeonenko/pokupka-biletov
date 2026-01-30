import pool from '../db.js';
import https from 'https';
import http from 'http';
import { parse } from 'url';

// Функция для получения OG изображения с сайта
async function fetchOGImage(url) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) {
      resolve(null);
      return;
    }

    const parsedUrl = parse(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      let html = '';
      
      res.on('data', (chunk) => {
        html += chunk.toString();
        // Ограничиваем размер для безопасности
        if (html.length > 500000) {
          res.destroy();
          resolve(null);
        }
      });

      res.on('end', () => {
        try {
          // Ищем OG изображение
          const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                                   html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
          
          if (ogImageMatch && ogImageMatch[1]) {
            let imageUrl = ogImageMatch[1];
            // Если относительный URL, делаем абсолютным
            if (imageUrl.startsWith('//')) {
              imageUrl = parsedUrl.protocol + imageUrl;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = parsedUrl.protocol + '//' + parsedUrl.hostname + imageUrl;
            }
            resolve(imageUrl);
          } else {
            // Пробуем найти главное изображение из других тегов
            const imageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
                                        html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i);
            
            if (imageMatch && imageMatch[1]) {
              let imageUrl = imageMatch[1];
              if (imageUrl.startsWith('//')) {
                imageUrl = parsedUrl.protocol + imageUrl;
              } else if (imageUrl.startsWith('/')) {
                imageUrl = parsedUrl.protocol + '//' + parsedUrl.hostname + imageUrl;
              }
              resolve(imageUrl);
            } else {
              resolve(null);
            }
          }
        } catch (error) {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

async function updateDonorImages() {
  try {
    console.log('Получаем изображения с сайтов-доноров...\n');
    
    // Получаем все кейсы с donor_url но без donor_image_url
    const result = await pool.query(
      "SELECT slug, title, donor_url FROM cases WHERE donor_url IS NOT NULL AND donor_url != '' AND (donor_image_url IS NULL OR donor_image_url = '') AND is_published = TRUE"
    );

    console.log(`Найдено ${result.rows.length} кейсов для обновления\n`);

    let updated = 0;
    let failed = 0;

    for (const row of result.rows) {
      console.log(`Обрабатываем: ${row.title}`);
      console.log(`  URL: ${row.donor_url}`);
      
      try {
        const imageUrl = await fetchOGImage(row.donor_url);
        
        if (imageUrl) {
          await pool.query(
            'UPDATE cases SET donor_image_url = $1, updated_at = NOW() WHERE slug = $2',
            [imageUrl, row.slug]
          );
          console.log(`  ✅ Изображение получено: ${imageUrl}\n`);
          updated++;
        } else {
          console.log(`  ⚠️  Изображение не найдено\n`);
          failed++;
        }
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`  ❌ Ошибка: ${error.message}\n`);
        failed++;
      }
    }

    console.log(`\n🎉 Обновлено: ${updated}, Не найдено/Ошибок: ${failed}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

updateDonorImages();

