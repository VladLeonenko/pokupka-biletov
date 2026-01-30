import { useState } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Paper,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useMutation } from '@tanstack/react-query';
import { saveWorkoutProfile } from '@/services/plannerApi';
import type { WorkoutProfile } from '@/types/planner';
import { useToast } from '@/components/common/ToastProvider';

interface WorkoutOnboardingProps {
  onComplete: () => void;
}

export function WorkoutOnboarding({ onComplete }: WorkoutOnboardingProps) {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [profile, setProfile] = useState<WorkoutProfile>({
    goals: [],
    injuries: [],
    health_conditions: [],
    preferred_workouts: [],
  });
  
  // Локальные состояния для текстовых полей (чтобы можно было вводить пробелы)
  const [injuriesText, setInjuriesText] = useState('');

  const saveMutation = useMutation({
    mutationFn: saveWorkoutProfile,
    onSuccess: () => {
      showToast('Профиль сохранен!', 'success');
      onComplete();
    },
  });

  const steps = ['Базовые данные', 'Уровень и цели', 'Предпочтения'];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Перед сохранением разбиваем текстовые поля на массивы
      const finalProfile = {
        ...profile,
        injuries: injuriesText ? injuriesText.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      saveMutation.mutate(finalProfile);
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const toggleArrayItem = (key: keyof WorkoutProfile, value: string) => {
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
                Давайте познакомимся! 👋
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Рост (см)"
                placeholder="175"
                value={profile.height || ''}
                onChange={(e) => setProfile({ ...profile, height: Number(e.target.value) })}
                inputProps={{ step: "0.1" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Вес (кг)"
                placeholder="75"
                value={profile.weight || ''}
                onChange={(e) => setProfile({ ...profile, weight: Number(e.target.value) })}
                inputProps={{ step: "0.1" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Возраст"
                placeholder="30"
                value={profile.age || ''}
                onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Пол</InputLabel>
                <Select
                  value={profile.gender || ''}
                  label="Пол"
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value as any })}
                >
                  <MenuItem value="male">Мужской</MenuItem>
                  <MenuItem value="female">Женский</MenuItem>
                  <MenuItem value="other">Другой</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Ваш уровень подготовки 💪
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Уровень</InputLabel>
                <Select
                  value={profile.fitness_level || ''}
                  label="Уровень"
                  onChange={(e) => setProfile({ ...profile, fitness_level: e.target.value as any })}
                >
                  <MenuItem value="beginner">Начинающий (менее 6 месяцев)</MenuItem>
                  <MenuItem value="intermediate">Средний (6-24 месяца)</MenuItem>
                  <MenuItem value="advanced">Продвинутый (2-5 лет)</MenuItem>
                  <MenuItem value="pro">Профессионал (5+ лет)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
                Ваши цели (выберите все подходящие):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  { value: 'weight_loss', label: '🔥 Похудение' },
                  { value: 'muscle_gain', label: '💪 Набор массы' },
                  { value: 'endurance', label: '🏃 Выносливость' },
                  { value: 'flexibility', label: '🧘 Гибкость' },
                  { value: 'health', label: '❤️ Здоровье' },
                  { value: 'strength', label: '⚡ Сила' },
                ].map((goal) => {
                  const isSelected = (profile.goals || []).includes(goal.value);
                  return (
                    <Chip
                      key={goal.value}
                      label={goal.label}
                      onClick={() => toggleArrayItem('goals', goal.value)}
                      icon={isSelected ? <CheckIcon sx={{ color: '#ffffff !important' }} /> : undefined}
                      sx={{
                        bgcolor: isSelected
                          ? '#667eea'
                          : 'rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        border: isSelected 
                          ? '2px solid #667eea' 
                          : '2px solid transparent',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.9rem',
                        height: '36px',
                        '&:hover': {
                          bgcolor: isSelected
                            ? '#5568d3'
                            : 'rgba(255,255,255,0.2)',
                          border: isSelected 
                            ? '2px solid #5568d3' 
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

            {(profile.goals || []).includes('weight_loss') && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Целевой вес (кг)"
                  placeholder="70"
                  value={profile.target_weight || ''}
                  onChange={(e) => setProfile({ ...profile, target_weight: Number(e.target.value) })}
                  inputProps={{ step: "0.1" }}
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Тренировок в неделю"
                placeholder="3"
                value={profile.training_days_per_week || ''}
                onChange={(e) => setProfile({ ...profile, training_days_per_week: Number(e.target.value) })}
                InputProps={{ inputProps: { min: 1, max: 7 } }}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Типы тренировок ⚡
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                Что вам нравится? (выберите несколько)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {[
                  'Силовые', 'Кардио', 'Йога', 'Пилатес', 'Бег', 'Плавание',
                  'Велосипед', 'HIIT', 'Кроссфит', 'Бокс', 'Танцы', 'Растяжка'
                ].map((workout) => {
                  const isSelected = (profile.preferred_workouts || []).includes(workout);
                  return (
                    <Chip
                      key={workout}
                      label={workout}
                      onClick={() => toggleArrayItem('preferred_workouts', workout)}
                      icon={isSelected ? <CheckIcon sx={{ color: '#ffffff !important' }} /> : undefined}
                      sx={{
                        bgcolor: isSelected
                          ? '#ff6b6b'
                          : 'rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        border: isSelected 
                          ? '2px solid #ff6b6b' 
                          : '2px solid transparent',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.9rem',
                        height: '36px',
                        '&:hover': {
                          bgcolor: isSelected
                            ? '#ff5252'
                            : 'rgba(255,255,255,0.2)',
                          border: isSelected 
                            ? '2px solid #ff5252' 
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
                Есть ли травмы или ограничения? (необязательно)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Например: травма колена, проблемы со спиной..."
                value={injuriesText}
                onChange={(e) => setInjuriesText(e.target.value)}
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
        🏋️ Настройка профиля тренировок
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
            bgcolor: '#ff6b6b',
            '&:hover': { bgcolor: '#ff5252' },
          }}
        >
          {activeStep === steps.length - 1 
            ? (saveMutation.isPending ? 'Сохранение...' : 'Завершить')
            : 'Далее'}
        </Button>
      </Box>
    </Box>
  );
}

