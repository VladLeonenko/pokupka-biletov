import { serviceConfigs } from './serviceConfigs';
import { upsellsConfig } from './upsellsConfig';
import { ROIResult, CalculatorState } from './types';

export const calculateROI = (state: CalculatorState): ROIResult => {
  const service = serviceConfigs[state.service];
  if (!service) {
    throw new Error(`Service ${state.service} not found`);
  }

  const tariffPrice = service.basePrices[state.tariff] || service.basePrices.monthly || 0;

  const upsellsTotal = state.selectedUpsells.reduce((sum, upsellId) => {
    const upsell = upsellsConfig.find(u => u.id === upsellId);
    return sum + (upsell?.price || 0);
  }, 0);

  const recurringCost = state.selectedUpsells.reduce((sum, upsellId) => {
    const upsell = upsellsConfig.find(u => u.id === upsellId);
    return sum + (upsell?.recurring ? upsell.price : 0);
  }, 0) + (service.recurring ? tariffPrice : 0);

  const totalCost = tariffPrice + upsellsTotal;

  // 🎯 ПРЕМИУМ ТАРИФ ДАЁТ БОЛЬШЕ ПРЕИМУЩЕСТВ
  const tariffMultipliers = {
    basic: 1.0,      // Базовый - стандартная конверсия
    standard: 1.35,  // Стандарт - +35% эффективность
    premium: 1.85,   // 🔥 Премиум - +85% эффективность
  };

  const tariffBonus = tariffMultipliers[state.tariff] || 1.0;

  // Базовый прирост трафика
  let trafficBoost = 0.3 * tariffBonus;
  let conversionBoost = 1.0 * tariffBonus;
  
  // Добавляем бонусы от апселлов
  state.selectedUpsells.forEach(upsellId => {
    const upsell = upsellsConfig.find(u => u.id === upsellId);
    if (upsell?.conversionBoost?.includes('трафика')) {
      const match = upsell.conversionBoost.match(/\+(\d+)%/);
      if (match) {
        trafficBoost += parseInt(match[1]) / 100;
      }
    }
    if (upsell?.conversionBoost?.includes('конверсия')) {
      const match = upsell.conversionBoost.match(/\+(\d+)%/);
      if (match) {
        conversionBoost += parseInt(match[1]) / 100;
      }
    }
  });

  const monthlyProfit = state.monthlyRevenue * trafficBoost * conversionBoost;
  const paybackMonths = totalCost / monthlyProfit;
  const yearlyProfit = (monthlyProfit * 12) - (recurringCost * 12);
  const totalROI = Math.round((yearlyProfit / totalCost) * 100);

  // Рыночное сравнение
  const marketComparison = service.marketAvg;
  const savings = marketComparison - totalCost;
  const savingsPercent = Math.round((savings / marketComparison) * 100);

  return {
    totalCost,
    recurringCost,
    monthlyProfit: Math.round(monthlyProfit),
    paybackMonths: Math.round(paybackMonths * 10) / 10,
    yearlyProfit: Math.round(yearlyProfit),
    totalROI,
    marketComparison,
    savings: Math.max(0, savings),
    savingsPercent: Math.max(0, savingsPercent)
  };
};

export const formatPrice = (price: number): string => {
  if (!price || isNaN(price)) return '0 ₽';
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}млн ₽`;
  }
  return `${price.toLocaleString('ru-RU')} ₽`;
};

export const formatMonths = (months: number): string => {
  if (!months || isNaN(months)) return 'не определено';
  if (months < 1) return 'менее месяца';
  if (months === 1) return '1 месяц';
  if (months < 5) return `${Math.round(months)} месяца`;
  return `${Math.round(months)} месяцев`;
};
