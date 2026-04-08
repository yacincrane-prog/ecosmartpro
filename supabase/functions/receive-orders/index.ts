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
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const products = Array.isArray(body.products) ? body.products : [];
  const syncedAt = body.synced_at || new Date().toISOString();

  let productsReceived = 0;
  let statsReceived = 0;

  for (const p of products) {
    const productName = String(p.name || "");

    // Upsert product (by user_id + name)
    const { error: pErr } = await supabase.from("synced_products").upsert(
      {
        user_id: userId,
        name: productName,
        sale_price: p.sale_price != null ? Number(p.sale_price) : 0,
        purchase_price: p.purchase_price != null ? Number(p.purchase_price) : 0,
        delivery_discount: 0,
        total_created: 0,
        total_confirmed: 0,
        total_delivered: 0,
        total_returned: 0,
        total_cancelled: 0,
        synced_at: syncedAt,
      },
      { onConflict: "user_id,name" }
    );
    if (!pErr) productsReceived++;

    // Upsert daily stats
    const dailyStats = Array.isArray(p.daily_stats) ? p.daily_stats : [];
    for (const d of dailyStats) {
      // Delete existing row for this user+product+date, then insert
      await supabase
        .from("synced_daily_stats")
        .delete()
        .eq("user_id", userId)
        .eq("product_name", productName)
        .eq("stat_date", String(d.date || ""));

      const { error: sErr } = await supabase.from("synced_daily_stats").insert({
        user_id: userId,
        product_name: productName,
        stat_date: String(d.date || ""),
        created: Number(d.created) || 0,
        confirmed: Number(d.confirmed) || 0,
        delivered: Number(d.delivered) || 0,
        returned: Number(d.returned) || 0,
        cancelled: Number(d.cancelled) || 0,
        synced_at: syncedAt,
      });
      if (!sErr) statsReceived++;
    }

    // Update product totals from daily stats aggregation
    if (dailyStats.length > 0) {
      const totalCreated = dailyStats.reduce((s: number, d: any) => s + (Number(d.created) || 0), 0);
      const totalConfirmed = dailyStats.reduce((s: number, d: any) => s + (Number(d.confirmed) || 0), 0);
      const totalDelivered = dailyStats.reduce((s: number, d: any) => s + (Number(d.delivered) || 0), 0);
      const totalReturned = dailyStats.reduce((s: number, d: any) => s + (Number(d.returned) || 0), 0);
      const totalCancelled = dailyStats.reduce((s: number, d: any) => s + (Number(d.cancelled) || 0), 0);

      await supabase
        .from("synced_products")
        .update({
          total_created: totalCreated,
          total_confirmed: totalConfirmed,
          total_delivered: totalDelivered,
          total_returned: totalReturned,
          total_cancelled: totalCancelled,
        })
        .eq("user_id", userId)
        .eq("name", productName);
    }
  }

  // Update last_used_at
  await supabase.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);

  return new Response(
    JSON.stringify({ success: true, products_received: productsReceived, stats_received: statsReceived }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
