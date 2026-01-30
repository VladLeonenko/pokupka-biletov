import { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';

/**
 * Компонент переключателя темы для публичной части сайта
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Получаем тему из localStorage или используем системную
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('public.theme') as 'light' | 'dark' | null;
      if (saved) return saved;
      // Проверяем системную тему
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'dark'; // По умолчанию темная тема (текущая версия сайта)
  });

  useEffect(() => {
    // Применяем тему к document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('public.theme', theme);

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
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--text-color', '#141414');
      root.style.setProperty('--header-bg', '#ffffff');
      root.style.setProperty('--border-color', '#e0e0e0');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#141414';
    }

    // Применяем стили к header и footer (legacy части)
    const header = document.querySelector('header') as HTMLElement;
    const footer = document.querySelector('footer') as HTMLElement;
    const sections = document.querySelectorAll('section, .section');
    
    if (theme === 'dark') {
      if (header) {
        header.style.background = 'transparent';
        header.style.backgroundColor = 'transparent';
        header.style.color = '#ffffff';
      }
      if (footer) {
        footer.style.background = 'transparent';
        footer.style.backgroundColor = 'transparent';
        footer.style.color = '#ffffff';
      }
      sections.forEach((section) => {
        const el = section as HTMLElement;
        // Только если нет явного backgroundColor
        if (!el.style.backgroundColor || el.style.backgroundColor === 'rgb(255, 255, 255)' || el.style.backgroundColor === '#ffffff' || el.style.backgroundColor === 'white') {
          el.style.backgroundColor = '#141414';
        }
        el.style.color = '#ffffff';
      });
    } else {
      if (header) {
        header.style.background = 'transparent';
        header.style.backgroundColor = 'transparent';
        header.style.color = '#141414';
      }
      if (footer) {
        footer.style.background = 'transparent';
        footer.style.backgroundColor = 'transparent';
        footer.style.color = '#141414';
      }
      sections.forEach((section) => {
        const el = section as HTMLElement;
        // Только если нет явного backgroundColor
        if (!el.style.backgroundColor || el.style.backgroundColor === 'rgb(20, 20, 20)' || el.style.backgroundColor === '#141414') {
          el.style.backgroundColor = '#ffffff';
        }
        el.style.color = '#141414';
      });
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <Tooltip title={theme === 'light' ? 'Темная тема' : 'Светлая тема'}>
      <IconButton
        onClick={toggleTheme}
        sx={{ 
          color: 'inherit',
          width: '40px',
          height: '40px',
          padding: '8px'
        }}
        aria-label={theme === 'light' ? 'Переключить на темную тему' : 'Переключить на светлую тему'}
      >
        {theme === 'light' ? <Brightness4 /> : <Brightness7 />}
      </IconButton>
    </Tooltip>
  );
}

