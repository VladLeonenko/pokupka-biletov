import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from '@/auth/AuthProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import '@/utils/silenceWarnings';
import '@/styles/theme.css';
import '@/styles/global.css';
import { errorMonitoring } from './utils/errorMonitoring';
// Инициализируем мониторинг ошибок
errorMonitoring.init();

// РАННИЙ перехват alert() для замены на toast
// Это должно быть ДО загрузки React, чтобы перехватить все alert() из legacy скриптов
if (typeof window !== 'undefined') {
  // Сохраняем оригинальный alert
  (window as any).__originalAlert = window.alert;
  
  // Переопределяем alert для перехвата
  window.alert = function(message: string) {
    // Показываем через toast, если функция доступна
    if ((window as any).__showToast) {
      (window as any).__showToast(String(message), 'info');
    } else {
      // Если toast еще не готов, сохраняем сообщение для показа позже
      if (!(window as any).__pendingAlerts) {
        (window as any).__pendingAlerts = [];
      }
      (window as any).__pendingAlerts.push(String(message));
      // Показываем через оригинальный alert как fallback (временно)
      // (window as any).__originalAlert(message);
    }
  };
}

// SW отключён: старый cache-first по /assets ломал сайт после деплоя (хэши в именах файлов).
// Файл public/sw.js оставлен как «только сеть» для клиентов со старой регистрацией — подхватят новый SW.

// Инициализация темы при загрузке страницы
const initializeTheme = () => {
  // Всегда тёмная тема
  document.documentElement.setAttribute('data-theme', 'dark');
  document.documentElement.classList.add('dark-theme');
  document.documentElement.classList.remove('light-theme');
  document.body.classList.add('dark-theme');
  document.body.classList.remove('light-theme');
  
  // Применяем CSS переменные для тёмной темы
  const root = document.documentElement;
  root.style.setProperty('--bg-color', '#141414');
  root.style.setProperty('--text-color', '#ffffff');
  root.style.setProperty('--header-bg', '#1a1a1a');
  root.style.setProperty('--border-color', '#333333');
  document.body.style.backgroundColor = '#141414';
  document.body.style.color = '#ffffff';
};

// Инициализируем тему перед рендером React
initializeTheme();

// Снимаем любые старые SW (PWA/offline), чтобы Safari и мобильные не залипали на кэше после деплоев
if (import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

const queryClient = new QueryClient();

// Экспортируем navigate для использования в legacy коде
let globalNavigate: ((path: string) => void) | null = null;

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found!');
  }

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}>
          <ScrollToTop />
          <AuthProvider>
            <App />
            <NavigationExporter />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
} catch (error) {
  console.error('[main.tsx] ❌ CRITICAL ERROR during React initialization:', error);
  // Показываем ошибку в DOM если React не загрузился
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; background: #141414; color: #fff; min-height: 100vh;">
        <h2>😿 Критическая ошибка при загрузке</h2>
        <p style="color: #ff6b6b;">${error instanceof Error ? error.message : 'Неизвестная ошибка'}</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; font-size: 16px; margin-top: 20px; cursor: pointer;">
          🔄 Перезагрузить страницу
        </button>
        <details style="margin-top: 20px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
          <summary style="cursor: pointer; color: #999;">Детали ошибки</summary>
          <pre style="background: #000; padding: 10px; overflow: auto; font-size: 12px;">${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}</pre>
        </details>
      </div>
    `;
  }
}

// Компонент для экспорта navigate в window
function NavigationExporter() {
  const navigate = useNavigate();
  
  useEffect(() => {
    globalNavigate = (path: string) => navigate(path);
    (window as any).__navigate = (path: string) => navigate(path);
    return () => {
      globalNavigate = null;
      delete (window as any).__navigate;
    };
  }, [navigate]);
  
  return null;
}


