import { useEffect } from 'react';
import { useToast } from './ToastProvider';

/**
 * Глобальный компонент для валидации всех форм на сайте
 * Перехватывает HTML5 валидацию и показывает toast-уведомления
 * Работает для всех форм: React компоненты, HTML из БД, legacy формы
 */
export function GlobalFormValidator() {
  const { showToast } = useToast();

  useEffect(() => {
    // Экспортируем showToast в window для использования из legacy кода
    if (typeof window !== 'undefined') {
      (window as any).__showToast = showToast;
      (window as any).showErrorNotification = (msg: string) => showToast(msg, 'error');
      (window as any).showSuccessNotification = (msg: string) => showToast(msg, 'success');
      (window as any).showInfoNotification = (msg: string) => showToast(msg, 'info');
      (window as any).showWarningNotification = (msg: string) => showToast(msg, 'warning');
    }

    // Глобальный обработчик для всех форм
    // Используем capture phase чтобы перехватить ДО других обработчиков (form-handler.js и т.д.)
    const handleFormSubmit = (e: Event) => {
      // Событие submit всегда происходит на форме, но target может быть кнопкой
      const form = (e.target as HTMLElement).closest?.('form') as HTMLFormElement || e.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;

      // Пропускаем формы, которые уже обрабатываются React компонентами
      if (form.hasAttribute('data-react-handled')) {
        return;
      }

      // Проверяем HTML5 валидацию ПЕРЕД отправкой
      // Это сработает даже если form-handler.js обрабатывает форму
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Находим первое невалидное поле
        const firstInvalid = form.querySelector(':invalid') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (firstInvalid) {
          // Получаем сообщение об ошибке
          let errorMessage = '';
          
          if (firstInvalid.validity.valueMissing) {
            const label = form.querySelector(`label[for="${firstInvalid.id}"]`)?.textContent?.trim() || 
                         firstInvalid.getAttribute('placeholder') || 
                         firstInvalid.getAttribute('name') || 
                         'поле';
            errorMessage = `Заполните поле: ${label}`;
          } else if (firstInvalid.validity.typeMismatch) {
            if (firstInvalid.type === 'email') {
              errorMessage = 'Введите корректный email адрес';
            } else if (firstInvalid.type === 'tel') {
              errorMessage = 'Введите корректный номер телефона';
            } else {
              errorMessage = 'Неверный формат данных';
            }
          } else if (firstInvalid.validity.patternMismatch) {
            errorMessage = 'Неверный формат данных';
          } else if (firstInvalid.validity.tooShort) {
            errorMessage = `Минимальная длина: ${firstInvalid.minLength} символов`;
          } else if (firstInvalid.validity.tooLong) {
            errorMessage = `Максимальная длина: ${firstInvalid.maxLength} символов`;
          } else if (firstInvalid.validity.rangeUnderflow) {
            errorMessage = `Минимальное значение: ${firstInvalid.min}`;
          } else if (firstInvalid.validity.rangeOverflow) {
            errorMessage = `Максимальное значение: ${firstInvalid.max}`;
          } else {
            errorMessage = firstInvalid.validationMessage || 'Поле заполнено неверно';
          }

          showToast(errorMessage, 'error');
          
          // Фокусируемся на поле с ошибкой
          firstInvalid.focus();
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          showToast('Пожалуйста, заполните все обязательные поля', 'error');
        }
      }
    };

    // Обработчик для проверки required полей при попытке отправки
    const handleFormInvalid = (e: Event) => {
      const form = (e.target as HTMLElement).closest?.('form') as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;

      // Пропускаем формы, которые уже обрабатываются React компонентами
      if (form.hasAttribute('data-react-handled')) {
        return;
      }

      e.preventDefault();
      
      // Находим все невалидные поля
      const invalidFields = form.querySelectorAll(':invalid');
      if (invalidFields.length > 0) {
        const firstInvalid = invalidFields[0] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        
        let errorMessage = '';
        if (firstInvalid.validity.valueMissing) {
          const label = form.querySelector(`label[for="${firstInvalid.id}"]`)?.textContent?.trim() || 
                       firstInvalid.getAttribute('placeholder') || 
                       firstInvalid.getAttribute('name') || 
                       'поле';
          errorMessage = `Заполните обязательное поле: ${label}`;
        } else {
          errorMessage = firstInvalid.validationMessage || 'Поле заполнено неверно';
        }

        showToast(errorMessage, 'error');
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Добавляем глобальный обработчик на document для перехвата всех форм
    // Используем capture phase чтобы перехватить ДО form-handler.js и других обработчиков
    document.addEventListener('submit', handleFormSubmit, true);

    // Используем MutationObserver для отслеживания динамически добавленных форм
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const element = node as Element;
            
            // Проверяем, является ли добавленный элемент формой
            if (element.tagName === 'FORM' && !element.hasAttribute('data-react-handled')) {
              // Обработчик уже добавлен глобально на document, но на всякий случай
              // можно добавить и на саму форму
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      // Удаляем обработчики при размонтировании
      document.removeEventListener('submit', handleFormSubmit, true);
      observer.disconnect();
    };
  }, [showToast]);

  return null;
}
