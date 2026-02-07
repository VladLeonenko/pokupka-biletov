import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  TextField,
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  Calculate,
  TrendingUp,
  Savings,
  LocalOffer,
  Star,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { serviceConfigs } from './serviceConfigs';
import { upsellsConfig, getSmartUpsells } from './upsellsConfig';
import { calculateROI, formatPrice, formatMonths } from './roiCalculator';
import { CalculatorState, TariffType } from './types';

const MotionPaper = motion.create(Paper);
const MotionCard = motion.create(Card);

interface ServiceCalculatorProps {
  service: string;
  businessRevenue?: number;
  conversionRate?: number;
  onCalculate?: (result: any) => void;
}

export const ServiceCalculator: React.FC<ServiceCalculatorProps> = ({
  service,
  businessRevenue = 500000,
  conversionRate = 0.02,
  onCalculate,
}) => {
  const serviceConfig = serviceConfigs[service];

  const [state, setState] = useState<CalculatorState>({
    service,
    tariff: 'standard',
    selectedUpsells: [],
    businessType: 'ooo',
    monthlyRevenue: businessRevenue,
    conversion: conversionRate,
  });

  const roiResult = useMemo(() => calculateROI(state), [state]);
  const smartUpsells = useMemo(() => getSmartUpsells(service, roiResult.totalCost), [service, roiResult.totalCost]);

  const handleTariffChange = (tariff: TariffType) => {
    setState(prev => ({ ...prev, tariff }));
  };

  const handleUpsellToggle = (upsellId: string) => {
    setState(prev => ({
      ...prev,
      selectedUpsells: prev.selectedUpsells.includes(upsellId)
        ? prev.selectedUpsells.filter(id => id !== upsellId)
        : [...prev.selectedUpsells, upsellId]
    }));
  };

  const handleRevenueChange = (revenue: number) => {
    setState(prev => ({ ...prev, monthlyRevenue: Math.max(100000, revenue) }));
  };

  if (!serviceConfig) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="error">Услуга не найдена</Typography>
      </Box>
    );
  }

  const tariffs = Object.entries(serviceConfig.basePrices)
    .filter(([key]) => key !== 'monthly')
    .map(([key, price]) => ({
      id: key as TariffType,
      name: key === 'basic' ? 'Базовый' : key === 'standard' ? 'Стандарт' : 'Премиум',
      price,
      recommended: key === 'standard',
    }));

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Calculate sx={{ fontSize: '2.5rem', color: '#667eea' }} />
          Калькулятор стоимости
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {serviceConfig.name}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            elevation={3}
            sx={{ p: 4, borderRadius: 3 }}
          >
            <Box sx={{ mb: 4 }}>
              <FormLabel sx={{ mb: 2, display: 'block', fontWeight: 600, fontSize: '1.1rem' }}>
                Выберите тариф
              </FormLabel>
              <RadioGroup
                value={state.tariff}
                onChange={(e) => handleTariffChange(e.target.value as TariffType)}
              >
                <Stack spacing={2}>
                  {tariffs.map((tariff) => (
                    <Paper
                      key={tariff.id}
                      elevation={state.tariff === tariff.id ? 8 : 1}
                      sx={{
                        p: 2.5,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: state.tariff === tariff.id ? '#667eea' : 'transparent',
                        transition: 'all 0.3s',
                        position: 'relative',
                        '&:hover': { borderColor: '#667eea', transform: 'translateY(-2px)' },
                      }}
                      onClick={() => handleTariffChange(tariff.id)}
                    >
                      {tariff.recommended && (
                        <Chip
                          label="Рекомендуем"
                          size="small"
                          icon={<Star />}
                          sx={{
                            position: 'absolute',
                            top: -12,
                            right: 16,
                            bgcolor: '#667eea',
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      )}
                      <FormControlLabel
                        value={tariff.id}
                        control={<Radio sx={{ color: '#667eea' }} />}
                        label={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', ml: 1 }}>
                            <Box>
                              <Typography variant="h6" fontWeight={600}>{tariff.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {serviceConfig.hours[tariff.id]}ч работы
                              </Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={700} color="primary">
                              {formatPrice(tariff.price)}
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0, width: '100%' }}
                      />
                    </Paper>
                  ))}
                </Stack>
              </RadioGroup>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Box>
              <FormLabel sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, fontSize: '1.1rem' }}>
                <LocalOffer /> Дополнительные опции
              </FormLabel>
              <Stack spacing={2}>
                {smartUpsells.map((upsell) => (
                  <Paper
                    key={upsell.id}
                    elevation={state.selectedUpsells.includes(upsell.id) ? 6 : 1}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: state.selectedUpsells.includes(upsell.id) ? '#764ba2' : 'transparent',
                      transition: 'all 0.3s',
                      '&:hover': { borderColor: '#764ba2' },
                    }}
                    onClick={() => handleUpsellToggle(upsell.id)}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={state.selectedUpsells.includes(upsell.id)}
                          sx={{ color: '#764ba2' }}
                        />
                      }
                      label={
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography fontWeight={600}>{upsell.name}</Typography>
                            <Chip
                              label={upsell.recurring ? `${formatPrice(upsell.price)}/мес` : formatPrice(upsell.price)}
                              size="small"
                              color="secondary"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {upsell.description}
                          </Typography>
                          {upsell.conversionBoost && (
                            <Chip
                              label={upsell.conversionBoost}
                              size="small"
                              icon={<TrendingUp />}
                              sx={{ bgcolor: 'rgba(118, 75, 162, 0.1)', color: '#764ba2', fontWeight: 600 }}
                            />
                          )}
                        </Box>
                      }
                      sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                    />
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Box>
              <FormLabel sx={{ mb: 2, display: 'block', fontWeight: 600, fontSize: '1.1rem' }}>
                Ваши данные для расчёта окупаемости
              </FormLabel>
              <TextField
                fullWidth
                label="Текущая выручка в месяц, ₽"
                type="number"
                value={state.monthlyRevenue}
                onChange={(e) => handleRevenueChange(parseInt(e.target.value))}
                sx={{ mb: 2 }}
              />
              <Typography variant="caption" color="text.secondary">
                * Укажите примерную выручку для расчёта окупаемости
              </Typography>
            </Box>
          </MotionPaper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            <MotionCard
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Calculate /> Итоговая стоимость
                </Typography>
                <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
                  {formatPrice(roiResult.totalCost)}
                </Typography>
                {roiResult.recurringCost > 0 && (
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    + {formatPrice(roiResult.recurringCost)}/мес поддержка
                  </Typography>
                )}
              </CardContent>
            </MotionCard>

            <MotionCard
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp color="success" /> Выгода для бизнеса
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Доп. прибыль в месяц</Typography>
                    <Typography variant="h5" fontWeight={600} color="success.main">
                      +{formatPrice(roiResult.monthlyProfit)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Окупаемость</Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {formatMonths(roiResult.paybackMonths)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Прибыль за год</Typography>
                    <Typography variant="h5" fontWeight={600} color="primary">
                      +{formatPrice(roiResult.yearlyProfit)}
                    </Typography>
                  </Box>
                  {/* ❌ УДАЛЁН БЛОК С ROI */}
                </Stack>
              </CardContent>
            </MotionCard>

            <MotionCard
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Savings color="warning" /> Сравнение с рынком
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Средняя цена на рынке:</Typography>
                    <Typography fontWeight={600}>{formatPrice(roiResult.marketComparison)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Prime Coder:</Typography>
                    <Typography fontWeight={600} color="primary">{formatPrice(roiResult.totalCost)}</Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ваша экономия:</Typography>
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {formatPrice(roiResult.savings)}
                    </Typography>
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      (минус {roiResult.savingsPercent}% от рынка)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={100 - roiResult.savingsPercent}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: 'success.main' }
                    }}
                  />
                </Stack>
              </CardContent>
            </MotionCard>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => onCalculate?.(roiResult)}
              sx={{
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              Получить коммерческое предложение
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};
