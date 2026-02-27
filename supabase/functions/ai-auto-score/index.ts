import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { productName, description, imageUrl, competitors } = await req.json();

    const competitorInfo = competitors?.length
      ? `\nمنافسون:\n${competitors.map((c: any, i: number) => `${i+1}. موقع: ${c.websiteUrl || '-'} | فيديو: ${c.videoUrl || '-'} | سعر: ${c.sellingPrice || '-'}`).join('\n')}`
      : '';

    const prompt = `أنت خبير تقييم منتجات التجارة الإلكترونية. قيّم هذا المنتج على 5 معايير، كل معيار من 0 إلى 5.

المنتج: ${productName}
${description ? `الوصف: ${description}` : ''}${competitorInfo}

المعايير:
1. solvesProblem: هل يحل مشكلة واضحة؟ (0-5)
2. wowFactor: هل له عنصر Wow Factor يجذب الانتباه؟ (0-5)
3. hasVideos: هل يمكن إنشاء فيديوهات إعلانية جذابة له؟ (0-5)
4. smallNoVariants: هل صغير الحجم وليس فيه متغيرات كثيرة (ألوان/أحجام)؟ (0-5)
5. sellingNow: هل هو منتج رائج ويُباع حالياً في السوق؟ (0-5)

أجب بـ JSON فقط بدون أي نص إضافي، بهذا الشكل بالضبط:
{"solvesProblem":X,"wowFactor":X,"hasVideos":X,"smallNoVariants":X,"sellingNow":X,"reasoning":"سطر واحد يلخص رأيك"}`;

    const messages: any[] = [
      { role: "user", content: imageUrl
        ? [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ]
        : prompt
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let scores;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      scores = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "فشل في تحليل رد الذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clamp values to 0-5
    const clamp = (v: any) => Math.max(0, Math.min(5, Math.round(Number(v) || 0)));
    const result = {
      solvesProblem: clamp(scores.solvesProblem),
      wowFactor: clamp(scores.wowFactor),
      hasVideos: clamp(scores.hasVideos),
      smallNoVariants: clamp(scores.smallNoVariants),
      sellingNow: clamp(scores.sellingNow),
      reasoning: scores.reasoning || "",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-auto-score error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
