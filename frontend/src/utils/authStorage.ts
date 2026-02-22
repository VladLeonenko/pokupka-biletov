import Cookies from 'js-cookie';

/**
 * authStorage - универсальное хранилище для токена с fallback для Safari ITP
 * 
 * Проблема Safari ITP:
 * - localStorage блокируется через 2-3 минуты бездействия
 * - cookies с SameSite=Strict работают надежнее
 * 
 * Решение:
 * 1. sessionStorage (основной) - Safari НЕ удаляет при закрытии вкладки
 * 2. localStorage (fallback) - для совместимости
 * 3. cookies (fallback) - для Safari ITP
 */

const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';
const COOKIE_TOKEN_KEY = 'auth_token';

/**
 * Получить токен из всех доступных источников
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Пробуем sessionStorage (основной для Safari)
    let token: string | null = null;
    try {
      token = sessionStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.warn('[authStorage] sessionStorage.getItem failed:', e);
    }
    if (token) return token;

    // 2. Fallback на localStorage
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.warn('[authStorage] localStorage.getItem failed:', e);
    }
    if (token) {
      // Синхронизируем в sessionStorage для будущего использования
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
      } catch (e) {
        console.warn('[authStorage] Failed to sync to sessionStorage:', e);
      }
      return token;
    }

    // 3. Fallback на cookies (AuthProvider хранит в auth_token, Safari ITP)
    try {
      token = Cookies.get(COOKIE_TOKEN_KEY) || null;
      if (token) {
        try {
          sessionStorage.setItem(TOKEN_KEY, token);
        } catch (e) {
          console.warn('[authStorage] Failed to sync cookie to sessionStorage:', e);
        }
        return token;
      }
    } catch (e) {
      console.warn('[authStorage] Cookie read failed:', e);
    }
  } catch (error) {
    console.error('[authStorage] Error getting token:', error);
  }

  return null;
}

/**
 * Сохранить токен во все доступные хранилища
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. sessionStorage (основной)
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.warn('[authStorage] Failed to set sessionStorage:', e);
  }

  try {
    // 2. localStorage (fallback)
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.warn('[authStorage] Failed to set localStorage:', e);
  }

  try {
    // 3. Secure cookie для Safari ITP (30 дней)
    const maxAge = 30 * 24 * 60 * 60; // 30 дней
    const isSecure = window.location.protocol === 'https:';
    const cookieOptions = [
      `${COOKIE_TOKEN_KEY}=${token}`,
      `path=/`,
      `max-age=${maxAge}`,
      isSecure ? 'Secure' : '',
      'SameSite=Strict',
    ].filter(Boolean).join('; ');
    
    document.cookie = cookieOptions;
  } catch (e) {
    console.warn('[authStorage] Failed to set cookie:', e);
  }
}

/**
 * Удалить токен из всех хранилищ
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn('[authStorage] Failed to remove from sessionStorage:', e);
  }

  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn('[authStorage] Failed to remove from localStorage:', e);
  }

  try {
    // Удаляем cookie
    document.cookie = `${COOKIE_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  } catch (e) {
    console.warn('[authStorage] Failed to remove cookie:', e);
  }
}

/**
 * Получить пользователя из хранилища
 */
export function getAuthUser(): any | null {
  if (typeof window === 'undefined') return null;

  try {
    // Пробуем sessionStorage
    let userStr = sessionStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }

    // Fallback на localStorage
    userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Синхронизируем в sessionStorage
        try {
          sessionStorage.setItem(USER_KEY, userStr);
        } catch (e) {
          console.warn('[authStorage] Failed to sync user to sessionStorage:', e);
        }
        return user;
      } catch {
        return null;
      }
    }
  } catch (error) {
    console.error('[authStorage] Error getting user:', error);
  }

  return null;
}

/**
 * Сохранить пользователя в хранилище
 */
export function setAuthUser(user: any): void {
  if (typeof window === 'undefined') return;

  const userStr = JSON.stringify(user);

  try {
    sessionStorage.setItem(USER_KEY, userStr);
  } catch (e) {
    console.warn('[authStorage] Failed to set user in sessionStorage:', e);
  }

  try {
    localStorage.setItem(USER_KEY, userStr);
  } catch (e) {
    console.warn('[authStorage] Failed to set user in localStorage:', e);
  }
}

/**
 * Удалить пользователя из хранилища
 */
export function removeAuthUser(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('[authStorage] Failed to remove user from sessionStorage:', e);
  }

  try {
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('[authStorage] Failed to remove user from localStorage:', e);
  }
}
