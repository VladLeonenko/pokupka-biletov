import { defineConfig, devices } from '@playwright/test';

/**
 * Конфигурация Playwright для E2E тестирования
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Оптимизация: используем количество CPU ядер для параллелизма, но ограничиваем в CI
  workers: process.env.CI ? 1 : process.env.PW_WORKERS ? parseInt(process.env.PW_WORKERS) : undefined,
  reporter: process.env.CI ? [['html'], ['json', { outputFile: 'test-results.json' }]] : 'html',
  timeout: 30000, // Увеличиваем таймаут для стабильности
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'cd frontend && npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

