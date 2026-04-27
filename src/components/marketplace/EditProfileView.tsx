import { useState } from "react";
import { ArrowLeft, User, Save } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const EditProfileView = () => {
  const { navigate } = useApp();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [mobile, setMobile] = useState(profile?.mobile ?? "");
  const [bio, setBio] = useState((profile as any)?.bio ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) return toast.error("Name required");
    if (mobile.replace(/\D/g, "").length < 10) return toast.error("Valid mobile required");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, mobile, bio })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profile updated");
    navigate({ name: "profile" });
  };

  const deleteAccount = async () => {
    if (!user) return;
    if (!window.confirm("Delete your account? This signs you out and removes your profile data.")) return;
    await supabase.from("profiles").delete().eq("id", user.id);
    await signOut();
    toast.success("Account data deleted");
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-primary-foreground">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-bold">Edit Profile</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
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
        <Button type="submit" className="w-full" disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <Button variant="outline" className="w-full text-destructive border-destructive/30" onClick={deleteAccount}>
        Delete account & sign out
      </Button>
    </div>
  );
};
