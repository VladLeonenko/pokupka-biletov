import React, { useState, useMemo, useEffect } from 'react';
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

  const [revenueInput, setRevenueInput] = useState(businessRevenue ? String(businessRevenue) : '');
  useEffect(() => {
    setRevenueInput(businessRevenue ? String(businessRevenue) : '');
  }, [businessRevenue]);

  const roiResult = useMemo(() => calculateROI(state), [state]);
  const smartUpsells = useMemo(
    () => getSmartUpsells(service, roiResult.totalCost, serviceConfig?.upsells),
    [service, roiResult.totalCost, serviceConfig?.upsells]
  );

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

  const handleRevenueChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    setRevenueInput(cleaned);
    setState(prev => ({ ...prev, monthlyRevenue: cleaned === '' ? 0 : parseInt(cleaned, 10) }));
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

  const handleTariffClick = (tariff: TariffType, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleTariffChange(tariff);
  };

  const handleUpsellClick = (upsellId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleUpsellToggle(upsellId);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6, overflow: 'hidden', maxWidth: '100%' }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Calculate sx={{ fontSize: '2.5rem', color: '#ffbb00' }} />
          Калькулятор стоимости
        </Typography>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          {serviceConfig.name}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            elevation={3}
            sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, overflow: 'hidden', maxWidth: '100%' }}
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
                        p: { xs: 2, md: 2.5 },
                        pt: tariff.recommended ? { xs: 3, md: 3.5 } : undefined,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: state.tariff === tariff.id ? '#ffbb00' : 'transparent',
                        transition: 'all 0.3s',
                        position: 'relative',
                        overflow: 'visible',
                        '&:hover': { borderColor: '#ffbb00', transform: 'translateY(-2px)' },
                      }}
                      onClick={(e) => handleTariffClick(tariff.id, e)}
                    >
                      {tariff.recommended && (
                        <Chip
                          label="Рекомендуем"
                          size="small"
                          icon={<Star sx={{ color: '#141414 !important', fontSize: 18 }} />}
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: 16,
                            height: 28,
                            px: 1.5,
                            background: 'linear-gradient(135deg, #ffbb00 0%, #e5a800 100%)',
                            color: '#141414',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            letterSpacing: '0.03em',
                            boxShadow: '0 4px 12px rgba(229, 168, 0, 0.4)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            '& .MuiChip-label': { px: 0.5 },
                          }}
                        />
                      )}
                      <FormControlLabel
                        value={tariff.id}
                        control={<Radio sx={{ color: '#ffbb00' }} inputProps={{ tabIndex: -1 }} />}
                        label={
                          <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            minWidth: 0,
                            ml: 1,
                            gap: 1,
                            flexWrap: { xs: 'wrap', md: 'nowrap' },
                          }}>
                            <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
                              <Typography variant="h6" fontWeight={600} sx={{ wordBreak: 'break-word' }}>{tariff.name}</Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', overflowWrap: 'break-word' }}>
                                {serviceConfig.hours[tariff.id]}ч работы
                              </Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={700} sx={{ color: '#ffbb00', flexShrink: 0 }}>
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
                      p: { xs: 1.5, md: 2 },
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: state.selectedUpsells.includes(upsell.id) ? '#e5a800' : 'transparent',
                      transition: 'all 0.3s',
                      overflow: 'hidden',
                      '&:hover': { borderColor: '#e5a800' },
                    }}
                    onClick={(e) => handleUpsellClick(upsell.id, e)}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={state.selectedUpsells.includes(upsell.id)}
                          sx={{ color: '#e5a800' }}
                          inputProps={{ tabIndex: -1 }}
                        />
                      }
                      label={
                        <Box sx={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                          <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.5,
                            gap: 1,
                            flexWrap: 'wrap',
                          }}>
                            <Typography fontWeight={600} sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{upsell.name}</Typography>
                            <Chip
                              label={upsell.recurring ? `${formatPrice(upsell.price)}/мес` : formatPrice(upsell.price)}
                              size="small"
                              sx={{ bgcolor: 'rgba(255,187,0,0.15)', color: '#ffbb00', flexShrink: 0 }}
                            />
                          </Box>
                          <Typography variant="body2" sx={{
                            color: 'rgba(255,255,255,0.5)',
                            mb: 0.5,
                            overflowWrap: 'break-word',
                            wordBreak: 'break-word',
                          }}>
                            {upsell.description}
                          </Typography>
                          {upsell.conversionBoost && (
                            <Chip
                              label={upsell.conversionBoost}
                              size="small"
                              icon={<TrendingUp />}
                              sx={{ bgcolor: 'rgba(255, 187, 0, 0.1)', color: '#e5a800', fontWeight: 600 }}
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
                type="text"
                inputMode="numeric"
                value={revenueInput}
                onChange={(e) => handleRevenueChange(e.target.value)}
                placeholder="Например: 500000"
                autoComplete="off"
                sx={{ mb: 2 }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
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
                background: 'linear-gradient(135deg, #ffbb00 0%, #e5a800 100%)',
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
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Доп. прибыль в месяц</Typography>
                    <Typography variant="h5" fontWeight={600} color="success.main">
                      +{formatPrice(roiResult.monthlyProfit)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Окупаемость</Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {formatMonths(roiResult.paybackMonths)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Прибыль за год</Typography>
                    <Typography variant="h5" fontWeight={600} sx={{ color: '#ffbb00' }}>
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
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Средняя цена на рынке:</Typography>
                    <Typography fontWeight={600}>{formatPrice(roiResult.marketComparison)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Prime Coder:</Typography>
                    <Typography fontWeight={600} sx={{ color: '#ffbb00' }}>{formatPrice(roiResult.totalCost)}</Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>Ваша экономия:</Typography>
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
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => onCalculate?.(roiResult)}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: 2,
                letterSpacing: '0.05em',
                '&:hover': { borderColor: '#ffbb00', color: '#ffbb00', bgcolor: 'rgba(255,187,0,0.05)' },
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
