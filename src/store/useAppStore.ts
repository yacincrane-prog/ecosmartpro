import { create } from 'zustand';
import { ProductInput, GlobalSettings } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppState {
  products: ProductInput[];
  settings: GlobalSettings;
  loading: boolean;
  fetchProducts: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  addProduct: (product: Omit<ProductInput, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<ProductInput>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<GlobalSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>()((set, get) => ({
  products: [],
  settings: {
    currencyRate: 137,
    returnCost: 400,
    operationCostPerOrder: 50,
    confirmationCost: 50,
  },
  loading: true,

  fetchProducts: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    const products: ProductInput[] = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      purchasePrice: Number(p.purchase_price),
      sellingPrice: Number(p.selling_price),
      receivedOrders: p.received_orders,
      confirmedOrders: p.confirmed_orders,
      deliveredOrders: p.delivered_orders,
      adSpendUSD: Number(p.ad_spend_usd),
      deliveryDiscount: Number(p.delivery_discount),
      packagingCost: Number(p.packaging_cost),
      dateFrom: p.date_from,
      dateTo: p.date_to,
      createdAt: p.created_at,
    }));

    set({ products, loading: false });
  },

  fetchSettings: async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      set({ loading: false });
      return;
    }

    if (data) {
      set({
        settings: {
          currencyRate: Number(data.currency_rate),
          returnCost: Number(data.return_cost),
          operationCostPerOrder: Number(data.operation_cost_per_order),
          confirmationCost: Number(data.confirmation_cost),
        },
        loading: false,
      });
    } else {
      set({ loading: false });
    }
  },

  addProduct: async (product) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('products').insert({
      user_id: user.id,
      name: product.name,
      purchase_price: product.purchasePrice,
      selling_price: product.sellingPrice,
      received_orders: product.receivedOrders,
      confirmed_orders: product.confirmedOrders,
      delivered_orders: product.deliveredOrders,
      ad_spend_usd: product.adSpendUSD,
      delivery_discount: product.deliveryDiscount,
      packaging_cost: product.packagingCost,
      date_from: product.dateFrom,
      date_to: product.dateTo,
    }).select().single();

    if (error) {
      toast.error('خطأ في إضافة المنتج');
      console.error(error);
      return;
    }

    if (data) {
      const newProduct: ProductInput = {
        id: data.id,
        name: data.name,
        purchasePrice: Number(data.purchase_price),
        sellingPrice: Number(data.selling_price),
        receivedOrders: data.received_orders,
        confirmedOrders: data.confirmed_orders,
        deliveredOrders: data.delivered_orders,
        adSpendUSD: Number(data.ad_spend_usd),
        deliveryDiscount: Number(data.delivery_discount),
        packagingCost: Number(data.packaging_cost),
        dateFrom: data.date_from,
        dateTo: data.date_to,
        createdAt: data.created_at,
      };
      set((state) => ({ products: [newProduct, ...state.products] }));
    }
  },

  updateProduct: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
    if (updates.receivedOrders !== undefined) dbUpdates.received_orders = updates.receivedOrders;
    if (updates.confirmedOrders !== undefined) dbUpdates.confirmed_orders = updates.confirmedOrders;
    if (updates.deliveredOrders !== undefined) dbUpdates.delivered_orders = updates.deliveredOrders;
    if (updates.adSpendUSD !== undefined) dbUpdates.ad_spend_usd = updates.adSpendUSD;
    if (updates.deliveryDiscount !== undefined) dbUpdates.delivery_discount = updates.deliveryDiscount;
    if (updates.packagingCost !== undefined) dbUpdates.packaging_cost = updates.packagingCost;
    if (updates.dateFrom !== undefined) dbUpdates.date_from = updates.dateFrom;
    if (updates.dateTo !== undefined) dbUpdates.date_to = updates.dateTo;

    const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);

    if (error) {
      toast.error('خطأ في تحديث المنتج');
      console.error(error);
      return;
    }

    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      toast.error('خطأ في حذف المنتج');
      console.error(error);
      return;
    }

    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
  },

  updateSettings: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbUpdates: any = {};
    if (updates.currencyRate !== undefined) dbUpdates.currency_rate = updates.currencyRate;
    if (updates.returnCost !== undefined) dbUpdates.return_cost = updates.returnCost;
    if (updates.operationCostPerOrder !== undefined) dbUpdates.operation_cost_per_order = updates.operationCostPerOrder;
    if (updates.confirmationCost !== undefined) dbUpdates.confirmation_cost = updates.confirmationCost;

    const { error } = await supabase
      .from('user_settings')
      .update(dbUpdates)
      .eq('user_id', user.id);

    if (error) {
      toast.error('خطأ في تحديث الإعدادات');
      console.error(error);
      return;
    }

    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },
}));
