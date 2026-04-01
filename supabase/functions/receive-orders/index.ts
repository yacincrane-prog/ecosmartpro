import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

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

  const orders = Array.isArray(body.orders) ? body.orders : [];
  const products = Array.isArray(body.products) ? body.products : [];
  const deliveryPrices = Array.isArray(body.delivery_prices) ? body.delivery_prices : [];

  // 1. Delete old synced_orders for this user
  await supabase.from("synced_orders").delete().eq("user_id", userId);

  // 2. Bulk insert orders
  let ordersReceived = 0;
  if (orders.length > 0) {
    const orderRows = orders.map((o: any) => ({
      user_id: userId,
      product_name: String(o.product_name || ""),
      product_variant: String(o.product_variant || ""),
      status: String(o.status || ""),
      price: Number(o.price) || 0,
      amount: Number(o.amount) || 0,
      quantity: Number(o.quantity) || 1,
      discount: Number(o.discount) || 0,
      delivery_type: String(o.delivery_type || "home"),
      delivery_provider: String(o.delivery_provider || ""),
      wilaya: String(o.wilaya || ""),
      commune: String(o.commune || ""),
      order_created_at: o.created_at || new Date().toISOString(),
      synced_at: body.synced_at || new Date().toISOString(),
    }));
    const { error } = await supabase.from("synced_orders").insert(orderRows);
    if (!error) ordersReceived = orderRows.length;
  }

  // 3. Upsert products
  let productsReceived = 0;
  if (products.length > 0) {
    for (const p of products) {
      const { error } = await supabase.from("synced_products").upsert(
        {
          user_id: userId,
          name: String(p.name || ""),
          alias_name: String(p.alias_name || ""),
          sale_price: Number(p.sale_price) || 0,
          purchase_price: Number(p.purchase_price) || 0,
          qty: Number(p.qty) || 0,
          synced_at: body.synced_at || new Date().toISOString(),
        },
        { onConflict: "user_id,name" }
      );
      if (!error) productsReceived++;
    }
  }

  // 4. Upsert delivery prices
  if (deliveryPrices.length > 0) {
    for (const d of deliveryPrices) {
      await supabase.from("synced_delivery_prices").upsert(
        {
          user_id: userId,
          wilaya_name: String(d.wilaya_name || ""),
          home_price: Number(d.home_price) || 0,
          office_price: Number(d.office_price) || 0,
          synced_at: body.synced_at || new Date().toISOString(),
        },
        { onConflict: "user_id,wilaya_name" }
      );
    }
  }

  // 5. Update last_used_at
  await supabase.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);

  return new Response(
    JSON.stringify({ ok: true, orders_received: ordersReceived, products_received: productsReceived }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
