import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sectionImageMap: Record<string, { style: string; orientation: string }> = {
  hook: { style: "emotional, aspirational, wide hero shot", orientation: "wide" },
  problem: { style: "frustration scene, struggle, tall composition", orientation: "tall" },
  agitate: { style: "dramatic tension, urgency", orientation: "wide" },
  solution: { style: "product in use, clean, modern, satisfaction", orientation: "wide" },
  benefits: { style: "lifestyle, positive outcome, bright", orientation: "wide" },
  social_proof: { style: "real people, lifestyle context, testimonial feel", orientation: "wide" },
  offer: { style: "clean product focus, minimal background, premium", orientation: "square" },
  cta: { style: "bold, action-oriented, vibrant", orientation: "wide" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sectionType, productName, imageStyle, productImageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const mapping = sectionImageMap[sectionType] || sectionImageMap.hook;
    const styleDesc = imageStyle || mapping.style;

    const size = mapping.orientation === "tall" ? "1024x1792" :
                 mapping.orientation === "square" ? "1024x1024" : "1792x1024";

    const userContent: any[] = [];
    if (productImageUrl) {
      userContent.push({ type: "image_url", image_url: { url: productImageUrl } });
    }

    userContent.push({
      type: "text",
      text: `Generate a professional marketing image for a landing page section.
Product: ${productName}
Section type: ${sectionType}
Style: ${styleDesc}
Size: ${size}
Requirements: Clean, modern, realistic, optimized for ads. No text on the image. No watermarks.`
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
      if (response.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("Landing image error:", response.status, t);
      throw new Error("Image generation failed");
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    // Try multiple paths for the image
    const imageData = message?.images?.[0]?.image_url?.url
      || message?.images?.[0]?.url
      || message?.image?.url;

    if (!imageData) {
      console.error("No image in response. Keys:", JSON.stringify(Object.keys(message || {})));
      console.error("Full response:", JSON.stringify(data).substring(0, 2000));
      throw new Error("No image generated");
    }

    return new Response(JSON.stringify({ imageUrl: imageData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("landing-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
