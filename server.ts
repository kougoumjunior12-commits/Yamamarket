import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import type {
  ChatMessage,
  Conversation,
  CurrencyCode,
  ExchangeRatesResponse,
  Order,
  ParcelStep,
  PlatformState,
  Product,
  Store,
  SupportTicket,
  SupportTicketType,
} from './src/shared/types.ts';

import {
  ADMIN_NAME,
  FALLBACK_RATES,
  buildPlatformState as buildStateFromDb,
  createInitialData,
  maskPrivateInfo,
  type DatabaseSchema,
} from './src/shared/seed.ts';

const ADMIN_PIN = process.env.ADMIN_PIN || 'junior2026';
const PORT = Number(process.env.PORT || 3000);

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'yamashop-db.json');


function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch {
    const fallback = createInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

let db: DatabaseSchema = loadDb();

function saveDb() {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

// SSE clients for real-time updates
const sseClients = new Set<Response>();

function broadcastStateUpdate(reason: string) {
  const payload = JSON.stringify({ reason, timestamp: new Date().toISOString() });
  for (const client of sseClients) {
    client.write(`event: state_updated\ndata: ${payload}\n\n`);
  }
}

function buildPlatformState(): PlatformState {
  return buildStateFromDb(db);
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.headers['x-role'];
  const pin = req.headers['x-admin-pin'];
  if (role !== 'admin' || pin !== ADMIN_PIN) {
    res.status(403).json({
      error: `Accès réservé à l'administrateur ${ADMIN_NAME}. Vérifiez votre code PIN.`,
    });
    return;
  }
  next();
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '64kb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Real-time Server-Sent Events stream
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      res.write(`: keep-alive\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // 1. Load complete platform state
  app.get('/api/state', (_req, res) => {
    res.json(buildPlatformState());
  });

  // 1b. Real-time exchange rates (EUR base) from live forex API with 10m cache
  let ratesCache: { expiresAt: number; payload: ExchangeRatesResponse } | null = null;

  app.get('/api/rates', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const now = Date.now();
    if (!forceRefresh && ratesCache && ratesCache.expiresAt > now) {
      res.json(ratesCache.payload);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const upstream = await fetch('https://open.er-api.com/v6/latest/EUR', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!upstream.ok) {
        throw new Error(`HTTP ${upstream.status}`);
      }
      const json = (await upstream.json()) as {
        result?: string;
        rates?: Record<string, number>;
      };
      if (json.result !== 'success' || !json.rates) {
        throw new Error('Invalid forex payload');
      }

      const nextRates: Record<CurrencyCode, number> = {
        EUR: 1,
        MAD: Number(json.rates.MAD) || FALLBACK_RATES.MAD,
        USD: Number(json.rates.USD) || FALLBACK_RATES.USD,
        GBP: Number(json.rates.GBP) || FALLBACK_RATES.GBP,
        CAD: Number(json.rates.CAD) || FALLBACK_RATES.CAD,
        XOF: Number(json.rates.XOF) || FALLBACK_RATES.XOF,
      };

      const payload: ExchangeRatesResponse = {
        base: 'EUR',
        source: 'live',
        updatedAt: new Date().toISOString(),
        rates: nextRates,
      };

      ratesCache = { expiresAt: now + 10 * 60 * 1000, payload };
      res.json(payload);
    } catch {
      const fallbackPayload: ExchangeRatesResponse = {
        base: 'EUR',
        source: 'fallback',
        updatedAt: new Date().toISOString(),
        rates: FALLBACK_RATES,
      };
      ratesCache = { expiresAt: now + 2 * 60 * 1000, payload: fallbackPayload };
      res.json(fallbackPayload);
    }
  });

  // Verify admin PIN without exposing it
  app.post('/api/admin/verify', (req, res) => {
    const pin = String(req.body?.pin || '');
    if (pin !== ADMIN_PIN) {
      res.status(403).json({ error: `Code PIN invalide pour ${ADMIN_NAME}.` });
      return;
    }
    res.json({ verified: true, adminName: ADMIN_NAME });
  });

  // 2. Seller: create or update store
  app.post('/api/stores', (req, res) => {
    const name = String(req.body?.name || '').trim();
    const logistics = req.body?.logistics;
    if (!name || (logistics !== 'dropshipping' && logistics !== 'stock')) {
      res.status(400).json({ error: 'Nom de boutique et modèle logistique requis.' });
      return;
    }

    const existing = db.stores.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.logistics = logistics;
      saveDb();
      broadcastStateUpdate('store_updated');
      res.status(200).json(existing);
      return;
    }

    db.counters.store += 1;
    const newStore: Store = {
      id: db.counters.store,
      name,
      logistics,
      commission_pct: 12,
      created_at: new Date().toISOString(),
    };
    db.stores.push(newStore);
    saveDb();
    broadcastStateUpdate('store_created');
    res.status(201).json(newStore);
  });

  // 3. Seller: publish product
  app.post('/api/products', (req, res) => {
    const storeId = Number(req.body?.storeId);
    const title = String(req.body?.title || '').trim();
    const category = String(req.body?.category || '').trim();
    const mode = req.body?.mode;
    const priceEur = Number(req.body?.priceEur);
    const stock = Number(req.body?.stock);
    const origin = String(req.body?.origin || 'International').trim();
    const description = String(req.body?.description || '').trim();

    const store = db.stores.find((s) => s.id === storeId);
    if (
      !store ||
      !title ||
      !category ||
      !['dropshipping', 'stock', 'flash'].includes(mode) ||
      Number.isNaN(priceEur) ||
      priceEur <= 0 ||
      Number.isNaN(stock) ||
      stock < 0
    ) {
      res.status(400).json({ error: 'Données produit invalides.' });
      return;
    }

    const fallbackImages: Record<string, string> = {
      'Électronique': '/src/assets/images/prod_anc_headphones_1795349285942.jpg',
      'Maison & Déco': '/src/assets/images/prod_led_lamp_1795349285013.jpg',
      'Beauté & Sport': '/src/assets/images/prod_smart_watch_1795349287172.jpg',
      'Mode & Accessoires': '/src/assets/images/prod_waterproof_bag_1795349285936.jpg',
    };

    db.counters.product += 1;
    const newProduct: Product = {
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
      image_url: fallbackImages[category] || null,
      description: description || `${title} expédié depuis ${origin} avec protection acheteur Yama Shop.`,
      lead_time_days: mode === 'stock' ? '2–4 jours ouvrés' : '5–9 jours ouvrés',
      created_at: new Date().toISOString(),
    };

    db.products.push(newProduct);
    saveDb();
    broadcastStateUpdate('product_created');
    res.status(201).json(newProduct);
  });

  // 4. Buyer: place order (automatic escrow & commission calculation)
  app.post('/api/orders', (req, res) => {
    const items = req.body?.items;
    const buyerCity = String(req.body?.buyerCity || '').trim();
    const paymentCurrency = (String(req.body?.paymentCurrency || 'EUR').toUpperCase()) as CurrencyCode;
    const paymentMethod = String(req.body?.paymentMethod || 'Carte Bancaire 3D-Secure').trim();

    if (!Array.isArray(items) || items.length === 0 || !buyerCity) {
      res.status(400).json({ error: 'Panier ou destination de livraison manquant.' });
      return;
    }

    // Validate all items atomically before mutating state
    const validatedLines: { prod: Product; store: Store; qty: number }[] = [];
    for (const item of items) {
      const productId = Number(item.productId);
      const qty = Math.floor(Number(item.qty));
      const prod = db.products.find((p) => p.id === productId);
      if (!prod || qty <= 0 || prod.stock < qty) {
        res.status(400).json({
          error: `Stock insuffisant pour ${prod ? prod.title : 'un produit du panier'}.`,
        });
        return;
      }
      const store = db.stores.find((s) => s.id === prod.store_id);
      if (!store) {
        res.status(400).json({ error: 'Boutique vendeur introuvable.' });
        return;
      }
      validatedLines.push({ prod, store, qty });
    }

    const createdParcelCodes: string[] = [];
    const nowIso = new Date().toISOString();

    for (const { prod, store, qty } of validatedLines) {
      const grossEur = Number((prod.price_eur * qty).toFixed(2));
      const pct = Number(store.commission_pct);
      const adminFeeEur = Number(((grossEur * pct) / 100).toFixed(2));
      const sellerNetEur = Number((grossEur - adminFeeEur).toFixed(2));
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
        gross_eur: grossEur,
        commission_pct: pct,
        admin_fee_eur: adminFeeEur,
        seller_net_eur: sellerNetEur,
        payment_currency: paymentCurrency,
        payment_method: paymentMethod,
        status: 'placed',
        payout_released: false,
        tracking_number: 'En attente expédition',
        buyer_city: buyerCity,
        origin: prod.origin,
        created_at: nowIso,
        delivered_at: null,
        released_at: null,
      });

      db.counters.step += 1;
      db.parcel_timeline.push({
        id: db.counters.step,
        order_id: orderId,
        step_title: 'Commande payée & séquestrée',
        detail: `Paiement (${paymentMethod}) validé et verrouillé en séquestre pour ${buyerCity}.`,
        location: 'Séquestre Yama Shop',
        created_at: nowIso,
      });

      db.counters.conv += 1;
      const convId = db.counters.conv;
      db.conversations.push({
        id: convId,
        order_id: orderId,
        store_id: store.id,
        flagged: false,
        created_at: nowIso,
      });

      db.counters.msg += 1;
      db.chat_messages.push({
        id: db.counters.msg,
        conversation_id: convId,
        sender_label: 'Système',
        body: `Discussion sécurisée ouverte pour ${parcelCode} (${buyerCity}). Les numéros, emails et liens externes sont masqués automatiquement.`,
        created_at: nowIso,
      });

      prod.stock -= qty;
      createdParcelCodes.push(parcelCode);
    }

    saveDb();
    broadcastStateUpdate('order_created');
    res.status(201).json({ success: true, parcelCodes: createdParcelCodes });
  });

  // 5. Seller: ship parcel with tracking number
  app.patch('/api/orders/:id/ship', (req, res) => {
    const orderId = Number(req.params.id);
    const trackingNumber = String(req.body?.trackingNumber || '').trim();
    if (trackingNumber.length < 4) {
      res.status(400).json({ error: 'Numéro de suivi invalide (minimum 4 caractères).' });
      return;
    }

    const order = db.orders.find((o) => o.id === orderId);
    if (!order || order.status === 'delivered') {
      res.status(404).json({ error: 'Commande introuvable ou déjà livrée.' });
      return;
    }

    order.status = 'shipped';
    order.tracking_number = trackingNumber.toUpperCase();

    db.counters.step += 1;
    db.parcel_timeline.push({
      id: db.counters.step,
      order_id: orderId,
      step_title: 'Expédié',
      detail: `Colis remis au transporteur international (Suivi : ${order.tracking_number}). Fonds maintenus en séquestre.`,
      location: order.origin,
      created_at: new Date().toISOString(),
    });

    saveDb();
    broadcastStateUpdate('order_shipped');
    res.json({ success: true });
  });

  // 5b. Real-time carrier checkpoint update
  app.patch('/api/orders/:id/transit', (req, res) => {
    const orderId = Number(req.params.id);
    const stepTitle = String(req.body?.stepTitle || '').trim();
    const location = String(req.body?.location || '').trim();
    const detail = String(req.body?.detail || '').trim();

    const order = db.orders.find((o) => o.id === orderId);
    if (!order || order.status === 'delivered') {
      res.status(404).json({ error: 'Commande introuvable ou déjà livrée.' });
      return;
    }
    if (!stepTitle || !location) {
      res.status(400).json({ error: 'Étape et localisation requises.' });
      return;
    }

    if (order.status === 'placed') {
      order.status = 'shipped';
    }

    db.counters.step += 1;
    db.parcel_timeline.push({
      id: db.counters.step,
      order_id: orderId,
      step_title: stepTitle,
      detail: detail || `Mise à jour transporteur à ${location}. Séquestre actif jusqu'à livraison.`,
      location,
      created_at: new Date().toISOString(),
    });

    saveDb();
    broadcastStateUpdate('order_transit_updated');
    res.json({ success: true });
  });

  // 6. Seller: claim payout (strictly blocked unless delivered)
  app.post('/api/orders/:id/payout', (req, res) => {
    const orderId = Number(req.params.id);
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    if (order.status !== 'delivered') {
      res.status(403).json({
        error: 'Paiement bloqué : tant que le produit n’a pas été livré au client, le vendeur ne peut pas encaisser.',
      });
      return;
    }
    if (order.payout_released) {
      res.status(409).json({ error: 'Ce montant a déjà été versé.' });
      return;
    }

    order.payout_released = true;
    order.released_at = new Date().toISOString();

    db.counters.step += 1;
    db.parcel_timeline.push({
      id: db.counters.step,
      order_id: orderId,
      step_title: 'Versement vendeur effectué',
      detail: `Part nette vendeur (${order.seller_net_eur.toFixed(2)} €) libérée depuis le compte séquestre.`,
      location: 'Trésorerie Yama Shop',
      created_at: order.released_at,
    });

    saveDb();
    broadcastStateUpdate('payout_released');
    res.json({ success: true, sellerNetEur: order.seller_net_eur });
  });

  // 7. Admin (Koukoum Junior): confirm delivery
  app.patch('/api/admin/orders/:id/deliver', requireAdmin, (req, res) => {
    const orderId = Number(req.params.id);
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    if (order.status === 'delivered') {
      res.json({ success: true });
      return;
    }

    const nowIso = new Date().toISOString();
    order.status = 'delivered';
    order.delivered_at = nowIso;

    db.counters.step += 1;
    db.parcel_timeline.push({
      id: db.counters.step,
      order_id: orderId,
      step_title: 'Livré',
      detail: `Livraison confirmée par ${ADMIN_NAME}. Versement vendeur débloqué.`,
      location: order.buyer_city,
      created_at: nowIso,
    });

    saveDb();
    broadcastStateUpdate('order_delivered');
    res.json({ success: true });
  });

  // 8. Admin (Koukoum Junior): update store commission
  app.patch('/api/admin/stores/:id/commission', requireAdmin, (req, res) => {
    const storeId = Number(req.params.id);
    const pct = Number(req.body?.commissionPct);
    if (Number.isNaN(pct) || pct < 0 || pct > 80) {
      res.status(400).json({ error: 'Pourcentage invalide (0 à 80%).' });
      return;
    }

    const store = db.stores.find((s) => s.id === storeId);
    if (!store) {
      res.status(404).json({ error: 'Boutique introuvable.' });
      return;
    }

    store.commission_pct = Number(pct.toFixed(2));
    saveDb();
    broadcastStateUpdate('commission_updated');
    res.json({ success: true });
  });

  // 9. Private Messaging Buyer <-> Seller (auto contact masking)
  app.post('/api/conversations/:id/messages', (req, res) => {
    const convId = Number(req.params.id);
    const senderLabel = String(req.body?.senderLabel || 'Acheteur').trim();
    const cleanBody = maskPrivateInfo(String(req.body?.body || '')).trim();
    if (!cleanBody) {
      res.status(400).json({ error: 'Message vide.' });
      return;
    }

    const conv = db.conversations.find((c) => c.id === convId);
    if (!conv) {
      res.status(404).json({ error: 'Conversation introuvable.' });
      return;
    }

    db.counters.msg += 1;
    const msg: ChatMessage = {
      id: db.counters.msg,
      conversation_id: convId,
      sender_label: senderLabel,
      body: cleanBody,
      created_at: new Date().toISOString(),
    };
    db.chat_messages.push(msg);
    saveDb();
    broadcastStateUpdate('message_sent');
    res.status(201).json(msg);
  });

  app.post('/api/conversations/:id/flag', (req, res) => {
    const convId = Number(req.params.id);
    const conv = db.conversations.find((c) => c.id === convId);
    if (!conv) {
      res.status(404).json({ error: 'Conversation introuvable.' });
      return;
    }
    conv.flagged = true;
    saveDb();
    broadcastStateUpdate('conversation_flagged');
    res.json({ success: true });
  });

  // 10. Active Support (automated diagnostic & resolution)
  app.post('/api/support', (req, res) => {
    const parcelCode = String(req.body?.parcelCode || '').trim().toUpperCase();
    const ticketType = req.body?.ticketType as SupportTicketType;
    const description = String(req.body?.description || '').trim();

    if (!['payout_hold', 'commission', 'tracking'].includes(ticketType) || !description) {
      res.status(400).json({ error: 'Type de ticket et description requis.' });
      return;
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
      } else if (ticketType === 'tracking') {
        const match = description.match(/\b[A-Z0-9]{6,22}\b/i);
        if (match && ord.status !== 'delivered') {
          const newTrack = match[0].toUpperCase();
          ord.tracking_number = newTrack;
          ord.status = 'shipped';
          db.counters.step += 1;
          db.parcel_timeline.push({
            id: db.counters.step,
            order_id: ord.id,
            step_title: 'Expédié',
            detail: `Suivi mis à jour via Support Actif : ${newTrack}`,
            location: ord.origin,
            created_at: new Date().toISOString(),
          });
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
      created_at: new Date().toISOString(),
    };
    db.support_tickets.push(ticket);
    saveDb();
    broadcastStateUpdate('support_resolved');
    res.status(201).json(ticket);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Yama Shop full-stack actif sur http://localhost:${PORT}`);
  });
}

startServer();
