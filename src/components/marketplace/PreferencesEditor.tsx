import { useState } from "react";
import { Plus, X, Save } from "lucide-react";
import type { ServicePreferences, Service } from "@/types";
import { useMarketplaceData } from "@/contexts/MarketplaceDataContext";
import { useNotifications } from "@/contexts/NotificationContext";

interface Props {
  service: Service;
  onSaved?: () => void;
}

const PRESETS: Record<string, { label: string; time: string }[]> = {
  "pet-care": [
    { label: "Morning walk", time: "06:00" },
    { label: "Food", time: "08:00" },
    { label: "Medicine", time: "09:00" },
  ],
  "elder-care": [
    { label: "Medication", time: "08:00" },
    { label: "Lunch", time: "13:00" },
    { label: "Evening walk", time: "17:00" },
  ],
  babysitter: [
    { label: "Snack", time: "16:00" },
    { label: "Bath", time: "19:00" },
    { label: "Bedtime", time: "21:00" },
  ],
  housemaid: [
    { label: "Sweep & mop", time: "10:00" },
    { label: "Dishwashing", time: "11:00" },
  ],
};

export const PreferencesEditor = ({ service, onSaved }: Props) => {
  const { preferences, setPreferences } = useMarketplaceData();
  const { push } = useNotifications();
  const existing = preferences[service.id];

  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [schedule, setSchedule] = useState<{ label: string; time: string }[]>(
    existing?.schedule ?? PRESETS[service.categoryId] ?? [],
  );

  const updateRow = (i: number, field: "label" | "time", value: string) => {
    setSchedule((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setSchedule((prev) => [...prev, { label: "", time: "09:00" }]);
  const removeRow = (i: number) => setSchedule((prev) => prev.filter((_, idx) => idx !== i));

  const save = () => {
    const prefs: ServicePreferences = {
      serviceId: service.id,
      notes: notes.trim(),
      schedule: schedule.filter((r) => r.label.trim()),
    };
    setPreferences(service.id, prefs);
    push({ kind: "success", title: "Preferences saved" });
    onSaved?.();
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Your preferences for {service.name}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Saved & shared with your professional automatically.
      </p>

      <div className="mt-3 space-y-2">
        {schedule.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row.label}
              onChange={(e) => updateRow(i, "label", e.target.value)}
              placeholder="What"
              className="flex-1 rounded-lg border border-border bg-secondary px-2.5 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="time"
              value={row.time}
              onChange={(e) => updateRow(i, "time", e.target.value)}
              className="w-28 rounded-lg border border-border bg-secondary px-2.5 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => removeRow(i)}
              aria-label="Remove"
              className="rounded-lg bg-destructive/10 p-2 text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={addRow}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-card py-2 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary"
        >
          <Plus className="h-3.5 w-3.5" /> Add routine item
        </button>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Notes for the partner
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. My dog is friendly but barks at strangers initially…"
          rows={3}
          className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <button
        onClick={save}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-sm font-bold text-primary-foreground shadow-soft"
      >
        <Save className="h-4 w-4" /> Save preferences
      </button>
    </div>
  );
};