import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت "ARABIC-TYPE-GENIUS"، النظام المتخصص في هندسة المطالبات البصرية (Visual Prompt Engineering) مع تركيز مطلق على سلامة الخط العربي داخل الصور.

## قواعد صارمة للنص العربي:
- يُمنع منعاً باتاً توليد حروف منفصلة، معكوسة، أو مشوهة
- لا يتجاوز أي سطر نصي 5 كلمات كحد أقصى
- لا تستخدم الحركات (فتحة، ضمة، إلخ) نهائياً
- الكتابة دائماً من اليمين إلى اليسار (RTL)
- إذا كانت الجملة معقدة بصرياً، قم بتبسيطها فوراً
- Render Arabic text with clean bold Kufi style, ensuring letters are connected correctly
- استخدم خط عريض واضح مع تباين عالٍ بين النص والخلفية`;

// Truncate text to max word count
function truncateWords(text: string, maxWords: number): string {
  if (!text) return text;
  const words = text.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ');
}

// Validate Arabic text quality
function validateArabicText(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length === 0) return { valid: true };
  
  // Check for isolated/broken characters pattern
  const brokenPattern = /[\u0600-\u06FF]\s[\u0600-\u06FF]\s[\u0600-\u06FF]\s[\u0600-\u06FF]/;
  if (brokenPattern.test(text) && text.replace(/\s/g, '').length < text.length * 0.4) {
    return { valid: false, reason: "broken_characters" };
  }
  
  // Check for excessive mixed Arabic/Latin
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  if (arabicChars > 0 && latinChars > 0 && latinChars > arabicChars * 0.5) {
    return { valid: false, reason: "mixed_languages" };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, headline, subheadline, bulletPoints, ctaText, creativeIdea, aspectRatio, imageUrl, safeMode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Enforce text length limits
    const safeHeadline = truncateWords(headline, 5);
    const safeSubheadline = truncateWords(subheadline, 6);
    const safeBulletPoints = (bulletPoints || []).slice(0, 3).map((bp: string) => truncateWords(bp, 4));
    const safeCta = truncateWords(ctaText, 3);

    // Validate text quality
    const headlineValid = validateArabicText(safeHeadline);
    const subValid = validateArabicText(safeSubheadline);
    
    console.log(`[ARABIC-QA] headline valid: ${headlineValid.valid}, sub valid: ${subValid.valid}`);

    const aspectMap: Record<string, { label: string; size: string }> = {
      "1:1": { label: "مربع", size: "1024x1024" },
      "4:5": { label: "عمودي", size: "1024x1280" },
      "9:16": { label: "ستوري", size: "1024x1792" },
      "landing": { label: "طويل", size: "1024x3072" },
    };

    const aspect = aspectMap[aspectRatio] || aspectMap["1:1"];
    const userContent: any[] = [];

    if (imageUrl) {
      userContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    // Build prompt based on safe mode
    let textInstructions: string;
    if (safeMode) {
      textInstructions = `
لا تكتب أي نص عربي على الصورة نهائياً.
فقط أنشئ صورة إعلانية احترافية نظيفة بدون أي كتابة.
اترك مساحات فارغة واضحة لإضافة النصوص لاحقاً برمجياً.`;
    } else {
      textInstructions = `
النصوص المطلوبة على الصورة (بخط عريض واضح، عربي متصل، بدون حركات):
- العنوان: ${safeHeadline}
- السطر الفرعي: ${safeSubheadline}
- CTA: ${safeCta}

تعليمات الخط:
- استخدم خط Kufi عريض ونظيف
- تأكد أن كل الحروف العربية متصلة بشكل صحيح
- اتجاه الكتابة من اليمين إلى اليسار
- تباين عالٍ بين لون النص والخلفية
- لا تكتب أكثر من 5 كلمات في سطر واحد`;
    }

    userContent.push({
      type: "text",
      text: `أنشئ صورة إعلانية تسويقية احترافية بالمواصفات التالية:

المنتج: ${productName}
الفكرة الإبداعية: ${creativeIdea}
المقاس: ${aspect.label} ${aspect.size}
${textInstructions}

التعليمات البصرية:
- ادمج صورة المنتج في تصميم عصري واحترافي
- استخدم ألوان جذابة ومتناسقة
- اجعل الخلفية تبرز المنتج
- التصميم موجه للسوق الجزائري
- اترك مساحات كافية للنصوص`
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
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
    const message = data.choices?.[0]?.message;
    const imageData = message?.images?.[0]?.image_url?.url 
      || message?.images?.[0]?.url
      || message?.image?.url;
    const textContent = message?.content || "";

    if (!imageData) {
      console.error("Full AI response:", JSON.stringify(data).substring(0, 2000));
      throw new Error("No image generated");
    }

    console.log(`[ARABIC-QA] Image generated successfully, safeMode: ${!!safeMode}`);

    return new Response(JSON.stringify({ 
      imageUrl: imageData, 
      description: textContent,
      safeMode: !!safeMode,
      textData: safeMode ? {
        headline: safeHeadline,
        subheadline: safeSubheadline,
        bulletPoints: safeBulletPoints,
        ctaText: safeCta,
      } : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("creative-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
