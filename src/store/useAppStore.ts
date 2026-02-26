import { create } from 'zustand';
import { ProductWithPeriods, PeriodInput, GlobalSettings } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppState {
  products: ProductWithPeriods[];
  settings: GlobalSettings;
  loading: boolean;
  fetchProducts: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  addProduct: (name: string, period: Omit<PeriodInput, 'id' | 'productId' | 'createdAt'>) => Promise<void>;
  addPeriod: (productId: string, period: Omit<PeriodInput, 'id' | 'productId' | 'createdAt'>) => Promise<void>;
  updatePeriod: (periodId: string, updates: Partial<Omit<PeriodInput, 'id' | 'productId' | 'createdAt'>>) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateProduct: (id: string, updates: { name?: string }) => Promise<void>;
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
    const { data: productsData, error: pError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (pError) {
      console.error('Error fetching products:', pError);
      set({ loading: false });
      return;
    }

    const { data: periodsData, error: prError } = await supabase
      .from('product_periods')
      .select('*')
      .order('date_from', { ascending: false });

    if (prError) {
      console.error('Error fetching periods:', prError);
      set({ loading: false });
      return;
    }

    const products: ProductWithPeriods[] = (productsData || []).map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      periods: (periodsData || [])
        .filter((pr) => pr.product_id === p.id)
        .map((pr) => ({
          id: pr.id,
          productId: pr.product_id,
          purchasePrice: Number(pr.purchase_price),
          sellingPrice: Number(pr.selling_price),
          receivedOrders: pr.received_orders,
          confirmedOrders: pr.confirmed_orders,
          deliveredOrders: pr.delivered_orders,
          adSpendUSD: Number(pr.ad_spend_usd),
          deliveryDiscount: Number(pr.delivery_discount),
          packagingCost: Number(pr.packaging_cost),
          dateFrom: pr.date_from,
          dateTo: pr.date_to,
          createdAt: pr.created_at,
        })),
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

  addProduct: async (name, period) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: productData, error: pErr } = await supabase.from('products').insert({
      user_id: user.id,
      name,
    }).select().single();

    if (pErr || !productData) {
      toast.error('خطأ في إضافة المنتج');
      console.error(pErr);
      return;
    }

    const { data: periodData, error: prErr } = await supabase.from('product_periods').insert({
      product_id: productData.id,
      purchase_price: period.purchasePrice,
      selling_price: period.sellingPrice,
      received_orders: period.receivedOrders,
      confirmed_orders: period.confirmedOrders,
      delivered_orders: period.deliveredOrders,
      ad_spend_usd: period.adSpendUSD,
      delivery_discount: period.deliveryDiscount,
      packaging_cost: period.packagingCost,
      date_from: period.dateFrom,
      date_to: period.dateTo,
    }).select().single();

    if (prErr || !periodData) {
      toast.error('خطأ في إضافة الفترة');
      console.error(prErr);
      return;
    }

    const newProduct: ProductWithPeriods = {
      id: productData.id,
      name: productData.name,
      createdAt: productData.created_at,
      periods: [{
        id: periodData.id,
        productId: periodData.product_id,
        purchasePrice: Number(periodData.purchase_price),
        sellingPrice: Number(periodData.selling_price),
        receivedOrders: periodData.received_orders,
        confirmedOrders: periodData.confirmed_orders,
        deliveredOrders: periodData.delivered_orders,
        adSpendUSD: Number(periodData.ad_spend_usd),
        deliveryDiscount: Number(periodData.delivery_discount),
        packagingCost: Number(periodData.packaging_cost),
        dateFrom: periodData.date_from,
        dateTo: periodData.date_to,
        createdAt: periodData.created_at,
      }],
    };
    set((state) => ({ products: [newProduct, ...state.products] }));
  },

  addPeriod: async (productId, period) => {
    const { data, error } = await supabase.from('product_periods').insert({
      product_id: productId,
      purchase_price: period.purchasePrice,
      selling_price: period.sellingPrice,
      received_orders: period.receivedOrders,
      confirmed_orders: period.confirmedOrders,
      delivered_orders: period.deliveredOrders,
      ad_spend_usd: period.adSpendUSD,
      delivery_discount: period.deliveryDiscount,
      packaging_cost: period.packagingCost,
      date_from: period.dateFrom,
      date_to: period.dateTo,
    }).select().single();

    if (error || !data) {
      toast.error('خطأ في إضافة الفترة');
      console.error(error);
      return;
    }

    const newPeriod: PeriodInput = {
      id: data.id,
      productId: data.product_id,
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

    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...p, periods: [newPeriod, ...p.periods] } : p
      ),
    }));
  },

  updatePeriod: async (periodId, updates) => {
    const dbUpdates: any = {};
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

    const { error } = await supabase.from('product_periods').update(dbUpdates).eq('id', periodId);

    if (error) {
      toast.error('خطأ في تحديث الفترة');
      console.error(error);
      return;
    }

    set((state) => ({
      products: state.products.map((p) => ({
        ...p,
        periods: p.periods.map((pr) =>
          pr.id === periodId ? { ...pr, ...updates } : pr
        ),
      })),
    }));
  },

  deletePeriod: async (periodId) => {
    const { error } = await supabase.from('product_periods').delete().eq('id', periodId);

    if (error) {
      toast.error('خطأ في حذف الفترة');
      console.error(error);
      return;
    }

    set((state) => ({
      products: state.products.map((p) => ({
        ...p,
        periods: p.periods.filter((pr) => pr.id !== periodId),
      })),
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

  updateProduct: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;

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
