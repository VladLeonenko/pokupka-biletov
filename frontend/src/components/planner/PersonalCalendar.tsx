import { useState } from 'react';
import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import type { PersonalEntry } from '@/types/planner';

interface PersonalCalendarProps {
  entries: PersonalEntry[];
  categoryName: string;
  categoryColor: string;
  currentDate: string;
  onDateChange: (date: string) => void;
  onDeleteEntry?: (id: number) => void;
  onEditEntry?: (entry: PersonalEntry) => void;
}

export function PersonalCalendar({
  entries,
  categoryName,
  categoryColor,
  currentDate,
  onDateChange,
  onDeleteEntry,
  onEditEntry,
}: PersonalCalendarProps) {
  const [selectedEntry, setSelectedEntry] = useState<PersonalEntry | null>(null);
  const [viewDate, setViewDate] = useState(new Date(currentDate));

  // Получаем дни месяца
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days: (Date | null)[] = [];
    
    // Добавляем пустые дни в начале
    for (let i = 0; i < (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1); i++) {
      days.push(null);
    }
    
    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth(viewDate);
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Получаем записи для конкретного дня
  const getEntriesForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayEntries = entries.filter(e => {
      // Нормализуем дату записи (может быть с временем или без)
      const entryDate = e.date.includes('T') 
        ? e.date.split('T')[0] 
        : e.date;
      return entryDate === dateStr;
    });
    
    if (dayEntries.length > 0) {
      console.log(`[PersonalCalendar] Found ${dayEntries.length} entries for ${dateStr}:`, dayEntries);
    }
    
    return dayEntries;
  };
  
  // Отладочная информация
  React.useEffect(() => {
    console.log('[PersonalCalendar] Entries:', entries);
    console.log('[PersonalCalendar] View date:', viewDate);
  }, [entries, viewDate]);

  const handlePrevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
    onDateChange(newDate.toISOString().split('T')[0]);
  };

  const handleNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewDate(newDate);
    onDateChange(newDate.toISOString().split('T')[0]);
  };

  const handleEntryClick = (entry: PersonalEntry) => {
    setSelectedEntry(entry);
  };

  const renderEntryDetails = (entry: PersonalEntry) => {
    switch (categoryName) {
      case 'workouts':
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
              {entry.workout_type}
            </Typography>
            {entry.workout_duration && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                ⏱️ Длительность: {entry.workout_duration} мин
              </Typography>
            )}
            {entry.workout_weight && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                ⚖️ Вес: {entry.workout_weight} кг
              </Typography>
            )}
            {entry.workout_exercises && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Упражнения:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.8)' }}>
                  {entry.workout_exercises}
                </Typography>
              </Box>
            )}
          </Box>
        );
      
      case 'nutrition':
        return (
          <Box>
            {entry.nutrition_calories && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                🔥 Калории: {entry.nutrition_calories} ккал
              </Typography>
            )}
            {entry.nutrition_protein && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                🥩 Белки: {entry.nutrition_protein} г
              </Typography>
            )}
            {entry.nutrition_carbs && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                🍞 Углеводы: {entry.nutrition_carbs} г
              </Typography>
            )}
            {entry.nutrition_fats && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                🥑 Жиры: {entry.nutrition_fats} г
              </Typography>
            )}
            {entry.nutrition_water && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                💧 Вода: {entry.nutrition_water} л
              </Typography>
            )}
          </Box>
        );
      
      case 'education':
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
              {entry.education_course}
            </Typography>
            {entry.education_hours && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                ⏱️ Часов: {entry.education_hours}
              </Typography>
            )}
            {entry.education_progress && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                📊 Прогресс: {entry.education_progress}%
              </Typography>
            )}
          </Box>
        );
      
      case 'reading':
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
              {entry.reading_book}
            </Typography>
            {entry.reading_pages && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                📄 Страниц: {entry.reading_pages}
              </Typography>
            )}
            {entry.reading_notes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Заметки:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.8)' }}>
                  {entry.reading_notes}
                </Typography>
              </Box>
            )}
          </Box>
        );
      
      case 'finance':
        return (
          <Box>
            {entry.finance_category && (
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
                {entry.finance_category}
              </Typography>
            )}
            {entry.finance_income && (
              <Typography variant="body2" sx={{ mb: 1, color: '#51cf66' }}>
                ➕ Доход: {entry.finance_income} ₽
              </Typography>
            )}
            {entry.finance_expenses && (
              <Typography variant="body2" sx={{ mb: 1, color: '#ff6b6b' }}>
                ➖ Расход: {entry.finance_expenses} ₽
              </Typography>
            )}
            {entry.finance_notes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Заметки:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.8)' }}>
                  {entry.finance_notes}
                </Typography>
              </Box>
            )}
          </Box>
        );
      
      default:
        return <Typography>Нет данных</Typography>;
    }
  };

  return (
    <Box>
      {/* Заголовок с навигацией */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handlePrevMonth} sx={{ color: '#ffffff' }}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
          {viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton onClick={handleNextMonth} sx={{ color: '#ffffff' }}>
          <ChevronRight />
        </IconButton>
      </Box>

      {/* Дни недели */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {weekDays.map((day) => (
          <Grid item xs={12 / 7} key={day}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 600,
              }}
            >
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Календарь */}
      <Grid container spacing={1}>
        {days.map((day, index) => {
          if (!day) {
            return (
              <Grid item xs={12 / 7} key={`empty-${index}`}>
                <Box sx={{ height: 80 }} />
              </Grid>
            );
          }

          const dayEntries = getEntriesForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <Grid item xs={12 / 7} key={day.toISOString()}>
              <Paper
                sx={{
                  height: 80,
                  p: 1,
                  bgcolor: isToday ? 'rgba(102, 126, 234, 0.1)' : 'rgba(255,255,255,0.05)',
                  border: isToday ? `2px solid ${categoryColor}` : '1px solid rgba(255,255,255,0.1)',
                  cursor: dayEntries.length > 0 ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  '&:hover': dayEntries.length > 0 ? {
                    bgcolor: 'rgba(255,255,255,0.08)',
                    transform: 'translateY(-2px)',
                  } : {},
                }}
                onClick={() => {
                  if (dayEntries.length > 0) {
                    // Если несколько записей, показываем первую
                    handleEntryClick(dayEntries[0]);
                  }
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? categoryColor : '#ffffff',
                    mb: 0.5,
                  }}
                >
                  {day.getDate()}
                </Typography>
                {dayEntries.length > 0 && (
                  <>
                    <Box
                      sx={{
                        width: '100%',
                        height: 4,
                        bgcolor: categoryColor,
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    />
                    {dayEntries.length > 1 && (
                      <Typography variant="caption" sx={{ color: categoryColor, fontSize: 10, fontWeight: 600 }}>
                        +{dayEntries.length - 1}
                      </Typography>
                    )}
                  </>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Диалог с деталями записи */}
      <Dialog
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: '#ffffff',
          },
        }}
      >
        {selectedEntry && (
          <>
            <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {new Date(selectedEntry.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              {renderEntryDetails(selectedEntry)}
            </DialogContent>
            <DialogActions>
              {onEditEntry && (
                <Button
                  onClick={() => {
                    if (selectedEntry) {
                      setSelectedEntry(null);
                      onEditEntry(selectedEntry);
                    }
                  }}
                  sx={{ color: '#667eea' }}
                >
                  ✏️ Редактировать
                </Button>
              )}
              {onDeleteEntry && (
                <Button
                  onClick={() => {
                    if (selectedEntry && window.confirm('Удалить эту запись?')) {
                      onDeleteEntry(selectedEntry.id);
                      setSelectedEntry(null);
                    }
                  }}
                  sx={{ color: '#ff6b6b' }}
                  startIcon={<DeleteIcon />}
                >
                  Удалить
                </Button>
              )}
              <Button onClick={() => setSelectedEntry(null)} sx={{ color: '#ffffff' }}>
                Закрыть
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

