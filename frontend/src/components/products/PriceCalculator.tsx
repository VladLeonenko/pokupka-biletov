import { useState, useMemo } from 'react';
import { Box, Typography, Paper, Slider, FormControl, InputLabel, Select, MenuItem, Button, Grid, Card, CardContent, Chip } from '@mui/material';
import { Calculate, TrendingUp } from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionCard = motion.create(Card);

interface PriceCalculatorProps {
  basePrice: number; // Базовая цена в копейках
  productSlug: string;
  onCalculate?: (price: number) => void;
}

interface CalculatorOption {
  id: string;
  label: string;
  multiplier: number; // Множитель цены (1.0 = без изменений, 1.2 = +20%)
  description?: string;
}

const defaultOptions: CalculatorOption[] = [
  { id: 'pages', label: 'Количество страниц', multiplier: 1.0, description: 'Базовое количество' },
  { id: 'design', label: 'Уровень дизайна', multiplier: 1.0, description: 'Стандартный' },
  { id: 'features', label: 'Дополнительные функции', multiplier: 1.0, description: 'Базовый набор' },
  { id: 'support', label: 'Срок поддержки', multiplier: 1.0, description: '1 месяц' },
];

export function PriceCalculator({ basePrice, productSlug, onCalculate }: PriceCalculatorProps) {
  const [options, setOptions] = useState<Record<string, number>>({
    pages: 5,
    design: 1,
    features: 0,
    support: 1,
  });

  const calculatorOptions: CalculatorOption[] = useMemo(() => {
    // Настройки для разных типов продуктов
    if (productSlug.includes('korporativnyj') || productSlug.includes('corporate')) {
      return [
        { id: 'pages', label: 'Количество страниц', multiplier: 1.0, description: '5-10 страниц' },
        { id: 'design', label: 'Уровень дизайна', multiplier: 1.0, description: 'Стандартный' },
        { id: 'features', label: 'Дополнительные функции', multiplier: 1.0, description: 'Базовый набор' },
        { id: 'support', label: 'Срок поддержки', multiplier: 1.0, description: '1 месяц' },
      ];
    }
    if (productSlug.includes('internet-magazin') || productSlug.includes('shop')) {
      return [
        { id: 'products', label: 'Количество товаров', multiplier: 1.0, description: 'До 50 товаров' },
        { id: 'design', label: 'Уровень дизайна', multiplier: 1.0, description: 'Стандартный' },
        { id: 'integration', label: 'Интеграции', multiplier: 1.0, description: 'Базовые' },
        { id: 'support', label: 'Срок поддержки', multiplier: 1.0, description: '1 месяц' },
      ];
    }
    return defaultOptions;
  }, [productSlug]);

  const calculatedPrice = useMemo(() => {
    let price = basePrice;
    
    // Применяем множители для каждой опции
    calculatorOptions.forEach((option) => {
      const value = options[option.id] || 0;
      if (option.id === 'pages' || option.id === 'products') {
        // Для страниц/товаров: каждая дополнительная единица = +10%
        const extra = Math.max(0, value - 5);
        price += (basePrice * 0.1 * extra);
      } else if (option.id === 'design') {
        // Уровень дизайна: 1=базовый, 2=стандартный (+30%), 3=премиум (+60%)
        if (value === 2) price += basePrice * 0.3;
        if (value === 3) price += basePrice * 0.6;
      } else if (option.id === 'features') {
        // Дополнительные функции: каждая = +15%
        price += basePrice * 0.15 * value;
      } else if (option.id === 'support') {
        // Поддержка: 1 месяц = базово, 3 месяца = +20%, 6 месяцев = +40%
        if (value === 2) price += basePrice * 0.2;
        if (value === 3) price += basePrice * 0.4;
      } else if (option.id === 'integration') {
        // Интеграции: каждая = +25%
        price += basePrice * 0.25 * value;
      }
    });

    return Math.round(price);
  }, [basePrice, options, calculatorOptions]);

  const handleOptionChange = (id: string, value: number) => {
    setOptions((prev) => ({ ...prev, [id]: value }));
  };

  const formatPrice = (cents: number) => {
    const rubles = Math.round(cents / 100);
    return `${rubles.toLocaleString('ru-RU')} ₽`;
  };

  const handleCalculate = () => {
    if (onCalculate) {
      onCalculate(calculatedPrice);
    }
  };

  return (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      sx={{ p: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Calculate sx={{ mr: 1, fontSize: 32 }} />
        <Typography variant="h5" fontWeight="bold">
          Калькулятор стоимости
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {calculatorOptions.map((option) => (
          <Grid item xs={12} sm={6} key={option.id}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                {option.label}
              </Typography>
              {option.id === 'pages' || option.id === 'products' ? (
                <Slider
                  value={options[option.id] || 5}
                  onChange={(_, value) => handleOptionChange(option.id, value as number)}
                  min={5}
                  max={50}
                  step={5}
                  marks
                  valueLabelDisplay="auto"
                  sx={{ color: 'white' }}
                />
              ) : option.id === 'design' ? (
                <FormControl fullWidth size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                  <Select
                    value={options[option.id] || 1}
                    onChange={(e) => handleOptionChange(option.id, e.target.value as number)}
                    sx={{ color: 'white', '& .MuiSelect-icon': { color: 'white' } }}
                  >
                    <MenuItem value={1}>Базовый</MenuItem>
                    <MenuItem value={2}>Стандартный (+30%)</MenuItem>
                    <MenuItem value={3}>Премиум (+60%)</MenuItem>
                  </Select>
                </FormControl>
              ) : option.id === 'support' ? (
                <FormControl fullWidth size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                  <Select
                    value={options[option.id] || 1}
                    onChange={(e) => handleOptionChange(option.id, e.target.value as number)}
                    sx={{ color: 'white', '& .MuiSelect-icon': { color: 'white' } }}
                  >
                    <MenuItem value={1}>1 месяц</MenuItem>
                    <MenuItem value={2}>3 месяца (+20%)</MenuItem>
                    <MenuItem value={3}>6 месяцев (+40%)</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Slider
                  value={options[option.id] || 0}
                  onChange={(_, value) => handleOptionChange(option.id, value as number)}
                  min={0}
                  max={5}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  sx={{ color: 'white' }}
                />
              )}
              {option.description && (
                <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.7 }}>
                  {option.description}
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Итоговая стоимость:</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp />
            <Typography variant="h4" fontWeight="bold">
              {formatPrice(calculatedPrice)}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleCalculate}
          sx={{
            bgcolor: 'white',
            color: '#667eea',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            fontWeight: 'bold',
          }}
        >
          Получить коммерческое предложение
        </Button>
      </Box>
    </MotionCard>
  );
}
