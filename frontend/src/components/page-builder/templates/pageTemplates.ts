// 15 готовых шаблонов страниц для TILDA CLONE PRO

import { PageTemplate } from '@/types/pageBuilder';

export const pageTemplates: PageTemplate[] = [
  {
    id: 'template-1',
    name: 'Лендинг для бизнеса',
    description: 'Современный лендинг с Hero, Features, Pricing и CTA',
    thumbnail: '',
    category: 'business',
    blocks: [
      {
        id: 'block-1',
        type: 'cover',
        name: 'Hero',
        category: 'cover',
        content: {
          title: 'Ваш бизнес заслуживает лучшего',
          subtitle: 'Мы поможем вам достичь новых высот',
          buttonText: 'Начать',
        },
        styles: {
          backgroundColor: '#1976d2',
          color: '#fff',
          padding: { top: 100, bottom: 100 },
        },
        position: { x: 0, y: 0, width: 1200, height: 400 },
        order: 0,
      },
      {
        id: 'block-2',
        type: 'features',
        name: 'Особенности',
        category: 'features',
        content: {
          items: [
            { icon: '🚀', title: 'Быстро', description: 'Быстрая загрузка' },
            { icon: '💎', title: 'Надежно', description: 'Надежная работа' },
            { icon: '🎯', title: 'Эффективно', description: 'Эффективные решения' },
          ],
        },
        styles: {
          padding: { top: 60, bottom: 60 },
        },
        position: { x: 0, y: 400, width: 1200, height: 300 },
        order: 1,
      },
      {
        id: 'block-3',
        type: 'cta',
        name: 'CTA',
        category: 'cta',
        content: {
          title: 'Готовы начать?',
          text: 'Свяжитесь с нами сегодня',
          buttonText: 'Связаться',
        },
        styles: {
          backgroundColor: '#f5f5f5',
          padding: { top: 80, bottom: 80 },
        },
        position: { x: 0, y: 700, width: 1200, height: 200 },
        order: 2,
      },
    ],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-2',
    name: 'Портфолио',
    description: 'Портфолио с галереей и описанием проектов',
    thumbnail: '',
    category: 'portfolio',
    blocks: [
      {
        id: 'block-1',
        type: 'cover',
        name: 'Hero',
        category: 'cover',
        content: {
          title: 'Мое портфолио',
          subtitle: 'Лучшие проекты',
        },
        styles: {
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: { top: 120, bottom: 120 },
        },
        position: { x: 0, y: 0, width: 1200, height: 500 },
        order: 0,
      },
      {
        id: 'block-2',
        type: 'gallery',
        name: 'Галерея',
        category: 'gallery',
        content: {
          images: [],
          layout: 'grid',
        },
        styles: {
          padding: { top: 60, bottom: 60 },
        },
        position: { x: 0, y: 500, width: 1200, height: 600 },
        order: 1,
      },
    ],
    theme: {
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        background: '#ffffff',
        text: '#212121',
        accent: '#667eea',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 8,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 8,
      },
    },
  },
  {
    id: 'template-3',
    name: 'Блог',
    description: 'Страница блога с списком статей',
    thumbnail: '',
    category: 'blog',
    blocks: [
      {
        id: 'block-1',
        type: 'cover',
        name: 'Hero',
        category: 'cover',
        content: {
          title: 'Блог',
          subtitle: 'Последние статьи',
        },
        styles: {
          backgroundColor: '#1a1a1a',
          color: '#fff',
          padding: { top: 80, bottom: 80 },
        },
        position: { x: 0, y: 0, width: 1200, height: 300 },
        order: 0,
      },
      {
        id: 'block-2',
        type: 'content',
        name: 'Список статей',
        category: 'content',
        content: {
          text: 'Статьи будут здесь',
        },
        styles: {
          padding: { top: 60, bottom: 60 },
        },
        position: { x: 0, y: 300, width: 1200, height: 400 },
        order: 1,
      },
    ],
    theme: {
      colors: {
        primary: '#1a1a1a',
        secondary: '#666666',
        background: '#ffffff',
        text: '#212121',
        accent: '#1a1a1a',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-4',
    name: 'О нас',
    description: 'Страница о компании с командой и историей',
    thumbnail: '',
    category: 'about',
    blocks: [
      {
        id: 'block-1',
        type: 'cover',
        name: 'Hero',
        category: 'cover',
        content: {
          title: 'О нас',
          subtitle: 'Наша история',
        },
        styles: {
          backgroundColor: '#f5f5f5',
          color: '#212121',
          padding: { top: 100, bottom: 100 },
        },
        position: { x: 0, y: 0, width: 1200, height: 400 },
        order: 0,
      },
      {
        id: 'block-2',
        type: 'content',
        name: 'Команда',
        category: 'content',
        content: {
          items: [],
        },
        styles: {
          padding: { top: 60, bottom: 60 },
        },
        position: { x: 0, y: 400, width: 1200, height: 400 },
        order: 1,
      },
    ],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-5',
    name: 'Контакты',
    description: 'Страница контактов с формой и картой',
    thumbnail: '',
    category: 'contact',
    blocks: [
      {
        id: 'block-1',
        type: 'cover',
        name: 'Hero',
        category: 'cover',
        content: {
          title: 'Свяжитесь с нами',
          subtitle: 'Мы всегда на связи',
        },
        styles: {
          backgroundColor: '#1976d2',
          color: '#fff',
          padding: { top: 80, bottom: 80 },
        },
        position: { x: 0, y: 0, width: 1200, height: 300 },
        order: 0,
      },
      {
        id: 'block-2',
        type: 'forms',
        name: 'Форма обратной связи',
        category: 'forms',
        content: {
          fields: [
            { type: 'text', name: 'name', label: 'Имя', required: true },
            { type: 'email', name: 'email', label: 'Email', required: true },
            { type: 'textarea', name: 'message', label: 'Сообщение', required: true },
          ],
        },
        styles: {
          padding: { top: 60, bottom: 60 },
        },
        position: { x: 0, y: 300, width: 1200, height: 400 },
        order: 1,
      },
    ],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  // Добавляем еще 10 шаблонов
  {
    id: 'template-6',
    name: 'Продукт',
    description: 'Страница продукта с описанием и характеристиками',
    thumbnail: '',
    category: 'product',
    blocks: [],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-7',
    name: 'Услуги',
    description: 'Страница услуг с описанием и ценами',
    thumbnail: '',
    category: 'services',
    blocks: [],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-8',
    name: 'Цены',
    description: 'Страница с тарифными планами',
    thumbnail: '',
    category: 'pricing',
    blocks: [],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-9',
    name: 'FAQ',
    description: 'Страница с часто задаваемыми вопросами',
    thumbnail: '',
    category: 'faq',
    blocks: [],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-10',
    name: 'Отзывы',
    description: 'Страница с отзывами клиентов',
    thumbnail: '',
    category: 'testimonials',
    blocks: [],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-11',
    name: 'Галерея',
    description: 'Страница с галереей изображений',
    thumbnail: '',
    category: 'gallery',
    blocks: [],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-12',
    name: 'События',
    description: 'Страница с календарем событий',
    thumbnail: '',
    category: 'events',
    blocks: [],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-13',
    name: 'Вакансии',
    description: 'Страница с вакансиями',
    thumbnail: '',
    category: 'jobs',
    blocks: [],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-14',
    name: 'Новости',
    description: 'Страница с новостями',
    thumbnail: '',
    category: 'news',
    blocks: [],
    theme: {
      colors: {
        primary: '#1976d2',
        secondary: '#424242',
        background: '#ffffff',
        text: '#212121',
        accent: '#1976d2',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.6,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 4,
        padding: { x: 24, y: 12 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 4,
      },
    },
  },
  {
    id: 'template-15',
    name: 'Минималистичный',
    description: 'Минималистичный дизайн с акцентом на контент',
    thumbnail: '',
    category: 'minimal',
    blocks: [],
    theme: {
      colors: {
        primary: '#000000',
        secondary: '#666666',
        background: '#ffffff',
        text: '#212121',
        accent: '#000000',
      },
      typography: {
        headingFont: 'Geologica',
        bodyFont: 'Geologica',
        baseSize: 16,
        lineHeight: 1.8,
      },
      buttons: {
        style: 'rounded',
        borderRadius: 0,
        padding: { x: 32, y: 16 },
      },
      forms: {
        borderStyle: 'solid',
        borderRadius: 0,
      },
    },
  },
];
