import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت "Creative Director" — مستشار استراتيجي متخصص في بناء صفحات هبوط تسويقية.

مهمتك: تحليل المنتج وإخراج استراتيجية تسويقية مهيكلة بصيغة JSON فقط.

## القواعد:
- لا تكتب نسخة نهائية (copy). فقط تحليل استراتيجي.
- استخدم لغة واضحة ومباشرة.
- ركز على السوق الجزائري إن كان البلد الجزائر.
- كن واقعياً بدون مبالغات.

## المخرجات المطلوبة (JSON فقط):
{
  "target_persona": "وصف دقيق للعميل المثالي",
  "core_problem": "المشكلة الأساسية التي يحلها المنتج",
  "emotional_trigger": "المحفز العاطفي الرئيسي",
  "unique_mechanism": "الآلية الفريدة التي يعمل بها المنتج",
  "angle": "الزاوية التسويقية المختارة",
  "main_promise": "الوعد الرئيسي للعميل",
  "offer_structure": "هيكل العرض (ماذا يحصل العميل)",
  "hooks": ["هوك 1", "هوك 2", "هوك 3"]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, description, targetAudience, price, marketCountry, desiredTone, imageUrls } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userContent: any[] = [];

    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        if (url) userContent.push({ type: "image_url", image_url: { url } });
      }
    }

    userContent.push({
      type: "text",
      text: `المنتج: ${productName}
الوصف: ${description || "غير متوفر"}
الجمهور المستهدف: ${targetAudience || "غير محدد"}
السعر: ${price || "غير محدد"}
البلد: ${marketCountry || "الجزائر"}
النبرة المطلوبة: ${desiredTone || "احترافية ومباشرة"}

أعطني التحليل الاستراتيجي بصيغة JSON فقط.`
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("Strategy AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in strategy response");

    const strategy = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(strategy), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("landing-strategy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
