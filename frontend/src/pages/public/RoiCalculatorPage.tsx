import { useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, Paper, Alert, Divider } from '@mui/material';
import { Calculate as CalculateIcon } from '@mui/icons-material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';

interface RoiResult {
  revenue: number;
  investment: number;
  profit: number;
  roi: number;
  roiPercentage: number;
  paybackPeriod: number;
}

export function RoiCalculatorPage() {
  const [campaignName, setCampaignName] = useState('');
  const [revenue, setRevenue] = useState('');
  const [investment, setInvestment] = useState('');
  const [duration, setDuration] = useState('1'); // в месяцах
  const [result, setResult] = useState<RoiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateROI = () => {
    const revenueNum = parseFloat(revenue);
    const investmentNum = parseFloat(investment);
    const durationNum = parseFloat(duration);

    if (!revenueNum || !investmentNum || !durationNum || investmentNum <= 0) {
      setError('Заполните все поля корректно');
      return;
    }

    const profit = revenueNum - investmentNum;
    const roi = profit / investmentNum;
    const roiPercentage = roi * 100;
    const paybackPeriod = investmentNum > 0 && revenueNum > 0 
      ? (investmentNum / (revenueNum / durationNum))
      : 0;

    setResult({
      revenue: revenueNum,
      investment: investmentNum,
      profit,
      roi,
      roiPercentage,
      paybackPeriod: Math.max(0, paybackPeriod)
    });
    setError(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Калькулятор ROI - Primecoder"
        description="Калькулятор возврата инвестиций для рекламных кампаний"
        url={currentUrl}
      />
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Прогноз бюджета и окупаемости</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Калькулятор ROI (возврат инвестиций) для рекламных кампаний
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Параметры кампании</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Название кампании"
                      placeholder="Например: Яндекс.Директ - Январь 2024"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Выручка (₽)"
                      placeholder="0"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      variant="outlined"
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Инвестиции / Расходы (₽)"
                      placeholder="0"
                      value={investment}
                      onChange={(e) => setInvestment(e.target.value)}
                      variant="outlined"
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Период (месяцы)"
                      placeholder="1"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      variant="outlined"
                      inputProps={{ min: 0.1, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<CalculateIcon />}
                      onClick={calculateROI}
                      fullWidth
                    >
                      Рассчитать ROI
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {result && (
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {campaignName || 'Результаты расчета'}
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h3" color={result.roiPercentage >= 0 ? 'success.main' : 'error.main'}>
                      {result.roiPercentage.toFixed(2)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ROI (Возврат инвестиций)
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>Выручка</Typography>
                        <Typography variant="h6">{formatCurrency(result.revenue)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>Инвестиции</Typography>
                        <Typography variant="h6">{formatCurrency(result.investment)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: result.profit >= 0 ? 'success.light' : 'error.light' }}>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>Прибыль</Typography>
                        <Typography variant="h6" color={result.profit >= 0 ? 'success.dark' : 'error.dark'}>
                          {formatCurrency(result.profit)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.200' }}>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>Окупаемость</Typography>
                        <Typography variant="h6">
                          {result.paybackPeriod.toFixed(1)} мес.
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Alert severity={result.roiPercentage >= 100 ? 'success' : result.roiPercentage >= 0 ? 'info' : 'warning'}>
                    {result.roiPercentage >= 100 
                      ? 'Отличный результат! Кампания очень прибыльна.'
                      : result.roiPercentage >= 0
                      ? 'Кампания прибыльна, но можно улучшить показатели.'
                      : 'Кампания убыточна. Необходимо пересмотреть стратегию.'}
                  </Alert>
                </CardContent>
              </Card>
            )}

            {!result && !error && (
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Заполните параметры кампании и нажмите "Рассчитать ROI"
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Box>
      <style>{`
        /* Стили для меню - скрыто по умолчанию */
        .menu {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          opacity: 0 !important;
          visibility: hidden !important;
          z-index: 50 !important;
          pointer-events: none !important;
          transition: opacity 0.3s ease, visibility 0.3s ease !important;
        }

        #burger-toggle:checked ~ .menu {
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          z-index: 52 !important;
        }

        body {
          position: relative !important;
        }
      `}</style>
    </>
  );
}

