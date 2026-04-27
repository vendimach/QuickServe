import { useState } from "react";
import { ArrowLeft, MapPin, Plus, Trash2, Star, Crosshair, Loader2, CheckCircle2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useUserData, type SavedAddress } from "@/contexts/UserDataContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const AddressesView = () => {
  const { navigate } = useApp();
  const { addresses, addAddress, deleteAddress, setDefaultAddress, loadingAddresses } = useUserData();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);

  return (
    <div className="space-y-3 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "profile" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl bg-card p-4 shadow-card">
        <h2 className="text-base font-bold text-foreground">Saved Addresses</h2>
        <p className="text-xs text-muted-foreground">Tap an address to set as default. Edit or delete anytime.</p>
      </div>

      {loadingAddresses && (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!loadingAddresses && addresses.length === 0 && !adding && (
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold">No saved addresses</p>
          <p className="text-xs text-muted-foreground">Add one to speed up bookings.</p>
        </div>
      )}

      <div className="space-y-2">
        {addresses.map((a) => (
          <div
            key={a.id}
            className={cn(
              "rounded-2xl bg-card p-4 shadow-soft transition-smooth",
              a.is_default && "ring-2 ring-primary/40",
            )}
          >
            <button
              onClick={() => setDefaultAddress(a.id)}
              className="flex w-full items-start gap-3 text-left"
            >
              <div className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                a.is_default ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
              )}>
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{a.label}</p>
                  {a.is_default && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      <Star className="h-3 w-3" /> Default
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.line1}{a.city ? `, ${a.city}` : ""}{a.state ? `, ${a.state}` : ""}{a.pincode ? ` — ${a.pincode}` : ""}
                </p>
              </div>
            </button>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(a)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-destructive border-destructive/30"
                onClick={() => {
                  if (window.confirm(`Delete "${a.label}"?`)) deleteAddress(a.id).catch((e) => toast.error(e.message));
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!adding && !editing && (
        <Button onClick={() => setAdding(true)} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add new address
        </Button>
      )}

      {(adding || editing) && (
        <AddressForm
          existing={editing ?? undefined}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSaved={async (a) => {
            try {
              if (editing) {
                // Update is handled inside AddressForm directly — nothing to do here.
              } else {
                const saved = await addAddress(a);
                if (a.is_default && saved) {
                  await setDefaultAddress(saved.id);
                }
                toast.success("Address saved");
              }
            } catch (e: any) {
              toast.error(e.message);
            } finally {
              setAdding(false);
              setEditing(null);
            }
          }}
        />
      )}
    </div>
  );
};

interface FormProps {
  existing?: SavedAddress;
  onSaved: (a: { label: string; line1: string; city?: string; state?: string; pincode?: string; latitude?: number; longitude?: number; is_default?: boolean }) => void;
  onCancel: () => void;
}

const AddressForm = ({ existing, onSaved, onCancel }: FormProps) => {
  const { updateAddress } = useUserData();
  const [label, setLabel] = useState(existing?.label ?? "Home");
  const [line1, setLine1] = useState(existing?.line1 ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [state, setState] = useState(existing?.state ?? "");
  const [pincode, setPincode] = useState(existing?.pincode ?? "");
  const [lat, setLat] = useState<number | null>(existing?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(existing?.longitude ?? null);
  const [makeDefault, setMakeDefault] = useState<boolean>(existing?.is_default ?? false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported on this device");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude); setLng(longitude);
        try {
          const { data, error } = await supabase.functions.invoke("geocode", {
            body: { latlng: `${latitude},${longitude}` },
          });
          if (error) throw error;
          // Edge function returns: { formatted, line1, city, state, pincode, lat, lng }
          if (data?.line1) setLine1(data.line1);
          else if (data?.formatted) setLine1(data.formatted);
          if (data?.city) setCity(data.city);
          if (data?.state) setState(data.state);
          if (data?.pincode) setPincode(data.pincode);
          toast.success("Location detected");
        } catch (e: any) {
          toast.error(`Couldn't reverse-geocode: ${e.message ?? "unknown"}`);
        } finally {
          setLocating(false);
        }
      },
      (err) => { setLocating(false); toast.error(err.message); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line1.trim()) return toast.error("Enter address line");
    setSaving(true);
    try {
      if (existing) {
        await updateAddress(existing.id, { label, line1, city, state, pincode, latitude: lat ?? undefined, longitude: lng ?? undefined, is_default: makeDefault });
        toast.success("Address updated");
        onSaved({ label, line1, city, state, pincode, is_default: makeDefault });
      } else {
        onSaved({ label, line1, city, state, pincode, latitude: lat ?? undefined, longitude: lng ?? undefined, is_default: makeDefault });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">{existing ? "Edit address" : "New address"}</p>
        <Button type="button" size="sm" variant="ghost" onClick={useMyLocation} disabled={locating}>
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
          <span className="ml-1 text-xs">Use my location</span>
        </Button>
      </div>
      <div>
        <Label>Label</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home / Work" />
      </div>
      <div>
        <Label>Address</Label>
        <Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="House, street, area" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>City</Label>
          <Input value={city ?? ""} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <Label>Pincode</Label>
          <Input value={pincode ?? ""} onChange={(e) => setPincode(e.target.value)} inputMode="numeric" maxLength={6} />
        </div>
      </div>
      <div>
        <Label>State</Label>
        <Input value={state ?? ""} onChange={(e) => setState(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 cursor-pointer">
        <Checkbox
          checked={makeDefault}
          onCheckedChange={(v) => setMakeDefault(v === true)}
        />
        <span className="text-xs font-medium text-foreground">Set as default address</span>
      </label>
      {lat && lng && (
        <p className="flex items-center gap-1 text-[11px] text-success">
          <CheckCircle2 className="h-3 w-3" /> Pinned at {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
};
