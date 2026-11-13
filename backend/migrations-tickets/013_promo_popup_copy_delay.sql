-- Нормальный текст + показ попапа через ~12с

UPDATE promo_popup_campaigns
SET
  headline = 'Ваш промокод на 10%',
  body_text = E'Ваш личный промокод на любое мероприятие, кроме Большого театра.\n\nСкидка 10%, действует 60 минут. Успейте выбрать билеты.',
  delay_ms = 12000,
  updated_at = NOW()
WHERE slug = 'except-bolshoi-10';
