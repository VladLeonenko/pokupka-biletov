import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Checkbox,
  FormControlLabel,
  Rating,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StarIcon from '@mui/icons-material/Star';
import { useToast } from '@/components/common/ToastProvider';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { getPersonalRecommendations } from '@/services/plannerApi';
import { markBookAsRead, updateReadingBook, replaceBooks, getReadBooks, type ReadingBook } from '@/services/readingBooksApi';

interface AIRecommendationsProps {
  categoryName: string;
  categoryColor: string;
  hasProfile: boolean;
}

export function AIRecommendations({ categoryName, categoryColor, hasProfile }: AIRecommendationsProps) {
  const [expanded, setExpanded] = useState<string | false>(false);
  const [readBooks, setReadBooks] = useState<Set<string>>(new Set());
  const [bookRatings, setBookRatings] = useState<Map<string, number>>(new Map());
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [replacementForms, setReplacementForms] = useState<Map<number, { title: string; author: string; genre: string }>>(new Map());
  const [editBookDialog, setEditBookDialog] = useState<{ open: boolean; book: ReadingBook | null }>({ open: false, book: null });
  const [singleBookReplacement, setSingleBookReplacement] = useState<{ title: string; author: string; genre: string }>({ title: '', author: '', genre: '' });

  const queryClient = useQueryClient();

  // Загружаем прочитанные книги для чтения
  const { data: readBooksData } = useQuery({
    queryKey: ['readBooks'],
    queryFn: async () => {
      if (categoryName !== 'reading') return [];
      const books = await getReadBooks();
      const readSet = new Set<string>();
      const ratingsMap = new Map<string, number>();
      books.forEach((book: ReadingBook) => {
        const key = `${book.book_title}|${book.book_author || ''}`;
        readSet.add(key);
        if (book.rating) {
          ratingsMap.set(key, book.rating);
        }
      });
      setReadBooks(readSet);
      setBookRatings(ratingsMap);
      return books;
    },
    enabled: categoryName === 'reading' && hasProfile,
  });

  // Мутации для работы с книгами
  const markReadMutation = useMutation({
    mutationFn: markBookAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readBooks'] });
    },
  });

  const updateBookMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => updateReadingBook(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readBooks'] });
    },
  });

  const replaceBooksMutation = useMutation({
    mutationFn: replaceBooks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readBooks'] });
      queryClient.invalidateQueries({ queryKey: ['personalRecommendations', categoryName] });
      setSelectedBooks(new Set());
    },
  });

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['personalRecommendations', categoryName],
    queryFn: async () => {
      try {
        console.log('[AIRecommendations] Fetching recommendations for:', categoryName);
        const result = await getPersonalRecommendations(categoryName);
        console.log('[AIRecommendations] Received data:', result);
        console.log('[AIRecommendations] Data structure:', {
          hasRecommendations: !!result?.recommendations,
          recommendationsType: typeof result?.recommendations,
          recommendationsKeys: result?.recommendations ? Object.keys(result.recommendations) : [],
          recommendationsValue: result?.recommendations,
          fullData: JSON.stringify(result, null, 2),
        });
        return result;
      } catch (err: any) {
        console.error('[AIRecommendations] Error fetching recommendations:', err);
        throw new Error(err?.message || 'Failed to load recommendations');
      }
    },
    enabled: hasProfile,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 секунд
  });
  
  console.log('[AIRecommendations] State:', { 
    data, 
    isLoading, 
    error, 
    hasProfile, 
    hasRecommendations: !!data?.recommendations,
    recommendations: data?.recommendations,
    recommendationsKeys: data?.recommendations ? Object.keys(data.recommendations) : [],
  });

  if (!hasProfile) {
    return (
      <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <SmartToyIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)', mb: 2 }} />
        <Typography variant="body1" sx={{ color: '#ffffff', mb: 2, fontWeight: 600 }}>
          Заполните профиль для AI-рекомендаций
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
          Нажмите кнопку "⚙️ Настроить профиль" в форме добавления записи выше
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            // Прокручиваем к форме
            const formElement = document.querySelector('[data-profile-form]');
            if (formElement) {
              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              // Триггерим открытие онбординга через событие
              window.dispatchEvent(new CustomEvent('openOnboarding'));
            }
          }}
          sx={{
            bgcolor: categoryColor,
            '&:hover': { bgcolor: categoryColor, opacity: 0.9 },
          }}
        >
          Перейти к настройке профиля
        </Button>
      </Paper>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress sx={{ color: categoryColor }} />
      </Box>
    );
  }

  // Проверяем, есть ли рекомендации (может быть пустой объект или массив)
  const hasRecommendations = data?.recommendations && (
    (Array.isArray(data.recommendations) && data.recommendations.length > 0) ||
    (typeof data.recommendations === 'object' && Object.keys(data.recommendations).length > 0)
  );

  console.log('[AIRecommendations] Render check:', {
    hasData: !!data,
    hasRecommendations,
    recommendations: data?.recommendations,
    recommendationsType: typeof data?.recommendations,
    recommendationsKeys: data?.recommendations ? Object.keys(data.recommendations) : [],
    isLoading,
    willShowEmpty: !hasRecommendations && !isLoading,
  });

  if (!hasRecommendations && !isLoading) {
    return (
      <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon sx={{ color: categoryColor }} />
            AI Рекомендации
          </Typography>
          <Button 
            size="small" 
            onClick={() => {
              console.log('[AIRecommendations] Refetching...');
              refetch();
            }}
            disabled={isLoading}
            variant="contained"
            sx={{ 
              bgcolor: categoryColor,
              '&:hover': { bgcolor: categoryColor, opacity: 0.9 },
            }}
          >
            {isLoading ? '⏳ Загрузка...' : '🔄 Получить рекомендации'}
          </Button>
        </Box>
        {error && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 107, 107, 0.1)', borderRadius: 1, border: '1px solid rgba(255, 107, 107, 0.3)' }}>
            <Typography variant="body2" sx={{ color: '#ff6b6b', mb: 1, fontWeight: 600 }}>
              ❌ Ошибка загрузки
            </Typography>
            <Typography variant="body2" sx={{ color: '#ff6b6b' }}>
              {error instanceof Error ? error.message : 'Неизвестная ошибка'}
            </Typography>
            <Button
              size="small"
              onClick={() => refetch()}
              sx={{ mt: 1, color: '#ff6b6b' }}
            >
              Попробовать снова
            </Button>
          </Box>
        )}
        {data && data.recommendations === null && (
          <Typography variant="body2" sx={{ color: '#ffa500', mb: 2 }}>
            ⚠️ AI не смог сгенерировать рекомендации. Проверьте логи backend или попробуйте позже.
          </Typography>
        )}
        {data && !hasRecommendations && data.recommendations !== null && (
          <Typography variant="body2" sx={{ color: '#ffa500', mb: 2 }}>
            ⚠️ Рекомендации получены, но пусты. Возможно, AI не смог сгенерировать данные.
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Нажмите "Получить рекомендации" для загрузки персональных советов от AI
        </Typography>
      </Paper>
    );
  }

  const recommendations = data.recommendations;
  console.log('[AIRecommendations] Rendering recommendations:', {
    recommendations,
    categoryName,
    hasPlan: !!recommendations?.plan,
    hasRecommendedBooks: !!recommendations?.recommended_books,
    hasRecommendations: !!recommendations?.recommendations,
    hasTips: !!recommendations?.tips,
  });
  
  // Детальное логирование для отладки изображений
  if (recommendations?.plan && Array.isArray(recommendations.plan)) {
    recommendations.plan.forEach((day: any, dayIndex: number) => {
      if (day.exercises && Array.isArray(day.exercises)) {
        day.exercises.forEach((ex: any, exIndex: number) => {
          console.log(`[AIRecommendations] Day ${dayIndex + 1}, Exercise ${exIndex + 1}:`, {
            name: ex.name,
            hasImageUrl: !!ex.image_url,
            imageUrl: ex.image_url,
            hasDescription: !!ex.description,
          });
        });
      }
    });
  }

  return (
    <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon sx={{ color: categoryColor }} />
          AI Рекомендации
        </Typography>
        <Button 
          size="small" 
          onClick={async () => {
            console.log('[AIRecommendations] Update button clicked, isLoading:', isLoading);
            try {
              const result = await refetch();
              console.log('[AIRecommendations] Refetch completed:', result);
            } catch (err) {
              console.error('[AIRecommendations] Refetch error:', err);
            }
          }}
          disabled={isLoading}
          sx={{ 
            color: '#ffffff',
            '&:disabled': { opacity: 0.6 },
          }}
        >
          {isLoading ? '⏳ Обновление...' : '🔄 Обновить'}
        </Button>
      </Box>

      {categoryName === 'workouts' && recommendations.plan && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
            💪 План тренировок на неделю
          </Typography>
          {recommendations.plan.map((day: any, index: number) => (
            <Accordion
              key={index}
              expanded={expanded === `day-${index}`}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? `day-${index}` : false)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                mb: 1,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{day.day}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {day.workout_type} • {day.duration} мин
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {day.exercises?.map((ex: any, i: number) => {
                  console.log(`[AIRecommendations] Rendering exercise ${i + 1}:`, {
                    name: ex.name,
                    hasImageUrl: !!ex.image_url,
                    imageUrl: ex.image_url,
                  });
                  return (
                    <Box key={i} sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      {ex.image_url ? (
                        <Box
                          component="img"
                          src={ex.image_url}
                          alt={ex.name}
                          sx={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: `2px solid ${categoryColor}`,
                          }}
                          onError={(e: any) => {
                            console.error(`[AIRecommendations] Failed to load image for "${ex.name}":`, ex.image_url);
                            e.target.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log(`[AIRecommendations] ✅ Successfully loaded image for "${ex.name}"`);
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 120,
                            height: 120,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `2px solid ${categoryColor}`,
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Нет фото
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>{ex.name}</Typography>
                        {ex.description && (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                            {ex.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip label={`${ex.sets} подхода`} size="small" sx={{ bgcolor: categoryColor }} />
                          <Chip label={ex.reps} size="small" />
                          {ex.weight && <Chip label={ex.weight} size="small" />}
                          {ex.rest && <Chip label={`Отдых: ${ex.rest}`} size="small" />}
                        </Box>
                      </Box>
                      </Box>
                    </Box>
                  );
                })}
                {day.notes && (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 2 }}>
                    💡 {day.notes}
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {categoryName === 'reading' && recommendations.recommended_books && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600 }}>
              📚 Рекомендуемые книги
            </Typography>
            {selectedBooks.size > 0 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<SwapHorizIcon />}
                onClick={() => setExpanded('replace-books-dialog')}
                sx={{ bgcolor: categoryColor, '&:hover': { bgcolor: categoryColor, opacity: 0.9 } }}
              >
                Заменить выбранные ({selectedBooks.size})
              </Button>
            )}
          </Box>
          <Grid container spacing={2}>
            {recommendations.recommended_books.map((book: any, index: number) => {
              const bookKey = `${book.title}|${book.author || ''}`;
              const isSelected = selectedBooks.has(bookKey);
              const isMarkedRead = readBooks.has(bookKey);
              const currentRating = bookRatings.get(bookKey) || 0;

              return (
                <Grid item xs={12} sm={6} key={index}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      bgcolor: isSelected ? 'rgba(245, 159, 0, 0.15)' : 'rgba(255,255,255,0.05)', 
                      height: '100%',
                      border: isSelected ? `2px solid ${categoryColor}` : '2px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Checkbox for selection */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedBooks);
                              if (e.target.checked) {
                                newSelected.add(bookKey);
                              } else {
                                newSelected.delete(bookKey);
                              }
                              setSelectedBooks(newSelected);
                            }}
                            sx={{ 
                              color: 'rgba(255,255,255,0.5)',
                              '&.Mui-checked': { color: categoryColor }
                            }}
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            Заменить
                          </Typography>
                        }
                      />
                      {isMarkedRead && (
                        <Chip
                          icon={<CheckCircleIcon sx={{ color: '#51cf66 !important' }} />}
                          label="Прочитано"
                          size="small"
                          sx={{ 
                            ml: 'auto',
                            bgcolor: 'rgba(81, 207, 102, 0.2)',
                            color: '#51cf66',
                            border: '1px solid #51cf66',
                          }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      {book.image_url && (
                        <Box
                          component="img"
                          src={book.image_url}
                          alt={book.title}
                          sx={{
                            width: 100,
                            height: 150,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: `2px solid ${categoryColor}`,
                          }}
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{book.title}</Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                          {book.author} • {book.genre}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {book.reason}
                        </Typography>
                        {book.pages && (
                          <Chip
                            label={`${book.pages} стр`}
                            size="small"
                            sx={{ mt: 1, bgcolor: categoryColor }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Rating section */}
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 1 }}>
                        Ваша оценка:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating
                          value={currentRating}
                          onChange={(_, newValue) => {
                            if (newValue !== null) {
                              const newRatings = new Map(bookRatings);
                              newRatings.set(bookKey, newValue);
                              setBookRatings(newRatings);
                              // Save rating to backend (update existing or create new)
                              if (isMarkedRead) {
                                // Если книга уже прочитана, обновляем запись
                                const existingBook = readBooksData?.find((b: ReadingBook) => 
                                  b.book_title === book.title && 
                                  (b.book_author || '') === (book.author || '')
                                );
                                if (existingBook) {
                                  updateBookMutation.mutate({
                                    id: existingBook.id,
                                    updates: { rating: newValue },
                                  });
                                } else {
                                  // Если не найдена, создаем новую запись
                                  markReadMutation.mutate({
                                    book_title: book.title,
                                    book_author: book.author,
                                    rating: newValue,
                                  });
                                }
                              } else {
                                // Если книга еще не прочитана, создаем запись с оценкой
                                markReadMutation.mutate({
                                  book_title: book.title,
                                  book_author: book.author,
                                  rating: newValue,
                                });
                              }
                            }
                          }}
                          icon={<StarIcon sx={{ color: '#ffd43b' }} />}
                          emptyIcon={<StarIcon sx={{ color: 'rgba(255,255,255,0.3)' }} />}
                        />
                      </Box>
                    </Box>

                    {/* Mark as read button */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      {!isMarkedRead ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<CheckCircleIcon />}
                          onClick={async () => {
                            const newReadBooks = new Set(readBooks);
                            newReadBooks.add(bookKey);
                            setReadBooks(newReadBooks);
                            try {
                              await markReadMutation.mutateAsync({
                                book_title: book.title,
                                book_author: book.author,
                                rating: currentRating || undefined,
                                read_date: new Date().toISOString().split('T')[0], // Сегодняшняя дата
                              });
                              // Обновляем список прочитанных книг
                              queryClient.invalidateQueries({ queryKey: ['readBooks'] });
                            } catch (err) {
                              console.error('[AIRecommendations] Error marking book as read:', err);
                            }
                          }}
                          disabled={markReadMutation.isPending}
                          sx={{ 
                            flex: 1,
                            color: '#51cf66', 
                            borderColor: '#51cf66',
                            '&:hover': { bgcolor: 'rgba(81, 207, 102, 0.1)', borderColor: '#51cf66' }
                          }}
                        >
                          {markReadMutation.isPending ? 'Сохранение...' : 'Прочитано'}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircleIcon />}
                          disabled
                          sx={{ 
                            flex: 1,
                            bgcolor: 'rgba(81, 207, 102, 0.2)',
                            color: '#51cf66',
                            '&.Mui-disabled': { bgcolor: 'rgba(81, 207, 102, 0.2)', color: '#51cf66' }
                          }}
                        >
                          ✓ Уже прочитано
                        </Button>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => setExpanded(`replace-book-${index}`)}
                        sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: categoryColor } }}
                        title="Заменить на другую книгу"
                      >
                        <SwapHorizIcon />
                      </IconButton>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Блок с прочитанными книгами */}
      {categoryName === 'reading' && readBooksData && readBooksData.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
            ✅ Прочитанные книги
          </Typography>
          <Grid container spacing={2}>
            {readBooksData.map((book: ReadingBook) => (
              <Grid item xs={12} sm={6} md={4} key={book.id}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(81, 207, 102, 0.1)', 
                    height: '100%',
                    border: '1px solid rgba(81, 207, 102, 0.3)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{book.book_title}</Typography>
                      {book.book_author && (
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                          {book.book_author}
                        </Typography>
                      )}
                      {book.book_genre && (
                        <Chip
                          label={book.book_genre}
                          size="small"
                          sx={{ mb: 1, bgcolor: categoryColor }}
                        />
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => setEditBookDialog({ open: true, book })}
                      sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: categoryColor } }}
                      title="Редактировать"
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>

                  {book.read_date && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                      📅 Прочитано: {new Date(book.read_date).toLocaleDateString('ru-RU')}
                    </Typography>
                  )}

                  {book.rating && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 0.5 }}>
                        Оценка:
                      </Typography>
                      <Rating
                        value={book.rating}
                        readOnly
                        icon={<StarIcon sx={{ color: '#ffd43b' }} />}
                        emptyIcon={<StarIcon sx={{ color: 'rgba(255,255,255,0.3)' }} />}
                      />
                    </Box>
                  )}

                  {book.notes && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1, fontStyle: 'italic' }}>
                      💭 {book.notes}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Диалог редактирования книги */}
          {editBookDialog.book && (
            <EditBookDialog
              open={editBookDialog.open}
              book={editBookDialog.book}
              onClose={() => setEditBookDialog({ open: false, book: null })}
              onSave={async (updates) => {
                try {
                  await updateBookMutation.mutateAsync({
                    id: editBookDialog.book!.id,
                    updates,
                  });
                  setEditBookDialog({ open: false, book: null });
                } catch (err) {
                  console.error('[AIRecommendations] Error updating book:', err);
                }
              }}
              isPending={updateBookMutation.isPending}
            />
          )}
        </Box>
      )}

      {categoryName === 'nutrition' && recommendations.meal_plan && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
            🍎 План питания на неделю
          </Typography>
          {recommendations.meal_plan.map((day: any, index: number) => (
            <Accordion
              key={index}
              expanded={expanded === `nutrition-day-${index}`}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? `nutrition-day-${index}` : false)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                mb: 1,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}>
                <Typography sx={{ fontWeight: 600 }}>{day.day}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {day.meals?.map((meal: any, i: number) => (
                  <Box key={i} sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      {meal.image_url && (
                        <Box
                          component="img"
                          src={meal.image_url}
                          alt={meal.name}
                          sx={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: `2px solid ${categoryColor}`,
                          }}
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>{meal.meal_type}: {meal.name}</Typography>
                        {meal.description && (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                            {meal.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip label={`${meal.calories} ккал`} size="small" sx={{ bgcolor: categoryColor }} />
                          <Chip label={`Б: ${meal.protein}г`} size="small" />
                          <Chip label={`У: ${meal.carbs}г`} size="small" />
                          <Chip label={`Ж: ${meal.fats}г`} size="small" />
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {categoryName === 'education' && recommendations.courses && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
            📚 Рекомендуемые курсы
          </Typography>
          <Grid container spacing={2}>
            {recommendations.courses.map((course: any, index: number) => (
              <Grid item xs={12} sm={6} key={index}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', height: '100%' }}>
                  {course.image_url && (
                    <Box
                      component="img"
                      src={course.image_url}
                      alt={course.title}
                      sx={{
                        width: '100%',
                        height: 150,
                        objectFit: 'cover',
                        borderRadius: 1,
                        mb: 1,
                        border: `2px solid ${categoryColor}`,
                      }}
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{course.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                    {course.platform} • {course.duration} • {course.level}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    {course.description}
                  </Typography>
                  {course.url && (
                    <Chip
                      label="Открыть курс"
                      size="small"
                      component="a"
                      href={course.url}
                      target="_blank"
                      sx={{ mt: 1, bgcolor: categoryColor, cursor: 'pointer' }}
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {categoryName === 'finance' && recommendations.tips && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
            💰 Финансовые советы
          </Typography>
          <Grid container spacing={2}>
            {recommendations.tips.map((tip: any, index: number) => (
              <Grid item xs={12} sm={6} key={index}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', height: '100%' }}>
                  {tip.image_url && (
                    <Box
                      component="img"
                      src={tip.image_url}
                      alt={tip.title}
                      sx={{
                        width: '100%',
                        height: 150,
                        objectFit: 'cover',
                        borderRadius: 1,
                        mb: 1,
                        border: `2px solid ${categoryColor}`,
                      }}
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{tip.title}</Typography>
                  {tip.category && (
                    <Chip
                      label={tip.category}
                      size="small"
                      sx={{ mb: 1, bgcolor: categoryColor }}
                    />
                  )}
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {tip.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {recommendations.recommendations && (
        <Box>
          <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
            💡 Советы
          </Typography>
          {recommendations.recommendations.map((tip: string, index: number) => (
            <Box key={index} sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                {tip}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {recommendations.tips && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
            💡 Советы
          </Typography>
          {recommendations.tips.map((tip: string, index: number) => (
            <Box key={index} sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                {tip}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Диалог замены одной книги */}
      {categoryName === 'reading' && recommendations.recommended_books && recommendations.recommended_books.map((book: any, index: number) => {
        const bookKey = `${book.title}|${book.author || ''}`;
        const isReplaceDialogOpen = expanded === `replace-book-${index}`;
        const currentBook = recommendations.recommended_books.find((b: any, i: number) => i === index);

        return (
          <Dialog
            key={`replace-${index}`}
            open={isReplaceDialogOpen}
            onClose={() => {
              setExpanded(false);
              setSingleBookReplacement({ title: '', author: '', genre: '' });
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Заменить книгу</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Текущая книга:</Typography>
                <Typography>{currentBook?.title}</Typography>
                {currentBook?.author && <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.7)' }}>{currentBook.author}</Typography>}
              </Box>
              <TextField
                fullWidth
                label="Название новой книги"
                value={singleBookReplacement.title}
                onChange={(e) => setSingleBookReplacement({ ...singleBookReplacement, title: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Автор"
                value={singleBookReplacement.author}
                onChange={(e) => setSingleBookReplacement({ ...singleBookReplacement, author: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Жанр"
                value={singleBookReplacement.genre}
                onChange={(e) => setSingleBookReplacement({ ...singleBookReplacement, genre: e.target.value })}
                sx={{ mb: 2 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setExpanded(false);
                setSingleBookReplacement({ title: '', author: '', genre: '' });
              }}>Отмена</Button>
              <Button
                variant="contained"
                onClick={async () => {
                  if (!singleBookReplacement.title.trim()) {
                    showToast('Введите название книги', 'error');
                    return;
                  }
                  try {
                    await replaceBooksMutation.mutateAsync(
                      [{ book_title: currentBook?.title, book_author: currentBook?.author }],
                      [{ title: singleBookReplacement.title, author: singleBookReplacement.author || undefined, genre: singleBookReplacement.genre || undefined }]
                    );
                    setExpanded(false);
                    setSingleBookReplacement({ title: '', author: '', genre: '' });
                    // Обновляем рекомендации
                    refetch();
                  } catch (err) {
                    console.error('[AIRecommendations] Error replacing book:', err);
                  }
                }}
                disabled={replaceBooksMutation.isPending || !singleBookReplacement.title.trim()}
              >
                {replaceBooksMutation.isPending ? 'Замена...' : 'Заменить'}
              </Button>
            </DialogActions>
          </Dialog>
        );
      })}

      {/* Диалог массовой замены */}
      {categoryName === 'reading' && (
        <Dialog
          open={expanded === 'replace-books-dialog'}
          onClose={() => setExpanded(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Заменить выбранные книги</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, color: 'rgba(0,0,0,0.7)' }}>
              Выбрано книг: {selectedBooks.size}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Введите книги для замены (по одной на строку или через запятую):
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Новые книги"
              placeholder="Название книги 1, Автор 1&#10;Название книги 2, Автор 2&#10;..."
              onChange={(e) => {
                // Парсим введенные книги
                const lines = e.target.value.split('\n').filter(l => l.trim());
                const books = lines.map(line => {
                  const parts = line.split(',').map(p => p.trim());
                  return {
                    title: parts[0] || '',
                    author: parts[1] || undefined,
                  };
                });
                // Сохраняем во временное состояние
                (window as any).__tempReplacementBooks = books;
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExpanded(false)}>Отмена</Button>
            <Button
              variant="contained"
              onClick={async () => {
                const replacementBooks = (window as any).__tempReplacementBooks || [];
                if (replacementBooks.length === 0) {
                  showToast('Введите книги для замены', 'error');
                  return;
                }
                try {
                  const booksToReplace = Array.from(selectedBooks).map(key => {
                    const [title, author] = key.split('|');
                    return { book_title: title, book_author: author || undefined };
                  });
                  await replaceBooksMutation.mutateAsync(booksToReplace, replacementBooks);
                  setExpanded(false);
                  setSelectedBooks(new Set());
                  (window as any).__tempReplacementBooks = [];
                  // Обновляем рекомендации
                  refetch();
                } catch (err) {
                  console.error('[AIRecommendations] Error replacing books:', err);
                }
              }}
              disabled={replaceBooksMutation.isPending}
            >
              {replaceBooksMutation.isPending ? 'Замена...' : 'Заменить'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  );
}

// Компонент диалога редактирования книги
interface EditBookDialogProps {
  open: boolean;
  book: ReadingBook;
  onClose: () => void;
  onSave: (updates: { rating?: number; read_date?: string; notes?: string }) => Promise<void>;
  isPending: boolean;
}

function EditBookDialog({ open, book, onClose, onSave, isPending }: EditBookDialogProps) {
  const [editRating, setEditRating] = useState(book.rating || 0);
  const [editReadDate, setEditReadDate] = useState(book.read_date || '');
  const [editNotes, setEditNotes] = useState(book.notes || '');

  // Обновляем состояние при изменении книги
  React.useEffect(() => {
    if (book) {
      setEditRating(book.rating || 0);
      setEditReadDate(book.read_date || '');
      setEditNotes(book.notes || '');
    }
  }, [book]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Редактировать книгу</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Книга:</Typography>
          <Typography>{book.book_title}</Typography>
          {book.book_author && (
            <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.7)' }}>
              {book.book_author}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Оценка:</Typography>
          <Rating
            value={editRating}
            onChange={(_, newValue) => {
              if (newValue !== null) {
                setEditRating(newValue);
              }
            }}
            icon={<StarIcon sx={{ color: '#ffd43b' }} />}
            emptyIcon={<StarIcon sx={{ color: 'rgba(0,0,0,0.3)' }} />}
          />
        </Box>

        <TextField
          fullWidth
          type="date"
          label="Дата прочтения"
          value={editReadDate}
          onChange={(e) => setEditReadDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Заметки"
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          sx={{ mb: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          onClick={async () => {
            await onSave({
              rating: editRating || undefined,
              read_date: editReadDate || undefined,
              notes: editNotes || undefined,
            });
          }}
          disabled={isPending}
        >
          {isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

