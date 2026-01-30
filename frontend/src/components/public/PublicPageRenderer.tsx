import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useToast } from '@/components/common/ToastProvider';

interface PublicPageRendererProps {
  html: string;
  onScriptsLoaded?: () => void;
}

/**
 * Компонент для прямого рендеринга HTML из базы данных
 * Заменяет iframe на прямое встраивание контента
 */
export function PublicPageRenderer({ html, onScriptsLoaded }: PublicPageRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const scriptsExecutedRef = useRef<Set<string>>(new Set());
  const { showToast: showToastFromHook } = useToast();
  
  // Определяем dev режим один раз, чтобы избежать ошибок с import.meta в runtime
  // Используем try-catch для безопасной проверки
  let IS_DEV = false;
  try {
    IS_DEV = import.meta.env.DEV;
  } catch (e) {
    // Если import.meta недоступен, проверяем через другие способы
    IS_DEV = process.env.NODE_ENV === 'development' || 
             (typeof window !== 'undefined' && window.location.hostname === 'localhost');
  }

  // Функция для показа toast-уведомления
  // Использует хук, но также проверяет глобальную функцию для совместимости
  const showToast = (message: string, severity: 'error' | 'success' | 'info' | 'warning' = 'error') => {
    // Сначала пробуем использовать хук
    if (showToastFromHook) {
      showToastFromHook(message, severity);
    } else if (typeof window !== 'undefined' && (window as any).__showToast) {
      // Fallback на глобальную функцию
      (window as any).__showToast(message, severity);
    } else {
      // Последний fallback на console
      console.error(message);
    }
  };

  useEffect(() => {
    if (!containerRef.current || !html) return;

    const container = containerRef.current;
    
    // Экспортируем showToast в window для доступа из других контекстов
    (window as any).__showQuizToast = showToast;
    
    // КРИТИЧНО: Устанавливаем перехватчик submit СРАЗУ, до всего остального
    const submitInterceptor = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;
      
      const formId = form.id || '';
      if (formId !== 'regForm' && formId !== 'quizForm') return;
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Проверяем валидацию - только на последнем шаге проверяем все поля
      const formData = new FormData(form);
      const nameValue = formData.get('quiz-name');
      const phoneValue = formData.get('quiz-tel');
      const emailValue = formData.get('quiz-email');
      
      const hasName = nameValue && nameValue.toString().trim() !== '';
      const hasPhone = phoneValue && phoneValue.toString().trim() !== '' && phoneValue.toString().trim() !== '+7';
      const hasEmail = emailValue && emailValue.toString().trim() !== '';
      
        if (!hasName || !hasPhone || !hasEmail) {
          showToast('Пожалуйста, заполните все обязательные поля: имя, телефон и email', 'error');
          return false;
        }
      
      // Если валидация прошла, вызываем submitQuizForm
      if (typeof (window as any).submitQuizForm === 'function') {
        (window as any).submitQuizForm();
      }
      return false;
    };
    
    // Устанавливаем на capture фазе для максимального приоритета
    document.addEventListener('submit', submitInterceptor, true);
    
    // КРИТИЧНО: Перехватываем клики по кнопкам формы
    const buttonClickInterceptor = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      // Проверяем, кликнули ли по кнопке Next/Отправить
      const isNextButton = target.id === 'nextBtn' || 
                          (target.tagName === 'BUTTON' && 
                           (target.textContent?.trim() === 'Далее' || 
                            target.textContent?.trim() === 'Отправить'));
      
      if (!isNextButton) return;
      
      // Ищем форму
      const form = target.closest('form') as HTMLFormElement || 
                   document.getElementById('regForm') as HTMLFormElement || 
                   document.getElementById('quizForm') as HTMLFormElement;
      
      if (!form) return;
      
      const formId = form.id || '';
      if (formId !== 'regForm' && formId !== 'quizForm') return;
      
      // Находим текущий активный таб и его индекс
      const tabs = Array.from(form.querySelectorAll('.tab'));
      let currentTab: HTMLElement | null = null;
      let currentTabIndex = -1;
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i] as HTMLElement;
        if (tab.style.display !== 'none' && window.getComputedStyle(tab).display !== 'none') {
          currentTab = tab;
          currentTabIndex = i;
          break;
        }
      }
      
      // Если это последний шаг (кнопка "Отправить"), проверяем все обязательные поля
      const isLastStep = target.textContent?.trim() === 'Отправить';
      
      if (isLastStep) {
        // Проверяем все обязательные поля на последнем шаге
        const formData = new FormData(form);
        const nameValue = formData.get('quiz-name');
        const phoneValue = formData.get('quiz-tel');
        const emailValue = formData.get('quiz-email');
        
        const hasName = nameValue && nameValue.toString().trim() !== '';
        const hasPhone = phoneValue && phoneValue.toString().trim() !== '' && phoneValue.toString().trim() !== '+7';
        const hasEmail = emailValue && emailValue.toString().trim() !== '';
        
        // Проверяем чекбокс согласия на обработку персональных данных
        // Ищем чекбокс разными способами
        let consentCheckbox: HTMLInputElement | null = null;
        
        // Способ 1: по классу
        consentCheckbox = form.querySelector('.privacy-consent-checkbox input[type="checkbox"]') as HTMLInputElement;
        
        // Способ 2: по name
        if (!consentCheckbox) {
          consentCheckbox = form.querySelector('input[name="privacy_consent"]') as HTMLInputElement;
        }
        
        // Способ 3: по name с частичным совпадением
        if (!consentCheckbox) {
          consentCheckbox = form.querySelector('input[type="checkbox"][name*="privacy"]') as HTMLInputElement;
        }
        
        // Способ 4: в текущем табе
        if (!consentCheckbox && currentTab) {
          consentCheckbox = currentTab.querySelector('input[type="checkbox"][name*="privacy"]') as HTMLInputElement;
        }
        
        // Способ 5: по тексту label (ищем чекбокс рядом с текстом о согласии)
        if (!consentCheckbox) {
          const allCheckboxes = form.querySelectorAll('input[type="checkbox"]');
          for (let i = 0; i < allCheckboxes.length; i++) {
            const cb = allCheckboxes[i] as HTMLInputElement;
            const label = cb.closest('label') || (cb.id && form.querySelector(`label[for="${cb.id}"]`));
            if (label) {
              const labelText = label.textContent?.toLowerCase() || '';
              if (labelText.includes('соглас') || labelText.includes('персональн') || labelText.includes('privacy') || labelText.includes('конфиденциальн')) {
                consentCheckbox = cb;
                break;
              }
            }
          }
        }
        
        // Способ 6: ищем в последнем табе (где обычно находится согласие)
        if (!consentCheckbox) {
          const tabs = form.querySelectorAll('.tab');
          if (tabs.length > 0) {
            const lastTab = tabs[tabs.length - 1] as HTMLElement;
            const checkboxesInLastTab = lastTab.querySelectorAll('input[type="checkbox"]');
            for (let i = 0; i < checkboxesInLastTab.length; i++) {
              const cb = checkboxesInLastTab[i] as HTMLInputElement;
              const label = cb.closest('label') || (cb.id && form.querySelector(`label[for="${cb.id}"]`));
              if (label) {
                const labelText = label.textContent?.toLowerCase() || '';
                if (labelText.includes('соглас') || labelText.includes('персональн') || labelText.includes('privacy') || labelText.includes('конфиденциальн')) {
                  consentCheckbox = cb;
                  break;
                }
              }
            }
          }
        }
        
        const hasConsent = consentCheckbox && consentCheckbox.checked;
        
        if (!hasName || !hasPhone || !hasEmail) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          showToast('Пожалуйста, заполните все обязательные поля: имя, телефон и email', 'error');
          return false;
        }
        
        if (!hasConsent) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          showToast('Необходимо согласие на обработку персональных данных', 'error');
          if (consentCheckbox) {
            consentCheckbox.focus();
            consentCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return false;
        }
      } else if (currentTab && currentTabIndex >= 0) {
        // Проверяем обязательные вопросы: 1, 2 и 5 (индексы 0, 1, 4)
        const isQuestion1 = currentTabIndex === 0;
        const isQuestion2 = currentTabIndex === 1;
        const isQuestion5 = currentTabIndex === 4;
        
        if (isQuestion1 || isQuestion2) {
          // В вопросах 1 и 2 нужно выбрать РОВНО ОДИН чекбокс
          const checkboxes = currentTab.querySelectorAll('input[type="checkbox"].quiz-question-content');
          const checkedCount = Array.from(checkboxes).filter((cb: Element) => (cb as HTMLInputElement).checked).length;
          
          if (checkedCount === 0) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            showToast('Пожалуйста, выберите один вариант', 'error');
            return false;
          }
          
          if (checkedCount > 1) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            showToast('Пожалуйста, выберите только один вариант', 'error');
            return false;
          }
        } else if (isQuestion5) {
          // В вопросе 5 проверяем обязательные поля (не чекбоксы)
          const requiredFields = currentTab.querySelectorAll('input[required]:not([type="checkbox"]), textarea[required], select[required], input[data-required]:not([type="checkbox"]), textarea[data-required], select[data-required]');
          const missingFields: string[] = [];
          
          requiredFields.forEach((field) => {
            const input = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            const value = input.value ? input.value.trim() : '';
            const isEmpty = value === '' || value === '+7';
            
            if (isEmpty) {
              const label = currentTab!.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() || 
                           input.getAttribute('name') || 
                           input.getAttribute('placeholder') || 
                           'поле';
              missingFields.push(label);
            }
          });
          
          if (missingFields.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            showToast('Пожалуйста, заполните обязательные поля на этом шаге', 'error');
            return false;
          }
        }
        // Для остальных вопросов (3, 4 и т.д.) валидация не требуется
      }
    };
    
    document.addEventListener('click', buttonClickInterceptor, true);
    
    // КРИТИЧНО: Для вопросов 1 и 2 делаем чекбоксы взаимоисключающими (как radio)
    const checkboxClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      // Проверяем, кликнули ли по чекбоксу с классом quiz-question-content
      const checkbox = target.closest('input[type="checkbox"].quiz-question-content') as HTMLInputElement;
      if (!checkbox) return;
      
      // Ищем форму и таб
      const form = checkbox.closest('form') as HTMLFormElement || 
                   document.getElementById('regForm') as HTMLFormElement || 
                   document.getElementById('quizForm') as HTMLFormElement;
      if (!form) return;
      
      const tabs = Array.from(form.querySelectorAll('.tab'));
      const currentTab = checkbox.closest('.tab') as HTMLElement;
      if (!currentTab) return;
      
      const currentTabIndex = tabs.indexOf(currentTab);
      
      // Если это вопрос 1 или 2 (индексы 0 и 1)
      if (currentTabIndex === 0 || currentTabIndex === 1) {
        // Если чекбокс был выбран, снимаем все остальные в этом табе
        if (checkbox.checked) {
          const allCheckboxes = currentTab.querySelectorAll('input[type="checkbox"].quiz-question-content');
          allCheckboxes.forEach((cb: Element) => {
            const cbElement = cb as HTMLInputElement;
            if (cbElement !== checkbox) {
              cbElement.checked = false;
            }
          });
        }
      }
    };
    
    document.addEventListener('change', checkboxClickHandler, true);
    
    // КРИТИЧНО: Также перехватываем form.submit() вызовы
    const originalSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function(this: HTMLFormElement) {
      const formId = this.id || '';
      if (formId === 'regForm' || formId === 'quizForm') {
        // Проверяем валидацию
        const formData = new FormData(this);
        const nameValue = formData.get('quiz-name');
        const phoneValue = formData.get('quiz-tel');
        const emailValue = formData.get('quiz-email');
        
        const hasName = nameValue && nameValue.toString().trim() !== '';
        const hasPhone = phoneValue && phoneValue.toString().trim() !== '' && phoneValue.toString().trim() !== '+7';
        const hasEmail = emailValue && emailValue.toString().trim() !== '';
        
        if (!hasName || !hasPhone || !hasEmail) {
          if (typeof (window as any).showErrorNotification === 'function') {
            (window as any).showErrorNotification('Пожалуйста, заполните все обязательные поля: имя, телефон и email');
          } else if (typeof (window as any).__showToast === 'function') {
            (window as any).__showToast('Пожалуйста, заполните все обязательные поля: имя, телефон и email', 'error');
          } else {
            // Fallback на старый toast если есть
            if (typeof (window as any).__showQuizToast === 'function') {
              (window as any).__showQuizToast('Пожалуйста, заполните все обязательные поля: имя, телефон и email');
            }
          }
          return;
        }
        
        // Если валидация прошла, вызываем submitQuizForm
        if (typeof (window as any).submitQuizForm === 'function') {
          (window as any).submitQuizForm();
        }
        return;
      }
      
      // Для других форм вызываем оригинальный submit
      return originalSubmit.call(this);
    };
    
    // Устанавливаем заглушки для quiz функций сразу, чтобы избежать ошибок
    if (typeof (window as any).attachEventHandlers !== 'function') {
      (window as any).attachEventHandlers = function() { return false; };
    }
    if (typeof (window as any).submitQuizForm !== 'function') {
      (window as any).submitQuizForm = function() { return false; };
    }
    
    // Очищаем контейнер
    container.innerHTML = '';

    // Парсим HTML документ
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // ВАЖНО: Извлекаем скрипты ДО очистки DOMPurify и сохраняем их расположение
    const allScriptsInDoc = Array.from(doc.querySelectorAll('script')).map((script) => {
      // Безопасно извлекаем textContent - используем innerHTML если textContent пустой
      let textContent = script.textContent || '';
      if (!textContent && script.innerHTML) {
        textContent = script.innerHTML;
      }
      
      return {
        element: script,
        isInHead: script.parentNode === doc.head,
        src: script.getAttribute('src') || '',
        textContent: textContent,
        attributes: Array.from(script.attributes).map((attr) => ({
          name: attr.name,
          value: attr.value,
        })),
      };
    });

    // Получаем body и head
    const bodyContent = doc.body.innerHTML;
    const headContent = doc.head.innerHTML;

    // Удаляем preloader из body перед очисткой
    const preloaderElements = doc.body.querySelectorAll('#preloader-page, .preloader');
    preloaderElements.forEach((el) => {
      el.remove();
    });

    // Удаляем header и footer из body, так как они должны быть глобальными
    const headerElements = doc.body.querySelectorAll('header, [data-global-header]');
    const footerElements = doc.body.querySelectorAll('footer, [data-global-footer]');
    headerElements.forEach((el) => {
      el.remove();
    });
    footerElements.forEach((el) => {
      el.remove();
    });

    // Временно удаляем скрипты из body для очистки (чтобы DOMPurify не удалил их содержимое)
    const tempBody = doc.body.cloneNode(true) as HTMLElement;
    const scriptsInBody = Array.from(tempBody.querySelectorAll('script'));
    scriptsInBody.forEach((script) => {
      script.remove();
    });

    // Очищаем HTML от потенциально опасного кода (но разрешаем стили и мультимедиа-теги)
    const cleanHtml = DOMPurify.sanitize(tempBody.innerHTML, {
      ADD_TAGS: ['style', 'link', 'meta', 'noscript', 'video', 'source', 'picture'],
      ADD_ATTR: [
        'src',
        'href',
        'type',
        'rel',
        'async',
        'defer',
        'crossorigin',
        'integrity',
        'charset',
        // Атрибуты для <video>/<source>
        'controls',
        'autoplay',
        'muted',
        'loop',
        'playsinline',
        'poster',
      ],
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: true,
    });

    // Вставляем очищенный HTML body в контейнер
    container.innerHTML = cleanHtml;
    
    // Исправляем пути к изображениям и другим статическим ресурсам
    const fixResourcePaths = (element: Element) => {
      // Исправляем img src
      const images = element.querySelectorAll('img');
      images.forEach((img) => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('//')) {
          let fixedSrc = src;
          // Обрабатываем @img/ в первую очередь
          if (fixedSrc.includes('@img')) {
            fixedSrc = fixedSrc.replace(/@img\//g, '/legacy/img/');
          }
          // Если путь не начинается с /, добавляем /legacy/
          else if (!fixedSrc.startsWith('/')) {
            if (fixedSrc.startsWith('img/') || fixedSrc.startsWith('./img/')) {
              fixedSrc = `/legacy/${fixedSrc.replace(/^\.?\//, '')}`;
            } else {
              fixedSrc = `/legacy/img/${fixedSrc}`;
            }
          } else if (fixedSrc.startsWith('/img/') && !fixedSrc.startsWith('/legacy/')) {
            // Пути /img/... -> /legacy/img/...
            fixedSrc = `/legacy${fixedSrc}`;
          } else if (!fixedSrc.startsWith('/legacy/') && (fixedSrc.startsWith('/css/') || fixedSrc.startsWith('/js/'))) {
            // Пути /css/... или /js/... -> /legacy/css/... или /legacy/js/...
            fixedSrc = `/legacy${fixedSrc}`;
          }
          img.setAttribute('src', fixedSrc);
        }
      });
      
      // Исправляем background-image в style атрибутах
      const elementsWithStyle = element.querySelectorAll('[style*="background"], [style*="url"]');
      elementsWithStyle.forEach((el) => {
        const style = el.getAttribute('style');
        if (style) {
          let newStyle = style;
          // Заменяем @img на /legacy/img в первую очередь
          newStyle = newStyle.replace(/@img\//g, '/legacy/img/');
          // Заменяем пути img/... на /legacy/img/...
          newStyle = newStyle.replace(/url\(['"]?(\.?\/?)(img\/[^'"]+)['"]?\)/gi, (match, prefix, path) => {
            return `url(/legacy/${path})`;
          });
          // Заменяем ../img/ на /legacy/img/
          newStyle = newStyle.replace(/url\(['"]?\.\.\/img\/([^'"]+)['"]?\)/gi, (match, path) => {
            return `url(/legacy/img/${path})`;
          });
          // Заменяем /img/ на /legacy/img/
          newStyle = newStyle.replace(/url\(['"]?\/img\/([^'"]+)['"]?\)/gi, (match, path) => {
            return `url(/legacy/img/${path})`;
          });
          if (newStyle !== style) {
            el.setAttribute('style', newStyle);
          }
        }
      });
      
      // Исправляем computed styles для элементов .menu (которые могут иметь background из CSS)
      const menuElements = element.querySelectorAll('.menu');
      menuElements.forEach((menuEl) => {
        setTimeout(() => {
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
        }, 100);
      });
      
      // Исправляем пути в link для favicon и других ресурсов
      const links = element.querySelectorAll('link[href]');
      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('/')) {
          if (href.startsWith('img/') || href.includes('@img')) {
            link.setAttribute('href', `/legacy/${href.replace(/^\.?\//, '').replace('@img/', 'img/')}`);
          }
        }
      });
    };
    
    fixResourcePaths(container);
    
    // Добавляем ссылки для интернет-магазина в меню
    const navLinks = container.querySelectorAll('nav a, .menu a, .header a, [class*="menu"] a, [class*="nav"] a');
    let hasCatalogLink = false;
    let hasCartLink = false;
    let hasAccountLink = false;
    
    navLinks.forEach((link: Element) => {
      const href = link.getAttribute('href');
      const text = (link.textContent || '').toLowerCase();
      if (href && (href.includes('/catalog') || text.includes('каталог'))) {
        hasCatalogLink = true;
      }
      if (href && (href.includes('/cart') || text.includes('корзина'))) {
        hasCartLink = true;
      }
      if (href && (href.includes('/account') || text.includes('личный кабинет') || text.includes('аккаунт'))) {
        hasAccountLink = true;
      }
    });
    
    // Находим все меню для добавления ссылок
    const menuNavs = container.querySelectorAll('.menu-navigation, nav ul, .menu ul, [class*="menu-navigation"]');
    const menuNavsArray = Array.from(menuNavs);
    
    // Если не нашли через класс, ищем через структуру
    if (menuNavsArray.length === 0) {
      const firstNav = container.querySelector('nav, .menu, .header, [class*="menu"]:first-child, [class*="nav"]:first-child');
      if (firstNav && (firstNav.tagName === 'UL' || firstNav.tagName === 'OL')) {
        menuNavsArray.push(firstNav);
      }
    }
    
    // Добавляем ссылку "Каталог услуг" в каждое меню
    menuNavsArray.forEach((menuNav: Element) => {
      if (menuNav.tagName === 'UL' || menuNav.tagName === 'OL') {
        const existingLink = menuNav.querySelector('a[href="/catalog"], a[href*="catalog"]');
        if (!existingLink) {
          const li = document.createElement('li');
          const catalogLink = document.createElement('a');
          catalogLink.href = '/catalog';
          catalogLink.textContent = 'Каталог услуг';
          catalogLink.style.cssText = 'display: block; padding: 8px 0; text-decoration: none; color: inherit; font-weight: 500; cursor: pointer;';
          
          // Обработка клика для SPA навигации
          catalogLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/catalog';
          });
          
          li.appendChild(catalogLink);
          // Вставляем в начало списка
          menuNav.insertBefore(li, menuNav.firstChild);
        }
      }
    });
    
    // Текстовые ссылки "Корзина" и "Личный кабинет" убраны - используются только иконки

    // Обрабатываем head элементы (CSS, meta теги)
    const headElements = doc.head.querySelectorAll('link[rel="stylesheet"], style, meta');
    headElements.forEach((element) => {
      if (element.tagName === 'LINK') {
        const link = document.createElement('link');
        link.rel = element.getAttribute('rel') || 'stylesheet';
        let href = element.getAttribute('href') || '';
        // Исправляем пути к CSS файлам
        if (href && !href.startsWith('http') && !href.startsWith('//')) {
          if (!href.startsWith('/legacy/') && (href.startsWith('/css/') || href.startsWith('/js/'))) {
            href = `/legacy${href}`;
          } else if (href.startsWith('css/') || href.startsWith('js/')) {
            href = `/legacy/${href}`;
          } else if (!href.startsWith('/')) {
            href = `/legacy/${href}`;
          }
        }
        link.href = href;
        link.type = element.getAttribute('type') || 'text/css';
        if (element.getAttribute('crossorigin')) {
          link.crossOrigin = element.getAttribute('crossorigin') || 'anonymous';
        }
        document.head.appendChild(link);
      } else if (element.tagName === 'STYLE') {
        const style = document.createElement('style');
        style.textContent = element.textContent || '';
        document.head.appendChild(style);
      } else if (element.tagName === 'META') {
        const meta = document.createElement('meta');
        Array.from(element.attributes).forEach((attr) => {
          meta.setAttribute(attr.name, attr.value);
        });
        document.head.appendChild(meta);
      }
    });

    // Фильтруем скрипты: удаляем owl.carousel и slick (заменены на нативные карусели)
    // Также исправляем пути к скриптам
    const filteredScripts = allScriptsInDoc.map((script) => {
      if (script.src && !script.src.startsWith('http') && !script.src.startsWith('//')) {
        let fixedSrc = script.src;
        // Если путь относительный, добавляем /legacy/ если его нет
        if (!fixedSrc.startsWith('/legacy/') && (fixedSrc.startsWith('/js/') || fixedSrc.startsWith('/css/'))) {
          fixedSrc = `/legacy${fixedSrc}`;
        } else if (fixedSrc.startsWith('js/') || fixedSrc.startsWith('css/')) {
          fixedSrc = `/legacy/${fixedSrc}`;
        } else if (!fixedSrc.startsWith('/')) {
          fixedSrc = `/legacy/${fixedSrc}`;
        }
        return { ...script, src: fixedSrc };
      }
      return script;
    }).filter((script) => {
      const src = script.src.toLowerCase();
      // Фильтруем owl.carousel и slick
      if (src.includes('owl.carousel') || src.includes('slick')) {
        return false;
      }
      // Фильтруем quiz-optimized.js на всех страницах кроме главной
      if (src.includes('quiz-optimized.js')) {
        const isHomePage = typeof window !== 'undefined' && window.location.pathname === '/';
        return isHomePage;
      }
      return true;
    });
    
    // Используем скрипты, извлеченные ДО очистки
    // ВАЖНО: Сортируем скрипты так, чтобы jQuery загружался ПЕРВЫМ
    const sortedScripts = [...filteredScripts].sort((a, b) => {
      const aSrc = (a.src || '').toLowerCase();
      const bSrc = (b.src || '').toLowerCase();
      
      // jQuery должен быть первым
      if (aSrc.includes('jquery') && !bSrc.includes('jquery')) return -1;
      if (!aSrc.includes('jquery') && bSrc.includes('jquery')) return 1;
      
      // Остальные скрипты в исходном порядке
      return 0;
    });

    const scriptPromises: Promise<void>[] = [];

    sortedScripts.forEach((scriptData, index) => {
      const scriptId = scriptData.src || scriptData.textContent.substring(0, 50) || `script-${index}`;
      
      // Пропускаем уже выполненные скрипты
      if (scriptsExecutedRef.current.has(scriptId)) {
        return;
      }

      const newScript = document.createElement('script');
      
      // Копируем атрибуты
      scriptData.attributes.forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Если это внешний скрипт
      if (scriptData.src) {
        // Проверяем, не загружен ли уже скрипт с таким src
        const existingScript = document.querySelector(`script[src="${scriptData.src}"]`);
        if (existingScript) {
          // Скрипт уже загружен, пропускаем
          scriptsExecutedRef.current.add(scriptId);
          return;
        }

        const promise = new Promise<void>((resolve) => {
          newScript.onload = () => {
            // Для quiz-optimized.js проверяем, что функции экспортированы
            if (scriptSrc.includes('quiz-optimized.js')) {
              // Функции будут проверены ниже
            }
            
            scriptsExecutedRef.current.add(scriptId);
            resolve();
          };
          newScript.onerror = (error) => {
            if (IS_DEV) {
              console.error('[PublicPageRenderer] ❌ Script failed to load:', scriptSrc);
            }
            // Для критичных скриптов (quiz-optimized.js) устанавливаем заглушки
            if (scriptSrc.includes('quiz-optimized.js')) {
              // Устанавливаем заглушки для функций quiz
              if (typeof (window as any).attachEventHandlers !== 'function') {
                (window as any).attachEventHandlers = function() { return false; };
              }
              if (typeof (window as any).submitQuizForm !== 'function') {
                (window as any).submitQuizForm = function() { return false; };
              }
            }
            scriptsExecutedRef.current.add(scriptId); // Помечаем как выполненный даже при ошибке
            resolve(); // Продолжаем даже если скрипт не загрузился
          };
        });
        // Исправляем пути к скриптам
        let scriptSrc = scriptData.src;
        if (scriptSrc && !scriptSrc.startsWith('http') && !scriptSrc.startsWith('//')) {
          // Если путь относительный, добавляем /legacy/ если его нет
          if (!scriptSrc.startsWith('/legacy/') && (scriptSrc.startsWith('/js/') || scriptSrc.startsWith('/css/'))) {
            scriptSrc = `/legacy${scriptSrc}`;
          } else if (scriptSrc.startsWith('js/') || scriptSrc.startsWith('css/')) {
            scriptSrc = `/legacy/${scriptSrc}`;
          } else if (!scriptSrc.startsWith('/')) {
            scriptSrc = `/legacy/${scriptSrc}`;
          }
        }
        
        // В dev режиме Vite отдает файлы из public/ напрямую
        // Проверяем, что путь правильный
        if (scriptSrc && scriptSrc.startsWith('/legacy/')) {
          // Путь уже правильный для Vite dev server
          newScript.src = scriptSrc;
        } else {
          newScript.src = scriptSrc;
        }
        
        newScript.type = 'text/javascript';
        newScript.crossOrigin = 'anonymous';
        
        // ВАЖНО: Для quiz-optimized.js НЕ используем async/defer, чтобы скрипт выполнился синхронно
        const isQuizOptimized = scriptSrc && scriptSrc.includes('quiz-optimized.js');
        if (isQuizOptimized) {
          // Убеждаемся, что скрипт выполняется синхронно
          newScript.async = false;
          newScript.defer = false;
          // Добавляем timestamp для предотвращения кеширования
          newScript.src = scriptSrc + '?v=' + Date.now();
        }
        
        
        // ВАЖНО: jQuery загружаем в head, остальные в body
        const isJQuery = scriptData.src.toLowerCase().includes('jquery');
        if (scriptData.isInHead || isJQuery) {
          document.head.appendChild(newScript);
        } else {
          document.body.appendChild(newScript);
        }
        
        // Для quiz-optimized.js проверка выполнения происходит через проверку функций ниже
        
        // Для quiz-optimized.js проверяем функции сразу после добавления в DOM
        if (isQuizOptimized) {
          // Проверяем, что скрипт начал выполняться
          const checkScriptExecution = () => {
            // Проверяем, появились ли функции (даже как заглушки)
            const hasBasicFunctions = typeof (window as any).nextPrev === 'function' && 
                                      typeof (window as any).showTab === 'function' &&
                                      typeof (window as any).validateForm === 'function';
            
            if (hasBasicFunctions) {
              if (IS_DEV) {
                console.log('[PublicPageRenderer] ✅ quiz-optimized.js script is executing (functions found)');
              }
              
              // Проверяем наличие всех необходимых функций
              const hasAllFunctions = typeof (window as any).attachEventHandlers === 'function' && 
                                      typeof (window as any).submitQuizForm === 'function';
              
              // Проверяем флаг готовности (если установлен)
              const isReady = (window as any).__quizFunctionsReady === true;
              
              if (hasAllFunctions && isReady) {
                if (IS_DEV) {
                  console.log('[PublicPageRenderer] ✅ quiz-optimized.js functions ready (flag set)');
                }
                if (typeof window.dispatchEvent === 'function') {
                  window.dispatchEvent(new CustomEvent('quiz-functions-ready'));
                }
                return;
              }
              
              // Ждем экспорта всех функций
              let attempts = 0;
              const maxAttempts = 20;
              const checkInterval = setInterval(() => {
                attempts++;
                
                const hasAll = typeof (window as any).attachEventHandlers === 'function' && 
                              typeof (window as any).submitQuizForm === 'function';
                const ready = (window as any).__quizFunctionsReady === true;
                
                if (hasAll && ready) {
                  clearInterval(checkInterval);
                  if (IS_DEV) {
                    console.log('[PublicPageRenderer] ✅ quiz-optimized.js functions exported (attempt ' + attempts + ')');
                  }
                  if (typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('quiz-functions-ready'));
                  }
                } else if (hasAll) {
                  // Функции есть, но флаг еще не установлен - считаем готовым
                  clearInterval(checkInterval);
                  if (IS_DEV) {
                    console.log('[PublicPageRenderer] ✅ quiz-optimized.js functions exported (attempt ' + attempts + ', flag pending)');
                  }
                  if (typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('quiz-functions-ready'));
                  }
                } else if (attempts >= maxAttempts) {
                  clearInterval(checkInterval);
                  // В продакшене тихо устанавливаем заглушки без ошибок
                  if (typeof (window as any).attachEventHandlers !== 'function') {
                    (window as any).attachEventHandlers = function() { return false; };
                  }
                  if (typeof (window as any).submitQuizForm !== 'function') {
                    (window as any).submitQuizForm = function() { return false; };
                  }
                  // Логируем только в dev режиме
                  if (IS_DEV) {
                    console.warn('[PublicPageRenderer] ⚠️  quiz-optimized.js functions not exported, using stubs');
                  }
                }
              }, 100);
            } else {
              // Скрипт еще не начал выполняться - ждем
              setTimeout(checkScriptExecution, 50);
            }
          };
          
          // Начинаем проверку сразу после добавления
          setTimeout(checkScriptExecution, 10);
        }
        scriptPromises.push(promise);
      } else {
        // Встроенный скрипт - выполняем через создание нового элемента
        // ВАЖНО: Используем setTimeout для безопасного выполнения, чтобы избежать синтаксических ошибок
        try {
          // Проверяем, что textContent не пустой
          if (!scriptData.textContent || !scriptData.textContent.trim()) {
            scriptsExecutedRef.current.add(scriptId);
            return;
          }

          // Берем содержимое скрипта
          let scriptContent = scriptData.textContent;
          const usesJQuery = /jQuery|\$\(|jQuery\(/.test(scriptContent);
          
          // Проверяем, содержит ли скрипт import.meta (недопустимо в обычных скриптах)
          const hasImportMeta = /import\.meta/.test(scriptContent);
          if (hasImportMeta) {
            // Проверяем, является ли скрипт модулем
            const isModule = scriptData.attributes.some(attr => 
              attr.name === 'type' && attr.value === 'module'
            );
            
            if (!isModule) {
              // Если скрипт не модуль, но содержит import.meta, пытаемся заменить
              if (IS_DEV) {
                console.warn('[PublicPageRenderer] Script contains import.meta but is not a module, sanitizing:', scriptId);
              }
              
              // Пытаемся заменить import.meta.env.DEV на проверку через window
              scriptContent = scriptContent.replace(
                /import\.meta\.env\.DEV/g,
                '(typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))'
              );
              // Заменяем другие использования import.meta.env.*
              scriptContent = scriptContent.replace(
                /import\.meta\.env\.([A-Z_]+)/g,
                '(typeof process !== "undefined" && process.env && process.env["$1"] ? process.env["$1"] : "")'
              );
              // Заменяем просто import.meta на пустой объект (только если не является частью import.meta.env)
              // Используем более точное регулярное выражение
              scriptContent = scriptContent.replace(
                /import\.meta(?!\.[a-zA-Z])/g,
                '({})'
              );
            } else {
              // Если это модуль, устанавливаем type="module"
              // Это уже должно быть в атрибутах, но на всякий случай
            }
          }
          
          // Функция для выполнения скрипта
          const executeScript = () => {
            try {
              const scriptToExecute = document.createElement('script');
              scriptData.attributes.forEach((attr) => {
                // Пропускаем type="module" если скрипт был изменен (содержал import.meta)
                if (attr.name === 'type' && attr.value === 'module' && hasImportMeta) {
                  // Не устанавливаем type="module" для скриптов, которые мы изменили
                  return;
                }
                scriptToExecute.setAttribute(attr.name, attr.value);
              });
              
              // Если скрипт был изменен (содержал import.meta), убеждаемся что type не module
              if (hasImportMeta) {
                scriptToExecute.removeAttribute('type');
              }
              
              scriptToExecute.textContent = scriptContent;
              
              // Добавляем обработчик ошибок перед добавлением в DOM
              scriptToExecute.onerror = (error) => {
                console.error('[PublicPageRenderer] Script execution error:', error, 'Script ID:', scriptId);
                scriptsExecutedRef.current.add(scriptId);
              };
              
              document.body.appendChild(scriptToExecute);
              scriptsExecutedRef.current.add(scriptId);
            } catch (err) {
              console.error('[PublicPageRenderer] Failed to create/append script:', err, 'Script ID:', scriptId);
              scriptsExecutedRef.current.add(scriptId);
            }
          };
          
          // Если скрипт использует jQuery, ждем его загрузки
          if (usesJQuery) {
            const waitForJQuery = (attempts = 0, maxAttempts = 20) => {
              if (typeof (window as any).jQuery !== 'undefined' && typeof (window as any).$ !== 'undefined') {
                // jQuery загружен, выполняем скрипт
                executeScript();
              } else if (attempts < maxAttempts) {
                // Ждем еще
                setTimeout(() => waitForJQuery(attempts + 1, maxAttempts), 100);
              } else {
                // jQuery не загрузился после всех попыток, все равно пытаемся выполнить
                if (IS_DEV) {
                  console.warn('[PublicPageRenderer] jQuery not loaded after', maxAttempts, 'attempts, executing script anyway');
                }
                executeScript();
              }
            };
            waitForJQuery();
          } else {
            // Скрипт не использует jQuery, выполняем сразу
            setTimeout(executeScript, 100);
          }
        } catch (err) {
          console.error('Script execution error:', err, 'Script ID:', scriptId);
          // Помечаем как выполненный даже при ошибке, чтобы не пытаться выполнить снова
          scriptsExecutedRef.current.add(scriptId);
        }
      }
    });

    // Обрабатываем ссылки для SPA навигации (включая добавленные нами)
    const processLinks = () => {
      const links = container.querySelectorAll('a[href]');
      links.forEach((link) => {
        // Пропускаем если уже обработан
        if ((link as any).__spaProcessed) return;
        (link as any).__spaProcessed = true;
        
        const href = link.getAttribute('href');
        if (!href) return;

        // Пропускаем внешние ссылки, якоря, почту, телефон, javascript, admin
        if (
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('javascript:') ||
          href.startsWith('http://') ||
          href.startsWith('https://') ||
          href.startsWith('/admin')
        ) {
          return;
        }

        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Нормализуем путь
          let path = href;
          if (!path.startsWith('/')) {
            path = '/' + path;
          }
          
          // Закрываем burger menu если есть
          const burgerToggle = document.getElementById('burger-toggle');
          if (burgerToggle && burgerToggle instanceof HTMLInputElement) {
            burgerToggle.checked = false;
          }
          
          navigate(path);
        });
      });
    };
    
    // Обрабатываем ссылки сразу и после добавления новых
    processLinks();
    
    // Используем MutationObserver для обработки динамически добавленных ссылок и quiz кнопок
    const observer = new MutationObserver(() => {
      processLinks();
      
      // Проверяем, появились ли кнопки quiz
      const quizForm = container.querySelector('#quizForm') || container.querySelector('#regForm');
      const nextBtn = container.querySelector('#nextBtn') as HTMLButtonElement;
      const prevBtn = container.querySelector('#prevBtn') as HTMLButtonElement;
      
      if (quizForm && (nextBtn || prevBtn)) {
        // Проверяем, что обработчики еще не привязаны
        const nextHasHandler = nextBtn?.onclick || nextBtn?.getAttribute('onclick');
        const prevHasHandler = prevBtn?.onclick || prevBtn?.getAttribute('onclick');
        
        if (!nextHasHandler || !prevHasHandler) {
          // Сначала пробуем через attachEventHandlers
          if (typeof (window as any).attachEventHandlers === 'function') {
            try {
              (window as any).attachEventHandlers();
            } catch (e) {
              // Игнорируем ошибки
            }
          }
          
          // Принудительно устанавливаем обработчики если их все еще нет
          if (nextBtn && typeof (window as any).nextPrev === 'function' && !nextBtn.onclick) {
            nextBtn.type = 'button';
            nextBtn.onclick = function(e: Event) {
              e.preventDefault();
              e.stopPropagation();
              if (typeof (window as any).nextPrev === 'function') {
                (window as any).nextPrev(1);
              }
              return false;
            };
          }
          
          if (prevBtn && typeof (window as any).nextPrev === 'function' && !prevBtn.onclick) {
            prevBtn.onclick = function(e: Event) {
              e.preventDefault();
              e.stopPropagation();
              if (typeof (window as any).nextPrev === 'function') {
                (window as any).nextPrev(-1);
              }
              return false;
            };
          }
        }
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    // Обрабатываем формы - не перехватываем quiz форму, она должна работать со своей логикой
    const forms = container.querySelectorAll('form');
    forms.forEach((form) => {
      // Пропускаем quiz форму (regForm) - она обрабатывается quiz.js
      if (form.id === 'regForm' || form.id === 'quizForm') {
        return;
      }
      
      form.addEventListener('submit', (e) => {
        // Обычные формы будут работать как обычно
        // Но можно добавить обработку для AJAX форм
      });
    });

    // Ждем загрузки всех скриптов, но не блокируем выполнение
    if (scriptPromises.length > 0) {
      Promise.all(scriptPromises).then(() => {
        // После загрузки скриптов принудительно инициализируем quiz
        setTimeout(() => {
          const quizForm = container.querySelector('#quizForm') || container.querySelector('#regForm');
          const nextBtn = container.querySelector('#nextBtn') as HTMLButtonElement;
          const prevBtn = container.querySelector('#prevBtn') as HTMLButtonElement;
          
          if (quizForm && (nextBtn || prevBtn)) {
            // Проверяем, что функции доступны
            if (typeof (window as any).attachEventHandlers === 'function') {
              try {
                (window as any).attachEventHandlers();
                if (IS_DEV) {
                  console.log('[PublicPageRenderer] ✅ Quiz handlers attached after scripts loaded');
                }
              } catch (e) {
                if (IS_DEV) {
                  console.warn('[PublicPageRenderer] Error attaching quiz handlers:', e);
                }
              }
            }
            
            // Принудительно устанавливаем обработчики если их нет
            if (nextBtn && typeof (window as any).nextPrev === 'function') {
              // Проверяем, есть ли обработчик
              if (!nextBtn.onclick && !nextBtn.getAttribute('onclick')) {
                nextBtn.type = 'button';
                nextBtn.onclick = function(e: Event) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof (window as any).nextPrev === 'function') {
                    (window as any).nextPrev(1);
                  }
                  return false;
                };
                if (IS_DEV) {
                  console.log('[PublicPageRenderer] ✅ Manually attached onclick to nextBtn');
                }
              }
            }
            
            if (prevBtn && typeof (window as any).nextPrev === 'function') {
              if (!prevBtn.onclick && !prevBtn.getAttribute('onclick')) {
                prevBtn.onclick = function(e: Event) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof (window as any).nextPrev === 'function') {
                    (window as any).nextPrev(-1);
                  }
                  return false;
                };
                if (IS_DEV) {
                  console.log('[PublicPageRenderer] ✅ Manually attached onclick to prevBtn');
                }
              }
            }
            
            // Также вызываем showTab(0) для инициализации
            if (typeof (window as any).showTab === 'function') {
              try {
                (window as any).showTab(0);
              } catch (e) {
                if (IS_DEV) {
                  console.warn('[PublicPageRenderer] Error calling showTab:', e);
                }
              }
            }
          }
        }, 200);
        
        if (onScriptsLoaded) {
          onScriptsLoaded();
        }
      }).catch((err) => {
        console.error('Some scripts failed to load:', err);
        if (onScriptsLoaded) {
          onScriptsLoaded();
        }
      });
    } else {
      // Если нет внешних скриптов, вызываем callback сразу
      if (onScriptsLoaded) {
        setTimeout(() => {
          // Проверяем quiz форму даже если нет скриптов
          const quizForm = container.querySelector('#quizForm') || container.querySelector('#regForm');
          if (quizForm && typeof (window as any).attachEventHandlers === 'function') {
            try {
              (window as any).attachEventHandlers();
            } catch (e) {
              // Игнорируем ошибки
            }
          }
          onScriptsLoaded();
        }, 100);
      }
    }

    // Cleanup функция
    return () => {
      // Удаляем перехватчики submit и кликов
      document.removeEventListener('submit', submitInterceptor, true);
      document.removeEventListener('click', buttonClickInterceptor, true);
      document.removeEventListener('change', checkboxClickHandler, true);
      HTMLFormElement.prototype.submit = originalSubmit;
      
      // Удаляем добавленные head элементы
      headElements.forEach((element) => {
        if (element.tagName === 'LINK') {
          const href = element.getAttribute('href');
          const existingLink = document.querySelector(`link[href="${href}"]`);
          if (existingLink && existingLink.parentNode === document.head) {
            document.head.removeChild(existingLink);
          }
        }
      });
      
      // Останавливаем observer
      observer.disconnect();
    };
  }, [html, navigate, onScriptsLoaded]);

  return (
    <div ref={containerRef} data-public-page-container style={{ minHeight: '100vh' }} />
  );
}

