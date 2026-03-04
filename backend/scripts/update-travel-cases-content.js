#!/usr/bin/env node
/**
 * Обновляет content_json для travel-кейсов: цвета, шрифты, показатели (закрытые задачи в цифрах).
 * Запуск: cd backend && node scripts/update-travel-cases-content.js
 */

import pool from '../db.js';

const CASES_UPDATE = [
  {
    slug: 'bolshayastrana-case',
    fontFamily: 'Manrope, sans-serif',
    weights: ['REGULAR', 'MEDIUM', 'SEMIBOLD'],
    typographyDescription: 'Manrope — геометрический гротеск с мягкими формами и открытой типографикой. Хорошая читаемость на экране и в печати. Выбран для заголовков и навигации: передаёт современность и дружелюбность туристического бренда.',
    colorsPalette: [
      { color: '#00A650' },
      { color: '#1A1A1A' },
      { color: '#FFFFFF' },
      { color: '#333333' },
      { color: '#F5F5F5' },
    ],
    perfMetrics: [
      { label: 'Страниц разработано', value: '450', status: 'excellent' },
      { label: 'Интеграций с API туроператоров', value: '120', status: 'excellent' },
      { label: 'Срок реализации', value: '6 мес', status: 'good' },
      { label: 'Туров в каталоге', value: '9519', status: 'excellent' },
    ],
    metrics: { 'Страниц': 450, 'Интеграций API': 120, 'Туров в каталоге': 9519, 'Дней разработки': 180 },
  },
  {
    slug: 'russiadiscovery-case',
    fontFamily: 'Cormorant Garamond, Georgia, serif',
    weights: ['REGULAR', 'SEMIBOLD', 'BOLD'],
    typographyDescription: 'Cormorant Garamond — элегантный переходный сериф с высокой контрастностью штрихов. Создаёт ощущение премиальности и надёжности. Используется для заголовков туров и цитат. Для основного текста — системный шрифт для лучшей читаемости на мобильных.',
    colorsPalette: [
      { color: '#1E3A5F' },
      { color: '#C9A227' },
      { color: '#FFFFFF' },
      { color: '#2C2C2C' },
      { color: '#F8F6F0' },
    ],
    perfMetrics: [
      { label: 'Страниц разработано', value: '200', status: 'excellent' },
      { label: 'Туров в каталоге', value: '350', status: 'excellent' },
      { label: 'Срок реализации', value: '4 мес', status: 'good' },
      { label: 'Экранов журнала', value: '45', status: 'excellent' },
    ],
    metrics: { 'Страниц': 200, 'Туров': 350, 'Экранов журнала': 45, 'Дней разработки': 120 },
  },
  {
    slug: 'youtravel-case',
    fontFamily: 'Inter, system-ui, sans-serif',
    weights: ['REGULAR', 'MEDIUM', 'SEMIBOLD'],
    typographyDescription: 'Inter — системный интерфейсный шрифт с оптимизированными метриками для экранов. Высокая читаемость при маленьких размерах, чёткие формы. Идеален для форм, карточек туров и навигации. Нейтральный характер не отвлекает от контента.',
    colorsPalette: [
      { color: '#0B6BCB' },
      { color: '#0D1117' },
      { color: '#FFFFFF' },
      { color: '#58A6FF' },
      { color: '#F0F6FC' },
    ],
    perfMetrics: [
      { label: 'Экранов в UI', value: '25', status: 'excellent' },
      { label: 'Страниц каталога', value: '80', status: 'excellent' },
      { label: 'Срок реализации', value: '3 мес', status: 'good' },
      { label: 'Компонентов в дизайн-системе', value: '48', status: 'excellent' },
    ],
    metrics: { 'Экранов UI': 25, 'Страниц': 80, 'Компонентов': 48, 'Дней разработки': 90 },
  },
];

async function main() {
  console.log('🔄 Обновление travel-кейсов: цвета, шрифты, показатели...\n');

  for (const upd of CASES_UPDATE) {
    const r = await pool.query(
      'SELECT slug, content_json, metrics FROM cases WHERE slug = $1',
      [upd.slug]
    );

    if (r.rows.length === 0) {
      console.log(`⏭️  ${upd.slug} не найден, пропуск`);
      continue;
    }

    const row = r.rows[0];
    const cj = row.content_json || {};

    const newContentJson = {
      ...cj,
      colors: {
        ...(cj.colors || {}),
        palette: upd.colorsPalette,
      },
      typography: {
        ...(cj.typography || {}),
        fontFamily: upd.fontFamily,
        weights: upd.weights,
        description: upd.typographyDescription,
      },
      performance: {
        ...(cj.performance || {}),
        metrics: upd.perfMetrics,
      },
      results: {
        ...(cj.results || {}),
        features: Object.entries(upd.metrics).map(([k, v]) => `${k}: ${v}`),
      },
    };

    await pool.query(
      `UPDATE cases 
       SET content_json = $2::jsonb, metrics = $3::jsonb, updated_at = NOW() 
       WHERE slug = $1`,
      [upd.slug, JSON.stringify(newContentJson), JSON.stringify(upd.metrics)]
    );

    console.log(`✅ ${upd.slug}: палитра, шрифт ${upd.fontFamily}, показатели`);
  }

  await pool.end();
  console.log('\nГотово.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
