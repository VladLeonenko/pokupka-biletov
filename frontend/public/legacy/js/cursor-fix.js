// Фикс курсора для всех страниц
(function() {
  'use strict';
  
  // Устанавливаем стандартный курсор для body
  if (document.body) {
    document.body.style.cursor = 'default';
  }
  
  // Функция для установки правильных курсоров
  function fixCursors() {
    // Элементы с pointer cursor
    const pointerElements = document.querySelectorAll(
      'a, button, [role="button"], .cursor-pointer, ' +
      '.MuiIconButton-root, .MuiButton-root, .portfolio-card, ' +
      '[onclick], .filter, .tabs__caption'
    );
    
    pointerElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.cursor = 'pointer';
      }
    });
    
    // Элементы с text cursor
    const textElements = document.querySelectorAll(
      'input, textarea, select, [contenteditable="true"]'
    );
    
    textElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.cursor = 'text';
      }
    });
  }
  
  // Применяем при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixCursors);
  } else {
    fixCursors();
  }
  
  // Применяем при изменениях DOM
  const observer = new MutationObserver(() => {
    fixCursors();
  });
  
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Повторяем через небольшие интервалы для React
  setTimeout(fixCursors, 500);
  setTimeout(fixCursors, 1000);
  setTimeout(fixCursors, 2000);
})();

