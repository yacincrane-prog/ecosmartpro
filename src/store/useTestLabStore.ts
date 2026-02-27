import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { TestProduct, TestCompetitor, TestProductScore } from '@/types/testProduct';
import { toast } from 'sonner';

interface TestLabState {
  products: TestProduct[];
  loading: boolean;
  fetchTestProducts: () => Promise<void>;
  addTestProduct: (name: string, description: string, imageUrl: string) => Promise<string | null>;
  updateTestProduct: (id: string, updates: { name?: string; description?: string; imageUrl?: string }) => Promise<void>;
  trashProduct: (id: string) => Promise<void>;
  restoreProduct: (id: string) => Promise<void>;
  deleteProductPermanently: (id: string) => Promise<void>;
  addCompetitor: (testProductId: string, competitor: Omit<TestCompetitor, 'id' | 'testProductId' | 'createdAt'>) => Promise<void>;
  deleteCompetitor: (id: string) => Promise<void>;
  saveScore: (testProductId: string, score: Omit<TestProductScore, 'id' | 'testProductId'>) => Promise<void>;
}

export const useTestLabStore = create<TestLabState>()((set, get) => ({
  products: [],
  loading: true,

  fetchTestProducts: async () => {
    const { data: products, error: pErr } = await supabase
      .from('test_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (pErr) { console.error(pErr); set({ loading: false }); return; }

    const { data: competitors } = await supabase.from('test_product_competitors').select('*');
    const { data: scores } = await supabase.from('test_product_scores').select('*');

    const mapped: TestProduct[] = (products || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      description: p.description || '',
      imageUrl: p.image_url || '',
      status: p.status,
      createdAt: p.created_at,
      competitors: (competitors || [])
        .filter((c: any) => c.test_product_id === p.id)
        .map((c: any) => ({
          id: c.id,
          testProductId: c.test_product_id,
          websiteUrl: c.website_url || '',
          videoUrl: c.video_url || '',
          sellingPrice: Number(c.selling_price),
          createdAt: c.created_at,
        })),
      score: (() => {
        const s = (scores || []).find((s: any) => s.test_product_id === p.id);
        if (!s) return null;
        return {
          id: s.id,
          testProductId: s.test_product_id,
          solvesProblem: s.solves_problem,
          wowFactor: s.wow_factor,
          hasVideos: s.has_videos,
          smallNoVariants: s.small_no_variants,
          sellingNow: s.selling_now,
        };
      })(),
    }));

    set({ products: mapped, loading: false });
  },

  addTestProduct: async (name, description, imageUrl) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.from('test_products').insert({
      user_id: user.id,
      name,
      description,
      image_url: imageUrl,
    }).select().single();

    if (error || !data) { toast.error('خطأ في إضافة المنتج'); return null; }

    const newProduct: TestProduct = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description || '',
      imageUrl: data.image_url || '',
      status: data.status as 'active' | 'trashed',
      createdAt: data.created_at,
      competitors: [],
      score: null,
    };

    set((s) => ({ products: [newProduct, ...s.products] }));
    return data.id;
  },

  updateTestProduct: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;

    const { error } = await supabase.from('test_products').update(dbUpdates).eq('id', id);
    if (error) { toast.error('خطأ في التحديث'); return; }

    set((s) => ({
      products: s.products.map((p) => p.id === id ? { ...p, ...updates } : p),
    }));
  },

  trashProduct: async (id) => {
    const { error } = await supabase.from('test_products').update({ status: 'trashed' }).eq('id', id);
    if (error) { toast.error('خطأ'); return; }
    set((s) => ({
      products: s.products.map((p) => p.id === id ? { ...p, status: 'trashed' as const } : p),
    }));
    toast.success('تم نقل المنتج إلى سلة المهملات');
  },

  restoreProduct: async (id) => {
    const { error } = await supabase.from('test_products').update({ status: 'active' }).eq('id', id);
    if (error) { toast.error('خطأ'); return; }
    set((s) => ({
      products: s.products.map((p) => p.id === id ? { ...p, status: 'active' as const } : p),
    }));
    toast.success('تم استرجاع المنتج');
  },

  deleteProductPermanently: async (id) => {
    const { error } = await supabase.from('test_products').delete().eq('id', id);
    if (error) { toast.error('خطأ في الحذف'); return; }
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    toast.success('تم حذف المنتج نهائيًا');
  },

  addCompetitor: async (testProductId, competitor) => {
    const { data, error } = await supabase.from('test_product_competitors').insert({
      test_product_id: testProductId,
      website_url: competitor.websiteUrl,
      video_url: competitor.videoUrl,
      selling_price: competitor.sellingPrice,
    }).select().single();

    if (error || !data) { toast.error('خطأ في إضافة المنافس'); return; }

    const newComp: TestCompetitor = {
      id: data.id,
      testProductId: data.test_product_id,
      websiteUrl: data.website_url || '',
      videoUrl: data.video_url || '',
      sellingPrice: Number(data.selling_price),
      createdAt: data.created_at,
    };

    set((s) => ({
      products: s.products.map((p) =>
        p.id === testProductId ? { ...p, competitors: [...p.competitors, newComp] } : p
      ),
    }));
  },

  deleteCompetitor: async (id) => {
    const { error } = await supabase.from('test_product_competitors').delete().eq('id', id);
    if (error) { toast.error('خطأ'); return; }
    set((s) => ({
      products: s.products.map((p) => ({
        ...p,
        competitors: p.competitors.filter((c) => c.id !== id),
      })),
    }));
  },

  saveScore: async (testProductId, score) => {
    const existing = get().products.find((p) => p.id === testProductId)?.score;

    if (existing) {
      const { error } = await supabase.from('test_product_scores').update({
        solves_problem: score.solvesProblem,
        wow_factor: score.wowFactor,
        has_videos: score.hasVideos,
        small_no_variants: score.smallNoVariants,
        selling_now: score.sellingNow,
      }).eq('id', existing.id);
      if (error) { toast.error('خطأ في حفظ التقييم'); return; }
    } else {
      const { error } = await supabase.from('test_product_scores').insert({
        test_product_id: testProductId,
        solves_problem: score.solvesProblem,
        wow_factor: score.wowFactor,
        has_videos: score.hasVideos,
        small_no_variants: score.smallNoVariants,
        selling_now: score.sellingNow,
      });
      if (error) { toast.error('خطأ في حفظ التقييم'); return; }
    }

    await get().fetchTestProducts();
    toast.success('تم حفظ التقييم');
  },
}));
