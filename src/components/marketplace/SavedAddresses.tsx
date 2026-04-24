import { useState } from "react";
import { ArrowLeft, MapPin, Plus, Star, Trash2, Edit2, Locate, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAddresses, SavedAddress } from "@/contexts/AddressContext";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

const empty = {
  label: "Home",
  line1: "",
  city: "",
  state: "",
  pincode: "",
  latitude: null as number | null,
  longitude: null as number | null,
  is_default: false,
};

export const SavedAddresses = () => {
  const { navigate } = useApp();
  const { addresses, addAddress, updateAddress, deleteAddress, setDefault, loading } = useAddresses();
  const { fetchLocation, loading: geoLoading } = useGeolocation();
  const { push } = useNotifications();
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);

  const startEdit = (a: SavedAddress) => {
    setEditing(a);
    setCreating(false);
    setForm({
      label: a.label,
      line1: a.line1,
      city: a.city ?? "",
      state: a.state ?? "",
      pincode: a.pincode ?? "",
      latitude: a.latitude,
      longitude: a.longitude,
      is_default: a.is_default,
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ ...empty, is_default: addresses.length === 0 });
  };

  const handleUseLocation = async () => {
    try {
      const c = await fetchLocation();
      setForm((f) => ({ ...f, latitude: c.latitude, longitude: c.longitude }));
      push({ kind: "success", title: "Location captured", body: c.label });
    } catch {
      push({ kind: "warning", title: "Location denied", body: "Allow location access in browser." });
    }
  };

  const handleSave = async () => {
    if (!form.line1.trim()) {
      push({ kind: "warning", title: "Address line required" });
      return;
    }
    try {
      if (editing) {
        await updateAddress(editing.id, {
          label: form.label,
          line1: form.line1,
          city: form.city || null,
          state: form.state || null,
          pincode: form.pincode || null,
          latitude: form.latitude,
          longitude: form.longitude,
          is_default: form.is_default,
        });
        push({ kind: "success", title: "Address updated" });
      } else {
        await addAddress({
          label: form.label,
          line1: form.line1,
          city: form.city || null,
          state: form.state || null,
          pincode: form.pincode || null,
          latitude: form.latitude,
          longitude: form.longitude,
          is_default: form.is_default,
        });
        push({ kind: "success", title: "Address added" });
      }
      setEditing(null);
      setCreating(false);
    } catch (e) {
      push({ kind: "warning", title: "Failed to save", body: (e as Error).message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    await deleteAddress(id);
    push({ kind: "info", title: "Address removed" });
  };

  const showForm = editing || creating;

  return (
    <div className="-mt-5 space-y-4 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "profile" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Saved Addresses</h2>
            <p className="text-xs text-muted-foreground">Manage where we send pros</p>
          </div>
          {!showForm && (
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-1 rounded-xl gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-soft"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {editing ? "Edit address" : "New address"}
          </p>
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              {(["Home", "Work", "Other"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setForm({ ...form, label: l })}
                  className={cn(
                    "rounded-xl py-2 text-xs font-semibold transition-smooth",
                    form.label === l
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-muted",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              placeholder="Address line"
              value={form.line1}
              onChange={(e) => setForm({ ...form, line1: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                placeholder="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <input
              placeholder="PIN code"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleUseLocation}
              disabled={geoLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-xs font-bold text-primary"
            >
              {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Locate className="h-3.5 w-3.5" />}
              {form.latitude ? `📍 ${form.latitude.toFixed(4)}, ${form.longitude?.toFixed(4)}` : "Use my current location"}
            </button>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              />
              Set as default
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
                className="flex-1 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-soft"
              >
                {editing ? "Save changes" : "Add address"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8 text-xs text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center shadow-soft">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">No saved addresses</p>
          <p className="mt-1 text-xs text-muted-foreground">Add one to book faster next time</p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{a.label}</p>
                    {a.is_default && (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold uppercase text-success">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.line1}
                    {a.city ? `, ${a.city}` : ""}
                    {a.state ? `, ${a.state}` : ""}
                    {a.pincode ? ` - ${a.pincode}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {!a.is_default && (
                  <button
                    onClick={() => setDefault(a.id)}
                    className="flex-1 rounded-lg bg-secondary py-1.5 text-[11px] font-semibold text-foreground"
                  >
                    <Star className="mr-1 inline h-3 w-3" /> Set default
                  </button>
                )}
                <button
                  onClick={() => startEdit(a)}
                  className="flex-1 rounded-lg bg-secondary py-1.5 text-[11px] font-semibold text-foreground"
                >
                  <Edit2 className="mr-1 inline h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="flex-1 rounded-lg bg-destructive/10 py-1.5 text-[11px] font-semibold text-destructive"
                >
                  <Trash2 className="mr-1 inline h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
