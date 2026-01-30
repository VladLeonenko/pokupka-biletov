// Конфигурация тулбара и загрузки изображений для React Quill

export const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block', 'link', 'image'],
    ['clean'],
  ],
 
};

// Пример шаблонов страниц для предзагрузки
export const pageTemplates = [
  { name: 'Страница о компании', value: '<h1>О компании</h1><p>Текст о вашей компании...</p>' },
  { name: 'Контакты', value: '<h2>Контактная информация</h2><p>Адрес, телефон, email</p>' },
  { name: 'Пустой шаблон', value: '' }
];
