import { AppLayout } from '@/components/layout/AppLayout';
import { AppRoutes } from '@/routes/AppRoutes';
import { ToastProvider } from '@/components/common/ToastProvider';
import { ThemeModeProvider } from '@/theme/ThemeModeProvider';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import { CookieConsentProvider } from '@/components/privacy/CookieConsentProvider';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { HiddenPromoCodeInjector } from '@/components/public/HiddenPromoCodeInjector';
import { GlobalFormValidator } from '@/components/common/GlobalFormValidator';
import { FaviconNotificationTracker } from '@/components/common/FaviconNotificationTracker';
// import { GlobalPreloader } from '@/components/common/GlobalPreloader'; // Закомментировано - preloader не работает
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useCacheVersionWatcher } from '@/hooks/useCacheVersionWatcher';
import { useCursor } from '@/hooks/useCursor';

export default function App() {
  const location = useLocation();
  const { token, user } = useAuth();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isAdminRoute = normalizedPath.startsWith('/admin');
  const isLoginPage = /^\/admin\/login$/i.test(normalizedPath);
  const shouldUseAdminLayout = isAdminRoute && !isLoginPage && !!token && user?.role === 'admin';
  useCacheVersionWatcher();
  // Включаем кастомный курсор на нужных публичных React-страницах (AI-команда, AI-ассистент, ЛК и т.п.).
  // Хук сам проверяет маршрут и не трогает legacy-страницы, где работает оригинальный cursor/app.min.js.
  useCursor(normalizedPath);
  
  // If user tries to access admin routes without auth, redirect to login
  // Except for the login page itself
  // ВАЖНО: Проверяем только admin роуты, публичные доступны всем
  if (isAdminRoute && !isLoginPage && !token) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Если пользователь авторизован и заходит на корень, редиректим в админку
  if (location.pathname === '/' && token && !isAdminRoute) {
    // НЕ редиректим - пусть публичная страница доступна
    // return <Navigate to="/admin" replace />;
  }
  
  return (
    <ThemeModeProvider>
      <ToastProvider>
        {/* Глобальное отслеживание уведомлений и обновление фавиконки */}
        <FaviconNotificationTracker />
        {/* Глобальная валидация форм с toast-уведомлениями для всех страниц */}
        <GlobalFormValidator />
        {/* <GlobalPreloader /> */} {/* Закомментировано - preloader не работает */}
        {shouldUseAdminLayout ? (
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        ) : isAdminRoute ? (
          <AppRoutes />
        ) : (
          <>
            <style>{`
              /* Убираем padding для MUI контейнеров на странице портфолио */
              .css-1qqvtnl {
                padding-top: 0 !important;
                padding-bottom: 0 !important;
              }
              
              .css-1gwheji {
                padding-top: 0 !important;
              }
            `}</style>
            {/* React Header компонент для всех публичных React страниц */}
            <Header />
            {/* Скрытые промокоды на сайте */}
            <HiddenPromoCodeInjector />
            {/* Глобальная валидация форм с toast-уведомлениями */}
            <GlobalFormValidator />
            <AppRoutes />
            {/* React Footer компонент для всех публичных React страниц */}
            <Footer />
            {/* HeaderFooterInjector для legacy HTML страниц (PublicPageView) */}
            <HeaderFooterInjector />
            {/* ChatWidget на всех публичных страницах */}
            <ChatWidget />
            {/* AI Chat Widget на всех публичных страницах */}
            <AIChatWidget />
            {/* Cookie Consent Modal */}
            <CookieConsentProvider />
          </>
        )}
      </ToastProvider>
    </ThemeModeProvider>
  );
}


