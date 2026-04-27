import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { readFileSync, writeFileSync } from 'fs';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { visualizer } from 'rollup-plugin-visualizer';
// Плагин для исправления порядка загрузки скриптов - React должен загружаться синхронно
function fixReactLoadingOrder() {
    return {
        name: 'fix-react-loading-order',
        enforce: 'post', // Выполняем после всех других плагинов
        closeBundle: function () {
            // Изменяем index.html в самом конце сборки
            var indexPath = path.join(__dirname, 'dist/index.html');
            try {
                var html = readFileSync(indexPath, 'utf-8');
                // Находим все modulepreload ссылки
                var modulepreloadRegex = /<link rel="modulepreload"[^>]*>/g;
                var modulepreloads = html.match(modulepreloadRegex) || [];
                // Находим основной script
                var scriptRegex = /<script type="module"[^>]*><\/script>/g;
                var scripts = html.match(scriptRegex) || [];
                if (modulepreloads.length === 0 || scripts.length === 0) {
                    return; // Если нет preload или scripts, ничего не делаем
                }
                // Находим react-vendor preload и удаляем его
                var otherPreloads = modulepreloads.filter(function (m) { return !m.includes('react-vendor'); });
                // Удаляем все modulepreload и script теги
                var newHtml = html.replace(modulepreloadRegex, '');
                newHtml = newHtml.replace(scriptRegex, '');
                // Находим позицию перед закрывающим </head>
                var headEndIndex = newHtml.indexOf('</head>');
                if (headEndIndex !== -1) {
                    // Собираем правильный порядок:
                    // 1. Основной script (который импортирует react-vendor)
                    // 2. Остальные preload (БЕЗ react-vendor - он загружается синхронно через основной script)
                    var toInsert = '';
                    if (scripts[0]) {
                        toInsert += scripts[0] + '\n    ';
                    }
                    // НЕ добавляем react-vendor preload - пусть загружается синхронно через основной script
                    if (otherPreloads.length > 0) {
                        toInsert += otherPreloads.join('\n    ') + '\n    ';
                    }
                    newHtml = newHtml.replace('</head>', toInsert + '</head>');
                }
                // Сохраняем измененный HTML
                writeFileSync(indexPath, newHtml, 'utf-8');
                console.log('[fix-react-loading-order] Removed react-vendor from modulepreload');
            }
            catch (error) {
                console.error('[fix-react-loading-order] Error:', error);
            }
        }
    };
}
// Читаем версию из package.json
var packageJson = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
var appVersion = packageJson.version || '1.0.0';
var buildTimestamp = Date.now().toString();
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, path.resolve(__dirname), '');
    var siteUrl = (env.VITE_SITE_URL || 'https://biletvsem.com').replace(/\/$/, '');
    return {
        plugins: [
            {
                name: 'html-site-base',
                transformIndexHtml: function (html) {
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
            // Code splitting для лучшей производительности
            rollupOptions: {
                // ВАЖНО: Отключаем code splitting полностью
                // Это гарантирует, что React будет в основном bundle
                output: {
                    // ВАЖНО: Правильная группировка chunks для Safari
                    // React должен быть в отдельном chunk и загружаться ПЕРВЫМ
                    // Это решает проблему с useState is not defined в Safari
                    manualChunks: function (id) {
                        // MUI в отдельный chunk
                        if (id.includes('@mui'))
                            return 'mui';
                        // React в отдельный chunk (ПЕРВЫЙ для загрузки)
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                            return 'react-vendor';
                        }
                        // Остальные node_modules в vendor chunk
                        if (id.includes('node_modules') && !id.includes('vite')) {
                            return 'vendor';
                        }
                        // Все остальное в main bundle
                        return undefined;
                    },
                    // Оптимизация имен файлов для кэширования
                    chunkFileNames: 'assets/js/[name]-[hash].js',
                    entryFileNames: 'assets/js/[name]-[hash].js',
                    assetFileNames: function (assetInfo) {
                        if (!assetInfo.name) {
                            return "assets/[name]-[hash][extname]";
                        }
                        var info = assetInfo.name.split('.');
                        var ext = info[info.length - 1];
                        if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
                            return "assets/img/[name]-[hash][extname]";
                        }
                        if (/woff2?|eot|ttf|otf/i.test(ext)) {
                            return "assets/fonts/[name]-[hash][extname]";
                        }
                        return "assets/[name]-[hash][extname]";
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
                    timeout: 600000,
                    proxyTimeout: 600000,
                    configure: function (proxy) {
                        proxy.on('proxyReq', function (proxyReq) {
                            proxyReq.setTimeout(0);
                        });
                        proxy.on('proxyRes', function (proxyRes) {
                            proxyRes.setTimeout(0);
                        });
                    },
                },
                // Проксируем CSS файлы на backend
                '/css': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false,
                    configure: function (proxy, _options) {
                        proxy.on('proxyRes', function (proxyRes, req) {
                            var _a;
                            if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.endsWith('.css')) {
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
                    configure: function (proxy, _options) {
                        proxy.on('proxyRes', function (proxyRes, req) {
                            var _a, _b, _c, _d, _e, _f;
                            // Убираем X-Content-Type-Options: nosniff для JS файлов
                            if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.endsWith('.js')) {
                                // Удаляем заголовок во всех возможных регистрах
                                var headers_1 = proxyRes.headers;
                                // Удаляем все варианты заголовка
                                delete headers_1['x-content-type-options'];
                                delete headers_1['X-Content-Type-Options'];
                                delete headers_1['X-CONTENT-TYPE-OPTIONS'];
                                // Удаляем через перебор всех ключей
                                Object.keys(headers_1).forEach(function (key) {
                                    if (key.toLowerCase() === 'x-content-type-options') {
                                        delete headers_1[key];
                                    }
                                });
                                // Устанавливаем правильный Content-Type
                                proxyRes.headers['content-type'] = 'application/javascript; charset=utf-8';
                                proxyRes.headers['Content-Type'] = 'application/javascript; charset=utf-8';
                            }
                            else if ((_b = req.url) === null || _b === void 0 ? void 0 : _b.endsWith('.css')) {
                                proxyRes.headers['content-type'] = 'text/css; charset=utf-8';
                                proxyRes.headers['Content-Type'] = 'text/css; charset=utf-8';
                            }
                            else if (((_c = req.url) === null || _c === void 0 ? void 0 : _c.endsWith('.png')) || ((_d = req.url) === null || _d === void 0 ? void 0 : _d.endsWith('.jpg')) || ((_e = req.url) === null || _e === void 0 ? void 0 : _e.endsWith('.jpeg'))) {
                                // Правильный Content-Type для изображений
                                if ((_f = req.url) === null || _f === void 0 ? void 0 : _f.endsWith('.png')) {
                                    proxyRes.headers['content-type'] = 'image/png';
                                }
                                else {
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
