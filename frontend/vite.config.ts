import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { readFileSync } from 'fs';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Читаем версию из package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
const appVersion = packageJson.version || '1.0.0';
const buildTimestamp = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Копируем legacy файлы в dist/legacy при сборке
    // Сохраняем структуру папок (css/, js/, img/, fonts/)
    viteStaticCopy({
      targets: [
        {
          src: 'public/legacy/css/**/*',
          dest: 'legacy/css'
        },
        {
          src: 'public/legacy/js/**/*',
          dest: 'legacy/js'
        },
        {
          src: 'public/legacy/img/**/*',
          dest: 'legacy/img'
        },
        {
          src: 'public/legacy/fonts/**/*',
          dest: 'legacy/fonts'
        },
        {
          src: 'public/sw.js',
          dest: '.'
        },
        {
          src: 'public/manifest.json',
          dest: '.'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Инжектим версию и timestamp в код
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
  },
  // Копируем Service Worker в корень dist
  publicDir: 'public',
  build: {
    // Оптимизация production сборки
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Удаляем console.log в production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    // Code splitting для лучшей производительности
    rollupOptions: {
      output: {
        manualChunks: {
          // Выделяем vendor библиотеки в отдельные чанки
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'query-vendor': ['@tanstack/react-query'],
          'utils-vendor': ['date-fns', 'zod', 'classnames'],
        },
        // Оптимизация имен файлов для кэширования
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) {
            return `assets/[name]-[hash][extname]`;
          }
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/img/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Увеличиваем лимит предупреждений для больших бандлов
    chunkSizeWarningLimit: 1000,
    // Включаем source maps только для production (для отладки)
    sourcemap: false,
    // Оптимизация CSS
    cssCodeSplit: true,
    cssMinify: true,
    // Оптимизация ассетов
    assetsInlineLimit: 4096, // Инлайним маленькие файлы (< 4KB)
  },
  server: {
    fs: {
      // allow importing from project root
      allow: [path.resolve(__dirname)],
    },
    proxy: {
      // Проксируем все API запросы на backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // Для WebSocket соединений
      },
      // Проксируем CSS файлы на backend
      '/css': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req) => {
            if (req.url?.endsWith('.css')) {
              proxyRes.headers['content-type'] = 'text/css; charset=utf-8';
            }
          });
        },
      },
      // Проксируем /legacy на backend, который проверяет и dist/legacy, и public/legacy
      '/legacy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req) => {
            // Убираем X-Content-Type-Options: nosniff для JS файлов
            if (req.url?.endsWith('.js')) {
              // Удаляем заголовок во всех возможных регистрах
              const headers = proxyRes.headers;
              // Удаляем все варианты заголовка
              delete headers['x-content-type-options'];
              delete headers['X-Content-Type-Options'];
              delete headers['X-CONTENT-TYPE-OPTIONS'];
              // Удаляем через перебор всех ключей
              Object.keys(headers).forEach(key => {
                if (key.toLowerCase() === 'x-content-type-options') {
                  delete headers[key];
                }
              });
              // Устанавливаем правильный Content-Type
              proxyRes.headers['content-type'] = 'application/javascript; charset=utf-8';
              proxyRes.headers['Content-Type'] = 'application/javascript; charset=utf-8';
            } else if (req.url?.endsWith('.css')) {
              proxyRes.headers['content-type'] = 'text/css; charset=utf-8';
              proxyRes.headers['Content-Type'] = 'text/css; charset=utf-8';
            } else if (req.url?.endsWith('.png') || req.url?.endsWith('.jpg') || req.url?.endsWith('.jpeg')) {
              // Правильный Content-Type для изображений
              if (req.url?.endsWith('.png')) {
                proxyRes.headers['content-type'] = 'image/png';
              } else {
                proxyRes.headers['content-type'] = 'image/jpeg';
              }
            }
          });
        },
      },
    },
  },
});


