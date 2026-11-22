import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { CurrencyCode, Order } from '../shared/types.ts';
import { CURRENCIES, convertFromEur, formatMoney } from '../lib/currency.ts';

interface AdminPerformanceChartProps {
  orders: Order[];
  currency: CurrencyCode;
  adminName: string;
}

type RangeDays = 7 | 14 | 30;
type ChartMode = 'combined' | 'revenue';

interface DailyPoint {
  dateKey: string;
  label: string;
  grossEur: number;
  commissionEur: number;
  grossConverted: number;
  commissionConverted: number;
  ordersCount: number;
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const AdminPerformanceChart: React.FC<AdminPerformanceChartProps> = ({
  orders,
  currency,
  adminName,
}) => {
  const [rangeDays, setRangeDays] = useState<RangeDays>(14);
  const [chartMode, setChartMode] = useState<ChartMode>('combined');

  const currencyCfg = CURRENCIES[currency];

  const { series, periodGrossEur, periodCommissionEur, periodOrders } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = new Map<
      string,
      { grossEur: number; commissionEur: number; ordersCount: number }
    >();

    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.set(toDayKey(d), { grossEur: 0, commissionEur: 0, ordersCount: 0 });
    }

    for (const order of orders) {
      const created = new Date(order.created_at);
      if (Number.isNaN(created.getTime())) continue;
      const key = toDayKey(created);
      const entry = buckets.get(key);
      if (entry) {
        entry.grossEur += Number(order.gross_eur) || 0;
        entry.commissionEur += Number(order.admin_fee_eur) || 0;
        entry.ordersCount += 1;
      }
    }

    const points: DailyPoint[] = [];
    let totalGross = 0;
    let totalCommission = 0;
    let totalCount = 0;

    for (const [dateKey, vals] of buckets.entries()) {
      const [year, month, day] = dateKey.split('-').map(Number);
      const labelDate = new Date(year, month - 1, day);
      const label = labelDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      });

      totalGross += vals.grossEur;
      totalCommission += vals.commissionEur;
      totalCount += vals.ordersCount;

      points.push({
        dateKey,
        label,
        grossEur: vals.grossEur,
        commissionEur: vals.commissionEur,
        grossConverted: Number(convertFromEur(vals.grossEur, currency).toFixed(currencyCfg.decimals)),
        commissionConverted: Number(
          convertFromEur(vals.commissionEur, currency).toFixed(currencyCfg.decimals)
        ),
        ordersCount: vals.ordersCount,
      });
    }

    return {
      series: points,
      periodGrossEur: totalGross,
      periodCommissionEur: totalCommission,
      periodOrders: totalCount,
    };
  }, [orders, rangeDays, currency, currencyCfg.decimals]);

  const formatCompactAxis = (val: number) => {
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return String(val);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Performance Quotidienne — Revenus & Commandes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Évolution journalière du volume d’affaires ({currency}), des commissions {adminName} et des commandes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setChartMode('combined')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartMode === 'combined'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Revenus & Commandes
            </button>
            <button
              type="button"
              onClick={() => setChartMode('revenue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartMode === 'revenue'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Revenus vs Commissions
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {([7, 14, 30] as RangeDays[]).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  rangeDays === days
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days}j
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-amber-600 inline-block" aria-hidden="true" />
            <span className="text-slate-600">CA Brut ({rangeDays}j) :</span>
            <strong className="font-mono tabular-nums text-slate-900">
              {formatMoney(periodGrossEur, currency)}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" aria-hidden="true" />
            <span className="text-slate-600">Commissions {adminName} :</span>
            <strong className="font-mono tabular-nums text-emerald-700">
              {formatMoney(periodCommissionEur, currency)}
            </strong>
          </div>
          {chartMode === 'combined' && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-slate-900 inline-block" aria-hidden="true" />
              <span className="text-slate-600">Commandes :</span>
              <strong className="font-mono tabular-nums text-slate-900">
                {periodOrders}
              </strong>
            </div>
          )}
        </div>
        <div className="text-slate-500">
          Devise active : <span className="font-mono font-semibold text-slate-700">{currency}</span>
        </div>
      </div>

      {/* Recharts Container */}
      {orders.length === 0 ? (
        <div className="h-72 flex flex-col items-center justify-center text-center space-y-1 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-800">Aucune donnée de commande sur cette période</p>
          <p className="text-xs text-slate-500">
            Les revenus quotidiens apparaîtront automatiquement dès la première commande validée.
          </p>
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="yamaGrossFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D97706" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#D97706" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="yamaCommissionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="label"
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                dy={6}
              />

              <YAxis
                yAxisId="revenue"
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCompactAxis}
                tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                width={52}
              />

              {chartMode === 'combined' && (
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#0F172A', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  width={36}
                />
              )}

              <Tooltip
                cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const point = payload[0].payload as DailyPoint;
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-xs space-y-1.5 min-w-[200px]">
                      <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                        {point.label} ({point.dateKey})
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-600">CA Brut :</span>
                        <span className="font-mono tabular-nums font-bold text-amber-700">
                          {formatMoney(point.grossEur, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-600">Commission {adminName} :</span>
                        <span className="font-mono tabular-nums font-bold text-emerald-700">
                          {formatMoney(point.commissionEur, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
                        <span className="text-slate-600">Commandes :</span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {point.ordersCount}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />

              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="grossConverted"
                name={`CA Brut (${currency})`}
                stroke="#D97706"
                strokeWidth={2.2}
                fill="url(#yamaGrossFill)"
                activeDot={{ r: 5, fill: '#D97706', stroke: '#FFFFFF', strokeWidth: 2 }}
              />

              {chartMode === 'revenue' ? (
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="commissionConverted"
                  name={`Commission (${currency})`}
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#yamaCommissionFill)"
                  activeDot={{ r: 4, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              ) : (
                <>
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="commissionConverted"
                    name={`Commission (${currency})`}
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#059669' }}
                    activeDot={{ r: 5, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                  <Bar
                    yAxisId="orders"
                    dataKey="ordersCount"
                    name="Commandes"
                    fill="#0F172A"
                    barSize={16}
                    radius={[4, 4, 0, 0]}
                    fillOpacity={0.85}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
