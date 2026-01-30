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
import { saveEducationProfile } from '@/services/plannerApi';
import type { EducationProfile } from '@/types/planner';
import { useToast } from '@/components/common/ToastProvider';

interface EducationOnboardingProps {
  onComplete: () => void;
}

export function EducationOnboarding({ onComplete }: EducationOnboardingProps) {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [profile, setProfile] = useState<EducationProfile>({
    areas_of_interest: [],
    current_skills: [],
    target_skills: [],
    preferred_formats: [],
  });
  
  // Локальные состояния для текстовых полей
  const [currentSkillsText, setCurrentSkillsText] = useState('');
  const [targetSkillsText, setTargetSkillsText] = useState('');

  const saveMutation = useMutation({
    mutationFn: saveEducationProfile,
    onSuccess: () => {
      showToast('Профиль образования сохранен!', 'success');
      onComplete();
    },
  });

  const steps = ['Интересы', 'Навыки', 'Цели обучения'];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Перед сохранением разбиваем текстовые поля на массивы
      const finalProfile = {
        ...profile,
        current_skills: currentSkillsText ? currentSkillsText.split('\n').map(s => s.trim()).filter(Boolean) : [],
        target_skills: targetSkillsText ? targetSkillsText.split('\n').map(s => s.trim()).filter(Boolean) : [],
      };
      saveMutation.mutate(finalProfile);
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const toggleArrayItem = (key: keyof EducationProfile, value: string) => {
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
                🎓 Области интересов
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                Выберите темы, которые вас интересуют:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {[
                  'Программирование',
                  'Дизайн',
                  'Маркетинг',
                  'Бизнес',
                  'Финансы',
                  'Языки',
                  'Наука',
                  'Искусство',
                  'Музыка',
                  'Фотография',
                  'Видеомонтаж',
                  'Data Science',
                  'AI/ML',
                  'Криптовалюты',
                  'Психология',
                  'Лидерство',
                ].map((interest) => {
                  const isSelected = (profile.areas_of_interest || []).includes(interest);
                  return (
                    <Chip
                      key={interest}
                      label={interest}
                      onClick={() => toggleArrayItem('areas_of_interest', interest)}
                      icon={isSelected ? <CheckIcon sx={{ color: '#ffffff !important' }} /> : undefined}
                      sx={{
                        bgcolor: isSelected
                          ? '#4c6ef5'
                          : 'rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        border: isSelected 
                          ? '2px solid #4c6ef5' 
                          : '2px solid transparent',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.9rem',
                        height: '36px',
                        '&:hover': {
                          bgcolor: isSelected
                            ? '#3b5bdb'
                            : 'rgba(255,255,255,0.2)',
                          border: isSelected 
                            ? '2px solid #3b5bdb' 
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
                Предпочитаемые форматы обучения:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  'Видеокурсы',
                  'Книги',
                  'Статьи',
                  'Подкасты',
                  'Интерактивные платформы',
                  'Менторство',
                  'Вебинары',
                  'Практика',
                ].map((format) => {
                  const isSelected = (profile.preferred_formats || []).includes(format);
                  return (
                    <Chip
                      key={format}
                      label={format}
                      onClick={() => toggleArrayItem('preferred_formats', format)}
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
                        '&:hover': {
                          bgcolor: isSelected
                            ? '#5568d3'
                            : 'rgba(255,255,255,0.2)',
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
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                💼 Текущие навыки
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                Что вы уже умеете?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Например: JavaScript, React, Adobe Photoshop, Английский B2..."
                value={currentSkillsText}
                onChange={(e) => setCurrentSkillsText(e.target.value)}
                helperText="Каждый навык с новой строки"
                sx={{ mb: 3 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                🎯 Целевые навыки
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                Что хотите освоить?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Например: TypeScript, Node.js, UI/UX дизайн, Немецкий язык..."
                value={targetSkillsText}
                onChange={(e) => setTargetSkillsText(e.target.value)}
                helperText="Каждый навык с новой строки"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
                📚 Цели обучения
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Часов обучения в неделю"
                placeholder="10"
                value={profile.hours_per_week || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  hours_per_week: Number(e.target.value) 
                })}
                helperText="Рекомендация: 5-15 часов в неделю"
                InputProps={{ inputProps: { min: 1, max: 100 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
                Ваши учебные цели:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                placeholder="Например: Стать фулстек разработчиком за год, освоить нейросети для работы, выучить испанский до уровня B1..."
                value={profile.learning_goals || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  learning_goals: e.target.value
                })}
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
        📚 Настройка профиля образования
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
            bgcolor: '#4c6ef5',
            '&:hover': { bgcolor: '#3b5bdb' },
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

