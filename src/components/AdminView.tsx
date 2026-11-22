import React, { useState } from 'react';
import { ShieldCheck, KeyRound, CheckCircle2, Flag } from 'lucide-react';
import type { Conversation, CurrencyCode, Order, Store } from '../shared/types.ts';
import { formatMoney } from '../lib/currency.ts';
import { AdminPerformanceChart } from './AdminPerformanceChart.tsx';

interface AdminViewProps {
  adminName: string;
  adminPin: string;
  onUnlockAdmin: (pin: string) => Promise<boolean>;
  stores: Store[];
  orders: Order[];
  conversations: Conversation[];
  currency: CurrencyCode;
  onConfirmDelivery: (orderId: number) => Promise<void>;
  onUpdateCommission: (storeId: number, pct: number) => Promise<void>;
  onOpenTracking: (order: Order) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  adminName,
  adminPin,
  onUnlockAdmin,
  stores,
  orders,
  conversations,
  currency,
  onConfirmDelivery,
  onUpdateCommission,
  onOpenTracking,
}) => {
  const [pinDraft, setPinDraft] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [pctInput, setPctInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const ok = await onUnlockAdmin(pinDraft.trim());
    if (!ok) {
      setPinError(`Code PIN incorrect pour ${adminName}.`);
    } else {
      setPinDraft('');
    }
  };

  if (!adminPin) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-xl p-8 space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Accès Administrateur</h2>
            <p className="text-xs text-slate-500">Direction : {adminName}</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Entrez le code PIN administrateur pour gérer les commissions par boutique et confirmer les livraisons afin de débloquer les versements vendeurs.
        </p>
        <form onSubmit={handleUnlock} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Code PIN ({adminName})
            </label>
            <input
              type="password"
              required
              value={pinDraft}
              onChange={(e) => setPinDraft(e.target.value)}
              placeholder="Saisir le code PIN (démo : junior2026)"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {pinError && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {pinError}
            </div>
          )}
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            Déverrouiller le bilan
          </button>
        </form>
      </div>
    );
  }

  const gmv = orders.reduce((s, o) => s + o.gross_eur, 0);
  const profit = orders.reduce((s, o) => s + o.admin_fee_eur, 0);
  const held = orders
    .filter((o) => o.status !== 'delivered')
    .reduce((s, o) => s + o.seller_net_eur, 0);
  const released = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + o.seller_net_eur, 0);

  const flaggedConvs = conversations.filter((c) => c.flagged);

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    await onUpdateCommission(editingStore.id, Number(pctInput));
    setStatusMessage(`Commission de ${editingStore.name} mise à jour à ${pctInput}%.`);
    setEditingStore(null);
  };

  const handleDeliverClick = async (order: Order) => {
    await onConfirmDelivery(order.id);
    setStatusMessage(
      `Livraison confirmée pour ${order.parcel_code}. Le versement vendeur est maintenant débloqué.`
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 text-white rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-sm">
            <strong>Tableau de Bord Administrateur — {adminName} :</strong> Bilan automatique des revenus, ajustement des commissions et libération du séquestre.
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Volume Total Yama Shop</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
            {formatMoney(gmv, currency)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Bénéfice Net {adminName}</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 mt-1">
            {formatMoney(profit, currency)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Séquestre (Non livré)</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-700 mt-1">
            {formatMoney(held, currency)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Débloqué (Livré)</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
            {formatMoney(released, currency)}
          </div>
        </div>
      </div>

      {/* Dynamic Daily Revenue & Orders Chart */}
      <AdminPerformanceChart
        orders={orders}
        currency={currency}
        adminName={adminName}
      />

      {/* Store Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Bilan Automatique par Boutique</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajustez les taux de commission appliqués aux nouvelles commandes de chaque vendeur
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-semibold">Boutique</th>
                <th className="py-2.5 pr-4 font-semibold">Modèle</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Commission</th>
                <th className="py-2.5 pr-4 font-semibold text-right">CA Brut</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Bénéfice {adminName}</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Séquestre</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Débloqué</th>
                <th className="py-2.5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stores.map((s) => {
                const sOrders = orders.filter((o) => o.store_id === s.id);
                const sGross = sOrders.reduce((sum, o) => sum + o.gross_eur, 0);
                const sAdmin = sOrders.reduce((sum, o) => sum + o.admin_fee_eur, 0);
                const sHeld = sOrders
                  .filter((o) => o.status !== 'delivered')
                  .reduce((sum, o) => sum + o.seller_net_eur, 0);
                const sDone = sOrders
                  .filter((o) => o.status === 'delivered')
                  .reduce((sum, o) => sum + o.seller_net_eur, 0);

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.logistics}</td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {s.commission_pct}%
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-800">
                      {formatMoney(sGross, currency)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                      {formatMoney(sAdmin, currency)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-amber-700">
                      {formatMoney(sHeld, currency)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-800">
                      {formatMoney(sDone, currency)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStore(s);
                          setPctInput(String(s.commission_pct));
                        }}
                        className="px-3 py-1.5 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                      >
                        Modifier %
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parcel Delivery Confirmation Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Suivi Colis & Confirmation de Livraison
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            La validation d’une livraison autorise immédiatement le vendeur à encaisser sa part nette
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-semibold">Colis</th>
                <th className="py-2.5 pr-4 font-semibold">Boutique</th>
                <th className="py-2.5 pr-4 font-semibold">Produit</th>
                <th className="py-2.5 pr-4 font-semibold">Suivi</th>
                <th className="py-2.5 pr-4 font-semibold">État</th>
                <th className="py-2.5 pr-4 font-semibold">Versement</th>
                <th className="py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((ord) => {
                const delivered = ord.status === 'delivered';
                return (
                  <tr key={ord.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-4 font-mono font-bold text-slate-900">
                      {ord.parcel_code}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{ord.store_name}</td>
                    <td className="py-3 pr-4 text-slate-800">
                      {ord.product_title} × {ord.qty}
                    </td>
                    <td className="py-3 pr-4 font-mono text-slate-600">{ord.tracking_number}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          delivered ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {delivered ? 'Livré' : 'Non livré'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-700">
                      {ord.payout_released ? 'Versé' : delivered ? 'Débloqué' : 'Bloqué'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => onOpenTracking(ord)}
                          className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 font-semibold hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                        >
                          Suivi
                        </button>
                        {!delivered && (
                          <button
                            type="button"
                            onClick={() => handleDeliverClick(ord)}
                            className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold whitespace-nowrap cursor-pointer"
                          >
                            Confirmer Livraison
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flagged Conversations Monitor */}
      {flaggedConvs.length > 0 && (
        <div className="bg-white border border-rose-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <Flag className="w-4 h-4" />
            <span>Discussions signalées ({flaggedConvs.length})</span>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {flaggedConvs.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <strong className="text-slate-900">{c.store_name}</strong> · {c.product_title}
                </div>
                <span className="font-mono text-slate-600">{c.parcel_code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission Editor Modal */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <form
            onSubmit={handleSaveCommission}
            className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">
              Commission — {editingStore.name}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pourcentage de commission {adminName} (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="80"
                required
                value={pctInput}
                onChange={(e) => setPctInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingStore(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
