import { getApiBase } from '@/utils/apiBase';

const API_BASE = getApiBase();

export interface Review {
  id: number;
  brand_name: string;
  author: string;
  author_position?: string;
  author_company?: string;
  email?: string;
  rating: number;
  text: string;
  source: string;
  is_verified: boolean;
  helpful_count: number;
  is_moderated: boolean;
  is_published: boolean;
  response_text?: string;
  response_author?: string;
  response_date?: string;
  photo_url?: string;
  service_type?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReviewStats {
  total: number;
  avg_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

export interface ReviewsResponse {
  reviews: Review[];
  stats: ReviewStats;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface CreateReviewData {
  brand_name?: string;
  author: string;
  email?: string;
  rating: number;
  text: string;
  service_type?: string;
  photo_url?: string;
}

// PUBLIC: Получить опубликованные отзывы
export async function getPublicReviews(params?: {
  rating?: number;
  service_type?: string;
  sort?: 'recent' | 'rating_desc' | 'rating_asc' | 'helpful';
  limit?: number;
  offset?: number;
}): Promise<ReviewsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.rating) queryParams.append('rating', params.rating.toString());
  if (params?.service_type) queryParams.append('service_type', params.service_type);
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const response = await fetch(`${API_BASE}/api/reviews/public?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch reviews');
  return response.json();
}

// PUBLIC: Создать отзыв
export async function createReview(data: CreateReviewData): Promise<{ message: string; reviewId: number }> {
  const response = await fetch(`${API_BASE}/api/reviews/public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create review');
  }
  return response.json();
}

// PUBLIC: Отметить отзыв как полезный
export async function markReviewHelpful(reviewId: number, fingerprint?: string): Promise<{ helpful_count: number }> {
  const response = await fetch(`${API_BASE}/api/reviews/public/${reviewId}/helpful`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprint }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to mark review as helpful');
  }
  return response.json();
}

// ADMIN: Получить все отзывы
export async function getAdminReviews(token: string, params?: {
  is_moderated?: boolean;
  is_published?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ reviews: Review[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params?.is_moderated !== undefined) queryParams.append('is_moderated', params.is_moderated.toString());
  if (params?.is_published !== undefined) queryParams.append('is_published', params.is_published.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const response = await fetch(`${API_BASE}/api/reviews/admin?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch admin reviews');
  return response.json();
}

// ADMIN: Модерировать отзыв
export async function moderateReview(
  token: string,
  reviewId: number,
  data: { is_published: boolean; is_verified?: boolean }
): Promise<Review> {
  const response = await fetch(`${API_BASE}/api/reviews/admin/${reviewId}/moderate`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to moderate review');
  return response.json();
}

// ADMIN: Добавить ответ на отзыв
export async function addReviewResponse(
  token: string,
  reviewId: number,
  data: { response_text: string; response_author: string }
): Promise<Review> {
  const response = await fetch(`${API_BASE}/api/reviews/admin/${reviewId}/response`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to add response');
  return response.json();
}

// ADMIN: Удалить отзыв
export async function deleteReview(token: string, reviewId: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/reviews/admin/${reviewId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete review');
  return response.json();
}

