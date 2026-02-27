import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DIMENSIONS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "9:16": { width: 1024, height: 1792 },
  "landing": { width: 1024, height: 3072 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, creativeIdea, aspectRatio, imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dims = DIMENSIONS[aspectRatio] || DIMENSIONS["1:1"];

    const userContent: any[] = [];

    if (imageUrl) {
      userContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    userContent.push({
      type: "text",
      text: `Generate a professional product advertisement photo/background image.

Product: ${productName}
Creative concept: ${creativeIdea}
Image dimensions: ${dims.width}x${dims.height} pixels (aspect ratio: ${aspectRatio === 'landing' ? 'very tall vertical' : aspectRatio})

CRITICAL INSTRUCTIONS:
- DO NOT include ANY text, words, letters, numbers, or typography in the image
- DO NOT write any Arabic, English, or any language text on the image
- Generate ONLY a clean professional product photo/scene
- The image should be a beautiful product showcase with professional lighting
- Leave clean areas/negative space where text can be overlaid later
- Focus on making the product look premium and appealing
- Use modern, clean aesthetics with professional lighting
- The background should complement the product
- Generate the image at exactly ${dims.width}x${dims.height} pixels`
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
    console.log("AI response structure:", JSON.stringify(Object.keys(data)));
    
    const message = data.choices?.[0]?.message;
    const imageData = message?.images?.[0]?.image_url?.url 
      || message?.images?.[0]?.url;

    if (!imageData) {
      console.error("No image in response. Message keys:", JSON.stringify(Object.keys(message || {})));
      throw new Error("No image generated");
    }

    return new Response(JSON.stringify({ 
      imageUrl: imageData,
      requestedWidth: dims.width,
      requestedHeight: dims.height,
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
