import React from 'react';
import { X, PackageCheck, Truck, Shield, MapPin } from 'lucide-react';
import type { CurrencyCode, Order } from '../shared/types.ts';
import { formatMoney } from '../lib/currency.ts';

interface TrackingModalProps {
  order: Order | null;
  currency: CurrencyCode;
  onClose: () => void;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({ order, currency, onClose }) => {
  if (!order) return null;

  const progressPct =
    order.status === 'delivered' ? 100 : order.status === 'shipped' ? 62 : 24;

  const statusLabel =
    order.status === 'delivered'
      ? 'Livré — Paiement vendeur débloqué'
      : order.status === 'shipped'
      ? 'En transit international — Fonds en séquestre'
      : 'Préparation fournisseur — Fonds en séquestre';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Suivi en temps réel ${order.parcel_code}`}
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-slate-500">{order.parcel_code}</div>
            <h3 className="text-lg font-bold text-slate-900">{order.product_title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            aria-label="Fermer le suivi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Route & Escrow Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Origine d’expédition</div>
              <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>{order.origin}</span>
              </div>
            </div>
            <div>
              <div className="text-slate-500">Destination finale</div>
              <div className="font-semibold text-slate-900 mt-1">{order.buyer_city}</div>
            </div>
            <div>
              <div className="text-slate-500">Numéro transporteur</div>
              <div className="font-mono font-semibold text-slate-900 mt-1">
                {order.tracking_number}
              </div>
            </div>
          </div>

          {/* Live Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800">{statusLabel}</span>
              <span className="font-mono tabular-nums text-slate-600">{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  order.status === 'delivered' ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Shield className="w-3 h-3" /> Paiement séquestré
              </span>
              <span className="inline-flex items-center gap-1">
                <Truck className="w-3 h-3" /> Transit international
              </span>
              <span className="inline-flex items-center gap-1">
                <PackageCheck className="w-3 h-3" /> Livraison confirmée
              </span>
            </div>
          </div>

          {/* Financial Escrow Breakdown */}
          <div className="grid grid-cols-3 gap-4 py-3 border-y border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Montant brut</div>
              <div className="font-mono font-bold tabular-nums text-slate-900 text-sm mt-0.5">
                {formatMoney(order.gross_eur, currency)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Commission ({order.commission_pct}%)</div>
              <div className="font-mono font-bold tabular-nums text-slate-900 text-sm mt-0.5">
                {formatMoney(order.admin_fee_eur, currency)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Net Vendeur</div>
              <div className="font-mono font-bold tabular-nums text-emerald-700 text-sm mt-0.5">
                {formatMoney(order.seller_net_eur, currency)}
              </div>
            </div>
          </div>

          {/* Chronological Timeline */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Chronologie en temps réel</h4>
            <div className="space-y-4">
              {[...order.timeline].reverse().map((step, index) => (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold border ${
                        index === 0
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {order.timeline.length - index}
                    </div>
                    {index < order.timeline.length - 1 && (
                      <div className="w-px flex-1 bg-slate-200 my-1" />
                    )}
                  </div>
                  <div className="pb-2 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {step.step_title}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {new Date(step.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{step.detail}</p>
                    <div className="text-[11px] text-slate-500 mt-1">{step.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
