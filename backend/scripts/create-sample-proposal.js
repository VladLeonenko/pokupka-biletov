import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: String(process.env.PGPASSWORD),
  port: Number(process.env.PGPORT),
});

function generateShareToken() {
  return crypto.randomBytes(32).toString('hex');
}

const proposalData = {
  title: 'SEO + ВЕДЕНИЕ САЙТА ДЛЯ CULTURE-ALLIANCE.CENTER',
  clientName: 'Culture Alliance',
  clientEmail: 'info@culture-alliance.center',
  description: 'Комплексное решение для продвижения культурного проекта в интернете',
  status: 'draft',
  shareToken: generateShareToken(),
  settings: {},
};

const slides = [
  {
    slideType: 'hero',
    sortOrder: 0,
    content: {
      title: 'ИНДИВИДУАЛЬНЫЙ ПОДХОД К CULTURE-ALLIANCE',
      subtitle: 'ПОЧЕМУ МЫ — ИДЕАЛЬНЫЙ ПАРТНЕР ДЛЯ ВАС',
      description: 'Мы не просто digital-агентство, мы — эксперты в продвижении культурных проектов. Наш опыт и специализированные инструменты позволяют нам глубоко понимать специфику вашей деятельности и достигать выдающихся результатов.',
    },
  },
  {
    slideType: 'services',
    sortOrder: 1,
    content: {
      title: 'НАШЕ ПРЕДЛОЖЕНИЕ',
      subtitle: 'Комплексный подход для решения ваших задач',
      services: [
        {
          title: 'УСЛУГА 1: SEO-ПРОДВИЖЕНИЕ',
          description: 'Оптимизация сайта для поисковых систем с целью повышения его видимости и привлечения целевого органического трафика. Это фундамент для долгосрочного успеха.',
          items: [
            'Вывод в ТОП-3 по ключевым запросам',
            'Прирост ссылочной массы (150+ ссылок за 6 месяцев)',
            'Технический аудит и исправление >100 ошибок',
            'Работа с 50 ключевыми запросами',
            'План работ на первый месяц с гарантией +50% трафика',
          ],
        },
        {
          title: 'УСЛУГА 2: ВЕДЕНИЕ САЙТА',
          description: 'Комплексная поддержка и развитие вашего сайта, включающая контент-менеджмент, техническое обслуживание и регулярную аналитику для обеспечения стабильной работы и роста.',
          items: [
            '12 статей/афиш в месяц',
            '20 часов технической поддержки',
            '4 А/В теста СТА',
            'Ежемесячные KPI отчёты',
            'Чат с проектным менеджером 24/7',
          ],
        },
      ],
    },
  },
  {
    slideType: 'problems',
    sortOrder: 2,
    content: {
      title: 'ТЕКУЩИЕ ПРОБЛЕМЫ САЙТА',
      subtitle: 'АНАЛИЗ culture-alliance.center',
      problems: [
        {
          title: 'ОБЩИЙ ВЕРДИКТ: КРИТИЧЕСКИЙ (ОЦЕНКА 28/100)',
          items: [
            'УПУЩЕННАЯ ВЫГОДА: Ежемесячно теряются до 500 000 ₽ от потенциальных заявок и продаж билетов',
            'Технический аудит: найдено 47 ошибок (скорость загрузки, мобильная адаптивность, структура URL)',
            'On-Page SEO: оценка 22/100 (отсутствуют мета-теги, слабый контент, проблемы с индексацией)',
            'Юзабилити и конверсия: оценка 15/100 (отсутствуют CTA и формы заявок, плохая навигация)',
            'Аналитика и инструменты: 0/100 (отсутствует Google Analytics, Яндекс.Метрика, Search Console)',
          ],
          solution: 'Комплексное решение всех проблем через SEO-продвижение и профессиональное ведение сайта',
        },
      ],
    },
  },
  {
    slideType: 'metrics',
    sortOrder: 3,
    content: {
      title: 'ЦЕННОСТЬ SEO ДЛЯ КУЛЬТУРНЫХ ПРОЕКТОВ',
      subtitle: 'Измеримые результаты для вашего бизнеса',
      metrics: [
        {
          value: '+500%',
          label: 'Органический трафик',
          change: 'За 6 месяцев',
          description: 'Значительное увеличение числа посетителей через поисковые системы',
        },
        {
          value: '150+',
          label: 'Заявок/мес на Академию',
          change: 'Стабильный приток',
          description: 'Привлечение заинтересованных студентов и слушателей',
        },
        {
          value: '300+',
          label: 'Билетов/мес онлайн',
          change: 'Прямые продажи',
          description: 'Увеличение онлайн-продаж билетов на спектакли и концерты',
        },
        {
          value: '15х',
          label: 'ROI за год',
          change: 'Окупаемость',
          description: 'Ваши инвестиции окупятся многократно',
        },
      ],
    },
  },
  {
    slideType: 'roadmap',
    sortOrder: 4,
    content: {
      title: 'ПЛАН ДЕЙСТВИЙ И РЕЗУЛЬТАТЫ',
      subtitle: 'ROADMAP (90 ДНЕЙ): Путь к успеху вашего культурного проекта',
      phases: [
        {
          title: 'НЕДЕЛЯ 1-2: АУДИТ + ТЕХНИКА',
          period: 'Неделя 1-2',
          actions: [
            'Полный технический аудит сайта',
            'Устранение более 100 критических технических ошибок',
            'Оптимизация скорости загрузки сайта до <2 секунд',
          ],
          result: 'Результат: +30% органического трафика',
        },
        {
          title: 'МЕСЯЦ 1: SEO + КОНТЕНТ',
          period: 'Месяц 1',
          actions: [
            'Вывод сайта в ТОП-10 по 5 приоритетным ключевым запросам',
            'Публикация 12 оптимизированных статей и новостей',
            'Активное SMM-продвижение с 24 постами/сторис',
          ],
          result: 'Результат: +150 целевых заявок в месяц',
        },
        {
          title: 'МЕСЯЦ 2-3: МАСШТАБИРОВАНИЕ',
          period: 'Месяц 2-3',
          actions: [
            'Достижение ТОП-3 позиций по приоритетным запросам',
            'Увеличение конверсии до 12% за счет непрерывных А/В тестов',
            'Расширение охвата аудитории и углубление вовлеченности',
          ],
          result: 'Результат: Дополнительный доход 500 000 ₽/мес',
        },
      ],
    },
  },
  {
    slideType: 'metrics',
    sortOrder: 5,
    content: {
      title: 'ЦЕННОСТЬ ВЕДЕНИЯ САЙТА',
      subtitle: 'Пакет "КУЛЬТУРА PRO" направлен на достижение выдающихся результатов',
      metrics: [
        {
          value: '+130%',
          label: 'Скорость загрузки: 4.2с → 1.8c',
          description: 'Улучшение скорости загрузки сайта на 130%',
        },
        {
          value: '+1100%',
          label: 'Конверсия: 1% → 12%',
          description: 'Рост коэффициента конверсии в 11 раз',
        },
        {
          value: '+1400%',
          label: 'Заявки: 10 → 150/мес',
          description: 'Увеличение количества целевых заявок в 14 раз',
        },
        {
          value: '500k ₽',
          label: 'LTV клиента',
          description: 'Средний жизненный цикл клиента для Академии и билетов',
        },
      ],
    },
  },
  {
    slideType: 'guarantees',
    sortOrder: 6,
    content: {
      title: 'ГАРАНТИИ И ОТЧЁТНОСТЬ',
      subtitle: 'Прозрачная система отчетности и четкие гарантии',
      guarantees: [
        {
          title: 'ГАРАНТИЯ РАБОТЫ (100%)',
          description: 'Мы гарантируем выполнение всех обязательств',
          items: [
            'Выполним 100% плана по задачам',
            'Еженедельные отчёты KPI',
            'Доступ к дашборду 24/7',
          ],
        },
        {
          title: 'ГАРАНТИЯ ТРАФИКА (+100%)',
          description: 'Если трафик не вырастет на 100% за 3 мес',
          items: [
            '+1 месяц ведения бесплатно',
          ],
        },
        {
          title: 'ГАРАНТИЯ ТОП-20',
          description: 'По 5 ключам в ТОП-20 за 3 мес или',
          items: [
            'Бесплатная оптимизация ещё 1 мес',
            'Возврат 20% за техническую часть',
          ],
        },
      ],
    },
  },
  {
    slideType: 'pricing',
    sortOrder: 7,
    content: {
      title: 'СТОИМОСТЬ',
      subtitle: 'Прозрачное ценообразование без скрытых платежей',
      packages: [
        {
          name: 'SEO-ПРОДВИЖЕНИЕ',
          price: '70 000',
          period: '₽/месяц',
          description: 'Пакет "КУЛЬТУРА ТОП"',
          features: [
            '20 часов технической оптимизации',
            '4 высококачественные статьи ежемесячно',
            'Работа с 50 ключевыми запросами',
            '25 качественных внешних ссылок в месяц',
            'Ежемесячные отчеты по KPI',
          ],
        },
        {
          name: 'ВЕДЕНИЕ САЙТА',
          price: '79 000',
          period: '₽/месяц',
          description: 'Пакет "КУЛЬТУРА PRO"',
          features: [
            '12 статей/афиш в месяц',
            '20 часов технической поддержки',
            '4 А/В теста СТА',
            'Ежемесячные KPI отчёты',
            'Чат с проектным менеджером 24/7',
            'Интерактивный дашборд KPI',
          ],
        },
      ],
    },
  },
  {
    slideType: 'contacts',
    sortOrder: 8,
    content: {
      title: 'КОНТАКТЫ',
      subtitle: 'Свяжитесь с нами для обсуждения деталей предложения',
      contacts: [
        {
          name: 'Владислав',
          phone: '+7 (999) 984-91-07',
          email: 'info@primecoder.ru',
        },
      ],
    },
  },
];

async function createSampleProposal() {
  try {
    console.log('📦 Создание примера коммерческого предложения...');

    // Создаем предложение
    const proposalResult = await pool.query(
      `INSERT INTO commercial_proposals 
       (client_id, deal_id, user_id, title, client_name, client_email, description, status, share_token, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        null,
        null,
        null,
        proposalData.title,
        proposalData.clientName,
        proposalData.clientEmail,
        proposalData.description,
        proposalData.status,
        proposalData.shareToken,
        JSON.stringify(proposalData.settings),
      ]
    );

    const proposalId = proposalResult.rows[0].id;
    console.log(`✅ Предложение создано с ID: ${proposalId}`);

    // Создаем слайды
    for (const slide of slides) {
      await pool.query(
        `INSERT INTO proposal_slides (proposal_id, slide_type, sort_order, content)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [proposalId, slide.slideType, slide.sortOrder, JSON.stringify(slide.content)]
      );
    }

    console.log(`✅ Создано ${slides.length} слайдов`);
    console.log(`\n🎉 Готово! Предложение создано с ID: ${proposalId}`);
    console.log(`📄 Откройте в админке: /admin/commercial-proposals/${proposalId}`);

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createSampleProposal();

