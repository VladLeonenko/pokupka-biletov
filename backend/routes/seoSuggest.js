import express from 'express';
import pool from '../db.js';

const router = express.Router();

function truncate(str, n) { return (str || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }

async function suggestWithOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const apiUrl = process.env.OPENAI_PROXY_URL || 'https://api.openai.com/v1/chat/completions';
    let finalUrl = apiUrl;
    if (process.env.OPENAI_PROXY_URL && !apiUrl.includes('/v1/chat/completions')) {
      finalUrl = apiUrl.replace(/\/$/, '') + '/v1/chat/completions';
    }
    
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${key}` 
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert SEO specialist. Always respond with valid JSON only, no markdown, no code blocks. Follow SEO best practices strictly: metaTitle must be 50-60 characters, metaDescription 150-160 characters.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error('[seoSuggest] OpenAI API error:', res.status, errorText);
      return null;
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) return null;
    
    // Try to parse JSON (remove markdown code blocks if present)
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate and fix metaTitle length
    if (parsed.metaTitle) {
      const title = String(parsed.metaTitle).trim();
      if (title.length > 60) {
        // Truncate to 60 chars, preserve keyword at start
        parsed.metaTitle = title.slice(0, 60);
      }
      // If too short (< 40) but we have brand, suggest adding it (but don't force)
      // AI should handle this, but we validate the result
    }
    
    // Validate metaDescription length
    if (parsed.metaDescription) {
      const desc = String(parsed.metaDescription).trim();
      if (desc.length > 160) {
        // Try to preserve call-to-action at the end
        // If description is too long, truncate at word boundary near 160
        const words = desc.split(/\s+/);
        let built = '';
        for (const word of words) {
          if ((built + ' ' + word).length <= 157) {
            built = built ? built + ' ' + word : word;
          } else {
            break;
          }
        }
        parsed.metaDescription = built || desc.slice(0, 157);
        if (parsed.metaDescription.length < desc.length) {
          parsed.metaDescription += '...';
        }
      }
      // If too short (< 120), keep it as is (AI might have a reason)
    }
    
    return parsed;
  } catch (error) {
    console.error('[seoSuggest] Error calling OpenAI:', error.message);
    return null;
  }
}

router.post('/suggest', async (req, res) => {
  try {
    const { slug, title, html, type, brandName, siteUrl, logoUrl, lang } = req.body || {};
    let base = { title, html };
    if (slug && (!title || !html)) {
      const r = await pool.query('SELECT title, body FROM pages WHERE slug=$1', [slug]);
      if (r.rows[0]) base = { title: r.rows[0].title, html: r.rows[0].body };
    }
    const plain = truncate(base.html || '', 1000);
    const t = (type || 'WebPage');
    const prompt = `Сгенерируй SEO-рекомендации в JSON для страницы. Поля: metaTitle, metaDescription, ogTitle, ogDescription, ogImageUrl, canonicalUrl, robotsIndex (true/false), robotsFollow (true/false), twitterCard (summary or summary_large_image), twitterSite, twitterCreator, structuredDataJson (JSON-LD как строка), hreflang (массив объектов {lang,url}).

ВАЖНЫЕ SEO-ПРАВИЛА ДЛЯ metaTitle:
1. Длина: ровно 50-60 символов (не больше!)
2. Формат: "Ключевое слово | Бренд" или "Основной запрос - Дополнительное описание | Бренд"
3. Ключевое слово должно быть в начале (первые 25-35 символов)
4. Бренд в конце (если указан), после разделителя "|"
5. Без лишних слов, привлекательно для кликов
6. Используй заголовок страницы как основу, но оптимизируй под SEO

ВАЖНЫЕ SEO-ПРАВИЛА ДЛЯ metaDescription:
1. Длина: ровно 150-160 символов (не больше!)
2. Первое предложение (первые 120 символов) должно содержать ключевое слово и основную ценность
3. Второе предложение (120-160 символов) - призыв к действию или дополнительная ценность
4. Уникальная для этой страницы, не общая
5. Привлекательная для кликов, отвечает на вопрос пользователя
6. Используй естественный язык, избегай спама ключевыми словами

Тип страницы (schema.org): ${t}.
Бренд: ${brandName || ''}. Сайт: ${siteUrl || ''}. Логотип: ${logoUrl || ''}. Язык: ${lang || 'ru'}.
Заголовок страницы: "${base.title || ''}".
Краткий контент: ${plain}.

Примеры правильных title:
- "Купить ноутбук в Москве | TechStore" (48 символов)
- "Создание сайтов под ключ - Веб-студия | ${brandName || 'PrimeCoder'}" (если длиннее, сократи)
- "SEO продвижение сайтов в Яндекс и Google" (45 символов)

Примеры правильных description (150-160 символов):
- "Создание сайтов под ключ в Москве. Разработка корпоративных сайтов, интернет-магазинов и лендингов. SEO-оптимизация и продвижение. Заказать сайт с гарантией качества!" (153 символа)
- "Веб-студия PrimeCoder предлагает профессиональную разработку сайтов. Опыт 10+ лет, 75+ проектов. Индивидуальный подход к каждому клиенту. Свяжитесь с нами!" (157 символов)

ВАЖНО: 
- metaTitle должен быть ровно 50-60 символов, не больше! Если исходный заголовок длиннее, сократи его, сохранив ключевое слово в начале.
- metaDescription должен быть ровно 150-160 символов, не больше! Если текст длиннее, сократи его, сохранив ключевое слово и призыв к действию.`;
    const ai = await suggestWithOpenAI(prompt);
    if (ai) return res.json(ai);
    // Fallback heuristic (improved SEO rules)
    let metaTitle = (base.title || '').trim();
    // If title is too long, try to preserve key words at the start
    if (metaTitle.length > 60) {
      // Try to find a natural break point around 50-60 chars
      const words = metaTitle.split(/\s+/);
      let built = '';
      for (const word of words) {
        if ((built + ' ' + word).length <= 57) {
          built = built ? built + ' ' + word : word;
        } else {
          break;
        }
      }
      metaTitle = built || metaTitle.slice(0, 60);
    }
    // If title is too short, add brand if available
    if (metaTitle.length < 40 && brandName) {
      const withBrand = `${metaTitle} | ${brandName}`;
      if (withBrand.length <= 60) {
        metaTitle = withBrand;
      }
    }
    const metaDescription = truncate(plain, 155); // 155 to allow for "..." if needed
    const canonicalUrl = slug ? `${siteUrl || 'https://example.com'}${slug}` : '';
    const ogTitle = metaTitle;
    const ogDescription = metaDescription;
    let structured = {};
    if ((type || 'WebPage') === 'Article') {
      structured = { '@context': 'https://schema.org', '@type': 'Article', headline: metaTitle, description: metaDescription, author: { '@type': 'Organization', name: brandName || '' }, publisher: { '@type': 'Organization', name: brandName || '', logo: logoUrl ? { '@type': 'ImageObject', url: logoUrl } : undefined }, mainEntityOfPage: canonicalUrl || undefined, inLanguage: lang || 'ru' };
    } else if (type === 'Organization') {
      structured = { '@context': 'https://schema.org', '@type': 'Organization', name: brandName || '', url: siteUrl || '', logo: logoUrl || '' };
    } else if (type === 'BreadcrumbList') {
      structured = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Главная', item: siteUrl || 'https://example.com' }, { '@type': 'ListItem', position: 2, name: base.title || '', item: canonicalUrl || '' } ] };
    } else {
      structured = { '@context': 'https://schema.org', '@type': 'WebPage', name: metaTitle, description: metaDescription, url: canonicalUrl || undefined, inLanguage: lang || 'ru' };
    }
    const suggestion = {
      metaTitle,
      metaDescription,
      ogTitle,
      ogDescription,
      ogImageUrl: '',
      canonicalUrl,
      robotsIndex: true,
      robotsFollow: true,
      twitterCard: 'summary_large_image',
      twitterSite: '',
      twitterCreator: '',
      structuredDataJson: JSON.stringify(structured, null, 2),
      hreflang: [],
    };
    res.json(suggestion);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;


