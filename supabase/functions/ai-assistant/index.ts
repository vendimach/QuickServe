// AI assistant for QuickServe — uses Lovable AI gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are QuickServe's friendly customer-support assistant. QuickServe is an Indian on-demand home services marketplace covering Elder Care, Babysitter, Housemaid, and Pet Care. Keep answers short, warm, and practical (under 90 words).

Key facts:
- Bookings can be Instant (Book Now) or Scheduled (Date/Time).
- Cancellation: free before a partner accepts; ₹50 fine after acceptance; ₹150 within 15 min of partner arrival.
- All partners are Aadhaar-verified, mobile-verified and background-checked.
- Aadhaar OTP demo code: 654321. Mobile OTP demo code: 123456.
- Live cam (body cam) is auto-enabled when partner enters the home; encrypted, deleted after 24h.
- Customers can save service preferences (e.g. "Walk dog at 6, food at 8").
- Customer care: support@quickserve.app, +91 1800-123-456 (24x7).

If asked about something outside QuickServe, politely redirect.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { messages = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ reply: "I'm a bit busy right now — please try again in a few seconds." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ reply: "AI credits are exhausted. Please add credits to continue using the assistant." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a reply.";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});