import { corsHeaders } from "@supabase/supabase-js/cors";

// Reverse / forward geocoding via Google Maps Geocoding API.
// Body: { latlng?: "lat,lng", address?: "..." }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!KEY) throw new Error("GOOGLE_MAPS_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const params = new URLSearchParams({ key: KEY });
    if (body.latlng) params.set("latlng", body.latlng);
    else if (body.address) params.set("address", body.address);
    else throw new Error("Provide latlng or address");

    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    const json = await res.json();

    if (json.status !== "OK") {
      console.warn("geocode api status", json.status, json.error_message);
      return new Response(JSON.stringify({ results: [], status: json.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const top = json.results[0];
    const get = (type: string) =>
      top?.address_components?.find((c: { types: string[]; long_name: string }) =>
        c.types.includes(type),
      )?.long_name ?? "";

    return new Response(
      JSON.stringify({
        formatted: top.formatted_address,
        line1: [get("street_number"), get("route")].filter(Boolean).join(" ") || top.formatted_address.split(",")[0],
        city: get("locality") || get("administrative_area_level_2"),
        state: get("administrative_area_level_1"),
        pincode: get("postal_code"),
        lat: top.geometry?.location?.lat,
        lng: top.geometry?.location?.lng,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("geocode failed", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});