import { useState } from "react";
import {
  Edit2, Trash2, Plus, X, Check, Loader2,
  HeartPulse, Baby, Sparkles, PawPrint,
} from "lucide-react";
import { categories as seedCategories } from "@/data/services";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

const ICON_OPTIONS = ["HeartPulse", "Baby", "Sparkles", "PawPrint", "Star", "Zap", "Home", "Shield"];
const COLOR_OPTIONS = [
  { value: "primary", label: "Blue",   preview: "bg-primary/20 text-primary" },
  { value: "accent",  label: "Purple", preview: "bg-accent/20 text-accent" },
  { value: "warning", label: "Amber",  preview: "bg-warning/20 text-warning" },
  { value: "success", label: "Green",  preview: "bg-success/15 text-success" },
];

const ICON_MAP: Record<string, React.ElementType> = {
  HeartPulse, Baby, Sparkles, PawPrint,
};

interface AdminCategory extends Category {
  serviceCount: number;
  active: boolean;
}

const toAdmin = (c: Category, i: number): AdminCategory => ({
  ...c,
  serviceCount: [18, 12, 24, 8][i] ?? 5,
  active: true,
});

interface FormValues {
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface FormProps {
  initial?: AdminCategory;
  onSave: (vals: FormValues) => void;
  onCancel: () => void;
}

function CategoryForm({ initial, onSave, onCancel }: FormProps) {
  const [vals, setVals] = useState<FormValues>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    icon: initial?.icon ?? "Sparkles",
    color: initial?.color ?? "primary",
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
    setVals((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vals.name.trim()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 350));
    onSave(vals);
    setSaving(false);
  };

  const PreviewIcon = ICON_MAP[vals.icon] ?? Sparkles;
  const previewColor = COLOR_OPTIONS.find((c) => c.value === vals.color)?.preview ?? "";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{initial ? "Edit Category" : "New Category"}</p>
        <button type="button" onClick={onCancel} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", previewColor)}>
          <PreviewIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{vals.name || "Category name"}</p>
          <p className="text-xs text-muted-foreground">{vals.description || "Description preview"}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Category name *</label>
          <input
            value={vals.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Elder Care"
            required
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
          <input
            value={vals.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short tagline"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Icon</label>
          <select
            value={vals.icon}
            onChange={(e) => set("icon", e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Color theme</label>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => set("color", c.value)}
                className={cn(
                  "flex-1 rounded-xl border py-2 text-xs font-semibold transition-smooth",
                  c.preview,
                  vals.color === c.value ? "ring-2 ring-primary" : "border-border opacity-60",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-primary-foreground shadow-soft disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Category"}
        </button>
      </div>
    </form>
  );
}

export const AdminCategories = () => {
  const [cats, setCats] = useState<AdminCategory[]>(seedCategories.map(toAdmin));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);

  const deleteCategory = (id: string) => {
    if (!window.confirm("Delete this category? Services using it won't be affected.")) return;
    setCats((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = (vals: FormValues, existing?: AdminCategory) => {
    const base: AdminCategory = {
      id: existing?.id ?? `cat-${Date.now()}`,
      name: vals.name.trim(),
      description: vals.description.trim(),
      icon: vals.icon,
      color: vals.color,
      serviceCount: existing?.serviceCount ?? 0,
      active: existing?.active ?? true,
    };
    if (existing) {
      setCats((prev) => prev.map((c) => (c.id === existing.id ? base : c)));
    } else {
      setCats((prev) => [...prev, base]);
    }
    setAdding(false);
    setEditing(null);
  };

  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent:  "bg-accent/10 text-accent",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/10 text-success",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{cats.length} categories total</p>
        <button
          onClick={() => { setAdding(true); setEditing(null); }}
          className="flex items-center gap-1.5 rounded-xl gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-soft"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {(adding || editing) && (
        <CategoryForm
          initial={editing ?? undefined}
          onSave={(vals) => handleSave(vals, editing ?? undefined)}
          onCancel={() => { setAdding(false); setEditing(null); }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {cats.map((cat) => {
          const Icon = ICON_MAP[cat.icon] ?? Sparkles;
          return (
            <div key={cat.id} className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", colorMap[cat.color])}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{cat.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{cat.description}</p>
                  <p className="mt-1 text-[11px] font-semibold text-primary">{cat.serviceCount} services</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <button
                  onClick={() => { setEditing(cat); setAdding(false); }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold transition-smooth hover:bg-secondary"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
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
