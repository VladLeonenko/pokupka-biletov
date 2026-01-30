// Универсальная система уведомлений в левом нижнем углу
(function() {
  'use strict';

  // Типы уведомлений
  var NOTIFICATION_TYPES = {
    ERROR: 'error',
    SUCCESS: 'success',
    INFO: 'info',
    WARNING: 'warning'
  };

  // Цвета для разных типов
  var NOTIFICATION_COLORS = {
    error: '#f44336',
    success: '#4caf50',
    info: '#2196f3',
    warning: '#ff9800'
  };

  // Создаем контейнер для уведомлений, если его еще нет
  function getNotificationContainer() {
    var container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = 'position: fixed; bottom: 20px; left: 20px; z-index: 10000; max-width: 400px;';
      document.body.appendChild(container);
    }
    return container;
  }

  // Универсальная функция для показа уведомления
  function showNotification(message, type) {
    type = type || NOTIFICATION_TYPES.INFO;
    var color = NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.info;
    var container = getNotificationContainer();
    
    // Создаем элемент уведомления
    var notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.style.cssText = [
      'background-color: ' + color,
      'color: white',
      'padding: 16px 20px',
      'border-radius: 8px',
      'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)',
      'margin-bottom: 12px',
      'animation: slideInLeft 0.3s ease-out',
      'position: relative',
      'min-width: 300px',
      'max-width: 400px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      'font-size: 14px',
      'line-height: 1.5',
      'word-wrap: break-word'
    ].join('; ');

    // Добавляем иконку закрытия
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = [
      'position: absolute',
      'top: 8px',
      'right: 8px',
      'background: transparent',
      'border: none',
      'color: white',
      'font-size: 24px',
      'line-height: 1',
      'cursor: pointer',
      'padding: 0',
      'width: 24px',
      'height: 24px',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'opacity: 0.8',
      'transition: opacity 0.2s'
    ].join('; ');
    
    closeBtn.onmouseover = function() {
      this.style.opacity = '1';
    };
    closeBtn.onmouseout = function() {
      this.style.opacity = '0.8';
    };
    
    closeBtn.onclick = function() {
      hideNotification(notification);
    };

    // Добавляем текст сообщения
    var messageText = document.createElement('div');
    messageText.textContent = message;
    messageText.style.cssText = 'padding-right: 30px;';

    notification.appendChild(messageText);
    notification.appendChild(closeBtn);
    container.appendChild(notification);

    // Автоматически скрываем в зависимости от типа
    var autoHideDuration = type === NOTIFICATION_TYPES.SUCCESS ? 3000 : 
                          type === NOTIFICATION_TYPES.ERROR ? 5000 : 
                          type === NOTIFICATION_TYPES.WARNING ? 4000 : 4000;
    var timeoutId = setTimeout(function() {
      hideNotification(notification);
    }, autoHideDuration);

    // Сохраняем timeoutId для возможности отмены при закрытии
    notification._timeoutId = timeoutId;
  }

  // Функция для скрытия уведомления
  function hideNotification(notification) {
    if (notification._timeoutId) {
      clearTimeout(notification._timeoutId);
    }
    
    notification.style.animation = 'slideOutLeft 0.3s ease-out';
    setTimeout(function() {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  // Добавляем CSS анимации
  if (!document.getElementById('error-notification-styles')) {
    var style = document.createElement('style');
    style.id = 'error-notification-styles';
    style.textContent = `
      @keyframes slideInLeft {
        from {
          transform: translateX(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutLeft {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(-100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Функции-алиасы для удобства
  function showErrorNotification(message) {
    return showNotification(message, NOTIFICATION_TYPES.ERROR);
  }

  function showSuccessNotification(message) {
    return showNotification(message, NOTIFICATION_TYPES.SUCCESS);
  }

  function showInfoNotification(message) {
    return showNotification(message, NOTIFICATION_TYPES.INFO);
  }

  function showWarningNotification(message) {
    return showNotification(message, NOTIFICATION_TYPES.WARNING);
  }

  // Экспортируем функции в глобальную область видимости
  window.showNotification = showNotification;
  window.showErrorNotification = showErrorNotification;
  window.showSuccessNotification = showSuccessNotification;
  window.showInfoNotification = showInfoNotification;
  window.showWarningNotification = showWarningNotification;
  
  // Также создаем алиасы для совместимости
  window.showValidationError = showErrorNotification;
})();

