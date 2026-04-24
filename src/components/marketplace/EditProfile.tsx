import { useState } from "react";
import { ArrowLeft, Save, Loader2, User } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/integrations/supabase/client";

export const EditProfile = () => {
  const { navigate } = useApp();
  const { user, profile, refreshProfile } = useAuth();
  const { push } = useNotifications();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [mobile, setMobile] = useState(profile?.mobile ?? "");
  const [bio, setBio] = useState((profile as { bio?: string } | null)?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState((profile as { avatar_url?: string } | null)?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      push({ kind: "warning", title: "Name required" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      push({ kind: "warning", title: "Save failed", body: error.message });
      return;
    }
    await refreshProfile();
    push({ kind: "success", title: "Profile updated" });
    navigate({ name: "profile" });
  };

  const initials = fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="-mt-5 space-y-4 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "profile" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full gradient-primary text-xl font-bold text-primary-foreground shadow-soft">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials || <User className="h-7 w-7" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Edit profile</p>
            <p className="text-xs text-muted-foreground">Update how partners see you</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mobile</label>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</label>
          <input
            value={user?.email ?? ""}
            disabled
            className="mt-1 w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">Email is locked for security</p>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Avatar URL</label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A short note about yourself"
            className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save changes
      </button>
    </div>
  );
};
