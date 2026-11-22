import React, { useState } from 'react';
import { X, Minus, Plus, Trash2, Lock, CheckCircle2 } from 'lucide-react';
import type { CurrencyCode, Product } from '../shared/types.ts';
import { formatEurReference, formatMoney } from '../lib/currency.ts';

export interface CartItem {
  productId: number;
  qty: number;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  products: Product[];
  currency: CurrencyCode;
  onUpdateQty: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
  onCheckout: (payload: {
    buyerCity: string;
    paymentMethod: string;
  }) => Promise<{ parcelCodes: string[] } | null>;
}

const PAYMENT_METHODS = [
  'Carte Bancaire Internationale 3D-Secure',
  'Paiement Séquestre Multi-Devises',
  'Apple Pay / Google Pay',
  'Virement SEPA / SWIFT Vérifié',
];

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  items,
  products,
  currency,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
}) => {
  const [buyerCity, setBuyerCity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedCodes, setConfirmedCodes] = useState<string[] | null>(null);

  if (!open) return null;

  const detailedItems = items
    .map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return prod ? { ...item, product: prod } : null;
    })
    .filter(Boolean) as { productId: number; qty: number; product: Product }[];

  const totalEur = detailedItems.reduce(
    (sum, line) => sum + line.product.price_eur * line.qty,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedItems.length) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await onCheckout({ buyerCity: buyerCity.trim(), paymentMethod });
      if (res) {
        setConfirmedCodes(res.parcelCodes);
        setBuyerCity('');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Panier et Paiement Sécurisé"
    >
      <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-slate-200 shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Panier & Séquestre</h2>
            <p className="text-xs text-slate-500">
              Conversion automatique en {currency} · Fonds protégés jusqu’à livraison
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedCodes(null);
              setErrorMsg(null);
              onClose();
            }}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Fermer le panier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {confirmedCodes ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Commande confirmée et sécurisée en séquestre</span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Les fonds restent bloqués sur le compte séquestre Yama Shop jusqu’à confirmation de livraison par Koukoum Junior.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-emerald-200">
                <div className="text-xs font-medium text-emerald-800">Numéro(s) de colis généré(s) :</div>
                {confirmedCodes.map((code) => (
                  <div
                    key={code}
                    className="font-mono text-sm font-semibold text-slate-900 bg-white border border-emerald-200 rounded-md px-3 py-2"
                  >
                    {code}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmedCodes(null);
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Continuer mes achats
              </button>
            </div>
          ) : detailedItems.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800">Votre panier est vide</p>
              <p className="text-xs text-slate-500">
                Ajoutez des produits depuis la boutique internationale pour lancer une commande sous séquestre.
              </p>
            </div>
          ) : (
            detailedItems.map(({ product, qty }) => (
              <div
                key={product.id}
                className="flex gap-4 pb-4 border-b border-slate-200/80 last:border-b-0"
              >
                <div className="w-20 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                      Yama
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{product.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {product.store_name} · {product.origin}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center border border-slate-300 rounded-md bg-white">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(product.id, -1)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-mono font-semibold tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(product.id, 1)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        {formatMoney(product.price_eur * qty, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        aria-label="Retirer du panier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!confirmedCodes && detailedItems.length > 0 && (
          <form onSubmit={handleSubmit} className="p-6 border-t border-slate-200 bg-slate-50 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total ({currency})</span>
                <span className="text-lg font-extrabold font-mono tabular-nums text-slate-900">
                  {formatMoney(totalEur, currency)}
                </span>
              </div>
              {currency !== 'EUR' && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Base de règlement séquestre</span>
                  <span className="font-mono tabular-nums">{formatEurReference(totalEur)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ville et pays de livraison
                </label>
                <input
                  type="text"
                  required
                  value={buyerCity}
                  onChange={(e) => setBuyerCity(e.target.value)}
                  placeholder="Ex: Agadir, Maroc · Lyon, France · Dakar, Sénégal"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Méthode de paiement sécurisé
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Validation en cours...' : 'Valider et sécuriser en séquestre'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
