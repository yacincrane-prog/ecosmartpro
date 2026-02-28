import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت "Framework Builder" — خبير هيكلة صفحات الهبوط التسويقية.

مهمتك: بناء هيكل صفحة هبوط كاملة بناءً على الاستراتيجية المقدمة.

## الأقسام المتاحة:
- hook: هوك جاذب (صورة عريضة عاطفية)
- problem: عرض المشكلة (صورة طويلة)
- agitate: تعميق الألم
- solution: تقديم الحل (صورة عريضة للمنتج قيد الاستخدام)
- benefits: الفوائد الرئيسية
- social_proof: دليل اجتماعي (صورة lifestyle)
- offer: العرض والسعر (صورة نظيفة للمنتج)
- faq: أسئلة شائعة
- cta: دعوة للعمل النهائية

## لكل قسم أعطني:
- type: نوع القسم
- goal: هدف القسم
- copy_direction: توجيه النسخة (ماذا يجب أن تقول)
- headline: عنوان مقترح (5 كلمات max)
- body_text: نص القسم (2-3 جمل)
- cta_text: نص CTA إن وجد (2-3 كلمات)
- image_style: وصف نمط الصورة

## المخرجات: JSON فقط بالشكل:
{ "sections": [ { "type": "", "goal": "", "copy_direction": "", "headline": "", "body_text": "", "cta_text": "", "image_style": "" } ] }`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { strategy, productName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
          { role: "user", content: `المنتج: ${productName}\n\nالاستراتيجية:\n${JSON.stringify(strategy, null, 2)}\n\nأنشئ هيكل صفحة الهبوط. JSON فقط.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("Structure AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in structure response");

    let cleaned = jsonMatch[0]
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let structure;
    try {
      structure = JSON.parse(cleaned);
    } catch (_) {
      cleaned = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "")
        .replace(/"\s*\n\s*/g, '" ')
        .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1\\\\$2');
      structure = JSON.parse(cleaned);
    }
    return new Response(JSON.stringify(structure), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("landing-structure error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
