import { lazy, Suspense, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppRoutes } from '@/routes/AppRoutes';
import { ToastProvider } from '@/components/common/ToastProvider';
import { ThemeModeProvider } from '@/theme/ThemeModeProvider';
const ChatWidget = lazy(() => import('@/components/chat/ChatWidget').then(m => ({ default: m.ChatWidget })));
import { CookieConsentProvider } from '@/components/privacy/CookieConsentProvider';
import { HeaderFooterInjector } from '@/components/public/HeaderFooterInjector';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { TicketsHeader } from '@/components/tickets/TicketsHeader';
import { TicketsFooter } from '@/components/tickets/TicketsFooter';
import { applyTicketsTheme, restoreDefaultPublicTheme } from '@/utils/ticketsTheme';
import '@/styles/tickets-theme.css';
import { HiddenPromoCodeInjector } from '@/components/public/HiddenPromoCodeInjector';
import { GlobalFormValidator } from '@/components/common/GlobalFormValidator';
import { FaviconNotificationTracker } from '@/components/common/FaviconNotificationTracker';
// import { GlobalPreloader } from '@/components/common/GlobalPreloader'; // Закомментировано - preloader не работает
import { useLocation, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { hitMailRuCounter, setMailRuUserId } from '@/utils/mailRuCounter';
import { hitYandexMetrika } from '@/utils/yandexMetrika';
import { useAuth } from '@/auth/AuthProvider';
import { useCacheVersionWatcher } from '@/hooks/useCacheVersionWatcher';
import { useCursor } from '@/hooks/useCursor';
import { usePageAnimations } from '@/hooks/usePageAnimations';
import { matchesTicketsChromePath } from '@/utils/ticketsChrome';
import { RouteSeoDefaults } from '@/components/common/RouteSeoDefaults';
import { TicketCartProvider } from '@/context/TicketCartContext';
import { TicketCartStickyBar } from '@/components/tickets/TicketCartStickyBar';

export default function App() {
  const location = useLocation();
  const { token, user } = useAuth();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isAdminRoute = normalizedPath.startsWith('/admin');
  const isLoginPage = /^\/admin\/login$/i.test(normalizedPath);
  const shouldUseAdminLayout = isAdminRoute && !isLoginPage && !!token && ['admin', 'sales_manager'].includes(user?.role ?? '');

  const useTicketsChrome = useMemo(
    () => matchesTicketsChromePath(location.pathname),
    [location.pathname]
  );

  useCacheVersionWatcher();
  useCursor(normalizedPath, useTicketsChrome);
  // GSAP scroll animations for [data-anim] elements on all public pages
  usePageAnimations(normalizedPath);
  
  // If user tries to access admin routes without auth, redirect to login
  // Except for the login page itself
  // ВАЖНО: Проверяем только admin роуты, публичные доступны всем
  // Используем useMemo для предотвращения бесконечных редиректов
  const shouldRedirectToLogin = isAdminRoute && !isLoginPage && !token;
  
  if (shouldRedirectToLogin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Если пользователь авторизован и заходит на корень, редиректим в админку
  // НЕ редиректим - пусть публичная страница доступна
  
  // Устанавливаем data-атрибут для админ панели для стилей
  useEffect(() => {
    if (shouldUseAdminLayout || (isAdminRoute && !isLoginPage)) {
      document.body.setAttribute('data-admin', 'true');
    } else {
      document.body.removeAttribute('data-admin');
    }
    return () => {
      document.body.removeAttribute('data-admin');
    };
  }, [shouldUseAdminLayout, isAdminRoute, isLoginPage]);

  useEffect(() => {
    if (isAdminRoute || isLoginPage) {
      restoreDefaultPublicTheme();
      return;
    }
    if (useTicketsChrome) {
      applyTicketsTheme();
    } else {
      restoreDefaultPublicTheme();
    }
  }, [isAdminRoute, isLoginPage, useTicketsChrome]);

  // Yandex.Metrika + Top.Mail.Ru: hit при смене SPA-маршрута (пропускаем первый рендер — init уже отправил)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const url = `${window.location.origin}${location.pathname}${location.search || ''}`;
    hitYandexMetrika(url);
    hitMailRuCounter(url, user?.id);
  }, [location.pathname, location.search, user?.id]);

  useEffect(() => {
    if (user?.id) {
      setMailRuUserId(user.id);
    }
  }, [user?.id]);

  return (
    <ThemeModeProvider>
      <TicketCartProvider>
      <ToastProvider>
        <RouteSeoDefaults />
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
            {useTicketsChrome ? <TicketsHeader /> : <Header />}
            {/* Скрытые промокоды на сайте */}
            <HiddenPromoCodeInjector />
            {/* Глобальная валидация форм с toast-уведомлениями */}
            <GlobalFormValidator />
            <AppRoutes />
            {useTicketsChrome ? <TicketsFooter /> : <Footer />}
            {useTicketsChrome ? <TicketCartStickyBar /> : null}
            {/* HeaderFooterInjector для legacy HTML страниц (PublicPageView) */}
            <HeaderFooterInjector />
            {/* Виджеты чата — lazy load, не блокируют первый рендер */}
            <Suspense fallback={null}>
              <ChatWidget />
            </Suspense>
            {/* Cookie Consent Modal */}
            <CookieConsentProvider />
          </>
        )}
      </ToastProvider>
      </TicketCartProvider>
    </ThemeModeProvider>
  );
}


