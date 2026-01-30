#!/usr/bin/env node
/**
 * Создание начальных вопросов квиза
 * Использование: node scripts/create-initial-quiz.js
 */

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

const initialQuestions = [
  {
    questionText: 'Какой у вас бюджет на проект?',
    questionType: 'single',
    sortOrder: 1,
    options: [
      {
        optionText: 'До 500 000 ₽',
        optionDescription: 'Ограниченный бюджет',
        pointsStart: 3,
        pointsBusiness: 1,
        pointsPremium: 0
      },
      {
        optionText: '500 000 - 1 500 000 ₽',
        optionDescription: 'Средний бюджет',
        pointsStart: 1,
        pointsBusiness: 3,
        pointsPremium: 1
      },
      {
        optionText: 'Свыше 1 500 000 ₽',
        optionDescription: 'Гибкий бюджет',
        pointsStart: 0,
        pointsBusiness: 2,
        pointsPremium: 3
      }
    ]
  },
  {
    questionText: 'Какой срок реализации проекта?',
    questionType: 'single',
    sortOrder: 2,
    options: [
      {
        optionText: 'До 1 месяца',
        optionDescription: 'Срочный запуск',
        pointsStart: 3,
        pointsBusiness: 1,
        pointsPremium: 0
      },
      {
        optionText: '1-3 месяца',
        optionDescription: 'Стандартный срок',
        pointsStart: 1,
        pointsBusiness: 3,
        pointsPremium: 1
      },
      {
        optionText: '3+ месяца',
        optionDescription: 'Гибкий срок',
        pointsStart: 0,
        pointsBusiness: 2,
        pointsPremium: 3
      }
    ]
  },
  {
    questionText: 'Какая сложность проекта?',
    questionType: 'single',
    sortOrder: 3,
    options: [
      {
        optionText: 'Простой (базовый функционал)',
        optionDescription: 'Стандартные функции',
        pointsStart: 3,
        pointsBusiness: 1,
        pointsPremium: 0
      },
      {
        optionText: 'Средний (стандартные функции)',
        optionDescription: 'Расширенный функционал',
        pointsStart: 1,
        pointsBusiness: 3,
        pointsPremium: 1
      },
      {
        optionText: 'Сложный (кастомные решения)',
        optionDescription: 'Индивидуальная разработка',
        pointsStart: 0,
        pointsBusiness: 1,
        pointsPremium: 3
      }
    ]
  },
  {
    questionText: 'Нужна ли долгосрочная поддержка?',
    questionType: 'single',
    sortOrder: 4,
    options: [
      {
        optionText: 'Нет, только запуск',
        optionDescription: 'Разовый проект',
        pointsStart: 3,
        pointsBusiness: 1,
        pointsPremium: 0
      },
      {
        optionText: 'Да, нужна поддержка',
        optionDescription: 'Долгосрочное сотрудничество',
        pointsStart: 0,
        pointsBusiness: 2,
        pointsPremium: 3
      }
    ]
  },
  {
    questionText: 'Какой масштаб проекта?',
    questionType: 'single',
    sortOrder: 5,
    options: [
      {
        optionText: 'Малый бизнес / Стартап',
        optionDescription: 'Небольшая компания',
        pointsStart: 3,
        pointsBusiness: 1,
        pointsPremium: 0
      },
      {
        optionText: 'Средний бизнес',
        optionDescription: 'Растущая компания',
        pointsStart: 1,
        pointsBusiness: 3,
        pointsPremium: 1
      },
      {
        optionText: 'Крупная компания',
        optionDescription: 'Корпоративный проект',
        pointsStart: 0,
        pointsBusiness: 1,
        pointsPremium: 3
      }
    ]
  }
];

async function applyMigration() {
  try {
    console.error('📦 Применение миграции для quiz...\n');
    
    // Проверяем, существует ли таблица
    const checkResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'quiz_questions'
    `);
    
    if (checkResult.rows.length > 0) {
      console.error('⚠️  Таблицы quiz уже существуют, пропускаем миграцию\n');
      return;
    }
    
    const migrationSQL = await import('fs/promises').then(fs => 
      fs.readFile(new URL('../migrations/052_add_quiz_system.sql', import.meta.url), 'utf-8')
    );
    await pool.query(migrationSQL);
    console.error('✅ Миграция применена\n');
  } catch (error) {
    if (error.message.includes('already exists') || error.code === '42P07') {
      console.error('⚠️  Таблицы уже существуют, пропускаем миграцию\n');
    } else {
      console.error('❌ Ошибка применения миграции:', error.message);
      throw error;
    }
  }
}

async function createQuestion(question) {
  try {
    // Создаем вопрос
    const questionResult = await pool.query(`
      INSERT INTO quiz_questions (question_text, question_type, sort_order, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      question.questionText,
      question.questionType,
      question.sortOrder,
      true
    ]);
    
    if (questionResult.rows.length === 0) {
      // Вопрос уже существует, находим его
      const existing = await pool.query(
        'SELECT id FROM quiz_questions WHERE question_text = $1',
        [question.questionText]
      );
      if (existing.rows.length === 0) {
        return false;
      }
      const questionId = existing.rows[0].id;
      
      // Обновляем вопрос
      await pool.query(`
        UPDATE quiz_questions SET
          question_type = $1,
          sort_order = $2,
          is_active = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [question.questionType, question.sortOrder, true, questionId]);
      
      // Создаем варианты ответов
      for (const option of question.options) {
        await pool.query(`
          INSERT INTO quiz_options (
            question_id, option_text, option_description,
            points_start, points_business, points_premium, sort_order, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
        `, [
          questionId,
          option.optionText,
          option.optionDescription,
          option.pointsStart,
          option.pointsBusiness,
          option.pointsPremium,
          question.options.indexOf(option),
          true
        ]);
      }
      
      return true;
    }
    
    const questionId = questionResult.rows[0].id;
    
    // Создаем варианты ответов
    for (const option of question.options) {
      await pool.query(`
        INSERT INTO quiz_options (
          question_id, option_text, option_description,
          points_start, points_business, points_premium, sort_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        questionId,
        option.optionText,
        option.optionDescription,
        option.pointsStart,
        option.pointsBusiness,
        option.pointsPremium,
        question.options.indexOf(option),
        true
      ]);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

async function main() {
  console.error('🔄 Создание начальных вопросов квиза...\n');
  
  try {
    await pool.query('SELECT NOW()');
    console.error('✅ Подключение к БД успешно\n');
    
    // Применяем миграцию
    await applyMigration();
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    await pool.end();
    process.exit(1);
  }
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (const question of initialQuestions) {
    try {
      console.error(`📦 Обработка: ${question.questionText}...`);
      const result = await createQuestion(question);
      if (result) {
        created++;
        console.error(`   ✅ Создан: ${question.questionText}`);
      } else {
        updated++;
        console.error(`   ✅ Обновлен: ${question.questionText}`);
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ Ошибка: ${question.questionText} - ${error.message}`);
    }
  }
  
  console.error(`\n📊 Итого:`);
  console.error(`   ✅ Создано: ${created}`);
  console.error(`   🔄 Обновлено: ${updated}`);
  console.error(`   ❌ Ошибок: ${errors}`);
  
  await pool.end();
  console.error('\n✅ Готово!');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error.message);
  process.exit(1);
});
