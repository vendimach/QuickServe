import { useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, Save, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/integrations/supabase/client";
import { compressAvatar } from "@/lib/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AvatarBadge } from "./AvatarBadge";

export const EditProfileView = () => {
  const { navigate } = useApp();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { push } = useNotifications();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [mobile, setMobile] = useState(profile?.mobile ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  // Local preview overrides the persisted avatar_url so the user sees their
  // pick instantly. null means "no override"; explicit empty string means
  // "remove the existing avatar". Persisted only on Save.
  const [avatarPreview, setAvatarPreview] = useState<string | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // What to display now: the in-progress preview if any, otherwise the saved one.
  const displayAvatar =
    avatarPreview === undefined ? profile?.avatar_url ?? null : avatarPreview;

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setFormError("Image must be smaller than 8 MB.");
      return;
    }
    setFormError("");
    setUploading(true);
    try {
      const compressed = await compressAvatar(file);
      setAvatarPreview(compressed);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Couldn't read image");
    } finally {
      setUploading(false);
      // Reset file input so re-picking the same file fires onChange.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) { setFormError("Name is required"); return; }
    if (mobile.replace(/\D/g, "").length < 10) { setFormError("Enter a valid 10-digit mobile number"); return; }
    setFormError("");
    setSaving(true);
    const update: Record<string, unknown> = { full_name: fullName, mobile, bio };
    // Only touch avatar_url when the user explicitly changed it — saves a
    // round-trip and avoids overwriting a remotely-updated value.
    if (avatarPreview !== undefined) {
      update.avatar_url = avatarPreview === "" ? null : avatarPreview;
    }
    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    await refreshProfile();
    push({ kind: "success", title: "Profile updated" });
    navigate({ name: "profile" });
  };

  const deleteAccount = async () => {
    if (!user) return;
    if (!window.confirm("Delete your account? This signs you out and removes your profile data.")) return;
    await supabase.from("profiles").delete().eq("id", user.id);
    await signOut();
  };

  return (
    <div className="space-y-3 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "profile" })}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="relative">
            <AvatarBadge
              src={displayAvatar}
              name={fullName || profile?.full_name}
              className="h-16 w-16 text-base"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold">Edit Profile</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePickFile}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary disabled:opacity-60"
              >
                <Camera className="h-3 w-3" />
                {displayAvatar ? "Change photo" : "Upload photo"}
              </button>
              {displayAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </div>
        <div>
          <Label>Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
        </div>
        <div>
          <Label>Mobile</Label>
          <Input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" />
        </div>
        <div>
          <Label>Bio (optional)</Label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={3}
            className="w-full rounded-xl border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {formError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{formError}</p>
        )}
        <Button type="submit" className="w-full" disabled={saving || uploading}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <Button variant="outline" className="w-full text-destructive border-destructive/30" onClick={deleteAccount}>
        Delete account & sign out
      </Button>
    </div>
  );
};
