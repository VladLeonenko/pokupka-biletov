// Генератор шаблонов блоков для расширения библиотеки до 1200+

import { BlockLibraryItem } from '@/types/pageBuilder';

// Базовые варианты для генерации
const coverVariants = [
  { name: 'Hero с видео', video: true },
  { name: 'Hero с градиентом', gradient: true },
  { name: 'Hero с параллаксом', parallax: true },
  { name: 'Hero слайдер', slider: true },
  { name: 'Hero с формой', form: true },
  { name: 'Hero минималистичный', minimal: true },
  { name: 'Hero с анимацией', animation: true },
  { name: 'Hero с кнопками', buttons: true },
  { name: 'Hero с таймером', countdown: true },
  { name: 'Hero с отзывами', testimonials: true },
  { name: 'Hero с логотипами', logos: true },
  { name: 'Hero с видеофоном', videoBg: true },
  { name: 'Hero с текстом', text: true },
  { name: 'Hero с изображением', image: true },
  { name: 'Hero с карточками', cards: true },
];

const menuVariants = [
  { name: 'Burger меню', type: 'burger' },
  { name: 'Горизонтальное меню', type: 'horizontal' },
  { name: 'Вертикальное меню', type: 'vertical' },
  { name: 'Sticky меню', type: 'sticky' },
  { name: 'Fixed меню', type: 'fixed' },
  { name: 'Меню с логотипом', type: 'with-logo' },
  { name: 'Меню с поиском', type: 'with-search' },
  { name: 'Меню с кнопкой', type: 'with-button' },
  { name: 'Меню прозрачное', type: 'transparent' },
  { name: 'Меню с иконками', type: 'with-icons' },
];

const contentVariants = [
  { name: 'Текстовый блок', type: 'text' },
  { name: 'Изображение с текстом', type: 'image-text' },
  { name: 'Особенности', type: 'features' },
  { name: 'Команда', type: 'team' },
  { name: 'Цены', type: 'pricing' },
  { name: 'Шаги', type: 'steps' },
  { name: 'FAQ', type: 'faq' },
  { name: 'Таблица', type: 'table' },
  { name: 'Список', type: 'list' },
  { name: 'Цитата', type: 'quote' },
  { name: 'Колонки', type: 'columns' },
  { name: 'Аккордеон', type: 'accordion' },
  { name: 'Вкладки', type: 'tabs' },
  { name: 'Слайдер контента', type: 'content-slider' },
  { name: 'Видео блок', type: 'video' },
  { name: 'Аудио блок', type: 'audio' },
  { name: 'Карта', type: 'map' },
  { name: 'Календарь', type: 'calendar' },
  { name: 'Прогресс бар', type: 'progress' },
  { name: 'Счетчик', type: 'counter' },
  { name: 'Таймлайн', type: 'timeline' },
  { name: 'Процесс', type: 'process' },
  { name: 'Сравнение', type: 'compare' },
  { name: 'Логотипы клиентов', type: 'logos' },
  { name: 'Статистика', type: 'stats' },
  { name: 'Отзывы', type: 'reviews' },
  { name: 'Рекомендации', type: 'testimonials' },
  { name: 'Портфолио', type: 'portfolio' },
  { name: 'Блог список', type: 'blog-list' },
  { name: 'Блог карточка', type: 'blog-card' },
  { name: 'Новости', type: 'news' },
  { name: 'События', type: 'events' },
  { name: 'Вакансии', type: 'jobs' },
  { name: 'Партнеры', type: 'partners' },
  { name: 'Сертификаты', type: 'certificates' },
  { name: 'Награды', type: 'awards' },
  { name: 'История', type: 'history' },
  { name: 'Миссия', type: 'mission' },
  { name: 'Ценности', type: 'values' },
];

const galleryVariants = [
  { name: 'Слайдер', layout: 'slider' },
  { name: 'Сетка', layout: 'grid' },
  { name: 'Masonry', layout: 'masonry' },
  { name: 'Карусель', layout: 'carousel' },
  { name: 'Instagram Feed', layout: 'instagram' },
  { name: 'Lightbox', layout: 'lightbox' },
  { name: 'Сетка 2 колонки', layout: 'grid-2' },
  { name: 'Сетка 3 колонки', layout: 'grid-3' },
  { name: 'Сетка 4 колонки', layout: 'grid-4' },
  { name: 'Сетка 6 колонок', layout: 'grid-6' },
  { name: 'Слайдер с превью', layout: 'slider-thumbs' },
  { name: 'Слайдер вертикальный', layout: 'slider-vertical' },
  { name: 'Слайдер с текстом', layout: 'slider-text' },
  { name: 'Слайдер с навигацией', layout: 'slider-nav' },
  { name: 'Слайдер автоплей', layout: 'slider-autoplay' },
  { name: 'Слайдер фулскрин', layout: 'slider-fullscreen' },
  { name: 'Слайдер с пагинацией', layout: 'slider-pagination' },
  { name: 'Слайдер с эффектами', layout: 'slider-effects' },
  { name: 'Слайдер с видео', layout: 'slider-video' },
  { name: 'Слайдер с формой', layout: 'slider-form' },
  { name: 'Слайдер с таймером', layout: 'slider-countdown' },
  { name: 'Слайдер с отзывами', layout: 'slider-testimonials' },
  { name: 'Слайдер с логотипами', layout: 'slider-logos' },
  { name: 'Слайдер с карточками', layout: 'slider-cards' },
  { name: 'Слайдер с текстом', layout: 'slider-content' },
];

const formVariants = [
  { name: 'Обратный звонок', type: 'callback' },
  { name: 'Заказ', type: 'order' },
  { name: 'Квиз', type: 'quiz' },
  { name: 'Загрузка файла', type: 'file' },
  { name: 'Выбор даты', type: 'date' },
  { name: 'Многошаговая форма', type: 'multi-step' },
  { name: 'Форма подписки', type: 'subscribe' },
  { name: 'Форма обратной связи', type: 'contact' },
  { name: 'Форма регистрации', type: 'register' },
  { name: 'Форма входа', type: 'login' },
  { name: 'Форма восстановления', type: 'reset' },
  { name: 'Форма с капчей', type: 'captcha' },
  { name: 'Форма с валидацией', type: 'validated' },
  { name: 'Форма с файлами', type: 'files' },
  { name: 'Форма с выбором', type: 'select' },
];

const socialVariants = [
  { name: 'Отзывы', type: 'reviews' },
  { name: 'Рекомендации', type: 'testimonials' },
  { name: 'Instagram Feed', type: 'instagram' },
  { name: 'Telegram Widget', type: 'telegram' },
  { name: 'Facebook Feed', type: 'facebook' },
  { name: 'Twitter Feed', type: 'twitter' },
  { name: 'YouTube Feed', type: 'youtube' },
  { name: 'VK Widget', type: 'vk' },
  { name: 'Социальные кнопки', type: 'share' },
  { name: 'Комментарии', type: 'comments' },
  { name: 'Рейтинг', type: 'rating' },
  { name: 'Лайки', type: 'likes' },
];

const featuresVariants = [
  { name: 'Карточки', type: 'cards' },
  { name: 'Числа', type: 'numbers' },
  { name: 'Timeline', type: 'timeline' },
  { name: 'Процесс', type: 'process' },
  { name: 'Сравнение', type: 'compare' },
  { name: 'Список', type: 'list' },
  { name: 'Иконки', type: 'icons' },
  { name: 'Изображения', type: 'images' },
  { name: 'Видео', type: 'video' },
  { name: 'Анимация', type: 'animated' },
  { name: 'Hover эффекты', type: 'hover' },
  { name: 'Сетка 2x2', type: 'grid-2x2' },
  { name: 'Сетка 3x3', type: 'grid-3x3' },
  { name: 'Сетка 4x4', type: 'grid-4x4' },
  { name: 'Вертикальный список', type: 'vertical' },
  { name: 'Горизонтальный список', type: 'horizontal' },
  { name: 'С аккордеоном', type: 'accordion' },
  { name: 'С вкладками', type: 'tabs' },
  { name: 'С прогрессом', type: 'progress' },
  { name: 'С счетчиком', type: 'counter' },
  { name: 'С таймлайном', type: 'timeline' },
  { name: 'С процессом', type: 'process' },
  { name: 'С сравнением', type: 'compare' },
  { name: 'С отзывами', type: 'reviews' },
  { name: 'С логотипами', type: 'logos' },
  { name: 'С картами', type: 'maps' },
  { name: 'С видео', type: 'video' },
  { name: 'С анимацией', type: 'animation' },
  { name: 'С эффектами', type: 'effects' },
  { name: 'С градиентами', type: 'gradients' },
];

const ctaVariants = [
  { name: 'Кнопка', type: 'button' },
  { name: 'Баннер', type: 'banner' },
  { name: 'Popup', type: 'popup' },
  { name: 'Таймер', type: 'countdown' },
  { name: 'Форма', type: 'form' },
  { name: 'Видео', type: 'video' },
  { name: 'Изображение', type: 'image' },
  { name: 'Текст', type: 'text' },
  { name: 'С иконкой', type: 'with-icon' },
  { name: 'С градиентом', type: 'gradient' },
  { name: 'С анимацией', type: 'animated' },
  { name: 'С эффектами', type: 'effects' },
  { name: 'С таймером', type: 'timer' },
  { name: 'С формой', type: 'with-form' },
  { name: 'С видео', type: 'with-video' },
  { name: 'С изображением', type: 'with-image' },
  { name: 'С текстом', type: 'with-text' },
  { name: 'С кнопками', type: 'with-buttons' },
];

// Генератор блоков
function generateBlock(
  id: string,
  name: string,
  category: string,
  icon: string,
  tags: string[],
  blockData: any
): BlockLibraryItem {
  return {
    id,
    name,
    category,
    icon,
    thumbnail: '',
    tags,
    block: blockData,
  };
}

// Генерация всех блоков
export function generateAllBlockTemplates(): BlockLibraryItem[] {
  const templates: BlockLibraryItem[] = [];

  // COVER (Hero) - 15 стилей
  coverVariants.forEach((variant, index) => {
    templates.push(generateBlock(
      `cover-generated-${index + 1}`,
      variant.name,
      'cover',
      '📱',
      ['hero', 'cover', ...Object.keys(variant).filter(k => k !== 'name')],
      {
        type: 'cover',
        name: variant.name,
        category: 'cover',
        content: {
          title: 'Заголовок',
          subtitle: 'Подзаголовок',
          buttonText: 'Начать',
          ...(variant.video && { videoUrl: '' }),
          ...(variant.gradient && { gradient: true }),
          ...(variant.parallax && { parallax: true }),
          ...(variant.slider && { slides: [] }),
        },
        styles: {
          backgroundColor: variant.gradient ? undefined : '#000',
          backgroundImage: variant.gradient ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
          color: '#fff',
          padding: { top: 100, bottom: 100 },
        },
      }
    ));
  });

  // MENU - 10 вариантов
  menuVariants.forEach((variant, index) => {
    templates.push(generateBlock(
      `menu-generated-${index + 1}`,
      variant.name,
      'menu',
      '🍔',
      ['menu', 'navigation', variant.type],
      {
        type: 'menu',
        name: variant.name,
        category: 'menu',
        content: {
          items: [
            { label: 'Главная', url: '/' },
            { label: 'О нас', url: '/about' },
            { label: 'Контакты', url: '/contacts' },
          ],
          type: variant.type,
        },
        styles: {
          ...(variant.type === 'sticky' || variant.type === 'fixed' ? { position: 'fixed', top: 0, zIndex: 1000 } : {}),
        },
      }
    ));
  });

  // CONTENT - 40+ блоков
  contentVariants.forEach((variant, index) => {
    templates.push(generateBlock(
      `content-generated-${index + 1}`,
      variant.name,
      'content',
      '✍️',
      ['content', variant.type],
      {
        type: 'content',
        name: variant.name,
        category: 'content',
        content: {
          ...(variant.type === 'text' && { text: 'Введите ваш текст...' }),
          ...(variant.type === 'image-text' && { imageUrl: '', text: 'Описание' }),
          ...(variant.type === 'features' && { items: [] }),
          ...(variant.type === 'team' && { items: [] }),
          ...(variant.type === 'pricing' && { plans: [] }),
          ...(variant.type === 'steps' && { steps: [] }),
          ...(variant.type === 'faq' && { items: [] }),
        },
        styles: {
          padding: { top: 40, bottom: 40 },
        },
      }
    ));
  });

  // GALLERY - 25 стилей
  galleryVariants.forEach((variant, index) => {
    templates.push(generateBlock(
      `gallery-generated-${index + 1}`,
      variant.name,
      'gallery',
      '🖼️',
      ['gallery', variant.layout],
      {
        type: 'gallery',
        name: variant.name,
        category: 'gallery',
        content: {
          images: [],
          layout: variant.layout,
        },
      }
    ));
  });

  // FORMS - 15 форм
  formVariants.forEach((variant, index) => {
    templates.push(generateBlock(
      `form-generated-${index + 1}`,
      variant.name,
      'forms',
      '📝',
      ['form', variant.type],
      {
        type: 'forms',
        name: variant.name,
        category: 'forms',
        content: {
          fields: [],
          type: variant.type,
        },
      }
    ));
  });

  // SOCIAL - 12 блоков
  socialVariants.forEach((variant, index) => {
    templates.push(generateBlock(
      `social-generated-${index + 1}`,
      variant.name,
      'social',
      '⭐',
      ['social', variant.type],
      {
        type: 'social',
        name: variant.name,
        category: 'social',
        content: {
          type: variant.type,
        },
      }
    ));
  });

  // FEATURES - 30+ блоков
  featuresVariants.forEach((variant, index) => {
    templates.push(generateBlock(
      `features-generated-${index + 1}`,
      variant.name,
      'features',
      '⚡',
      ['features', variant.type],
      {
        type: 'features',
        name: variant.name,
        category: 'features',
        content: {
          items: [],
          type: variant.type,
        },
      }
    ));
  });

  // CTA - 18 блоков
  ctaVariants.forEach((variant, index) => {
    templates.push(generateBlock(
      `cta-generated-${index + 1}`,
      variant.name,
      'cta',
      '🎯',
      ['cta', variant.type],
      {
        type: 'cta',
        name: variant.name,
        category: 'cta',
        content: {
          title: 'Заголовок',
          text: 'Текст',
          buttonText: 'Действие',
          linkUrl: '#',
        },
        styles: {
          backgroundColor: '#1976d2',
          color: '#fff',
          borderRadius: 4,
          padding: { top: 40, bottom: 40 },
        },
      }
    ));
  });

  return templates;
}
