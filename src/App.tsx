import { useCallback, useEffect, useState } from 'react';
import { TopHeader } from './components/TopHeader.tsx';
import { MarketView } from './components/MarketView.tsx';
import { SellerView } from './components/SellerView.tsx';
import { MessagesView } from './components/MessagesView.tsx';
import { SupportView } from './components/SupportView.tsx';
import { AdminView } from './components/AdminView.tsx';
import { CartDrawer, type CartItem } from './components/CartDrawer.tsx';
import { TrackingModal } from './components/TrackingModal.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { applyLiveRates } from './lib/currency.ts';
import { apiRequest, isDemoMode } from './lib/api.ts';
import type {
  AppTab,
  CurrencyCode,
  ExchangeRatesResponse,
  LogisticsModel,
  Order,
  PlatformState,
  Product,
  ProductMode,
  SupportTicket,
  SupportTicketType,
  UserRole,
} from './shared/types.ts';

const CART_STORAGE_KEY = 'yama_shop_cart_v1';
const CURRENCY_STORAGE_KEY = 'yama_shop_currency_v1';

export default function App() {
  const [state, setState] = useState<PlatformState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const [activeTab, setActiveTab] = useState<AppTab>('market');
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
      if (saved && ['MAD', 'EUR', 'USD', 'GBP', 'CAD', 'XOF'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'MAD';
  });
  const [autoRatesEnabled, setAutoRatesEnabled] = useState(true);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [ratesSource, setRatesSource] = useState<'live' | 'fallback' | null>(null);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [, setRatesVersion] = useState(0);
  const [role, setRole] = useState<UserRole>('buyer');
  const [adminPin, setAdminPin] = useState('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'neutral' | 'error' } | null>(null);

  const showToast = useCallback((text: string, tone: 'neutral' | 'error' = 'neutral') => {
    setToast({ text, tone });
    window.setTimeout(() => {
      setToast((current) => (current?.text === text ? null : current));
    }, 3500);
  }, []);

  const request = useCallback(
    async (path: string, options?: Parameters<typeof apiRequest>[1]) => {
      const res = await apiRequest(path, options);
      if (res.demo) setDemoMode(true);
      if (!res.ok) throw new Error(res.data?.error || 'Action impossible.');
      return res.data;
    },
    []
  );

  const fetchPlatformState = useCallback(async () => {
    try {
      const data = (await request('/api/state')) as PlatformState;
      setState(data);
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  const fetchLiveRates = useCallback(async (force = false) => {
    setRefreshingRates(true);
    try {
      const res = await apiRequest<ExchangeRatesResponse>(force ? '/api/rates?refresh=1' : '/api/rates');
      if (!res.ok) return;
      const data = res.data;
      applyLiveRates(data.rates);
      setRatesSource(data.source);
      setRatesUpdatedAt(data.updatedAt);
      setRatesVersion((v) => v + 1);
    } finally {
      setRefreshingRates(false);
    }
  }, []);

  // Initial load + Real-time Server-Sent Events (SSE) subscription
  useEffect(() => {
    fetchPlatformState();
    fetchLiveRates(false);
  }, [fetchPlatformState, fetchLiveRates]);

  useEffect(() => {
    if (demoMode || typeof EventSource === 'undefined') return;
    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('state_updated', () => {
      fetchPlatformState();
    });
    eventSource.onerror = () => {
      if (isDemoMode()) eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }, [demoMode, fetchPlatformState]);

  // Automatic periodic exchange rate synchronization when enabled
  useEffect(() => {
    if (!autoRatesEnabled) return;
    const interval = window.setInterval(() => {
      fetchLiveRates(false);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [autoRatesEnabled, fetchLiveRates]);

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      // ignore storage errors
    }
  }, [currency]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCartOpen(false);
        setSelectedProduct(null);
        setTrackingOrderId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleChangeRole = (nextRole: UserRole) => {
    setRole(nextRole);
    if (nextRole === 'seller') setActiveTab('seller');
    else if (nextRole === 'admin') setActiveTab('admin');
    else setActiveTab('market');
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast('Ce produit est actuellement en rupture de stock.', 'error');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast('Quantité maximale disponible atteinte.', 'error');
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { productId: product.id, qty: 1 }];
    });
    showToast(`${product.title} ajouté au panier.`);
  };

  const handleUpdateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleRemoveCartItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleCheckout = async (payload: {
    buyerCity: string;
    paymentMethod: string;
  }) => {
    const data = await request('/api/orders', {
      method: 'POST',
      body: {
        items: cart,
        buyerCity: payload.buyerCity,
        paymentCurrency: currency,
        paymentMethod: payload.paymentMethod,
      },
    });
    setCart([]);
    await fetchPlatformState();
    return { parcelCodes: data.parcelCodes as string[] };
  };

  const handleQuickTrack = (query: string) => {
    if (!state) return;
    const normalized = query.toUpperCase();
    const matched = state.orders.find(
      (o) =>
        o.parcel_code.toUpperCase() === normalized ||
        o.tracking_number.toUpperCase() === normalized ||
        o.parcel_code.toUpperCase().includes(normalized)
    );
    if (!matched) {
      showToast(`Aucun colis trouvé pour "${query}".`, 'error');
      return;
    }
    setTrackingOrderId(matched.id);
  };

  const handleSaveStore = async (name: string, logistics: LogisticsModel) => {
    await request('/api/stores', { method: 'POST', body: { name, logistics } });
    await fetchPlatformState();
  };

  const handlePublishProduct = async (payload: {
    storeId: number;
    title: string;
    category: string;
    mode: ProductMode;
    priceEur: number;
    stock: number;
    origin: string;
    description: string;
  }) => {
    await request('/api/products', { method: 'POST', body: payload });
    await fetchPlatformState();
  };

  const handleShipOrder = async (orderId: number, trackingNumber: string) => {
    await request(`/api/orders/${orderId}/ship`, { method: 'PATCH', body: { trackingNumber } });
    await fetchPlatformState();
  };

  const handleTransitUpdate = async (
    orderId: number,
    payload: { stepTitle: string; location: string; detail: string }
  ) => {
    await request(`/api/orders/${orderId}/transit`, { method: 'PATCH', body: payload });
    await fetchPlatformState();
  };

  const handleClaimPayout = async (orderId: number) => {
    await request(`/api/orders/${orderId}/payout`, { method: 'POST' });
    await fetchPlatformState();
  };

  const handleSendMessage = async (
    convId: number,
    senderLabel: string,
    body: string
  ) => {
    await request(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      body: { senderLabel, body },
    });
    await fetchPlatformState();
  };

  const handleFlagConversation = async (convId: number) => {
    try {
      await request(`/api/conversations/${convId}/flag`, { method: 'POST' });
      showToast(`Discussion signalée à ${state?.adminName || 'Koukoum Junior'}.`);
      await fetchPlatformState();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Signalement impossible.', 'error');
    }
  };

  const handleSubmitSupport = async (payload: {
    parcelCode: string;
    ticketType: SupportTicketType;
    description: string;
  }): Promise<SupportTicket> => {
    const data = await request('/api/support', { method: 'POST', body: payload });
    await fetchPlatformState();
    return data as SupportTicket;
  };

  const handleUnlockAdmin = async (pin: string): Promise<boolean> => {
    const res = await apiRequest('/api/admin/verify', { method: 'POST', body: { pin } });
    if (res.demo) setDemoMode(true);
    if (!res.ok) return false;
    setAdminPin(pin);
    setRole('admin');
    return true;
  };

  const adminHeaders = { 'x-role': 'admin', 'x-admin-pin': adminPin };

  const handleConfirmDelivery = async (orderId: number) => {
    await request(`/api/admin/orders/${orderId}/deliver`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    await fetchPlatformState();
  };

  const handleUpdateCommission = async (storeId: number, pct: number) => {
    await request(`/api/admin/stores/${storeId}/commission`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { commissionPct: pct },
    });
    await fetchPlatformState();
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const trackedOrder: Order | null =
    state?.orders.find((o) => o.id === trackingOrderId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-slate-900">
      <TopHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currency={currency}
        onChangeCurrency={(next) => {
          setCurrency(next);
          if (autoRatesEnabled) {
            fetchLiveRates(false);
          }
        }}
        autoRatesEnabled={autoRatesEnabled}
        onToggleAutoRates={() => {
          setAutoRatesEnabled((prev) => {
            const next = !prev;
            if (next) fetchLiveRates(true);
            return next;
          });
        }}
        refreshingRates={refreshingRates}
        onRefreshRates={() => fetchLiveRates(true)}
        ratesSource={ratesSource}
        ratesUpdatedAt={ratesUpdatedAt}
        role={role}
        onChangeRole={handleChangeRole}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onQuickTrack={handleQuickTrack}
      />

      {demoMode && (
        <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
          <p className="max-w-[1360px] mx-auto px-6 py-2">
            <strong>Mode démo</strong> · Serveur indisponible : produits de démonstration chargés, vos actions sont
            enregistrées localement dans ce navigateur.
          </p>
        </div>
      )}

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-8">
        {loading && !state ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border border-slate-200 rounded-xl h-80 animate-pulse"
              />
            ))}
          </div>
        ) : loadError && !state ? (
          <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-800">{loadError}</p>
            <button
              type="button"
              onClick={fetchPlatformState}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        ) : state ? (
          <>
            {activeTab === 'market' && (
              <MarketView
                products={state.products}
                orders={state.orders}
                currency={currency}
                onAddToCart={handleAddToCart}
                onSelectProduct={setSelectedProduct}
                onOpenTracking={(ord) => setTrackingOrderId(ord.id)}
              />
            )}

            {activeTab === 'seller' && (
              <SellerView
                adminName={state.adminName}
                stores={state.stores}
                orders={state.orders}
                currency={currency}
                onSaveStore={handleSaveStore}
                onPublishProduct={handlePublishProduct}
                onShipOrder={handleShipOrder}
                onTransitUpdate={handleTransitUpdate}
                onClaimPayout={handleClaimPayout}
                onOpenTracking={(ord) => setTrackingOrderId(ord.id)}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesView
                conversations={state.conversations}
                role={role}
                adminName={state.adminName}
                onSendMessage={handleSendMessage}
                onFlagConversation={handleFlagConversation}
              />
            )}

            {activeTab === 'support' && (
              <SupportView
                orders={state.orders}
                tickets={state.tickets}
                onSubmitTicket={handleSubmitSupport}
              />
            )}

            {activeTab === 'admin' && (
              <AdminView
                adminName={state.adminName}
                adminPin={adminPin}
                onUnlockAdmin={handleUnlockAdmin}
                stores={state.stores}
                orders={state.orders}
                conversations={state.conversations}
                currency={currency}
                onConfirmDelivery={handleConfirmDelivery}
                onUpdateCommission={handleUpdateCommission}
                onOpenTracking={(ord) => setTrackingOrderId(ord.id)}
              />
            )}
          </>
        ) : null}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <strong className="text-slate-800">Yama Shop</strong> · Marketplace Internationale & Dropshipping · Direction :{' '}
            <strong className="text-slate-700">{state?.adminName || 'Koukoum Junior'}</strong>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('market')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Boutique
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seller')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Vendre sur Yama Shop
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('support')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Support Actif
            </button>
          </div>
        </div>
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        products={state?.products || []}
        currency={currency}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleCheckout}
      />

      <ProductModal
        product={selectedProduct}
        currency={currency}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <TrackingModal
        order={trackedOrder}
        currency={currency}
        onClose={() => setTrackingOrderId(null)}
      />

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg border text-xs font-semibold shadow-lg transition-opacity ${
            toast.tone === 'error'
              ? 'bg-rose-950 text-white border-rose-800'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
