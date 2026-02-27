import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, headline, subheadline, bulletPoints, ctaText, creativeIdea, aspectRatio, imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aspectMap: Record<string, string> = {
      "1:1": "مربع 1080x1080",
      "4:5": "عمودي 1080x1350",
      "9:16": "عمودي 1080x1920",
      "landing": "طويل 1080x2400",
    };

    const userContent: any[] = [];

    if (imageUrl) {
      userContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    userContent.push({
      type: "text",
      text: `أنشئ صورة إعلانية تسويقية احترافية بالمواصفات التالية:

المنتج: ${productName}
الفكرة الإبداعية: ${creativeIdea}
المقاس: ${aspectMap[aspectRatio] || "مربع 1080x1080"}

النصوص المطلوبة على الصورة:
- العنوان الرئيسي: ${headline}
- النص الثانوي: ${subheadline}
- النقاط: ${bulletPoints?.join(" | ") || ""}
- زر CTA: ${ctaText}

التعليمات:
- ادمج صورة المنتج في تصميم عصري واحترافي
- استخدم ألوان جذابة ومتناسقة
- ضع النصوص بطريقة واضحة ومقروءة
- اجعل الخلفية تبرز المنتج
- النصوص بالعربية/الدارجة الجزائرية
- التصميم موجه للسوق الجزائري`
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للمتابعة" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Image gen error:", response.status, t);
      throw new Error("Image generation failed");
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content || "";

    if (!imageData) throw new Error("No image generated");

    return new Response(JSON.stringify({ imageUrl: imageData, description: textContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("creative-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
