import { useState, useMemo } from "react";
import {
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight,
  Star, Clock, IndianRupee, X, Check, Loader2,
} from "lucide-react";
import { services as seedServices, categories } from "@/data/services";
import type { Service } from "@/types";
import { cn } from "@/lib/utils";

// Extend Service with admin-only flags
interface AdminService extends Service {
  isPopular: boolean;
  isNew: boolean;
  active: boolean;
}

const toAdmin = (s: Service): AdminService => ({
  ...s,
  isPopular: ["s1", "s3", "s5"].includes(s.id),
  isNew: ["s7", "s8"].includes(s.id),
  active: true,
});

const ICONS = ["HeartPulse", "Baby", "Sparkles", "PawPrint", "Star", "Zap"];

interface FormValues {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  duration: string;
  rating: string;
  icon: string;
  isPopular: boolean;
  isNew: boolean;
  active: boolean;
}

const defaultForm = (): FormValues => ({
  name: "",
  description: "",
  categoryId: categories[0].id,
  price: "",
  duration: "",
  rating: "4.5",
  icon: "Sparkles",
  isPopular: false,
  isNew: false,
  active: true,
});

interface ServiceFormProps {
  initial?: AdminService;
  onSave: (vals: FormValues) => void;
  onCancel: () => void;
}

function ServiceForm({ initial, onSave, onCancel }: ServiceFormProps) {
  const [vals, setVals] = useState<FormValues>(
    initial
      ? {
          name: initial.name,
          description: initial.description,
          categoryId: initial.categoryId,
          price: String(initial.price),
          duration: initial.duration,
          rating: String(initial.rating),
          icon: initial.icon,
          isPopular: initial.isPopular,
          isNew: initial.isNew,
          active: initial.active,
        }
      : defaultForm(),
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
    setVals((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vals.name.trim() || !vals.price || !vals.duration) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400)); // simulate async
    onSave(vals);
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-card p-5 shadow-card border border-border"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{initial ? "Edit Service" : "New Service"}</p>
        <button type="button" onClick={onCancel} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Service name *</label>
          <input
            value={vals.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Evening Babysitter"
            required
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
          <textarea
            value={vals.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Short description shown on card"
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Category *</label>
          <select
            value={vals.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Icon</label>
          <select
            value={vals.icon}
            onChange={(e) => set("icon", e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Price (₹) *</label>
          <input
            type="number"
            value={vals.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="499"
            required
            min={1}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Duration *</label>
          <input
            value={vals.duration}
            onChange={(e) => set("duration", e.target.value)}
            placeholder="4 hrs"
            required
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rating (0–5)</label>
          <input
            type="number"
            step="0.1"
            min={0}
            max={5}
            value={vals.rating}
            onChange={(e) => set("rating", e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { key: "isPopular" as const, label: "Popular" },
            { key: "isNew"     as const, label: "New" },
            { key: "active"    as const, label: "Active" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => set(key, !vals[key])}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-smooth",
              vals[key]
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {vals[key] ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-primary-foreground shadow-soft disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Service"}
        </button>
      </div>
    </form>
  );
}

// Toggle switch
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex flex-col items-center gap-0.5"
      title={label}
    >
      <div className={cn(
        "relative h-5 w-9 rounded-full transition-colors duration-200",
        checked ? "bg-primary" : "bg-muted",
      )}>
        <div className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0.5",
        )} />
      </div>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </button>
  );
}

export const AdminServices = () => {
  const [services, setServices] = useState<AdminService[]>(seedServices.map(toAdmin));
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AdminService | null>(null);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchCat = catFilter === "all" || s.categoryId === catFilter;
      const matchQ = s.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchQ;
    });
  }, [services, search, catFilter]);

  const toggle = (id: string, field: "isPopular" | "isNew" | "active") =>
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: !s[field] } : s)),
    );

  const deleteService = (id: string) => {
    if (!window.confirm("Delete this service?")) return;
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = (vals: FormValues, existing?: AdminService) => {
    const base: AdminService = {
      id: existing?.id ?? `custom-${Date.now()}`,
      name: vals.name.trim(),
      description: vals.description.trim(),
      categoryId: vals.categoryId,
      price: Number(vals.price),
      duration: vals.duration.trim(),
      rating: Number(vals.rating) || 4.5,
      reviews: existing?.reviews ?? 0,
      icon: vals.icon,
      isPopular: vals.isPopular,
      isNew: vals.isNew,
      active: vals.active,
    };
    if (existing) {
      setServices((prev) => prev.map((s) => (s.id === existing.id ? base : s)));
    } else {
      setServices((prev) => [...prev, base]);
    }
    setAdding(false);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={() => { setAdding(true); setEditing(null); }}
          className="flex items-center gap-1.5 rounded-xl gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-soft"
        >
          <Plus className="h-4 w-4" /> Add Service
        </button>
      </div>

      {/* Form */}
      {(adding || editing) && (
        <ServiceForm
          initial={editing ?? undefined}
          onSave={(vals) => handleSave(vals, editing ?? undefined)}
          onCancel={() => { setAdding(false); setEditing(null); }}
        />
      )}

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {services.length} services
      </p>

      {/* Service list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center shadow-soft">
            <p className="text-sm text-muted-foreground">No services match your filters.</p>
          </div>
        )}
        {filtered.map((s) => {
          const cat = categories.find((c) => c.id === s.categoryId);
          return (
            <div
              key={s.id}
              className={cn(
                "rounded-2xl bg-card p-4 shadow-soft transition-smooth",
                !s.active && "opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-lg">
                  ✦
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground">{s.name}</p>
                    {s.isPopular && (
                      <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[9px] font-bold uppercase text-warning">
                        Popular
                      </span>
                    )}
                    {s.isNew && (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold uppercase text-success">
                        New
                      </span>
                    )}
                    {!s.active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.description}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">
                      {cat?.name}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      {s.rating}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {s.duration}
                    </span>
                    <span className="flex items-center gap-0.5 font-bold text-foreground">
                      <IndianRupee className="h-3 w-3" /> {s.price}
                    </span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-3">
                  <Toggle checked={s.isPopular} onChange={() => toggle(s.id, "isPopular")} label="Popular" />
                  <Toggle checked={s.isNew} onChange={() => toggle(s.id, "isNew")} label="New" />
                  <Toggle checked={s.active} onChange={() => toggle(s.id, "active")} label="Active" />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <button
                  onClick={() => { setEditing(s); setAdding(false); }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-foreground transition-smooth hover:bg-secondary"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => deleteService(s.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/30 py-2 text-xs font-semibold text-destructive transition-smooth hover:bg-destructive/5"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
