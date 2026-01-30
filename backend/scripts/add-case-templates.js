import pool from '../db.js';

/**
 * Креативные шаблоны кейсов - вдохновлены топовыми mockup-ами из Pinterest
 * Каждый шаблон уникален, отражает специфику направления и демонстрирует экспертность
 */

const templates = [
  {
    slug: 'template-advertising',
    title: 'Campaign Impact Canvas | Контекстная реклама',
    summary: 'Трансформация рекламной стратегии через глубокую аналитику и креативный подход. Результат: 420% ROI, снижение CPA на 45%, рост конверсии в 2.3 раза.',
    category: 'advertising',
    isTemplate: true,
    tools: ['Google Ads', 'Яндекс.Директ', 'Facebook Ads', 'Google Analytics 4', 'Яндекс.Метрика', 'CRM-интеграция', 'Hotjar', 'A/B тестирование'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: `
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">📊 Контекст</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 2rem;">
          Клиент - растущая компания в нише B2B-услуг. Несмотря на стабильный бизнес, рекламные кампании показывали низкую эффективность: высокая стоимость привлечения, неконтролируемый бюджет, отсутствие понимания полного пути клиента от клика до сделки.
        </p>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🎯 Вызов</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1rem;">
          <strong>Проблемы, которые требовали решения:</strong>
        </p>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li>Конкуренция за ключевые запросы - стоимость клика выросла на 60% за полгода</li>
          <li>Неэффективное распределение бюджета между каналами - 70% тратилось без результата</li>
          <li>Отсутствие сквозной аналитики - невозможно отследить реальную эффективность</li>
          <li>Низкая конверсия объявлений - CTR 0.8%, конверсия 1.2%</li>
          <li>Нет понимания сегментации аудитории и их потребностей</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">💡 Наша стратегия</h2>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #ffbb00;">1. Глубокий аудит и сегментация</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Провели детальный анализ конкурентов, исследовали поведение аудитории через веб-визуализацию и настроили сегментацию по этапам воронки. Выявили 5 ключевых сегментов с разными потребностями.
          </p>
        </div>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #ffbb00;">2. Креативы с уникальными предложениями</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Создали серию объявлений с персонализацией под каждый сегмент. Использовали динамические расширения, добавляли отзывы и социальные доказательства. Запустили A/B тесты 50+ вариантов текстов и визуалов.
          </p>
        </div>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #ffbb00;">3. Сквозная аналитика и автоматизация</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Настроили интеграцию Google Ads → CRM → Analytics с отслеживанием полного пути клиента. Внедрили автоматические правила управления ставками на основе LTV и конверсий. Создали дашборд в реальном времени.
          </p>
        </div>
        <div>
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #ffbb00;">4. Оптимизация воронки</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Улучшили лендинги на основе данных веб-визуализации. Настроили ремаркетинг для каждого этапа воронки. Оптимизировали формы и добавили чат-бот для моментальных ответов на вопросы.
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🚀 Результаты</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 2rem;">
          За 3 месяца работы мы трансформировали рекламную стратегию и достигли впечатляющих результатов:
        </p>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li><strong>ROI вырос до 420%</strong> - каждый рубль в рекламе приносит 4.2 рубля дохода</li>
          <li><strong>Снижение CPA на 45%</strong> - стоимость привлечения клиента упала с 8500₽ до 4675₽</li>
          <li><strong>Конверсия выросла в 2.3 раза</strong> - с 1.2% до 2.76%</li>
          <li><strong>Рост целевого трафика на 180%</strong> - при сохранении бюджета</li>
          <li><strong>CTR улучшился до 3.2%</strong> - качество объявлений значительно повысилось</li>
          <li><strong>Автоматизация 60% процессов</strong> - управление кампаниями стало эффективнее</li>
        </ul>
      </div>
      
      <div>
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">💼 Ключевые инсайты</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
          Главный урок проекта - важность глубокой аналитики и персонализации. Сегментация аудитории и адаптация креативов под каждый сегмент дали 70% прироста эффективности. Сквозная аналитика помогла перераспределить бюджет на высокоэффективные каналы и исключить убыточные кампании.
        </p>
      </div>
    `,
    contentJson: {
      header: {
        banner: '/legacy/img/cases/template-advertising/hero-dashboard.png',
        title: 'Campaign Impact Canvas',
        subtitle: 'Трансформация рекламной стратегии через данные и креатив'
      },
      about: {
        text: 'Проект комплексной оптимизации рекламных кампаний с фокусом на аналитику, креативы и автоматизацию. Мы превратили неэффективный рекламный бюджет в мощный инструмент роста бизнеса с ROI 420%.'
      },
      tasks: {
        text: 'Трансформация неэффективных рекламных кампаний в высокодоходный инструмент привлечения клиентов. Вызовы: высокая конкуренция за ключевые запросы, неконтролируемый бюджет, отсутствие понимания полного пути клиента и низкая конверсия объявлений.',
        laptopImage: '/legacy/img/cases/template-advertising/ad-dashboard-mockup.png'
      },
      solution: {
        text: 'Разработали комплексную стратегию: глубокий аудит с сегментацией аудитории, создание персонализированных креативов для каждого сегмента, настройка сквозной аналитики с интеграцией CRM и автоматизация управления ставками на основе LTV. Оптимизировали всю воронку от объявления до сделки.',
        phoneImage: '/legacy/img/cases/template-advertising/creatives-showcase.png'
      }
    },
    gallery: [
      '/legacy/img/cases/template-advertising/metrics-dashboard.png',
      '/legacy/img/cases/template-advertising/ab-test-results.png',
      '/legacy/img/cases/template-advertising/roi-chart.png'
    ],
    metrics: {
      days: 90,
      campaigns: 15,
      cpcReduction: 45,
      conversionIncrease: 230,
      trafficGrowth: 180,
      roi: 420,
      ctr: 3.2,
      automation: 60
    },
    isPublished: false
  },
  {
    slug: 'template-ai',
    title: 'AI Amplifier Blueprint | AI Boost Team',
    summary: 'Внедрение AI-экосистемы для автоматизации бизнеса. 75% процессов автоматизировано, скорость обработки запросов выросла в 6.7 раз, точность AI-модели 94%.',
    category: 'ai',
    isTemplate: true,
    tools: ['OpenAI GPT-4', 'LangChain', 'Vector DB (Pinecone)', 'Python FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'MLflow', 'Prometheus'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: `
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🤖 Контекст</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 2rem;">
          Компания среднего размера столкнулась с необходимостью масштабировать операции без пропорционального роста команды. Ручная обработка запросов, рутинные задачи и отсутствие аналитики в реальном времени замедляли рост бизнеса.
        </p>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">⚡ Вызов</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1rem;">
          <strong>Критические проблемы:</strong>
        </p>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li>Обработка 2000+ клиентских запросов в день требовала команду из 15 человек</li>
          <li>Время ответа на запрос - 4-6 часов, что снижало удовлетворенность клиентов</li>
          <li>Ручная классификация и роутинг заявок с 20% ошибок</li>
          <li>Отсутствие прогнозирования спроса и планирования ресурсов</li>
          <li>Невозможность масштабирования без линейного роста затрат</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🧠 AI-архитектура</h2>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #00d4ff;">1. Интеллектуальный чат-бот GPT-4</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Разработали чат-бота на базе GPT-4 с fine-tuning под специфику бизнеса. Настроили RAG (Retrieval-Augmented Generation) с векторной базой данных для контекстного поиска по документации. Интеграция с CRM для доступа к истории клиента в реальном времени.
          </p>
        </div>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #00d4ff;">2. AI-ассистент для внутренних процессов</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Создали систему автоматической классификации и роутинга заявок с точностью 94%. AI анализирует текст, определяет приоритет, категорию и автоматически направляет на нужного специалиста. Обработка документов и извлечение данных из неструктурированных источников.
          </p>
        </div>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #00d4ff;">3. Система прогнозирования и аналитики</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Обучили ML-модель для прогнозирования спроса, сезонности и пиковых нагрузок. Система предсказывает объем работы на 30 дней вперед с точностью 87%, что позволяет оптимизировать планирование и распределение ресурсов.
          </p>
        </div>
        <div>
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #00d4ff;">4. Дашборд и мониторинг</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Реализовали дашборд в реальном времени с метриками работы AI-системы, качеством ответов, удовлетворенностью клиентов. Настроили алерты и автоматические улучшения на основе обратной связи.
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">📈 Результаты</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 2rem;">
          AI-трансформация принесла впечатляющие бизнес-результаты:
        </p>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li><strong>Автоматизация 75% процессов</strong> - освобождено 10 FTE сотрудников для стратегических задач</li>
          <li><strong>Скорость обработки выросла в 6.7 раз</strong> - с 4-6 часов до 35-50 минут</li>
          <li><strong>Точность AI-модели 94%</strong> - превосходит ручную обработку (80%)</li>
          <li><strong>2000+ запросов в день</strong> обрабатывает AI без усталости и ошибок</li>
          <li><strong>Экономия 2.4 млн ₽ в год</strong> на операционных затратах</li>
          <li><strong>Рост удовлетворенности клиентов на 40%</strong> - благодаря скорости ответов</li>
          <li><strong>Прогнозирование с точностью 87%</strong> - оптимизация планирования и ресурсов</li>
        </ul>
      </div>
      
      <div>
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🎓 Технологический стек</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
          Использовали современный технологический стек: OpenAI GPT-4 для NLP, LangChain для orchestration, Pinecone Vector DB для семантического поиска, FastAPI для API, MLflow для экспериментов. Система спроектирована для масштабирования и легко интегрируется с существующей инфраструктурой.
        </p>
      </div>
    `,
    contentJson: {
      header: {
        banner: '/legacy/img/cases/template-ai/ai-pipeline-visual.png',
        title: 'AI Amplifier Blueprint',
        subtitle: 'Трансформация бизнеса через искусственный интеллект'
      },
      about: {
        text: 'Комплексное внедрение AI-решений для автоматизации бизнес-процессов. Мы создали экосистему из интеллектуального чат-бота, AI-ассистента и системы прогнозирования, которая автоматизировала 75% рутинных операций и повысила эффективность работы команды в 6.7 раз.'
      },
      tasks: {
        text: 'Автоматизация рутинных процессов и масштабирование операций без роста команды. Вызовы: обработка 2000+ запросов в день требовала большую команду, время ответа 4-6 часов, ручная классификация с ошибками 20%, отсутствие прогнозирования и невозможность масштабирования.',
        laptopImage: '/legacy/img/cases/template-ai/ai-dashboard-mockup.png'
      },
      solution: {
        text: 'Создали AI-экосистему: чат-бот GPT-4 с RAG и векторной БД для контекстного поиска, AI-ассистент для автоматической классификации и роутинга с точностью 94%, ML-модель для прогнозирования спроса и дашборд для мониторинга. Интеграция с CRM и ERP системами.',
        phoneImage: '/legacy/img/cases/template-ai/chatbot-interface.png'
      }
    },
    gallery: [
      '/legacy/img/cases/template-ai/pipeline-architecture.png',
      '/legacy/img/cases/template-ai/automation-stats.png',
      '/legacy/img/cases/template-ai/ai-dashboard.png'
    ],
    metrics: {
      days: 90,
      automations: 75,
      responseTimeReduction: 85,
      accuracy: 94,
      requestsPerDay: 2000,
      efficiencyIncrease: 670,
      costSavings: 2400000,
      satisfactionIncrease: 40
    },
    isPublished: false
  },
  {
    slug: 'template-mobile',
    title: 'App Journey Showcase | Разработка мобильных приложений',
    summary: 'Создание премиального мобильного приложения с нуля. 50,000+ установок за 3 месяца, рейтинг 4.8+, конверсия установок в регистрацию 68%, DAU 35%.',
    category: 'mobile',
    isTemplate: true,
    tools: ['React Native', 'TypeScript', 'Swift (iOS)', 'Kotlin (Android)', 'Node.js', 'PostgreSQL', 'Firebase', 'Stripe SDK', 'Push Notifications', 'Figma'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: `
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">📱 Контекст</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 2rem;">
          Клиент - компания в сфере услуг, которая хотела выйти на мобильный рынок и предоставить клиентам удобный способ взаимодействия через приложение. Требовалось создать решение с нуля, которое будет работать на iOS и Android, иметь современный дизайн и высокую производительность.
        </p>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🎨 Процесс дизайна</h2>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #ff6b9d;">1. Исследование и прототипирование</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Провели анализ конкурентов, интервью с пользователями, создали user personas и пользовательские сценарии. Разработали wireframes и интерактивный прототип в Figma для валидации UX-решений до начала разработки.
          </p>
        </div>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #ff6b9d;">2. UI/UX дизайн</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Создали уникальный визуальный стиль с продуманной цветовой палитрой, типографикой и системой компонентов. Дизайн адаптирован под темную и светлую темы. Все экраны протестированы на удобство использования и соответствие гайдлайнам iOS и Material Design.
          </p>
        </div>
        <div>
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #ff6b9d;">3. Разработка и оптимизация</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Разработали кроссплатформенное приложение на React Native с нативными модулями для критичных функций. Настроили CI/CD для автоматических сборок, интеграцию платежей, push-уведомления и офлайн-режим. Провели оптимизацию производительности - время загрузки экранов менее 1 секунды.
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">⚙️ Технические особенности</h2>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li><strong>Архитектура:</strong> Модульная структура с разделением на слои (UI, Business Logic, Data)</li>
          <li><strong>Производительность:</strong> Ленивая загрузка, кэширование, оптимизация изображений</li>
          <li><strong>Безопасность:</strong> Шифрование данных, биометрическая аутентификация, защита API</li>
          <li><strong>Интеграции:</strong> Stripe для платежей, Firebase для push и аналитики, CRM через API</li>
          <li><strong>Доступность:</strong> Поддержка VoiceOver/TalkBack, достаточный контраст, читаемые шрифты</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🚀 Результаты запуска</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 2rem;">
          Приложение успешно запущено в App Store и Google Play:
        </p>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li><strong>50,000+ установок</strong> за первые 3 месяца после запуска</li>
          <li><strong>Рейтинг 4.8+</strong> в обоих магазинах приложений</li>
          <li><strong>Конверсия 68%</strong> - установки в регистрацию пользователей</li>
          <li><strong>DAU 35%</strong> - ежедневная активность пользователей</li>
          <li><strong>Время загрузки < 1 сек</strong> - быстрая работа приложения</li>
          <li><strong>Crash rate < 0.1%</strong> - стабильность и надежность</li>
          <li><strong>NPS 72</strong> - высокий уровень удовлетворенности пользователей</li>
        </ul>
      </div>
      
      <div>
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">💡 Ключевые решения</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
          Главный успех проекта - комплексный подход: от исследования пользователей до запуска и поддержки. Продуманный UX повысил конверсию, а техническая оптимизация обеспечила высокую производительность и стабильность. Постоянный сбор метрик и обратной связи позволяет быстро итерироваться и улучшать продукт.
        </p>
      </div>
    `,
    contentJson: {
      header: {
        banner: '/legacy/img/cases/template-mobile/hero-app-showcase.png',
        title: 'App Journey Showcase',
        subtitle: 'От идеи до успешного запуска в App Store и Google Play'
      },
      about: {
        text: 'Разработка мобильного приложения с нуля для iOS и Android. Мы создали премиальный продукт с современным дизайном, высокой производительностью и отличным пользовательским опытом. Результат: 50,000+ установок, рейтинг 4.8+, конверсия 68%.'
      },
      tasks: {
        text: 'Создание мобильного приложения с нуля для выхода на мобильный рынок. Требования: кроссплатформенная разработка, современный UI/UX дизайн, высокая производительность, интеграция платежей и push-уведомлений, офлайн-режим, соответствие гайдлайнам iOS и Android.',
        laptopImage: '/legacy/img/cases/template-mobile/ui-mockups-showcase.png'
      },
      solution: {
        text: 'Провели исследование пользователей, создали wireframes и интерактивный прототип. Разработали уникальный визуальный стиль с адаптацией под темную/светлую темы. Реализовали приложение на React Native с нативными модулями, настроили CI/CD, интеграции платежей и push. Оптимизировали производительность - загрузка экранов < 1 сек.',
        phoneImage: '/legacy/img/cases/template-mobile/app-in-hands.png'
      },
      colors: {
        image: '/legacy/img/cases/template-mobile/color-palette.png'
      },
      typography: {
        image: '/legacy/img/cases/template-mobile/typography-system.png'
      }
    },
    gallery: [
      '/legacy/img/cases/template-mobile/screen-flow.png',
      '/legacy/img/cases/template-mobile/devices-showcase.png',
      '/legacy/img/cases/template-mobile/app-store-screenshots.png'
    ],
    metrics: {
      days: 120,
      features: 25,
      screens: 40,
      loadTime: 0.8,
      rating: 4.8,
      installs: 50000,
      dau: 35,
      conversion: 68,
      crashRate: 0.1,
      nps: 72
    },
    isPublished: false
  },
  {
    slug: 'template-marketing',
    title: '360° Marketing Panorama | Комплексный маркетинг',
    summary: 'Комплексная маркетинговая стратегия с интеграцией всех каналов. Рост трафика на 250%, увеличение email-базы на 320%, рост продаж на 45%, узнаваемость бренда выросла в 3.2 раза.',
    category: 'marketing',
    isTemplate: true,
    tools: ['SMM (Instagram, VK, Telegram)', 'Content Marketing', 'Email Marketing', 'Google Analytics', 'Яндекс.Метрика', 'CRM', 'Marketing Automation', 'A/B тестирование', 'Canva', 'Figma'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: `
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🎯 Контекст</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 2rem;">
          Компания с хорошим продуктом, но слабым присутствием в digital-среде. Разрозненные маркетинговые активности без единой стратегии, отсутствие понимания эффективности каналов и невозможность масштабирования роста.
        </p>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🧩 Наша стратегия "360°"</h2>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #9d4edd;">1. Аудит и исследование</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Провели комплексный анализ: текущий маркетинг, конкурентов, целевой аудитории, каналов коммуникации. Выявили болевые точки и возможности. Создали customer journey map и определили ключевые touchpoints для взаимодействия.
          </p>
        </div>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #9d4edd;">2. Стратегия каналов</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Разработали интегрированную стратегию для всех каналов: социальные сети (Instagram, VK, Telegram), контент-маркетинг (блог, кейсы, экспертность), email-маркетинг (воронки, автоматизация), SEO (базовая оптимизация), партнерства и инфлюенсеры.
          </p>
        </div>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #9d4edd;">3. Контент и креативы</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Создали контент-план на квартал с тематическими блоками: экспертность, кейсы, инсайты, развлечение. Разработали визуальный стиль и tone of voice бренда. Запустили производство контента: статьи, посты, инфографика, видео, подкасты.
          </p>
        </div>
        <div>
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #9d4edd;">4. Автоматизация и аналитика</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Настроили воронки конверсии с автоматизацией email-рассылок. Интегрировали все каналы в единую CRM. Создали дашборд для отслеживания эффективности каждого канала. Реализовали сквозную аналитику для понимания полного пути клиента.
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">📊 Результаты по каналам</h2>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li><strong>Социальные сети:</strong> Рост подписчиков на 400%, engagement rate вырос до 8.5%</li>
          <li><strong>Контент-маркетинг:</strong> Рост трафика из органики на 180%, 45+ публикаций за квартал</li>
          <li><strong>Email-маркетинг:</strong> База выросла на 320%, открываемость 28%, кликабельность 5.2%</li>
          <li><strong>Партнерства:</strong> 12 коллабораций с инфлюенсерами, охват 2.5 млн человек</li>
          <li><strong>Реферальная программа:</strong> 23% новых клиентов приходят по рекомендациям</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🎉 Итоговые метрики</h2>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li><strong>Рост трафика на 250%</strong> из всех маркетинговых каналов</li>
          <li><strong>Увеличение email-базы на 320%</strong> - с 5,000 до 21,000 подписчиков</li>
          <li><strong>Конверсия в лиды выросла на 180%</strong> - улучшение воронок работает</li>
          <li><strong>Рост продаж на 45%</strong> - прямое влияние маркетинга на бизнес</li>
          <li><strong>Узнаваемость бренда выросла в 3.2 раза</strong> по данным опросов</li>
          <li><strong>Снижение стоимости привлечения на 35%</strong> - оптимизация каналов</li>
          <li><strong>ROI маркетинга 285%</strong> - каждый рубль приносит 2.85 рубля</li>
        </ul>
      </div>
      
      <div>
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">💼 Ключевые инсайты</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
          Главный урок проекта - сила интеграции каналов. Когда все каналы работают согласованно с единым сообщением и визуальным стилем, эффект усиливается экспоненциально. Контент-маркетинг питает социальные сети, email-маркетинг удерживает аудиторию, а партнерства расширяют охват. Сквозная аналитика показала, что 68% клиентов взаимодействуют с брендом через 3+ канала перед покупкой.
        </p>
      </div>
    `,
    contentJson: {
      header: {
        banner: '/legacy/img/cases/template-marketing/marketing-panorama.png',
        title: '360° Marketing Panorama',
        subtitle: 'Комплексная маркетинговая стратегия с интеграцией всех каналов'
      },
      about: {
        text: 'Разработка и реализация комплексной маркетинговой стратегии "360°" с интеграцией всех каналов продвижения. Мы создали единую экосистему из SMM, контент-маркетинга, email, SEO и партнерств, которая привела к росту трафика на 250% и увеличению продаж на 45%.'
      },
      tasks: {
        text: 'Усиление присутствия бренда в digital-среде и создание комплексной маркетинговой стратегии. Вызовы: разрозненные активности без единой стратегии, отсутствие понимания эффективности каналов, слабая узнаваемость бренда, невозможность масштабирования роста без системного подхода.',
        laptopImage: '/legacy/img/cases/template-marketing/channels-mosaic.png'
      },
      solution: {
        text: 'Разработали стратегию "360°": провели аудит и исследование, создали интегрированную стратегию для всех каналов (SMM, контент, email, SEO, партнерства), разработали контент-план и визуальный стиль бренда, настроили воронки с автоматизацией и сквозную аналитику для отслеживания эффективности.',
        phoneImage: '/legacy/img/cases/template-marketing/content-showcase.png'
      }
    },
    gallery: [
      '/legacy/img/cases/template-marketing/journey-map.png',
      '/legacy/img/cases/template-marketing/content-examples.png',
      '/legacy/img/cases/template-marketing/results-dashboard.png'
    ],
    metrics: {
      days: 180,
      channels: 8,
      trafficGrowth: 250,
      socialGrowth: 400,
      emailGrowth: 320,
      conversionIncrease: 180,
      salesGrowth: 45,
      costReduction: 35,
      brandAwareness: 320,
      roi: 285,
      engagementRate: 8.5
    },
    isPublished: false
  },
  {
    slug: 'template-seo',
    title: 'SEO Growth Map | Продвижение сайта',
    summary: 'Комплексное SEO-продвижение с фокусом на результаты. Рост органического трафика на 320%, 150 запросов в ТОП-10, 85 запросов в ТОП-3, ROI 580%.',
    category: 'seo',
    isTemplate: true,
    tools: ['Google Search Console', 'Яндекс.Вебмастер', 'Ahrefs', 'Screaming Frog', 'Schema.org', 'Core Web Vitals', 'GTmetrix', 'PageSpeed Insights'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: `
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🔍 Контекст</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 2rem;">
          Сайт компании находился в низких позициях поисковой выдачи, органический трафик был минимальным, а большая часть заявок приходила из платной рекламы. При этом потенциал для органического роста был значительным - ниша не перенасыщена, а сайт имел хорошую основу.
        </p>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">📉 Начальная ситуация</h2>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li>Только 5 запросов в ТОП-10, органический трафик 1,200 посещений/месяц</li>
          <li>Технические ошибки: дубли контента, битые ссылки, медленная загрузка (PageSpeed 42)</li>
          <li>Слабая структура контента: недостаточно оптимизированных страниц</li>
          <li>Отсутствие структурированных данных Schema.org</li>
          <li>Минимальная ссылочная база - всего 15 качественных ссылок</li>
          <li>Неоптимизированные мета-теги и заголовки H1-H6</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🛠 Этапы работы</h2>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #06ffa5;">1. Технический аудит и оптимизация</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Исправили все технические ошибки: убрали дубли контента, исправили битые ссылки, оптимизировали скорость загрузки до PageSpeed 92. Улучшили Core Web Vitals - все метрики в зеленой зоне. Настроили правильную структуру URL и создали XML-карту сайта.
          </p>
        </div>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #06ffa5;">2. Семантическое ядро и контент</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Провели исследование ключевых слов, собрали семантическое ядро из 500+ запросов. Сгруппировали запросы по тематическим кластерам и создали структуру контента. Написали и оптимизировали 40+ страниц под целевые запросы с учетом поисковых намерений.
          </p>
        </div>
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #06ffa5;">3. Структурированные данные</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Внедрили Schema.org разметку: Organization, BreadcrumbList, FAQPage, Review, LocalBusiness. Это улучшило отображение в поисковой выдаче и повысило CTR на 15% благодаря rich snippets.
          </p>
        </div>
        <div>
          <h3 style="font-size: 1.5rem; font-weight: 400; margin-bottom: 1rem; color: #06ffa5;">4. Внешняя оптимизация</h3>
          <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
            Разработали стратегию наращивания ссылочной массы через качественный контент, гостевые публикации, партнерства и PR. За полгода получили 120 качественных ссылок с авторитетных ресурсов. Настроили локальное SEO для региональных запросов.
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">📈 Динамика роста</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1rem;">
          <strong>Месяц 1-3:</strong> Техническая оптимизация, первые публикации контента. Рост трафика на 45%.
        </p>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 1rem;">
          <strong>Месяц 4-6:</strong> Масштабирование контента, получение первых ссылок. Рост трафика на 180%.
        </p>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); margin-bottom: 2rem;">
          <strong>Месяц 7-12:</strong> Стабилизация позиций, рост авторитета домена. Рост трафика на 320%, выход в ТОП-3 по ключевым запросам.
        </p>
      </div>
      
      <div style="margin-bottom: 4rem;">
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">🎯 Итоговые результаты</h2>
        <ul style="font-size: 1.125rem; line-height: 2; color: rgba(255, 255, 255, 0.9); padding-left: 2rem;">
          <li><strong>Рост органического трафика на 320%</strong> - с 1,200 до 5,040 посещений/месяц</li>
          <li><strong>150 запросов в ТОП-10</strong> (было 5) - рост в 30 раз</li>
          <li><strong>85 запросов в ТОП-3</strong> - по ключевым коммерческим запросам</li>
          <li><strong>Конверсия из трафика выросла на 65%</strong> - улучшение качества трафика</li>
          <li><strong>PageSpeed вырос до 92</strong> - все Core Web Vitals в зеленой зоне</li>
          <li><strong>Снижение стоимости привлечения в 4 раза</strong> - SEO vs контекстная реклама</li>
          <li><strong>ROI SEO-продвижения 580%</strong> за год работы</li>
          <li><strong>120 качественных ссылок</strong> - рост авторитета домена</li>
        </ul>
      </div>
      
      <div>
        <h2 style="font-size: 2rem; font-weight: 300; margin-bottom: 1.5rem; color: #fff;">💡 Долгосрочная стратегия</h2>
        <p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9);">
          SEO - это марафон, а не спринт. За первый год мы заложили прочную основу: техническая оптимизация, качественный контент, структурированные данные. Теперь сайт имеет устойчивые позиции и продолжает расти. Дальнейшая работа направлена на расширение семантики, углубление контента и поддержание актуальности информации. Органический трафик стал стабильным каналом привлечения клиентов с минимальной стоимостью.
        </p>
      </div>
    `,
    contentJson: {
      header: {
        banner: '/legacy/img/cases/template-seo/seo-growth-chart.png',
        title: 'SEO Growth Map',
        subtitle: 'Комплексное SEO-продвижение с фокусом на долгосрочный результат'
      },
      about: {
        text: 'Комплексное SEO-продвижение сайта с повышением позиций в поисковых системах. Мы провели техническую оптимизацию, создали качественный контент, нарастили ссылочную массу и внедрили структурированные данные. Результат: рост органического трафика на 320%, 150 запросов в ТОП-10, ROI 580%.'
      },
      tasks: {
        text: 'Вывести сайт в ТОП поисковых систем по коммерческим запросам и увеличить органический трафик. Проблемы: низкие позиции (только 5 запросов в ТОП-10), технические ошибки (PageSpeed 42), недостаток оптимизированного контента, отсутствие структурированных данных и слабая ссылочная база.',
        laptopImage: '/legacy/img/cases/template-seo/seo-audit-dashboard.png'
      },
      solution: {
        text: 'Провели комплексную работу: технический аудит с оптимизацией до PageSpeed 92, исследование и создание семантического ядра (500+ запросов), оптимизация 40+ страниц, внедрение Schema.org разметки и стратегия наращивания ссылочной массы (120 качественных ссылок за год). Настроили мониторинг позиций и аналитику.',
        phoneImage: '/legacy/img/cases/template-seo/rankings-chart.png'
      }
    },
    gallery: [
      '/legacy/img/cases/template-seo/keyword-map.png',
      '/legacy/img/cases/template-seo/traffic-growth.png',
      '/legacy/img/cases/template-seo/pagespeed-improvement.png'
    ],
    metrics: {
      days: 365,
      keywords: 500,
      top10Keywords: 150,
      top3Keywords: 85,
      trafficGrowth: 320,
      pagespeed: 92,
      conversionIncrease: 65,
      costReduction: 75,
      roi: 580,
      backlinks: 120,
      contentPages: 40
    },
    isPublished: false
  }
];

async function addCaseTemplates() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`Начинаем добавление ${templates.length} креативных шаблонов кейсов...\n`);
    
    for (const template of templates) {
      // Проверяем, существует ли уже шаблон
      const existing = await client.query(
        'SELECT slug FROM cases WHERE slug = $1',
        [template.slug]
      );
      
      if (existing.rows.length > 0) {
        console.log(`🔄 Обновляем шаблон: ${template.title}`);
        
        await client.query(
          `UPDATE cases SET
            title = $1,
            summary = $2,
            category = $3,
            tools = $4,
            hero_image_url = $5,
            content_html = $6,
            content_json = $7,
            gallery = $8,
            metrics = $9,
            is_template = $10,
            is_published = $11,
            updated_at = NOW()
          WHERE slug = $12`,
          [
            template.title,
            template.summary,
            template.category,
            JSON.stringify(template.tools),
            template.heroImageUrl,
            template.contentHtml,
            JSON.stringify(template.contentJson),
            JSON.stringify(template.gallery),
            JSON.stringify(template.metrics),
            template.isTemplate,
            template.isPublished,
            template.slug
          ]
        );
      } else {
        console.log(`✅ Добавляем шаблон: ${template.title}`);
        
        await client.query(
          `INSERT INTO cases (
            slug, title, summary, category, tools, hero_image_url,
            content_html, content_json, gallery, metrics, is_template,
            is_published, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
          [
            template.slug,
            template.title,
            template.summary,
            template.category,
            JSON.stringify(template.tools),
            template.heroImageUrl,
            template.contentHtml,
            JSON.stringify(template.contentJson),
            JSON.stringify(template.gallery),
            JSON.stringify(template.metrics),
            template.isTemplate,
            template.isPublished
          ]
        );
      }
    }
    
    await client.query('COMMIT');
    console.log('\n🎉 Все креативные шаблоны успешно добавлены/обновлены!');
    console.log('\n✨ Доступные шаблоны:');
    templates.forEach(t => {
      console.log(`  • ${t.title} (${t.category})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addCaseTemplates()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
