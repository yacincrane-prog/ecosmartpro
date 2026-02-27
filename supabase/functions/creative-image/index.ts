import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function truncateWords(text: string, maxWords: number): string {
  if (!text) return text;
  const words = text.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ');
}

function validateArabicText(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length === 0) return { valid: true };
  const brokenPattern = /[\u0600-\u06FF]\s[\u0600-\u06FF]\s[\u0600-\u06FF]\s[\u0600-\u06FF]/;
  if (brokenPattern.test(text) && text.replace(/\s/g, '').length < text.length * 0.4) {
    return { valid: false, reason: "broken_characters" };
  }
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
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    // Enforce text length limits
    const safeHeadline = truncateWords(headline, 5);
    const safeSubheadline = truncateWords(subheadline, 6);
    const safeBulletPoints = (bulletPoints || []).slice(0, 3).map((bp: string) => truncateWords(bp, 4));
    const safeCta = truncateWords(ctaText, 3);

    const headlineValid = validateArabicText(safeHeadline);
    const subValid = validateArabicText(safeSubheadline);
    console.log(`[ARABIC-QA] headline valid: ${headlineValid.valid}, sub valid: ${subValid.valid}`);

    const sizeMap: Record<string, string> = {
      "1:1": "1024x1024",
      "4:5": "1024x1024",
      "9:16": "1024x1792",
      "landing": "1024x1792",
    };
    const size = sizeMap[aspectRatio] || "1024x1024";

    // Build prompt for DALL-E
    let prompt: string;
    if (safeMode) {
      prompt = `Professional marketing advertisement image for the product "${productName}". Creative concept: ${creativeIdea}. Do NOT include any text, letters, words or writing on the image at all. Leave clean empty space for text overlay later. Modern attractive design with vibrant colors, high quality product photography style.`;
    } else {
      prompt = `Professional marketing advertisement image for the product "${productName}". Creative concept: ${creativeIdea}. The image should include Arabic text "${safeHeadline}" as the main headline in bold clean font, and a call-to-action button with text "${safeCta}". Modern attractive design with vibrant colors. Arabic text must be right-to-left with connected letters.`;
    }

    console.log(`[creative-image] Calling OpenAI DALL-E, size: ${size}, safeMode: ${!!safeMode}`);

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality: "hd",
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI DALL-E error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(JSON.stringify({ error: "خطأ في مفتاح API أو الرصيد" }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.data?.[0]?.url;

    if (!imageData) {
      console.error("No image in DALL-E response:", JSON.stringify(data).substring(0, 1000));
      throw new Error("No image generated");
    }

    console.log(`[creative-image] Image generated successfully, safeMode: ${!!safeMode}`);

    return new Response(JSON.stringify({
      imageUrl: imageData,
      description: data.data?.[0]?.revised_prompt || "",
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
