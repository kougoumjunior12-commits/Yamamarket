import React, { useState } from 'react';
import { Search, ArrowRight, Globe2, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import type { CurrencyCode, Order, Product, ProductMode } from '../shared/types.ts';
import { formatMoney } from '../lib/currency.ts';
import { PriceSparkline } from './PriceSparkline.tsx';

interface MarketViewProps {
  products: Product[];
  orders: Order[];
  currency: CurrencyCode;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onOpenTracking: (order: Order) => void;
}

const CATEGORIES = [
  'all',
  'Électronique',
  'Maison & Déco',
  'Mode & Accessoires',
  'Beauté & Sport',
];

const MODES: { id: 'all' | ProductMode; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'dropshipping', label: 'Dropshipping' },
  { id: 'stock', label: 'Stock Vendeur' },
  { id: 'flash', label: 'Ventes Flash' },
];

export const MarketView: React.FC<MarketViewProps> = ({
  products,
  orders,
  currency,
  onAddToCart,
  onSelectProduct,
  onOpenTracking,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [modeFilter, setModeFilter] = useState<'all' | ProductMode>('all');

  const filteredProducts = products.filter((p) => {
    const okCat = category === 'all' || p.category === category;
    const okMode = modeFilter === 'all' || p.mode === modeFilter;
    const q = searchQuery.trim().toLowerCase();
    const okSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.store_name.toLowerCase().includes(q) ||
      p.origin.toLowerCase().includes(q);
    return okCat && okMode && okSearch;
  });

  const scrollToCatalog = () => {
    const el = document.getElementById('yama-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-10">
      {/* 1. Editorial Hero Showcase */}
      <section className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-center space-y-6">
            <div className="text-xs font-medium text-slate-500">
              <span>Marketplace Internationale</span>
              <span aria-hidden="true"> · </span>
              <span>Dropshipping & Stock Vérifié</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-slate-900 leading-[1.12] max-w-xl text-balance">
              Commerce mondial sans friction, protégé par séquestre.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg">
              Commandez auprès de fournisseurs internationaux en 6 devises, suivez chaque étape d’expédition en temps réel et bénéficiez du blocage automatique des fonds jusqu’à livraison confirmée.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={scrollToCatalog}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explorer le catalogue</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              {orders[0] && (
                <button
                  type="button"
                  onClick={() => onOpenTracking(orders[0])}
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Suivre un colis actif
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-100 min-h-[260px]">
            <img
              src="/src/assets/images/hero_global_commerce_1795349287622.jpg"
              alt="Sélection internationale Yama Shop"
              referrerPolicy="no-referrer"
              className="w-full h-full lg:h-full object-cover"
            />
          </div>
        </div>

        {/* 4-Column Assurance Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <Globe2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-slate-900">6 devises en direct</div>
              <div className="text-xs text-slate-500 mt-0.5">MAD, EUR, USD, GBP, CAD et XOF</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-slate-900">Paiement sous séquestre</div>
              <div className="text-xs text-slate-500 mt-0.5">Versement vendeur bloqué avant livraison</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <Truck className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-slate-900">Suivi colis temps réel</div>
              <div className="text-xs text-slate-500 mt-0.5">Chronologie directe depuis l’entrepôt</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-slate-900">Règlement 3D-Secure</div>
              <div className="text-xs text-slate-500 mt-0.5">Messagerie privée à contacts masqués</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Catalog & Filters */}
      <section id="yama-catalog" className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModeFilter(m.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  modeFilter === m.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filtrer par catégorie"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'Toutes les catégories' : c}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit, boutique ou hub..."
                className="pl-9 pr-4 py-2 w-64 sm:w-72 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 3-Column Uniform Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              Aucun produit ne correspond à votre recherche
            </p>
            <p className="text-xs text-slate-500">
              Modifiez vos filtres ou réinitialisez la catégorie pour afficher tout le catalogue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const modeText =
                product.mode === 'dropshipping'
                  ? 'Dropshipping'
                  : product.mode === 'flash'
                  ? 'Vente Flash'
                  : 'Stock Vérifié';

              return (
                <article
                  key={product.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="w-full aspect-[4/3] bg-slate-100 overflow-hidden block text-left cursor-pointer"
                    >
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
                    </button>

                    <div className="p-5 space-y-2">
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>{product.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{modeText}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">Stock {product.stock}</span>
                      </div>

                      <h2 className="text-base font-bold text-slate-900 leading-snug">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product)}
                          className="text-left hover:text-amber-700 transition-colors cursor-pointer"
                        >
                          {product.title}
                        </button>
                      </h2>

                      <div className="text-xs text-slate-500">
                        {product.store_name} · {product.origin}
                      </div>
                    </div>
                  </div>

                  <PriceSparkline product={product} currency={currency} />

                  <div className="px-5 pb-5 pt-3 flex items-center justify-between gap-4 border-t border-slate-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-extrabold font-mono tabular-nums text-slate-900">
                        {formatMoney(product.price_eur, currency)}
                      </span>
                      {product.old_eur && (
                        <span className="text-xs font-mono tabular-nums text-slate-400 line-through">
                          {formatMoney(product.old_eur, currency)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={product.stock <= 0}
                      onClick={() => onAddToCart(product)}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer"
                    >
                      {product.stock > 0 ? 'Ajouter au panier' : 'Épuisé'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Recent Buyer Orders & Live Parcel Tracking */}
      {orders.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Suivi récent des expéditions</h2>
              <p className="text-xs text-slate-500">
                Consultez l’état de transit international et le statut du séquestre en direct
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Colis</th>
                  <th className="py-2.5 pr-4 font-semibold">Produit</th>
                  <th className="py-2.5 pr-4 font-semibold">Destination</th>
                  <th className="py-2.5 pr-4 font-semibold">Transporteur</th>
                  <th className="py-2.5 pr-4 font-semibold">Montant</th>
                  <th className="py-2.5 pr-4 font-semibold">Statut</th>
                  <th className="py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {ord.parcel_code}
                    </td>
                    <td className="py-3 pr-4 text-slate-800 font-medium">{ord.product_title}</td>
                    <td className="py-3 pr-4 text-slate-600">{ord.buyer_city}</td>
                    <td className="py-3 pr-4 font-mono text-slate-600">{ord.tracking_number}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums font-semibold text-slate-900">
                      {formatMoney(ord.gross_eur, currency)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          ord.status === 'delivered'
                            ? 'text-emerald-700'
                            : ord.status === 'shipped'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {ord.status === 'delivered'
                          ? 'Livré'
                          : ord.status === 'shipped'
                          ? 'En transit'
                          : 'Préparation'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenTracking(ord)}
                        className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                      >
                        Suivi temps réel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
