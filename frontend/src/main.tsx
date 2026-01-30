import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from '@/auth/AuthProvider';
import '@/utils/silenceWarnings';
import '@/styles/theme.css';
import '@/styles/global.css';
import { errorMonitoring } from './utils/errorMonitoring';
import { registerServiceWorker } from './utils/serviceWorker';

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

// Регистрируем Service Worker в production
if (import.meta.env.PROD) {
  registerServiceWorker();
}

// Инициализация темы при загрузке страницы
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('public.theme') as 'light' | 'dark' | null;
  const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = savedTheme || systemTheme;

  // Применяем тему к document
  document.documentElement.setAttribute('data-theme', theme);
  
  // Добавляем/удаляем класс для темной темы
  if (theme === 'dark') {
    document.documentElement.classList.add('dark-theme');
    document.documentElement.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  } else {
    document.documentElement.classList.add('light-theme');
    document.documentElement.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
  }

  // Применяем CSS переменные для темы
  const root = document.documentElement;
  if (theme === 'dark') {
    root.style.setProperty('--bg-color', '#141414');
    root.style.setProperty('--text-color', '#ffffff');
    root.style.setProperty('--header-bg', '#1a1a1a');
    root.style.setProperty('--border-color', '#333333');
    document.body.style.backgroundColor = '#141414';
    document.body.style.color = '#ffffff';
  } else {
    // Светлая тема тоже темная (всегда темная тема)
    root.style.setProperty('--bg-color', '#141414');
    root.style.setProperty('--text-color', '#ffffff');
    root.style.setProperty('--header-bg', '#1a1a1a');
    root.style.setProperty('--border-color', '#333333');
    document.body.style.backgroundColor = '#141414';
    document.body.style.color = '#ffffff';
  }
};

// Инициализируем тему перед рендером React
initializeTheme();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);


