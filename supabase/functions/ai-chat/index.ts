import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت "المستشار الذكي لمنصة Product Testing Lab". أنت شريك استراتيجي وخبير تجارة إلكترونية.

[أسلوبك]
- مختصر وعملي. لا تكرر ولا تطيل.
- صريح ومباشر. قدم الحقيقة بلا مجاملة.
- عربي مهني قريب من لغة السوق.
- استخدم bullet points والأرقام بدل الفقرات الطويلة.

[قدراتك]
- تحليل صور المنتجات: عند إرسال صورة، حللها بصرياً (النوع، الجودة، التغليف، الجمهور المستهدف).
- البحث: بناءً على الصورة والاسم، قدم معلومات عن المنتج في السوق.
- تحليل الأرقام: ربحية، أداء، CPA، نسب التوصيل/الإرجاع.
- تحليل المختبر: تقييم المعايير وإعطاء قرار.

[هيكل الرد عند تحليل منتج]
📊 **ملخص سريع** (سطرين)
📈 **الأداء** (نقاط مختصرة)
💰 **الربحية** (أرقام + تشخيص)
🏪 **السوق** (تشبع، منافسة، فرص)
⚠️ **مخاطر** (نقاط فقط)
🎯 **القرار**: ✅ جاهز | ⚠️ محفوف بالمخاطر | ❌ مرفوض
💡 **افعل الآن** (3 خطوات عملية max)

عند الأسئلة العامة، رد باختصار بدون الهيكل أعلاه.
لا تخترع أرقاماً. اطلب الناقص بوضوح.`;

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

    const userId = user.id;
    const { messages, contextData, conversationId } = await req.json();

    // Build context message
    let contextMessage = "";
    if (contextData) {
      contextMessage = "\n\n[بيانات السياق]\n" + JSON.stringify(contextData, null, 2);
    }

    // Fetch previous analysis memory
    const { data: memories } = await supabase
      .from("ai_analysis_memory")
      .select("summary, decision, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    let memoryContext = "";
    if (memories && memories.length > 0) {
      memoryContext = "\n\n[ذاكرة سابقة]\n" + memories.map((m: any) =>
        `- ${m.summary} | ${m.decision || '-'} | ${m.created_at}`
      ).join("\n");
    }

    const fullSystemPrompt = SYSTEM_PROMPT + contextMessage + memoryContext;

    // Build messages for API - support multimodal (images)
    const apiMessages: any[] = [{ role: "system", content: fullSystemPrompt }];
    
    for (const msg of messages) {
      if (msg.imageUrl && msg.role === "user") {
        // Multimodal message with image
        apiMessages.push({
          role: "user",
          content: [
            { type: "text", text: msg.content },
            { type: "image_url", image_url: { url: msg.imageUrl } },
          ],
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يلزم إضافة رصيد لاستخدام المساعد الذكي." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
