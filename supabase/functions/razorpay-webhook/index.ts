import { createClient } from "npm:@supabase/supabase-js@2";

// Razorpay webhook: verifies X-Razorpay-Signature using webhook secret,
// then reflects payment.captured / payment.failed / refund.processed in DB.
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!WEBHOOK_SECRET) return new Response("not configured", { status: 500 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(raw));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected !== signature) {
    console.warn("Razorpay webhook signature mismatch");
    return new Response("invalid signature", { status: 400 });
  }

  const event = JSON.parse(raw);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const eventType: string = event?.event ?? "";
    const payment = event?.payload?.payment?.entity;
    const refund = event?.payload?.refund?.entity;

    if (eventType === "payment.captured" && payment) {
      const bookingId = payment.notes?.bookingId;
      if (bookingId) {
        await supabase.from("bookings").update({
          payment_status: "paid",
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id,
        }).eq("id", bookingId);
      }
    } else if (eventType === "payment.failed" && payment) {
      const bookingId = payment.notes?.bookingId;
      if (bookingId) {
        await supabase.from("bookings").update({
          payment_status: "failed",
        }).eq("id", bookingId);
      }
    } else if (eventType === "refund.processed" && refund) {
      // find booking by payment id
      const { data: bk } = await supabase.from("bookings")
        .select("id").eq("razorpay_payment_id", refund.payment_id).maybeSingle();
      if (bk?.id) {
        await supabase.from("bookings").update({
          payment_status: "refunded",
          refund_status: "processed",
          status: "refunded",
        }).eq("id", bk.id);
      }
    }

    console.log("razorpay webhook handled", eventType);
  } catch (e) {
    console.error("razorpay-webhook handler error", e);
  }

  return new Response("ok", { status: 200 });
});