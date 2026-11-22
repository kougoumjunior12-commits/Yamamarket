import {
  ADMIN_NAME,
  FALLBACK_RATES,
  buildPlatformState,
  createInitialData,
  maskPrivateInfo,
  type DatabaseSchema,
} from '../shared/seed.ts';
import type {
  ChatMessage,
  CurrencyCode,
  ExchangeRatesResponse,
  Product,
  Store,
  SupportTicket,
  SupportTicketType,
} from '../shared/types.ts';

const DB_STORAGE_KEY = 'yama_shop_local_db_v1';
const LOCAL_ADMIN_PIN = 'junior2026';

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

type RequestBody = Record<string, unknown> | undefined;

function loadDb(): DatabaseSchema {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (Array.isArray(parsed.products) && parsed.counters) return parsed;
    }
  } catch {
    // corrupted or unavailable storage: fall through to fresh demo data
  }
  const fresh = createInitialData();
  saveDb(fresh);
  return fresh;
}

function saveDb(db: DatabaseSchema) {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // storage quota or private mode: keep working in memory
  }
}

let memoryDb: DatabaseSchema | null = null;

function getDb(): DatabaseSchema {
  if (!memoryDb) memoryDb = loadDb();
  return memoryDb;
}

function commit(db: DatabaseSchema) {
  memoryDb = db;
  saveDb(db);
}

const ok = <T,>(data: T, status = 200): ApiResult<T> => ({ ok: true, status, data });
const fail = (error: string, status = 400): ApiResult<{ error: string }> => ({
  ok: false,
  status,
  data: { error },
});

const nowIso = () => new Date().toISOString();

function pushStep(db: DatabaseSchema, orderId: number, stepTitle: string, detail: string, location: string, createdAt = nowIso()) {
  db.counters.step += 1;
  db.parcel_timeline.push({
    id: db.counters.step,
    order_id: orderId,
    step_title: stepTitle,
    detail,
    location,
    created_at: createdAt,
  });
}

const FALLBACK_IMAGES: Record<string, string> = {
  'Électronique': '/src/assets/images/prod_anc_headphones_1795349285942.jpg',
  'Maison & Déco': '/src/assets/images/prod_led_lamp_1795349285013.jpg',
  'Beauté & Sport': '/src/assets/images/prod_smart_watch_1795349287172.jpg',
  'Mode & Accessoires': '/src/assets/images/prod_waterproof_bag_1795349285936.jpg',
};

export function localRequest(
  method: string,
  path: string,
  body: RequestBody = undefined,
  headers: Record<string, string> = {}
): ApiResult {
  const db = getDb();
  const [route] = path.split('?');
  const segments = route.replace(/^\/api\//, '').split('/');
  const id = Number(segments[1]);
  const isAdmin = headers['x-role'] === 'admin' && headers['x-admin-pin'] === LOCAL_ADMIN_PIN;

  if (method === 'GET' && route === '/api/state') {
    return ok(buildPlatformState(db));
  }

  if (method === 'GET' && route === '/api/rates') {
    const payload: ExchangeRatesResponse = {
      base: 'EUR',
      source: 'fallback',
      updatedAt: nowIso(),
      rates: FALLBACK_RATES,
    };
    return ok(payload);
  }

  if (method === 'POST' && route === '/api/admin/verify') {
    if (String(body?.pin || '') !== LOCAL_ADMIN_PIN) {
      return fail(`Code PIN invalide pour ${ADMIN_NAME}.`, 403);
    }
    return ok({ verified: true, adminName: ADMIN_NAME });
  }

  if (method === 'POST' && route === '/api/stores') {
    const name = String(body?.name || '').trim();
    const logistics = body?.logistics;
    if (!name || (logistics !== 'dropshipping' && logistics !== 'stock')) {
      return fail('Nom de boutique et modèle logistique requis.');
    }
    const existing = db.stores.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.logistics = logistics;
      commit(db);
      return ok(existing);
    }
    db.counters.store += 1;
    const store: Store = {
      id: db.counters.store,
      name,
      logistics,
      commission_pct: 12,
      created_at: nowIso(),
    };
    db.stores.push(store);
    commit(db);
    return ok(store, 201);
  }

  if (method === 'POST' && route === '/api/products') {
    const storeId = Number(body?.storeId);
    const title = String(body?.title || '').trim();
    const category = String(body?.category || '').trim();
    const mode = body?.mode as Product['mode'];
    const priceEur = Number(body?.priceEur);
    const stock = Number(body?.stock);
    const origin = String(body?.origin || 'International').trim();
    const description = String(body?.description || '').trim();
    const store = db.stores.find((s) => s.id === storeId);
    if (
      !store ||
      !title ||
      !category ||
      !['dropshipping', 'stock', 'flash'].includes(mode) ||
      !(priceEur > 0) ||
      !(stock >= 0)
    ) {
      return fail('Données produit invalides.');
    }
    db.counters.product += 1;
    const product: Product = {
      id: db.counters.product,
      store_id: store.id,
      store_name: store.name,
      title,
      category,
      mode,
      price_eur: Number(priceEur.toFixed(2)),
      old_eur: Number((priceEur * 1.32).toFixed(2)),
      stock: Math.floor(stock),
      origin,
      image_url: FALLBACK_IMAGES[category] || null,
      description: description || `${title} expédié depuis ${origin} avec protection acheteur Yama Shop.`,
      lead_time_days: mode === 'stock' ? '2–4 jours ouvrés' : '5–9 jours ouvrés',
      created_at: nowIso(),
    };
    db.products.push(product);
    commit(db);
    return ok(product, 201);
  }

  if (method === 'POST' && route === '/api/orders') {
    const items = body?.items as { productId: number; qty: number }[] | undefined;
    const buyerCity = String(body?.buyerCity || '').trim();
    const paymentCurrency = String(body?.paymentCurrency || 'EUR').toUpperCase() as CurrencyCode;
    const paymentMethod = String(body?.paymentMethod || 'Carte Bancaire 3D-Secure').trim();
    if (!Array.isArray(items) || items.length === 0 || !buyerCity) {
      return fail('Panier ou destination de livraison manquant.');
    }

    const lines: { prod: Product; store: Store; qty: number }[] = [];
    for (const item of items) {
      const qty = Math.floor(Number(item.qty));
      const prod = db.products.find((p) => p.id === Number(item.productId));
      if (!prod || !(qty > 0) || prod.stock < qty) {
        return fail(`Stock insuffisant pour ${prod ? prod.title : 'un produit du panier'}.`);
      }
      const store = db.stores.find((s) => s.id === prod.store_id);
      if (!store) return fail('Boutique vendeur introuvable.');
      lines.push({ prod, store, qty });
    }

    const parcelCodes: string[] = [];
    const created = nowIso();
    for (const { prod, store, qty } of lines) {
      const gross = Number((prod.price_eur * qty).toFixed(2));
      const pct = Number(store.commission_pct);
      const fee = Number(((gross * pct) / 100).toFixed(2));
      const parcelCode = `CMD-${Date.now().toString().slice(-5)}-${Math.floor(10 + Math.random() * 89)}`;

      db.counters.order += 1;
      const orderId = db.counters.order;
      db.orders.push({
        id: orderId,
        parcel_code: parcelCode,
        product_id: prod.id,
        store_id: store.id,
        qty,
        unit_eur: prod.price_eur,
        gross_eur: gross,
        commission_pct: pct,
        admin_fee_eur: fee,
        seller_net_eur: Number((gross - fee).toFixed(2)),
        payment_currency: paymentCurrency,
        payment_method: paymentMethod,
        status: 'placed',
        payout_released: false,
        tracking_number: 'En attente expédition',
        buyer_city: buyerCity,
        origin: prod.origin,
        created_at: created,
        delivered_at: null,
        released_at: null,
      });
      pushStep(
        db,
        orderId,
        'Commande payée & séquestrée',
        `Paiement (${paymentMethod}) validé et verrouillé en séquestre pour ${buyerCity}.`,
        'Séquestre Yama Shop',
        created
      );

      db.counters.conv += 1;
      const convId = db.counters.conv;
      db.conversations.push({ id: convId, order_id: orderId, store_id: store.id, flagged: false, created_at: created });
      db.counters.msg += 1;
      db.chat_messages.push({
        id: db.counters.msg,
        conversation_id: convId,
        sender_label: 'Système',
        body: `Discussion sécurisée ouverte pour ${parcelCode} (${buyerCity}). Les numéros, emails et liens externes sont masqués automatiquement.`,
        created_at: created,
      });

      prod.stock -= qty;
      parcelCodes.push(parcelCode);
    }
    commit(db);
    return ok({ success: true, parcelCodes }, 201);
  }

  if (segments[0] === 'orders' && Number.isFinite(id)) {
    const order = db.orders.find((o) => o.id === id);
    const action = segments[2];

    if (method === 'PATCH' && action === 'ship') {
      const trackingNumber = String(body?.trackingNumber || '').trim();
      if (trackingNumber.length < 4) return fail('Numéro de suivi invalide (minimum 4 caractères).');
      if (!order || order.status === 'delivered') return fail('Commande introuvable ou déjà livrée.', 404);
      order.status = 'shipped';
      order.tracking_number = trackingNumber.toUpperCase();
      pushStep(
        db,
        id,
        'Expédié',
        `Colis remis au transporteur international (Suivi : ${order.tracking_number}). Fonds maintenus en séquestre.`,
        order.origin
      );
      commit(db);
      return ok({ success: true });
    }

    if (method === 'PATCH' && action === 'transit') {
      const stepTitle = String(body?.stepTitle || '').trim();
      const location = String(body?.location || '').trim();
      const detail = String(body?.detail || '').trim();
      if (!order || order.status === 'delivered') return fail('Commande introuvable ou déjà livrée.', 404);
      if (!stepTitle || !location) return fail('Étape et localisation requises.');
      if (order.status === 'placed') order.status = 'shipped';
      pushStep(db, id, stepTitle, detail || `Mise à jour transporteur à ${location}. Séquestre actif jusqu'à livraison.`, location);
      commit(db);
      return ok({ success: true });
    }

    if (method === 'POST' && action === 'payout') {
      if (!order) return fail('Commande introuvable.', 404);
      if (order.status !== 'delivered') {
        return fail('Paiement bloqué : tant que le produit n’a pas été livré au client, le vendeur ne peut pas encaisser.', 403);
      }
      if (order.payout_released) return fail('Ce montant a déjà été versé.', 409);
      order.payout_released = true;
      order.released_at = nowIso();
      pushStep(
        db,
        id,
        'Versement vendeur effectué',
        `Part nette vendeur (${order.seller_net_eur.toFixed(2)} €) libérée depuis le compte séquestre.`,
        'Trésorerie Yama Shop',
        order.released_at
      );
      commit(db);
      return ok({ success: true, sellerNetEur: order.seller_net_eur });
    }
  }

  if (segments[0] === 'admin') {
    if (!isAdmin) {
      return fail(`Accès réservé à l'administrateur ${ADMIN_NAME}. Vérifiez votre code PIN.`, 403);
    }
    const targetId = Number(segments[2]);

    if (method === 'PATCH' && segments[1] === 'orders' && segments[3] === 'deliver') {
      const order = db.orders.find((o) => o.id === targetId);
      if (!order) return fail('Commande introuvable.', 404);
      if (order.status !== 'delivered') {
        order.status = 'delivered';
        order.delivered_at = nowIso();
        pushStep(db, targetId, 'Livré', `Livraison confirmée par ${ADMIN_NAME}. Versement vendeur débloqué.`, order.buyer_city);
        commit(db);
      }
      return ok({ success: true });
    }

    if (method === 'PATCH' && segments[1] === 'stores' && segments[3] === 'commission') {
      const pct = Number(body?.commissionPct);
      if (Number.isNaN(pct) || pct < 0 || pct > 80) return fail('Pourcentage invalide (0 à 80%).');
      const store = db.stores.find((s) => s.id === targetId);
      if (!store) return fail('Boutique introuvable.', 404);
      store.commission_pct = Number(pct.toFixed(2));
      commit(db);
      return ok({ success: true });
    }
  }

  if (segments[0] === 'conversations' && Number.isFinite(id)) {
    const conv = db.conversations.find((c) => c.id === id);
    if (method === 'POST' && segments[2] === 'messages') {
      const cleanBody = maskPrivateInfo(String(body?.body || '')).trim();
      if (!cleanBody) return fail('Message vide.');
      if (!conv) return fail('Conversation introuvable.', 404);
      db.counters.msg += 1;
      const msg: ChatMessage = {
        id: db.counters.msg,
        conversation_id: id,
        sender_label: String(body?.senderLabel || 'Acheteur').trim(),
        body: cleanBody,
        created_at: nowIso(),
      };
      db.chat_messages.push(msg);
      commit(db);
      return ok(msg, 201);
    }
    if (method === 'POST' && segments[2] === 'flag') {
      if (!conv) return fail('Conversation introuvable.', 404);
      conv.flagged = true;
      commit(db);
      return ok({ success: true });
    }
  }

  if (method === 'POST' && route === '/api/support') {
    const parcelCode = String(body?.parcelCode || '').trim().toUpperCase();
    const ticketType = body?.ticketType as SupportTicketType;
    const description = String(body?.description || '').trim();
    if (!['payout_hold', 'commission', 'tracking'].includes(ticketType) || !description) {
      return fail('Type de ticket et description requis.');
    }
    const ord = parcelCode
      ? db.orders.find((o) => o.parcel_code.toUpperCase() === parcelCode)
      : [...db.orders].sort((a, b) => b.id - a.id)[0];

    let reply = `Demande enregistrée et transmise à ${ADMIN_NAME}.`;
    if (ord) {
      if (ticketType === 'payout_hold') {
        reply =
          ord.status !== 'delivered'
            ? `Diagnostic automatique (${ord.parcel_code}) : statut "${ord.status}". Tant que le colis n'est pas livré, votre part nette (${ord.seller_net_eur.toFixed(2)} €) reste bloquée en séquestre.`
            : `Colis ${ord.parcel_code} livré ! Votre gain net de ${ord.seller_net_eur.toFixed(2)} € est déblocable dans l'Espace Vendeur.`;
      } else if (ticketType === 'commission') {
        reply = `Calcul automatique (${ord.parcel_code}) : Brut = ${ord.gross_eur.toFixed(2)} € | Commission ${ADMIN_NAME} (${ord.commission_pct}%) = ${ord.admin_fee_eur.toFixed(2)} € | Net Vendeur = ${ord.seller_net_eur.toFixed(2)} €.`;
      } else {
        const match = description.match(/\b[A-Z0-9]{6,22}\b/i);
        if (match && ord.status !== 'delivered') {
          const newTrack = match[0].toUpperCase();
          ord.tracking_number = newTrack;
          ord.status = 'shipped';
          pushStep(db, ord.id, 'Expédié', `Suivi mis à jour via Support Actif : ${newTrack}`, ord.origin);
          reply = `Numéro de suivi ${newTrack} enregistré sur ${ord.parcel_code}. Le paiement reste en séquestre jusqu'à livraison.`;
        } else {
          reply = `Suivi actuel de ${ord.parcel_code} : ${ord.tracking_number} (${ord.status}).`;
        }
      }
    }

    db.counters.ticket += 1;
    const ticket: SupportTicket = {
      id: db.counters.ticket,
      parcel_code: ord ? ord.parcel_code : 'Général',
      ticket_type: ticketType,
      description,
      reply,
      created_at: nowIso(),
    };
    db.support_tickets.push(ticket);
    commit(db);
    return ok(ticket, 201);
  }

  return fail('Action indisponible en mode démo.', 404);
}
