#!/usr/bin/env node
/**
 * Скрипт для создания полных описаний товаров PrimeCoder
 * Использование: node scripts/create-full-product-descriptions.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

let poolConfig;
if (process.env.DATABASE_URL) {
  poolConfig = { connectionString: process.env.DATABASE_URL };
} else {
  poolConfig = {
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT),
  };
}

const pool = new Pool(poolConfig);

// Полное описание для "Аутсорсинг Digital-агентство"
const AUTSORSING_DIGITAL_DESCRIPTION = `
Аутсорсинг Digital-агентство — это комплексное решение для компаний, которые хотят масштабировать и оптимизировать свои digital-маркетинговые процессы, передав часть или все digital-задачи внешним профессионалам. Такое агентство обеспечивает экспертный подход, полный цикл маркетинговых и технических услуг, что позволяет бизнесу сосредоточиться на своей основной деятельности, получая при этом стабильные качественные результаты.

<h2>Для кого подходит аутсорсинг digital-агентства?</h2>

<p>Услуга актуальна для средних и крупных компаний, которые нуждаются в системном digital-продвижении без необходимости создавать и содержать собственную команду. Это идеальный вариант для бизнеса, ориентированного на рост и масштабирование, стремящегося использовать последние технологии и профессиональные инструменты для достижения маркетинговых целей.</p>

<h2>Основные функции и преимущества аутсорсинга digital-агентства в 2025 году:</h2>

<ul>
<li><strong>Комплексный подход:</strong> охват всех ключевых направлений digital — SEO, контекстная и таргетированная реклама, SMM, создание и продвижение контента, веб-разработка, аналитика и автоматизация.</li>
<li><strong>Оптимизация затрат:</strong> нет необходимости содержать штат специалистов разного профиля, оплату услуг можно адаптировать под бизнес-цели и бюджет.</li>
<li><strong>Доступ к экспертам и инновациям:</strong> команда агентства использует передовые инструменты и технологии, включая AI для оптимизации кампаний и анализа данных.</li>
<li><strong>Гибкость и масштабируемость:</strong> услуги можно увеличивать или сокращать в зависимости от задач и этапов развития бизнеса.</li>
<li><strong>Полный контроль и прозрачность:</strong> регулярные отчёты, дашборды с ключевыми KPI, коммуникация с менеджерами проекта и доступ к результатам в реальном времени.</li>
</ul>

<h2>Что получает клиент:</h2>

<ul>
<li>Эффективное digital-продвижение с использованием передовых технологий и стратегий.</li>
<li>Снижение операционных расходов и повышение скорости запуска маркетинговых кампаний.</li>
<li>Увеличение узнаваемости бренда, трафика и продаж за счёт скоординированной работы нескольких каналов.</li>
<li>Гибкие решения, адаптированные под специфические требования и задачи бизнеса.</li>
<li>Поддержку и сопровождение на всех этапах развития digital-направления.</li>
</ul>

<h2>Этапы работы аутсорсинга digital-агентства</h2>

<ol>
<li>Анализ текущего состояния digital-маркетинга и постановка целей.</li>
<li>Формирование комплексной стратегии с учётом всех digital-каналов.</li>
<li>Составление и запуск рекламных кампаний, SEO и SMM проектов.</li>
<li>Создание и оптимизация контента, UX/UI сопровождение при необходимости.</li>
<li>Внедрение аналитики, автоматизация и сквозной учёт результатов.</li>
<li>Постоянный мониторинг, корректировка стратегий и оптимизация расходов.</li>
<li>Регулярные отчёты и коммуникация с клиентом по KPI.</li>
<li>Масштабирование и адаптация под новые бизнес-задачи.</li>
</ol>
`;

const AUTSORSING_DIGITAL_CONTENT_JSON = {
  header: {
    title: "Аутсорсинг Digital-агентство",
    description: "Комплексное решение для масштабирования и оптимизации digital-маркетинговых процессов",
    primaryButtonText: "Заказать услугу",
    primaryButtonLink: "/contacts",
    secondaryButtonText: "Получить консультацию",
    secondaryButtonLink: "/contacts"
  },
  description: {
    title: "О услуге",
    text: "Аутсорсинг Digital-агентство — это комплексное решение для компаний, которые хотят масштабировать и оптимизировать свои digital-маркетинговые процессы, передав часть или все digital-задачи внешним профессионалам."
  },
  priceSection: {
    title: "Тарифные планы",
    tariffs: [
      {
        id: "basic",
        name: "Базовый",
        subtitle: "Для малого и среднего бизнеса",
        price: "от 60 000 ₽/мес",
        description: "Анализ, запуск ключевых digital-кампаний, базовая аналитика",
        featuresLeft: [
          "Анализ текущего состояния",
          "Запуск ключевых кампаний",
          "Базовая аналитика",
          "Ежемесячные отчёты"
        ],
        featuresRight: [
          "Консультации по стратегии",
          "Поддержка менеджера",
          "Доступ к дашбордам",
          "Оптимизация расходов"
        ]
      },
      {
        id: "optimal",
        name: "Оптимальный",
        subtitle: "Для среднего и растущего бизнеса",
        price: "от 120 000 ₽/мес",
        description: "Все из базового + комплексное ведение SEO, SMM, контент, отчёты",
        featuresLeft: [
          "Всё из базового тарифа",
          "Комплексное ведение SEO",
          "Ведение SMM",
          "Создание контента"
        ],
        featuresRight: [
          "Расширенная аналитика",
          "Еженедельные отчёты",
          "Приоритетная поддержка",
          "AI-оптимизация кампаний"
        ]
      },
      {
        id: "premium",
        name: "Премиум",
        subtitle: "Для крупных компаний и проектов",
        price: "от 200 000 ₽/мес",
        description: "Полный digital с AI-оптимизацией, автоматизацией, поддержкой 24/7",
        featuresLeft: [
          "Всё из оптимального тарифа",
          "AI-оптимизация",
          "Автоматизация процессов",
          "Поддержка 24/7"
        ],
        featuresRight: [
          "Выделенный менеджер",
          "Ежедневные отчёты",
          "Интеграции с CRM",
          "Масштабирование под задачи"
        ]
      }
    ]
  },
  workSteps: {
    title: "Этапы работы",
    description: "Как мы работаем с вашим проектом",
    steps: [
      {
        number: "1",
        title: "Анализ и постановка целей",
        description: "Анализ текущего состояния digital-маркетинга и постановка целей"
      },
      {
        number: "2",
        title: "Формирование стратегии",
        description: "Формирование комплексной стратегии с учётом всех digital-каналов"
      },
      {
        number: "3",
        title: "Запуск кампаний",
        description: "Составление и запуск рекламных кампаний, SEO и SMM проектов"
      },
      {
        number: "4",
        title: "Создание контента",
        description: "Создание и оптимизация контента, UX/UI сопровождение при необходимости"
      },
      {
        number: "5",
        title: "Аналитика и автоматизация",
        description: "Внедрение аналитики, автоматизация и сквозной учёт результатов"
      },
      {
        number: "6",
        title: "Мониторинг и оптимизация",
        description: "Постоянный мониторинг, корректировка стратегий и оптимизация расходов"
      },
      {
        number: "7",
        title: "Отчёты и коммуникация",
        description: "Регулярные отчёты и коммуникация с клиентом по KPI"
      },
      {
        number: "8",
        title: "Масштабирование",
        description: "Масштабирование и адаптация под новые бизнес-задачи"
      }
    ]
  },
  stats: {
    title: "Результаты наших клиентов",
    description: "Цифры, которые говорят сами за себя",
    items: [
      {
        value: "85%",
        label: "Клиентов увеличили трафик"
      },
      {
        value: "120%",
        label: "Средний рост конверсий"
      },
      {
        value: "2-3 недели",
        label: "Срок запуска кампаний"
      },
      {
        value: "24/7",
        label: "Поддержка и мониторинг"
      }
    ]
  },
  faq: {
    title: "Часто задаваемые вопросы",
    description: "Ответы на популярные вопросы об аутсорсинге digital-агентства",
    items: [
      {
        question: "В чем преимущество аутсорсинга digital-услуг перед внутренним отделом?",
        answer: "Аутсорсинг позволяет сократить расходы, получить доступ к узкопрофильным экспертам и технологиям без необходимости содержать штат и обучать сотрудников."
      },
      {
        question: "Можно ли выбирать отдельные услуги или только полный комплекс?",
        answer: "Можно как заказать полный комплекс, так и отдельные услуги, гибко настраивая пакеты под текущие задачи."
      },
      {
        question: "Как контролировать эффективность и расходы?",
        answer: "Мы предоставляем прозрачные отчёты с ключевыми показателями, дашборды с доступом в режиме реального времени и регулярные встречи с менеджером проекта."
      },
      {
        question: "Насколько быстро можно запустить кампании?",
        answer: "После анализа и согласования стратегии запуск может быть произведён в течение 1-2 недель в зависимости от задач."
      },
      {
        question: "Какие инструменты и технологии используются?",
        answer: "Мы используем передовые инструменты для аналитики, автоматизации, AI-оптимизации кампаний, CRM-интеграции и сквозной аналитики."
      },
      {
        question: "Что входит в ежемесячные отчёты?",
        answer: "В отчёты входят ключевые KPI, анализ эффективности кампаний, рекомендации по оптимизации, планы на следующий период и финансовые показатели."
      }
    ]
  },
  subscribe: {
    items: [
      {
        iconUrl: "/legacy/img/promo-icon.png",
        title: "Заказать услугу",
        description: "Свяжитесь с нами для обсуждения вашего проекта",
        linkText: "Связаться",
        linkUrl: "/contacts"
      },
      {
        iconUrl: "/legacy/img/brif-icon.png",
        title: "Заполнить бриф",
        description: "Заполните бриф для более точного расчёта стоимости",
        linkText: "Заполнить бриф",
        linkUrl: "/contacts"
      },
      {
        iconUrl: "/legacy/img/tel-icon.png",
        title: "Позвонить нам",
        description: "Позвоните нам для консультации",
        linkText: "Позвонить",
        linkUrl: "tel:+79999999999"
      }
    ]
  }
};

async function updateProduct(slug, updates) {
  try {
    const result = await pool.query(
      `UPDATE products SET
        full_description_html = COALESCE($1, full_description_html),
        content_json = COALESCE($2, content_json),
        meta_title = COALESCE($3, meta_title),
        meta_description = COALESCE($4, meta_description),
        updated_at = NOW()
      WHERE slug = $5
      RETURNING slug, title`,
      [
        updates.fullDescriptionHtml,
        updates.contentJson ? JSON.stringify(updates.contentJson) : null,
        updates.metaTitle,
        updates.metaDescription,
        slug
      ]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    throw error;
  }
}

async function main() {
  console.error('🔄 Updating product descriptions...');
  
  try {
    await pool.query('SELECT NOW()');
    console.error('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    await pool.end();
    process.exit(1);
  }
  
  // Обновляем "Аутсорсинг Digital-агентство"
  console.error('\n📦 Updating: Аутсорсинг Digital-агентство...');
  const result = await updateProduct('autsorsing-digital-agentstvo', {
    fullDescriptionHtml: AUTSORSING_DIGITAL_DESCRIPTION,
    contentJson: AUTSORSING_DIGITAL_CONTENT_JSON,
    metaTitle: 'Аутсорсинг Digital-агентство | PrimeCoder',
    metaDescription: 'Комплексное решение для масштабирования digital-маркетинга. SEO, SMM, контекстная реклама, аналитика, AI-оптимизация. Тарифы от 60 000 ₽/мес.'
  });
  
  if (result) {
    console.error(`   ✅ Updated: ${result.title}`);
  } else {
    console.error(`   ⚠️  Product not found: autsorsing-digital-agentstvo`);
  }
  
  await pool.end();
  console.error('\n✅ Done!');
}

main().catch(error => {
  console.error('❌ Failed:', error.message);
  process.exit(1);
});
