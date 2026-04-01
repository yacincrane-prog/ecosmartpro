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

interface SyncedProduct {
  id: string;
  name: string;
  sale_price: number;
  purchase_price: number;
  delivery_discount: number;
  total_created: number;
  total_confirmed: number;
  total_delivered: number;
  total_returned: number;
  synced_at: string;
}

interface SyncedDailyStat {
  id: string;
  product_name: string;
  stat_date: string;
  created: number;
  confirmed: number;
  delivered: number;
  returned: number;
  synced_at: string;
}

interface SyncState {
  tokens: ApiToken[];
  products: SyncedProduct[];
  dailyStats: SyncedDailyStat[];
  loading: boolean;
  fetchApiTokens: () => Promise<void>;
  createApiToken: (label: string) => Promise<ApiToken | null>;
  deleteApiToken: (id: string) => Promise<void>;
  fetchSyncedProducts: () => Promise<void>;
  fetchSyncedDailyStats: () => Promise<void>;
  fetchAllSyncedData: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  tokens: [],
  products: [],
  dailyStats: [],
  loading: false,

  fetchApiTokens: async () => {
    const { data } = await supabase
      .from('api_tokens')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) set({ tokens: data as any });
  },

  createApiToken: async (label: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('api_tokens')
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
    await supabase.from('api_tokens').delete().eq('id', id);
    await get().fetchApiTokens();
  },

  fetchSyncedProducts: async () => {
    const { data } = await supabase
      .from('synced_products')
      .select('*')
      .order('name');
    if (data) set({ products: data as any });
  },

  fetchSyncedDailyStats: async () => {
    const { data } = await supabase
      .from('synced_daily_stats' as any)
      .select('*')
      .order('stat_date', { ascending: false });
    if (data) set({ dailyStats: data as any });
  },

  fetchAllSyncedData: async () => {
    set({ loading: true });
    await Promise.all([
      get().fetchSyncedProducts(),
      get().fetchSyncedDailyStats(),
    ]);
    set({ loading: false });
  },
}));
