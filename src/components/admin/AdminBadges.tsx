import { useMemo, useState } from "react";
import {
  Plus, Pencil, Trash2, Save, X, Check, Users, Award, AlertCircle,
} from "lucide-react";
import {
  useBadges,
  badgeToneClass,
  type BadgeDefinition,
  type BadgeMetric,
  type BadgeCriterion,
} from "@/contexts/BadgeContext";
import { professionals } from "@/data/services";
import { cn } from "@/lib/utils";

const METRIC_LABELS: Record<BadgeMetric, string> = {
  completed_bookings: "Completed bookings ≥",
  average_rating: "Average rating ≥",
  rated_bookings: "Rated bookings ≥",
  response_rate: "Response rate (%) ≥",
  punctuality: "Avg lateness (min) ≤",
  repeat_ratio: "Repeat customer ratio ≥ (0–1)",
  verified_aadhaar: "Aadhaar verified (1 = yes)",
};

const TONES: BadgeDefinition["tone"][] = ["primary", "accent", "success", "warning", "muted"];

const emptyDraft = (): Omit<BadgeDefinition, "id" | "createdAt" | "updatedAt"> => ({
  icon: "🏅",
  label: "",
  description: "",
  tone: "primary",
  mode: "criteria",
  criteria: [{ metric: "completed_bookings", threshold: 10 }],
});

export const AdminBadges = () => {
  const {
    badges,
    createBadge,
    updateBadge,
    deleteBadge,
    partnersWithBadge,
    assignBadge,
    unassignBadge,
  } = useBadges();

  const [editing, setEditing] = useState<BadgeDefinition | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft());
  const [assigningFor, setAssigningFor] = useState<string | null>(null);

  const startCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setCreating(true);
  };
  const startEdit = (b: BadgeDefinition) => {
    setCreating(false);
    setEditing(b);
    setDraft({
      icon: b.icon,
      label: b.label,
      description: b.description,
      tone: b.tone,
      mode: b.mode,
      criteria: b.criteria,
    });
  };
  const cancel = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = () => {
    if (!draft.label.trim()) return;
    if (editing) {
      updateBadge(editing.id, draft);
    } else {
      createBadge(draft);
    }
    cancel();
  };

  const updateCriterion = (i: number, patch: Partial<BadgeCriterion>) => {
    setDraft((d) => ({
      ...d,
      criteria: d.criteria.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  };

  const addCriterion = () => {
    setDraft((d) => ({
      ...d,
      criteria: [...d.criteria, { metric: "completed_bookings", threshold: 1 }],
    }));
  };
  const removeCriterion = (i: number) => {
    setDraft((d) => ({ ...d, criteria: d.criteria.filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Badges</h2>
          <p className="text-xs text-muted-foreground">
            Create badges, set unlock criteria, or assign manually to specific partners.
          </p>
        </div>
        {!creating && !editing && (
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-1.5 rounded-xl gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-soft transition-smooth hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New badge
          </button>
        )}
      </div>

      {(creating || editing) && (
        <BadgeEditor
          draft={draft}
          editing={!!editing}
          onChange={setDraft}
          onSave={save}
          onCancel={cancel}
          updateCriterion={updateCriterion}
          addCriterion={addCriterion}
          removeCriterion={removeCriterion}
        />
      )}

      <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
        {badges.length === 0 ? (
          <div className="p-6 text-center">
            <Award className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">No badges yet</p>
            <p className="text-xs text-muted-foreground">Create your first badge to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {badges.map((b) => {
              const assignedIds = partnersWithBadge(b.id);
              return (
                <li key={b.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg border",
                        badgeToneClass[b.tone],
                      )}
                    >
                      {b.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-foreground">{b.label}</p>
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          {b.mode}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{b.description}</p>
                      {b.mode === "criteria" && b.criteria.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                          {b.criteria.map((c, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-success" />
                              {METRIC_LABELS[c.metric]} <span className="font-semibold text-foreground">{c.threshold}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {b.mode === "manual" && (
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
                          <Users className="h-3 w-3" /> {assignedIds.length} assigned
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(b)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {b.mode === "manual" && (
                        <button
                          onClick={() => setAssigningFor(assigningFor === b.id ? null : b.id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                          title="Manage partners"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${b.label}"?`)) deleteBadge(b.id);
                        }}
                        className="rounded-lg p-1.5 text-destructive transition-smooth hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {assigningFor === b.id && (
                    <ManualAssignmentList
                      assigned={assignedIds}
                      onAssign={(id) => assignBadge(b.id, id)}
                      onUnassign={(id) => unassignBadge(b.id, id)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

// ─── Editor ────────────────────────────────────────────────────────────────

interface EditorProps {
  draft: Omit<BadgeDefinition, "id" | "createdAt" | "updatedAt">;
  editing: boolean;
  onChange: (d: EditorProps["draft"]) => void;
  onSave: () => void;
  onCancel: () => void;
  updateCriterion: (i: number, patch: Partial<BadgeCriterion>) => void;
  addCriterion: () => void;
  removeCriterion: (i: number) => void;
}

const BadgeEditor = ({ draft, editing, onChange, onSave, onCancel, updateCriterion, addCriterion, removeCriterion }: EditorProps) => {
  const set = <K extends keyof EditorProps["draft"]>(key: K, value: EditorProps["draft"][K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{editing ? "Edit badge" : "New badge"}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold">
            <X className="mr-1 inline h-3.5 w-3.5" /> Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!draft.label.trim()}
            className="rounded-lg gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <Save className="mr-1 inline h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Icon">
          <input
            value={draft.icon}
            onChange={(e) => set("icon", e.target.value)}
            maxLength={4}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-center text-lg"
            placeholder="🏅"
          />
        </Field>
        <Field label="Label">
          <input
            value={draft.label}
            onChange={(e) => set("label", e.target.value)}
            maxLength={48}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Badge name"
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={160}
          rows={2}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          placeholder="When does a partner earn this badge?"
        />
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Tone">
          <div className="flex gap-1.5">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("tone", t)}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-smooth",
                  badgeToneClass[t],
                  draft.tone === t ? "ring-2 ring-offset-2 ring-offset-card" : "",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Assignment mode">
          <div className="flex gap-2">
            {(["criteria", "manual"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set("mode", m)}
                className={cn(
                  "flex-1 rounded-lg border-2 px-3 py-2 text-xs font-bold capitalize transition-smooth",
                  draft.mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {draft.mode === "criteria" && (
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Auto-assign criteria</p>
            <button
              onClick={addCriterion}
              className="inline-flex items-center gap-1 rounded-lg bg-card px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground hover:bg-muted"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            All criteria must pass for a partner to receive this badge.
          </p>
          <div className="mt-2 space-y-2">
            {draft.criteria.length === 0 && (
              <p className="text-[11px] text-warning">No criteria defined — this badge will never be auto-assigned.</p>
            )}
            {draft.criteria.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={c.metric}
                  onChange={(e) => updateCriterion(i, { metric: e.target.value as BadgeMetric })}
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                >
                  {(Object.entries(METRIC_LABELS) as [BadgeMetric, string][]).map(([m, lbl]) => (
                    <option key={m} value={m}>{lbl}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={c.threshold}
                  onChange={(e) => updateCriterion(i, { threshold: Number(e.target.value) })}
                  step="0.1"
                  className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                />
                <button
                  onClick={() => removeCriterion(i)}
                  className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
    {children}
  </label>
);

// ─── Manual partner picker ────────────────────────────────────────────────

interface PickerProps {
  assigned: string[];
  onAssign: (partnerId: string) => void;
  onUnassign: (partnerId: string) => void;
}

const ManualAssignmentList = ({ assigned, onAssign, onUnassign }: PickerProps) => {
  // We don't have a "partners" table to enumerate; the seed list is the
  // authoritative roster admins can pick from in this build. Real partner
  // user-ids (UUIDs) added through manual ID entry are also supported.
  const [manualId, setManualId] = useState("");
  const seed = useMemo(() => professionals, []);

  return (
    <div className="mt-3 rounded-xl bg-secondary/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned partners</p>
      <ul className="mt-2 divide-y divide-border rounded-lg bg-card">
        {seed.map((p) => {
          const on = assigned.includes(p.id);
          return (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full gradient-primary text-[10px] font-bold text-primary-foreground">
                {p.avatar}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{p.name}</span>
              <button
                onClick={() => (on ? onUnassign(p.id) : onAssign(p.id))}
                className={cn(
                  "rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-smooth",
                  on ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground hover:bg-muted",
                )}
              >
                {on ? "Assigned" : "Assign"}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Add by partner ID (UUID)</p>
        <div className="mt-1 flex gap-2">
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="0000-0000-…"
            className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          />
          <button
            onClick={() => {
              const id = manualId.trim();
              if (!id) return;
              onAssign(id);
              setManualId("");
            }}
            className="rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
          >
            Add
          </button>
        </div>
        {assigned.filter((id) => !seed.find((s) => s.id === id)).length > 0 && (
          <ul className="mt-2 space-y-1">
            {assigned
              .filter((id) => !seed.find((s) => s.id === id))
              .map((id) => (
                <li key={id} className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground truncate">{id}</span>
                  <button
                    onClick={() => onUnassign(id)}
                    className="ml-auto rounded p-1 text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
};
