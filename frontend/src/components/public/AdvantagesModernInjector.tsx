import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AdvantagesModern } from './AdvantagesModern';
import { ThemeProvider, createTheme } from '@mui/material/styles';

/**
 * Инжектор для AdvantagesModern компонента
 * Встраивает React компонент в нужное место в legacy HTML
 */
export function AdvantagesModernInjector() {
  useEffect(() => {
    // Ищем место для вставки
    const findInsertionPoint = () => {
      // Ищем блок с классом "blog" или footer
      const blogSection = document.querySelector('.blog');
      const footerSection = document.querySelector('footer');
      
      return blogSection || footerSection;
    };

    const insertionPoint = findInsertionPoint();
    
    if (!insertionPoint) {
      console.warn('[AdvantagesModernInjector] Не найдена точка вставки');
      return;
    }

    // Создаем контейнер для React компонента
    const container = document.createElement('div');
    container.id = 'advantages-modern-container';
    container.style.width = '100%';
    
    // Вставляем ПЕРЕД найденным элементом
    insertionPoint.parentNode?.insertBefore(container, insertionPoint);

    // Определяем текущую тему
    const isDark = document.documentElement.classList.contains('dark-theme') || 
                   document.documentElement.getAttribute('data-theme') === 'dark';

    // Создаем тему для Material-UI
    const theme = createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: { main: '#ffbb00' },
        background: {
          default: isDark ? '#141414' : '#ffffff',
          paper: isDark ? '#1d1d1d' : '#ffffff',
        },
        text: {
          primary: isDark ? '#ffffff' : '#141414',
          secondary: isDark ? '#d0d0d0' : '#666666',
        },
      },
      typography: {
        fontFamily: '"Raleway", sans-serif',
      },
    });

    // Рендерим React компонент
    const root = createRoot(container);
    root.render(
      <ThemeProvider theme={theme}>
        <AdvantagesModern />
      </ThemeProvider>
    );


    // Очистка при размонтировании
    return () => {
      root.unmount();
      container.remove();
    };
  }, []);

  return null;
}

