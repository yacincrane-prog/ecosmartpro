
-- Landing page projects
CREATE TABLE public.landing_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT DEFAULT '',
  product_images TEXT[] DEFAULT '{}',
  target_audience TEXT DEFAULT '',
  price TEXT DEFAULT '',
  market_country TEXT DEFAULT 'الجزائر',
  desired_tone TEXT DEFAULT '',
  strategy_output JSONB,
  structure_output JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Landing page sections (per project)
CREATE TABLE public.landing_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.landing_projects(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  goal TEXT DEFAULT '',
  copy_direction TEXT DEFAULT '',
  generated_copy JSONB,
  image_url TEXT DEFAULT '',
  image_style TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.landing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own landing projects" ON public.landing_projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own landing sections" ON public.landing_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.landing_projects WHERE landing_projects.id = landing_sections.project_id AND landing_projects.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.landing_projects WHERE landing_projects.id = landing_sections.project_id AND landing_projects.user_id = auth.uid())
);

-- Update trigger
CREATE TRIGGER update_landing_projects_updated_at BEFORE UPDATE ON public.landing_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_landing_sections_updated_at BEFORE UPDATE ON public.landing_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
