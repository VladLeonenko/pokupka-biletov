import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import {
  FitnessCenter,
  Restaurant,
  School,
  MenuBook,
  AccountBalance,
  Add,
  TrendingUp,
} from '@mui/icons-material';
import { listPersonalCategories, createPersonalEntry, listPersonalEntries, getWorkoutProfile, getReadingProfile, getNutritionProfile, getEducationProfile, getFinanceProfile, deletePersonalEntry } from '@/services/plannerApi';
import React from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/common/ToastProvider';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { PersonalCalendar } from '@/components/planner/PersonalCalendar';
import { WorkoutOnboarding } from '@/components/planner/WorkoutOnboarding';
import { ReadingOnboarding } from '@/components/planner/ReadingOnboarding';
import { NutritionOnboarding } from '@/components/planner/NutritionOnboarding';
import { EducationOnboarding } from '@/components/planner/EducationOnboarding';
import { FinanceOnboarding } from '@/components/planner/FinanceOnboarding';
import { PersonalCharts } from '@/components/planner/PersonalCharts';
import { AIRecommendations } from '@/components/planner/AIRecommendations';

const MotionCard = motion.create(Card);

const categoryIcons = {
  workouts: <FitnessCenter />,
  nutrition: <Restaurant />,
  education: <School />,
  reading: <MenuBook />,
  finance: <AccountBalance />,
};

export default function PersonalDevelopment() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Состояния для форм
  const [workoutData, setWorkoutData] = useState({
    workout_type: '',
    workout_duration: '',
    workout_weight: '',
    workout_exercises: '',
  });
  
  const [nutritionData, setNutritionData] = useState({
    nutrition_calories: '',
    nutrition_protein: '',
    nutrition_carbs: '',
    nutrition_fats: '',
    nutrition_water: '',
  });
  
  const [educationData, setEducationData] = useState({
    education_course: '',
    education_hours: '',
    education_progress: '',
  });
  
  const [readingData, setReadingData] = useState({
    reading_book: '',
    reading_pages: '',
    reading_notes: '',
  });
  
  const [financeData, setFinanceData] = useState({
    finance_income: '',
    finance_expenses: '',
    finance_category: '',
    finance_notes: '',
  });

  // Проверка авторизации
  if (!token || !user) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: '#141414',
        flexDirection: 'column',
        gap: 3
      }}>
        <Typography variant="h4" sx={{ color: '#ffffff' }}>
          🔐 Требуется авторизация
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5568d3' } }}
          onClick={() => navigate('/admin/login')}
        >
          Войти в систему
        </Button>
      </Box>
    );
  }

  const { data: categories = [] } = useQuery({
    queryKey: ['personalCategories'],
    queryFn: listPersonalCategories,
    enabled: !!token,
    retry: false,
  });

  const currentCategory = categories[selectedCategory];
  
  // Получаем профили для категорий
  const { data: workoutProfile, refetch: refetchWorkoutProfile } = useQuery({
    queryKey: ['workoutProfile'],
    queryFn: getWorkoutProfile,
    enabled: !!token,
    retry: false,
  });
  
  const { data: readingProfile, refetch: refetchReadingProfile } = useQuery({
    queryKey: ['readingProfile'],
    queryFn: getReadingProfile,
    enabled: !!token,
    retry: false,
  });
  
  const { data: nutritionProfile, refetch: refetchNutritionProfile } = useQuery({
    queryKey: ['nutritionProfile'],
    queryFn: getNutritionProfile,
    enabled: !!token,
    retry: false,
  });
  
  const { data: educationProfile, refetch: refetchEducationProfile } = useQuery({
    queryKey: ['educationProfile'],
    queryFn: getEducationProfile,
    enabled: !!token,
    retry: false,
  });
  
  const { data: financeProfile, refetch: refetchFinanceProfile } = useQuery({
    queryKey: ['financeProfile'],
    queryFn: getFinanceProfile,
    enabled: !!token,
    retry: false,
  });
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Слушаем событие для открытия онбординга
  React.useEffect(() => {
    const handleOpenOnboarding = () => {
      setShowOnboarding(true);
    };
    window.addEventListener('openOnboarding', handleOpenOnboarding);
    return () => window.removeEventListener('openOnboarding', handleOpenOnboarding);
  }, []);
  
  // Автоматически показываем онбординг при смене категории, если профиля нет
  React.useEffect(() => {
    if (currentCategory?.name === 'workouts' && !workoutProfile && !showOnboarding) {
      // Не показываем автоматически, только по кнопке
    }
    if (currentCategory?.name === 'reading' && !readingProfile && !showOnboarding) {
      // Не показываем автоматически, только по кнопке
    }
    if (currentCategory?.name === 'nutrition' && !nutritionProfile && !showOnboarding) {
      // Не показываем автоматически, только по кнопке
    }
    if (currentCategory?.name === 'education' && !educationProfile && !showOnboarding) {
      // Не показываем автоматически, только по кнопке
    }
    if (currentCategory?.name === 'finance' && !financeProfile && !showOnboarding) {
      // Не показываем автоматически, только по кнопке
    }
  }, [currentCategory, workoutProfile, readingProfile, nutritionProfile, educationProfile, financeProfile]);
  
  // Получаем записи для текущей категории
  const { data: entries = [], refetch: refetchEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['personalEntries', currentCategory?.id, date],
    queryFn: async () => {
      if (!currentCategory) {
        console.log('[PersonalDevelopment] No category selected');
        return [];
      }
      
      const startOfMonth = new Date(date);
      startOfMonth.setDate(1);
      const endOfMonth = new Date(date);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      
      const from = startOfMonth.toISOString().split('T')[0];
      const to = endOfMonth.toISOString().split('T')[0];
      
      console.log('[PersonalDevelopment] Fetching entries:', {
        categoryId: currentCategory.id,
        from,
        to,
      });
      
      const result = await listPersonalEntries(currentCategory.id, from, to);
      console.log('[PersonalDevelopment] Entries fetched:', result);
      return result;
    },
    enabled: !!currentCategory && !!token,
    retry: false,
  });
  
  console.log('[PersonalDevelopment] Render:', {
    currentCategory: currentCategory?.name,
    entriesCount: entries.length,
    entriesLoading,
  });

  const createEntryMutation = useMutation({
    mutationFn: createPersonalEntry,
    onSuccess: async (data) => {
      console.log('[PersonalDevelopment] Entry created successfully:', data);
      
      // Инвалидируем кэш
      await queryClient.invalidateQueries({ queryKey: ['personalEntries'] });
      
      // Принудительно обновляем записи
      console.log('[PersonalDevelopment] Refetching entries...');
      await refetchEntries();
      
      // Очищаем формы
      setWorkoutData({ workout_type: '', workout_duration: '', workout_weight: '', workout_exercises: '' });
      setNutritionData({ nutrition_calories: '', nutrition_protein: '', nutrition_carbs: '', nutrition_fats: '', nutrition_water: '' });
      setEducationData({ education_course: '', education_hours: '', education_progress: '' });
      setReadingData({ reading_book: '', reading_pages: '', reading_notes: '' });
      setFinanceData({ finance_income: '', finance_expenses: '', finance_category: '', finance_notes: '' });
      setEditingEntry(null);
      
      showToast(editingEntry ? 'Запись обновлена!' : 'Запись сохранена!', 'success');
    },
    onError: (error: any) => {
      console.error('[PersonalDevelopment] Error saving entry:', error);
      showToast('Ошибка при сохранении: ' + (error?.message || 'Неизвестная ошибка'), 'error');
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: deletePersonalEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['personalEntries'] });
      await refetchEntries();
      showToast('Запись удалена!', 'success');
    },
    onError: (error: any) => {
      console.error('[PersonalDevelopment] Error deleting entry:', error);
      showToast('Ошибка при удалении: ' + (error?.message || 'Неизвестная ошибка'), 'error');
    },
  });

  const [editingEntry, setEditingEntry] = useState<PersonalEntry | null>(null);
  
  const handleEditEntry = (entry: PersonalEntry) => {
    setEditingEntry(entry);
    // Заполняем форму данными записи
    if (currentCategory?.name === 'workouts') {
      setWorkoutData({
        workout_type: entry.workout_type || '',
        workout_duration: entry.workout_duration?.toString() || '',
        workout_weight: entry.workout_weight?.toString() || '',
        workout_exercises: entry.workout_exercises || '',
      });
      setDate(entry.date);
    } else if (currentCategory?.name === 'reading') {
      setReadingData({
        reading_book: entry.reading_book || '',
        reading_pages: entry.reading_pages?.toString() || '',
        reading_notes: entry.reading_notes || '',
      });
      setDate(entry.date);
    } else if (currentCategory?.name === 'nutrition') {
      setNutritionData({
        nutrition_calories: entry.nutrition_calories?.toString() || '',
        nutrition_protein: entry.nutrition_protein?.toString() || '',
        nutrition_carbs: entry.nutrition_carbs?.toString() || '',
        nutrition_fats: entry.nutrition_fats?.toString() || '',
        nutrition_water: entry.nutrition_water?.toString() || '',
      });
      setDate(entry.date);
    } else if (currentCategory?.name === 'education') {
      setEducationData({
        education_course: entry.education_course || '',
        education_hours: entry.education_hours?.toString() || '',
        education_progress: entry.education_progress?.toString() || '',
      });
      setDate(entry.date);
    } else if (currentCategory?.name === 'finance') {
      setFinanceData({
        finance_income: entry.finance_income?.toString() || '',
        finance_expenses: entry.finance_expenses?.toString() || '',
        finance_category: entry.finance_category || '',
        finance_notes: entry.finance_notes || '',
      });
      setDate(entry.date);
    }
    // Прокручиваем к форме
    const formElement = document.querySelector('[data-profile-form]');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const handleSaveEntry = (categoryName: string, data: any) => {
    if (!currentCategory) {
      showToast('Категория не выбрана', 'error');
      return;
    }
    
    const entry = {
      category_id: currentCategory.id,
      date,
      ...data,
      ...(editingEntry ? { id: editingEntry.id } : {}), // Если редактируем, добавляем ID
    };
    
    console.log('[PersonalDevelopment] Saving entry:', entry);
    createEntryMutation.mutate(entry);
  };

  const renderWorkoutForm = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Тип тренировки"
          placeholder="Силовая, кардио, йога..."
          value={workoutData.workout_type}
          onChange={(e) => setWorkoutData({ ...workoutData, workout_type: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="number"
          label="Длительность (мин)"
          placeholder="60"
          value={workoutData.workout_duration}
          onChange={(e) => setWorkoutData({ ...workoutData, workout_duration: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="number"
          label="Вес (кг)"
          placeholder="75.5"
          value={workoutData.workout_weight}
          onChange={(e) => setWorkoutData({ ...workoutData, workout_weight: e.target.value })}
          inputProps={{ step: "0.1" }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          multiline
          rows={6}
          label="Упражнения"
          placeholder="Жим лежа: 80кг x 8&#10;Приседания: 100кг x 10&#10;..."
          value={workoutData.workout_exercises}
          onChange={(e) => setWorkoutData({ ...workoutData, workout_exercises: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <Button 
          variant="contained" 
          fullWidth 
          size="large" 
          sx={{ bgcolor: '#ff6b6b', '&:hover': { bgcolor: '#ff5252' } }}
          onClick={() => handleSaveEntry('workouts', {
            workout_type: workoutData.workout_type,
            workout_duration: workoutData.workout_duration ? Number(workoutData.workout_duration) : undefined,
            workout_weight: workoutData.workout_weight ? Number(workoutData.workout_weight) : undefined,
            workout_exercises: workoutData.workout_exercises,
          })}
          disabled={createEntryMutation.isPending}
        >
          {createEntryMutation.isPending ? '⏳ Сохранение...' : editingEntry ? '💾 Сохранить изменения' : '💪 Сохранить тренировку'}
        </Button>
      </Grid>
    </Grid>
  );

  const renderNutritionForm = () => (
    <Grid container spacing={3}>
      <Grid item xs={6} md={3}>
        <TextField
          fullWidth
          type="number"
          label="Калории"
          placeholder="2000"
          value={nutritionData.nutrition_calories}
          onChange={(e) => setNutritionData({ ...nutritionData, nutrition_calories: e.target.value })}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <TextField
          fullWidth
          type="number"
          label="Белки (г)"
          placeholder="150"
          value={nutritionData.nutrition_protein}
          onChange={(e) => setNutritionData({ ...nutritionData, nutrition_protein: e.target.value })}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <TextField
          fullWidth
          type="number"
          label="Углеводы (г)"
          placeholder="200"
          value={nutritionData.nutrition_carbs}
          onChange={(e) => setNutritionData({ ...nutritionData, nutrition_carbs: e.target.value })}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <TextField
          fullWidth
          type="number"
          label="Жиры (г)"
          placeholder="60"
          value={nutritionData.nutrition_fats}
          onChange={(e) => setNutritionData({ ...nutritionData, nutrition_fats: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Вода (л)"
          placeholder="2.5"
          value={nutritionData.nutrition_water}
          onChange={(e) => setNutritionData({ ...nutritionData, nutrition_water: e.target.value })}
          inputProps={{ step: "0.1" }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button 
          variant="contained" 
          fullWidth 
          size="large" 
          sx={{ bgcolor: '#51cf66', '&:hover': { bgcolor: '#40b857' } }}
          onClick={() => handleSaveEntry('nutrition', {
            nutrition_calories: nutritionData.nutrition_calories ? Number(nutritionData.nutrition_calories) : undefined,
            nutrition_protein: nutritionData.nutrition_protein ? Number(nutritionData.nutrition_protein) : undefined,
            nutrition_carbs: nutritionData.nutrition_carbs ? Number(nutritionData.nutrition_carbs) : undefined,
            nutrition_fats: nutritionData.nutrition_fats ? Number(nutritionData.nutrition_fats) : undefined,
            nutrition_water: nutritionData.nutrition_water ? Number(nutritionData.nutrition_water) : undefined,
          })}
          disabled={createEntryMutation.isPending}
        >
          {createEntryMutation.isPending ? '⏳ Сохранение...' : editingEntry ? '💾 Сохранить изменения' : '🍎 Сохранить дневник питания'}
        </Button>
      </Grid>
    </Grid>
  );

  const renderEducationForm = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <TextField
          fullWidth
          label="Курс/Тема обучения"
          placeholder="React Advanced Patterns"
          value={educationData.education_course}
          onChange={(e) => setEducationData({ ...educationData, education_course: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="number"
          label="Часов занятий"
          placeholder="2.5"
          value={educationData.education_hours}
          onChange={(e) => setEducationData({ ...educationData, education_hours: e.target.value })}
          inputProps={{ step: "0.5" }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Прогресс (%)"
          placeholder="45"
          value={educationData.education_progress}
          onChange={(e) => setEducationData({ ...educationData, education_progress: e.target.value })}
          InputProps={{ inputProps: { min: 0, max: 100 } }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button 
          variant="contained" 
          fullWidth 
          size="large" 
          sx={{ bgcolor: '#4c6ef5', '&:hover': { bgcolor: '#3b5bdb' } }}
          onClick={() => handleSaveEntry('education', {
            education_course: educationData.education_course,
            education_hours: educationData.education_hours ? Number(educationData.education_hours) : undefined,
            education_progress: educationData.education_progress ? Number(educationData.education_progress) : undefined,
          })}
          disabled={createEntryMutation.isPending}
        >
          {createEntryMutation.isPending ? '⏳ Сохранение...' : editingEntry ? '💾 Сохранить изменения' : '📚 Сохранить обучение'}
        </Button>
      </Grid>
    </Grid>
  );

  const renderReadingForm = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Название книги"
          placeholder="Атомные привычки"
          value={readingData.reading_book}
          onChange={(e) => setReadingData({ ...readingData, reading_book: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="number"
          label="Страниц прочитано"
          placeholder="50"
          value={readingData.reading_pages}
          onChange={(e) => setReadingData({ ...readingData, reading_pages: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          multiline
          rows={5}
          label="Заметки"
          placeholder="Ключевые мысли из прочитанного..."
          value={readingData.reading_notes}
          onChange={(e) => setReadingData({ ...readingData, reading_notes: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <Button 
          variant="contained" 
          fullWidth 
          size="large" 
          sx={{ bgcolor: '#f59f00', '&:hover': { bgcolor: '#e67700' } }}
          onClick={() => handleSaveEntry('reading', {
            reading_book: readingData.reading_book,
            reading_pages: readingData.reading_pages ? Number(readingData.reading_pages) : undefined,
            reading_notes: readingData.reading_notes,
          })}
          disabled={createEntryMutation.isPending}
        >
          {createEntryMutation.isPending ? '⏳ Сохранение...' : editingEntry ? '💾 Сохранить изменения' : '📖 Сохранить чтение'}
        </Button>
      </Grid>
    </Grid>
  );

  const renderFinanceForm = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Доходы (₽)"
          placeholder="150000"
          value={financeData.finance_income}
          onChange={(e) => setFinanceData({ ...financeData, finance_income: e.target.value })}
          sx={{ mb: 2 }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Расходы (₽)"
          placeholder="80000"
          value={financeData.finance_expenses}
          onChange={(e) => setFinanceData({ ...financeData, finance_expenses: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Категория"
          placeholder="Зарплата, Проект..."
          value={financeData.finance_category}
          onChange={(e) => setFinanceData({ ...financeData, finance_category: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Заметки"
          placeholder="Детали операции..."
          value={financeData.finance_notes}
          onChange={(e) => setFinanceData({ ...financeData, finance_notes: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <Button 
          variant="contained" 
          fullWidth 
          size="large" 
          sx={{ bgcolor: '#20c997', '&:hover': { bgcolor: '#12b886' } }}
          onClick={() => handleSaveEntry('finance', {
            finance_income: financeData.finance_income ? Number(financeData.finance_income) : undefined,
            finance_expenses: financeData.finance_expenses ? Number(financeData.finance_expenses) : undefined,
            finance_category: financeData.finance_category,
            finance_notes: financeData.finance_notes,
          })}
          disabled={createEntryMutation.isPending}
        >
          {createEntryMutation.isPending ? '⏳ Сохранение...' : editingEntry ? '💾 Сохранить изменения' : '💰 Сохранить финансы'}
        </Button>
      </Grid>
    </Grid>
  );

  const renderCategoryForm = () => {
    if (!currentCategory) return null;

    switch (currentCategory.name) {
      case 'workouts': return renderWorkoutForm();
      case 'nutrition': return renderNutritionForm();
      case 'education': return renderEducationForm();
      case 'reading': return renderReadingForm();
      case 'finance': return renderFinanceForm();
      default: return null;
    }
  };

  return (
    <Box sx={{ bgcolor: '#141414', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        <Typography variant="h3" sx={{ fontWeight: 800, color: '#ffffff', mb: 4 }}>
          💪 Личное развитие
        </Typography>

        <Paper sx={{ mb: 3, bgcolor: '#1a1a1a' }}>
          <Tabs
            value={selectedCategory}
            onChange={(_, v) => setSelectedCategory(v)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 600,
              },
              '& .Mui-selected': {
                color: '#ffffff !important',
              },
            }}
          >
            {categories.map((cat, index) => (
              <Tab
                key={cat.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {categoryIcons[cat.name]}
                    <span>{cat.icon} {cat.description?.split(' ')[0]}</span>
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Paper>

        {currentCategory && (
          <>
            {/* Онбординг для новых пользователей */}
            {showOnboarding && currentCategory.name === 'workouts' && (
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ bgcolor: '#1a1a1a', mb: 3 }}
              >
                <CardContent>
                  <WorkoutOnboarding
                    onComplete={() => {
                      setShowOnboarding(false);
                      refetchWorkoutProfile();
                    }}
                  />
                </CardContent>
              </MotionCard>
            )}
            
            {showOnboarding && currentCategory.name === 'reading' && (
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ bgcolor: '#1a1a1a', mb: 3 }}
              >
                <CardContent>
                  <ReadingOnboarding
                    onComplete={() => {
                      setShowOnboarding(false);
                      refetchReadingProfile();
                    }}
                  />
                </CardContent>
              </MotionCard>
            )}
            
            {showOnboarding && currentCategory.name === 'nutrition' && (
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ bgcolor: '#1a1a1a', mb: 3 }}
              >
                <CardContent>
                  <NutritionOnboarding
                    onComplete={() => {
                      setShowOnboarding(false);
                      refetchNutritionProfile();
                    }}
                  />
                </CardContent>
              </MotionCard>
            )}
            
            {showOnboarding && currentCategory.name === 'education' && (
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ bgcolor: '#1a1a1a', mb: 3 }}
              >
                <CardContent>
                  <EducationOnboarding
                    onComplete={() => {
                      setShowOnboarding(false);
                      refetchEducationProfile();
                    }}
                  />
                </CardContent>
              </MotionCard>
            )}
            
            {showOnboarding && currentCategory.name === 'finance' && (
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ bgcolor: '#1a1a1a', mb: 3 }}
              >
                <CardContent>
                  <FinanceOnboarding
                    onComplete={() => {
                      setShowOnboarding(false);
                      refetchFinanceProfile();
                    }}
                  />
                </CardContent>
              </MotionCard>
            )}

            {/* Основной интерфейс */}
            {!showOnboarding && (
              <Box>
                {/* Форма добавления записи */}
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  sx={{ bgcolor: '#1a1a1a', mb: 3 }}
                  data-profile-form
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
                        {currentCategory.icon} {editingEntry ? 'Редактировать запись' : 'Добавить запись'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {editingEntry && (
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingEntry(null);
                              // Очищаем все формы
                              setWorkoutData({ workout_type: '', workout_duration: '', workout_weight: '', workout_exercises: '' });
                              setReadingData({ reading_book: '', reading_pages: '', reading_notes: '' });
                              setNutritionData({ nutrition_calories: '', nutrition_protein: '', nutrition_carbs: '', nutrition_fats: '', nutrition_water: '' });
                              setEducationData({ education_course: '', education_hours: '', education_progress: '' });
                              setFinanceData({ finance_income: '', finance_expenses: '', finance_category: '', finance_notes: '' });
                            }}
                            sx={{ color: 'rgba(255,255,255,0.7)' }}
                          >
                            ✖️ Отменить
                          </Button>
                        )}
                        <Button
                          size="small"
                          onClick={() => setShowOnboarding(true)}
                          variant={((currentCategory.name === 'workouts' && !workoutProfile) ||
                            (currentCategory.name === 'reading' && !readingProfile) ||
                            (currentCategory.name === 'nutrition' && !nutritionProfile) ||
                            (currentCategory.name === 'education' && !educationProfile) ||
                            (currentCategory.name === 'finance' && !financeProfile)) ? 'contained' : 'outlined'}
                          sx={{
                            color: '#ffffff',
                            bgcolor: ((currentCategory.name === 'workouts' && !workoutProfile) ||
                              (currentCategory.name === 'reading' && !readingProfile) ||
                              (currentCategory.name === 'nutrition' && !nutritionProfile) ||
                              (currentCategory.name === 'education' && !educationProfile) ||
                              (currentCategory.name === 'finance' && !financeProfile)) ? currentCategory.color : 'transparent',
                            borderColor: currentCategory.color,
                            '&:hover': {
                              bgcolor: currentCategory.color,
                              opacity: 0.9,
                            },
                          }}
                        >
                          ⚙️ {((currentCategory.name === 'workouts' && !workoutProfile) ||
                            (currentCategory.name === 'reading' && !readingProfile) ||
                            (currentCategory.name === 'nutrition' && !nutritionProfile) ||
                            (currentCategory.name === 'education' && !educationProfile) ||
                            (currentCategory.name === 'finance' && !financeProfile)) 
                            ? 'Заполнить профиль' 
                            : 'Настроить профиль'}
                        </Button>
                      </Box>
                    </Box>
                    <TextField
                      fullWidth
                      type="date"
                      label="Дата"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      sx={{ mb: 3 }}
                      InputLabelProps={{ shrink: true }}
                    />
                    {renderCategoryForm()}
                  </CardContent>
                </MotionCard>

                {/* Календарь во весь экран */}
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  sx={{ bgcolor: '#1a1a1a', mb: 3 }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', mb: 3 }}>
                      📅 Календарь
                    </Typography>

                      <PersonalCalendar
                        entries={entries}
                        categoryName={currentCategory.name}
                        categoryColor={currentCategory.color}
                        currentDate={date}
                        onDateChange={setDate}
                        onDeleteEntry={(id) => deleteEntryMutation.mutate(id)}
                        onEditEntry={handleEditEntry}
                      />
                  </CardContent>
                </MotionCard>

                {/* AI Рекомендации */}
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  sx={{ bgcolor: '#1a1a1a', mb: 3 }}
                >
                  <CardContent>
                    <AIRecommendations
                      categoryName={currentCategory.name}
                      categoryColor={currentCategory.color}
                      hasProfile={
                        (currentCategory.name === 'workouts' && !!workoutProfile) ||
                        (currentCategory.name === 'reading' && !!readingProfile) ||
                        (currentCategory.name === 'nutrition' && !!nutritionProfile) ||
                        (currentCategory.name === 'education' && !!educationProfile) ||
                        (currentCategory.name === 'finance' && !!financeProfile)
                      }
                    />
                  </CardContent>
                </MotionCard>

                {/* Статистика и графики */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <MotionCard
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      sx={{ bgcolor: '#1a1a1a' }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', mb: 3 }}>
                          📊 Статистика
                        </Typography>

                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                            Записей за месяц
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: currentCategory.color }}>
                            {entries.length}
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

                        {entries.length > 0 ? (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            Отличная работа! Продолжайте в том же духе 💪
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Начните вести дневник, чтобы увидеть статистику и прогресс!
                          </Typography>
                        )}
                      </CardContent>
                    </MotionCard>
                  </Grid>

                  <Grid item xs={12} md={8}>
                    <MotionCard
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      sx={{ bgcolor: '#1a1a1a' }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', mb: 3 }}>
                          📈 Графики прогресса
                        </Typography>
                        <PersonalCharts
                          entries={entries}
                          categoryName={currentCategory.name}
                          categoryColor={currentCategory.color}
                        />
                      </CardContent>
                    </MotionCard>
                  </Grid>
                </Grid>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}

