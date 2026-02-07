export type ServiceType = 
  | 'razrabotka-sajta-na-tilda'
  | 'sajt-na-wordpress'
  | 'internet-magazin'
  | 'sajt-na-1s-bitriks'
  | 'sajt-vizitka'
  | 'landing-page'
  | 'korporativnyj-sajt'
  | 'ui-ux-dizajn'
  | 'seo-prodvizhenie'
  | 'ai-prodvizhenie'
  | 'marketing-prodazhi'
  | 'reklama-u-blogerov'
  | 'autsorsing-digital-agentstvo';

export type TariffType = 'basic' | 'standard' | 'premium';
export type Tariff = TariffType;

export interface ServiceConfig {
  name: string;
  basePrices: {
    basic?: number;
    standard?: number;
    premium?: number;
    monthly?: number;
  };
  marketAvg: number;
  hours: {
    basic?: number;
    standard?: number;
    premium?: number;
  };
  roiMultiplier: number;
  recurring?: boolean;
  complexity?: 'low' | 'medium' | 'high';
  upsells: string[];
}

export interface Upsell {
  id: string;
  name: string;
  description: string;
  price: number;
  recurring?: boolean;
  icon: string;
  category: 'marketing' | 'tech' | 'support';
  applicableTo?: ServiceType[];
  conversionBoost?: string;
}

export interface CalculatorState {
  service: ServiceType;
  tariff: TariffType;
  selectedUpsells: string[];
  businessType?: string;
  monthlyRevenue: number;
  conversion?: number;
}

export interface ROIResult {
  totalCost: number;
  recurringCost: number;
  monthlyProfit: number;
  paybackMonths: number;
  yearlyProfit: number;
  totalROI: number;
  marketComparison: number;
  savings: number;
  savingsPercent: number;
}
