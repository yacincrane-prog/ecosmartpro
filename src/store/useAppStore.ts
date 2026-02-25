import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductInput, GlobalSettings } from '@/types/product';

interface AppState {
  products: ProductInput[];
  settings: GlobalSettings;
  addProduct: (product: ProductInput) => void;
  updateProduct: (id: string, product: Partial<ProductInput>) => void;
  deleteProduct: (id: string) => void;
  updateSettings: (settings: Partial<GlobalSettings>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      products: [],
      settings: {
        currencyRate: 137,
        returnCost: 400,
        operationCostPerOrder: 50,
        confirmationCost: 50,
      },
      addProduct: (product) =>
        set((state) => ({ products: [...state.products, product] })),
      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
    }),
    { name: 'product-analyzer-storage' }
  )
);
