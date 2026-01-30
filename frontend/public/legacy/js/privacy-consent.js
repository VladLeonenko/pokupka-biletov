/**
 * Скрипт для добавления чекбоксов согласия в HTML формы
 * Автоматически добавляет чекбоксы в формы на странице
 */

(function() {
  'use strict';

  // Проверяем, есть ли уже согласие
  function hasPrivacyConsent() {
    const consent = localStorage.getItem('privacy_consent');
    return consent === 'true';
  }

  // Сохраняем согласие
  function savePrivacyConsent(accepted) {
    localStorage.setItem('privacy_consent', accepted ? 'true' : 'false');
    localStorage.setItem('privacy_consent_date', new Date().toISOString());
  }

  // Создаем чекбокс согласия
  function createConsentCheckbox(form) {
    // Проверяем, не добавлен ли уже чекбокс
    if (form.querySelector('.privacy-consent-checkbox')) {
      return;
    }

    const checkboxWrapper = document.createElement('div');
    checkboxWrapper.className = 'form-item privacy-consent-checkbox';
    checkboxWrapper.style.marginTop = '15px';
    checkboxWrapper.style.marginBottom = '15px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'privacy-consent-' + Date.now();
    checkbox.name = 'privacy_consent';
    checkbox.required = true;
    checkbox.className = '_req-s';

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.style.marginLeft = '8px';
    label.style.cursor = 'pointer';
    label.style.fontSize = '14px';
    label.style.color = 'rgba(255,255,255,0.8)';
    label.innerHTML = 'Я согласен на <a href="/politic" target="_blank" style="color: inherit; text-decoration: underline;">обработку персональных данных</a> *';

    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(label);

    // Добавляем перед кнопкой отправки
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      form.insertBefore(checkboxWrapper, submitButton);
    } else {
      form.appendChild(checkboxWrapper);
    }

    return checkbox;
  }

  // Добавляем валидацию формы
  function addFormValidation(form) {
    form.addEventListener('submit', function(e) {
      const consentCheckbox = form.querySelector('.privacy-consent-checkbox input[type="checkbox"]');
      
      if (consentCheckbox && !consentCheckbox.checked) {
        e.preventDefault();
        alert('Необходимо согласие на обработку персональных данных');
        consentCheckbox.focus();
        return false;
      }

      // Сохраняем согласие при отправке
      if (consentCheckbox && consentCheckbox.checked) {
        savePrivacyConsent(true);
      }

      return true;
    });
  }

  // Инициализация для всех форм на странице
  function initForms() {
    // Находим все формы
    const forms = document.querySelectorAll('form[id*="submit"], form[id*="quiz"], form[id*="reg"], form[id*="callback"], #submit-input, #quizForm, #regForm, #callback-form');
    
    forms.forEach(function(form) {
      // Пропускаем формы, которые уже обработаны
      if (form.dataset.privacyConsentAdded) {
        return;
      }

      // Добавляем чекбокс
      const checkbox = createConsentCheckbox(form);
      
      if (checkbox) {
        // Добавляем валидацию
        addFormValidation(form);
        
        // Помечаем форму как обработанную
        form.dataset.privacyConsentAdded = 'true';
      }
    });
  }

  // Инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForms);
  } else {
    initForms();
  }

  // Также инициализируем после задержки (на случай динамических форм)
  setTimeout(initForms, 1000);
  setTimeout(initForms, 3000);

  // Экспортируем функции для глобального доступа
  window.privacyConsent = {
    init: initForms,
    hasConsent: hasPrivacyConsent,
    saveConsent: savePrivacyConsent,
  };
})();

