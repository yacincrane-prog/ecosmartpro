import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface ApiToken {
  id: string;
  token: string;
  label: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface SyncedOrder {
  id: string;
  product_name: string;
  product_variant: string;
  status: string;
  price: number;
  amount: number;
  quantity: number;
  discount: number;
  delivery_type: string;
  delivery_provider: string;
  wilaya: string;
  commune: string;
  order_created_at: string;
  synced_at: string;
}

interface SyncedProduct {
  id: string;
  name: string;
  alias_name: string;
  sale_price: number;
  purchase_price: number;
  qty: number;
  synced_at: string;
}

interface SyncedDeliveryPrice {
  id: string;
  wilaya_name: string;
  home_price: number;
  office_price: number;
  synced_at: string;
}

interface SyncState {
  tokens: ApiToken[];
  orders: SyncedOrder[];
  products: SyncedProduct[];
  deliveryPrices: SyncedDeliveryPrice[];
  loading: boolean;
  fetchApiTokens: () => Promise<void>;
  createApiToken: (label: string) => Promise<ApiToken | null>;
  deleteApiToken: (id: string) => Promise<void>;
  fetchSyncedOrders: () => Promise<void>;
  fetchSyncedProducts: () => Promise<void>;
  fetchSyncedDeliveryPrices: () => Promise<void>;
  fetchAllSyncedData: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  tokens: [],
  orders: [],
  products: [],
  deliveryPrices: [],
  loading: false,

  fetchApiTokens: async () => {
    const { data } = await supabase
      .from('api_tokens' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (data) set({ tokens: data as any });
  },

  createApiToken: async (label: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('api_tokens' as any)
      .insert({ user_id: user.id, label } as any)
      .select()
      .single();
    if (!error && data) {
      await get().fetchApiTokens();
      return data as any;
    }
    return null;
  },

  deleteApiToken: async (id: string) => {
    await supabase.from('api_tokens' as any).delete().eq('id', id);
    await get().fetchApiTokens();
  },

  fetchSyncedOrders: async () => {
    const { data } = await supabase
      .from('synced_orders' as any)
      .select('*')
      .order('order_created_at', { ascending: false });
    if (data) set({ orders: data as any });
  },

  fetchSyncedProducts: async () => {
    const { data } = await supabase
      .from('synced_products' as any)
      .select('*')
      .order('name');
    if (data) set({ products: data as any });
  },

  fetchSyncedDeliveryPrices: async () => {
    const { data } = await supabase
      .from('synced_delivery_prices' as any)
      .select('*')
      .order('wilaya_name');
    if (data) set({ deliveryPrices: data as any });
  },

  fetchAllSyncedData: async () => {
    set({ loading: true });
    await Promise.all([
      get().fetchSyncedOrders(),
      get().fetchSyncedProducts(),
      get().fetchSyncedDeliveryPrices(),
    ]);
    set({ loading: false });
  },
}));
