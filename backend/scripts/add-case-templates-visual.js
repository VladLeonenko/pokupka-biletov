import pool from '../db.js';

/**
 * Визуальные шаблоны кейсов в стиле Pinterest mockups
 * contentJson описывает ВИЗУАЛЬНЫЕ БЛОКИ и композиции, а не просто текст
 */

const templates = [
  {
    slug: 'template-advertising',
    title: 'Campaign Impact Canvas | Контекстная реклама',
    summary: 'Трансформация рекламной стратегии через глубокую аналитику и креативный подход. Результат: 420% ROI, снижение CPA на 45%, рост конверсии в 2.3 раза.',
    category: 'advertising',
    isTemplate: true,
    tools: ['Google Ads', 'Яндекс.Директ', 'Facebook Ads', 'Google Analytics 4', 'Яндекс.Метрика', 'CRM-интеграция'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: '', // Минимум HTML - всё в визуальных блоках
    contentJson: {
      // Hero Section - Split screen с мокапом дашборда
      hero: {
        type: 'split-screen-mockup',
        layout: '50/50',
        left: {
          type: 'text-overlay',
          title: 'Campaign Impact Canvas',
          subtitle: 'Трансформация рекламной стратегии',
          accentColor: '#ffbb00'
        },
        right: {
          type: 'device-mockup',
          device: 'laptop',
          image: '/legacy/img/cases/template-advertising/hero-dashboard-mockup.png',
          showScreen: true
        }
      },
      
      // Метрики - инфографика с большими цифрами
      metricsBlock: {
        type: 'metrics-grid',
        layout: '4-columns',
        style: 'cards-with-icons',
        cards: [
          { value: '420%', label: 'ROI', icon: '📈', color: '#06ffa5' },
          { value: '-45%', label: 'CPA снижение', icon: '💰', color: '#ff6b9d' },
          { value: '2.3x', label: 'Рост конверсии', icon: '🎯', color: '#9d4edd' },
          { value: '+180%', label: 'Рост трафика', icon: '🚀', color: '#ffbb00' }
        ],
        backgroundColor: 'rgba(255, 187, 0, 0.1)'
      },
      
      // Процесс - визуальная timeline
      processBlock: {
        type: 'timeline-visual',
        layout: 'horizontal',
        steps: [
          {
            number: '01',
            title: 'Аудит',
            description: 'Глубокий анализ кампаний',
            visual: '/legacy/img/cases/template-advertising/step-audit.png',
            icon: '🔍'
          },
          {
            number: '02',
            title: 'Сегментация',
            description: '5 ключевых аудиторий',
            visual: '/legacy/img/cases/template-advertising/step-segmentation.png',
            icon: '👥'
          },
          {
            number: '03',
            title: 'Креативы',
            description: '50+ A/B тестов',
            visual: '/legacy/img/cases/template-advertising/step-creatives.png',
            icon: '🎨'
          },
          {
            number: '04',
            title: 'Аналитика',
            description: 'Сквозная интеграция',
            visual: '/legacy/img/cases/template-advertising/step-analytics.png',
            icon: '📊'
          }
        ]
      },
      
      // Креативы - сетка с мокапами объявлений
      creativesBlock: {
        type: 'mockup-grid',
        layout: '3-columns-masonry',
        title: 'Примеры креативов',
        items: [
          {
            type: 'ad-mockup',
            platform: 'Google Ads',
            image: '/legacy/img/cases/template-advertising/creative-google.png',
            dimensions: '728x90'
          },
          {
            type: 'ad-mockup',
            platform: 'Яндекс.Директ',
            image: '/legacy/img/cases/template-advertising/creative-yandex.png',
            dimensions: '240x400'
          },
          {
            type: 'ad-mockup',
            platform: 'Facebook',
            image: '/legacy/img/cases/template-advertising/creative-facebook.png',
            dimensions: '1200x628'
          }
        ]
      },
      
      // График результатов - визуализация до/после
      resultsChart: {
        type: 'comparison-chart',
        layout: 'before-after',
        title: 'Результаты кампаний',
        before: {
          label: 'До',
          color: '#ff6b9d',
          metrics: { ctr: 0.8, conversion: 1.2, cpa: 8500 }
        },
        after: {
          label: 'После',
          color: '#06ffa5',
          metrics: { ctr: 3.2, conversion: 2.76, cpa: 4675 }
        },
        chartType: 'bar-comparison',
        image: '/legacy/img/cases/template-advertising/results-chart.png'
      },
      
      // О проекте - минималистичный текст-блок
      about: {
        type: 'text-block-minimal',
        layout: 'centered',
        text: 'Проект комплексной оптимизации рекламных кампаний с фокусом на аналитику, креативы и автоматизацию. Мы превратили неэффективный рекламный бюджет в мощный инструмент роста бизнеса.'
      },
      
      // Задачи и решение - split screen
      tasksSolution: {
        type: 'split-content',
        layout: 'image-text',
        left: {
          type: 'text',
          title: 'Задачи',
          content: 'Высокая конкуренция за ключевые запросы, неэффективное распределение бюджета, отсутствие сквозной аналитики, низкая конверсия объявлений.',
          accentColor: '#ff6b9d'
        },
        right: {
          type: 'device-mockup',
          device: 'laptop',
          image: '/legacy/img/cases/template-advertising/tasks-dashboard.png'
        }
      },
      
      solutionBlock: {
        type: 'split-content',
        layout: 'text-image',
        left: {
          type: 'device-mockup',
          device: 'phone',
          image: '/legacy/img/cases/template-advertising/solution-mobile.png'
        },
        right: {
          type: 'text',
          title: 'Решение',
          content: 'Глубокий аудит с сегментацией, персонализированные креативы, сквозная аналитика с CRM-интеграцией, автоматизация управления ставками.',
          accentColor: '#06ffa5'
        }
      }
    },
    gallery: [
      '/legacy/img/cases/template-advertising/metrics-infographic.png',
      '/legacy/img/cases/template-advertising/dashboard-full.png',
      '/legacy/img/cases/template-advertising/roi-visualization.png'
    ],
    metrics: {
      days: 90,
      campaigns: 15,
      cpcReduction: 45,
      conversionIncrease: 230,
      trafficGrowth: 180,
      roi: 420
    },
    isPublished: false
  },
  {
    slug: 'template-ai',
    title: 'AI Amplifier Blueprint | AI Boost Team',
    summary: 'Внедрение AI-экосистемы для автоматизации бизнеса. 75% процессов автоматизировано, скорость обработки запросов выросла в 6.7 раз.',
    category: 'ai',
    isTemplate: true,
    tools: ['OpenAI GPT-4', 'LangChain', 'Vector DB', 'Python FastAPI', 'PostgreSQL'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: '',
    contentJson: {
      // Hero - 3D визуализация AI pipeline
      hero: {
        type: 'full-width-visual',
        layout: 'centered-overlay',
        background: '/legacy/img/cases/template-ai/hero-ai-pipeline.png',
        overlay: {
          title: 'AI Amplifier Blueprint',
          subtitle: 'Трансформация бизнеса через искусственный интеллект',
          textColor: '#fff',
          accentColor: '#00d4ff'
        }
      },
      
      // AI Architecture - диаграмма сети
      architectureBlock: {
        type: 'network-diagram',
        layout: 'full-width',
        title: 'AI-архитектура',
        nodes: [
          { id: 'chatbot', label: 'GPT-4 Chatbot', icon: '💬', color: '#00d4ff' },
          { id: 'assistant', label: 'AI Assistant', icon: '🤖', color: '#9d4edd' },
          { id: 'ml', label: 'ML Model', icon: '🧠', color: '#06ffa5' },
          { id: 'vector', label: 'Vector DB', icon: '🔍', color: '#ff6b9d' }
        ],
        connections: [
          { from: 'chatbot', to: 'vector' },
          { from: 'assistant', to: 'ml' },
          { from: 'ml', to: 'vector' }
        ],
        image: '/legacy/img/cases/template-ai/architecture-diagram.png'
      },
      
      // Метрики - tech-style карточки
      metricsBlock: {
        type: 'tech-metrics',
        layout: 'grid-3x2',
        style: 'neon-glow',
        cards: [
          { value: '75%', label: 'Автоматизация', icon: '⚡', color: '#00d4ff' },
          { value: '6.7x', label: 'Скорость', icon: '🚀', color: '#06ffa5' },
          { value: '94%', label: 'Точность', icon: '🎯', color: '#9d4edd' },
          { value: '2000+', label: 'Запросов/день', icon: '📊', color: '#ff6b9d' },
          { value: '85%', label: 'Экономия времени', icon: '⏱️', color: '#ffbb00' },
          { value: '2.4M₽', label: 'Экономия в год', icon: '💰', color: '#06ffa5' }
        ],
        backgroundColor: 'rgba(0, 212, 255, 0.05)'
      },
      
      // Интерфейсы - мультидевайсные мокапы
      interfacesBlock: {
        type: 'multi-device-showcase',
        layout: 'device-group',
        title: 'AI-интерфейсы',
        devices: [
          {
            type: 'laptop',
            image: '/legacy/img/cases/template-ai/dashboard-desktop.png',
            label: 'Dashboard'
          },
          {
            type: 'tablet',
            image: '/legacy/img/cases/template-ai/chatbot-tablet.png',
            label: 'Chatbot'
          },
          {
            type: 'phone',
            image: '/legacy/img/cases/template-ai/app-mobile.png',
            label: 'Mobile App'
          }
        ],
        backgroundGradient: 'linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(157,78,221,0.1) 100%)'
      },
      
      // Результаты - инфографика
      resultsBlock: {
        type: 'infographic-comparison',
        layout: 'before-after-cards',
        title: 'Результаты внедрения',
        before: {
          title: 'До внедрения',
          color: '#ff6b9d',
          items: [
            '15 сотрудников',
            '4-6 часов обработка',
            '80% точность',
            'Ручная классификация'
          ]
        },
        after: {
          title: 'После внедрения',
          color: '#06ffa5',
          items: [
            'Автоматизация 75%',
            '35-50 минут',
            '94% точность AI',
            'Автоматический роутинг'
          ]
        },
        image: '/legacy/img/cases/template-ai/results-infographic.png'
      },
      
      about: {
        type: 'text-block-minimal',
        layout: 'centered',
        text: 'Комплексное внедрение AI-решений для автоматизации бизнес-процессов. Создали экосистему из интеллектуального чат-бота, AI-ассистента и системы прогнозирования.'
      },
      
      tasksSolution: {
        type: 'split-content',
        layout: 'text-image',
        left: {
          type: 'text',
          title: 'Вызов',
          content: 'Обработка 2000+ запросов в день, время ответа 4-6 часов, ручная классификация с ошибками 20%, отсутствие прогнозирования.',
          accentColor: '#ff6b9d'
        },
        right: {
          type: 'visual-diagram',
          image: '/legacy/img/cases/template-ai/problem-visual.png',
          style: 'tech-glow'
        }
      }
    },
    gallery: [
      '/legacy/img/cases/template-ai/pipeline-full.png',
      '/legacy/img/cases/template-ai/automation-stats.png',
      '/legacy/img/cases/template-ai/future-vision.png'
    ],
    metrics: {
      days: 90,
      automations: 75,
      responseTimeReduction: 85,
      accuracy: 94,
      requestsPerDay: 2000
    },
    isPublished: false
  },
  {
    slug: 'template-mobile',
    title: 'App Journey Showcase | Разработка мобильных приложений',
    summary: 'Создание премиального мобильного приложения с нуля. 50,000+ установок, рейтинг 4.8+, конверсия 68%, DAU 35%.',
    category: 'mobile',
    isTemplate: true,
    tools: ['React Native', 'TypeScript', 'Swift', 'Kotlin', 'Figma'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: '',
    contentJson: {
      // Hero - устройства в 3D композиции
      hero: {
        type: 'device-hero',
        layout: '3d-composition',
        devices: [
          { type: 'phone', angle: '-10deg', position: 'left', image: '/legacy/img/cases/template-mobile/hero-phone-1.png' },
          { type: 'phone', angle: '0deg', position: 'center', image: '/legacy/img/cases/template-mobile/hero-phone-2.png' },
          { type: 'phone', angle: '10deg', position: 'right', image: '/legacy/img/cases/template-mobile/hero-phone-3.png' }
        ],
        title: 'App Journey Showcase',
        subtitle: 'От идеи до успешного запуска'
      },
      
      // UI Screens - сетка экранов приложения
      screensBlock: {
        type: 'app-screens-grid',
        layout: 'masonry-4-columns',
        title: 'Экраны приложения',
        screens: [
          { image: '/legacy/img/cases/template-mobile/screen-home.png', label: 'Главная' },
          { image: '/legacy/img/cases/template-mobile/screen-profile.png', label: 'Профиль' },
          { image: '/legacy/img/cases/template-mobile/screen-features.png', label: 'Функции' },
          { image: '/legacy/img/cases/template-mobile/screen-detail.png', label: 'Детали' }
        ]
      },
      
      // Цветовая палитра - визуальный блок
      colorsBlock: {
        type: 'color-palette-showcase',
        layout: 'swatches-grid',
        title: 'Цветовая палитра',
        colors: [
          { hex: '#6366F1', name: 'Primary', usage: 'Основные акценты' },
          { hex: '#8B5CF6', name: 'Secondary', usage: 'Вторичные элементы' },
          { hex: '#EC4899', name: 'Accent', usage: 'Выделение' },
          { hex: '#10B981', name: 'Success', usage: 'Успешные действия' }
        ],
        image: '/legacy/img/cases/template-mobile/color-palette.png'
      },
      
      // Типографика - визуализация шрифтов
      typographyBlock: {
        type: 'typography-showcase',
        layout: 'font-samples',
        title: 'Типографика',
        fonts: [
          { family: 'Inter', weights: ['300', '400', '600', '700'], sample: 'Aa' },
          { family: 'SF Pro Display', weights: ['400', '600'], sample: '123' }
        ],
        image: '/legacy/img/cases/template-mobile/typography.png'
      },
      
      // Метрики - App Store стиль
      metricsBlock: {
        type: 'app-store-metrics',
        layout: 'cards-circular',
        cards: [
          { value: '4.8', label: 'Рейтинг', icon: '⭐', color: '#ffbb00' },
          { value: '50K+', label: 'Установок', icon: '📥', color: '#6366F1' },
          { value: '68%', label: 'Конверсия', icon: '📈', color: '#10B981' },
          { value: '35%', label: 'DAU', icon: '👥', color: '#EC4899' },
          { value: '<1s', label: 'Загрузка', icon: '⚡', color: '#8B5CF6' },
          { value: '0.1%', label: 'Краши', icon: '✅', color: '#06ffa5' }
        ]
      },
      
      // User Flow - визуальная схема
      flowBlock: {
        type: 'user-flow-diagram',
        layout: 'horizontal-flow',
        title: 'User Flow',
        steps: ['Onboarding', 'Registration', 'Main Features', 'Profile', 'Settings'],
        connections: 'arrow-flow',
        image: '/legacy/img/cases/template-mobile/user-flow.png'
      },
      
      // Процесс разработки - timeline с устройствами
      processBlock: {
        type: 'dev-process-timeline',
        layout: 'vertical-devices',
        steps: [
          {
            phase: 'Research',
            devices: ['wireframe'],
            description: 'Исследование и прототипирование'
          },
          {
            phase: 'Design',
            devices: ['figma-mockup'],
            description: 'UI/UX дизайн в Figma'
          },
          {
            phase: 'Development',
            devices: ['code'],
            description: 'Разработка React Native'
          },
          {
            phase: 'Launch',
            devices: ['app-store', 'play-store'],
            description: 'Запуск в магазинах'
          }
        ],
        image: '/legacy/img/cases/template-mobile/process-timeline.png'
      },
      
      about: {
        type: 'text-block-minimal',
        layout: 'centered',
        text: 'Разработка мобильного приложения с нуля для iOS и Android. Премиальный продукт с современным дизайном, высокой производительностью и отличным пользовательским опытом.'
      },
      
      tasksSolution: {
        type: 'split-content',
        layout: 'image-text',
        left: {
          type: 'device-mockup-group',
          devices: [
            { type: 'phone', image: '/legacy/img/cases/template-mobile/task-phone.png' },
            { type: 'tablet', image: '/legacy/img/cases/template-mobile/task-tablet.png' }
          ]
        },
        right: {
          type: 'text',
          title: 'Задачи',
          content: 'Создание приложения с нуля для iOS и Android, современный UI/UX дизайн, высокая производительность, интеграция платежей и push-уведомлений.',
          accentColor: '#6366F1'
        }
      }
    },
    gallery: [
      '/legacy/img/cases/template-mobile/full-screenflow.png',
      '/legacy/img/cases/template-mobile/devices-in-context.png',
      '/legacy/img/cases/template-mobile/app-store-presentation.png'
    ],
    metrics: {
      days: 120,
      features: 25,
      screens: 40,
      loadTime: 0.8,
      rating: 4.8,
      installs: 50000,
      dau: 35
    },
    isPublished: false
  },
  {
    slug: 'template-marketing',
    title: '360° Marketing Panorama | Комплексный маркетинг',
    summary: 'Комплексная маркетинговая стратегия с интеграцией всех каналов. Рост трафика на 250%, увеличение email-базы на 320%, рост продаж на 45%.',
    category: 'marketing',
    isTemplate: true,
    tools: ['SMM', 'Content Marketing', 'Email Marketing', 'Analytics', 'Marketing Automation'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: '',
    contentJson: {
      hero: {
        type: 'panorama-grid',
        layout: 'mosaic-6-tiles',
        title: '360° Marketing Panorama',
        subtitle: 'Комплексная маркетинговая стратегия',
        tiles: [
          { type: 'social', image: '/legacy/img/cases/template-marketing/tile-social.png' },
          { type: 'content', image: '/legacy/img/cases/template-marketing/tile-content.png' },
          { type: 'email', image: '/legacy/img/cases/template-marketing/tile-email.png' },
          { type: 'seo', image: '/legacy/img/cases/template-marketing/tile-seo.png' },
          { type: 'video', image: '/legacy/img/cases/template-marketing/tile-video.png' },
          { type: 'partnerships', image: '/legacy/img/cases/template-marketing/tile-partners.png' }
        ]
      },
      
      channelsBlock: {
        type: 'channel-cards-grid',
        layout: '4-columns',
        title: 'Интеграция каналов',
        channels: [
          { name: 'SMM', icon: '📱', color: '#E1306C', growth: '+400%' },
          { name: 'Content', icon: '📝', color: '#4267B2', growth: '+180%' },
          { name: 'Email', icon: '✉️', color: '#FFA500', growth: '+320%' },
          { name: 'SEO', icon: '🔍', color: '#34A853', growth: '+150%' }
        ]
      },
      
      journeyBlock: {
        type: 'customer-journey-map',
        layout: 'horizontal-stages',
        title: 'Customer Journey Map',
        stages: [
          { stage: 'Awareness', touchpoints: ['Social', 'Content'], color: '#9d4edd' },
          { stage: 'Interest', touchpoints: ['Email', 'Blog'], color: '#6366F1' },
          { stage: 'Consideration', touchpoints: ['Case Studies', 'Reviews'], color: '#EC4899' },
          { stage: 'Purchase', touchpoints: ['Landing', 'CRO'], color: '#10B981' },
          { stage: 'Retention', touchpoints: ['Email', 'Loyalty'], color: '#ffbb00' }
        ],
        image: '/legacy/img/cases/template-marketing/journey-map.png'
      },
      
      metricsBlock: {
        type: 'metrics-dashboard',
        layout: 'kpi-cards',
        cards: [
          { value: '+250%', label: 'Рост трафика', trend: 'up', color: '#10B981' },
          { value: '+320%', label: 'Email база', trend: 'up', color: '#6366F1' },
          { value: '+180%', label: 'Конверсия в лиды', trend: 'up', color: '#EC4899' },
          { value: '+45%', label: 'Рост продаж', trend: 'up', color: '#ffbb00' },
          { value: '3.2x', label: 'Узнаваемость бренда', trend: 'up', color: '#9d4edd' },
          { value: '285%', label: 'ROI', trend: 'up', color: '#06ffa5' }
        ]
      },
      
      contentShowcase: {
        type: 'content-samples-grid',
        layout: 'masonry',
        title: 'Примеры контента',
        items: [
          { type: 'post', image: '/legacy/img/cases/template-marketing/content-post.png' },
          { type: 'infographic', image: '/legacy/img/cases/template-marketing/content-infographic.png' },
          { type: 'video', image: '/legacy/img/cases/template-marketing/content-video.png' },
          { type: 'case-study', image: '/legacy/img/cases/template-marketing/content-case.png' }
        ]
      },
      
      about: {
        type: 'text-block-minimal',
        layout: 'centered',
        text: 'Разработка и реализация комплексной маркетинговой стратегии "360°" с интеграцией всех каналов. Единая экосистема из SMM, контент-маркетинга, email, SEO и партнерств.'
      }
    },
    gallery: [
      '/legacy/img/cases/template-marketing/full-strategy.png',
      '/legacy/img/cases/template-marketing/content-library.png',
      '/legacy/img/cases/template-marketing/results-dashboard.png'
    ],
    metrics: {
      days: 180,
      channels: 8,
      trafficGrowth: 250,
      emailGrowth: 320,
      salesGrowth: 45,
      roi: 285
    },
    isPublished: false
  },
  {
    slug: 'template-seo',
    title: 'SEO Growth Map | Продвижение сайта',
    summary: 'Комплексное SEO-продвижение. Рост органического трафика на 320%, 150 запросов в ТОП-10, 85 запросов в ТОП-3, ROI 580%.',
    category: 'seo',
    isTemplate: true,
    tools: ['Google Search Console', 'Яндекс.Вебмастер', 'Ahrefs', 'Schema.org'],
    heroImageUrl: '/legacy/img/madeo-case-banner.png',
    contentHtml: '',
    contentJson: {
      hero: {
        type: 'chart-hero',
        layout: 'graph-overlay',
        background: '/legacy/img/cases/template-seo/hero-growth-chart.png',
        overlay: {
          title: 'SEO Growth Map',
          subtitle: 'Комплексное SEO-продвижение',
          keyMetric: '+320% трафика'
        }
      },
      
      rankingsBlock: {
        type: 'serp-visualization',
        layout: 'ranking-timeline',
        title: 'Динамика позиций',
        chart: {
          type: 'line-chart-multi',
          lines: [
            { keyword: 'ТОП-10', data: [5, 25, 60, 110, 150], color: '#10B981' },
            { keyword: 'ТОП-3', data: [0, 8, 25, 55, 85], color: '#06ffa5' }
          ],
          periods: ['Месяц 1', 'Месяц 3', 'Месяц 6', 'Месяц 9', 'Месяц 12']
        },
        image: '/legacy/img/cases/template-seo/rankings-chart.png'
      },
      
      trafficBlock: {
        type: 'traffic-growth-visual',
        layout: 'before-after-bars',
        title: 'Рост трафика',
        before: { value: 1200, label: 'До', color: '#ff6b9d' },
        after: { value: 5040, label: 'После', color: '#06ffa5', growth: '+320%' },
        chartImage: '/legacy/img/cases/template-seo/traffic-growth.png'
      },
      
      keywordsBlock: {
        type: 'keyword-map',
        layout: 'cloud-visual',
        title: 'Семантическое ядро',
        total: 500,
        top: ['коммерческие запросы', 'информационные', 'брендовые'],
        image: '/legacy/img/cases/template-seo/keyword-map.png'
      },
      
      technicalBlock: {
        type: 'technical-metrics',
        layout: 'speed-dashboard',
        title: 'Техническая оптимизация',
        metrics: [
          { name: 'PageSpeed', before: 42, after: 92, unit: '', color: '#06ffa5' },
          { name: 'FCP', before: 2.8, after: 0.8, unit: 's', color: '#6366F1' },
          { name: 'LCP', before: 4.2, after: 1.2, unit: 's', color: '#EC4899' },
          { name: 'CLS', before: 0.25, after: 0.05, unit: '', color: '#ffbb00' }
        ],
        image: '/legacy/img/cases/template-seo/technical-dashboard.png'
      },
      
      metricsBlock: {
        type: 'seo-kpi-grid',
        layout: '4-columns',
        cards: [
          { value: '150', label: 'Запросов в ТОП-10', icon: '📈', color: '#10B981' },
          { value: '85', label: 'Запросов в ТОП-3', icon: '🎯', color: '#06ffa5' },
          { value: '+320%', label: 'Рост трафика', icon: '🚀', color: '#6366F1' },
          { value: '580%', label: 'ROI', icon: '💰', color: '#ffbb00' },
          { value: '92', label: 'PageSpeed', icon: '⚡', color: '#EC4899' },
          { value: '120', label: 'Качественных ссылок', icon: '🔗', color: '#9d4edd' }
        ]
      },
      
      about: {
        type: 'text-block-minimal',
        layout: 'centered',
        text: 'Комплексное SEO-продвижение сайта с повышением позиций в поисковых системах. Техническая оптимизация, качественный контент, наращивание ссылочной массы.'
      }
    },
    gallery: [
      '/legacy/img/cases/template-seo/full-seo-dashboard.png',
      '/legacy/img/cases/template-seo/content-optimization.png',
      '/legacy/img/cases/template-seo/link-building-map.png'
    ],
    metrics: {
      days: 365,
      keywords: 500,
      top10Keywords: 150,
      top3Keywords: 85,
      trafficGrowth: 320,
      roi: 580
    },
    isPublished: false
  }
];

async function addCaseTemplates() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`Начинаем добавление ${templates.length} визуальных шаблонов кейсов...\n`);
    
    for (const template of templates) {
      const existing = await client.query(
        'SELECT slug FROM cases WHERE slug = $1',
        [template.slug]
      );
      
      if (existing.rows.length > 0) {
        console.log(`🔄 Обновляем визуальный шаблон: ${template.title}`);
      } else {
        console.log(`✅ Добавляем визуальный шаблон: ${template.title}`);
      }
      
      const params = [
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
      ];
      
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE cases SET
            title = $1, summary = $2, category = $3, tools = $4,
            hero_image_url = $5, content_html = $6, content_json = $7,
            gallery = $8, metrics = $9, is_template = $10,
            is_published = $11, updated_at = NOW()
          WHERE slug = $12`,
          [...params, template.slug]
        );
      } else {
        await client.query(
          `INSERT INTO cases (
            slug, title, summary, category, tools, hero_image_url,
            content_html, content_json, gallery, metrics, is_template,
            is_published, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
          [template.slug, ...params]
        );
      }
    }
    
    await client.query('COMMIT');
    console.log('\n🎨 Все визуальные шаблоны успешно добавлены!');
    console.log('\n✨ Структура contentJson теперь описывает ВИЗУАЛЬНЫЕ БЛОКИ:');
    console.log('  • Layout-ы (split-screen, grid, masonry)');
    console.log('  • Типы визуалов (device-mockups, charts, infographics)');
    console.log('  • Цветовые схемы и типографика');
    console.log('  • Композиции и сетки');
    
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
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
