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

export interface SyncedProduct {
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

export interface SyncedDailyStat {
  id: string;
  product_name: string;
  stat_date: string;
  created: number;
  confirmed: number;
  delivered: number;
  returned: number;
  synced_at: string;
}

export interface ProductManualInputs {
  adSpend: number;
  packagingCost: number;
  salePriceOverride: number | null;
  purchasePriceOverride: number | null;
  deliveryDiscountOverride: number | null;
}

interface SyncState {
  tokens: ApiToken[];
  products: SyncedProduct[];
  dailyStats: SyncedDailyStat[];
  manualInputs: Record<string, ProductManualInputs>;
  loading: boolean;
  fetchApiTokens: () => Promise<void>;
  createApiToken: (label: string) => Promise<ApiToken | null>;
  deleteApiToken: (id: string) => Promise<void>;
  fetchSyncedProducts: () => Promise<void>;
  fetchSyncedDailyStats: () => Promise<void>;
  fetchManualInputs: () => Promise<void>;
  saveManualInput: (productName: string, field: 'adSpend' | 'packagingCost', value: number) => Promise<void>;
  fetchAllSyncedData: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  tokens: [],
  products: [],
  dailyStats: [],
  manualInputs: {},
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

  fetchManualInputs: async () => {
    const { data } = await supabase
      .from('synced_product_inputs' as any)
      .select('*');
    if (data) {
      const inputs: Record<string, ProductManualInputs> = {};
      (data as any[]).forEach((row: any) => {
        inputs[row.product_name] = {
          adSpend: Number(row.ad_spend),
          packagingCost: Number(row.packaging_cost),
          salePriceOverride: row.sale_price_override != null ? Number(row.sale_price_override) : null,
          purchasePriceOverride: row.purchase_price_override != null ? Number(row.purchase_price_override) : null,
          deliveryDiscountOverride: row.delivery_discount_override != null ? Number(row.delivery_discount_override) : null,
        };
      });
      set({ manualInputs: inputs });
    }
  },

  saveManualInput: async (productName: string, field: keyof ProductManualInputs, value: number | null) => {
    const current = get().manualInputs[productName] || { adSpend: 0, packagingCost: 0, salePriceOverride: null, purchasePriceOverride: null, deliveryDiscountOverride: null };
    const updated: ProductManualInputs = { ...current, [field]: value };

    set(state => ({
      manualInputs: { ...state.manualInputs, [productName]: updated },
    }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('synced_product_inputs' as any)
      .upsert({
        user_id: user.id,
        product_name: productName,
        ad_spend: updated.adSpend,
        packaging_cost: updated.packagingCost,
        sale_price_override: updated.salePriceOverride,
        purchase_price_override: updated.purchasePriceOverride,
        delivery_discount_override: updated.deliveryDiscountOverride,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'user_id,product_name' });
  },

  fetchAllSyncedData: async () => {
    set({ loading: true });
    await Promise.all([
      get().fetchSyncedProducts(),
      get().fetchSyncedDailyStats(),
      get().fetchManualInputs(),
    ]);
    set({ loading: false });
  },
}));
