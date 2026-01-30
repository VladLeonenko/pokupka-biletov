// Типы для личного планировщика

export interface Project {
  id: number;
  user_id: number;
  name: string;
  color: string;
  description?: string;
  goals?: string;
  deadline?: string;
  progress: number;
  budget?: number;
  priority: 1 | 2 | 3 | 4 | 5;
  status: 'active' | 'paused' | 'completed' | 'archived';
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalCategory {
  id: number;
  name: 'workouts' | 'nutrition' | 'education' | 'reading' | 'finance';
  icon: string;
  color: string;
  description?: string;
  created_at: string;
}

export interface PersonalEntry {
  id: number;
  user_id: number;
  category_id: number;
  date: string;
  
  // Тренировки
  workout_type?: string;
  workout_duration?: number;
  workout_exercises?: any;
  workout_weight?: number;
  
  // Питание
  nutrition_calories?: number;
  nutrition_protein?: number;
  nutrition_carbs?: number;
  nutrition_fats?: number;
  nutrition_water?: number;
  
  // Образование
  education_course?: string;
  education_hours?: number;
  education_progress?: number;
  
  // Чтение
  reading_book?: string;
  reading_pages?: number;
  reading_notes?: string;
  
  // Финансы
  finance_income?: number;
  finance_expenses?: number;
  finance_category?: string;
  finance_notes?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyMetrics {
  id: number;
  user_id: number;
  date: string;
  
  // Продуктивность
  tasks_completed: number;
  tasks_total: number;
  completion_rate: number;
  
  // Время
  time_by_project: Record<number, number>;
  time_personal: number;
  
  // Самочувствие
  energy_level?: number;
  mood?: number;
  sleep_hours?: number;
  
  // AI инсайты
  ai_insights?: string[];
  
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: number;
  user_id: number;
  type: 'streak' | 'milestone' | 'level';
  name: string;
  description?: string;
  icon?: string;
  earned_at: string;
  metadata?: any;
}

export interface Streak {
  id: number;
  user_id: number;
  type: string;
  current_count: number;
  best_count: number;
  last_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AIRecommendation {
  id: number;
  user_id: number;
  type: 'task' | 'insight' | 'warning' | 'achievement';
  title: string;
  description?: string;
  action_text?: string;
  action_data?: any;
  priority: 1 | 2 | 3 | 4 | 5;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at?: string;
  created_at: string;
}

// Статистика дашборда
export interface DashboardStats {
  today: {
    tasks_completed: number;
    tasks_total: number;
    completion_rate: number;
    energy_level?: number;
    mood?: number;
  };
  projects: {
    id: number;
    name: string;
    color: string;
    progress: number;
    active_tasks: number;
    deadline?: string;
  }[];
  streaks: Streak[];
  recommendations: AIRecommendation[];
  weekly_trend: {
    date: string;
    completion_rate: number;
    tasks_completed: number;
  }[];
}

// Профили пользователя
export interface WorkoutProfile {
  id?: number;
  user_id?: number;
  height?: number;
  weight?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  fitness_level?: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  goals?: string[];
  target_weight?: number;
  injuries?: string[];
  health_conditions?: string[];
  preferred_workouts?: string[];
  training_days_per_week?: number;
}

export interface NutritionProfile {
  id?: number;
  user_id?: number;
  daily_calories_goal?: number;
  daily_protein_goal?: number;
  daily_carbs_goal?: number;
  daily_fats_goal?: number;
  daily_water_goal?: number;
  diet_type?: string;
  allergies?: string[];
  dislikes?: string[];
  meals_per_day?: number;
}

export interface EducationProfile {
  id?: number;
  user_id?: number;
  areas_of_interest?: string[];
  current_skills?: string[];
  target_skills?: string[];
  learning_goals?: string;
  hours_per_week?: number;
  preferred_formats?: string[];
}

export interface ReadingProfile {
  id?: number;
  user_id?: number;
  favorite_genres?: string[];
  favorite_authors?: string[];
  reading_speed?: number;
  books_per_month_goal?: number;
  pages_per_day_goal?: number;
  books_read?: string[];
}

export interface FinanceProfile {
  id?: number;
  user_id?: number;
  monthly_income?: number;
  monthly_budget?: number;
  savings_goal?: number;
  investment_goal?: number;
  expense_categories?: any;
}

// Типы для форм
export interface CreateProjectInput {
  name: string;
  color?: string;
  description?: string;
  goals?: string;
  deadline?: string;
  budget?: number;
  priority?: 1 | 2 | 3 | 4 | 5;
}

export interface CreatePersonalEntryInput {
  category_id: number;
  date: string;
  [key: string]: any; // для динамических полей категорий
}

export interface UpdateDailyMetricsInput {
  date: string;
  energy_level?: number;
  mood?: number;
  sleep_hours?: number;
}

