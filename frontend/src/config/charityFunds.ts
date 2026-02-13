/** Фонды для благотворительности — общий конфиг */
export const CHARITY_FUNDS = [
  { id: 'podari-zhizn', name: 'Подари жизнь' },
  { id: 'rusfond', name: 'Русфонд' },
  { id: 'starost', name: 'Старость в радость' },
  { id: 'khabenskiy', name: 'Фонд Хабенского' },
  { id: 'avz', name: 'АВЗ — Зоозащита' },
  { id: 'donate-stream', name: 'Donate.Stream' },
  { id: 'nochlezhka', name: 'Ночлежка' },
  { id: 'zhizn', name: 'Жизнь как чудо' },
  { id: 'adresmilk', name: 'Адреса милосердия' },
] as const;

export const CHARITY_FUND_NAMES: Record<string, string> = Object.fromEntries(
  CHARITY_FUNDS.map((f) => [f.id, f.name])
);
