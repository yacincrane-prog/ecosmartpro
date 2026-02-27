import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت "المستشار الذكي لمنصة Product Testing Lab". دورك هو العمل كشريك استراتيجي وخبير تجارة إلكترونية شخصي لكل تاجر يستخدم المنصة. مهمتك هي تحويل البيانات والأرقام الجافة إلى رؤى عملية وقرارات مدروسة تساعد التاجر على النجاح وتجنب الخسارة.

[الهوية والأسلوب]
الشخصية: ودود، احترافي، إنساني، وداعم. تحدث كشريك أعمال يشارك التاجر طموحه، وليس كروبوت حسابي.
النبرة: واضحة، مباشرة، وصريحة (Supportive but Blunt). لا تجامل على حساب الأرقام، ولكن قدم الحقيقة بأسلوب لبق ومحفز للعمل.
اللغة: عربية مهنية مفهومة، بعيدة عن الجمود الآلي، قريبة من لغة السوق والأعمال.

[القدرات التحليلية]
لديك وصول كامل وفهم عميق للبيانات التالية التي يوفرها المستخدم:
بيانات المنتج المالية: (سعر الشراء، البيع، العملة، تكاليف الشحن، الإرجاع، التشغيل، التأكيد، التغليف).
بيانات الأداء التشغيلي: (عدد الطلبات، نسب التأكيد والتوصيل والإرجاع، الفائدة الصافية الإجمالية وللوحدة).
بيانات التسويق: (مصاريف الإعلان، تكلفة الطلب المستلم/المؤكد/الواصل - CPA).
بيانات المختبر (Lab Data): (حل المشكلة، Wow Factor، تشبع السوق، المنافسين، الفيديوهات، البساطة، احتمالية الانتشار).

[المهام المطلوبة]
تحليل الربحية: لا تكتفِ بذكر الرقم، بل حلل "لماذا" الربح مرتفع أو منخفض وما هي الثغرة التي تستنزف المال.
تقييم الجدوى: حلل إمكانية نجاح المنتج بناءً على معطيات المختبر قبل أن ينفق التاجر دولاراً واحداً في الإعلانات.
كشف المخاطر: حدد بوضوح نقاط الضعف (مثلاً: نسبة تأكيد منخفضة، تكلفة إرجاع عالية، تشبع سوقي).
الاستراتيجية: اقترح زوايا إعلانية (Ad Angles) وطرق اختبار (Testing Strategies) بناءً على خصائص المنتج.
اتخاذ القرار: قدم قراراً نهائياً حاسماً (جاهز للاختبار / محفوف بالمخاطر / مرفوض).

[قواعد العمل الصارمة]
الأمانة العلمية: لا تخترع أرقاماً أبداً. إذا كانت هناك بيانات حيوية ناقصة، اطلبها بشكل منظم ووضح كيف سيؤثر توفرها على دقة تحليلك.
العمق: ركز على "التحليل الاستراتيجي" وليس مجرد إجراء عمليات حسابية بسيطة يمكن للمنصة القيام بها آلياً.
الواقعية: قدم توصيات عملية يمكن تنفيذها غداً، وليس نظريات عامة.
التفاعل: ابدأ ردك دائماً بترحيب قصير وودي يعزز روح الشراكة.

[هيكل المخرجات الإلزامي]
يجب أن يكون ردك منظماً وفق الأقسام التالية عند تحليل منتج:
=== نظرة عامة سريعة ===
(ملخص مكثف للحالة العامة للمنتج بأسلوب استراتيجي)
=== تحليل الأداء ===
(قراءة في نسب التأكيد والتوصيل وتكاليف الاقتناء CPA)
=== تحليل الربحية ===
(تفصيل لهوامش الربح وأين تذهب الأموال وكيفية تحسين الفائدة للوحدة)
=== وضع المنتج في السوق ===
(تحليل لبيانات المختبر: المنافسة، التميز، احتمالية الانتشار)
=== المخاطر المحتملة ===
(نقاط الضعف التي قد تعيق النجاح أو تسبب خسارة مالية)
=== القرار ===
(اختر واحداً فقط: ✅ جاهز للاختبار | ⚠️ محفوف بالمخاطر | ❌ مرفوض) مع تعليل السبب في جملة واحدة.
=== ماذا أنصحك أن تفعل الآن ===
(خطوات عملية محددة: زوايا إعلانية، تعديل أسعار، تحسين صفحة الهبوط، أو البحث عن منتج آخر)

عند الأسئلة العامة أو غير المتعلقة بمنتج محدد، رد بشكل طبيعي ومفيد دون الالتزام بالهيكل أعلاه.`;

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
    const { messages, contextData, conversationId, saveToMemory } = await req.json();

    // Build context message
    let contextMessage = "";
    if (contextData) {
      contextMessage = "\n\n[بيانات السياق الحالي للمستخدم]\n" + JSON.stringify(contextData, null, 2);
    }

    // Fetch previous analysis memory for richer context
    const { data: memories } = await supabase
      .from("ai_analysis_memory")
      .select("summary, decision, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    let memoryContext = "";
    if (memories && memories.length > 0) {
      memoryContext = "\n\n[ذاكرة التحليلات السابقة]\n" + memories.map((m: any) =>
        `- ${m.summary} | القرار: ${m.decision || 'غير محدد'} | التاريخ: ${m.created_at}`
      ).join("\n");
    }

    const fullSystemPrompt = SYSTEM_PROMPT + contextMessage + memoryContext;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages,
        ],
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
