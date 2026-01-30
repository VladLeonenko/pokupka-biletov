import type {
  Project,
  CreateProjectInput,
  PersonalCategory,
  PersonalEntry,
  CreatePersonalEntryInput,
  DailyMetrics,
  UpdateDailyMetricsInput,
  AIRecommendation,
  DashboardStats,
  WorkoutProfile,
  NutritionProfile,
  ReadingProfile,
  EducationProfile,
  FinanceProfile,
} from '@/types/planner';

const API_BASE = '';

function getToken(): string | null {
  // Используем тот же ключ, что и в AuthProvider
  return localStorage.getItem('auth.token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function doFetch(url: string, options?: RequestInit) {
  const token = getToken();
  if (!token) {
    throw new Error('Unauthorized - no token');
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      console.error('Unauthorized request to:', url);
      throw new Error('Unauthorized');
    }
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== ПРОЕКТЫ ====================

export async function listProjects(): Promise<Project[]> {
  return doFetch('/api/planner/projects');
}

export async function getProject(id: number): Promise<Project> {
  return doFetch(`/api/planner/projects/${id}`);
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  return doFetch('/api/planner/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  return doFetch(`/api/planner/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: number): Promise<void> {
  return doFetch(`/api/planner/projects/${id}`, {
    method: 'DELETE',
  });
}

// ==================== ДАШБОРД ====================

export async function getDashboard(): Promise<DashboardStats> {
  return doFetch('/api/planner/dashboard');
}

// ==================== ЛИЧНОЕ РАЗВИТИЕ ====================

export async function listPersonalCategories(): Promise<PersonalCategory[]> {
  return doFetch('/api/planner/personal/categories');
}

export async function listPersonalEntries(
  categoryId: number,
  from?: string,
  to?: string
): Promise<PersonalEntry[]> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  
  const query = params.toString();
  return doFetch(`/api/planner/personal/${categoryId}/entries${query ? `?${query}` : ''}`);
}

export async function createPersonalEntry(data: CreatePersonalEntryInput & { id?: number }): Promise<PersonalEntry> {
  // Если есть id, обновляем запись
  if (data.id) {
    return doFetch(`/api/planner/personal/entries/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  // Иначе создаем новую
  return doFetch('/api/planner/personal/entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePersonalEntry(id: number, data: Partial<CreatePersonalEntryInput>): Promise<PersonalEntry> {
  return doFetch(`/api/planner/personal/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePersonalEntry(id: number): Promise<void> {
  return doFetch(`/api/planner/personal/entries/${id}`, {
    method: 'DELETE',
  });
}

// ==================== МЕТРИКИ ====================

export async function updateDailyMetrics(data: UpdateDailyMetricsInput): Promise<DailyMetrics> {
  return doFetch('/api/planner/metrics/daily', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ==================== ПРОФИЛИ ====================

export async function getWorkoutProfile(): Promise<WorkoutProfile | null> {
  return doFetch('/api/planner/profile/workout');
}

export async function saveWorkoutProfile(data: WorkoutProfile): Promise<WorkoutProfile> {
  return doFetch('/api/planner/profile/workout', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getNutritionProfile(): Promise<NutritionProfile | null> {
  return doFetch('/api/planner/profile/nutrition');
}

export async function saveNutritionProfile(data: NutritionProfile): Promise<NutritionProfile> {
  return doFetch('/api/planner/profile/nutrition', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getReadingProfile(): Promise<ReadingProfile | null> {
  return doFetch('/api/planner/profile/reading');
}

export async function saveReadingProfile(data: ReadingProfile): Promise<ReadingProfile> {
  return doFetch('/api/planner/profile/reading', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getEducationProfile(): Promise<EducationProfile | null> {
  return doFetch('/api/planner/profile/education');
}

export async function saveEducationProfile(data: EducationProfile): Promise<EducationProfile> {
  return doFetch('/api/planner/profile/education', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getFinanceProfile(): Promise<FinanceProfile | null> {
  return doFetch('/api/planner/profile/finance');
}

export async function saveFinanceProfile(data: FinanceProfile): Promise<FinanceProfile> {
  return doFetch('/api/planner/profile/finance', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ==================== AI РЕКОМЕНДАЦИИ ====================

export async function markRecommendationRead(id: number): Promise<AIRecommendation> {
  return doFetch(`/api/planner/recommendations/${id}/read`, {
    method: 'PUT',
  });
}

export async function dismissRecommendation(id: number): Promise<AIRecommendation> {
  return doFetch(`/api/planner/recommendations/${id}/dismiss`, {
    method: 'PUT',
  });
}

// Персональные AI-рекомендации
export async function getPersonalRecommendations(category: string): Promise<any> {
  return doFetch('/api/ai-assistant/personal-recommendations', {
    method: 'POST',
    body: JSON.stringify({ category }),
  });
}

