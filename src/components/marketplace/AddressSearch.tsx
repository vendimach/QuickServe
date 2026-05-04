import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";

export interface GeoAddress {
  label: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
}

interface Props {
  onSelect: (r: GeoAddress) => void;
  placeholder?: string;
}

export const AddressSearch = ({ onSelect, placeholder = "Search for an address…" }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          format: "json",
          q: query,
          countrycodes: "in",
          limit: "5",
          addressdetails: "1",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { headers: { "Accept-Language": "en" } },
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any[] = await res.json();
        const mapped: GeoAddress[] = data.map((item) => {
          const a: Record<string, string> = item.address ?? {};
          const parts = [a.house_number, a.road, a.neighbourhood, a.suburb].filter(Boolean);
          const line1 = parts.length > 0 ? parts.join(", ") : item.display_name.split(",")[0];
          return {
            label: item.display_name as string,
            line1,
            city: a.city ?? a.town ?? a.village ?? a.county ?? "",
            state: a.state ?? "",
            pincode: a.postcode ?? "",
            lat: parseFloat(item.lat as string),
            lng: parseFloat(item.lon as string),
          };
        });
        setResults(mapped);
        setOpen(mapped.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2.5">
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <input
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          autoComplete="off"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-smooth hover:bg-secondary"
                onClick={() => {
                  onSelect(r);
                  setQuery(r.line1);
                  setOpen(false);
                }}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="line-clamp-2 text-xs text-foreground">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
