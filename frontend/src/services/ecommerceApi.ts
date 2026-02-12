import { CartItem, WishlistItem, Order, SearchFilters, ProductItem, ProductCategory } from '@/types/cms';
import Cookies from 'js-cookie';

import { getApiBase } from '@/utils/apiBase';

// Вычисляем динамически, а не один раз при загрузке модуля
function getApiBaseUrl(): string {
  return getApiBase();
}
function getToken(): string | null {
  return Cookies.get('auth_token') || null;
}

function getSessionId(): string | null {
  try { return sessionStorage.getItem('session.id') || localStorage.getItem('session.id'); } catch { return null; }
}

function setSessionId(sessionId: string) {
  try {
    sessionStorage.setItem('session.id', sessionId);
    localStorage.setItem('session.id', sessionId);
  } catch {}
}

function authHeaders(init?: HeadersInit): HeadersInit {
  const token = getToken();
  const sessionId = getSessionId();
  return {
    ...(init || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(sessionId ? { 'x-session-id': sessionId } : {}),
  };
}

async function doFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = authHeaders(init?.headers as any);
  const response = await fetch(input, { ...(init || {}), headers });
  
  // Сохраняем session ID если он пришел в заголовке
  const newSessionId = response.headers.get('x-session-id');
  if (newSessionId) {
    setSessionId(newSessionId);
  }
  
// Глобальная обработка 401 - токен истек или невалиден
if (response.status === 401 && !input.includes('/api/public/') && !input.includes('/api/auth/')) {
  // Только для защищенных эндпоинтов - просто очищаем токен
  console.warn('[ecommerceApi] 401 Unauthorized - clearing auth token (no redirect)');
  try {
    Cookies.remove('auth_token');
    localStorage.removeItem('auth_user');
    // НЕ редиректим! Пусть роутер (App.tsx) сам решает что делать
  } catch (e) {
    console.error('[ecommerceApi] Error handling 401:', e);
  }
}


  
  // Для публичных эндпоинтов не обрабатываем 401 как ошибку
  if (response.status === 401 && input.includes('/api/public/')) {
    // Публичные эндпоинты не должны требовать авторизацию
    // Возвращаем ответ как есть, пусть вызывающий код решает
  }
  
  return response;
}

// ==================== Корзина ====================
export async function getCart(): Promise<{ items: CartItem[]; sessionId?: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/cart`);
  if (!res.ok) throw new Error('Failed to fetch cart');
  const data = await res.json();
  if (data.sessionId) setSessionId(data.sessionId);
  return data;
}

export async function addToCart(productSlug: string, quantity: number = 1): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productSlug, quantity }),
  });
  if (!res.ok) throw new Error('Failed to add to cart');
  const data = await res.json();
  if (data.sessionId) setSessionId(data.sessionId);
}

export async function updateCartItem(id: number, quantity: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/cart/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('Failed to update cart item');
}

export async function removeFromCart(id: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/cart/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove from cart');
}

export async function clearCart(): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/cart`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear cart');
}

export async function syncCart(): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/cart/sync`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to sync cart');
}

// ==================== Избранное ====================
export async function getWishlist(): Promise<{ items: WishlistItem[] }> {
  // Проверяем токен перед любым запросом
  const token = getToken();
  if (!token || token.trim() === '') {
    // Если нет токена, возвращаем пустой список без запроса
    return { items: [] };
  }
  
  try {
    const res = await doFetch(`${getApiBaseUrl()}/api/wishlist`);
    if (!res.ok) {
      // Если пользователь не авторизован, возвращаем пустой список
      if (res.status === 401 || res.status === 403) {
        return { items: [] };
      }
      throw new Error('Failed to fetch wishlist');
    }
    return res.json();
  } catch (error) {
    // В случае любой ошибки возвращаем пустой список
    console.warn('[getWishlist] Error fetching wishlist:', error);
    return { items: [] };
  }
}

export async function addToWishlist(productSlug: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/wishlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productSlug }),
  });
  if (!res.ok) throw new Error('Failed to add to wishlist');
}

export async function removeFromWishlist(productSlug: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/wishlist/${encodeURIComponent(productSlug)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove from wishlist');
}

export async function checkInWishlist(productSlug: string): Promise<boolean> {
  const res = await doFetch(`${getApiBaseUrl()}/api/wishlist/check/${encodeURIComponent(productSlug)}`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.inWishlist;
}

// ==================== Поиск ====================
export async function searchProducts(filters: SearchFilters & { limit?: number; offset?: number }): Promise<{
  products: ProductItem[];
  total: number;
  limit: number;
  offset: number;
}> {
  const params = new URLSearchParams();
  if (filters.searchQuery) params.append('q', filters.searchQuery);
  if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
  if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
  if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
  if (filters.tags) {
    filters.tags.forEach(tag => params.append('tags', tag));
  }
  if (filters.inStock) params.append('inStock', 'true');
  if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());
  
  const res = await doFetch(`${getApiBaseUrl()}/api/public/search?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search products');
  return res.json();
}

export async function getSearchCategories(): Promise<ProductCategory[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/search/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function getSearchTags(): Promise<string[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/search/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

// ==================== Заказы ====================
export async function createOrder(orderData: {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: any;
  paymentMethod?: string;
  notes?: string;
}): Promise<{ order: Order }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) throw new Error('Failed to create order');
  return res.json();
}

export async function getMyOrders(): Promise<{ orders: Order[] }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/orders/my`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function getOrder(orderNumber: string): Promise<{ order: Order }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/public/orders/${encodeURIComponent(orderNumber)}`);
  if (!res.ok) throw new Error('Failed to fetch order');
  return res.json();
}

export type AdminOrder = Order & { clientId?: number };

export async function listAdminOrders(): Promise<{ orders: AdminOrder[] }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/orders/admin`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function updateOrderStatus(orderNumber: string, data: { status?: string; paymentStatus?: string }): Promise<{ updated: Order }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update order');
  return res.json();
}

// ==================== Аналитика ====================
export async function trackProductEvent(productSlug: string, eventType: 'view' | 'click' | 'add_to_cart' | 'add_to_wishlist' | 'purchase' | 'case_view', metadata?: any): Promise<void> {
  try {
    // Используем обычный fetch для публичного эндпоинта, без авторизации
    const res = await fetch(`${getApiBaseUrl()}/api/public/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productSlug, eventType, metadata }),
    });
    // Не бросаем ошибку, если запрос не удался - это не критично для аналитики
    if (!res.ok) {
      console.warn('Failed to track event:', res.status);
    }
  } catch (error) {
    // Игнорируем ошибки трекинга - они не должны влиять на работу страницы
    console.warn('Error tracking event:', error);
  }
}

export async function getProductAnalytics(productSlug?: string, days: number = 30): Promise<any> {
  const params = new URLSearchParams();
  params.append('days', days.toString());
  if (productSlug) params.append('productSlug', productSlug);
  
  const url = productSlug 
    ? `${getApiBaseUrl()}/api/analytics/${encodeURIComponent(productSlug)}?${params.toString()}`
    : `${getApiBaseUrl()}/api/analytics?${params.toString()}`;
  
  const res = await doFetch(url);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

// ==================== Аутентификация ====================
export async function register(
  email: string,
  password: string,
  name?: string,
  phone?: string,
  agreeToTerms?: boolean,
  agreeToPrivacy?: boolean
): Promise<{ token: string; user: any; requiresVerification?: boolean }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name,
      phone,
      agreeToTerms,
      agreeToPrivacy
    }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Ошибка при регистрации' }));
    throw new Error(error.error || 'Failed to register');
  }
  return res.json();
}

export async function registerPhone(phone: string, name?: string): Promise<{ userId: number; requiresVerification: boolean }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/auth/register-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to register phone');
  }
  return res.json();
}

export async function verifyCode(emailOrPhone: string, code: string, isEmail: boolean): Promise<{ token: string; user: any }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isEmail ? { email: emailOrPhone, code } : { phone: emailOrPhone, code }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to verify code');
  }
  return res.json();
}

export async function oauthGoogle(token: string): Promise<{ token: string; user: any }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/auth/oauth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to authenticate with Google');
  }
  return res.json();
}

export async function oauthYandex(token: string): Promise<{ token: string; user: any }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/auth/oauth/yandex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to authenticate with Yandex');
  }
  return res.json();
}

export async function getCurrentUser(): Promise<{ user: any }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/auth/me`);
  if (!res.ok) throw new Error('Failed to get current user');
  return res.json();
}


// ==================== Product Categories ====================
export async function listProductCategories(activeOnly = false): Promise<ProductCategory[]> {
  const url = activeOnly 
    ? `${getApiBaseUrl()}/api/public/product-categories`
    : `${getApiBaseUrl()}/api/product-categories`;
  const res = await doFetch(url);
  if (!res.ok) throw new Error('Failed to fetch product categories');
  return res.json();
}

export async function getProductCategory(id: number): Promise<ProductCategory> {
  const res = await doFetch(`${getApiBaseUrl()}/api/product-categories/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product category');
  return res.json();
}

export async function createProductCategory(data: Partial<ProductCategory>): Promise<ProductCategory> {
  const res = await doFetch(`${getApiBaseUrl()}/api/product-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create category' }));
    throw new Error(error.error || 'Failed to create product category');
  }
  return res.json();
}

export async function updateProductCategory(id: number, data: Partial<ProductCategory>): Promise<ProductCategory> {
  const res = await doFetch(`${getApiBaseUrl()}/api/product-categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to update category' }));
    throw new Error(error.error || 'Failed to update product category');
  }
  const result = await res.json();
  return result.updated || result;
}

export async function deleteProductCategory(id: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/product-categories/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to delete category' }));
    throw new Error(error.error || 'Failed to delete product category');
  }
}
