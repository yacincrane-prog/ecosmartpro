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

    const systemPrompt = `أنت "DZ-AD-MASTER"، الخبير الأول في هندسة الإعلانات البصرية وكتابة المحتوى التسويقي الموجه خصيصاً للسوق الجزائري.

اللهجة: استخدم الدارجة الجزائرية البيضاء المفهومة في كل الولايات والتي تمزج بين البساطة والاحترافية التسويقية.
الأسلوب: نظيف، عصري، ومباشر. تجنب الحشو اللغوي.
الواقعية: لا تقترح وعوداً كاذبة أو مبالغات غير منطقية.

يجب أن تكون مخرجاتك بتنسيق JSON حصراً بالشكل التالي:
{
  "creative_idea": "وصف موجز للمشهد البصري المقترح وكيفية دمج المنتج في البيئة",
  "headline": "عنوان قوي قصير بالدارجة الجزائرية",
  "subheadline": "نص ثانوي مقنع",
  "bullet_points": ["فائدة 1", "فائدة 2", "فائدة 3"],
  "cta_text": "نص زر اتخاذ إجراء مثل: اشري ذرك، اطلب الآن",
  "text_layout": "تحديد مكان وضع النصوص بناءً على نوع الصورة لضمان عدم تغطية المنتج"
}

تأكد أن:
- العنوان يشد الانتباه في أقل من 3 ثوانٍ
- اللهجة ليست فصحى وليست دارجة مبتذلة
- التصميم يراعي المساحات الفارغة`;

    const userContent: any[] = [];
    
    // Add images if provided
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

قم بتحليل صور المنتج (إن وجدت) والبيانات أعلاه، ثم أعطني مفهوم إعلاني احترافي كامل بتنسيق JSON.`
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
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    
    const concept = JSON.parse(jsonMatch[0]);

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
