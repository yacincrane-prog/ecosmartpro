import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Validate Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");

  // Look up token
  const { data: tokenRow, error: tokenError } = await supabase
    .from("api_tokens")
    .select("id, user_id")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return new Response(JSON.stringify({ error: "Invalid or inactive token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = tokenRow.user_id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Test mode
  if (body.test === true) {
    await supabase.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const products = Array.isArray(body.products) ? body.products : [];
  const syncedAt = body.synced_at || new Date().toISOString();

  // 1. Delete old data for this user
  await supabase.from("synced_daily_stats").delete().eq("user_id", userId);
  await supabase.from("synced_products").delete().eq("user_id", userId);

  // 2. Insert products and daily stats
  let productsReceived = 0;
  let statsReceived = 0;

  for (const p of products) {
    const { error } = await supabase.from("synced_products").upsert(
      {
        user_id: userId,
        name: String(p.name || ""),
        sale_price: Number(p.sale_price) || 0,
        purchase_price: Number(p.purchase_price) || 0,
        delivery_discount: Number(p.delivery_discount) || 0,
        total_created: Number(p.total_created) || 0,
        total_confirmed: Number(p.total_confirmed) || 0,
        total_delivered: Number(p.total_delivered) || 0,
        total_returned: Number(p.total_returned) || 0,
        synced_at: syncedAt,
      },
      { onConflict: "user_id,name" }
    );
    if (!error) productsReceived++;

    // Insert daily stats
    const dailyStats = Array.isArray(p.daily_stats) ? p.daily_stats : [];
    if (dailyStats.length > 0) {
      const statsRows = dailyStats.map((d: any) => ({
        user_id: userId,
        product_name: String(p.name || ""),
        stat_date: String(d.date || ""),
        created: Number(d.created) || 0,
        confirmed: Number(d.confirmed) || 0,
        delivered: Number(d.delivered) || 0,
        returned: Number(d.returned) || 0,
        synced_at: syncedAt,
      }));
      const { error: statsError } = await supabase.from("synced_daily_stats").insert(statsRows);
      if (!statsError) statsReceived += statsRows.length;
    }
  }

  // 3. Update last_used_at
  await supabase.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);

  return new Response(
    JSON.stringify({ ok: true, products_received: productsReceived, stats_received: statsReceived }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
