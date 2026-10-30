import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from '@/auth/AuthProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ScrollToTop } from '@/components/common/ScrollToTop';

const queryClient = new QueryClient();

/** Full SPA (admin + non–React-SSR public). Loaded only when money hydrate path is NOT used. */
export function bootstrapSpaApp(rootElement: HTMLElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ScrollToTop />
          <AuthProvider>
            <App />
            <NavigationExporter />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>,
  );
}

function NavigationExporter() {
  const navigate = useNavigate();
  useEffect(() => {
    (window as unknown as { __navigate?: (path: string) => void }).__navigate = (path: string) =>
      navigate(path);
    return () => {
      delete (window as unknown as { __navigate?: (path: string) => void }).__navigate;
    };
  }, [navigate]);
  return null;
}
