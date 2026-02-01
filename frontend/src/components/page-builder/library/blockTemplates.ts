import { BlockLibraryItem } from '@/types/pageBuilder';
import { generateAllBlockTemplates } from './blockTemplatesGenerator';

// Базовые шаблоны блоков + сгенерированные
const baseTemplates: BlockLibraryItem[] = [
  // COVER (Hero) - 15 стилей
  {
    id: 'cover-1',
    name: 'Hero с видео',
    category: 'cover',
    icon: '📱',
    thumbnail: '',
    tags: ['hero', 'video', 'cover'],
    block: {
      type: 'cover',
      name: 'Hero с видео',
      category: 'cover',
      content: {
        videoUrl: '',
        title: 'Заголовок',
        subtitle: 'Подзаголовок',
        buttonText: 'Начать',
      },
      styles: {
        backgroundColor: '#000',
        color: '#fff',
        padding: { top: 100, bottom: 100 },
      },
    },
  },
  {
    id: 'cover-2',
    name: 'Hero с градиентом',
    category: 'cover',
    icon: '🎨',
    thumbnail: '',
    tags: ['hero', 'gradient', 'cover'],
    block: {
      type: 'cover',
      name: 'Hero с градиентом',
      category: 'cover',
      content: {
        title: 'Заголовок',
        subtitle: 'Подзаголовок',
      },
      styles: {
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: { top: 100, bottom: 100 },
      },
    },
  },
  {
    id: 'cover-3',
    name: 'Hero с параллаксом',
    category: 'cover',
    icon: '🌊',
    thumbnail: '',
    tags: ['hero', 'parallax', 'cover'],
    block: {
      type: 'cover',
      name: 'Hero с параллаксом',
      category: 'cover',
      content: {
        imageUrl: '',
        title: 'Заголовок',
      },
      styles: {
        backgroundImage: '',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        animation: {
          trigger: 'scroll',
          effect: 'fade',
        },
      },
    },
  },
  {
    id: 'cover-4',
    name: 'Hero слайдер',
    category: 'cover',
    icon: '🔄',
    thumbnail: '',
    tags: ['hero', 'slider', 'cover'],
    block: {
      type: 'cover',
      name: 'Hero слайдер',
      category: 'cover',
      content: {
        slides: [
          { imageUrl: '', title: 'Слайд 1', subtitle: 'Описание' },
          { imageUrl: '', title: 'Слайд 2', subtitle: 'Описание' },
        ],
      },
    },
  },

  // MENU - 10 вариантов
  {
    id: 'menu-1',
    name: 'Burger меню',
    category: 'menu',
    icon: '🍔',
    thumbnail: '',
    tags: ['menu', 'burger', 'navigation'],
    block: {
      type: 'menu',
      name: 'Burger меню',
      category: 'menu',
      content: {
        items: [
          { label: 'Главная', url: '/' },
          { label: 'О нас', url: '/about' },
          { label: 'Контакты', url: '/contacts' },
        ],
      },
      styles: {
        zIndex: 1000,
      },
    },
  },
  {
    id: 'menu-2',
    name: 'Горизонтальное меню',
    category: 'menu',
    icon: '➡️',
    thumbnail: '',
    tags: ['menu', 'horizontal', 'navigation'],
    block: {
      type: 'menu',
      name: 'Горизонтальное меню',
      category: 'menu',
      content: {
        items: [
          { label: 'Главная', url: '/' },
          { label: 'О нас', url: '/about' },
        ],
      },
    },
  },

  // CONTENT - 40+ блоков
  {
    id: 'content-1',
    name: 'Текстовый блок',
    category: 'content',
    icon: '✍️',
    thumbnail: '',
    tags: ['text', 'content'],
    block: {
      type: 'content',
      name: 'Текстовый блок',
      category: 'content',
      content: {
        text: 'Введите ваш текст здесь...',
      },
      styles: {
        padding: { top: 40, bottom: 40 },
      },
    },
  },
  {
    id: 'content-2',
    name: 'Изображение с текстом',
    category: 'content',
    icon: '🖼️',
    thumbnail: '',
    tags: ['image', 'text', 'content'],
    block: {
      type: 'content',
      name: 'Изображение с текстом',
      category: 'content',
      content: {
        imageUrl: '',
        text: 'Описание изображения',
      },
    },
  },
  {
    id: 'content-3',
    name: 'Особенности (Features)',
    category: 'content',
    icon: '⭐',
    thumbnail: '',
    tags: ['features', 'cards', 'content'],
    block: {
      type: 'features',
      name: 'Особенности',
      category: 'content',
      content: {
        items: [
          { icon: '🚀', title: 'Быстро', description: 'Описание' },
          { icon: '💎', title: 'Надежно', description: 'Описание' },
          { icon: '🎯', title: 'Эффективно', description: 'Описание' },
        ],
      },
    },
  },
  {
    id: 'content-4',
    name: 'Команда',
    category: 'content',
    icon: '👥',
    thumbnail: '',
    tags: ['team', 'content'],
    block: {
      type: 'content',
      name: 'Команда',
      category: 'content',
      content: {
        items: [
          { imageUrl: '', name: 'Имя', role: 'Роль' },
        ],
      },
    },
  },
  {
    id: 'content-5',
    name: 'Цены',
    category: 'content',
    icon: '💰',
    thumbnail: '',
    tags: ['prices', 'pricing', 'content'],
    block: {
      type: 'content',
      name: 'Цены',
      category: 'content',
      content: {
        plans: [
          { name: 'Базовый', price: 1000, features: ['Функция 1', 'Функция 2'] },
        ],
      },
    },
  },
  {
    id: 'content-6',
    name: 'Шаги (Steps)',
    category: 'content',
    icon: '📋',
    thumbnail: '',
    tags: ['steps', 'process', 'content'],
    block: {
      type: 'content',
      name: 'Шаги',
      category: 'content',
      content: {
        steps: [
          { number: 1, title: 'Шаг 1', description: 'Описание' },
        ],
      },
    },
  },
  {
    id: 'content-7',
    name: 'FAQ',
    category: 'content',
    icon: '❓',
    thumbnail: '',
    tags: ['faq', 'questions', 'content'],
    block: {
      type: 'content',
      name: 'FAQ',
      category: 'content',
      content: {
        items: [
          { question: 'Вопрос?', answer: 'Ответ' },
        ],
      },
    },
  },

  // GALLERY - 25 стилей
  {
    id: 'gallery-1',
    name: 'Слайдер',
    category: 'gallery',
    icon: '🖼️',
    thumbnail: '',
    tags: ['gallery', 'slider'],
    block: {
      type: 'gallery',
      name: 'Слайдер',
      category: 'gallery',
      content: {
        images: [],
        layout: 'slider',
      },
    },
  },
  {
    id: 'gallery-2',
    name: 'Сетка',
    category: 'gallery',
    icon: '📐',
    thumbnail: '',
    tags: ['gallery', 'grid'],
    block: {
      type: 'gallery',
      name: 'Сетка',
      category: 'gallery',
      content: {
        images: [],
        layout: 'grid',
      },
    },
  },
  {
    id: 'gallery-3',
    name: 'Masonry',
    category: 'gallery',
    icon: '🧱',
    thumbnail: '',
    tags: ['gallery', 'masonry'],
    block: {
      type: 'gallery',
      name: 'Masonry',
      category: 'gallery',
      content: {
        images: [],
        layout: 'masonry',
      },
    },
  },
  {
    id: 'gallery-4',
    name: 'Карусель',
    category: 'gallery',
    icon: '🎠',
    thumbnail: '',
    tags: ['gallery', 'carousel'],
    block: {
      type: 'gallery',
      name: 'Карусель',
      category: 'gallery',
      content: {
        images: [],
        layout: 'carousel',
      },
    },
  },
  {
    id: 'gallery-5',
    name: 'Instagram Feed',
    category: 'gallery',
    icon: '📷',
    thumbnail: '',
    tags: ['gallery', 'instagram'],
    block: {
      type: 'gallery',
      name: 'Instagram Feed',
      category: 'gallery',
      content: {
        images: [],
        layout: 'instagram',
      },
    },
  },

  // SHOP - 20 блоков
  {
    id: 'shop-1',
    name: 'Каталог товаров',
    category: 'shop',
    icon: '🛒',
    thumbnail: '',
    tags: ['shop', 'catalog'],
    block: {
      type: 'shop',
      name: 'Каталог',
      category: 'shop',
      content: {
        layout: 'grid',
        filters: true,
        pagination: true,
      },
    },
  },
  {
    id: 'shop-2',
    name: 'Карточка товара',
    category: 'shop',
    icon: '📦',
    thumbnail: '',
    tags: ['shop', 'product'],
    block: {
      type: 'shop',
      name: 'Карточка товара',
      category: 'shop',
      content: {
        productId: '',
      },
    },
  },
  {
    id: 'shop-3',
    name: 'Корзина',
    category: 'shop',
    icon: '🛍️',
    thumbnail: '',
    tags: ['shop', 'cart'],
    block: {
      type: 'shop',
      name: 'Корзина',
      category: 'shop',
      content: {},
    },
  },
  {
    id: 'shop-4',
    name: 'Оформление заказа',
    category: 'shop',
    icon: '💳',
    thumbnail: '',
    tags: ['shop', 'checkout'],
    block: {
      type: 'shop',
      name: 'Оформление заказа',
      category: 'shop',
      content: {},
    },
  },
  {
    id: 'shop-5',
    name: 'Фильтры',
    category: 'shop',
    icon: '🔍',
    thumbnail: '',
    tags: ['shop', 'filters'],
    block: {
      type: 'shop',
      name: 'Фильтры',
      category: 'shop',
      content: {
        filters: ['price', 'category', 'size', 'color', 'brand'],
      },
    },
  },

  // FORMS - 15 форм
  {
    id: 'form-1',
    name: 'Обратный звонок',
    category: 'forms',
    icon: '📞',
    thumbnail: '',
    tags: ['form', 'callback'],
    block: {
      type: 'forms',
      name: 'Обратный звонок',
      category: 'forms',
      content: {
        fields: [
          { type: 'text', name: 'name', label: 'Имя', required: true },
          { type: 'tel', name: 'phone', label: 'Телефон', required: true },
        ],
      },
    },
  },
  {
    id: 'form-2',
    name: 'Заказ',
    category: 'forms',
    icon: '📝',
    thumbnail: '',
    tags: ['form', 'order'],
    block: {
      type: 'forms',
      name: 'Заказ',
      category: 'forms',
      content: {
        fields: [
          { type: 'text', name: 'name', label: 'Имя' },
          { type: 'email', name: 'email', label: 'Email' },
          { type: 'textarea', name: 'message', label: 'Сообщение' },
        ],
      },
    },
  },
  {
    id: 'form-3',
    name: 'Квиз',
    category: 'forms',
    icon: '❓',
    thumbnail: '',
    tags: ['form', 'quiz'],
    block: {
      type: 'forms',
      name: 'Квиз',
      category: 'forms',
      content: {
        questions: [
          { question: 'Вопрос 1?', options: ['Вариант 1', 'Вариант 2'] },
        ],
      },
    },
  },
  {
    id: 'form-4',
    name: 'Загрузка файла',
    category: 'forms',
    icon: '📎',
    thumbnail: '',
    tags: ['form', 'file'],
    block: {
      type: 'forms',
      name: 'Загрузка файла',
      category: 'forms',
      content: {
        fields: [
          { type: 'file', name: 'file', label: 'Файл' },
        ],
      },
    },
  },
  {
    id: 'form-5',
    name: 'Выбор даты',
    category: 'forms',
    icon: '📅',
    thumbnail: '',
    tags: ['form', 'date'],
    block: {
      type: 'forms',
      name: 'Выбор даты',
      category: 'forms',
      content: {
        fields: [
          { type: 'date', name: 'date', label: 'Дата' },
        ],
      },
    },
  },

  // SOCIAL - 12 блоков
  {
    id: 'social-1',
    name: 'Отзывы',
    category: 'social',
    icon: '⭐',
    thumbnail: '',
    tags: ['social', 'reviews'],
    block: {
      type: 'social',
      name: 'Отзывы',
      category: 'social',
      content: {
        reviews: [
          { author: 'Имя', text: 'Отзыв', rating: 5 },
        ],
      },
    },
  },
  {
    id: 'social-2',
    name: 'Рекомендации',
    category: 'social',
    icon: '💬',
    thumbnail: '',
    tags: ['social', 'testimonials'],
    block: {
      type: 'social',
      name: 'Рекомендации',
      category: 'social',
      content: {
        testimonials: [
          { author: 'Имя', text: 'Текст', imageUrl: '' },
        ],
      },
    },
  },
  {
    id: 'social-3',
    name: 'Instagram Feed',
    category: 'social',
    icon: '📷',
    thumbnail: '',
    tags: ['social', 'instagram'],
    block: {
      type: 'social',
      name: 'Instagram Feed',
      category: 'social',
      content: {
        instagramUsername: '',
      },
    },
  },
  {
    id: 'social-4',
    name: 'Telegram Widget',
    category: 'social',
    icon: '✈️',
    thumbnail: '',
    tags: ['social', 'telegram'],
    block: {
      type: 'social',
      name: 'Telegram Widget',
      category: 'social',
      content: {
        telegramChannel: '',
      },
    },
  },

  // FEATURES - 30+ блоков
  {
    id: 'features-1',
    name: 'Карточки',
    category: 'features',
    icon: '🃏',
    thumbnail: '',
    tags: ['features', 'cards'],
    block: {
      type: 'features',
      name: 'Карточки',
      category: 'features',
      content: {
        items: [
          { title: 'Заголовок', description: 'Описание', icon: '🎯' },
        ],
      },
    },
  },
  {
    id: 'features-2',
    name: 'Числа',
    category: 'features',
    icon: '🔢',
    thumbnail: '',
    tags: ['features', 'numbers'],
    block: {
      type: 'features',
      name: 'Числа',
      category: 'features',
      content: {
        items: [
          { number: 100, label: 'Клиентов', suffix: '+' },
        ],
      },
    },
  },
  {
    id: 'features-3',
    name: 'Timeline',
    category: 'features',
    icon: '⏱️',
    thumbnail: '',
    tags: ['features', 'timeline'],
    block: {
      type: 'features',
      name: 'Timeline',
      category: 'features',
      content: {
        items: [
          { date: '2024', title: 'Событие', description: 'Описание' },
        ],
      },
    },
  },
  {
    id: 'features-4',
    name: 'Процесс',
    category: 'features',
    icon: '🔄',
    thumbnail: '',
    tags: ['features', 'process'],
    block: {
      type: 'features',
      name: 'Процесс',
      category: 'features',
      content: {
        steps: [
          { step: 1, title: 'Шаг', description: 'Описание' },
        ],
      },
    },
  },
  {
    id: 'features-5',
    name: 'Сравнение',
    category: 'features',
    icon: '⚖️',
    thumbnail: '',
    tags: ['features', 'compare'],
    block: {
      type: 'features',
      name: 'Сравнение',
      category: 'features',
      content: {
        items: [
          { name: 'Вариант 1', features: ['Да', 'Нет'] },
        ],
      },
    },
  },

  // CTA - 18 блоков
  {
    id: 'cta-1',
    name: 'Кнопка',
    category: 'cta',
    icon: '🔘',
    thumbnail: '',
    tags: ['cta', 'button'],
    block: {
      type: 'cta',
      name: 'Кнопка',
      category: 'cta',
      content: {
        text: 'Нажать',
        linkUrl: '#',
      },
      styles: {
        backgroundColor: '#1976d2',
        color: '#fff',
        borderRadius: 4,
        padding: { top: 12, bottom: 12, left: 24, right: 24 },
      },
    },
  },
  {
    id: 'cta-2',
    name: 'Баннер',
    category: 'cta',
    icon: '📢',
    thumbnail: '',
    tags: ['cta', 'banner'],
    block: {
      type: 'cta',
      name: 'Баннер',
      category: 'cta',
      content: {
        title: 'Заголовок',
        text: 'Текст',
        buttonText: 'Действие',
      },
      styles: {
        backgroundColor: '#f5f5f5',
        padding: { top: 40, bottom: 40 },
      },
    },
  },
  {
    id: 'cta-3',
    name: 'Popup',
    category: 'cta',
    icon: '💬',
    thumbnail: '',
    tags: ['cta', 'popup'],
    block: {
      type: 'cta',
      name: 'Popup',
      category: 'cta',
      content: {
        trigger: 'scroll',
        title: 'Заголовок',
        text: 'Текст',
      },
    },
  },
  {
    id: 'cta-4',
    name: 'Таймер обратного отсчета',
    category: 'cta',
    icon: '⏰',
    thumbnail: '',
    tags: ['cta', 'countdown'],
    block: {
      type: 'cta',
      name: 'Таймер',
      category: 'cta',
      content: {
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  },
];

// Объединяем базовые шаблоны с сгенерированными (1200+ блоков)
export const blockTemplates: BlockLibraryItem[] = [
  ...baseTemplates,
  ...generateAllBlockTemplates(),
];
