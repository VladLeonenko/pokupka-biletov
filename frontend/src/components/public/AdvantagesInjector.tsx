import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Advantages3D } from './Advantages3D';
import { ThemeProvider, createTheme } from '@mui/material';

/**
 * Компонент для инъекции современного 3D блока Advantages в legacy HTML
 * Автоматически находит и заменяет старый HTML блок advantages
 */
export function AdvantagesInjector() {
  useEffect(() => {
    const injectAdvantages3D = () => {
      // Ищем старый HTML блок advantages
      const advantagesSection = document.querySelector('section.advantages');
      
      if (!advantagesSection || advantagesSection.hasAttribute('data-react-injected')) {
        return; // Уже заменен или не найден
      }

      // Создаем контейнер для React компонента
      const reactContainer = document.createElement('div');
      reactContainer.id = 'advantages-3d-container';
      reactContainer.setAttribute('data-react-component', 'true');
      
      // Заменяем старый блок на новый контейнер
      advantagesSection.parentNode?.replaceChild(reactContainer, advantagesSection);
      
      // Отмечаем что заменили
      reactContainer.setAttribute('data-react-injected', 'true');

      // Создаем тему для компонента (наследуем текущую тему)
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const theme = createTheme({
        palette: {
          mode: currentTheme === 'dark' ? 'dark' : 'light',
          primary: { main: '#ffbb00' },
          background: {
            default: currentTheme === 'dark' ? '#141414' : '#ffffff',
            paper: currentTheme === 'dark' ? '#1d1d1d' : '#ffffff',
          },
          text: {
            primary: currentTheme === 'dark' ? '#ffffff' : '#141414',
            secondary: currentTheme === 'dark' ? '#d0d0d0' : '#555555',
          },
        },
      });

      // Рендерим React компонент
      const root = createRoot(reactContainer);
      root.render(
        <ThemeProvider theme={theme}>
          <Advantages3D />
        </ThemeProvider>
      );

      console.log('[AdvantagesInjector] 3D блок успешно внедрен');
    };

    // Пробуем внедрить сразу
    injectAdvantages3D();

    // Пробуем через небольшую задержку (на случай если DOM еще загружается)
    const timeouts = [100, 500, 1000, 2000];
    const timeoutIds = timeouts.map(delay => 
      setTimeout(injectAdvantages3D, delay)
    );

    // Слушаем изменения темы и обновляем компонент
    const handleThemeChange = () => {
      const container = document.getElementById('advantages-3d-container');
      if (container) {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const theme = createTheme({
          palette: {
            mode: currentTheme === 'dark' ? 'dark' : 'light',
            primary: { main: '#ffbb00' },
            background: {
              default: currentTheme === 'dark' ? '#141414' : '#ffffff',
              paper: currentTheme === 'dark' ? '#1d1d1d' : '#ffffff',
            },
            text: {
              primary: currentTheme === 'dark' ? '#ffffff' : '#141414',
              secondary: currentTheme === 'dark' ? '#d0d0d0' : '#555555',
            },
          },
        });

        const root = createRoot(container);
        root.render(
          <ThemeProvider theme={theme}>
            <Advantages3D />
          </ThemeProvider>
        );
      }
    };

    // Наблюдаем за изменениями атрибута data-theme
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Cleanup
    return () => {
      timeoutIds.forEach(clearTimeout);
      observer.disconnect();
    };
  }, []);

  return null; // Этот компонент не рендерит ничего напрямую
}

