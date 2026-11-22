export type CurrencyCode = 'MAD' | 'EUR' | 'USD' | 'GBP' | 'CAD' | 'XOF';

export type LogisticsModel = 'dropshipping' | 'stock';

export type ProductMode = 'dropshipping' | 'stock' | 'flash';

export type OrderStatus = 'placed' | 'shipped' | 'delivered';

export type UserRole = 'buyer' | 'seller' | 'admin';

export type AppTab = 'market' | 'seller' | 'messages' | 'support' | 'admin';

export interface CurrencyConfig {
  code: CurrencyCode;
  label: string;
  symbol: string;
  rateFromEur: number;
  decimals: number;
}

export interface ExchangeRatesResponse {
  base: 'EUR';
  source: 'live' | 'fallback';
  updatedAt: string;
  rates: Record<CurrencyCode, number>;
}

export interface Store {
  id: number;
  name: string;
  logistics: LogisticsModel;
  commission_pct: number;
  created_at: string;
}

export interface Product {
  id: number;
  store_id: number;
  store_name: string;
  title: string;
  category: string;
  mode: ProductMode;
  price_eur: number;
  old_eur: number | null;
  stock: number;
  origin: string;
  image_url: string | null;
  description: string;
  lead_time_days: string;
  created_at: string;
}

export interface ParcelStep {
  id: number;
  order_id: number;
  step_title: string;
  detail: string;
  location: string;
  created_at: string;
}

export interface Order {
  id: number;
  parcel_code: string;
  product_id: number;
  product_title: string;
  store_id: number;
  store_name: string;
  qty: number;
  unit_eur: number;
  gross_eur: number;
  commission_pct: number;
  admin_fee_eur: number;
  seller_net_eur: number;
  payment_currency: CurrencyCode;
  payment_method: string;
  status: OrderStatus;
  payout_released: boolean;
  tracking_number: string;
  buyer_city: string;
  origin: string;
  created_at: string;
  delivered_at: string | null;
  released_at: string | null;
  timeline: ParcelStep[];
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_label: string;
  body: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  order_id: number;
  parcel_code: string;
  product_title: string;
  store_name: string;
  flagged: boolean;
  messages: ChatMessage[];
}

export type SupportTicketType = 'payout_hold' | 'commission' | 'tracking';

export interface SupportTicket {
  id: number;
  parcel_code: string;
  ticket_type: SupportTicketType;
  description: string;
  reply: string;
  created_at: string;
}

export interface PlatformState {
  adminName: string;
  stores: Store[];
  products: Product[];
  orders: Order[];
  conversations: Conversation[];
  tickets: SupportTicket[];
}
