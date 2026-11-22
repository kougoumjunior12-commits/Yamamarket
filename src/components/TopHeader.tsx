import React, { useState } from 'react';
import { Search, ShoppingBag, ShieldCheck, RefreshCw } from 'lucide-react';
import type { AppTab, CurrencyCode, UserRole } from '../shared/types.ts';
import { getCurrencyList, CURRENCIES } from '../lib/currency.ts';

interface TopHeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  autoRatesEnabled: boolean;
  onToggleAutoRates: () => void;
  refreshingRates: boolean;
  onRefreshRates: () => void;
  ratesSource: 'live' | 'fallback' | null;
  ratesUpdatedAt: string | null;
  role: UserRole;
  onChangeRole: (r: UserRole) => void;
  cartCount: number;
  onOpenCart: () => void;
  onQuickTrack: (query: string) => void;
}

const NAV_ITEMS: { id: AppTab; label: string }[] = [
  { id: 'market', label: 'Boutique' },
  { id: 'seller', label: 'Espace Vendeur' },
  { id: 'messages', label: 'Messagerie' },
  { id: 'support', label: 'Support Actif' },
  { id: 'admin', label: 'Administration' },
];

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onSelectTab,
  currency,
  onChangeCurrency,
  autoRatesEnabled,
  onToggleAutoRates,
  refreshingRates,
  onRefreshRates,
  ratesSource,
  ratesUpdatedAt,
  role,
  onChangeRole,
  cartCount,
  onOpenCart,
  onQuickTrack,
}) => {
  const [trackInput, setTrackInput] = useState('');
  const currencyList = getCurrencyList();
  const activeCurrency = CURRENCIES[currency];

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput.trim()) return;
    onQuickTrack(trackInput.trim());
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('market')}
          className="text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
        >
          Yama <span className="text-amber-600">Shop</span>
        </button>

        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm ${
                  isActive
                    ? 'border-amber-600 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>Panier</span>
            <span className="font-mono tabular-nums text-amber-400">({cartCount})</span>
          </button>
        </div>
      </header>

      {/* Mobile Nav Strip */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto bg-slate-50">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Workspace & Live Multi-Currency Toolbar */}
      <div className="bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-[1360px] mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Automatic Exchange Rate Selector */}
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-2 text-slate-600">
                <span className="font-medium whitespace-nowrap">Devise :</span>
                <select
                  aria-label="Sélectionner la devise"
                  value={currency}
                  onChange={(e) => onChangeCurrency(e.target.value as CurrencyCode)}
                  className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {currencyList.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — 1 € = {c.rateFromEur.toFixed(c.decimals === 0 ? 0 : 2)} {c.code}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={onToggleAutoRates}
                aria-pressed={autoRatesEnabled}
                title="Synchronisation automatique des taux de change"
                className={`px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  autoRatesEnabled
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {autoRatesEnabled ? 'Taux auto' : 'Manuel'}
              </button>

              <button
                type="button"
                onClick={onRefreshRates}
                disabled={refreshingRates}
                aria-label="Actualiser les taux de change"
                title="Actualiser les taux depuis l'API"
                className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${refreshingRates ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <label className="flex items-center gap-2 text-slate-600">
              <span className="font-medium whitespace-nowrap">Espace :</span>
              <select
                aria-label="Changer de rôle"
                value={role}
                onChange={(e) => onChangeRole(e.target.value as UserRole)}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="buyer">Acheteur International</option>
                <option value="seller">Vendeur / Dropshipper</option>
                <option value="admin">Koukoum Junior (Admin)</option>
              </select>
            </label>

            <span className="hidden xl:inline-flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span className="tabular-nums">
                1 € = {activeCurrency.rateFromEur.toFixed(activeCurrency.decimals === 0 ? 0 : 2)} {activeCurrency.code}
                {ratesSource === 'live' && ratesUpdatedAt
                  ? ` · Mis à jour ${new Date(ratesUpdatedAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''}
              </span>
            </span>
          </div>

          <form onSubmit={handleTrackSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                placeholder="Suivre un colis (ex: CMD-84920-41)"
                className="pl-8 pr-3 py-1.5 w-52 sm:w-56 bg-white border border-slate-300 rounded-md text-xs font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Suivre
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
