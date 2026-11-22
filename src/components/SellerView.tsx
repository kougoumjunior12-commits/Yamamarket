import React, { useState } from 'react';
import { Lock, Truck, MapPin, CheckCircle2 } from 'lucide-react';
import type {
  CurrencyCode,
  LogisticsModel,
  Order,
  ProductMode,
  Store,
} from '../shared/types.ts';
import { formatMoney } from '../lib/currency.ts';

interface SellerViewProps {
  adminName: string;
  stores: Store[];
  orders: Order[];
  currency: CurrencyCode;
  onSaveStore: (name: string, logistics: LogisticsModel) => Promise<void>;
  onPublishProduct: (payload: {
    storeId: number;
    title: string;
    category: string;
    mode: ProductMode;
    priceEur: number;
    stock: number;
    origin: string;
    description: string;
  }) => Promise<void>;
  onShipOrder: (orderId: number, trackingNumber: string) => Promise<void>;
  onTransitUpdate: (
    orderId: number,
    payload: { stepTitle: string; location: string; detail: string }
  ) => Promise<void>;
  onClaimPayout: (orderId: number) => Promise<void>;
  onOpenTracking: (order: Order) => void;
}

export const SellerView: React.FC<SellerViewProps> = ({
  adminName,
  stores,
  orders,
  currency,
  onSaveStore,
  onPublishProduct,
  onShipOrder,
  onTransitUpdate,
  onClaimPayout,
  onOpenTracking,
}) => {
  const [storeName, setStoreName] = useState('');
  const [storeLogistics, setStoreLogistics] = useState<LogisticsModel>('dropshipping');
  const [storeFeedback, setStoreFeedback] = useState<string | null>(null);

  const [selectedStoreId, setSelectedStoreId] = useState<number>(stores[0]?.id || 1);
  const [prodTitle, setProdTitle] = useState('');
  const [prodCat, setProdCat] = useState('Électronique');
  const [prodMode, setProdMode] = useState<ProductMode>('dropshipping');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodOrigin, setProdOrigin] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodFeedback, setProdFeedback] = useState<string | null>(null);

  // In-app modal state for Shipping & Transit Checkpoint
  const [shipTarget, setShipTarget] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [transitTarget, setTransitTarget] = useState<Order | null>(null);
  const [transitStep, setTransitStep] = useState('Dédouanement validé');
  const [transitLocation, setTransitLocation] = useState('');
  const [transitDetail, setTransitDetail] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const gross = orders.reduce((s, o) => s + o.gross_eur, 0);
  const adminFee = orders.reduce((s, o) => s + o.admin_fee_eur, 0);
  const held = orders
    .filter((o) => o.status !== 'delivered')
    .reduce((s, o) => s + o.seller_net_eur, 0);
  const unlocked = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + o.seller_net_eur, 0);

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreFeedback(null);
    await onSaveStore(storeName, storeLogistics);
    setStoreName('');
    setStoreFeedback('Boutique enregistrée avec succès.');
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdFeedback(null);
    await onPublishProduct({
      storeId: Number(selectedStoreId || stores[0]?.id || 1),
      title: prodTitle,
      category: prodCat,
      mode: prodMode,
      priceEur: Number(prodPrice),
      stock: Number(prodStock),
      origin: prodOrigin,
      description: prodDesc,
    });
    setProdTitle('');
    setProdPrice('');
    setProdStock('');
    setProdOrigin('');
    setProdDesc('');
    setProdFeedback('Produit publié sur le catalogue international.');
  };

  const handleShipConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipTarget) return;
    setActionError(null);
    try {
      await onShipOrder(shipTarget.id, trackingInput);
      setActionSuccess(`Expédition enregistrée pour ${shipTarget.parcel_code}.`);
      setShipTarget(null);
      setTrackingInput('');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Erreur d’expédition.');
    }
  };

  const handleTransitConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitTarget) return;
    setActionError(null);
    try {
      await onTransitUpdate(transitTarget.id, {
        stepTitle: transitStep,
        location: transitLocation,
        detail: transitDetail,
      });
      setActionSuccess(`Étape de suivi ajoutée pour ${transitTarget.parcel_code}.`);
      setTransitTarget(null);
      setTransitLocation('');
      setTransitDetail('');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Erreur de mise à jour.');
    }
  };

  const handlePayoutClick = async (order: Order) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await onClaimPayout(order.id);
      setActionSuccess(
        `Versement de ${formatMoney(order.seller_net_eur, currency)} débloqué pour ${order.parcel_code}.`
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Paiement bloqué.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Escrow Policy Banner (Clean hairline, no border-l-4) */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-amber-950">
        <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong>Séquestre obligatoire :</strong> Tant que la livraison n’est pas confirmée par{' '}
          <strong>{adminName}</strong>, le versement reste verrouillé en séquestre et le bouton{' '}
          <strong>Encaisser</strong> demeure désactivé.
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Ventes Brutes</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
            {formatMoney(gross, currency)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Commission {adminName}</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
            {formatMoney(adminFee, currency)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">En Séquestre (Non livré)</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-700 mt-1">
            {formatMoney(held, currency)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Débloqué (Livré)</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 mt-1">
            {formatMoney(unlocked, currency)}
          </div>
        </div>
      </div>

      {/* Forms: Store & Publish Product */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Ouvrir ou modifier une boutique</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choisissez entre dropshipping international ou gestion de stock vérifié
            </p>
          </div>
          <form onSubmit={handleStoreSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom de la boutique
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: Nordic Supply Hub"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modèle logistique
              </label>
              <select
                value={storeLogistics}
                onChange={(e) => setStoreLogistics(e.target.value as LogisticsModel)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="dropshipping">Dropshipping International</option>
                <option value="stock">Stock Propre</option>
              </select>
            </div>
            {storeFeedback && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {storeFeedback}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-colors cursor-pointer"
            >
              Enregistrer la boutique
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Publier un produit</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Prix saisi en EUR base, converti automatiquement dans les 6 devises
            </p>
          </div>
          <form onSubmit={handleProductSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Boutique</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.logistics})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titre du produit
              </label>
              <input
                type="text"
                required
                value={prodTitle}
                onChange={(e) => setProdTitle(e.target.value)}
                placeholder="Ex: Enceinte Bluetooth Hi-Fi Aluminium"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
              <select
                value={prodCat}
                onChange={(e) => setProdCat(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Électronique">Électronique</option>
                <option value="Maison & Déco">Maison & Déco</option>
                <option value="Mode & Accessoires">Mode & Accessoires</option>
                <option value="Beauté & Sport">Beauté & Sport</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mode</label>
              <select
                value={prodMode}
                onChange={(e) => setProdMode(e.target.value as ProductMode)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="dropshipping">Dropshipping</option>
                <option value="stock">Stock Vendeur</option>
                <option value="flash">Vente Flash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prix base (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                placeholder="39.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stock</label>
              <input
                type="number"
                min="1"
                required
                value={prodStock}
                onChange={(e) => setProdStock(e.target.value)}
                placeholder="50"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pays / Entrepôt d’expédition
              </label>
              <input
                type="text"
                required
                value={prodOrigin}
                onChange={(e) => setProdOrigin(e.target.value)}
                placeholder="Ex: Shenzhen · Express Air"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description courte
              </label>
              <input
                type="text"
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder="Détails techniques et garantie..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {prodFeedback && (
              <div className="sm:col-span-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {prodFeedback}
              </div>
            )}
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-colors cursor-pointer"
              >
                Publier le produit
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Seller Orders & Escrow Payouts Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Commandes & Versements Vendeur</h2>
            <p className="text-xs text-slate-500">
              Renseignez le numéro de suivi, mettez à jour le transit et encaissez après livraison confirmée
            </p>
          </div>
        </div>

        {actionError && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-semibold">Colis</th>
                <th className="py-2.5 pr-4 font-semibold">Boutique / Produit</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Brut</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Commission</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Net Vendeur</th>
                <th className="py-2.5 pr-4 font-semibold">Livraison</th>
                <th className="py-2.5 pr-4 font-semibold">Séquestre</th>
                <th className="py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((ord) => {
                const delivered = ord.status === 'delivered';
                return (
                  <tr key={ord.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-4">
                      <div className="font-mono font-bold text-slate-900">{ord.parcel_code}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {ord.tracking_number}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-900">{ord.store_name}</div>
                      <div className="text-slate-600">
                        {ord.product_title} × {ord.qty}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-800">
                      {formatMoney(ord.gross_eur, currency)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-600">
                      {formatMoney(ord.admin_fee_eur, currency)} ({ord.commission_pct}%)
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatMoney(ord.seller_net_eur, currency)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          delivered
                            ? 'text-emerald-700'
                            : ord.status === 'shipped'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {delivered ? 'Livré' : ord.status === 'shipped' ? 'Expédié' : 'En attente'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          ord.payout_released
                            ? 'text-emerald-700'
                            : delivered
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {ord.payout_released
                          ? 'Versé'
                          : delivered
                          ? 'Déblocable'
                          : 'Bloqué'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end flex-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenTracking(ord)}
                          className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 font-semibold hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                        >
                          Suivi
                        </button>
                        {!delivered && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setShipTarget(ord);
                                setTrackingInput(
                                  ord.tracking_number !== 'En attente expédition'
                                    ? ord.tracking_number
                                    : `YM${Math.floor(10000000 + Math.random() * 89999999)}`
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                            >
                              Expédier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTransitTarget(ord);
                                setTransitLocation(ord.buyer_city.split(',')[0] || 'Hub International');
                              }}
                              className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 font-semibold hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                            >
                              Étape transit
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={!delivered || ord.payout_released}
                          onClick={() => handlePayoutClick(ord)}
                          className={`px-3 py-1.5 rounded-md font-bold whitespace-nowrap transition-colors ${
                            ord.payout_released
                              ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                              : delivered
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {ord.payout_released ? 'Payé' : delivered ? 'Encaisser' : 'Bloqué'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ship Parcel Modal */}
      {shipTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <form
            onSubmit={handleShipConfirm}
            className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Truck className="w-5 h-5 text-amber-600" />
              <span>Expédier {shipTarget.parcel_code}</span>
            </div>
            <p className="text-xs text-slate-600">
              Saisissez le numéro de suivi transporteur pour {shipTarget.product_title}.
            </p>
            <input
              type="text"
              required
              minLength={4}
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="Ex: YM78492014CN"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShipTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Confirmer l’expédition
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transit Checkpoint Modal */}
      {transitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <form
            onSubmit={handleTransitConfirm}
            className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <MapPin className="w-5 h-5 text-amber-600" />
              <span>Mettre à jour le suivi ({transitTarget.parcel_code})</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Étape</label>
              <select
                value={transitStep}
                onChange={(e) => setTransitStep(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="En transit aérien international">En transit aérien international</option>
                <option value="Dédouanement validé">Dédouanement validé</option>
                <option value="Arrivé au hub local">Arrivé au hub local</option>
                <option value="En cours de livraison finale">En cours de livraison finale</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Localisation</label>
              <input
                type="text"
                required
                value={transitLocation}
                onChange={(e) => setTransitLocation(e.target.value)}
                placeholder="Ex: Hub Casablanca / Roissy CDG"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Détail</label>
              <input
                type="text"
                value={transitDetail}
                onChange={(e) => setTransitDetail(e.target.value)}
                placeholder="Colis scanné et transféré au transporteur local"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransitTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
              >
                Ajouter au suivi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
