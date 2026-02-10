import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { readFileSync } from 'fs';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Читаем версию из package.json
var packageJson = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
var appVersion = packageJson.version || '1.0.0';
var buildTimestamp = Date.now().toString();

export default defineConfig({
    plugins: [
        react(),
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
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
        'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
        // 🔥 Safari полифиллы
        global: 'globalThis',
    },
    
    publicDir: 'public',
    
    build: {
        // 🔥 SAFARI 14+ + Chrome 50+
        target: 'es2015',
        
        minify: 'terser',
        terserOptions: {
            compress: {
                // 🔥 ДЛЯ DEBUG - НЕ удаляем логи!
                drop_console: false,
                drop_debugger: false,
                pure_funcs: [],
            },
        },
        
        // 🔥 ФИНАЛЬНАЯ ОПТИМИЗАЦИЯ: ЕДИНЫЙ ENTRY POINT
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html')  // ✅ Один entry!
            },
            output: {
                // ✅ Manual chunks ТОЛЬКО core vendors!
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
                    'query-vendor': ['@tanstack/react-query'],
                    'utils-vendor': ['date-fns', 'zod', 'classnames'],
                },
                
                // ✅ НЕ инлайнить lazy chunks (React.lazy() работает!)
                inlineDynamicImports: false,
                
                // ✅ Имена файлов для LONG cache
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/index-[hash].js',  // ✅ ОДИН index!
                
                assetFileNames: function (assetInfo) {
                    if (!assetInfo.name) {
                        return "assets/[name]-[hash][extname]";
                    }
                    var info = assetInfo.name.split('.');
                    var ext = info[info.length - 1];
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
                        return "assets/img/[name]-[hash].[ext]";
                    }
                    if (/woff2?|eot|ttf|otf/i.test(ext)) {
                        return "assets/fonts/[name]-[hash].[ext]";
                    }
                    return "assets/[name]-[hash].[ext]";
                },
            },
        },
        
        // 🔥 Игнорируем большие lazy chunks (PageBuilder 1.2MB = OK!)
        chunkSizeWarningLimit: 1200,
        
        // 🔥 Source maps для Safari debug
        sourcemap: true,
        
        // ✅ CSS отдельно по страницам
        cssCodeSplit: true,
        cssMinify: true,
        
        // ✅ Маленькие SVG инлайн
        assetsInlineLimit: 4096,
    },
    
    optimizeDeps: {
        // 🔥 Предзагрузка core для Safari
        include: [
            'react', 
            'react-dom', 
            'react-router-dom',
            '@mui/material',
            '@tanstack/react-query'
        ]
    },
    
    server: {
        fs: {
            allow: [path.resolve(__dirname)],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
                ws: true,
            },
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
            '/legacy': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
                configure: function (proxy, _options) {
                    proxy.on('proxyRes', function (proxyRes, req) {
                        var _a, _b, _c, _d, _e, _f;
                        if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.endsWith('.js')) {
                            var headers_1 = proxyRes.headers;
                            delete headers_1['x-content-type-options'];
                            delete headers_1['X-Content-Type-Options'];
                            delete headers_1['X-CONTENT-TYPE-OPTIONS'];
                            Object.keys(headers_1).forEach(function (key) {
                                if (key.toLowerCase() === 'x-content-type-options') {
                                    delete headers_1[key];
                                }
                            });
                            proxyRes.headers['content-type'] = 'application/javascript; charset=utf-8';
                        }
                        else if ((_b = req.url) === null || _b === void 0 ? void 0 : _b.endsWith('.css')) {
                            proxyRes.headers['content-type'] = 'text/css; charset=utf-8';
                        }
                        else if (((_c = req.url) === null || _c === void 0 ? void 0 : _c.endsWith('.png')) || ((_d = req.url) === null || _d === void 0 ? void 0 : _d.endsWith('.jpg')) || ((_e = req.url) === null || _e === void 0 ? void 0 : _e.endsWith('.jpeg'))) {
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
});
