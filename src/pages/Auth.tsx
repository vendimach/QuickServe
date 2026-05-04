import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Sparkles, KeyRound, Lock, Loader2 } from "lucide-react";

// ─── Google SVG icon ──────────────────────────────────────────────────────────
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth`,
      queryParams: { prompt: "select_account" },
    },
  });
}

function Divider() {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] text-muted-foreground font-medium">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => { setBusy(true); signInWithGoogle(); }}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-border bg-card py-2.5 text-sm font-semibold text-foreground transition-smooth hover:bg-secondary disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
      Continue with Google
    </button>
  );
}

function ModePill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-smooth ${
        active ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-transparent hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}

// ─── Main Auth page ───────────────────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate();
  const { user, role, loading, refreshProfile } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (!loading && user && role) navigate("/", { replace: true });
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Logged in but no role = Google user who hasn't picked a role yet
  if (user && !role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow mb-3">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">QuickServe</h1>
            <p className="text-sm text-muted-foreground">One last step — tell us about yourself</p>
          </div>
          <Card className="p-6 shadow-card">
            <GoogleProfileCompletion
              user={user}
              onDone={async () => { await refreshProfile(); navigate("/", { replace: true }); }}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">QuickServe</h1>
          <p className="text-sm text-muted-foreground">Trusted home services on demand</p>
        </div>
        <Card className="p-6 shadow-card">
          <div className="grid grid-cols-2 rounded-xl bg-secondary p-1 mb-5">
            {(["signin", "signup"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-sm font-semibold transition-smooth ${
                  tab === t ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          {tab === "signin" ? <SignInForm /> : <SignUpFlow onDone={() => setTab("signin")} />}
        </Card>
      </div>
    </div>
  );
}

// ─── Sign-in ──────────────────────────────────────────────────────────────────
function SignInForm() {
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!email) { setError("Enter your registered email"); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setLoading(false);
    if (err) {
      setError(err.message.includes("not found") || err.message.includes("Signups")
        ? "No account found for this email. Please sign up first." : err.message);
      return;
    }
    setOtpSent(true); setInfo("OTP sent — check your email");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (otp.replace(/\D/g, "").length < 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: "email" });
    setLoading(false);
    if (err) setError(err.message);
  };

  const switchMode = (m: "password" | "otp") => { setMode(m); setOtpSent(false); setOtp(""); setError(""); setInfo(""); };

  if (mode === "otp") {
    return (
      <div className="space-y-3 animate-fade-in-up">
        <div className="grid grid-cols-2 gap-2">
          <ModePill active={false} onClick={() => switchMode("password")} icon={<Lock className="h-3.5 w-3.5" />} label="Password" />
          <ModePill active={true} onClick={() => switchMode("otp")} icon={<KeyRound className="h-3.5 w-3.5" />} label="OTP" />
        </div>
        {!otpSent ? (
          <form onSubmit={sendOtp} className="space-y-3">
            <div>
              <Label htmlFor="otp-email">Registered email</Label>
              <Input id="otp-email" type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />
            </div>
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send OTP"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="text-sm min-w-0">
                <p className="font-semibold">Enter OTP</p>
                <p className="truncate text-xs text-muted-foreground">Sent to {email}</p>
              </div>
            </div>
            {info && <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success">{info}</p>}
            <div>
              <Label htmlFor="otp-code">6-digit code</Label>
              <Input id="otp-code" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => { setOtp(e.target.value); setError(""); }} placeholder="123456" />
            </div>
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verifying…" : "Verify & Sign In"}</Button>
            <button type="button" onClick={() => { setOtpSent(false); setOtp(""); setError(""); setInfo(""); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
              Use a different email
            </button>
          </form>
        )}
        <Divider />
        <GoogleButton />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <ModePill active={true} onClick={() => switchMode("password")} icon={<Lock className="h-3.5 w-3.5" />} label="Password" />
        <ModePill active={false} onClick={() => switchMode("otp")} icon={<KeyRound className="h-3.5 w-3.5" />} label="OTP" />
      </div>
      <div>
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />
      </div>
      <div>
        <Label htmlFor="si-pwd">Password</Label>
        <Input id="si-pwd" type="password" required value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign In"} <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
      <Divider />
      <GoogleButton />
    </form>
  );
}

// ─── Sign-up (email) ──────────────────────────────────────────────────────────
function SignUpFlow({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(false);
  const [role, setRole] = useState<"customer" | "partner">("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!terms) { setError("Please accept the Terms & Services"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: fullName } },
    });
    if (signUpError || !data.user) {
      setLoading(false); setError(signUpError?.message ?? "Signup failed"); return;
    }
    const uid = data.user.id;
    const [{ error: pErr }, { error: rErr }] = await Promise.all([
      supabase.from("profiles").upsert({
        id: uid, full_name: fullName, mobile: mobile || null,
        mobile_verified: false, aadhaar_verified: false, accepted_terms: true,
      }),
      supabase.from("user_roles").upsert({ user_id: uid, role }),
    ]);
    setLoading(false);
    if (pErr || rErr) { setError(pErr?.message ?? rErr?.message ?? "Profile setup failed"); return; }
    setDone(true);
    setTimeout(onDone, 1500);
  };

  if (done) {
    return (
      <div className="text-center py-8 animate-fade-in-up">
        <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
        <p className="font-bold">Account created!</p>
        <p className="text-xs text-muted-foreground">Please sign in to continue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(["customer", "partner"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={`rounded-xl border-2 py-2 text-sm font-semibold capitalize transition-smooth ${
                role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div>
          <Label htmlFor="su-name">Full Name</Label>
          <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="su-email">Email</Label>
          <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="su-pwd">Password</Label>
          <Input id="su-pwd" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="su-mob">Mobile <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="su-mob" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" />
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox checked={terms} onCheckedChange={(v) => { setTerms(!!v); setError(""); }} className="mt-0.5" />
          <span>I agree to QuickServe's <span className="text-primary font-semibold">Terms & Services</span></span>
        </label>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create Account"} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </form>
      <Divider />
      <GoogleButton />
    </div>
  );
}

// ─── Google profile completion (role + name only, no OTPs) ───────────────────
function GoogleProfileCompletion({ user, onDone }: { user: User; onDone: () => void }) {
  const [role, setRole] = useState<"customer" | "partner">("customer");
  const [fullName, setFullName] = useState(
    (user.user_metadata?.full_name as string | undefined) ?? "",
  );
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!fullName.trim()) { setError("Enter your full name"); return; }
    setLoading(true);
    const [{ error: pErr }, { error: rErr }] = await Promise.all([
      supabase.from("profiles").upsert({
        id: user.id, full_name: fullName, mobile: mobile || null,
        mobile_verified: false, aadhaar_verified: false, accepted_terms: true,
      }),
      supabase.from("user_roles").upsert({ user_id: user.id, role }),
    ]);
    setLoading(false);
    if (pErr || rErr) { setError(pErr?.message ?? rErr?.message ?? "Setup failed"); return; }
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3 animate-fade-in-up">
      <div className="grid grid-cols-2 gap-2">
        {(["customer", "partner"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)}
            className={`rounded-xl border-2 py-2 text-sm font-semibold capitalize transition-smooth ${
              role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="gc-name">Full Name</Label>
        <Input id="gc-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="gc-mob">Mobile <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="gc-mob" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" />
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</> : <>Get Started <ArrowRight className="h-4 w-4 ml-1" /></>}
      </Button>
    </form>
  );
}
