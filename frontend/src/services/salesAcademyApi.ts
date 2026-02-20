import { getApiBase } from '@/utils/apiBase';
import Cookies from 'js-cookie';

const API_BASE = getApiBase();

function authHeaders(): HeadersInit {
  const token = Cookies.get('auth_token') || null;
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export interface TrainingMaterial {
  id: number;
  type: 'call_script' | 'objection' | 'admin_guide' | 'sales_tip';
  title: string;
  content?: string | null;
  objection_text?: string | null;
  solution_text?: string | null;
  sort_order: number;
}

// Курсы (материалы с поэтапным изучением)
export interface TrainingCourse {
  id: number;
  slug: string;
  title: string;
  cover_description: string | null;
  estimated_test_minutes: number;
  sort_order?: number;
  total_pages?: number;
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'dropdown'; title: string; content: string }
  | { type: 'checkbox'; title?: string; items: string[] }
  | { type: 'image'; url: string; alt?: string }
  | { type: 'video'; url: string };

export interface CoursePage {
  id: number;
  page_index: number;
  page_type: 'cover' | 'objection' | 'content';
  title: string | null;
  content: string | null;
  content_blocks?: ContentBlock[] | null;
  objection_text: string | null;
  solution_text: string | null;
  material_id?: number | null;
}

export interface CourseWithPages extends TrainingCourse {
  pages: CoursePage[];
  total_pages: number;
}

export interface CourseProgress {
  lastPageIndex: number;
  completedPageCount: number;
  testPassed: boolean;
  testScore: number | null;
  updatedAt: string | null;
}

export async function getCourses(): Promise<TrainingCourse[]> {
  const res = await fetch(`${API_BASE}/api/sales-academy/courses`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки курсов');
  return res.json();
}

export async function getCourse(slug: string): Promise<CourseWithPages> {
  const res = await fetch(`${API_BASE}/api/sales-academy/courses/${slug}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Курс не найден');
  return res.json();
}

export async function getCourseProgress(slug: string): Promise<CourseProgress> {
  const res = await fetch(`${API_BASE}/api/sales-academy/courses/${slug}/progress`, { headers: authHeaders() });
  if (!res.ok) return { lastPageIndex: 0, completedPageCount: 0, testPassed: false, testScore: null, updatedAt: null };
  return res.json();
}

export async function updateCourseProgress(slug: string, lastPageIndex?: number, completedPageCount?: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sales-academy/courses/${slug}/progress`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastPageIndex, completedPageCount }),
  });
  if (!res.ok) throw new Error('Ошибка сохранения');
}

export async function markCourseTestPassed(slug: string, score?: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sales-academy/courses/${slug}/test-passed`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ score }),
  });
  if (!res.ok) throw new Error('Ошибка');
}

export async function getMaterials(type?: string): Promise<TrainingMaterial[]> {
  const url = type ? `${API_BASE}/api/sales-academy/materials?type=${encodeURIComponent(type)}` : `${API_BASE}/api/sales-academy/materials`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки материалов');
  return res.json();
}

export async function getProductMatrix(): Promise<{ products: any[]; categories: any[] }> {
  const res = await fetch(`${API_BASE}/api/sales-academy/product-matrix`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки матрицы');
  return res.json();
}

export async function getCases(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/sales-academy/cases`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки кейсов');
  return res.json();
}

export type MaterialCreate = Partial<Pick<TrainingMaterial, 'content' | 'objection_text' | 'solution_text' | 'sort_order'>> & {
  type: TrainingMaterial['type'];
  title: string;
};

export async function createMaterial(data: MaterialCreate): Promise<TrainingMaterial> {
  const res = await fetch(`${API_BASE}/api/sales-academy/materials`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка создания');
  return res.json();
}

export async function updateMaterial(id: number, data: Partial<MaterialCreate>): Promise<TrainingMaterial> {
  const res = await fetch(`${API_BASE}/api/sales-academy/materials/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка обновления');
  return res.json();
}

export async function deleteMaterial(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sales-academy/materials/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка удаления');
}

export async function completeMaterial(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sales-academy/materials/${id}/complete`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка');
}

export interface TrainingQuestion {
  id: number;
  material_id?: number | null;
  type: string;
  question_text: string;
  options: string[];
  correct_index: number;
  sort_order: number;
}

export async function getQuestions(type?: string, courseSlug?: string): Promise<TrainingQuestion[]> {
  const params = new URLSearchParams();
  if (courseSlug) params.set('course_slug', courseSlug);
  else if (type) params.set('type', type);
  const url = params.toString()
    ? `${API_BASE}/api/sales-academy/questions?${params}`
    : `${API_BASE}/api/sales-academy/questions`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export interface Progress {
  completedMaterialIds: number[];
  quizAttempts: { question_type: string; score_percent: number; total_questions: number; completed_at: string }[];
}

export async function getProgress(): Promise<Progress> {
  const res = await fetch(`${API_BASE}/api/sales-academy/progress`, { headers: authHeaders() });
  if (!res.ok) return { completedMaterialIds: [], quizAttempts: [] };
  return res.json();
}

export async function submitQuiz(data: {
  question_type: string;
  score_percent: number;
  total_questions: number;
  correct_count: number;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sales-academy/quiz/submit`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка отправки');
}

export async function createQuestion(data: {
  type?: string;
  course_slug?: string;
  question_text: string;
  options?: string[];
  correct_index?: number;
  material_id?: number | null;
  sort_order?: number;
}): Promise<TrainingQuestion> {
  const res = await fetch(`${API_BASE}/api/sales-academy/questions`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка создания');
  return res.json();
}

export async function updateQuestion(id: number, data: Partial<{ type: string; question_text: string; options: string[]; correct_index: number; sort_order: number }>): Promise<TrainingQuestion> {
  const res = await fetch(`${API_BASE}/api/sales-academy/questions/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка обновления');
  return res.json();
}

export async function deleteQuestion(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sales-academy/questions/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка удаления');
}
