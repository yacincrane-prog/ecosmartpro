import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface LandingStrategy {
  target_persona: string;
  core_problem: string;
  emotional_trigger: string;
  unique_mechanism: string;
  angle: string;
  main_promise: string;
  offer_structure: string;
  hooks: string[];
}

export interface LandingSection {
  type: string;
  goal: string;
  copy_direction: string;
  headline: string;
  body_text: string;
  cta_text: string;
  image_style: string;
  image_url?: string;
  image_status?: "pending" | "generating" | "done" | "failed";
}

export type StageStatus = "pending" | "in_progress" | "completed" | "failed";

export interface LandingProject {
  id?: string;
  productName: string;
  description: string;
  targetAudience: string;
  price: string;
  marketCountry: string;
  desiredTone: string;
  imageUrls: string[];
}

export function useLandingGenerator() {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<LandingStrategy | null>(null);
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [stageStatus, setStageStatus] = useState<Record<string, StageStatus>>({
    strategy: "pending",
    structure: "pending",
    images: "pending",
    assembly: "pending",
  });

  const updateStage = (stage: string, status: StageStatus) => {
    setStageStatus(prev => ({ ...prev, [stage]: status }));
  };

  const saveProject = useCallback(async (project: LandingProject, strategyData?: any, structureData?: any) => {
    if (!user) return null;
    const payload: any = {
      user_id: user.id,
      product_name: project.productName,
      product_description: project.description,
      product_images: project.imageUrls,
      target_audience: project.targetAudience,
      price: project.price,
      market_country: project.marketCountry,
      desired_tone: project.desiredTone,
      status: "draft",
    };
    if (strategyData) payload.strategy_output = strategyData;
    if (structureData) payload.structure_output = structureData;

    if (projectId) {
      await supabase.from("landing_projects").update(payload).eq("id", projectId);
      return projectId;
    } else {
      const { data, error } = await supabase.from("landing_projects").insert(payload).select("id").single();
      if (error) throw error;
      setProjectId(data.id);
      return data.id;
    }
  }, [user, projectId]);

  const runStrategy = useCallback(async (project: LandingProject) => {
    updateStage("strategy", "in_progress");
    try {
      const { data, error } = await supabase.functions.invoke("landing-strategy", {
        body: {
          productName: project.productName,
          description: project.description,
          targetAudience: project.targetAudience,
          price: project.price,
          marketCountry: project.marketCountry,
          desiredTone: project.desiredTone,
          imageUrls: project.imageUrls,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStrategy(data);
      await saveProject(project, data);
      updateStage("strategy", "completed");
      return data;
    } catch (e: any) {
      updateStage("strategy", "failed");
      toast.error("فشل في التحليل الاستراتيجي: " + (e.message || "خطأ"));
      throw e;
    }
  }, [saveProject]);

  const runStructure = useCallback(async (project: LandingProject, strategyData: LandingStrategy) => {
    updateStage("structure", "in_progress");
    try {
      const { data, error } = await supabase.functions.invoke("landing-structure", {
        body: { strategy: strategyData, productName: project.productName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const secs = (data.sections || []).map((s: any) => ({
        ...s,
        image_url: "",
        image_status: "pending" as const,
      }));
      setSections(secs);
      await saveProject(project, strategyData, data);
      updateStage("structure", "completed");
      return secs;
    } catch (e: any) {
      updateStage("structure", "failed");
      toast.error("فشل في بناء الهيكل: " + (e.message || "خطأ"));
      throw e;
    }
  }, [saveProject]);

  const generateSectionImage = useCallback(async (index: number, productName: string, productImageUrl?: string) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, image_status: "generating" } : s));
    try {
      const section = sections[index];
      if (!section) throw new Error("Section not found");

      const { data, error } = await supabase.functions.invoke("landing-image", {
        body: {
          sectionType: section.type,
          productName,
          imageStyle: section.image_style,
          productImageUrl,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSections(prev => prev.map((s, i) => i === index ? { ...s, image_url: data.imageUrl, image_status: "done" } : s));
      return data.imageUrl;
    } catch (e: any) {
      setSections(prev => prev.map((s, i) => i === index ? { ...s, image_status: "failed" } : s));
      toast.error(`فشل توليد صورة القسم ${index + 1}`);
      return null;
    }
  }, [sections]);

  const runAllImages = useCallback(async (productName: string, productImageUrl?: string) => {
    updateStage("images", "in_progress");
    let allDone = true;
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (["hook", "problem", "solution", "offer", "social_proof", "cta"].includes(sec.type)) {
        const result = await generateSectionImage(i, productName, productImageUrl);
        if (!result) allDone = false;
      }
    }
    updateStage("images", allDone ? "completed" : "failed");
  }, [sections, generateSectionImage]);

  const updateSection = useCallback((index: number, updates: Partial<LandingSection>) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  }, []);

  return {
    strategy, setStrategy,
    sections, setSections,
    stageStatus,
    projectId,
    runStrategy,
    runStructure,
    generateSectionImage,
    runAllImages,
    updateSection,
    updateStage,
  };
}
