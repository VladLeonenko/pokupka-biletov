import { useState } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Chip,
  Grid,
  Paper,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useMutation } from '@tanstack/react-query';
import { saveReadingProfile } from '@/services/plannerApi';
import type { ReadingProfile } from '@/types/planner';
import { useToast } from '@/components/common/ToastProvider';

interface ReadingOnboardingProps {
  onComplete: () => void;
}

export function ReadingOnboarding({ onComplete }: ReadingOnboardingProps) {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [profile, setProfile] = useState<ReadingProfile>({
    favorite_genres: [],
    favorite_authors: [],
    books_read: [],
  });
  
  // Локальные состояния для текстовых полей
  const [authorsText, setAuthorsText] = useState('');
  const [booksText, setBooksText] = useState('');

  const saveMutation = useMutation({
    mutationFn: saveReadingProfile,
    onSuccess: () => {
      showToast('Профиль читателя сохранен!', 'success');
      onComplete();
    },
  });

  const steps = ['Жанры и авторы', 'Цели чтения', 'Прочитанные книги'];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Перед сохранением разбиваем текстовые поля на массивы
      const finalProfile = {
        ...profile,
        favorite_authors: authorsText ? authorsText.split(',').map(s => s.trim()).filter(Boolean) : [],
        books_read: booksText ? booksText.split('\n').map(s => s.trim()).filter(Boolean) : [],
      };
      saveMutation.mutate(finalProfile);
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const toggleArrayItem = (key: keyof ReadingProfile, value: string) => {
    const current = (profile[key] as string[]) || [];
    const newArray = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    setProfile({ ...profile, [key]: newArray });
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                📚 Какие жанры вам нравятся?
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {[
                  'Художественная литература',
                  'Научная фантастика',
                  'Фэнтези',
                  'Детективы',
                  'Биографии',
                  'Бизнес',
                  'Саморазвитие',
                  'Психология',
                  'История',
                  'Наука',
                  'Философия',
                  'Поэзия',
                  'Классика',
                  'Современная проза',
                ].map((genre) => {
                  const isSelected = (profile.favorite_genres || []).includes(genre);
                  return (
                    <Chip
                      key={genre}
                      label={genre}
                      onClick={() => toggleArrayItem('favorite_genres', genre)}
                      icon={isSelected ? <CheckIcon sx={{ color: '#ffffff !important' }} /> : undefined}
                      sx={{
                        bgcolor: isSelected
                          ? '#f59f00'
                          : 'rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        border: isSelected 
                          ? '2px solid #f59f00' 
                          : '2px solid transparent',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.9rem',
                        height: '36px',
                        '&:hover': {
                          bgcolor: isSelected
                            ? '#e67700'
                            : 'rgba(255,255,255,0.2)',
                          border: isSelected 
                            ? '2px solid #e67700' 
                            : '2px solid rgba(255,255,255,0.3)',
                          transform: 'scale(1.05)',
                          transition: 'all 0.2s',
                        },
                        transition: 'all 0.2s',
                      }}
                    />
                  );
                })}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
                ✨ Любимые авторы (необязательно):
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Например: Харуки Мураками, Рэй Брэдбери, Стивен Кинг..."
                value={authorsText}
                onChange={(e) => setAuthorsText(e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
                🎯 Ваши цели по чтению
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Книг в месяц"
                placeholder="2"
                value={profile.books_per_month_goal || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  books_per_month_goal: Number(e.target.value) 
                })}
                helperText="Рекомендация 2025: минимум 1-2 книги в месяц"
                InputProps={{ inputProps: { min: 1, max: 20 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Страниц в день"
                placeholder="20"
                value={profile.pages_per_day_goal || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  pages_per_day_goal: Number(e.target.value) 
                })}
                helperText="Оптимально: 20-50 страниц в день"
                InputProps={{ inputProps: { min: 1, max: 200 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Скорость чтения (стр/час)"
                placeholder="30"
                value={profile.reading_speed || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  reading_speed: Number(e.target.value) 
                })}
                helperText="Средняя скорость: 20-40 стр/час"
                InputProps={{ inputProps: { min: 5, max: 100 } }}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                📖 Что уже прочитали?
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                Это поможет AI рекомендовать похожие книги
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                placeholder="Атомные привычки, Sapiens, 1984, Мастер и Маргарита..."
                value={booksText}
                onChange={(e) => setBooksText(e.target.value)}
                helperText="Каждая книга с новой строки"
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#ffffff', mb: 3, textAlign: 'center' }}>
        📚 Настройка профиля читателя
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel
              sx={{
                '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.7)' },
                '& .Mui-active': { color: '#ffffff !important' },
                '& .Mui-completed': { color: '#51cf66 !important' },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', mb: 3 }}>
        {renderStep()}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          sx={{ color: '#ffffff' }}
        >
          Назад
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={saveMutation.isPending}
          sx={{
            bgcolor: '#f59f00',
            '&:hover': { bgcolor: '#e67700' },
          }}
        >
          {activeStep === steps.length - 1 
            ? (saveMutation.isPending ? 'Сохранение...' : '✅ Завершить')
            : 'Далее →'}
        </Button>
      </Box>
    </Box>
  );
}

