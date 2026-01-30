import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPublicPromotions } from '@/services/publicApi';

/**
 * Компонент для скрытия промокодов на сайте
 * Промокоды скрываются в различных местах в зависимости от hiddenLocation
 */
export function HiddenPromoCodeInjector() {
  const { data: promotions = [] } = useQuery({
    queryKey: ['public-promotions'],
    queryFn: listPublicPromotions,
    enabled: true,
    staleTime: 30000,
  });

  useEffect(() => {
    // Находим активные промокоды с указанным местом скрытия
    const activePromoCodes = promotions.filter(
      (p: any) => p.isActive && p.promoCode && p.hiddenLocation
    );

    if (activePromoCodes.length === 0) return;

    // Обрабатываем каждый промокод
    activePromoCodes.forEach((promo: any) => {
      const { promoCode, hiddenLocation } = promo;
      
      // Разные способы скрытия промокода
      if (hiddenLocation.toLowerCase() === 'footer') {
        // Скрываем в footer
        const footer = document.querySelector('footer');
        if (footer) {
          // Добавляем в data-атрибут или в скрытый span
          const hiddenSpan = document.createElement('span');
          hiddenSpan.style.display = 'none';
          hiddenSpan.setAttribute('data-hidden-promo', promoCode);
          hiddenSpan.textContent = promoCode;
          footer.appendChild(hiddenSpan);
        }
      } else if (hiddenLocation.toLowerCase() === 'header') {
        // Скрываем в header
        const header = document.querySelector('header');
        if (header) {
          const hiddenSpan = document.createElement('span');
          hiddenSpan.style.display = 'none';
          hiddenSpan.setAttribute('data-hidden-promo', promoCode);
          hiddenSpan.textContent = promoCode;
          header.appendChild(hiddenSpan);
        }
      } else if (hiddenLocation.toLowerCase().includes('comment')) {
        // Скрываем в HTML комментарии
        const comment = document.createComment(` PromoCode: ${promoCode} `);
        document.body.appendChild(comment);
      } else {
        // Пытаемся найти элемент по селектору
        try {
          const element = document.querySelector(hiddenLocation);
          if (element) {
            const hiddenSpan = document.createElement('span');
            hiddenSpan.style.cssText = 'position: absolute; left: -9999px; opacity: 0; pointer-events: none;';
            hiddenSpan.setAttribute('data-hidden-promo', promoCode);
            hiddenSpan.textContent = promoCode;
            element.appendChild(hiddenSpan);
          }
        } catch (e) {
          console.warn('Invalid selector for hidden location:', hiddenLocation);
        }
      }
    });
  }, [promotions]);

  return null; // Компонент не рендерит ничего видимого
}







