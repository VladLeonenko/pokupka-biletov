import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { readFileSync } from 'fs';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { visualizer } from 'rollup-plugin-visualizer';

// Читаем версию из package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
const appVersion = packageJson.version || '1.0.0';
const buildTimestamp = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '');
  const siteUrl = (env.VITE_SITE_URL || 'https://biletvsem.com').replace(/\/$/, '');

  return {
  plugins: [
    {
      name: 'html-site-base',
      transformIndexHtml(html) {
        return html.split('__SITE_BASE__').join(siteUrl);
      },
    },
    react(),
    // Визуализация bundle для анализа
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // treemap, sunburst, network
    }),
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
    // Убеждаемся, что PROD правильно определяется в production build
    'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
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
    // Vite/Rollup сами строят безопасный граф чанков.
    // Ручной vendor/react-vendor split давал циклические чанки и ReferenceError в production.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('/react/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('@tanstack/react-query')) return 'query';
          if (id.includes('date-fns')) return 'date-fns';
          return 'vendor';
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
    // При inlineDynamicImports: true будет один большой bundle (~3MB)
    chunkSizeWarningLimit: 5000,
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
      // Статика загрузок (POST /api/images → /uploads/images/...) — без этого в dev <img src="/uploads/..."> даёт 404
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Проксируем все API запросы на backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // Для WebSocket соединений
        // Долгий live-каталог GetBilet иначе даёт 504 у прокси Vite (http-proxy).
        timeout: 600_000,
        proxyTimeout: 600_000,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setTimeout(0);
          });
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.setTimeout(0);
          });
        },
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
  };
});



