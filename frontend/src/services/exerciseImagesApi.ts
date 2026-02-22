import { getAuthToken } from '@/utils/authStorage';
function getToken(): string | null {
  try {
    return getAuthToken();
  } catch {
    return null;
  }
}

import { getApiBase } from '@/utils/apiBase';

const API_BASE: string = getApiBase();

function authHeaders(init?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...(init || {}),
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function doFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = authHeaders(init?.headers as any);
  return await fetch(input, { ...(init || {}), headers });
}

export interface ExerciseImage {
  id: number;
  name: string;
  category: 'workout' | 'book' | 'meal' | 'course' | 'finance_tip';
  image_url: string;
  source: 'unsplash' | 'upload' | 'manual';
  unsplash_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UnsplashImage {
  id: string;
  url: string;
  thumb: string;
  small: string;
  full: string;
  description: string;
  author: string;
  author_url: string;
}

export async function listExerciseImages(category?: string, search?: string): Promise<ExerciseImage[]> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  
  const res = await doFetch(`${API_BASE}/api/exercise-images?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch exercise images');
  return res.json();
}

export async function getExerciseImage(id: number): Promise<ExerciseImage> {
  const res = await doFetch(`${API_BASE}/api/exercise-images/${id}`);
  if (!res.ok) throw new Error('Failed to fetch exercise image');
  return res.json();
}

export async function createExerciseImage(image: {
  name: string;
  category: ExerciseImage['category'];
  image_url: string;
  source?: ExerciseImage['source'];
  unsplash_id?: string;
}): Promise<ExerciseImage> {
  const res = await doFetch(`${API_BASE}/api/exercise-images`, {
    method: 'POST',
    body: JSON.stringify(image),
  });
  if (!res.ok) throw new Error('Failed to create exercise image');
  return res.json();
}

export async function updateExerciseImage(id: number, image: Partial<ExerciseImage>): Promise<ExerciseImage> {
  const res = await doFetch(`${API_BASE}/api/exercise-images/${id}`, {
    method: 'PUT',
    body: JSON.stringify(image),
  });
  if (!res.ok) throw new Error('Failed to update exercise image');
  return res.json();
}

export async function deleteExerciseImage(id: number): Promise<void> {
  const res = await doFetch(`${API_BASE}/api/exercise-images/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete exercise image');
}

export async function searchUnsplashImages(query: string, category?: string): Promise<UnsplashImage[]> {
  const params = new URLSearchParams({ query });
  if (category) params.append('category', category);
  
  const res = await doFetch(`${API_BASE}/api/exercise-images/search/pixabay?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search Pixabay images');
  return res.json();
}

