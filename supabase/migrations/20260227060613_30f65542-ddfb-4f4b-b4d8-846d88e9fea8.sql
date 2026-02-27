
-- Create creative_generations table
CREATE TABLE public.creative_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  product_description TEXT DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'results',
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  creative_idea TEXT DEFAULT '',
  headline TEXT DEFAULT '',
  subheadline TEXT DEFAULT '',
  bullet_points TEXT[] DEFAULT '{}',
  cta_text TEXT DEFAULT '',
  text_layout TEXT DEFAULT '',
  generated_image_url TEXT DEFAULT '',
  source_images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creative_generations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own generations" ON public.creative_generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generations" ON public.creative_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations" ON public.creative_generations
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for creative images
INSERT INTO storage.buckets (id, name, public) VALUES ('creative-images', 'creative-images', true);

-- Storage policies
CREATE POLICY "Users can upload creative images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'creative-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view creative images" ON storage.objects
  FOR SELECT USING (bucket_id = 'creative-images');

CREATE POLICY "Users can delete their creative images" ON storage.objects
  FOR DELETE USING (bucket_id = 'creative-images' AND auth.uid() IS NOT NULL);
