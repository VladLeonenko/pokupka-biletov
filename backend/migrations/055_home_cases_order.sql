-- Порядок кейсов на главной странице
ALTER TABLE cases ADD COLUMN IF NOT EXISTS home_order INTEGER DEFAULT NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS home_card JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_home_order ON cases(home_order) WHERE home_order IS NOT NULL;

COMMENT ON COLUMN cases.home_order IS 'Порядок на главной. NULL = не показывать. Меньше = выше.';
COMMENT ON COLUMN cases.home_card IS 'Карточка на главной: {year, type, image}. Опционально.';

-- Начальный порядок: umagazine, kchtz, houses, polygon, madeo, straumann, alaska, ursus, straumann-mobile, leta, winwin
UPDATE cases SET home_order = 0, home_card = '{"year":"2026","type":"кейс по разработке САЙТа","image":"/uploads/images/hero-umagazine-1771257595209.png"}'::jsonb WHERE slug = 'umagazine-case';
UPDATE cases SET home_order = 1, home_card = '{"year":"2025","type":"кейс по разработке САЙТа","image":"/uploads/images/catalog-2-1771254502039.png"}'::jsonb WHERE slug = 'kchtz-case';
UPDATE cases SET home_order = 2 WHERE slug = 'houses-case';
UPDATE cases SET home_order = 3 WHERE slug = 'polygon-case';
UPDATE cases SET home_order = 4 WHERE slug = 'madeo-case';
UPDATE cases SET home_order = 5 WHERE slug = 'straumann-case';
UPDATE cases SET home_order = 6, home_card = '{"year":"2022","type":"кейс по редизайну сайта"}'::jsonb WHERE slug = 'alaska-case';
UPDATE cases SET home_order = 7, home_card = '{"year":"2019","type":"кейс по продвижению САЙТа"}'::jsonb WHERE slug = 'ursus-case';
UPDATE cases SET home_order = 8, home_card = '{"year":"2021","type":"кейс по МОБИЛЬНОму ПРИЛОЖЕНИю"}'::jsonb WHERE slug = 'straumann-mobile-case';
UPDATE cases SET home_order = 9 WHERE slug = 'leta-case';
UPDATE cases SET home_order = 10 WHERE slug = 'winwin-case';
