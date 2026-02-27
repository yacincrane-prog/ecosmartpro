
-- Storage bucket for test product images
INSERT INTO storage.buckets (id, name, public) VALUES ('test-product-images', 'test-product-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload test product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'test-product-images');
CREATE POLICY "Users can view test product images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'test-product-images');
CREATE POLICY "Users can delete test product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'test-product-images');
CREATE POLICY "Public can view test product images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'test-product-images');

-- Test products table
CREATE TABLE public.test_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trashed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own test products" ON public.test_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own test products" ON public.test_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own test products" ON public.test_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own test products" ON public.test_products FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_test_products_updated_at BEFORE UPDATE ON public.test_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Competitors table
CREATE TABLE public.test_product_competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_product_id UUID NOT NULL REFERENCES public.test_products(id) ON DELETE CASCADE,
  website_url TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  selling_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_product_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own competitors" ON public.test_product_competitors FOR SELECT USING (EXISTS (SELECT 1 FROM public.test_products WHERE test_products.id = test_product_competitors.test_product_id AND test_products.user_id = auth.uid()));
CREATE POLICY "Users can create their own competitors" ON public.test_product_competitors FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.test_products WHERE test_products.id = test_product_competitors.test_product_id AND test_products.user_id = auth.uid()));
CREATE POLICY "Users can update their own competitors" ON public.test_product_competitors FOR UPDATE USING (EXISTS (SELECT 1 FROM public.test_products WHERE test_products.id = test_product_competitors.test_product_id AND test_products.user_id = auth.uid()));
CREATE POLICY "Users can delete their own competitors" ON public.test_product_competitors FOR DELETE USING (EXISTS (SELECT 1 FROM public.test_products WHERE test_products.id = test_product_competitors.test_product_id AND test_products.user_id = auth.uid()));

-- Scores table
CREATE TABLE public.test_product_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_product_id UUID NOT NULL REFERENCES public.test_products(id) ON DELETE CASCADE UNIQUE,
  solves_problem INTEGER NOT NULL DEFAULT 0 CHECK (solves_problem >= 0 AND solves_problem <= 5),
  wow_factor INTEGER NOT NULL DEFAULT 0 CHECK (wow_factor >= 0 AND wow_factor <= 5),
  has_videos INTEGER NOT NULL DEFAULT 0 CHECK (has_videos >= 0 AND has_videos <= 5),
  small_no_variants INTEGER NOT NULL DEFAULT 0 CHECK (small_no_variants >= 0 AND small_no_variants <= 5),
  selling_now INTEGER NOT NULL DEFAULT 0 CHECK (selling_now >= 0 AND selling_now <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_product_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scores" ON public.test_product_scores FOR SELECT USING (EXISTS (SELECT 1 FROM public.test_products WHERE test_products.id = test_product_scores.test_product_id AND test_products.user_id = auth.uid()));
CREATE POLICY "Users can create their own scores" ON public.test_product_scores FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.test_products WHERE test_products.id = test_product_scores.test_product_id AND test_products.user_id = auth.uid()));
CREATE POLICY "Users can update their own scores" ON public.test_product_scores FOR UPDATE USING (EXISTS (SELECT 1 FROM public.test_products WHERE test_products.id = test_product_scores.test_product_id AND test_products.user_id = auth.uid()));
CREATE POLICY "Users can delete their own scores" ON public.test_product_scores FOR DELETE USING (EXISTS (SELECT 1 FROM public.test_products WHERE test_products.id = test_product_scores.test_product_id AND test_products.user_id = auth.uid()));

CREATE TRIGGER update_test_product_scores_updated_at BEFORE UPDATE ON public.test_product_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
