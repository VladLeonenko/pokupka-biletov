import { useEffect } from 'react';

// Объявление типа для GSAP в window
declare global {
  interface Window {
    gsap?: any;
  }
}

/**
 * Хук для загрузки кастомного курсора (кастомный большой/малый кружок).
 * Активируем его только на нужных публичных React-страницах, чтобы не конфликтовать
 * с legacy-скриптами (app.min.js) на старых страницах.
 */
export function useCursor(currentPath?: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawPath = currentPath ?? window.location.pathname;
    const normalizedPath = rawPath.replace(/\/+$/, '') || '/';

    // Включаем кастомный курсор на всех публичных маршрутах (всё, что не /admin),
    // чтобы поведение было одинаковым на всех страницах продакшена.
    const isAdmin = normalizedPath.startsWith('/admin');
    if (isAdmin) {
      return;
    }

    let animationId: number | null = null;
    let observer: MutationObserver | null = null;
    let cursorLarge: HTMLElement | null = null;
    let cursorSmall: HTMLElement | null = null;
    let gsapScript: HTMLScriptElement | null = null;
    let customStyle: HTMLStyleElement | null = null;
    let handleResize: (() => void) | null = null;
    
    // Обработчики событий, которые нужно будет удалить
    const handleMouseMove = (e: MouseEvent) => {
      if (window.cursorPosition) {
        // Для position: fixed используем clientX/clientY (координаты относительно viewport)
        // Это правильно для элементов с position: fixed
        window.cursorPosition.x = e.clientX;
        window.cursorPosition.y = e.clientY;
        // Показываем курсор при первом движении мыши
        if (cursorLarge && cursorSmall) {
          cursorLarge.style.opacity = '1';
          cursorSmall.style.opacity = '1';
        }
      }
    };
    
    const handleMouseDown = () => {
      if (cursorSmall && typeof window.gsap !== 'undefined') {
        window.gsap.to(cursorSmall, { duration: 0.15, scale: 2 });
      }
    };
    
    const handleMouseUp = () => {
      if (cursorSmall && typeof window.gsap !== 'undefined') {
        window.gsap.to(cursorSmall, { duration: 0.15, scale: 1 });
      }
    };
    
    const handleDOMContentLoaded = () => {
      setTimeout(initCursor, 50);
    };
    
    const initCursor = () => {
      // Удаляем все существующие элементы курсора, чтобы избежать дублирования
      const existingLarge = document.querySelector('.cursor--large');
      const existingSmall = document.querySelector('.cursor--small');
      if (existingLarge) existingLarge.remove();
      if (existingSmall) existingSmall.remove();

      // Создаём новые элементы курсора с флагом, чтобы старый скрипт их игнорировал
      cursorLarge = document.createElement('div');
      cursorLarge.className = 'cursor cursor--large';
      cursorLarge.setAttribute('data-cursor-managed', 'react');
      // Минимальные inline-стили, визуальный вид берём из CSS (.cursor--large/.cursor--small)
      cursorLarge.style.cssText =
        'position: fixed; left: 0; top: 0; pointer-events: none; z-index: 9999; opacity: 0;';
      document.body.appendChild(cursorLarge);

      cursorSmall = document.createElement('div');
      cursorSmall.className = 'cursor cursor--small';
      cursorSmall.setAttribute('data-cursor-managed', 'react');
      cursorSmall.style.cssText =
        'position: fixed; left: 0; top: 0; pointer-events: none; z-index: 10000; opacity: 0;';
      document.body.appendChild(cursorSmall);

      // Устанавливаем стили для курсора
      if (document.body) {
        document.body.style.cursor = 'none';
      }

      // Добавляем стили для курсора, если их нет
      if (!document.querySelector('#custom-cursor-styles')) {
        customStyle = document.createElement('style');
        customStyle.id = 'custom-cursor-styles';
        customStyle.textContent = `
          body {
            cursor: none !important;
          }
          
          /* ИСКЛЮЧЕНИЯ - где курсор должен быть обычным */
          input, textarea, select, 
          [contenteditable="true"],
          .chat-widget, .chat-widget *,
          .MuiDialog-root, .MuiDialog-root *,
          .MuiModal-root, .MuiModal-root *,
          .show_popup, .show_popup *,
          iframe, iframe * {
            cursor: auto !important;
          }
          
          .cursor {
            pointer-events: none !important;
            z-index: 9999 !important;
            position: fixed !important;
          }
          .cursor--large {
            border: 1px solid #FB0 !important;
            border-radius: 50% !important;
            width: 40px !important;
            height: 40px !important;
          }
          .cursor--small {
            background: #FB0 !important;
            border-radius: 50% !important;
            width: 10px !important;
            height: 10px !important;
          }
          
          /* Скрываем кастомный курсор над элементами где он не нужен */
          body:has(input:hover) .cursor,
          body:has(textarea:hover) .cursor,
          body:has(.chat-widget:hover) .cursor,
          body:has(.MuiDialog-root) .cursor,
          body:has(.show_popup) .cursor {
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(customStyle);
      }

      // Прямая инициализация курсора
      initCursorDirectly(cursorLarge, cursorSmall);
    };

    const initCursorDirectly = (large: HTMLElement, small: HTMLElement) => {
      // Инициализируем глобальную позицию курсора
      if (!window.cursorPosition) {
        window.cursorPosition = { x: -100, y: -100, isStuck: false };
      }

      // Получаем оригинальные размеры большого круга
      const largeRect = large.getBoundingClientRect();
      let cursorOuterOriginalState = {
        width: largeRect.width || 40,
        height: largeRect.height || 40,
      };

      // Обновляем размеры при изменении размера окна
      handleResize = () => {
        const rect = large.getBoundingClientRect();
        cursorOuterOriginalState = {
          width: rect.width || 40,
          height: rect.height || 40,
        };
      };
      window.addEventListener('resize', handleResize, { passive: true });

      // Улучшенная инициализация курсора (как в оригинальном cursor.js)
      const updateCursor = () => {
        if (!large || !small || !window.cursorPosition) {
          return;
        }

        const { x, y, isStuck } = window.cursorPosition;

        // Используем GSAP если доступен, иначе обычный transform (как в оригинальном cursor.js)
        // Маленький кружок имеет transform: translate(-50%, -50%) в CSS, поэтому x/y центрируют его
        if (typeof window.gsap !== 'undefined') {
          // GSAP использует x/y для transform: translate(x, y)
          // Маленький кружок: центр на позиции мыши (благодаря translate(-50%, -50%) в CSS)
          window.gsap.set(small, {
            x: x,
            y: y,
          });

          if (!isStuck) {
            // Большой кружок: центр на позиции мыши (смещаем на половину размера)
            window.gsap.to(large, {
              duration: 0.15,
              x: x - cursorOuterOriginalState.width / 2,
              y: y - cursorOuterOriginalState.height / 2,
            });
          }
        } else {
          // Fallback без GSAP - используем transform как в оригинальном cursor.js
          // Маленький кружок: центр на позиции мыши (благодаря translate(-50%, -50%) в CSS)
          // Комбинируем translate из CSS с translate из JS
          small.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(1)`;
          if (!isStuck) {
            // Большой кружок: центр на позиции мыши
            large.style.transform = `translate(${x - cursorOuterOriginalState.width / 2}px, ${y - cursorOuterOriginalState.height / 2}px)`;
          }
        }

        animationId = requestAnimationFrame(updateCursor);
      };

      // Привязываем обработчик к window, чтобы курсор работал на всей высоте страницы
      window.addEventListener('mousemove', handleMouseMove, { passive: true });

      // Обработка кнопок через делегирование событий (более эффективно)
      const updateButtons = () => {
        // Используем делегирование вместо добавления обработчиков на каждую кнопку
      };

      updateButtons();
      observer = new MutationObserver(updateButtons);
      observer.observe(document.body, { childList: true, subtree: true });

      document.addEventListener('mousedown', handleMouseDown, { passive: true });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });

      // Загружаем GSAP если его нет
      if (typeof window.gsap === 'undefined' && !document.querySelector('script[src*="gsap"]')) {
        gsapScript = document.createElement('script');
        gsapScript.src = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js';
        gsapScript.async = true;
        document.head.appendChild(gsapScript);
      }

      updateCursor();
    };

    // Инициализируем сразу, если DOM готов
    if (document.body) {
      setTimeout(initCursor, 50);
    } else {
      document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    }

    // ПОЛНАЯ ОЧИСТКА при размонтировании
    return () => {
      // Останавливаем анимацию
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

      // Останавливаем наблюдение за DOM
      if (observer) {
        observer.disconnect();
        observer = null;
      }

      // Удаляем обработчики событий
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }

      // Восстанавливаем обычный курсор
      if (document.body) {
        document.body.style.cursor = '';
      }

      // Удаляем элементы курсора
      cursorLarge?.remove();
      cursorSmall?.remove();

      // Удаляем стили
      customStyle?.remove();

      // Очищаем глобальное состояние
      if (window.cursorPosition) {
        delete window.cursorPosition;
      }

      // НЕ удаляем GSAP скрипт, так как он может использоваться другими компонентами
    };
  }, [currentPath]);
}

// Расширяем интерфейс Window для cursorPosition
declare global {
  interface Window {
    gsap?: any;
    cursorPosition?: {
      x: number;
      y: number;
      isStuck: boolean;
    };
  }
}
