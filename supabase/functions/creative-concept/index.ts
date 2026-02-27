import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, description, messageType, aspectRatio, imageUrls } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messageTypeMap: Record<string, string> = {
      results: "نتائج المنتج: ركز على التحول الذي سيحدثه المنتج في حياة الزبون",
      pain: "ألم يزيله المنتج: ابدأ بتسليط الضوء على المشكلة ثم قدم المنتج كحل وحيد",
      logical: "رسالة منطقية: ركز على المميزات التقنية، السعر، والجودة",
      emotional: "رسالة عاطفية: ركز على الشعور، الانتماء، أو الراحة النفسية",
      before_after: "مقارنة قبل/بعد: ركز على الفجوة بين الحالة السابقة والحالية",
      strong_offer: "عرض قوي: ركز على الاستعجال والندرة مثل كمية محدودة أو العرض لفترة محدودة",
    };

    const aspectRatioMap: Record<string, string> = {
      "1:1": "مربع 1:1 - للفيسبوك وانستغرام",
      "4:5": "عمودي 4:5 - لمنشورات انستغرام",
      "9:16": "ستوري 9:16 - للستوريز وريلز",
      "landing": "Landing Page طويل - لصفحات الهبوط",
    };

    const systemPrompt = `أنت "ARABIC-TYPE-GENIUS"، خبير هندسة الإعلانات البصرية وكتابة المحتوى التسويقي الموجه للسوق الجزائري.

## قواعد صارمة:
- اللهجة: الدارجة الجزائرية البيضاء البسيطة المفهومة في كل الولايات
- الأسلوب: نظيف، عصري، ومباشر. تجنب الحشو اللغوي
- الواقعية: لا وعود كاذبة أو مبالغات
- لا تستخدم الحركات (فتحة، ضمة، كسرة) نهائياً

## قيود النص الصارمة:
- العنوان (headline): حد أقصى 5 كلمات
- السطر الفرعي (subheadline): حد أقصى 6 كلمات  
- النقاط (bullet_points): 3 نقاط كحد أقصى، كل نقطة لا تتجاوز 4 كلمات
- CTA (cta_text): كلمتين أو 3 كحد أقصى
- كل الكلمات يجب أن تكون حقيقية وموجودة في القاموس العربي/الدارجة

## مخرجات بتنسيق JSON حصراً:
{
  "creative_idea": "وصف موجز للمشهد البصري",
  "headline": "عنوان قوي قصير (5 كلمات كحد أقصى)",
  "subheadline": "نص ثانوي مقنع (6 كلمات كحد أقصى)",
  "bullet_points": ["فائدة 1", "فائدة 2", "فائدة 3"],
  "cta_text": "نص CTA (2-3 كلمات)",
  "text_layout": "تحديد مكان النصوص"
}

## أمثلة:
منتج: حذاء رياضي → العنوان: "خفة وراحة في رجليك" / CTA: "اطلب الآن"
منتج: عسل طبيعي → العنوان: "بنة الطبيعة الحقيقية" / CTA: "اكموندي ذرك"`;

    const userContent: any[] = [];
    
    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        if (url) {
          userContent.push({ type: "image_url", image_url: { url } });
        }
      }
    }

    userContent.push({
      type: "text",
      text: `المنتج: ${productName}
الوصف: ${description || "غير متوفر"}
نوع الرسالة التسويقية: ${messageTypeMap[messageType] || messageType}
المقاس: ${aspectRatioMap[aspectRatio] || aspectRatio}

تذكر: العنوان 5 كلمات كحد أقصى، CTA كلمتين أو 3. أعطني JSON فقط.`
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
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
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("[creative-concept] Raw AI response length:", content.length);
    console.log("[creative-concept] Raw AI response preview:", content.substring(0, 500));
    
    // Try to extract JSON from response - handle markdown code blocks
    let jsonStr = "";
    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const rawJsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else if (rawJsonMatch) {
      jsonStr = rawJsonMatch[0];
    } else {
      console.error("[creative-concept] No JSON found in:", content);
      throw new Error("No JSON in response");
    }
    
    const concept = JSON.parse(jsonStr);

    // Enforce limits on output
    if (concept.headline) {
      concept.headline = concept.headline.split(/\s+/).slice(0, 5).join(' ');
    }
    if (concept.subheadline) {
      concept.subheadline = concept.subheadline.split(/\s+/).slice(0, 6).join(' ');
    }
    if (concept.bullet_points) {
      concept.bullet_points = concept.bullet_points.slice(0, 3).map((bp: string) => 
        bp.split(/\s+/).slice(0, 4).join(' ')
      );
    }
    if (concept.cta_text) {
      concept.cta_text = concept.cta_text.split(/\s+/).slice(0, 3).join(' ');
    }

    return new Response(JSON.stringify(concept), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("creative-concept error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
