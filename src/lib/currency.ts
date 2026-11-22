import type { CurrencyCode, CurrencyConfig } from '../shared/types.ts';

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  MAD: { code: 'MAD', label: 'Dirham marocain (MAD)', symbol: 'MAD', rateFromEur: 10.82, decimals: 2 },
  EUR: { code: 'EUR', label: 'Euro (EUR)', symbol: '€', rateFromEur: 1.0, decimals: 2 },
  USD: { code: 'USD', label: 'Dollar US (USD)', symbol: '$', rateFromEur: 1.09, decimals: 2 },
  GBP: { code: 'GBP', label: 'Livre sterling (GBP)', symbol: '£', rateFromEur: 0.85, decimals: 2 },
  CAD: { code: 'CAD', label: 'Dollar canadien (CAD)', symbol: 'CAD', rateFromEur: 1.49, decimals: 2 },
  XOF: { code: 'XOF', label: 'Franc CFA (XOF)', symbol: 'CFA', rateFromEur: 655.96, decimals: 0 },
};

export function getCurrencyList(): CurrencyConfig[] {
  return Object.values(CURRENCIES);
}

export const CURRENCY_LIST: CurrencyConfig[] = Object.values(CURRENCIES);

export function applyLiveRates(rates: Partial<Record<CurrencyCode, number>>): void {
  (Object.keys(CURRENCIES) as CurrencyCode[]).forEach((code) => {
    const incoming = rates[code];
    if (typeof incoming === 'number' && Number.isFinite(incoming) && incoming > 0) {
      CURRENCIES[code].rateFromEur = Number(incoming.toFixed(4));
    }
  });
}

export function convertFromEur(amountEur: number, currency: CurrencyCode): number {
  const cfg = CURRENCIES[currency];
  return Number(amountEur) * cfg.rateFromEur;
}

export function formatMoney(amountEur: number, currency: CurrencyCode): string {
  const cfg = CURRENCIES[currency];
  const converted = convertFromEur(amountEur, currency);
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(converted);

  if (cfg.code === 'USD' || cfg.code === 'GBP') {
    return `${cfg.symbol}${formatted}`;
  }
  return `${formatted} ${cfg.symbol}`;
}

export function formatEurReference(amountEur: number): string {
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amountEur))} €`;
}
