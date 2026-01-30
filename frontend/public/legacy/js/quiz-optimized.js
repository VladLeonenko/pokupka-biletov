// Оптимизированный quiz.js для главной страницы
// КРИТИЧНО: Этот код должен выполниться СРАЗУ при загрузке скрипта

(function() {
  try {
    var QUIZ_DEBUG =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    var originalConsoleError = console.error;
    var originalConsoleLog = console.log;

    console.error = function() {
      if (!arguments || !arguments.length) {
        return originalConsoleError.apply(console, arguments);
      }

      var first = arguments[0];

      // Специальная обработка для всех quiz-логов
      if (typeof first === 'string' && first.indexOf('[Quiz]') === 0) {
        var msg = first;
        var hasCriticalFlag = msg.indexOf('CRITICAL') !== -1 || msg.indexOf('❌') !== -1;

        // В dev режимe настоящие ошибки (CRITICAL/❌) оставляем как error
        if (QUIZ_DEBUG && hasCriticalFlag) {
          return originalConsoleError.apply(console, arguments);
        }

        // Остальные quiz‑логи в dev уводим в обычный лог,
        // чтобы не засорять консоль ошибками
        if (QUIZ_DEBUG) {
          return originalConsoleLog.apply(console, arguments);
        }

        // В продакшене QUIZ_DEBUG = false — просто глушим такие сообщения
        return;
      }

      // Все остальные ошибки не трогаем
      return originalConsoleError.apply(console, arguments);
    };
  } catch (e) {
    // fail-safe: ничего не делаем, если что-то пошло не так
  }
})();

(function() {
  // Логируем только в dev режиме
  var QUIZ_DEBUG = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (QUIZ_DEBUG) {
    console.log('[Quiz] ========== quiz-optimized.js FILE LOADED ==========');
    console.log('[Quiz] Script execution started at:', new Date().toISOString());
  }
  window.__quizScriptExecuted = true;
  window.__quizScriptExecutedTime = Date.now();
  if (QUIZ_DEBUG) {
    console.log('[Quiz] ✅ Script execution confirmed, window.__quizScriptExecuted =', window.__quizScriptExecuted);
  }
})();

// КРИТИЧНО: Перехватываем submit события СРАЗУ, до всего остального
(function() {
  // Логируем только в dev режиме
  var QUIZ_DEBUG = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (QUIZ_DEBUG) {
    console.log('[Quiz] ========== Installing IMMEDIATE submit interceptor ==========');
  }
  
  // Перехватываем submit на уровне document с максимальным приоритетом
  function interceptSubmit(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') {
      return; // Не форма, пропускаем
    }
    
    var formId = form.id || '';
    if (formId !== 'regForm' && formId !== 'quizForm') {
      return; // Не quiz форма, пропускаем
    }
    
    console.log('[Quiz] ========== IMMEDIATE SUBMIT INTERCEPTOR TRIGGERED ==========');
    console.log('[Quiz] Form ID:', formId);
    console.log('[Quiz] Form element:', form);
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Проверяем валидацию
    var formData = new FormData(form);
    var nameValue = formData.get('quiz-name');
    var phoneValue = formData.get('quiz-tel');
    var emailValue = formData.get('quiz-email');
    
    var hasName = nameValue && nameValue.toString().trim() !== '';
    var hasPhone = phoneValue && phoneValue.toString().trim() !== '' && phoneValue.toString().trim() !== '+7';
    var hasEmail = emailValue && emailValue.toString().trim() !== '';
    
    // Логируем только в dev режиме
    var QUIZ_DEBUG_VALIDATION = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (QUIZ_DEBUG_VALIDATION) {
      console.log('[Quiz] Form values:', {
        name: nameValue,
        phone: phoneValue,
        email: emailValue
      });
      console.log('[Quiz] Validation check:', { hasName, hasPhone, hasEmail });
    }
    
    if (!hasName || !hasPhone || !hasEmail) {
      if (QUIZ_DEBUG_VALIDATION) {
        console.log('[Quiz] ❌ VALIDATION FAILED - blocking submit');
      }
      // Показываем модальное окно с ошибками вместо alert
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Пожалуйста, заполните все обязательные поля: имя, телефон и email');
      } else {
        alert('Пожалуйста, заполните все обязательные поля: имя, телефон и email');
      }
      return false;
    }
    
    if (QUIZ_DEBUG_VALIDATION) {
      console.log('[Quiz] ✅ Validation passed, calling submitQuizForm...');
    }
    
    // Если валидация прошла, вызываем submitQuizForm если он есть
    if (typeof window.submitQuizForm === 'function') {
      if (QUIZ_DEBUG_VALIDATION) {
        console.log('[Quiz] Calling window.submitQuizForm()...');
      }
      var result = window.submitQuizForm();
      if (QUIZ_DEBUG_VALIDATION) {
        console.log('[Quiz] submitQuizForm returned:', result);
      }
      return false;
    } else {
      console.log('[Quiz] ⚠️ window.submitQuizForm not available!');
      // Блокируем отправку если функции нет
      return false;
    }
  }
  
  // Устанавливаем на capture фазе для максимального приоритета
  document.addEventListener('submit', interceptSubmit, true);
  
  if (QUIZ_DEBUG) {
    console.log('[Quiz] ✅ IMMEDIATE submit interceptor installed with capture phase');
  }
  
  // Дополнительно устанавливаем на bubble фазе на случай, если capture не сработает
  document.addEventListener('submit', interceptSubmit, false);
  
  if (QUIZ_DEBUG) {
    console.log('[Quiz] ✅ IMMEDIATE submit interceptor also installed on bubble phase');
  }
})();

// КРИТИЧНО: Перехватываем form.submit() ДО того, как старый quiz.js загрузится
// Это нужно сделать СРАЗУ, до выполнения IIFE
(function() {
  // Перехватываем прототип HTMLFormElement.submit на глобальном уровне
  var originalSubmit = HTMLFormElement.prototype.submit;
  
  HTMLFormElement.prototype.submit = function() {
    var form = this;
    var formId = form.id || '';
    
    // Перехватываем только quiz формы
    if (formId === 'regForm' || formId === 'quizForm' || formId.startsWith('quiz')) {
      // Вызываем нашу функцию валидации
      if (typeof window.submitQuizForm === 'function') {
        var result = window.submitQuizForm();
        if (!result) {
          return false;
        }
        // Если валидация прошла, submitQuizForm уже отправил форму через fetch
        return false;
      } else {
        return false;
      }
    }
    
    // Для других форм вызываем оригинальный submit
    return originalSubmit.call(this);
  };
  
  // Также перехватываем конкретные формы при их появлении
  function interceptFormSubmit() {
    var forms = document.querySelectorAll('#regForm, #quizForm');
    forms.forEach(function(form) {
      if (!form) return;
      
      // Проверяем, не перехвачена ли уже форма
      if (form.__quizIntercepted) {
        return;
      }
      form.__quizIntercepted = true;
      
      // Дополнительно переопределяем submit для этой конкретной формы
      Object.defineProperty(form, 'submit', {
        value: function() {
          console.log('[Quiz] 🚨 Form.submit() called directly (intercepted at form level)!', form.id);
          // Вызываем нашу функцию валидации
          if (typeof window.submitQuizForm === 'function') {
            var result = window.submitQuizForm();
            if (!result) {
              console.log('[Quiz] Form.submit() blocked by validation');
              return false;
            }
            return false;
          } else {
            console.log('[Quiz] ❌ window.submitQuizForm is NOT a function!');
            return false;
          }
        },
        writable: true,
        configurable: true
      });
      
      // КРИТИЧНО: Также перехватываем submit событие на самой форме
      form.addEventListener('submit', function(e) {
        console.log('[Quiz] ========== FORM SUBMIT EVENT (form level) ==========');
        console.log('[Quiz] Form ID:', form.id);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (typeof window.submitQuizForm === 'function') {
          var result = window.submitQuizForm();
          console.log('[Quiz] submitQuizForm returned:', result);
        } else {
          console.log('[Quiz] ❌ window.submitQuizForm is NOT a function!');
        }
        
        return false;
      }, true);
    });
  }
  
  // Устанавливаем перехват сразу
  interceptFormSubmit();
  
  // Также устанавливаем перехват при появлении формы в DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptFormSubmit);
  }
  
  // И через MutationObserver для динамически добавленных форм
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function(mutations) {
      interceptFormSubmit();
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  
  // КРИТИЧНО: Перехватываем submit события на уровне document
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.tagName === 'FORM' && (form.id === 'regForm' || form.id === 'quizForm')) {
      console.log('[Quiz] ========== FORM SUBMIT EVENT INTERCEPTED ==========');
      console.log('[Quiz] Form ID:', form.id);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Вызываем валидацию
      if (typeof window.submitQuizForm === 'function') {
        console.log('[Quiz] Calling window.submitQuizForm()...');
        var result = window.submitQuizForm();
        console.log('[Quiz] submitQuizForm returned:', result);
        if (!result) {
          console.log('[Quiz] Form submission BLOCKED by validation');
        }
      } else {
        console.log('[Quiz] ❌ window.submitQuizForm is NOT a function!');
      }
      
      return false;
    }
  }, true); // Используем capture фазу для перехвата ДО других обработчиков
})();

// КРИТИЧНО: Экспортируем функции НАПРЯМУЮ, БЕЗ IIFE, БЕЗ ВСЯКИХ ПРОВЕРОК
// ВАЖНО: Все функции должны быть функциями, а не undefined!
// ВАЖНО: Экспортируем СИНХРОННО, до выполнения IIFE
try {
  window.nextPrev = window.nextPrev || function(n) { 
    return false; 
  };
  window.showTab = window.showTab || function(n) {
    // stub
  };
  window.submitQuizForm = window.submitQuizForm || function() { 
    return false; 
  };
  window.attachEventHandlers = window.attachEventHandlers || function() { 
    return false; 
  };
} catch (e) {
  // Логируем критические ошибки только в dev режиме
  var QUIZ_DEBUG_CRITICAL_ERROR = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (QUIZ_DEBUG_CRITICAL_ERROR) {
    console.log('[Quiz] CRITICAL ERROR:', e);
  }
}

(function() {
  'use strict';

  // Логируем только в dev режиме
  var QUIZ_DEBUG_IIFE_START = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (QUIZ_DEBUG_IIFE_START) {
    console.log('[Quiz] ========== quiz-optimized.js IIFE STARTED ==========');
    console.log('[Quiz] IIFE execution started at:', new Date().toISOString());
  }

  var currentTab = 0;
  var tabs = null;
  
  // Глобальная функция для отправки формы после валидации (объявляем заранее)
  var submitQuizForm;
  
  // КРИТИЧНО: Объявляем attachEventHandlers заранее, чтобы можно было экспортировать заглушку
  var attachEventHandlers;
  
  // Проверяем, что функции экспортированы (они должны быть экспортированы в начале файла)
  if (typeof window !== 'undefined') {
    // КРИТИЧНО: Экспортируем заглушки СРАЗУ, чтобы они были доступны до определения реальных функций
    if (typeof window.attachEventHandlers !== 'function') {
      window.attachEventHandlers = function() {
        return false;
      };
    }
    
    if (typeof window.submitQuizForm !== 'function') {
      window.submitQuizForm = function() {
        return false;
      };
    }
    
    if (typeof window.nextPrev !== 'function') {
      window.nextPrev = function() {
        return false;
      };
    }
    
    if (typeof window.showTab !== 'function') {
      window.showTab = function() {
        // stub
      };
    }
  }

  // Функция для проверки наличия квиза на странице
  function hasQuizOnPage() {
    // Проверяем наличие элементов квиза
    var quizForm = document.getElementById("regForm") || document.getElementById("quizForm");
    var tabs = document.getElementsByClassName("tab");
    return !!(quizForm && tabs && tabs.length > 0);
  }

  function initQuiz() {
    tabs = document.getElementsByClassName("tab");
    if (!tabs || tabs.length === 0) return false;

    showTab(currentTab);
    return true;
  }

  function showTab(n) {
    if (!tabs || n < 0 || n >= tabs.length) return;

    // Анимированный переход между вкладками
    var currentVisibleTab = null;
    for (var i = 0; i < tabs.length; i++) {
      var computedStyle = window.getComputedStyle(tabs[i]);
      if (computedStyle.display !== "none") {
        currentVisibleTab = i;
        break;
      }
    }
    
    // Определяем направление анимации
    var direction = currentVisibleTab !== null && n > currentVisibleTab ? 'next' : 'prev';
    
    // Скрываем текущую вкладку с анимацией
    if (currentVisibleTab !== null && currentVisibleTab !== n) {
      var currentTabEl = tabs[currentVisibleTab];
      currentTabEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      currentTabEl.style.opacity = '0';
      currentTabEl.style.transform = direction === 'next' ? 'translateX(-30px)' : 'translateX(30px)';
      
      setTimeout(function() {
        currentTabEl.style.display = "none";
        currentTabEl.style.opacity = '';
        currentTabEl.style.transform = '';
        currentTabEl.style.transition = '';
      }, 300);
    }
    
    // Показываем новую вкладку с анимацией
    var newTab = tabs[n];
    newTab.style.display = "block";
    newTab.style.opacity = "0";
    newTab.style.transform = direction === 'next' ? 'translateX(30px)' : 'translateX(-30px)';
    newTab.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // Запускаем анимацию появления
    requestAnimationFrame(function() {
      setTimeout(function() {
        newTab.style.opacity = "1";
        newTab.style.transform = "translateX(0)";
      }, 10);
    });

    // Fix the Previous/Next buttons
    var prevBtn = document.getElementById("prevBtn");
    var nextBtn = document.getElementById("nextBtn");

    if (!prevBtn || !nextBtn) {
      return;
    }

    if (n == 0) {
      prevBtn.style.display = "none";
    } else {
      prevBtn.style.display = "inline";
    }

    // ВСЕГДА используем type="button" - отправку обрабатываем вручную через onclick
    // Это предотвращает нативную отправку формы, обходящую валидацию
    nextBtn.type = "button";
    nextBtn.setAttribute("type", "button");
    nextBtn.removeAttribute("form"); // Убираем атрибут form если есть
    
    if (n == (tabs.length - 1)) {
      // На последнем шаге кнопка должна вызывать отправку формы
      if (typeof ym !== 'undefined') {
        // Сохраняем обработчик для яндекс метрики
        nextBtn.setAttribute("data-ym-goal", "sendForm");
      }
    }

    if (n == (tabs.length - 2)) {
      nextBtn.innerHTML = "Отправить";
    } else {
      nextBtn.innerHTML = "Далее";
    }

    if (n == 5) {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
    } else {
      nextBtn.style.display = "inline";
    }

    // Display the correct step indicator
    fixStepIndicator(n);
  }

  // Функция валидации текущего шага
  function validateCurrentTab() {
    console.log('[Quiz] validateCurrentTab called for tab', currentTab);
    
    if (!tabs || tabs.length === 0 || !tabs[currentTab]) {
      console.log('[Quiz] validateCurrentTab: No tabs or current tab invalid');
      return true; // Если нет вкладок, разрешаем переход
    }
    
    var tab = tabs[currentTab];
    var isValid = true;
    var errors = [];
    
    console.log('[Quiz] validateCurrentTab: Tab element found, validating...');
    
    // Определяем тип вкладки по индексу:
    // Tab 0: Вопрос 1 (чекбоксы - хотя бы один)
    // Tab 1: Вопрос 2 (чекбоксы - хотя бы один)
    // Tab 2: Вопрос 3 (обязательный - должен быть заполнен)
    // Tab 3: Вопрос 4 (промокод - необязательный)
    // Tab 4: Контакты (имя, телефон, email - все обязательные)
    // Tab 5+: Остальные вопросы (чекбоксы - хотя бы один)
    
    // Вопросы 1, 2 и остальные (чекбоксы) - проверяем, что выбран хотя бы один
    if (currentTab === 0 || currentTab === 1 || currentTab >= 5) {
      var checkboxes = tab.querySelectorAll('input[type="checkbox"]');
      var hasChecked = false;
      
      for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
          hasChecked = true;
          break;
        }
      }
      
      if (!hasChecked && checkboxes.length > 0) {
        isValid = false;
        var errorMsg = 'Выберите хотя бы один вариант';
        errors.push(errorMsg);
        console.log('[Quiz] ❌ Validation error on tab', currentTab, ':', errorMsg);
        // Помечаем все чекбоксы как невалидные
        for (var j = 0; j < checkboxes.length; j++) {
          checkboxes[j].classList.add('invalid');
        }
      } else {
        // Убираем класс invalid если выбран хотя бы один
        for (var k = 0; k < checkboxes.length; k++) {
          checkboxes[k].classList.remove('invalid');
        }
      }
    }
    
    // Вопрос 3 (tab 2) - обязательный, должен быть заполнен
    if (currentTab === 2) {
      var question3Inputs = tab.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
      var question3Filled = false;
      
      for (var i = 0; i < question3Inputs.length; i++) {
        var input = question3Inputs[i];
        if (input.type === 'hidden' || input.type === 'button' || input.type === 'submit') {
          continue;
        }
        var value = input.value ? input.value.trim() : '';
        if (value !== '') {
          question3Filled = true;
          input.classList.remove('invalid');
        } else {
          input.classList.add('invalid');
        }
      }
      
      if (!question3Filled && question3Inputs.length > 0) {
        isValid = false;
        var errorMsg = 'Вопрос 3 обязателен для заполнения';
        errors.push(errorMsg);
        console.log('[Quiz] ❌ Validation error on tab', currentTab, ':', errorMsg);
      }
    }
    
    // Вопрос 4 (tab 3) - промокод, необязательный
    if (currentTab === 3) {
      var question4Inputs = tab.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
      
      // Убираем класс invalid со всех полей, так как вопрос необязательный
      for (var i = 0; i < question4Inputs.length; i++) {
        var input = question4Inputs[i];
        if (input.type === 'hidden' || input.type === 'button' || input.type === 'submit') {
          continue;
        }
        // Если поле заполнено, убираем invalid, если пустое - тоже убираем (необязательное)
        input.classList.remove('invalid');
      }
    }
    
    // Контакты (tab 4) - имя, телефон и email обязательны
    if (currentTab === 4) {
      var form = document.getElementById("regForm") || document.getElementById("quizForm");
      var nameField = form ? form.querySelector('#quiz-name') : tab.querySelector('#quiz-name');
      var phoneField = form ? form.querySelector('#quiz-tel') : tab.querySelector('#quiz-tel');
      var emailField = form ? form.querySelector('#quiz-email') : tab.querySelector('#quiz-email');
      
      // Проверка имени
      if (nameField) {
        var nameValue = nameField.value ? nameField.value.trim() : '';
        if (nameValue === '') {
          isValid = false;
          nameField.classList.add('invalid');
          var errorMsg = 'Имя обязательно для заполнения';
          errors.push(errorMsg);
          console.log('[Quiz] ❌ Validation error on tab', currentTab, '(name):', errorMsg);
        } else {
          nameField.classList.remove('invalid');
        }
      }
      
      // Проверка телефона
      if (phoneField) {
        var phoneValue = phoneField.value ? phoneField.value.trim() : '';
        if (phoneValue === '' || phoneValue === '+7') {
          isValid = false;
          phoneField.classList.add('invalid');
          var errorMsg = 'Телефон обязателен для заполнения';
          errors.push(errorMsg);
          console.log('[Quiz] Validation error (phone):', errorMsg, 'value:', phoneValue);
        } else if (!validatePhone(phoneValue)) {
          isValid = false;
          phoneField.classList.add('invalid');
          var errorMsg = 'Неверный формат телефона';
          errors.push(errorMsg);
          console.log('[Quiz] Validation error (phone format):', errorMsg, 'value:', phoneValue);
        } else {
          phoneField.classList.remove('invalid');
        }
      }
      
      // Проверка email
      if (emailField) {
        var emailValue = emailField.value ? emailField.value.trim() : '';
        if (emailValue === '') {
          isValid = false;
          emailField.classList.add('invalid');
          var errorMsg = 'Email обязателен для заполнения';
          errors.push(errorMsg);
          console.log('[Quiz] Validation error (email):', errorMsg);
        } else if (!validateEmail(emailValue)) {
          isValid = false;
          emailField.classList.add('invalid');
          var errorMsg = 'Неверный формат email';
          errors.push(errorMsg);
          console.log('[Quiz] Validation error (email format):', errorMsg, 'value:', emailValue);
        } else {
          emailField.classList.remove('invalid');
        }
      }
    }
    
    // УНИВЕРСАЛЬНАЯ ПРОВЕРКА: Проверяем все поля с атрибутом required независимо от типа вкладки
    var requiredInputs = tab.querySelectorAll('input[required], textarea[required], select[required]');
    for (var i = 0; i < requiredInputs.length; i++) {
      var input = requiredInputs[i];
      // Пропускаем скрытые поля, кнопки и чекбоксы (они проверяются отдельно)
      if (input.type === 'hidden' || input.type === 'button' || input.type === 'submit' || input.type === 'checkbox') {
        continue;
      }
      
      var value = input.value ? input.value.trim() : '';
      if (value === '') {
        isValid = false;
        input.classList.add('invalid');
        var fieldName = input.id || input.name || 'поле';
        var errorMsg = 'Поле "' + fieldName + '" обязательно для заполнения';
        // Избегаем дублирования ошибок
        if (errors.indexOf(errorMsg) === -1) {
          errors.push(errorMsg);
          console.log('[Quiz] ❌ Validation error on tab', currentTab, '(required field):', errorMsg, 'element:', input);
        }
      } else {
        input.classList.remove('invalid');
      }
    }
    
    // Специальная проверка для data-required="phone-or-email" (хотя бы одно поле должно быть заполнено)
    var phoneOrEmailInputs = tab.querySelectorAll('[data-required="phone-or-email"]');
    if (phoneOrEmailInputs.length > 0) {
      var hasPhoneOrEmail = false;
      for (var i = 0; i < phoneOrEmailInputs.length; i++) {
        var input = phoneOrEmailInputs[i];
        var value = input.value ? input.value.trim() : '';
        // Для телефона игнорируем только "+7"
        if (input.type === 'tel') {
          if (value !== '' && value !== '+7' && validatePhone(value)) {
            hasPhoneOrEmail = true;
            input.classList.remove('invalid');
            break;
          }
        } else if (input.type === 'email') {
          if (value !== '' && validateEmail(value)) {
            hasPhoneOrEmail = true;
            input.classList.remove('invalid');
            break;
          }
        }
      }
      
      if (!hasPhoneOrEmail) {
        isValid = false;
        var errorMsg = 'Заполните хотя бы одно поле: телефон или email';
        if (errors.indexOf(errorMsg) === -1) {
          errors.push(errorMsg);
          console.log('[Quiz] ❌ Validation error on tab', currentTab, '(phone-or-email):', errorMsg);
        }
        // Помечаем все такие поля как невалидные
        for (var j = 0; j < phoneOrEmailInputs.length; j++) {
          phoneOrEmailInputs[j].classList.add('invalid');
        }
      }
    }
    
    // Показываем ошибки пользователю и логируем в консоль
    if (!isValid && errors.length > 0) {
      var errorMessage = errors.slice(0, 3).join('\n');
      if (errors.length > 3) {
        errorMessage += '\n... и еще ' + (errors.length - 3) + ' ошибок';
      }
      
      // Логируем все ошибки в консоль
      console.log('[Quiz] ❌ VALIDATION FAILED on tab', currentTab);
      console.log('[Quiz] Errors:', errors);
      console.log('[Quiz] Full error message:', errorMessage);
      console.log('[Quiz] Tab element:', tab);
      console.log('[Quiz] Tab HTML:', tab ? tab.innerHTML.substring(0, 200) : 'null');
      
      // Показываем модальное окно с ошибками вместо alert
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification(errorMessage);
      } else {
        // Fallback на alert если функция еще не загружена
        alert('Пожалуйста, исправьте ошибки:\n' + errorMessage);
      }
      
      // Прокручиваем к первой ошибке
      var firstInvalid = tab.querySelector('.invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() {
          firstInvalid.focus();
        }, 300);
      }
    }
    
    return isValid;
  }

  function nextPrev(n) {
    if (!tabs || tabs.length === 0) {
      // Не логируем ошибку, если квиза нет на странице (скрипт может быть загружен, но квиз не инициализирован)
      // Просто возвращаем false без логирования
      return false;
    }

    // ВАЛИДАЦИЯ: При переходе вперед проверяем текущий шаг
    if (n > 0) {
      console.log('[Quiz] nextPrev: Validating tab', currentTab, 'before moving forward');
      var validationResult = validateCurrentTab();
      console.log('[Quiz] nextPrev: Validation result for tab', currentTab, ':', validationResult);
      if (!validationResult) {
        console.log('[Quiz] nextPrev: Validation FAILED, blocking transition');
        return false;
      }
      console.log('[Quiz] nextPrev: Validation PASSED, allowing transition');
    }

    // Hide the current tab
    if (tabs[currentTab]) {
      tabs[currentTab].style.display = "none";
    }

    // Increase or decrease the current tab by 1
    currentTab = currentTab + n;

    // Проверяем границы
    if (currentTab < 0) {
      currentTab = 0;
    }
    if (currentTab >= tabs.length) {
      currentTab = tabs.length - 1;
    }

    // If you have reached the end of the form...
    if (currentTab >= tabs.length - 1 && n > 0) {
      console.log('[Quiz] nextPrev: Last step reached, validating before submit');
      // Финальная валидация перед отправкой
      if (!validateCurrentTab()) {
        console.log('[Quiz] nextPrev: Final validation FAILED, blocking submit');
        return false;
      }
      console.log('[Quiz] nextPrev: Final validation PASSED, calling submitQuizForm');
      // Вызываем функцию отправки формы и проверяем результат
      var submitResult = submitQuizForm();
      console.log('[Quiz] nextPrev: submitQuizForm returned:', submitResult);
      if (!submitResult) {
        console.log('[Quiz] nextPrev: submitQuizForm returned false, blocking submit');
        return false;
      }
      return false;
    }

    // Otherwise, display the correct tab
    showTab(currentTab);
    return true;
  }


  function fixStepIndicator(n) {
    var steps = document.getElementsByClassName("step");
    if (!steps || steps.length === 0) return;

    // Remove the "active" class of all steps
    for (var i = 0; i < steps.length; i++) {
      steps[i].className = steps[i].className.replace(" active", "");
    }

    // Add the "active" class to the current step
    if (steps[n]) {
      steps[n].className += " active";
    }
  }
  
  // Функции валидации телефона и email
  function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    phone = phone.trim();
    if (phone === '' || phone === '+7') return false;
    
    // Убираем все нецифровые символы кроме +
    var digits = phone.replace(/[^\d+]/g, '');
    // Проверяем формат: +7 и 10 цифр
    var phoneRegex = /^\+7\d{10}$/;
    if (phoneRegex.test(digits)) {
      return true;
    }
    
    // Также проверяем форматированный вариант: +7 (XXX) XXX-XX-XX
    var formattedRegex = /^\+7\s?\(\d{3}\)\s?\d{3}-\d{2}-\d{2}$/;
    return formattedRegex.test(phone);
  }
  
  function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    email = email.trim();
    if (email === '') return false;
    
    // Простая проверка формата email
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Функция валидации формы перед отправкой
  function validateQuizForm() {
    var form = document.getElementById("regForm") || document.getElementById("quizForm");
    if (!form) {
      console.log('[Quiz] ❌ Form not found for validation!');
      return false;
    }
    
    var isValid = true;
    var errors = [];
    var hasAnyData = false;
    
    // Получаем все вкладки
    var allTabs = document.getElementsByClassName("tab");
    if (!allTabs || allTabs.length === 0) {
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Ошибка: форма не найдена. Пожалуйста, обновите страницу.');
      } else {
        alert('Ошибка: форма не найдена. Пожалуйста, обновите страницу.');
      }
      return false;
    }
    
    // Флаг для отслеживания, есть ли хотя бы какие-то данные в форме
    var hasAnyData = false;
    
    // Проверяем все вкладки по порядку
    for (var tabIndex = 0; tabIndex < allTabs.length; tabIndex++) {
      var tab = allTabs[tabIndex];
      if (!tab) continue;
      
      // Вопросы 1, 2 и остальные (чекбоксы) - проверяем, что выбран хотя бы один
      if (tabIndex === 0 || tabIndex === 1 || tabIndex >= 5) {
        var checkboxes = tab.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length > 0) {
          var hasChecked = false;
          for (var i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked) {
              hasChecked = true;
              break;
            }
          }
          
          if (!hasChecked) {
            isValid = false;
            var questionNum = tabIndex === 0 ? '1' : tabIndex === 1 ? '2' : (tabIndex + 1).toString();
            errors.push('Вопрос ' + questionNum + ': выберите хотя бы один вариант');
            // Помечаем все чекбоксы как невалидные
            for (var j = 0; j < checkboxes.length; j++) {
              checkboxes[j].classList.add('invalid');
            }
          } else {
            // Убираем класс invalid если выбран хотя бы один
            for (var k = 0; k < checkboxes.length; k++) {
              checkboxes[k].classList.remove('invalid');
            }
            hasAnyData = true; // Отмечаем, что есть данные
          }
        }
      }
      
      // Вопрос 3 (tab 2) - обязательный, должен быть заполнен
      if (tabIndex === 2) {
        var question3Inputs = tab.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
        var question3Filled = false;
        
        for (var i = 0; i < question3Inputs.length; i++) {
          var input = question3Inputs[i];
          if (input.type === 'hidden' || input.type === 'button' || input.type === 'submit') {
            continue;
          }
          var value = input.value ? input.value.trim() : '';
          if (value !== '') {
            question3Filled = true;
            input.classList.remove('invalid');
            hasAnyData = true; // Отмечаем, что есть данные
            break;
          } else {
            input.classList.add('invalid');
          }
        }
        
        if (!question3Filled && question3Inputs.length > 0) {
          isValid = false;
          errors.push('Вопрос 3 обязателен для заполнения');
        }
      }
      
      // Вопрос 4 (tab 3) - промокод, проверяем валидность
      if (tabIndex === 3) {
        var question4Inputs = tab.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
        var promocodeInput = null;
        var promocodeValue = '';
        
        // Находим поле промокода
        for (var i = 0; i < question4Inputs.length; i++) {
          var input = question4Inputs[i];
          if (input.type === 'hidden' || input.type === 'button' || input.type === 'submit') {
            continue;
          }
          var name = input.name || '';
          var id = input.id || '';
          if (name.toLowerCase().includes('promo') || id.toLowerCase().includes('promo')) {
            promocodeInput = input;
            promocodeValue = input.value ? input.value.trim() : '';
            break;
          }
        }
        
        // Если поле промокода найдено и заполнено, проверяем валидность
        if (promocodeInput && promocodeValue !== '') {
          // Проверяем промокод через API (асинхронно)
          // Показываем индикатор загрузки
          promocodeInput.style.borderColor = '#ffbb00';
          var loadingMsg = tab.querySelector('.promocode-loading');
          if (!loadingMsg) {
            loadingMsg = document.createElement('div');
            loadingMsg.className = 'promocode-loading';
            loadingMsg.style.cssText = 'color: #ffbb00; font-size: 12px; margin-top: 5px;';
            loadingMsg.textContent = 'Проверка промокода...';
            promocodeInput.parentNode.appendChild(loadingMsg);
          }
          
          // Проверяем промокод
          fetch(window.location.origin + '/api/promotions/validate-promo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promoCode: promocodeValue })
          })
          .then(function(response) {
            return response.json();
          })
          .then(function(data) {
            if (loadingMsg) loadingMsg.remove();
            
            if (data.valid) {
              promocodeInput.style.borderColor = '#4caf50';
              promocodeInput.classList.remove('invalid');
              promocodeInput.classList.add('valid');
              var successMsg = tab.querySelector('.promocode-success');
              if (!successMsg) {
                successMsg = document.createElement('div');
                successMsg.className = 'promocode-success';
                successMsg.style.cssText = 'color: #4caf50; font-size: 12px; margin-top: 5px;';
                promocodeInput.parentNode.appendChild(successMsg);
              }
              var discountText = '';
              if (data.promotion.discountPercent > 0) {
                discountText = 'Скидка ' + data.promotion.discountPercent + '%';
              } else if (data.promotion.discountAmount > 0) {
                discountText = 'Скидка ' + data.promotion.discountAmount + ' руб.';
              }
              successMsg.textContent = '✓ Промокод действителен! ' + discountText;
              hasAnyData = true;
            } else {
              promocodeInput.style.borderColor = '#f44336';
              promocodeInput.classList.add('invalid');
              promocodeInput.classList.remove('valid');
              var errorMsg = tab.querySelector('.promocode-error');
              if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'promocode-error';
                errorMsg.style.cssText = 'color: #f44336; font-size: 12px; margin-top: 5px;';
                promocodeInput.parentNode.appendChild(errorMsg);
              }
              errorMsg.textContent = '✗ ' + (data.error || 'Промокод недействителен');
              isValid = false;
              errors.push('Промокод недействителен');
            }
          })
          .catch(function(error) {
            if (loadingMsg) loadingMsg.remove();
            console.log('[Quiz] Error validating promo code:', error);
            // При ошибке сети не блокируем отправку, но помечаем как невалидный
            promocodeInput.style.borderColor = '#ff9800';
            promocodeInput.classList.add('invalid');
            var errorMsg = tab.querySelector('.promocode-error');
            if (!errorMsg) {
              errorMsg = document.createElement('div');
              errorMsg.className = 'promocode-error';
              errorMsg.style.cssText = 'color: #ff9800; font-size: 12px; margin-top: 5px;';
              promocodeInput.parentNode.appendChild(errorMsg);
            }
            errorMsg.textContent = '⚠ Ошибка проверки промокода. Попробуйте позже.';
          });
        } else if (question4Inputs.length > 0) {
          // Поле промокода не заполнено - необязательное, но можно предупредить
          // Не блокируем отправку, но можно показать подсказку
        }
      }
      
      // Контакты (tab 4) - имя, телефон и email обязательны
      if (tabIndex === 4) {
        var nameField = form.querySelector('#quiz-name');
        var phoneField = form.querySelector('#quiz-tel');
        var emailField = form.querySelector('#quiz-email');
        
        // Проверка имени
        if (nameField) {
          var nameValue = nameField.value ? nameField.value.trim() : '';
          if (nameValue === '') {
            isValid = false;
            nameField.classList.add('invalid');
            errors.push('Имя обязательно для заполнения');
          } else {
            nameField.classList.remove('invalid');
            hasAnyData = true; // Отмечаем, что есть данные
          }
        }
        
        // Проверка телефона
        if (phoneField) {
          var phoneValue = phoneField.value ? phoneField.value.trim() : '';
          if (phoneValue === '' || phoneValue === '+7') {
            isValid = false;
            phoneField.classList.add('invalid');
            errors.push('Телефон обязателен для заполнения');
          } else if (!validatePhone(phoneValue)) {
            isValid = false;
            phoneField.classList.add('invalid');
            errors.push('Неверный формат телефона');
          } else {
            phoneField.classList.remove('invalid');
            hasAnyData = true; // Отмечаем, что есть данные
          }
        }
        
        // Проверка email
        if (emailField) {
          var emailValue = emailField.value ? emailField.value.trim() : '';
          if (emailValue === '') {
            isValid = false;
            emailField.classList.add('invalid');
            errors.push('Email обязателен для заполнения');
          } else if (!validateEmail(emailValue)) {
            isValid = false;
            emailField.classList.add('invalid');
            errors.push('Неверный формат email');
          } else {
            emailField.classList.remove('invalid');
            hasAnyData = true; // Отмечаем, что есть данные
          }
        }
      }
    }
    
    // Дополнительная проверка: если форма полностью пустая, блокируем отправку
    if (hasAnyData === false) {
      isValid = false;
      if (errors.length === 0) {
        errors.push('Заполните хотя бы одно поле формы');
      }
    }
    
    // Показываем ошибки пользователю
    if (!isValid && errors.length > 0) {
      var errorMessage = 'Пожалуйста, исправьте ошибки:\n' + errors.slice(0, 5).join('\n');
      if (errors.length > 5) {
        errorMessage += '\n... и еще ' + (errors.length - 5) + ' ошибок';
      }
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification(errorMessage);
      } else {
        alert(errorMessage);
      }
      
      // Прокручиваем к первой ошибке
      var firstInvalid = form.querySelector('.invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() {
          firstInvalid.focus();
        }, 300);
      }
    }
    
    return isValid;
  }
  
  // Реализация функции отправки формы
  submitQuizForm = function() {
    console.log('[Quiz] ========== submitQuizForm CALLED ==========');
    
    var form = document.getElementById("regForm") || document.getElementById("quizForm");
    if (!form) {
      console.log('[Quiz] submitQuizForm: Form not found!');
      return false;
    }
    
    console.log('[Quiz] submitQuizForm: Form found:', form.id);
    
    // ВАЛИДАЦИЯ: Проверяем форму перед отправкой
    console.log('[Quiz] submitQuizForm: Starting validateQuizForm()...');
    var validationResult = validateQuizForm();
    console.log('[Quiz] submitQuizForm: validateQuizForm() returned:', validationResult);
    
    if (!validationResult) {
      console.log('[Quiz] submitQuizForm: Validation FAILED, blocking submit');
      return false;
    }
    
    console.log('[Quiz] submitQuizForm: Validation PASSED, proceeding with submit');
    
    // Проверяем чекбокс согласия на обработку персональных данных
    // Ищем чекбокс разными способами
    var consentCheckbox = null;
    
    // Способ 1: по классу
    consentCheckbox = form.querySelector('.privacy-consent-checkbox input[type="checkbox"]');
    
    // Способ 2: по name
    if (!consentCheckbox) {
      consentCheckbox = form.querySelector('input[name="privacy_consent"]');
    }
    
    // Способ 3: по name с частичным совпадением
    if (!consentCheckbox) {
      consentCheckbox = form.querySelector('input[type="checkbox"][name*="privacy"]');
    }
    
    // Способ 4: по тексту label (ищем чекбокс рядом с текстом о согласии)
    if (!consentCheckbox) {
      var allCheckboxes = form.querySelectorAll('input[type="checkbox"]');
      for (var i = 0; i < allCheckboxes.length; i++) {
        var cb = allCheckboxes[i];
        var label = cb.closest('label') || (cb.id && form.querySelector('label[for="' + cb.id + '"]'));
        if (label) {
          var labelText = (label.textContent || '').toLowerCase();
          if (labelText.indexOf('соглас') !== -1 || labelText.indexOf('персональн') !== -1 || 
              labelText.indexOf('privacy') !== -1 || labelText.indexOf('конфиденциальн') !== -1) {
            consentCheckbox = cb;
            break;
          }
        }
      }
    }
    
    // Способ 5: ищем в последнем табе (где обычно находится согласие)
    if (!consentCheckbox) {
      var tabs = form.querySelectorAll('.tab');
      if (tabs.length > 0) {
        var lastTab = tabs[tabs.length - 1];
        var checkboxesInLastTab = lastTab.querySelectorAll('input[type="checkbox"]');
        for (var j = 0; j < checkboxesInLastTab.length; j++) {
          var cb2 = checkboxesInLastTab[j];
          var label2 = cb2.closest('label') || (cb2.id && form.querySelector('label[for="' + cb2.id + '"]'));
          if (label2) {
            var labelText2 = (label2.textContent || '').toLowerCase();
            if (labelText2.indexOf('соглас') !== -1 || labelText2.indexOf('персональн') !== -1 || 
                labelText2.indexOf('privacy') !== -1 || labelText2.indexOf('конфиденциальн') !== -1) {
              consentCheckbox = cb2;
              break;
            }
          }
        }
      }
    }
    
    console.log('[Quiz] submitQuizForm: Consent checkbox found:', !!consentCheckbox, 'Checked:', consentCheckbox ? consentCheckbox.checked : false);
    
    if (!consentCheckbox || !consentCheckbox.checked) {
      console.log('[Quiz] submitQuizForm: Privacy consent checkbox not checked!');
      console.log('[Quiz] submitQuizForm: Checkbox element:', consentCheckbox);
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Необходимо согласие на обработку персональных данных');
      } else {
        alert('Необходимо согласие на обработку персональных данных');
      }
      if (consentCheckbox) {
        consentCheckbox.focus();
        consentCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    
    // Собираем данные формы
    var formData = new FormData(form);
    var data = {};
    var hasData = false;
    var hasRequiredData = false;
    
    // Сначала собираем все чекбоксы вручную (FormData не включает неотмеченные)
    var allCheckboxes = form.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < allCheckboxes.length; i++) {
      var checkbox = allCheckboxes[i];
      var checkboxName = checkbox.name;
      if (checkboxName && !checkboxName.startsWith('_') && checkboxName !== 'csrf' && checkboxName !== 'token') {
        if (checkbox.checked) {
          data[checkboxName] = checkbox.value || 'true';
          hasData = true;
        }
      }
    }
    
    // Затем собираем остальные поля
    for (var pair of formData.entries()) {
      var value = pair[1];
      var fieldName = pair[0];
      
      // Пропускаем скрытые поля и служебные поля
      if (fieldName.startsWith('_') || fieldName === 'csrf' || fieldName === 'token') {
        continue;
      }
      
      // Пропускаем чекбоксы, они уже обработаны выше
      if (form.querySelector('input[type="checkbox"][name="' + fieldName + '"]')) {
        continue;
      }
      
      if (value && value.trim() !== '') {
        // Проверяем, что это не пустое значение (например, не только пробелы)
        var trimmedValue = value.trim();
        if (trimmedValue !== '' && trimmedValue !== '+7') {
          data[fieldName] = trimmedValue;
          hasData = true;
          
          // Проверяем, что это не пустое значение для обязательных полей
          if (fieldName === 'quiz-name' || fieldName === 'quiz-tel' || fieldName === 'quiz-email') {
            hasRequiredData = true;
          }
        }
      }
    }
    
    // Дополнительная проверка: форма не должна быть полностью пустой
    if (!hasData || Object.keys(data).length === 0) {
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Пожалуйста, заполните хотя бы одно поле формы');
      } else {
        alert('Пожалуйста, заполните хотя бы одно поле формы');
      }
      return false;
    }
    
    // Проверяем, что заполнены обязательные поля (имя, телефон, email)
    var nameValue = data['quiz-name'] ? data['quiz-name'].trim() : '';
    var telValue = data['quiz-tel'] ? data['quiz-tel'].trim() : '';
    var emailValue = data['quiz-email'] ? data['quiz-email'].trim() : '';
    
    if (!nameValue || nameValue === '') {
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Пожалуйста, заполните поле "Имя"');
      } else {
        alert('Пожалуйста, заполните поле "Имя"');
      }
      return false;
    }
    
    if (!telValue || telValue === '' || telValue === '+7') {
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Пожалуйста, заполните поле "Телефон"');
      } else {
        alert('Пожалуйста, заполните поле "Телефон"');
      }
      return false;
    }
    
    if (!emailValue || emailValue === '') {
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Пожалуйста, заполните поле "Email"');
      } else {
        alert('Пожалуйста, заполните поле "Email"');
      }
      return false;
    }
    
    // Проверяем формат телефона и email еще раз
    if (!validatePhone(telValue)) {
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Пожалуйста, введите корректный номер телефона');
      } else {
        alert('Пожалуйста, введите корректный номер телефона');
      }
      return false;
    }
    
    if (!validateEmail(emailValue)) {
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Пожалуйста, введите корректный email адрес');
      } else {
        alert('Пожалуйста, введите корректный email адрес');
      }
      return false;
    }
    
    // Отправляем через API
    var API_BASE = (typeof window !== 'undefined' && window.location) 
      ? window.location.origin 
      : '';
    var formId = 'quiz-form';
    
    if (!data['quiz-name'] || !data['quiz-tel'] || !data['quiz-email']) {
      var QUIZ_DEBUG_REQUIRED = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (QUIZ_DEBUG_REQUIRED) {
        console.log('[Quiz] CRITICAL: Required fields missing!');
      }
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Ошибка: не заполнены обязательные поля. Форма не будет отправлена.');
      } else {
        alert('Ошибка: не заполнены обязательные поля. Форма не будет отправлена.');
      }
      return false;
    }
    
    console.log('[Quiz] submitQuizForm: Sending data to server:', data);
    console.log('[Quiz] submitQuizForm: API URL:', API_BASE + '/api/forms/' + formId + '/submit');
    
    fetch(API_BASE + '/api/forms/' + formId + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(function(response) {
      console.log('[Quiz] submitQuizForm: Response status:', response.status, response.statusText);
      if (response.ok) {
        return response.json();
      } else {
        return response.text().then(function(text) {
          console.log('[Quiz] submitQuizForm: Error response body:', text);
          var errorMessage = 'Failed to submit form: ' + response.status;
          try {
            var errorData = JSON.parse(text);
            if (errorData.error) {
              errorMessage += ' - ' + errorData.error;
            }
          } catch (e) {
            errorMessage += ' - ' + text.substring(0, 100);
          }
          throw new Error(errorMessage);
        });
      }
    }).then(function(result) {
      console.log('[Quiz] submitQuizForm: Success! Result:', result);
      if (typeof window.showSuccessNotification === 'function') {
        window.showSuccessNotification('Спасибо! Ваша заявка отправлена.');
      } else {
        alert('Спасибо! Ваша заявка отправлена.');
      }
      form.reset();
      currentTab = 0;
      showTab(0);
      return true;
    }).catch(function(error) {
      console.log('[Quiz] Error submitting form:', error);
      console.log('[Quiz] Error stack:', error.stack);
      if (typeof window.showErrorNotification === 'function') {
        window.showErrorNotification('Произошла ошибка при отправке формы: ' + (error.message || 'Неизвестная ошибка') + '. Пожалуйста, попробуйте еще раз.');
      } else {
        alert('Произошла ошибка при отправке формы: ' + (error.message || 'Неизвестная ошибка') + '. Пожалуйста, попробуйте еще раз.');
      }
      return false;
    });
    
    return true;
  };
  
  // КРИТИЧНО: Экспортируем submitQuizForm СРАЗУ после определения
  try {
    if (typeof submitQuizForm === 'function') {
      window.submitQuizForm = submitQuizForm;
    } else {
      window.submitQuizForm = window.submitQuizForm || function() { return false; };
    }
  } catch (e) {
    window.submitQuizForm = window.submitQuizForm || function() { return false; };
  }

  // КРИТИЧНО: Глобальные обработчики для делегирования событий
  // Эти обработчики работают даже если кнопки появляются асинхронно
  var quizEventDelegationAttached = false;
  var quizMutationObserver = null;
  
  // Глобальный перехват всех submit событий для quiz форм
  function setupGlobalFormInterception() {
    // Перехватываем все submit события на уровне document
    document.addEventListener('submit', function(e) {
      var target = e.target;
      if (target && (target.id === 'regForm' || target.id === 'quizForm')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Вызываем нашу функцию валидации и отправки
        if (typeof submitQuizForm === 'function') {
          submitQuizForm();
        } else if (typeof window.submitQuizForm === 'function') {
          window.submitQuizForm();
        }
        
        return false;
      }
    }, true); // Используем capture фазу для перехвата до других обработчиков
  }
  
  // Устанавливаем глобальный перехват сразу
  setupGlobalFormInterception();
  
  // Функция для установки делегирования событий
  // КРИТИЧНО: Используем глобальное делегирование на document для максимальной надежности
  function setupEventDelegation() {
    if (quizEventDelegationAttached) {
      return; // Уже установлено
    }
    
    // КРИТИЧНО: Проверяем наличие квиза на странице перед установкой делегирования
    if (!hasQuizOnPage()) {
      // Квиза нет на странице - не устанавливаем делегирование
      return;
    }
    
    // Проверяем, что функции nextPrev и showTab определены
    if (typeof nextPrev !== 'function' || typeof showTab !== 'function') {
      setTimeout(setupEventDelegation, 100);
      return;
    }
    
  // Обработчик для кнопки Next через глобальное делегирование
  var nextBtnDelegationHandler = function(e) {
    var target = e.target || e.srcElement;
    
    // СНАЧАЛА проверяем, находится ли кнопка внутри формы квиза
    // Это предотвращает перехват кнопок из других частей страницы
    var quizForm = null;
    try {
      if (target && typeof target.closest === 'function') {
        quizForm = target.closest('form');
      }
    } catch (err) {
      // ignore
    }
    
    // Если не нашли форму через closest, проверяем родительские элементы
    if (!quizForm && target) {
      var parent = target.parentElement;
      var depth = 0;
      while (parent && depth < 10) {
        if (parent.tagName && parent.tagName.toLowerCase() === 'form') {
          quizForm = parent;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }
    
    // Если кнопка не находится внутри формы квиза, не обрабатываем
    if (!quizForm || (quizForm.id !== 'regForm' && quizForm.id !== 'quizForm')) {
      return;
    }
    
    // Теперь проверяем, что клик был по кнопке Next квиза
    var isNextBtn = false;
    if (target) {
      isNextBtn = target.id === 'nextBtn' || 
                 target.getAttribute('id') === 'nextBtn';
    }
    
    // Также проверяем родительские элементы (но только внутри формы квиза)
    if (!isNextBtn && target) {
      var parent = target.parentElement;
      var depth = 0;
      while (parent && depth < 3 && quizForm.contains(parent)) {
        if (parent.id === 'nextBtn' || parent.getAttribute('id') === 'nextBtn') {
          isNextBtn = true;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }
    
    // НЕ проверяем текст "Далее" или "Отправить" для кнопок вне формы квиза
    // Это предотвращает перехват кнопок из других частей сайта
    if (!isNextBtn) {
      return;
    }

    // КРИТИЧНО: Проверяем наличие квиза (вкладок) перед обработкой
    // Если квиза нет на странице, не перехватываем событие
    var currentTabs = quizForm.getElementsByClassName("tab");
    if (!currentTabs || currentTabs.length === 0) {
      // Квиза нет на странице — не перехватываем
      return;
    }
    
    // Дополнительная проверка: убеждаемся, что кнопка nextBtn действительно внутри формы квиза
    // и что квиз инициализирован (есть кнопка prevBtn внутри той же формы)
    var prevBtnInForm = quizForm.querySelector('#prevBtn');
    if (!prevBtnInForm) {
      // Квиз не инициализирован или кнопки не на месте — не перехватываем
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Получаем актуальные значения только внутри формы квиза
    var nextBtn = document.getElementById("nextBtn");
    var currentTabValue = currentTab;
    
    console.log('[Quiz] Delegation handler: Next button clicked, currentTab:', currentTabValue);
    
    // Если это последний шаг - вызываем отправку формы
    if (currentTabValue >= (currentTabs ? currentTabs.length - 1 : 0)) {
      console.log('[Quiz] Delegation handler: Last step, calling submitQuizForm');
      if (typeof ym !== 'undefined' && nextBtn && nextBtn.getAttribute('data-ym-goal')) {
        try {
          ym(88795306, 'reachGoal', nextBtn.getAttribute('data-ym-goal'));
        } catch (err) {
          // ignore YM errors
        }
      }
      if (typeof submitQuizForm === 'function') {
        submitQuizForm();
      } else if (typeof window.submitQuizForm === 'function') {
        window.submitQuizForm();
      }
      return false;
    }
    
    // Переходим на следующий шаг через nextPrev (он сам проверит валидацию)
    console.log('[Quiz] Delegation handler: Calling nextPrev(1) - it will validate');
    if (typeof nextPrev === 'function') {
      try {
        var result = nextPrev(1);
        console.log('[Quiz] Delegation handler: nextPrev(1) returned:', result);
      } catch (err) {
        // Если возникла ошибка (например, tabs не инициализированы), пропускаем событие
        console.log('[Quiz] Error calling nextPrev:', err);
        return;
      }
    } else if (typeof window.nextPrev === 'function') {
      try {
        var result = window.nextPrev(1);
        console.log('[Quiz] Delegation handler: window.nextPrev(1) returned:', result);
      } catch (err) {
        console.log('[Quiz] Error calling window.nextPrev:', err);
        return;
      }
    }
    return false;
  };
    
  // Обработчик для кнопки Prev через глобальное делегирование
  var prevBtnDelegationHandler = function(e) {
    var target = e.target || e.srcElement;
    
    // СНАЧАЛА проверяем, находится ли кнопка внутри формы квиза
    // Это предотвращает перехват кнопок из других частей страницы
    var quizForm = null;
    try {
      if (target && typeof target.closest === 'function') {
        quizForm = target.closest('form');
      }
    } catch (err) {
      // ignore
    }
    
    // Если не нашли форму через closest, проверяем родительские элементы
    if (!quizForm && target) {
      var parent = target.parentElement;
      var depth = 0;
      while (parent && depth < 10) {
        if (parent.tagName && parent.tagName.toLowerCase() === 'form') {
          quizForm = parent;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }
    
    // Если кнопка не находится внутри формы квиза, не обрабатываем
    if (!quizForm || (quizForm.id !== 'regForm' && quizForm.id !== 'quizForm')) {
      return;
    }
    
    // Теперь проверяем, что клик был по кнопке Prev квиза
    var isPrevBtn = false;
    if (target) {
      isPrevBtn = target.id === 'prevBtn' || 
                 target.getAttribute('id') === 'prevBtn';
    }
    
    // Также проверяем родительские элементы (но только внутри формы квиза)
    if (!isPrevBtn && target) {
      var parent = target.parentElement;
      var depth = 0;
      while (parent && depth < 3 && quizForm.contains(parent)) {
        if (parent.id === 'prevBtn' || parent.getAttribute('id') === 'prevBtn') {
          isPrevBtn = true;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }
    
    // НЕ проверяем текст "Назад" для кнопок вне формы квиза
    // Это предотвращает перехват кнопок из каталога и других частей сайта
    if (!isPrevBtn) {
      return;
    }

    // КРИТИЧНО: Проверяем наличие квиза (вкладок) перед обработкой
    // Если квиза нет на странице, не перехватываем событие
    var quizTabs = quizForm ? quizForm.getElementsByClassName("tab") : document.getElementsByClassName("tab");
    if (!quizTabs || quizTabs.length === 0) {
      // Квиза нет на странице — не перехватываем
      return;
    }
    
    // Дополнительная проверка: убеждаемся, что кнопка prevBtn действительно внутри формы квиза
    // и что квиз инициализирован (есть кнопка nextBtn внутри той же формы)
    var nextBtnInForm = quizForm.querySelector('#nextBtn');
    if (!nextBtnInForm) {
      // Квиз не инициализирован или кнопки не на месте — не перехватываем
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Проверяем, что функция nextPrev доступна и квиз инициализирован
    // Вызываем nextPrev только если она определена в локальной области видимости
    if (typeof nextPrev === 'function') {
      try {
        nextPrev(-1);
      } catch (err) {
        // Если возникла ошибка (например, tabs не инициализированы), пропускаем событие
        console.log('[Quiz] Error calling nextPrev:', err);
        return;
      }
    } else if (typeof window.nextPrev === 'function') {
      try {
        window.nextPrev(-1);
      } catch (err) {
        console.log('[Quiz] Error calling window.nextPrev:', err);
        return;
      }
    }
    return false;
  };
    
    // КРИТИЧНО: Устанавливаем делегирование на document с capture фазой
    // Это гарантирует, что обработчики сработают ДО любых других обработчиков
    document.removeEventListener('click', nextBtnDelegationHandler, true);
    document.removeEventListener('click', prevBtnDelegationHandler, true);
    document.addEventListener('click', nextBtnDelegationHandler, true);
    document.addEventListener('click', prevBtnDelegationHandler, true);
    
    quizEventDelegationAttached = true;
  }
  
  // Функция для установки MutationObserver
  function setupMutationObserver() {
    if (quizMutationObserver) {
      return; // Уже установлен
    }
    
    var form = document.getElementById("regForm") || document.getElementById("quizForm");
    var container = form || document.body;
    
    quizMutationObserver = new MutationObserver(function(mutations) {
      var nextBtn = document.getElementById("nextBtn");
      var prevBtn = document.getElementById("prevBtn");
      
      if (nextBtn && prevBtn) {
        // Кнопки появились, устанавливаем обработчики напрямую
        attachEventHandlersDirect();
      }
    });
    
    quizMutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }
  
  // Прямая установка обработчиков на кнопки (когда они уже в DOM)
  function attachEventHandlersDirect() {
    // Ищем кнопки в разных местах - может быть в контейнере PublicPageRenderer
    var prevBtn = document.getElementById("prevBtn");
    var nextBtn = document.getElementById("nextBtn");
    
    // Если не нашли через getElementById, пробуем через querySelector (может быть в контейнере)
    if (!prevBtn) {
      prevBtn = document.querySelector("#prevBtn");
    }
    if (!nextBtn) {
      nextBtn = document.querySelector("#nextBtn");
    }
    
    // Также пробуем найти в контейнере PublicPageRenderer
    var container = document.querySelector('[data-public-page-container]');
    if (container) {
      if (!prevBtn) {
        prevBtn = container.querySelector("#prevBtn");
      }
      if (!nextBtn) {
        nextBtn = container.querySelector("#nextBtn");
      }
    }
    
    if (!prevBtn || !nextBtn) {
      return false;
    }
    
    // Обработчики (те же, что в делегировании)
    var prevBtnHandler = function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (typeof nextPrev === 'function') {
        nextPrev(-1);
      } else if (typeof window.nextPrev === 'function') {
        window.nextPrev(-1);
      }
      return false;
    };
    
    var nextBtnHandler = function(e) {
      console.log('[Quiz] nextBtnHandler: Button clicked!');
      
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // КРИТИЧНО: Валидируем текущий шаг ПЕРЕД переходом
      if (currentTab !== 0) {
        console.log('[Quiz] nextBtnHandler: Validating tab', currentTab, 'before transition');
        if (!validateCurrentTab()) {
          console.log('[Quiz] nextBtnHandler: Validation FAILED, blocking transition');
          return false;
        }
        console.log('[Quiz] nextBtnHandler: Validation PASSED, allowing transition');
      }
      
      if (currentTab >= (tabs ? tabs.length - 1 : 0)) {
        console.log('[Quiz] nextBtnHandler: Last step, calling submitQuizForm');
        if (typeof ym !== 'undefined' && nextBtn.getAttribute('data-ym-goal')) {
          try {
            ym(88795306, 'reachGoal', nextBtn.getAttribute('data-ym-goal'));
          } catch (err) {
            // ignore YM errors
          }
        }
        submitQuizForm();
        return false;
      }
      
      // Переходим на следующий шаг через nextPrev (он тоже проверит валидацию, но это безопасно)
      if (typeof nextPrev === 'function') {
        console.log('[Quiz] nextBtnHandler: Calling nextPrev(1)');
        nextPrev(1);
      } else if (typeof window.nextPrev === 'function') {
        console.log('[Quiz] nextBtnHandler: Calling window.nextPrev(1)');
        window.nextPrev(1);
      }
      return false;
    };
    
    // Устанавливаем обработчики
    if (prevBtn) {
      // Устанавливаем обработчик через onclick (более надежно)
      prevBtn.onclick = prevBtnHandler;
      // Также через addEventListener для совместимости
      prevBtn.addEventListener('click', prevBtnHandler, false);
    }
    
    if (nextBtn) {
      // КРИТИЧНО: Устанавливаем type="button" чтобы предотвратить отправку формы
      nextBtn.type = "button";
      nextBtn.setAttribute("type", "button");
      nextBtn.removeAttribute("form");
      
      // Устанавливаем обработчик через onclick (более надежно)
      nextBtn.onclick = nextBtnHandler;
      // Также через addEventListener для совместимости
      nextBtn.addEventListener('click', nextBtnHandler, false);
      
      // НЕ устанавливаем inline onclick - это обходит валидацию!
      // Вместо этого используем только addEventListener и onclick property
    }
    
    console.log('[Quiz] ✅ Direct handlers attached to buttons');
    return true;
  }
  
  // Функция для проверки промокода в реальном времени
  var validatePromoCodeRealTime = function(input) {
    var promoCode = input.value ? input.value.trim() : '';
    if (!promoCode || promoCode.length < 3) {
      // Убираем сообщения если промокод слишком короткий
      var loadingMsg = input.parentNode.querySelector('.promocode-loading');
      var successMsg = input.parentNode.querySelector('.promocode-success');
      var errorMsg = input.parentNode.querySelector('.promocode-error');
      if (loadingMsg) loadingMsg.remove();
      if (successMsg) successMsg.remove();
      if (errorMsg) errorMsg.remove();
      input.style.borderColor = '';
      input.classList.remove('invalid', 'valid');
      return;
    }
    
    // Показываем индикатор загрузки
    input.style.borderColor = '#ffbb00';
    var loadingMsg = input.parentNode.querySelector('.promocode-loading');
    if (!loadingMsg) {
      loadingMsg = document.createElement('div');
      loadingMsg.className = 'promocode-loading';
      loadingMsg.style.cssText = 'color: #ffbb00; font-size: 12px; margin-top: 5px;';
      input.parentNode.appendChild(loadingMsg);
    }
    loadingMsg.textContent = 'Проверка промокода...';
    
    // Удаляем старые сообщения
    var successMsg = input.parentNode.querySelector('.promocode-success');
    var errorMsg = input.parentNode.querySelector('.promocode-error');
    if (successMsg) successMsg.remove();
    if (errorMsg) errorMsg.remove();
    
    // Проверяем промокод
    fetch(window.location.origin + '/api/promotions/validate-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promoCode: promoCode })
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      if (loadingMsg) loadingMsg.remove();
      
      if (data.valid) {
        input.style.borderColor = '#4caf50';
        input.classList.remove('invalid');
        input.classList.add('valid');
        var successMsg = document.createElement('div');
        successMsg.className = 'promocode-success';
        successMsg.style.cssText = 'color: #4caf50; font-size: 12px; margin-top: 5px;';
        var discountText = '';
        if (data.promotion.discountPercent > 0) {
          discountText = 'Скидка ' + data.promotion.discountPercent + '%';
        } else if (data.promotion.discountAmount > 0) {
          discountText = 'Скидка ' + data.promotion.discountAmount + ' руб.';
        }
        successMsg.textContent = '✓ Промокод действителен! ' + discountText;
        input.parentNode.appendChild(successMsg);
      } else {
        input.style.borderColor = '#f44336';
        input.classList.add('invalid');
        input.classList.remove('valid');
        var errorMsg = document.createElement('div');
        errorMsg.className = 'promocode-error';
        errorMsg.style.cssText = 'color: #f44336; font-size: 12px; margin-top: 5px;';
        errorMsg.textContent = '✗ ' + (data.error || 'Промокод недействителен');
        input.parentNode.appendChild(errorMsg);
      }
    })
    .catch(function(error) {
      if (loadingMsg) loadingMsg.remove();
      console.log('[Quiz] Error validating promo code:', error);
      // При ошибке сети не показываем ошибку, просто сбрасываем стиль
      input.style.borderColor = '';
      input.classList.remove('invalid', 'valid');
    });
  };
  
  // Привязка обработчиков к кнопкам
  var attachEventHandlers = function() {
    // КРИТИЧНО: Всегда устанавливаем ГЛОБАЛЬНОЕ делегирование событий ПЕРВЫМ ДЕЛОМ
    // Это работает даже если кнопок и формы еще нет в DOM
    setupEventDelegation();
    
    // Устанавливаем MutationObserver для отслеживания появления кнопок
    setupMutationObserver();
    
    // Получаем форму и кнопки
    var form = document.getElementById("regForm") || document.getElementById("quizForm");
    var prevBtn = document.getElementById("prevBtn");
    var nextBtn = document.getElementById("nextBtn");
    
    // Находим поле промокода и добавляем обработчик для проверки в реальном времени
    if (form) {
      var promocodeInputs = form.querySelectorAll('input[name*="promo"], input[id*="promo"], input[type="text"]');
      for (var i = 0; i < promocodeInputs.length; i++) {
        var input = promocodeInputs[i];
        var name = input.name || '';
        var id = input.id || '';
        if (name.toLowerCase().includes('promo') || id.toLowerCase().includes('promo')) {
          // Добавляем обработчик с задержкой (debounce)
          var timeoutId = null;
          input.addEventListener('input', function(e) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(function() {
              validatePromoCodeRealTime(e.target);
            }, 500); // Проверяем через 500ms после окончания ввода
          });
          // Также проверяем при потере фокуса
          input.addEventListener('blur', function(e) {
            clearTimeout(timeoutId);
            if (e.target.value && e.target.value.trim() !== '') {
              validatePromoCodeRealTime(e.target);
            }
          });
          console.log('[Quiz] ✅ Promocode input handler attached');
          break;
        }
      }
    }
    
    // Перехватываем отправку формы для валидации
    if (form) {
      // Обработчик для события submit
      var submitHandler = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Используем функцию валидации и отправки
        if (typeof submitQuizForm === 'function') {
          submitQuizForm();
        } else if (typeof window.submitQuizForm === 'function') {
          window.submitQuizForm();
        }
        
        return false;
      };
      
      // Удаляем старые обработчики если есть
      form.removeEventListener('submit', submitHandler, true);
      
      // Устанавливаем обработчик с использованием capture фазы
      form.addEventListener('submit', submitHandler, true);
      
      // Также перехватываем нативную отправку через атрибут onsubmit
      form.onsubmit = function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof submitQuizForm === 'function') {
          var result = submitQuizForm();
          if (!result) {
            console.warn('[Quiz] ⚠️  Form submission blocked by validation');
            return false;
          }
        } else if (typeof window.submitQuizForm === 'function') {
          var result = window.submitQuizForm();
          if (!result) {
            console.warn('[Quiz] ⚠️  Form submission blocked by validation');
            return false;
          }
        }
        return false;
      };
      
      // Дополнительно: перехватываем прямые вызовы form.submit()
      // Сохраняем оригинальный метод submit
      var originalSubmit = HTMLFormElement.prototype.submit;
      
      // Переопределяем метод submit для этой формы
      Object.defineProperty(form, 'submit', {
        value: function() {
          console.log('[Quiz] 🚨 Form.submit() called directly!');
          if (typeof submitQuizForm === 'function') {
            var result = submitQuizForm();
            if (!result) {
              console.warn('[Quiz] ⚠️  Form submission blocked by validation');
              return false;
            }
          } else if (typeof window.submitQuizForm === 'function') {
            var result = window.submitQuizForm();
            if (!result) {
              console.warn('[Quiz] ⚠️  Form submission blocked by validation');
              return false;
            }
          }
          return false;
        },
        writable: true,
        configurable: true
      });
    }
    
    if (prevBtn && nextBtn) {
      // Кнопки есть, устанавливаем обработчики напрямую (дополнительно к делегированию)
      attachEventHandlersDirect();
      console.log('[Quiz] ✅ Direct handlers attached (in addition to delegation)');
      return true;
    } else {
      console.log('[Quiz] ⏳ Buttons not found yet, but GLOBAL delegation is active - handlers will work when buttons appear');
      return true; // Возвращаем true, так как глобальное делегирование установлено
    }
  };
  
  // КРИТИЧНО: Экспортируем attachEventHandlers СРАЗУ после определения
  // ВАЖНО: Перезаписываем заглушки реальными функциями
  try {
    if (typeof attachEventHandlers === 'function') {
      window.attachEventHandlers = attachEventHandlers;
      
      // КРИТИЧНО: Сразу устанавливаем глобальное делегирование событий
      // Это работает даже если кнопки еще не в DOM
      setupEventDelegation();
    } else {
      var QUIZ_DEBUG_CRITICAL_ATTACH = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (QUIZ_DEBUG_CRITICAL_ATTACH) {
        console.log('[Quiz] ❌ CRITICAL: attachEventHandlers is not a function!', typeof attachEventHandlers);
      }
      // Оставляем заглушку если функция не определена
      if (typeof window.attachEventHandlers !== 'function') {
        window.attachEventHandlers = function() { return false; };
      }
    }
  } catch (e) {
    // Логируем ошибки только в dev режиме
    var QUIZ_DEBUG_ERROR_ATTACH = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (QUIZ_DEBUG_ERROR_ATTACH) {
      console.log('[Quiz] ❌ ERROR exporting attachEventHandlers:', e);
    }
    if (typeof window.attachEventHandlers !== 'function') {
      window.attachEventHandlers = function() { return false; };
    }
  }
  
  // КРИТИЧНО: Экспортируем ВСЕ функции СРАЗУ после определения
  // Делаем это СИНХРОННО, без задержек, ДО инициализации
  // Это гарантирует, что функции будут доступны сразу после загрузки скрипта
  try {
    // Логируем только в dev режиме
    var QUIZ_DEBUG_EXPORT_FUNC = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    // Экспортируем submitQuizForm (перезаписываем заглушку)
    if (typeof submitQuizForm === 'function') {
      window.submitQuizForm = submitQuizForm;
      if (QUIZ_DEBUG_EXPORT_FUNC) {
        console.log('[Quiz] ✅ submitQuizForm exported (replaced stub), type:', typeof window.submitQuizForm);
      }
    } else {
      if (QUIZ_DEBUG_EXPORT_FUNC) {
        console.log('[Quiz] ❌ CRITICAL: submitQuizForm is not a function!', typeof submitQuizForm);
      }
      // Оставляем заглушку если функция не определена
      if (typeof window.submitQuizForm !== 'function') {
        window.submitQuizForm = function() {
          if (QUIZ_DEBUG_EXPORT_FUNC) {
            console.log('[Quiz] ❌ submitQuizForm fallback - function not defined!');
          }
          return false;
        };
      }
    }
    
    // Экспортируем остальные функции (перезаписываем заглушки)
    if (typeof nextPrev === 'function') {
      window.nextPrev = nextPrev;
    }
    if (typeof showTab === 'function') {
      window.showTab = showTab;
    }
    
    // Логируем только в dev режиме
    var QUIZ_DEBUG_EXPORT = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (QUIZ_DEBUG_EXPORT) {
      console.log('[Quiz] ✅ All functions exported immediately after definition');
      console.log('[Quiz] Final export check:', {
        nextPrev: typeof window.nextPrev,
        showTab: typeof window.showTab,
        submitQuizForm: typeof window.submitQuizForm,
        attachEventHandlers: typeof window.attachEventHandlers
      });
    }
    
    // КРИТИЧНО: Вызываем событие готовности СРАЗУ после экспорта
    // Это позволяет другим скриптам узнать, что функции доступны
    if (typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('quiz-functions-ready'));
        if (QUIZ_DEBUG_EXPORT) {
          console.log('[Quiz] ✅ Dispatched quiz-functions-ready event');
        }
      } catch (e) {
        if (QUIZ_DEBUG_EXPORT) {
          console.warn('[Quiz] ⚠️  Could not dispatch quiz-functions-ready event:', e);
        }
      }
    }
    
    // Также устанавливаем флаг готовности
    window.__quizFunctionsReady = true;
    if (QUIZ_DEBUG_EXPORT) {
      console.log('[Quiz] ✅ Set __quizFunctionsReady flag');
    }
  } catch (e) {
    // Логируем ошибки только в dev режиме
    var QUIZ_DEBUG_ERROR_EXPORT = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (QUIZ_DEBUG_ERROR_EXPORT) {
      console.log('[Quiz] ❌ ERROR exporting functions:', e);
      console.log('[Quiz] Error stack:', e.stack);
    }
    // Даже при ошибке пытаемся экспортировать заглушки
    if (typeof window.attachEventHandlers !== 'function') {
      window.attachEventHandlers = function() { return false; };
    }
    if (typeof window.submitQuizForm !== 'function') {
      window.submitQuizForm = function() { return false; };
    }
  }

  // Initialize on DOM ready
  function initializeQuiz() {
    // Проверяем наличие квиза на странице перед инициализацией
    if (!hasQuizOnPage()) {
      // Квиза нет на странице - не логируем и не инициализируем
      return false;
    }
    
    // Логируем только если квиз есть (в dev режиме)
    var QUIZ_DEBUG = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    if (QUIZ_DEBUG) {
      console.log('[Quiz] ========== initializeQuiz CALLED ==========');
      console.log('[Quiz] Document ready state:', document.readyState);
      console.log('[Quiz] Tabs found:', document.getElementsByClassName('tab').length);
    }
    
    if (initQuiz()) {
      if (QUIZ_DEBUG) {
        console.log('[Quiz] ✅ Quiz initialization successful');
      }
      console.log('[Quiz] ✅ Quiz initialization successful');
      
      // КРИТИЧНО: Принудительно переопределяем обработчики после инициализации
      setTimeout(function() {
        var QUIZ_DEBUG_FORCE_ATTACH = typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (QUIZ_DEBUG_FORCE_ATTACH) {
          console.log('[Quiz] Forcing attachEventHandlers after initialization...');
        }
        if (typeof attachEventHandlers === 'function') {
          attachEventHandlers();
        } else if (typeof window.attachEventHandlers === 'function') {
          window.attachEventHandlers();
        }
        
        // КРИТИЧНО: Добавляем глобальный обработчик на все клики для отладки (только в dev режиме)
        var QUIZ_DEBUG_CLICK_HANDLER = typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (QUIZ_DEBUG_CLICK_HANDLER) {
          document.addEventListener('click', function(e) {
            var target = e.target;
            if (target && (target.id === 'nextBtn' || target.id === 'prevBtn')) {
              console.log('[Quiz] ========== BUTTON CLICKED ==========', target.id);
              console.log('[Quiz] Button onclick type:', typeof target.onclick);
              console.log('[Quiz] Button type:', target.type);
              console.log('[Quiz] window.nextPrev type:', typeof window.nextPrev);
            }
          }, true);
        }
      }, 100);
      // Export functions to window for onclick handlers
      // Переопределяем заглушки реальными функциями
      window.nextPrev = nextPrev;
      window.showTab = showTab;
      window.attachEventHandlers = attachEventHandlers; // Экспортируем для доступа из других скриптов
      window.submitQuizForm = submitQuizForm; // Экспортируем функцию отправки формы
      
      var QUIZ_DEBUG_INIT_EXPORT = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (QUIZ_DEBUG_INIT_EXPORT) {
        console.log('[Quiz] ✅ Functions exported to window (replaced stubs):', {
          nextPrev: typeof window.nextPrev,
          showTab: typeof window.showTab,
          submitQuizForm: typeof window.submitQuizForm,
          attachEventHandlers: typeof window.attachEventHandlers
        });
      }
      
      // Вызываем событие, чтобы другие скрипты знали, что quiz готов
      if (typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('quiz-initialized'));
          if (QUIZ_DEBUG_INIT_EXPORT) {
            console.log('[Quiz] ✅ Dispatched quiz-initialized event');
          }
        } catch (e) {
          if (QUIZ_DEBUG_INIT_EXPORT) {
            console.log('[Quiz] ⚠️  Could not dispatch quiz-initialized event:', e);
          }
        }
      }
      
      // КРИТИЧНО: Привязываем обработчики событий с проверкой наличия кнопок
      // Используем несколько попыток с увеличивающейся задержкой
      function tryAttachHandlers(attempt) {
        attempt = attempt || 0;
        var maxAttempts = 5;
        
        var prevBtn = document.getElementById("prevBtn");
        var nextBtn = document.getElementById("nextBtn");
        
        if (prevBtn && nextBtn) {
          console.log('[Quiz] ✅ Buttons found, attaching handlers (attempt ' + (attempt + 1) + ')...');
          var attached = attachEventHandlers();
          console.log('[Quiz] attachEventHandlers returned:', attached);
          if (attached) {
            console.log('[Quiz] ✅ Quiz initialized successfully with handlers attached');
            // Проверяем, что обработчики действительно привязаны
            console.log('[Quiz] Next button onclick after attach:', typeof nextBtn.onclick);
            console.log('[Quiz] Next button type after attach:', nextBtn.type);
            return true;
          } else {
            if (attempt < maxAttempts - 1) {
              setTimeout(function() {
                tryAttachHandlers(attempt + 1);
              }, 100 * (attempt + 1));
            }
            return false;
          }
        } else {
          console.log('[Quiz] ⚠️  Buttons not found yet (attempt ' + (attempt + 1) + ')', {
            prevBtn: !!prevBtn,
            nextBtn: !!nextBtn
          });
          if (attempt < maxAttempts - 1) {
            setTimeout(function() {
              tryAttachHandlers(attempt + 1);
            }, 100 * (attempt + 1));
          } else {
            console.log('[Quiz] ❌ Buttons not found after', maxAttempts, 'attempts');
          }
          return false;
        }
      }
      
      // Начинаем попытки привязки обработчиков
      tryAttachHandlers(0);
      
      return true;
    }
    // Не логируем, если квиза нет на странице
    var QUIZ_DEBUG = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (QUIZ_DEBUG && hasQuizOnPage()) {
      console.warn('[Quiz] Quiz initialization failed - no tabs found');
    }
    return false;
  }

  // Функция для повторных попыток инициализации
  function tryInitializeQuiz(maxAttempts) {
    maxAttempts = maxAttempts || 10;
    
    // Сначала проверяем, есть ли квиз на странице
    if (!hasQuizOnPage()) {
      // Квиза нет - прекращаем попытки сразу
      return;
    }
    
    var attempts = 0;
    var interval = setInterval(function() {
      attempts++;
      
      // Проверяем наличие квиза перед каждой попыткой
      if (!hasQuizOnPage()) {
        clearInterval(interval);
        return; // Квиза нет - прекращаем попытки
      }
      
      if (initializeQuiz()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        // Логируем только в dev режиме
        var QUIZ_DEBUG = typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (QUIZ_DEBUG) {
          console.log('[Quiz] Failed to initialize after', maxAttempts, 'attempts');
        }
      }
    }, 200);
  }

  // КРИТИЧНО: Устанавливаем глобальное делегирование СРАЗУ после определения функций
  // Это гарантирует, что обработчики будут работать даже если кнопки появятся позже
  // ВАЖНО: Устанавливаем делегирование только если квиз есть на странице
  setTimeout(function() {
    // Проверяем наличие квиза перед установкой делегирования
    if (hasQuizOnPage() && typeof nextPrev === 'function' && typeof showTab === 'function') {
      setupEventDelegation();
      var QUIZ_DEBUG = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (QUIZ_DEBUG) {
        console.log('[Quiz] ✅ Global event delegation set up immediately after function definitions');
      }
    } else {
      // Квиза нет на странице - не устанавливаем глобальные обработчики
      // Это предотвращает перехват событий на других страницах
      var QUIZ_DEBUG = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (QUIZ_DEBUG) {
        console.log('[Quiz] ⚠️  Quiz not found on page - skipping global event delegation');
      }
    }
  }, 50);
  
  // КРИТИЧНО: Добавляем глобальный перехватчик кликов на кнопки квиза для отладки и принудительной валидации
  // ВАЖНО: Устанавливаем только если квиз есть на странице
  (function() {
    // Проверяем наличие квиза перед установкой перехватчика
    if (!hasQuizOnPage()) {
      return; // Квиза нет - не устанавливаем перехватчик
    }
    
    document.addEventListener('click', function(e) {
      var target = e.target;
      if (!target) return;

      var isQuizButton =
        target.id === 'nextBtn' ||
        target.id === 'prevBtn' ||
        (target.tagName === 'BUTTON' &&
          target.textContent &&
          (target.textContent.trim() === 'Далее' ||
            target.textContent.trim() === 'Отправить' ||
            target.textContent.trim() === 'Назад'));

      if (!isQuizButton) {
        return;
      }

      // Ограничиваем перехват только кнопками внутри форм квиза
      var quizForm = null;
      try {
        if (typeof target.closest === 'function') {
          quizForm = target.closest('form');
        }
      } catch (err) {
        // ignore
      }
      if (!quizForm) {
        quizForm = document.getElementById('regForm') || document.getElementById('quizForm');
      }
      if (!quizForm || (quizForm.id !== 'regForm' && quizForm.id !== 'quizForm') || !quizForm.contains(target)) {
        return;
      }

      // КРИТИЧНО: Проверяем наличие вкладок перед обработкой
      var quizTabs = quizForm.getElementsByClassName("tab");
      if (!quizTabs || quizTabs.length === 0) {
        // Квиза нет на странице — не обрабатываем
        return;
      }

      console.log('[Quiz] ========== GLOBAL CLICK INTERCEPTOR ==========');
      console.log('[Quiz] Target ID:', target.id);
      console.log('[Quiz] Target text:', target.textContent);
      console.log('[Quiz] Target type:', target.type);
      console.log('[Quiz] Target onclick:', typeof target.onclick);
      console.log('[Quiz] window.nextPrev:', typeof window.nextPrev);
      console.log('[Quiz] window.attachEventHandlers:', typeof window.attachEventHandlers);
      
      // КРИТИЧНО: Если это кнопка Next и обработчик не работает, принудительно вызываем валидацию
      if (target.id === 'nextBtn' || (target.tagName === 'BUTTON' && target.textContent && (target.textContent.trim() === 'Далее' || target.textContent.trim() === 'Отправить'))) {
        console.log('[Quiz] Next button clicked - checking if handlers are attached...');
        var nextBtn = document.getElementById('nextBtn');
        if (nextBtn && (!nextBtn.onclick || typeof nextBtn.onclick !== 'function')) {
          var QUIZ_DEBUG = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          if (QUIZ_DEBUG && hasQuizOnPage()) {
            console.log('[Quiz] ⚠️ Next button has NO onclick handler! Forcing validation...');
          }
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Принудительно вызываем валидацию и nextPrev
          if (typeof window.nextPrev === 'function') {
            var result = window.nextPrev(1);
            if (QUIZ_DEBUG && hasQuizOnPage()) {
              console.log('[Quiz] Forced window.nextPrev(1) returned:', result);
            }
          } else {
            if (QUIZ_DEBUG && hasQuizOnPage()) {
              console.log('[Quiz] ❌ window.nextPrev is not a function!');
            }
          }
          return false;
        }
      }
    }, true);
    // Логируем только в dev режиме
    var QUIZ_DEBUG_INSTALL = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (QUIZ_DEBUG_INSTALL && hasQuizOnPage()) {
      console.log('[Quiz] ✅ Global click interceptor installed');
    }
  })();
  
  // КРИТИЧНО: Глобальный перехватчик кликов для отладки (только для кнопок внутри квиза)
  // ВАЖНО: Устанавливаем только если квиз есть на странице
  if (hasQuizOnPage()) {
    document.addEventListener('click', function(e) {
      var target = e.target;
      if (!target) return;

      var isQuizButton =
        target.id === 'nextBtn' ||
        target.id === 'prevBtn' ||
        (target.tagName === 'BUTTON' &&
          (target.textContent === 'Далее' || target.textContent === 'Отправить' || target.textContent === 'Назад'));

      if (!isQuizButton) {
        return;
      }

      var quizForm = null;
      try {
        if (typeof target.closest === 'function') {
          quizForm = target.closest('form');
        }
      } catch (err) {
        // ignore
      }
      if (!quizForm) {
        quizForm = document.getElementById('regForm') || document.getElementById('quizForm');
      }
      if (!quizForm || (quizForm.id !== 'regForm' && quizForm.id !== 'quizForm') || !quizForm.contains(target)) {
        return;
      }

      // КРИТИЧНО: Проверяем наличие вкладок перед обработкой
      var quizTabs = quizForm.getElementsByClassName("tab");
      if (!quizTabs || quizTabs.length === 0) {
        // Квиза нет на странице — не обрабатываем
        return;
      }

    // Логируем только в dev режиме и если квиз есть
    var QUIZ_DEBUG = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (QUIZ_DEBUG && hasQuizOnPage()) {
      console.log('[Quiz] ========== GLOBAL CLICK INTERCEPTOR ==========');
      console.log('[Quiz] Target ID:', target.id);
      console.log('[Quiz] Target text:', target.textContent);
      console.log('[Quiz] Target type:', target.type);
      console.log('[Quiz] Target onclick:', typeof target.onclick);
      console.log('[Quiz] window.nextPrev:', typeof window.nextPrev);
      console.log('[Quiz] window.attachEventHandlers:', typeof window.attachEventHandlers);
    }
    }, true);
  } // Закрываем условие if (hasQuizOnPage())

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Инициализируем только если квиз есть на странице
      if (hasQuizOnPage()) {
        var QUIZ_DEBUG = typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (QUIZ_DEBUG) {
          console.log('[Quiz] DOMContentLoaded - initializing quiz');
        }
        initializeQuiz();
        // Повторная попытка через небольшую задержку
        setTimeout(function() {
          if (!tabs || tabs.length === 0) {
            if (QUIZ_DEBUG) {
              console.log('[Quiz] Retrying initialization...');
            }
            tryInitializeQuiz(10);
          } else {
            attachEventHandlers();
          }
        }, 300);
      }
    });
  } else {
    // Инициализируем только если квиз есть на странице
    if (hasQuizOnPage()) {
      var QUIZ_DEBUG = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (QUIZ_DEBUG) {
        console.log('[Quiz] DOM already loaded - initializing quiz');
      }
      initializeQuiz();
      // Повторная попытка через небольшую задержку
      setTimeout(function() {
        if (!tabs || tabs.length === 0) {
          if (QUIZ_DEBUG) {
            console.log('[Quiz] Retrying initialization...');
          }
          tryInitializeQuiz(10);
        } else {
          attachEventHandlers();
        }
      }, 300);
    }
  }
  
  // Также пробуем инициализировать после полной загрузки страницы
  window.addEventListener('load', function() {
    // Инициализируем только если квиз есть на странице
    if (hasQuizOnPage()) {
      setTimeout(function() {
        if (!tabs || tabs.length === 0) {
          var QUIZ_DEBUG = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          if (QUIZ_DEBUG) {
            console.log('[Quiz] Window loaded - retrying initialization...');
          }
          tryInitializeQuiz(5);
        } else if (!document.getElementById('prevBtn') || !document.getElementById('nextBtn')) {
          attachEventHandlers();
        }
      }, 200);
    }
  });
})();





