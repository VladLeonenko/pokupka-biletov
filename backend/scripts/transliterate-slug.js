#!/usr/bin/env node
/**
 * Транслитерация русского текста в латинский slug.
 * Использование: node scripts/transliterate-slug.js "AI продвижение"
 * Вывод: ai-prodvizhenie
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function transliterate(text) {
  return text
    .toLowerCase()
    .split('')
    .map((c) => MAP[c] ?? (/\w/.test(c) ? c : '-'))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Сохраняем английские акронимы и термины как есть */
const KEEP_LATIN = /^(ai|devops|vps|pwa|smm|crm|seo|wp|api|rag)$/i;

function toSlug(title) {
  return title
    .split(/[\s\/\-+]+/)
    .map((word) => {
      const clean = word.replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, '').toLowerCase();
      if (KEEP_LATIN.test(clean) || /^[a-z0-9]+$/.test(clean)) return clean;
      return transliterate(word.replace(/[^а-яА-ЯёЁ]/g, ''));
    })
    .filter(Boolean)
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'product';
}

// CLI — только при прямом запуске (node transliterate-slug.js "текст")
const scriptPath = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === scriptPath;
if (isMain && process.argv[2]) {
  console.log(toSlug(process.argv[2]));
}

export { toSlug, transliterate };
