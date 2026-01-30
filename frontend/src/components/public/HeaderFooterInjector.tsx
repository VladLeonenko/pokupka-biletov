import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicPartials } from '@/services/publicApi';

export function HeaderFooterInjector() {
  const { data: partials } = useQuery({
    queryKey: ['public-partials'],
    queryFn: getPublicPartials,
    staleTime: 5 * 60 * 1000, // Кэшируем на 5 минут
  });

  const isInjectedRef = useRef(false);

  useEffect(() => {
    if (!partials || isInjectedRef.current) return;
    
    // Проверяем, что document доступен (защита от SSR)
    if (typeof document === 'undefined') return;

    let observer: MutationObserver | undefined;

    try {
      // Быстрая проверка: если header/footer уже есть с нужными атрибутами, пропускаем
      const existingHeader = document.querySelector('[data-injected-header], [data-global-header]');
      const existingFooter = document.querySelector('[data-injected-footer], [data-global-footer]');
      if (existingHeader && existingFooter) {
        isInjectedRef.current = true;
        return;
      }

      // Проверяем, есть ли уже header/footer в контейнере PublicPageRenderer
      const publicPageContainer = document.querySelector('[data-public-page-container]');
      const hasHeaderInPublicPage = publicPageContainer?.querySelector('header, .header, [class*="header"]');
      const hasFooterInPublicPage = publicPageContainer?.querySelector('footer, .footer, [class*="footer"]');

      // Проверяем, есть ли уже React компоненты Header/Footer
      // React компоненты не имеют data-injected-* атрибутов, но имеют структуру header/footer
      const reactHeader = document.querySelector('header:not([data-injected-header]):not([data-global-header])');
      const reactFooter = document.querySelector('footer:not([data-injected-footer]):not([data-global-footer])');
      const hasReactComponents = reactHeader && reactFooter;
      
      // Для React страниц (каталог, ЛК, корзина и т.д.) НЕ добавляем header/footer через injector
      // Проверяем наличие React контейнера
      const rootElement = document.getElementById('root');
      const isReactPage = rootElement && rootElement.children.length > 0;
      
      // Если есть React компоненты Header/Footer, не добавляем через injector
      if (hasReactComponents) {
        isInjectedRef.current = true;
        return; // React компоненты уже есть, не добавляем через injector
      }
      
      // Если есть header/footer в PublicPageRenderer И это не React страница, не добавляем новые
      if ((hasHeaderInPublicPage || hasFooterInPublicPage) && !isReactPage) {
        // Удаляем все ранее добавленные header/footer если они есть в PublicPageRenderer
        try {
          const existingInjectedHeaders = document.querySelectorAll('[data-injected-header]');
          const existingInjectedFooters = document.querySelectorAll('[data-injected-footer]');
          existingInjectedHeaders.forEach(el => el.remove());
          existingInjectedFooters.forEach(el => el.remove());
        } catch (error) {
          console.warn('[HeaderFooterInjector] Error removing existing headers/footers:', error);
        }
        isInjectedRef.current = true;
        return; // Не добавляем header/footer если они уже есть в PublicPageRenderer
      }
      
      // Если это React страница и нет React компонентов, тоже не добавляем (они должны быть в App.tsx)
      if (isReactPage && !hasReactComponents) {
        isInjectedRef.current = true;
        return; // React страница, но компоненты должны быть в App.tsx
      }

      // Удаляем только дубликаты, если они есть
      if (existingHeader) existingHeader.remove();
      if (existingFooter) existingFooter.remove();

    // Проверяем все существующие header/footer в body (не в PublicPageRenderer)
    const allHeaders = Array.from(document.querySelectorAll('body > header, body > .header')).filter(
      el => !el.hasAttribute('data-injected-header') && !el.hasAttribute('data-global-header')
    );
    const allFooters = Array.from(document.querySelectorAll('body > footer, body > .footer')).filter(
      el => !el.hasAttribute('data-injected-footer') && !el.hasAttribute('data-global-footer')
    );
    
    // Функция для исправления путей к изображениям и другим ресурсам
    const fixResourcePaths = (element: Element) => {
      // Исправляем img src
      const images = element.querySelectorAll('img');
      images.forEach((img) => {
        const src = img.getAttribute('src');
        if (src) {
          // Если путь относительный и не начинается с / или http
          if (!src.startsWith('http') && !src.startsWith('//')) {
            if (src.startsWith('img/') || src.startsWith('./img/')) {
              img.setAttribute('src', `/legacy/${src.replace(/^\.?\//, '')}`);
            } else if (src.startsWith('/img/')) {
              img.setAttribute('src', `/legacy${src}`);
            } else if (src.includes('@img')) {
              img.setAttribute('src', src.replace('@img/', '/legacy/img/'));
            } else if (!src.startsWith('/')) {
              // Если путь вообще не начинается с /, добавляем /legacy/
              img.setAttribute('src', `/legacy/${src}`);
            }
          }
        }
      });
      
      // Исправляем source srcset в picture тегах
      const sources = element.querySelectorAll('source[srcset]');
      sources.forEach((source) => {
        const srcset = source.getAttribute('srcset');
        if (srcset) {
          // Обрабатываем srcset (может содержать несколько путей с размерами)
          const fixedSrcset = srcset
            .split(',')
            .map(item => {
              const parts = item.trim().split(/\s+/);
              const url = parts[0];
              const size = parts[1] || '';
              
              if (!url.startsWith('http') && !url.startsWith('//')) {
                let fixedUrl = url;
                if (url.startsWith('img/') || url.startsWith('./img/')) {
                  fixedUrl = `/legacy/${url.replace(/^\.?\//, '')}`;
                } else if (url.startsWith('/img/')) {
                  fixedUrl = `/legacy${url}`;
                } else if (url.includes('@img')) {
                  fixedUrl = url.replace('@img/', '/legacy/img/');
                } else if (!url.startsWith('/legacy/') && !url.startsWith('/')) {
                  fixedUrl = `/legacy/${url}`;
                }
                return size ? `${fixedUrl} ${size}` : fixedUrl;
              }
              return item.trim();
            })
            .join(', ');
          
          if (fixedSrcset !== srcset) {
            source.setAttribute('srcset', fixedSrcset);
          }
        }
      });
      
      // Исправляем background-image в style атрибутах
      const elementsWithStyle = element.querySelectorAll('[style*="background"], [style*="url"]');
      elementsWithStyle.forEach((el) => {
        const style = el.getAttribute('style');
        if (style) {
          let newStyle = style;
          // Заменяем пути img/... на /legacy/img/...
          newStyle = newStyle.replace(/url\(['"]?(\.?\/?)(img\/[^'"]+)['"]?\)/gi, (match, prefix, path) => {
            return `url(/legacy/${path})`;
          });
          // Заменяем ../img/ на /legacy/img/
          newStyle = newStyle.replace(/url\(['"]?\.\.\/img\/([^'"]+)['"]?\)/gi, (match, path) => {
            return `url(/legacy/img/${path})`;
          });
          // Заменяем @img на /legacy/img
          newStyle = newStyle.replace(/@img\//g, '/legacy/img/');
          // Заменяем /img/ на /legacy/img/
          newStyle = newStyle.replace(/url\(['"]?\/img\//g, 'url(/legacy/img/');
          if (newStyle !== style) {
            el.setAttribute('style', newStyle);
          }
        }
      });
      
      // Исправляем computed styles для элементов .menu (которые могут иметь background из CSS)
      const menuElements = element.querySelectorAll('.menu');
      menuElements.forEach((menuEl) => {
        const computedStyle = window.getComputedStyle(menuEl);
        const bgImage = computedStyle.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          // Проверяем, содержит ли background-image путь ../img/
          if (bgImage.includes('../img/') || bgImage.includes('url("../img/')) {
            // Извлекаем путь к изображению
            const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (urlMatch && urlMatch[1]) {
              const oldPath = urlMatch[1];
              // Заменяем ../img/ на /legacy/img/
              if (oldPath.includes('../img/')) {
                const newPath = oldPath.replace('../img/', '/legacy/img/');
                // Устанавливаем новый background через inline style
                const currentBg = computedStyle.background || '';
                const newBg = currentBg.replace(oldPath, newPath);
                (menuEl as HTMLElement).style.background = newBg;
                // Если это просто background-image, заменяем только его
                if (bgImage.includes('url(')) {
                  (menuEl as HTMLElement).style.backgroundImage = `url(${newPath})`;
                }
              }
            }
          }
        }
      });
      
      // Исправляем пути в link для favicon и других ресурсов
      const links = element.querySelectorAll('link[href]');
      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('//')) {
          if (href.startsWith('img/') || href.includes('@img')) {
            link.setAttribute('href', `/legacy/${href.replace(/^\.?\//, '').replace('@img/', 'img/')}`);
          } else if (href.startsWith('/img/')) {
            link.setAttribute('href', `/legacy${href}`);
          }
        }
      });
    };
    
    // Если уже есть header/footer в body, не добавляем новые
    const shouldAddHeader = allHeaders.length === 0 && partials.header;
    const shouldAddFooter = allFooters.length === 0 && partials.footer;

    // Загружаем CSS стили из head если они есть
    if (partials.head) {
      const headParser = new DOMParser();
      const headDoc = headParser.parseFromString(partials.head, 'text/html');
      const stylesheets = headDoc.querySelectorAll('link[rel="stylesheet"]');
      stylesheets.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && !document.querySelector(`link[href="${href}"], link[href*="${href.split('/').pop()}"]`)) {
          const newLink = document.createElement('link');
          newLink.rel = 'stylesheet';
          newLink.type = 'text/css';
          newLink.setAttribute('crossorigin', 'anonymous');
          
          // Если это относительный путь к CSS, добавляем префикс для проксирования
          let cssHref = href;
          if (href.startsWith('css/') && !href.startsWith('http')) {
            // В dev режиме используем прокси через backend, в продакшене - прямой путь
            const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isDev) {
              // Используем прокси через Vite или прямой backend
              cssHref = `/${href}`;
            }
          }
          
          newLink.href = cssHref;
          
          // Обработка ошибок загрузки
          newLink.onerror = () => {
            console.warn(`[HeaderFooterInjector] Failed to load CSS: ${cssHref}`);
            // Пытаемся загрузить через альтернативный путь
            if (!cssHref.startsWith('http')) {
              const altLink = document.createElement('link');
              altLink.rel = 'stylesheet';
              altLink.type = 'text/css';
              altLink.href = `/css/${href.split('/').pop()}`;
              document.head.appendChild(altLink);
            }
          };
          
          document.head.appendChild(newLink);
        }
      });
      const inlineStyles = headDoc.querySelectorAll('style');
      inlineStyles.forEach((style) => {
        if (!document.querySelector(`style[data-injected="${style.textContent?.substring(0, 50)}"]`)) {
          const newStyle = document.createElement('style');
          newStyle.textContent = style.textContent || '';
          newStyle.setAttribute('data-injected', style.textContent?.substring(0, 50) || '');
          document.head.appendChild(newStyle);
        }
      });
    }

    // Добавляем header если его нет нигде
    if (shouldAddHeader && partials.header) {
      // Создаем временный контейнер для парсинга HTML
      const tempDiv = document.createElement('div');
      let headerHtml = partials.header;
      
      // МОДИФИЦИРУЕМ HEADER: удаляем телефон и добавляем иконки
      // 1. Удаляем телефон
      headerHtml = headerHtml.replace(
        /<a[^>]*href=["']tel:[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
        ''
      );
      headerHtml = headerHtml.replace(
        /<div[^>]*class=["'][^"']*phone[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
        ''
      );
      
      // 2. Добавляем иконки перед burger menu (если их еще нет)
      if (!headerHtml.includes('ecommerce-icons-container-global')) {
        const iconsHtml = `
        <div class="ecommerce-icons-container-global" style="display: flex !important; align-items: center; gap: 4px; margin-left: auto; margin-right: 0; z-index: 100; position: relative;">
            <a href="/search" style="display: inline-flex !important; align-items: center; justify-content: center; width: 40px; height: 40px; color: inherit; text-decoration: none; visibility: visible !important; opacity: 1 !important;" aria-label="Поиск">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display: block !important;">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
            </a>
            <a href="/wishlist" style="display: inline-flex !important; align-items: center; justify-content: center; width: 40px; height: 40px; color: inherit; text-decoration: none; position: relative; visibility: visible !important; opacity: 1 !important;" aria-label="Избранное">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display: block !important;">
                    <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
                </svg>
            </a>
            <a href="/cart" style="display: inline-flex !important; align-items: center; justify-content: center; width: 40px; height: 40px; color: inherit; text-decoration: none; position: relative; visibility: visible !important; opacity: 1 !important;" aria-label="Корзина">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display: block !important;">
                    <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
            </a>
            <a href="/account" style="display: inline-flex !important; align-items: center; justify-content: center; width: 40px; height: 40px; color: inherit; text-decoration: none; visibility: visible !important; opacity: 1 !important;" aria-label="Личный кабинет">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display: block !important;">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
            </a>
        </div>`;
        
        // Вставляем иконки перед burger menu
        headerHtml = headerHtml.replace(
          /(<input[^>]*id=["']burger-toggle["'][^>]*>)/i,
          iconsHtml + '$1'
        );
      }
      
      tempDiv.innerHTML = headerHtml;
      
      // Ищем header элемент
      let headerElement = tempDiv.querySelector('header');
      if (!headerElement) {
        headerElement = tempDiv.querySelector('.header, [class*="header"]') as HTMLElement;
      }
      if (!headerElement) {
        headerElement = tempDiv.firstElementChild as HTMLElement;
      }
      
      if (headerElement) {
        // Исправляем пути к изображениям в header
        fixResourcePaths(headerElement);
        // Перемещаем элемент напрямую (не клонируем), чтобы сохранить все стили и связи
        headerElement.setAttribute('data-injected-header', 'true');
        headerElement.setAttribute('data-global-header', 'true');
        document.body.insertBefore(headerElement, document.body.firstChild);
        isInjectedRef.current = true;
        
        // Дополнительно исправляем пути для .menu после загрузки CSS
        setTimeout(() => {
          const menuElements = document.querySelectorAll('.menu');
          menuElements.forEach((menuEl) => {
            const computedStyle = window.getComputedStyle(menuEl);
            const bgImage = computedStyle.backgroundImage;
            if (bgImage && bgImage !== 'none' && (bgImage.includes('../img/') || bgImage.includes('url("../img/'))) {
              const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
              if (urlMatch && urlMatch[1]) {
                const oldPath = urlMatch[1];
                if (oldPath.includes('../img/')) {
                  const newPath = oldPath.replace('../img/', '/legacy/img/');
                  (menuEl as HTMLElement).style.backgroundImage = `url(${newPath})`;
                }
              }
            }
          });
        }, 100);
      }
    }

    // Добавляем footer если его нет нигде
    if (shouldAddFooter && partials.footer) {
      // Создаем временный контейнер для парсинга HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = partials.footer;
      
      // Ищем footer элемент
      let footerElement = tempDiv.querySelector('footer');
      if (!footerElement) {
        footerElement = tempDiv.querySelector('.footer, [class*="footer"]') as HTMLElement;
      }
      if (!footerElement) {
        footerElement = tempDiv.firstElementChild as HTMLElement;
      }
      
      if (footerElement) {
        // Исправляем пути к изображениям в footer
        fixResourcePaths(footerElement);
        // Перемещаем элемент напрямую (не клонируем), чтобы сохранить все стили и связи
        footerElement.setAttribute('data-injected-footer', 'true');
        footerElement.setAttribute('data-global-footer', 'true');
        document.body.appendChild(footerElement);
      }
    }

    // После вставки header'а чистим структуру основного меню:
    // если в .main-menu-nav три колонки, удаляем вторую, чтобы убрать дубли,
    // а третья автоматически сдвинется на её место.
    setTimeout(() => {
      const mainMenu = document.querySelector('.main-menu-nav');
      if (mainMenu) {
        const cols = Array.from(mainMenu.children) as HTMLElement[];
        if (cols.length >= 3) {
          const secondCol = cols[1];
          if (secondCol && secondCol.parentElement === mainMenu) {
            mainMenu.removeChild(secondCol);
          }
        }
      }
    }, 100);

    // Добавляем CSS для адаптивности и стилизации header/footer
    const style = document.createElement('style');
    style.textContent = `
      /* Стили для header и footer на всех страницах - идентичны главной */
      [data-injected-header] {
        width: 100% !important;
        position: relative !important;
        z-index: 51 !important;
      }
      
      [data-injected-header] header {
        z-index: 51 !important;
      }
      
      [data-injected-header] .header {
        z-index: 55 !important;
      }
      
      [data-injected-footer] {
        width: 100% !important;
        position: relative !important;
      }
      
      /* Стили для header контейнера - как на главной */
      [data-injected-header] .header,
      [data-injected-header] header > div.header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      
      /* Логотип - как на главной */
      [data-injected-header] .logo img {
        max-height: 50px !important;
        width: auto !important;
      }
      
      /* Скрываем телефон */
      .header__phone,
      .header a[href^="tel:"],
      .header > a[href^="tel:"],
      header a[href^="tel:"],
      .phoneEmail,
      [data-injected-header] .header > a[href^="tel:"] {
        display: none !important;
      }
      
      /* Показываем иконки */
      .ecommerce-icons-container-global {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        margin-left: auto !important;
        margin-right: 0 !important;
        z-index: 100 !important;
        position: relative !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      .ecommerce-icons-container-global a {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 40px !important;
        height: 40px !important;
        color: inherit !important;
        text-decoration: none !important;
        visibility: visible !important;
        opacity: 1 !important;
        font-size: inherit !important;
      }
      
      .ecommerce-icons-container-global svg {
        width: 24px !important;
        height: 24px !important;
        display: block !important;
        fill: currentColor !important;
      }
      
      /* Бургерное меню - такая же высота как иконки, но ширина остается оригинальной */
      .burger-menu {
        height: 40px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-left: 4px !important;
      }
      
      @media (max-width: 768px) {
        .ecommerce-icons-container-global a {
          width: 36px !important;
          height: 36px !important;
        }
        .ecommerce-icons-container-global svg {
          width: 20px !important;
          height: 20px !important;
        }
        
        .burger-menu {
          height: 36px !important;
          margin-left: 2px !important;
        }
      }
      
      /* Footer контент - как на главной */
      [data-injected-footer] .container,
      [data-injected-footer] > div {
        width: 100% !important;
      }
      
      /* Убеждаемся что меню работает правильно - скрыто по умолчанию */
      [data-injected-header] .menu {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        opacity: 0 !important;
        visibility: hidden !important;
        z-index: 50 !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease, visibility 0.3s ease !important;
        /* Гарантируем единый фон для бургер-меню на всех страницах */
        background: url(/legacy/img/yellow-sphere-bg.png) no-repeat center center !important;
        background-size: cover !important;
        background-color: #141414 !important;
      }
      
      /* Меню показывается только когда чекбокс отмечен */
      [data-injected-header] #burger-toggle:checked ~ .menu {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        z-index: 52 !important;
      }
      
      /* Общие стили для .menu на всех страницах */
      .menu {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        opacity: 0 !important;
        visibility: hidden !important;
        z-index: 50 !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease, visibility 0.3s ease !important;
      }
      
      /* Меню показывается только когда чекбокс отмечен */
      #burger-toggle:checked ~ .menu {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        z-index: 52 !important;
      }
      
      /* Убеждаемся что контент страницы не перекрывается меню когда оно скрыто */
      body {
        position: relative !important;
      }
      
      /* Адаптивность для всех устройств */
      @media (max-width: 768px) {
        [data-injected-header] .header {
          padding: 8px 12px !important;
        }
        
        /* Телефон уже скрыт глобально */
        
        .ecommerce-icons-container {
          gap: 2px !important;
        }
        .ecommerce-icons-container .MuiIconButton-root {
          width: 36px !important;
          height: 36px !important;
          padding: 6px !important;
        }
        .ecommerce-icons-container .MuiSvgIcon-root {
          fontSize: 20px !important;
        }
        
        [data-injected-footer] {
          padding: 30px 0 !important;
        }
        
        [data-injected-footer] .container,
        [data-injected-footer] > div {
          padding: 0 15px !important;
        }
      }
      
      /* Адаптивность для каталога */
      @media (max-width: 960px) {
        .catalog-filters {
          position: relative !important;
          top: 0 !important;
        }
      }
      
      /* Адаптивность для карточек товаров */
      @media (max-width: 600px) {
        .product-card {
          width: 100% !important;
        }
      }
      
      /* Убеждаемся что пункт меню \"Каталог услуг\" виден */
      .menu-navigation li a[href="/catalog"],
      .menu-navigation a[href="/catalog"] {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        text-decoration: none !important;
        font-weight: 500 !important;
      }

      /* Ховер для ключевых пунктов меню */
      .menu-navigation li a[href="/catalog"]:hover,
      .menu-navigation li a[href="/ai-team"]:hover,
      .menu-navigation li a[href="/ai-chat"]:hover {
        color: #ffbb00 !important;
      }
    `;
    
    // Добавляем основные ссылки в меню если их нет
    const addMenuLinks = () => {
      // В первую очередь работаем с основным бургер-меню (.main-menu-nav)
      const primaryNavs = document.querySelectorAll('.main-menu-nav .menu-navigation');
      const ensureLinksForMenu = (menuNav: Element) => {
        if (menuNav.tagName !== 'UL' && menuNav.tagName !== 'OL') return;

        const ensureLink = (href: string, text: string) => {
          const existing = menuNav.querySelector(`a[href="${href}"], a[href*="${href.replace('/', '')}"]`);
          if (existing) return;

          const firstLi = menuNav.querySelector('li');
          if (!firstLi) return;

          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = href;
          a.textContent = text;
          // цвет не задаём инлайном, чтобы работали :hover-стили
          a.style.cssText =
            'display: block; padding: 8px 0; text-decoration: none; font-weight: 500; cursor: pointer;';
          a.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = href;
          });
          li.appendChild(a);
          menuNav.insertBefore(li, firstLi);
        };

        // Каталог услуг
        ensureLink('/catalog', 'Каталог услуг');
        // AI Boost Team
        ensureLink('/ai-team', 'AI Boost Team');
        // AI ассистент
        ensureLink('/ai-chat', 'AI Ассистент');
      };

      if (primaryNavs.length > 0) {
        // Заполняем только первую колонку .main-menu-nav, чтобы не плодить дубли в остальных
        ensureLinksForMenu(primaryNavs[0]);
      } else {
        // Фоллбек для старых шаблонов без .main-menu-nav
        const menuNavs = document.querySelectorAll(
          '.menu-navigation, nav ul, .menu ul, [class*="menu-navigation"], header ul, footer ul',
        );
        menuNavs.forEach((menuNav) => {
          ensureLinksForMenu(menuNav);
        });
      }
    };
    
    // Добавляем ссылку сразу и после задержек
    addMenuLinks();
    setTimeout(addMenuLinks, 100);
    setTimeout(addMenuLinks, 500);
    setTimeout(addMenuLinks, 1000);
    
      // Добавляем Observer для динамически добавляемых меню
      observer = new MutationObserver(() => {
        addMenuLinks();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    
      if (!document.head.querySelector('#header-footer-injector-styles')) {
        style.id = 'header-footer-injector-styles';
        document.head.appendChild(style);
      }
    } catch (error) {
      console.error('[HeaderFooterInjector] Error in useEffect:', error);
    }

    return () => {
      const existingStyle = document.head.querySelector('#header-footer-injector-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [partials]);

  return null;
}

