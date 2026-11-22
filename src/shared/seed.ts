import type {
  ChatMessage,
  Conversation,
  CurrencyCode,
  Order,
  ParcelStep,
  PlatformState,
  Product,
  Store,
  SupportTicket,
} from './types.ts';

export const ADMIN_NAME = 'Koukoum Junior';

export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  EUR: 1,
  MAD: 10.82,
  USD: 1.09,
  GBP: 0.85,
  CAD: 1.49,
  XOF: 655.96,
};

export interface DatabaseSchema {
  stores: Store[];
  products: Product[];
  orders: Omit<Order, 'product_title' | 'store_name' | 'timeline'>[];
  parcel_timeline: ParcelStep[];
  conversations: {
    id: number;
    order_id: number;
    store_id: number;
    flagged: boolean;
    created_at: string;
  }[];
  chat_messages: ChatMessage[];
  support_tickets: SupportTicket[];
  counters: {
    store: number;
    product: number;
    order: number;
    step: number;
    conv: number;
    msg: number;
    ticket: number;
  };
}

export function createInitialData(): DatabaseSchema {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

  return {
    stores: [
      {
        id: 1,
        name: 'Yama Global Dropship',
        logistics: 'dropshipping',
        commission_pct: 12,
        created_at: hoursAgo(240),
      },
      {
        id: 2,
        name: 'Atlas Atelier Local',
        logistics: 'stock',
        commission_pct: 10,
        created_at: hoursAgo(180),
      },
    ],
    products: [
      {
        id: 1,
        store_id: 1,
        store_name: 'Yama Global Dropship',
        title: 'Casque Audio Sans Fil ANC Studio',
        category: 'Électronique',
        mode: 'dropshipping',
        price_eur: 49.0,
        old_eur: 79.0,
        stock: 118,
        origin: 'Shenzhen · Express Air',
        image_url: '/src/assets/images/prod_anc_headphones_1795349285942.jpg',
        description: 'Réduction de bruit active 42 dB, autonomie 45 heures, USB-C charge rapide et double appairage multipoint.',
        lead_time_days: '5–8 jours ouvrés',
        created_at: hoursAgo(160),
      },
      {
        id: 2,
        store_id: 1,
        store_name: 'Yama Global Dropship',
        title: 'Lampe LED Tactile Sans Fil',
        category: 'Maison & Déco',
        mode: 'flash',
        price_eur: 24.5,
        old_eur: 39.0,
        stock: 74,
        origin: 'Rotterdam · Hub Europe',
        image_url: '/src/assets/images/prod_led_lamp_1795349285013.jpg',
        description: 'Aluminium brossé anodisé, variateur tactile 3 températures de couleur (2700K–4500K), batterie 5200 mAh.',
        lead_time_days: '3–5 jours ouvrés',
        created_at: hoursAgo(140),
      },
      {
        id: 3,
        store_id: 2,
        store_name: 'Atlas Atelier Local',
        title: 'Montre Connectée Titane Sport & Santé',
        category: 'Beauté & Sport',
        mode: 'stock',
        price_eur: 89.0,
        old_eur: 129.0,
        stock: 38,
        origin: 'Casablanca · Stock Vérifié',
        image_url: '/src/assets/images/prod_smart_watch_1795349287172.jpg',
        description: 'Boîtier titane grade 5, suivi GPS double bande, capteur cardiaque SpO2 et étanchéité 5 ATM.',
        lead_time_days: '24–48h Express',
        created_at: hoursAgo(120),
      },
      {
        id: 4,
        store_id: 1,
        store_name: 'Yama Global Dropship',
        title: 'Sacoche Bandoulière Technique Anti-Pluie',
        category: 'Mode & Accessoires',
        mode: 'dropshipping',
        price_eur: 34.0,
        old_eur: 52.0,
        stock: 94,
        origin: 'Guangzhou · Express Global',
        image_url: '/src/assets/images/prod_waterproof_bag_1795349285936.jpg',
        description: 'Tissu balistique déperlant IPX4, boucle magnétique anodisée rapide et compartiment passeport RFID.',
        lead_time_days: '6–9 jours ouvrés',
        created_at: hoursAgo(90),
      },
    ],
    orders: [
      {
        id: 1,
        parcel_code: 'CMD-84920-41',
        product_id: 1,
        store_id: 1,
        qty: 2,
        unit_eur: 49.0,
        gross_eur: 98.0,
        commission_pct: 12,
        admin_fee_eur: 11.76,
        seller_net_eur: 86.24,
        payment_currency: 'MAD',
        payment_method: 'Paiement Séquestre 3D-Secure',
        status: 'shipped',
        payout_released: false,
        tracking_number: 'YM78492014CN',
        buyer_city: 'Agadir, Maroc',
        origin: 'Shenzhen · Express Air',
        created_at: hoursAgo(36),
        delivered_at: null,
        released_at: null,
      },
      {
        id: 2,
        parcel_code: 'CMD-71504-18',
        product_id: 3,
        store_id: 2,
        qty: 1,
        unit_eur: 89.0,
        gross_eur: 89.0,
        commission_pct: 10,
        admin_fee_eur: 8.9,
        seller_net_eur: 80.1,
        payment_currency: 'EUR',
        payment_method: 'Carte Bancaire Internationale',
        status: 'delivered',
        payout_released: false,
        tracking_number: 'YM55102938MA',
        buyer_city: 'Paris, France',
        origin: 'Casablanca · Stock Vérifié',
        created_at: hoursAgo(72),
        delivered_at: hoursAgo(4),
        released_at: null,
      },
    ],
    parcel_timeline: [
      {
        id: 1,
        order_id: 1,
        step_title: 'Commande payée & séquestrée',
        detail: 'Fonds verrouillés en séquestre multi-devises (98,00 € · Agadir, Maroc).',
        location: 'Plateforme Séquestre Yama Shop',
        created_at: hoursAgo(36),
      },
      {
        id: 2,
        order_id: 1,
        step_title: 'Expédié depuis fournisseur',
        detail: 'Colis pris en charge par le transporteur international (Suivi : YM78492014CN).',
        location: 'Shenzhen, Chine',
        created_at: hoursAgo(24),
      },
      {
        id: 3,
        order_id: 1,
        step_title: 'En transit aérien international',
        detail: 'Dédouanement export validé. Acheminement vers hub Afrique du Nord.',
        location: 'Hub Logistique International',
        created_at: hoursAgo(6),
      },
      {
        id: 4,
        order_id: 2,
        step_title: 'Commande payée & séquestrée',
        detail: 'Fonds sécurisés en séquestre (89,00 € · Paris, France).',
        location: 'Plateforme Séquestre Yama Shop',
        created_at: hoursAgo(72),
      },
      {
        id: 5,
        order_id: 2,
        step_title: 'Expédié',
        detail: 'Pris en charge par le transporteur (Suivi : YM55102938MA).',
        location: 'Casablanca, Maroc',
        created_at: hoursAgo(48),
      },
      {
        id: 6,
        order_id: 2,
        step_title: 'Livré',
        detail: 'Livraison confirmée par Koukoum Junior. Versement vendeur débloqué.',
        location: 'Paris, France',
        created_at: hoursAgo(4),
      },
    ],
    conversations: [
      {
        id: 1,
        order_id: 1,
        store_id: 1,
        flagged: false,
        created_at: hoursAgo(36),
      },
      {
        id: 2,
        order_id: 2,
        store_id: 2,
        flagged: false,
        created_at: hoursAgo(72),
      },
    ],
    chat_messages: [
      {
        id: 1,
        conversation_id: 1,
        sender_label: 'Système',
        body: 'Discussion sécurisée ouverte pour CMD-84920-41 (Agadir, Maroc). Les coordonnées personnelles sont automatiquement masquées.',
        created_at: hoursAgo(36),
      },
      {
        id: 2,
        conversation_id: 1,
        sender_label: 'Acheteur',
        body: 'Bonjour, le colis est-il déjà parti de l’entrepôt express ?',
        created_at: hoursAgo(20),
      },
      {
        id: 3,
        conversation_id: 1,
        sender_label: 'Vendeur',
        body: 'Bonjour ! Oui, il a été remis au transporteur sous le numéro YM78492014CN et vient de passer le hub international.',
        created_at: hoursAgo(18),
      },
      {
        id: 4,
        conversation_id: 2,
        sender_label: 'Système',
        body: 'Discussion sécurisée ouverte pour CMD-71504-18 (Paris, France).',
        created_at: hoursAgo(72),
      },
    ],
    support_tickets: [
      {
        id: 1,
        parcel_code: 'CMD-84920-41',
        ticket_type: 'payout_hold',
        description: 'Pourquoi le versement de 86,24 € est-il encore en attente ?',
        reply: 'Diagnostic automatique (CMD-84920-41) : statut "shipped". Tant que le colis n’est pas livré et validé, votre part nette (86.24 €) reste bloquée en séquestre.',
        created_at: hoursAgo(5),
      },
    ],
    counters: {
      store: 2,
      product: 4,
      order: 2,
      step: 6,
      conv: 2,
      msg: 4,
      ticket: 1,
    },
  };
}

export function maskPrivateInfo(text: string): string {
  return String(text || '')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email masqué]')
    .replace(/(\+?\d[\d\s\-().]{6,}\d)/g, '[numéro masqué]')
    .replace(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi, '[lien masqué]');
}

export function buildPlatformState(db: DatabaseSchema): PlatformState {
  const storeMap = new Map<number, Store>(db.stores.map((s) => [s.id, s]));
  const productMap = new Map<number, Product>(db.products.map((p) => [p.id, p]));

  const products: Product[] = [...db.products]
    .sort((a, b) => b.id - a.id)
    .map((p) => ({
      ...p,
      store_name: storeMap.get(p.store_id)?.name || p.store_name,
    }));

  const timelinesByOrder = new Map<number, ParcelStep[]>();
  for (const step of db.parcel_timeline) {
    const list = timelinesByOrder.get(step.order_id) || [];
    list.push(step);
    timelinesByOrder.set(step.order_id, list);
  }

  const orders: Order[] = [...db.orders]
    .sort((a, b) => b.id - a.id)
    .map((o) => ({
      ...o,
      product_title: productMap.get(o.product_id)?.title || 'Produit Yama Shop',
      store_name: storeMap.get(o.store_id)?.name || 'Boutique Yama Shop',
      timeline: (timelinesByOrder.get(o.id) || []).sort((x, y) => x.id - y.id),
    }));

  const orderMap = new Map<number, Order>(orders.map((o) => [o.id, o]));
  const msgsByConv = new Map<number, ChatMessage[]>();
  for (const m of db.chat_messages) {
    const list = msgsByConv.get(m.conversation_id) || [];
    list.push(m);
    msgsByConv.set(m.conversation_id, list);
  }

  const conversations: Conversation[] = [...db.conversations]
    .sort((a, b) => b.id - a.id)
    .map((c) => {
      const ord = orderMap.get(c.order_id);
      return {
        id: c.id,
        order_id: c.order_id,
        parcel_code: ord?.parcel_code || `CMD-${c.order_id}`,
        product_title: ord?.product_title || 'Commande',
        store_name: storeMap.get(c.store_id)?.name || 'Boutique',
        flagged: c.flagged,
        messages: (msgsByConv.get(c.id) || []).sort((x, y) => x.id - y.id),
      };
    });

  return {
    adminName: ADMIN_NAME,
    stores: [...db.stores].sort((a, b) => a.id - b.id),
    products,
    orders,
    conversations,
    tickets: [...db.support_tickets].sort((a, b) => b.id - a.id),
  };
}
