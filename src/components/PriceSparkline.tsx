import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, YAxis } from 'recharts';
import type { CurrencyCode, Product } from '../shared/types.ts';
import { CURRENCIES, convertFromEur, formatMoney } from '../lib/currency.ts';

interface PriceSparklineProps {
  product: Product;
  currency: CurrencyCode;
}

interface SparkPoint {
  day: string;
  priceEur: number;
  priceConverted: number;
}

export const PriceSparkline: React.FC<PriceSparklineProps> = ({ product, currency }) => {
  const decimals = CURRENCIES[currency].decimals;

  const { points, deltaPct, isDrop } = useMemo(() => {
    const endPrice = Number(product.price_eur);
    const anchorStart = product.old_eur
      ? Number(product.old_eur) * 0.86
      : endPrice * 1.12;

    const totalDays = 30;
    const series: SparkPoint[] = [];
    const today = new Date();

    for (let i = 0; i < totalDays; i++) {
      const progress = i / (totalDays - 1);
      const d = new Date(today);
      d.setDate(today.getDate() - (totalDays - 1 - i));

      // Deterministic smooth wave seeded by product.id
      const seedPhase = product.id * 1.73;
      const wave =
        Math.sin(i * 0.55 + seedPhase) * 0.035 +
        Math.cos(i * 0.28 + seedPhase * 0.5) * 0.02;

      const interpolated =
        i === totalDays - 1
          ? endPrice
          : (anchorStart + (endPrice - anchorStart) * progress) * (1 + wave * (1 - progress * 0.6));

      const priceEur = Number(Math.max(1, interpolated).toFixed(2));
      series.push({
        day: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        priceEur,
        priceConverted: Number(convertFromEur(priceEur, currency).toFixed(decimals)),
      });
    }

    const first = series[0]?.priceEur || endPrice;
    const pct = first > 0 ? ((endPrice - first) / first) * 100 : 0;

    return {
      points: series,
      deltaPct: pct,
      isDrop: pct <= 0,
    };
  }, [product.id, product.price_eur, product.old_eur, currency, decimals]);

  const strokeColor = isDrop ? '#059669' : '#D97706';
  const gradientId = `spark-${product.id}`;

  return (
    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500 font-medium">Évolution prix · 30j</span>
        <span
          className={`font-mono tabular-nums font-semibold ${
            isDrop ? 'text-emerald-700' : 'text-amber-700'
          }`}
        >
          {deltaPct > 0 ? '+' : ''}
          {deltaPct.toFixed(1)}%
        </span>
      </div>

      <div className="h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.22} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <YAxis domain={['dataMin', 'dataMax']} hide />
            <Tooltip
              cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0].payload as SparkPoint;
                return (
                  <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-md text-[11px] shadow-md flex items-center gap-2 whitespace-nowrap">
                    <span className="text-slate-300">{pt.day}</span>
                    <span className="font-mono tabular-nums font-bold">
                      {formatMoney(pt.priceEur, currency)}
                    </span>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="priceConverted"
              stroke={strokeColor}
              strokeWidth={1.75}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3, fill: strokeColor, stroke: '#FFFFFF', strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
