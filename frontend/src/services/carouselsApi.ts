import { getApiBase } from '@/utils/apiBase';

const API_BASE = getApiBase();

export interface CarouselItem {
  id?: number;
  kind?: string;
  image_url?: string;
  image?: string; // альтернативное поле
  caption_html?: string;
  title?: string;
  text?: string;
  link_url?: string;
  link?: string; // альтернативное поле
  width?: number;
  height?: number;
  sort_order?: number;
  is_active?: boolean;
  [key: string]: any;
}

export interface CarouselSettings {
  autoplay?: boolean;
  autoplaySpeed?: number;
  speed?: number;
  loop?: boolean;
  margin?: number;
  items?: number;
  center?: boolean;
  nav?: boolean;
  dots?: boolean;
  responsive?: {
    [breakpoint: number]: {
      items: number;
      stagePadding?: number;
    };
  };
  vertical?: boolean;
  slidesToShow?: number;
  slidesToScroll?: number;
  centerPadding?: string;
}

export interface Carousel {
  id: number;
  slug: string;
  name: string;
  type: 'horizontal' | 'vertical' | 'filter';
  settings: CarouselSettings;
  items: CarouselItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all carousels (admin only)
 */
export async function listCarousels(): Promise<Carousel[]> {
  // Используем тот же способ получения токена, что и в cmsApi
  const token = localStorage.getItem('auth.token') || localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }
  const response = await fetch(`${API_BASE}/api/carousels`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized. Please login again.');
    }
    throw new Error('Failed to fetch carousels');
  }
  return response.json();
}

/**
 * Get active carousels (public)
 */
export async function listPublicCarousels(): Promise<Carousel[]> {
  const response = await fetch(`${API_BASE}/api/public/carousels`);
  if (!response.ok) throw new Error('Failed to fetch carousels');
  return response.json();
}

/**
 * Get carousel by slug (public)
 * Returns null if carousel not found (404)
 */
export async function getPublicCarousel(slug: string): Promise<Carousel | null> {
  const response = await fetch(`${API_BASE}/api/public/carousels/${slug}`);
  if (response.status === 404) {
    return null; // Карусель не найдена - это нормально, используем fallback
  }
  if (!response.ok) {
    throw new Error('Failed to fetch carousel');
  }
  return response.json();
}

/**
 * Get carousel by ID (admin only)
 */
export async function getCarousel(id: number): Promise<Carousel> {
  const token = localStorage.getItem('auth.token') || localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }
  const response = await fetch(`${API_BASE}/api/carousels/id/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized. Please login again.');
    }
    throw new Error('Failed to fetch carousel');
  }
  return response.json();
}

/**
 * Create carousel (admin only)
 */
export async function createCarousel(data: Partial<Carousel>): Promise<Carousel> {
  const token = localStorage.getItem('auth.token') || localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }
  const response = await fetch(`${API_BASE}/api/carousels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized. Please login again.');
    }
    throw new Error('Failed to create carousel');
  }
  return response.json();
}

/**
 * Update carousel (admin only)
 */
export async function updateCarousel(id: number, data: Partial<Carousel>): Promise<Carousel> {
  const token = localStorage.getItem('auth.token') || localStorage.getItem('token');
  if (!token) {
    console.error('[updateCarousel] No token found');
    throw new Error('Authentication required');
  }
  
  const url = `${API_BASE}/api/carousels/${id}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[updateCarousel] Error response:', errorText);
    
    if (response.status === 401) {
      throw new Error('Unauthorized. Please login again.');
    }
    if (response.status === 404) {
      throw new Error('Carousel not found');
    }
    throw new Error(`Failed to update carousel: ${errorText}`);
  }
  return response.json();
}

/**
 * Delete carousel (admin only)
 */
export async function deleteCarousel(id: number): Promise<void> {
  const token = localStorage.getItem('auth.token') || localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }
  const response = await fetch(`${API_BASE}/api/carousels/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized. Please login again.');
    }
    throw new Error('Failed to delete carousel');
  }
}

