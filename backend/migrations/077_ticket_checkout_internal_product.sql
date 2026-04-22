-- Служебный товар для позиций заказа «билеты GetBilet» (без витрины магазина)
INSERT INTO products (slug, title, description_html, price_cents, currency, is_active, sort_order)
VALUES (
  'internal-getbilet-ticket',
  'Билеты на мероприятие',
  'Системная позиция заказа билетной витрины (GetBilet). Не отображается в каталоге.',
  0,
  'RUB',
  TRUE,
  -10000
)
ON CONFLICT (slug) DO NOTHING;
