import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Phone,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Step progress bar ────────────────────────────────────────────────────────
const STEP_LABELS = ["Profile", "Verify Phone", "Aadhaar", "Verify Aadhaar"] as const;
type StepNum = 1 | 2 | 3 | 4;

function StepBar({ current }: { current: StepNum }) {
  return (
    <div className="flex items-start gap-1 mb-6">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as StepNum;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex flex-1 flex-col items-center gap-1.5">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-smooth",
              done ? "bg-success text-white" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : n}
            </div>
            <span className={cn(
              "text-[10px] font-medium text-center leading-tight",
              active ? "text-primary" : done ? "text-success" : "text-muted-foreground",
            )}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Role + Name + Phone ─────────────────────────────────────────────
function Step1({ onComplete }: { onComplete: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [role, setRole] = useState<"customer" | "partner">("customer");
  const [name, setName] = useState(
    profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? "",
  );
  const [phone, setPhone] = useState(profile?.mobile ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Enter your full name"); return; }
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    console.log("[onboarding/step1] submitting", { uid: user!.id, role, hasExistingProfile: !!profile });

    // Build the profile payload carefully — never reset verification flags or
    // the onboarding flag for a user who already finished onboarding. An
    // unconditional upsert here would silently drop them back to step 1 the
    // next time they signed in.
    const profilePayload: Record<string, unknown> = {
      id: user!.id,
      full_name: name.trim(),
      mobile: cleaned,
      accepted_terms: true,
    };
    if (!profile) {
      // Brand-new row → seed defaults that the rest of onboarding flips.
      profilePayload.mobile_verified = false;
      profilePayload.aadhaar_verified = false;
      profilePayload.onboarding_completed = false;
    } else {
      // Existing row → only mark mobile_verified false if the phone number is
      // actually changing. Leave aadhaar_verified and onboarding_completed
      // untouched so a returning user doesn't get demoted.
      if ((profile.mobile ?? "") !== cleaned) {
        profilePayload.mobile_verified = false;
      }
    }

    // Role save without UPDATE-path RLS dependency:
    // 1. SELECT the user's existing role rows.
    // 2. If the requested role already exists → no-op.
    //    Otherwise INSERT a new row (covered by the existing INSERT policy).
    // 3. Optionally remove other-role rows so a single user has one role.
    //    DELETE is now policy-allowed via the new migration; if the migration
    //    hasn't run yet we simply skip the cleanup and don't fail onboarding.
    let roleErr: Error | null = null;
    try {
      const { data: existingRoles, error: roleSelErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (roleSelErr) throw roleSelErr;

      const has = (existingRoles ?? []).some((r) => r.role === role);
      if (!has) {
        console.log("[onboarding/step1] inserting role row", { role });
        const { error: insErr } = await supabase
          .from("user_roles")
          .insert({ user_id: user!.id, role });
        if (insErr) throw insErr;
      } else {
        console.log("[onboarding/step1] role already present — no insert needed");
      }

      // Best-effort cleanup of any other-role rows. Don't surface failures —
      // a successful primary role assignment is what onboarding cares about.
      const stale = (existingRoles ?? []).filter((r) => r.role !== role);
      if (stale.length > 0) {
        const { error: delErr } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user!.id)
          .neq("role", role);
        if (delErr) {
          console.warn("[onboarding/step1] could not clean up stale roles (non-fatal)", delErr);
        }
      }
    } catch (e) {
      roleErr = e instanceof Error ? e : new Error(String(e));
      console.error("[onboarding/step1] role save failed", roleErr);
    }

    const { error: pErr } = await supabase.from("profiles").upsert(profilePayload);
    setLoading(false);
    if (roleErr || pErr) {
      setError(roleErr?.message ?? pErr?.message ?? "Failed to save. Please retry.");
      return;
    }
    await onComplete();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm font-semibold text-foreground">Tell us about yourself</p>
        <p className="text-xs text-muted-foreground">Helps us personalise your experience</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">I want to</p>
        <div className="grid grid-cols-2 gap-2">
          {(["customer", "partner"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={cn(
                "rounded-xl border-2 py-2.5 text-sm font-semibold capitalize transition-smooth",
                role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              {r === "customer" ? "Book Services" : "Offer Services"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="ob1-name">Full Name</Label>
        <Input id="ob1-name" required value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          placeholder="Rahul Sharma" />
      </div>
      <div>
        <Label htmlFor="ob1-phone">Mobile Number</Label>
        <div className="flex gap-2">
          <span className="flex items-center rounded-lg border border-border bg-secondary px-3 text-sm text-muted-foreground whitespace-nowrap">
            +91
          </span>
          <Input id="ob1-phone" inputMode="numeric" maxLength={10} required value={phone}
            onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
            placeholder="9876543210" />
        </div>
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving…</>
          : <>Continue <ArrowRight className="h-4 w-4 ml-1" /></>}
      </Button>
    </form>
  );
}

// ─── Step 2: Verify Phone OTP ─────────────────────────────────────────────────
function Step2({ onComplete }: { onComplete: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [otp, setOtp] = useState("");
  // Demo: generate once on mount and never change
  const [demoOtp] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.trim().replace(/\D/g, "").length < 6) { setError("Enter the 6-digit OTP"); return; }
    if (otp.trim() !== demoOtp) { setError("Incorrect OTP — use the demo code shown above"); return; }
    setLoading(true);
    const { error: err } = await supabase.from("profiles")
      .update({ mobile_verified: true })
      .eq("id", user!.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    await onComplete();
  };

  return (
    <form onSubmit={verify} className="space-y-4">
      <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
        <Phone className="h-6 w-6 text-primary mx-auto mb-2" />
        <p className="text-sm font-semibold">Verify your phone number</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          OTP sent to +91 {profile?.mobile}
        </p>
      </div>
      <div className="rounded-xl border-2 border-dashed border-warning/60 bg-warning/10 p-3 text-center">
        <p className="text-[10px] font-bold text-warning uppercase tracking-wider">Demo mode — your OTP</p>
        <p className="text-3xl font-bold tracking-[0.3em] text-foreground mt-1">{demoOtp}</p>
      </div>
      <div>
        <Label htmlFor="ob2-otp">Enter OTP</Label>
        <Input id="ob2-otp" inputMode="numeric" maxLength={6} value={otp}
          onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="6-digit code" className="text-center tracking-widest text-lg" />
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Verifying…</>
          : <>Verify Phone <ArrowRight className="h-4 w-4 ml-1" /></>}
      </Button>
    </form>
  );
}

// ─── Step 3: Aadhaar number ───────────────────────────────────────────────────
function Step3({ onComplete }: { onComplete: () => Promise<void> }) {
  const { user } = useAuth();
  const [aadhaar, setAadhaar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatAadhaar = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 12);
    return d.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" "),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const digits = aadhaar.replace(/\D/g, "");
    if (digits.length !== 12) { setError("Enter all 12 digits of your Aadhaar number"); return; }
    setLoading(true);
    const { error: err } = await supabase.from("profiles")
      .update({ aadhaar_last4: digits.slice(-4) })
      .eq("id", user!.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    await onComplete();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center mb-2">
        <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
        <p className="text-sm font-semibold">Aadhaar Verification</p>
        <p className="text-xs text-muted-foreground">Enter your 12-digit Aadhaar card number</p>
      </div>
      <div>
        <Label htmlFor="ob3-aadhaar">Aadhaar Number</Label>
        <Input id="ob3-aadhaar" inputMode="numeric" required
          value={formatAadhaar(aadhaar)}
          onChange={(e) => { setAadhaar(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="0000 0000 0000"
          className="tracking-widest text-center text-lg"
          maxLength={14} />
        <p className="text-[11px] text-muted-foreground mt-1.5">
          We only store the last 4 digits for your security
        </p>
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving…</>
          : <>Send OTP to phone <ArrowRight className="h-4 w-4 ml-1" /></>}
      </Button>
    </form>
  );
}

// ─── Step 4: Verify Aadhaar OTP ───────────────────────────────────────────────
function Step4({ onComplete }: { onComplete: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [otp, setOtp] = useState("");
  const [demoOtp] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.trim().replace(/\D/g, "").length < 6) { setError("Enter the 6-digit OTP"); return; }
    if (otp.trim() !== demoOtp) { setError("Incorrect OTP — use the demo code shown above"); return; }
    setLoading(true);
    const { error: err } = await supabase.from("profiles")
      .update({ aadhaar_verified: true, onboarding_completed: true })
      .eq("id", user!.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    await onComplete();
  };

  return (
    <form onSubmit={verify} className="space-y-4">
      <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
        <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
        <p className="text-sm font-semibold">Verify Aadhaar</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          OTP sent to +91 {profile?.mobile}
          {profile?.aadhaar_last4 && (
            <span className="ml-1">(Aadhaar ••••{profile.aadhaar_last4})</span>
          )}
        </p>
      </div>
      <div className="rounded-xl border-2 border-dashed border-warning/60 bg-warning/10 p-3 text-center">
        <p className="text-[10px] font-bold text-warning uppercase tracking-wider">Demo mode — your OTP</p>
        <p className="text-3xl font-bold tracking-[0.3em] text-foreground mt-1">{demoOtp}</p>
      </div>
      <div>
        <Label htmlFor="ob4-otp">Enter OTP</Label>
        <Input id="ob4-otp" inputMode="numeric" maxLength={6} value={otp}
          onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="6-digit code" className="text-center tracking-widest text-lg" />
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Verifying…</>
          : <>Complete Setup <ArrowRight className="h-4 w-4 ml-1" /></>}
      </Button>
    </form>
  );
}

// ─── Main Onboarding page ─────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading, onboardingStep, refreshProfile, signOut } = useAuth();

  // Local active step lets the user move BACKWARD even though their saved
  // profile state has progressed past that step. We never let `activeStep`
  // exceed `onboardingStep` (you can't skip ahead), but you can revisit
  // earlier ones.
  const [activeStep, setActiveStep] = useState<StepNum>(() =>
    Math.min(onboardingStep, 4) as StepNum,
  );

  // Keep activeStep in sync when the derived step *advances* (e.g. after the
  // user completes a step and the profile fetch returns). Don't auto-rewind
  // when they go back manually.
  useEffect(() => {
    setActiveStep((prev) => {
      const max = Math.min(onboardingStep, 4) as StepNum;
      return max > prev ? max : prev;
    });
  }, [onboardingStep]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    if (onboardingStep === 5) navigate("/", { replace: true });
  }, [user, loading, onboardingStep, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Strict guard: do not render the onboarding UI if there's no user OR
  // onboarding is already complete. This is the same condition the parent
  // route guard checks, but keeping it here removes any chance of rendering
  // even one frame of the form during the post-login redirect.
  if (!user || onboardingStep === 5) return null;

  const handleBack = async () => {
    if (activeStep > 1) {
      setActiveStep((s) => (s - 1) as StepNum);
      return;
    }
    // Step 1 → there is no previous onboarding step. Bail out to /auth.
    // signOut() so we don't leave a half-set-up account in limbo: pressing
    // Back from step 1 is the user explicitly leaving signup.
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft transition-smooth hover:bg-secondary/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {activeStep === 1 ? "Back to sign in" : "Back"}
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Step {activeStep} of 4
          </span>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">QuickServe</h1>
          <p className="text-sm text-muted-foreground">Complete your profile to get started</p>
        </div>
        <Card className="p-6 shadow-card">
          <StepBar current={activeStep} />
          {activeStep === 1 && <Step1 onComplete={refreshProfile} />}
          {activeStep === 2 && <Step2 onComplete={refreshProfile} />}
          {activeStep === 3 && <Step3 onComplete={refreshProfile} />}
          {activeStep === 4 && <Step4 onComplete={refreshProfile} />}
        </Card>
      </div>
    </div>
  );
}
