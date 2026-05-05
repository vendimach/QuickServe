import { useState } from "react";
import { ArrowLeft, MapPin, Plus, Trash2, Star, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useUserData, type SavedAddress } from "@/contexts/UserDataContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { AddressSelector, type GeoAddress } from "./AddressSelector";

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
                {a.latitude && a.longitude && (
                  <p className="mt-0.5 text-[10px] text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Geo-verified
                  </p>
                )}
              </div>
            </button>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(a)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-destructive border-destructive/30"
                onClick={() => {
                  if (window.confirm(`Delete "${a.label}"?`)) deleteAddress(a.id).catch(() => {});
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
              if (!editing) {
                const saved = await addAddress(a);
                if (a.is_default && saved) {
                  await setDefaultAddress(saved.id);
                }
              }
            } catch {
              // silently ignore
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
  onSaved: (a: {
    label: string;
    line1: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
  }) => void;
  onCancel: () => void;
}

const AddressForm = ({ existing, onSaved, onCancel }: FormProps) => {
  const { updateAddress, setDefaultAddress } = useUserData();
  const [label, setLabel] = useState(existing?.label ?? "Home");
  const [makeDefault, setMakeDefault] = useState<boolean>(existing?.is_default ?? false);
  const [saving, setSaving] = useState(false);

  // Reconstruct GeoAddress from saved fields when editing
  const [geo, setGeo] = useState<GeoAddress | null>(
    existing?.latitude && existing?.longitude
      ? {
          label: existing.line1,
          line1: existing.line1,
          city: existing.city ?? "",
          state: existing.state ?? "",
          pincode: existing.pincode ?? "",
          lat: existing.latitude,
          lng: existing.longitude,
        }
      : null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geo) return;
    setSaving(true);
    try {
      const payload = {
        label,
        line1: geo.line1 || geo.label.split(",")[0],
        city: geo.city || undefined,
        state: geo.state || undefined,
        pincode: geo.pincode || undefined,
        latitude: geo.lat,
        longitude: geo.lng,
        is_default: makeDefault,
      };
      if (existing) {
        await updateAddress(existing.id, payload);
        if (makeDefault) await setDefaultAddress(existing.id);
      }
      onSaved(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
      <p className="text-sm font-bold">{existing ? "Edit address" : "New address"}</p>

      {geo ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">
                {geo.line1 || geo.label.split(",")[0]}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {[geo.city, geo.state, geo.pincode].filter(Boolean).join(", ")}
              </p>
              <p className="mt-0.5 text-[10px] text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Location pinned
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGeo(null)}
              className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <AddressSelector onChange={setGeo} />
      )}

      <div>
        <Label>Label</Label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Home / Work / Other"
        />
      </div>

      <label className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 cursor-pointer">
        <Checkbox
          checked={makeDefault}
          onCheckedChange={(v) => setMakeDefault(v === true)}
        />
        <span className="text-xs font-medium text-foreground">Set as default address</span>
      </label>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={saving || !geo}>
          {saving ? "Saving…" : existing ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  );
};
