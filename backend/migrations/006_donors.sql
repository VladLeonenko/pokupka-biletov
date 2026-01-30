-- Миграция для таблицы доноров кейсов
CREATE TABLE IF NOT EXISTS donors (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, url)
);

-- Создаем индекс для быстрого поиска по категории
CREATE INDEX IF NOT EXISTS idx_donors_category ON donors(category);

-- Вставляем начальные данные из скриптов
INSERT INTO donors (category, url, sort_order) VALUES
  -- Advertising
  ('advertising', 'https://www.stroymarket.ru', 1),
  ('advertising', 'https://www.medclinic.ru', 2),
  ('advertising', 'https://www.fitness-center.ru', 3),
  ('advertising', 'https://www.avtosalon.ru', 4),
  ('advertising', 'https://www.restaurant-premium.ru', 5),
  ('advertising', 'https://www.yuridicheskaya-kompaniya.ru', 6),
  ('advertising', 'https://www.strahovaya-kompaniya.ru', 7),
  ('advertising', 'https://www.obrazovatelnyy-tsentr.ru', 8),
  ('advertising', 'https://www.salon-krasoty-premium.ru', 9),
  ('advertising', 'https://www.logisticheskaya-kompaniya.ru', 10),
  ('advertising', 'https://www.stroitelnaya-firma.ru', 11),
  ('advertising', 'https://www.fitnes-klub-premium.ru', 12),
  ('advertising', 'https://www.meditsinskaya-klinika.ru', 13),
  ('advertising', 'https://www.yurist.ru', 14),
  ('advertising', 'https://www.restaurant-group.ru', 15),
  -- Design
  ('design', 'https://www.startup-tech.ru', 1),
  ('design', 'https://www.eco-brand.ru', 2),
  ('design', 'https://www.fitness-brand.ru', 3),
  ('design', 'https://www.restaurant-chain.ru', 4),
  ('design', 'https://www.financial-service.ru', 5),
  ('design', 'https://www.tech-startup.ru', 6),
  ('design', 'https://www.premium-boutique.ru', 7),
  ('design', 'https://www.creative-agency.ru', 8),
  ('design', 'https://www.food-delivery.ru', 9),
  ('design', 'https://www.education-platform.ru', 10),
  -- SEO
  ('seo', 'https://www.real-estate-agency.ru', 1),
  ('seo', 'https://www.education-online.ru', 2),
  ('seo', 'https://www.medical-clinic-seo.ru', 3),
  ('seo', 'https://www.saas-startup.ru', 4),
  ('seo', 'https://www.ecommerce-store.ru', 5),
  ('seo', 'https://www.local-business.ru', 6),
  ('seo', 'https://www.veterinary-clinic.ru', 7),
  ('seo', 'https://www.production-company.ru', 8),
  ('seo', 'https://www.autosalon-seo.ru', 9),
  ('seo', 'https://www.beauty-salon-seo.ru', 10),
  ('seo', 'https://www.logistics-company.ru', 11),
  -- Website
  ('website', 'https://www.remont-kvartir.ru', 1),
  ('website', 'https://www.dostavka-edy.ru', 2),
  ('website', 'https://www.avtoservis.ru', 3),
  ('website', 'https://www.stroitelstvo-domov.ru', 4),
  ('website', 'https://www.obuchenie-online.ru', 5),
  ('website', 'https://www.meditsinskie-uslugi.ru', 6),
  ('website', 'https://www.yuridicheskie-uslugi.ru', 7),
  ('website', 'https://www.dizayn-intererov.ru', 8),
  ('website', 'https://www.fitness-trenery.ru', 9),
  ('website', 'https://www.kosmetologiya.ru', 10),
  ('website', 'https://www.logistika-gruzov.ru', 11),
  ('website', 'https://www.remont-ofisov.ru', 12),
  -- Mobile
  ('mobile', 'https://www.dostavka-edy-mobile.ru', 1),
  ('mobile', 'https://www.fitness-app.ru', 2),
  ('mobile', 'https://www.meditsina-online.ru', 3),
  ('mobile', 'https://www.obuchenie-mobile.ru', 4),
  -- AI
  ('ai', 'https://www.ai-assistant-business.ru', 1),
  ('ai', 'https://www.smart-analytics-company.ru', 2),
  ('ai', 'https://www.automation-solutions.ru', 3)
ON CONFLICT (category, url) DO NOTHING;

