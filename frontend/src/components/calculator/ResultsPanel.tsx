import React from 'react';
import { Box, Paper, Typography, Grid, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { ROIResult } from './types';
import { formatPrice } from './roiCalculator';

interface ResultsPanelProps {
  result: ROIResult;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 3,
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        💰 Итоговая стоимость
      </Typography>

      <Grid container spacing={3}>
        {/* Стоимость проекта */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              p: 3,
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <AttachMoneyIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
              Стоимость проекта
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {formatPrice(result.totalCost)}
            </Typography>
            {result.recurringCost > 0 && (
              <Typography variant="caption" sx={{ opacity: 0.8, mt: 1, display: 'block' }}>
                + {formatPrice(result.recurringCost)}/мес
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Рыночная цена */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              p: 3,
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <CompareArrowsIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
              Средняя цена на рынке
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {formatPrice(result.marketComparison)}
            </Typography>
          </Box>
        </Grid>

        {/* Экономия */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              bgcolor: 'rgba(76, 175, 80, 0.3)',
              p: 3,
              borderRadius: 2,
              textAlign: 'center',
              border: '2px solid rgba(76, 175, 80, 0.5)',
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="body2" sx={{ mb: 1 }}>
              Ваша выгода
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
              {formatPrice(result.savings)}
            </Typography>
            <Chip
              label={`${result.savingsPercent}% экономии`}
              size="small"
              sx={{
                mt: 1,
                bgcolor: 'rgba(76, 175, 80, 0.9)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          💡 Цена включает все работы "под ключ" без скрытых платежей
        </Typography>
      </Box>
    </Paper>
  );
};
