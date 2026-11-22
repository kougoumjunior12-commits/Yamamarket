import React from 'react';
import { X, ShieldCheck, Globe, Clock } from 'lucide-react';
import type { CurrencyCode, Product } from '../shared/types.ts';
import { formatEurReference, formatMoney } from '../lib/currency.ts';

interface ProductModalProps {
  product: Product | null;
  currency: CurrencyCode;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  currency,
  onClose,
  onAddToCart,
}) => {
  if (!product) return null;

  const modeLabel =
    product.mode === 'dropshipping'
      ? 'Dropshipping International'
      : product.mode === 'flash'
      ? 'Vente Flash'
      : 'Stock Vendeur Vérifié';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2">
        <div className="bg-slate-100 aspect-[4/3] md:aspect-auto md:h-full relative">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-slate-400">
              {product.category}
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-xs text-slate-500">
                <span>{product.category}</span>
                <span aria-hidden="true"> · </span>
                <span>{modeLabel}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                aria-label="Fermer la fiche produit"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">{product.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Vendu par <strong className="text-slate-700">{product.store_name}</strong>
              </p>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
                {formatMoney(product.price_eur, currency)}
              </span>
              {product.old_eur && (
                <span className="text-sm font-mono tabular-nums text-slate-400 line-through">
                  {formatMoney(product.old_eur, currency)}
                </span>
              )}
              {currency !== 'EUR' && (
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  ({formatEurReference(product.price_eur)})
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>

            <div className="space-y-2 pt-3 border-t border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <span>Expédition : {product.origin}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Délai estimé : {product.lead_time_days} · Stock : {product.stock} unités</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Paiement bloqué en séquestre jusqu’à confirmation de livraison</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
            className="w-full py-3 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-colors disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer"
          >
            {product.stock > 0 ? 'Ajouter au panier' : 'Rupture de stock'}
          </button>
        </div>
      </div>
    </div>
  );
};
