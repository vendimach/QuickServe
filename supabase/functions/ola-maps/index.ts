// Ola Maps proxy — Places autocomplete & reverse geocoding.
//
// Body: { action: "autocomplete", input: string }
//     | { action: "reverse",     lat: number, lng: number }
//
// Why proxy: keeps OLA_MAPS_API_KEY server-side and gives one normalized
// response shape so the frontend doesn't depend on Ola's raw schema.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutocompletePrediction {
  description?: string;
  place_id?: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
  geometry?: { location?: { lat?: number; lng?: number } };
  terms?: { value?: string }[];
}

interface AddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

interface ReverseResult {
  formatted_address?: string;
  address_components?: AddressComponent[];
  geometry?: { location?: { lat?: number; lng?: number } };
}

const get = (comps: AddressComponent[] | undefined, type: string): string =>
  comps?.find((c) => c.types?.includes(type))?.long_name ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const KEY = Deno.env.get("OLA_MAPS_API_KEY");
    if (!KEY) throw new Error("OLA_MAPS_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    if (action === "autocomplete") {
      const input = String(body.input ?? "").trim();
      if (input.length < 3) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const params = new URLSearchParams({ input, api_key: KEY });
      const res = await fetch(
        `https://api.olamaps.io/places/v1/autocomplete?${params.toString()}`,
      );
      const json = await res.json();
      const predictions: AutocompletePrediction[] = json.predictions ?? [];
      const results = predictions
        .map((p) => {
          const lat = p.geometry?.location?.lat;
          const lng = p.geometry?.location?.lng;
          if (typeof lat !== "number" || typeof lng !== "number") return null;
          const main = p.structured_formatting?.main_text ?? p.terms?.[0]?.value ?? "";
          const secondary = p.structured_formatting?.secondary_text ?? "";
          return {
            label: p.description ?? `${main} ${secondary}`.trim(),
            line1: main,
            secondary,
            lat,
            lng,
            place_id: p.place_id ?? "",
          };
        })
        .filter(Boolean);
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reverse") {
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("lat/lng required");
      }
      const params = new URLSearchParams({ latlng: `${lat},${lng}`, api_key: KEY });
      const res = await fetch(
        `https://api.olamaps.io/places/v1/reverse-geocode?${params.toString()}`,
      );
      const json = await res.json();
      const top: ReverseResult | undefined = json.results?.[0];
      if (!top) {
        return new Response(JSON.stringify({ result: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const formatted = top.formatted_address ?? "";
      const line1 =
        [get(top.address_components, "street_number"), get(top.address_components, "route")]
          .filter(Boolean)
          .join(" ") ||
        get(top.address_components, "neighborhood") ||
        get(top.address_components, "sublocality") ||
        formatted.split(",")[0];
      return new Response(
        JSON.stringify({
          result: {
            label: formatted,
            line1,
            city:
              get(top.address_components, "locality") ||
              get(top.address_components, "administrative_area_level_2"),
            state: get(top.address_components, "administrative_area_level_1"),
            pincode: get(top.address_components, "postal_code"),
            lat: top.geometry?.location?.lat ?? lat,
            lng: top.geometry?.location?.lng ?? lng,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ola-maps failed", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
