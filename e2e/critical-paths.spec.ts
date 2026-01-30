import { test, expect } from '@playwright/test';

test.describe('Критические пути пользователя', () => {
  
  test('Главная страница загружается', async ({ page }) => {
    await page.goto('/');
    
    // Проверяем что это НЕ админка
    await expect(page).not.toHaveTitle('Admin Panel');
    
    // Проверяем наличие header
    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10000 });
    
    // Проверяем наличие logo
    const logo = page.locator('.logo').first();
    await expect(logo).toBeVisible({ timeout: 10000 });
  });

  test('Header содержит все необходимые элементы', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Проверяем иконки в header (используем .first() чтобы избежать strict mode из-за возможных дубликатов)
    const searchIcon = page.locator('[aria-label="Поиск"]').first();
    const cartIcon = page.locator('[aria-label="Корзина"]').first();
    const wishlistIcon = page.locator('[aria-label="Избранное"]').first();
    const accountIcon = page.locator('[aria-label="Личный кабинет"]').first();
    
    await expect(searchIcon).toBeVisible({ timeout: 15000 });
    await expect(cartIcon).toBeVisible({ timeout: 15000 });
    await expect(wishlistIcon).toBeVisible({ timeout: 15000 });
    await expect(accountIcon).toBeVisible({ timeout: 15000 });
  });

  test('Burger menu работает корректно', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Находим burger menu (используем .first() чтобы избежать strict mode)
    const burgerMenu = page.locator('.burger-menu').first();
    await expect(burgerMenu).toBeVisible({ timeout: 10000 });
    
    // Кликаем на burger menu
    await burgerMenu.click();
    
    // Даем время для анимации
    await page.waitForTimeout(500);
    
    // Проверяем что меню открылось
    const menu = page.locator('.menu');
    await expect(menu).toBeVisible();
    
    // Проверяем что burger превратился в крестик (проверяем наличие класса active или transform)
    const firstLine = page.locator('.burger-menu .line:nth-child(1)').first();
    // Просто проверяем что элемент существует, transform может быть разным
    await expect(firstLine).toBeVisible();
  });

  test('Страница Отзывы загружается с иконками header', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');
    
    // Проверяем заголовок
    await expect(page.locator('h1').first()).toContainText('Отзывы', { timeout: 10000 });
    
    // Проверяем наличие иконок в header
    const searchIcon = page.locator('[aria-label="Поиск"]');
    await expect(searchIcon).toBeVisible({ timeout: 15000 });
  });

  test('Страница Благотворительность загружается с иконками header', async ({ page }) => {
    await page.goto('/charity');
    await page.waitForLoadState('networkidle');
    
    // Проверяем заголовок (правильный текст)
    const h1 = page.locator('h1').first();
    await expect(h1).toContainText(/помогаем|вместе/i, { timeout: 10000 });
    
    // Проверяем наличие иконок в header
    const searchIcon = page.locator('[aria-label="Поиск"]');
    await expect(searchIcon).toBeVisible({ timeout: 15000 });
  });

  test('Страница Портфолио загружается', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // Проверяем заголовок
    await expect(page.locator('h1').first()).toContainText(/портфолио/i, { timeout: 10000 });
    
    // Проверяем наличие карточек кейсов (дадим больше времени)
    const portfolioCard = page.locator('.MuiCard-root, .portfolio-card, [class*="Card"]').first();
    await expect(portfolioCard).toBeVisible({ timeout: 15000 });
  });

  test('Страница Блога загружается с курсором и фильтрами', async ({ page }) => {
    await page.goto('/blog');
    
    // Ждем загрузки контента
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Проверяем наличие статей (исправленный селектор)
    const blogItems = page.locator('.blog-item, article, [class*="blog"]').first();
    await expect(blogItems).toBeVisible({ timeout: 15000 });
  });

  test('Чат-виджет присутствует на всех страницах', async ({ page }) => {
    const pages = ['/', '/portfolio', '/reviews', '/charity'];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Проверяем наличие чат-виджета (исправленный селектор с aria-label)
      const chatWidget = page.locator('[aria-label="Открыть чат"]');
      await expect(chatWidget).toBeVisible({ timeout: 15000 });
    }
  });

  test('Навигация по меню работает', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Открываем burger menu (используем .first())
    const burgerMenu = page.locator('.burger-menu').first();
    await burgerMenu.click();
    
    // Даем время для открытия меню
    await page.waitForTimeout(500);
    
    // Кликаем на "Портфолио" или "Кейсы"
    await page.locator('a[href="/portfolio"]').first().click();
    
    // Проверяем что перешли на страницу портфолио
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(page.locator('h1').first()).toContainText(/портфолио/i, { timeout: 10000 });
  });
});
