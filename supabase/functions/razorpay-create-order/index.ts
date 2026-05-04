const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Creates a Razorpay order. Returns the order ID + key for the client checkout.
// Falls back to demo mode when Razorpay keys are not configured.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const amount = Number(body?.amount);
    const bookingId = String(body?.bookingId ?? "");
    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    // Demo mode: when keys are absent return a mock order so the UI can
    // complete the full payment flow without a real Razorpay account.
    if (!KEY_ID || !KEY_SECRET) {
      return new Response(
        JSON.stringify({
          orderId: `demo_order_${Date.now()}`,
          amount: Math.round(amount * 100),
          currency: "INR",
          keyId: "demo",
          isDemo: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const auth = btoa(`${KEY_ID}:${KEY_SECRET}`);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: bookingId || `bk_${Date.now()}`,
        notes: { bookingId },
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      console.error("Razorpay order error", order);
      throw new Error(order?.error?.description ?? "Failed to create order");
    }

    return new Response(
      JSON.stringify({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: KEY_ID }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("razorpay-create-order failed", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
