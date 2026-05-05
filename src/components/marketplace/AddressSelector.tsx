import { useState } from "react";
import { Crosshair, Loader2, AlertCircle, MapPin, CheckCircle2, X } from "lucide-react";
import { AddressSearch, type GeoAddress } from "./AddressSearch";
import { Input } from "@/components/ui/input";

export type { GeoAddress };

interface Props {
  onChange: (geo: GeoAddress) => void;
  placeholder?: string;
}

/**
 * Unified geo-based address picker.
 * Phase 1 — pick a base location via search autocomplete or GPS.
 * Phase 2 — optionally refine with flat/floor/landmark before confirming.
 * onChange is only called on explicit confirmation; lat/lng always come from Phase 1.
 */
export const AddressSelector = ({ onChange, placeholder = "Search area, street or landmark…" }: Props) => {
  const [pending, setPending] = useState<GeoAddress | null>(null);
  const [details, setDetails] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (geo: GeoAddress) => {
    setError(null);
    setPending(geo);
    setDetails("");
  };

  const handleConfirm = () => {
    if (!pending) return;
    const refinedLine1 = [details.trim(), pending.line1].filter(Boolean).join(", ");
    onChange({ ...pending, line1: refinedLine1 || pending.label.split(",")[0] });
    setPending(null);
    setDetails("");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setError(null);
    setLocating(true);

    const attempt = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          console.log(`[geolocation] GPS acquired (highAccuracy=${highAccuracy}): ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
              { headers: { "Accept-Language": "en" } },
            );
            const data = await res.json();
            const addr = data.address ?? {};
            const parts = [addr.house_number, addr.road, addr.neighbourhood || addr.suburb].filter(Boolean);
            handleSelect({
              label: data.display_name || "Current location",
              line1: parts.join(", ") || data.display_name?.split(",")[0] || "",
              city: addr.city || addr.town || addr.village || "",
              state: addr.state || "",
              pincode: addr.postcode || "",
              lat,
              lng,
            });
          } catch {
            // Coordinates captured even if reverse-geocoding fails; user can fill details
            handleSelect({ label: "Current location", line1: "", city: "", state: "", pincode: "", lat, lng });
          } finally {
            setLocating(false);
          }
        },
        (err) => {
          if (highAccuracy && err.code !== err.PERMISSION_DENIED) {
            // Retry without high-accuracy (common on desktop/browser GPS emulation)
            attempt(false);
            return;
          }
          setLocating(false);
          setError(
            err.code === err.PERMISSION_DENIED
              ? "Location access denied. Enable it in your browser settings."
              : "Couldn't detect your location. Please try again.",
          );
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 8000 : 5000 },
      );
    };

    attempt(true);
  };

  // ── Phase 2: refinement ────────────────────────────────────────────────────
  if (pending) {
    const shortLine = pending.line1 || pending.label.split(",")[0];
    const locationLine = [pending.city, pending.state, pending.pincode].filter(Boolean).join(", ");

    return (
      <div className="space-y-3">
        {/* Confirmed base location */}
        <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">{shortLine}</p>
            {locationLine && (
              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{locationLine}</p>
            )}
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-success">
              <CheckCircle2 className="h-3 w-3" />
              {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Change location"
            onClick={() => { setPending(null); setDetails(""); }}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-smooth hover:bg-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Optional refinement */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Flat / Floor / Landmark{" "}
            <span className="normal-case font-normal">(optional)</span>
          </label>
          <Input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. Flat 4B, 2nd floor, near park gate"
            className="text-xs"
          />
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="w-full rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition-bounce active:scale-[0.98]"
        >
          Confirm address
        </button>
      </div>
    );
  }

  // ── Phase 1: selection ─────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-xs font-semibold text-primary transition-smooth hover:bg-primary/10 disabled:opacity-60"
      >
        {locating ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Detecting location…</>
        ) : (
          <><Crosshair className="h-3.5 w-3.5" /> Use my current location</>
        )}
      </button>
      <AddressSearch
        placeholder={placeholder}
        onSelect={handleSelect}
      />
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      <p className="text-center text-[10px] text-muted-foreground">Powered by OpenStreetMap · India only</p>
    </div>
  );
};
