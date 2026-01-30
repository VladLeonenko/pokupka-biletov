import { useState } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  Paper,
  InputAdornment,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { saveFinanceProfile } from '@/services/plannerApi';
import type { FinanceProfile } from '@/types/planner';
import { useToast } from '@/components/common/ToastProvider';

interface FinanceOnboardingProps {
  onComplete: () => void;
}

export function FinanceOnboarding({ onComplete }: FinanceOnboardingProps) {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [profile, setProfile] = useState<FinanceProfile>({
    expense_categories: [],
  });
  
  // Локальное состояние для текстового поля категорий
  const [expenseCategoriesText, setExpenseCategoriesText] = useState('');

  const saveMutation = useMutation({
    mutationFn: saveFinanceProfile,
    onSuccess: () => {
      showToast('Финансовый профиль сохранен!', 'success');
      onComplete();
    },
  });

  const steps = ['Доходы и бюджет', 'Финансовые цели'];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Перед сохранением парсим категории расходов
      const lines = expenseCategoriesText.split('\n').filter(Boolean);
      const categories = lines.map(line => {
        const parts = line.split('-').map(s => s.trim());
        return {
          name: parts[0] || '',
          budget: parseFloat(parts[1]?.replace(/[^\d.]/g, '') || '0'),
        };
      });
      
      const finalProfile = {
        ...profile,
        expense_categories: categories.length > 0 ? categories : undefined,
      };
      
      saveMutation.mutate(finalProfile);
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                💰 Ваши доходы и расходы
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Ежемесячный доход"
                placeholder="150000"
                value={profile.monthly_income || ''}
                onChange={(e) => setProfile({ ...profile, monthly_income: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                  inputProps: { min: 0, max: 10000000 },
                }}
                helperText="Суммарный доход из всех источников"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(32, 201, 151, 0.08)',
                    '& fieldset': {
                      borderColor: 'rgba(32, 201, 151, 0.3)',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#20c997',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#20c997',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#20c997',
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Ежемесячный бюджет"
                placeholder="120000"
                value={profile.monthly_budget || ''}
                onChange={(e) => setProfile({ ...profile, monthly_budget: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                  inputProps: { min: 0, max: 10000000 },
                }}
                helperText="Сумма, которую планируете тратить"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 193, 7, 0.08)',
                    '& fieldset': {
                      borderColor: 'rgba(255, 193, 7, 0.3)',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#ffc107',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ffc107',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#ffc107',
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
                Категории расходов (необязательно):
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                placeholder="Например:&#10;Продукты - 30000₽&#10;Жилье - 40000₽&#10;Транспорт - 10000₽&#10;Развлечения - 15000₽&#10;Здоровье - 5000₽"
                value={expenseCategoriesText}
                onChange={(e) => setExpenseCategoriesText(e.target.value)}
                helperText="Формат: Название - Сумма₽ (каждая категория с новой строки)"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(156, 39, 176, 0.08)',
                    '& fieldset': {
                      borderColor: 'rgba(156, 39, 176, 0.3)',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#9c27b0',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#9c27b0',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#9c27b0',
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                }}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
                🎯 Финансовые цели
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Цель по накоплениям"
                placeholder="500000"
                value={profile.savings_goal || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  savings_goal: Number(e.target.value) 
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                  inputProps: { min: 0, max: 100000000 },
                }}
                helperText="Сколько хотите накопить"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(33, 150, 243, 0.08)',
                    '& fieldset': {
                      borderColor: 'rgba(33, 150, 243, 0.3)',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#2196f3',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2196f3',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#2196f3',
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Цель по инвестициям"
                placeholder="200000"
                value={profile.investment_goal || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  investment_goal: Number(e.target.value) 
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                  inputProps: { min: 0, max: 100000000 },
                }}
                helperText="Сколько планируете инвестировать"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 87, 34, 0.08)',
                    '& fieldset': {
                      borderColor: 'rgba(255, 87, 34, 0.3)',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#ff5722',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ff5722',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#ff5722',
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Paper 
                sx={{ 
                  p: 3, 
                  background: 'linear-gradient(135deg, rgba(32, 201, 151, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)',
                  border: '2px solid',
                  borderColor: '#20c997',
                  borderRadius: 3,
                  boxShadow: '0 8px 24px rgba(32, 201, 151, 0.2)',
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#20c997', 
                    mb: 1.5, 
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>💡</span>
                  Совет эксперта
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.95)',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                  }}
                >
                  Правило 50/30/20: 50% дохода на обязательные расходы, 30% на желания, 20% на накопления и инвестиции.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography 
        variant="h5" 
        sx={{ 
          color: '#ffffff', 
          mb: 3, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #20c997 0%, #0ea5e9 50%, #9c27b0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          fontSize: '2rem',
        }}
      >
        💰 Настройка финансового профиля
      </Typography>

      <Stepper 
        activeStep={activeStep} 
        sx={{ 
          mb: 4,
          '& .MuiStepConnector-line': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderTopWidth: 3,
          },
          '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
            borderColor: '#20c997',
          },
          '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
            borderColor: '#20c997',
          },
        }}
      >
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel
              sx={{
                '& .MuiStepLabel-label': { 
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 500,
                },
                '& .Mui-active': { 
                  color: '#ffffff !important',
                  fontWeight: 600,
                },
                '& .Mui-completed': { 
                  color: '#20c997 !important',
                  fontWeight: 600,
                },
                '& .MuiStepIcon-root': {
                  color: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '2rem',
                },
                '& .MuiStepIcon-root.Mui-active': {
                  color: '#20c997',
                  transform: 'scale(1.2)',
                  transition: 'all 0.3s ease',
                },
                '& .MuiStepIcon-root.Mui-completed': {
                  color: '#20c997',
                },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper 
        sx={{ 
          p: 3, 
          bgcolor: 'rgba(255,255,255,0.05)', 
          mb: 3,
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {renderStep()}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          sx={{
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            border: '2px solid',
            px: 3,
            py: 1,
            '&:hover': {
              borderColor: '#ffffff',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
            },
            '&:disabled': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          ← Назад
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={saveMutation.isPending}
          sx={{
            bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            background: 'linear-gradient(135deg, #20c997 0%, #0ea5e9 100%)',
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(32, 201, 151, 0.4)',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #12b886 0%, #0284c7 100%)',
              boxShadow: '0 12px 32px rgba(32, 201, 151, 0.6)',
              transform: 'translateY(-2px)',
            },
            '&:disabled': {
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.4)',
            },
          }}
        >
          {activeStep === steps.length - 1 
            ? (saveMutation.isPending ? '⏳ Сохранение...' : '✅ Завершить')
            : '➡️ Далее'}
        </Button>
      </Box>
    </Box>
  );
}

