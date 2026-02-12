/**
 * DataLayer для целей Яндекс.Метрики и ecommerce.
 * Формат совместим с Enhanced Ecommerce (GA) и Яндекс.Метрикой.
 * 
 * В интерфейсе Метрики: Настройки → Цели → создать цель "JavaScript-событие"
 * Идентификатор цели = тот же, что в pushReachGoal / ecommerce action.
 */

const COUNTER_ID = 106795462;
const CURRENCY = 'RUB';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    ym?: (id: number, method: string, ...args: unknown[]) => void;
  }
}

function getDataLayer(): Array<Record<string, unknown>> {
  if (typeof window === 'undefined') return [];
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

export interface DataLayerProduct {
  id: string;
  name: string;
  price?: number;
  brand?: string;
  category?: string;
  quantity?: number;
  list?: string;
  position?: number;
}

/** Просмотр товара (страница продукта) */
export function pushProductView(product: DataLayerProduct, list = 'Product detail'): void {
  getDataLayer().push({
    ecommerce: {
      currencyCode: CURRENCY,
      detail: {
        products: [{ ...product, list }],
      },
    },
  });
}

/** Добавление в корзину */
export function pushAddToCart(product: DataLayerProduct): void {
  getDataLayer().push({
    ecommerce: {
      currencyCode: CURRENCY,
      add: {
        products: [{ ...product, quantity: product.quantity ?? 1 }],
      },
    },
  });
}

/** Удаление из корзины */
export function pushRemoveFromCart(product: DataLayerProduct): void {
  getDataLayer().push({
    ecommerce: {
      currencyCode: CURRENCY,
      remove: {
        products: [{ ...product, quantity: product.quantity ?? 1 }],
      },
    },
  });
}

/** Покупка (оформление заказа) */
export function pushPurchase(
  orderId: string,
  products: DataLayerProduct[],
  revenue?: number
): void {
  getDataLayer().push({
    ecommerce: {
      currencyCode: CURRENCY,
      purchase: {
        actionField: { id: orderId, ...(revenue != null && { revenue }) },
        products,
      },
    },
  });
}

/** Просмотр списка товаров (каталог) */
export function pushProductList(products: DataLayerProduct[], listName = 'Catalog'): void {
  getDataLayer().push({
    ecommerce: {
      currencyCode: CURRENCY,
      impressions: products.map((p, i) => ({
        ...p,
        list: listName,
        position: i + 1,
      })),
    },
  });
}

/** Клик по товару в списке */
export function pushProductClick(product: DataLayerProduct, list = 'Catalog'): void {
  getDataLayer().push({
    ecommerce: {
      currencyCode: CURRENCY,
      click: {
        products: [{ ...product, list }],
      },
    },
  });
}

/**
 * Кастомная цель (форма, квиз, кнопка).
 * Создай в Метрике цель типа "JavaScript-событие" с идентификатором = target.
 */
export function pushReachGoal(
  target: string,
  params?: { order_price?: number; currency?: string }
): void {
  if (typeof window !== 'undefined' && window.ym) {
    if (params) {
      window.ym(COUNTER_ID, 'reachGoal', target, params);
    } else {
      window.ym(COUNTER_ID, 'reachGoal', target);
    }
  }
  // Для GTM/логирования — событие в dataLayer (Метрика ecommerce это не обрабатывает)
  getDataLayer().push({
    event: 'ym_reach_goal',
    goal: target,
    goalParams: params,
  });
}
