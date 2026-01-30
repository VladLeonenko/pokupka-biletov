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
import { saveNutritionProfile } from '@/services/plannerApi';
import type { NutritionProfile } from '@/types/planner';
import { useToast } from '@/components/common/ToastProvider';

interface NutritionOnboardingProps {
  onComplete: () => void;
}

export function NutritionOnboarding({ onComplete }: NutritionOnboardingProps) {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [profile, setProfile] = useState<NutritionProfile>({
    allergies: [],
    dislikes: [],
  });
  
  // Локальные состояния для текстовых полей
  const [allergiesText, setAllergiesText] = useState('');
  const [dislikesText, setDislikesText] = useState('');

  const saveMutation = useMutation({
    mutationFn: saveNutritionProfile,
    onSuccess: () => {
      showToast('Профиль питания сохранен!', 'success');
      onComplete();
    },
  });

  const steps = ['Цели по питанию', 'Тип диеты', 'Ограничения'];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Перед сохранением разбиваем текстовые поля на массивы
      const finalProfile = {
        ...profile,
        allergies: allergiesText ? allergiesText.split(',').map(s => s.trim()).filter(Boolean) : [],
        dislikes: dislikesText ? dislikesText.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      saveMutation.mutate(finalProfile);
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const toggleArrayItem = (key: keyof NutritionProfile, value: string) => {
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
                🎯 Ваши цели по питанию
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Дневная норма калорий"
                placeholder="2000"
                value={profile.daily_calories_goal || ''}
                onChange={(e) => setProfile({ ...profile, daily_calories_goal: Number(e.target.value) })}
                helperText="Средняя норма: 1800-2500 ккал"
                InputProps={{ inputProps: { min: 1000, max: 5000 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Вода (л/день)"
                placeholder="2.5"
                value={profile.daily_water_goal || ''}
                onChange={(e) => setProfile({ ...profile, daily_water_goal: Number(e.target.value) })}
                helperText="Рекомендация: 2-3 литра"
                inputProps={{ step: "0.1", min: 1, max: 5 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Белки (г/день)"
                placeholder="150"
                value={profile.daily_protein_goal || ''}
                onChange={(e) => setProfile({ ...profile, daily_protein_goal: Number(e.target.value) })}
                InputProps={{ inputProps: { min: 50, max: 300 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Углеводы (г/день)"
                placeholder="200"
                value={profile.daily_carbs_goal || ''}
                onChange={(e) => setProfile({ ...profile, daily_carbs_goal: Number(e.target.value) })}
                InputProps={{ inputProps: { min: 50, max: 500 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Жиры (г/день)"
                placeholder="60"
                value={profile.daily_fats_goal || ''}
                onChange={(e) => setProfile({ ...profile, daily_fats_goal: Number(e.target.value) })}
                InputProps={{ inputProps: { min: 30, max: 200 } }}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                🥗 Тип питания
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Тип диеты</InputLabel>
                <Select
                  value={profile.diet_type || ''}
                  label="Тип диеты"
                  onChange={(e) => setProfile({ ...profile, diet_type: e.target.value })}
                >
                  <MenuItem value="standard">Стандартная</MenuItem>
                  <MenuItem value="vegetarian">Вегетарианская</MenuItem>
                  <MenuItem value="vegan">Веганская</MenuItem>
                  <MenuItem value="keto">Кето</MenuItem>
                  <MenuItem value="paleo">Палео</MenuItem>
                  <MenuItem value="mediterranean">Средиземноморская</MenuItem>
                  <MenuItem value="low-carb">Низкоуглеводная</MenuItem>
                  <MenuItem value="high-protein">Высокобелковая</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Приемов пищи в день"
                placeholder="4"
                value={profile.meals_per_day || ''}
                onChange={(e) => setProfile({ ...profile, meals_per_day: Number(e.target.value) })}
                helperText="Обычно: 3-6 приемов"
                InputProps={{ inputProps: { min: 1, max: 10 } }}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                🚫 Ограничения
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
                Аллергии (необязательно):
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Например: лактоза, глютен, орехи..."
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
                Продукты, которые не любите (необязательно):
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Например: грибы, морепродукты, баклажаны..."
                value={dislikesText}
                onChange={(e) => setDislikesText(e.target.value)}
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
        🍎 Настройка профиля питания
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
            bgcolor: '#51cf66',
            '&:hover': { bgcolor: '#40b857' },
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

