import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Phone, ArrowRight, CheckCircle2, Sparkles, KeyRound, Lock } from "lucide-react";
import { useEffect } from "react";

type Step = "form" | "mobile-otp" | "aadhaar-otp" | "done";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">QuickServe</h1>
          <p className="text-sm text-muted-foreground">Trusted home services on demand</p>
        </div>

        <Card className="p-6 shadow-card">
          {/* Fixed-position toggle — no layout shift on tab switch */}
          <div className="grid grid-cols-2 rounded-xl bg-secondary p-1 mb-5">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-sm font-semibold transition-smooth ${
                  tab === t
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          <div>
            {tab === "signin" ? <SignInForm /> : <SignUpFlow onDone={() => setTab("signin")} />}
          </div>
        </Card>
      </div>
    </div>
  );
}

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
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Enter your registered email"); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (err) {
      setError(err.message.includes("not found") || err.message.includes("Signups")
        ? "No account found for this email. Please sign up first."
        : err.message);
      return;
    }
    setOtpSent(true);
    setInfo("OTP sent — check your email");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.replace(/\D/g, "").length < 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: "email",
    });
    setLoading(false);
    if (err) setError(err.message);
  };

  const switchMode = (m: "password" | "otp") => {
    setMode(m);
    setOtpSent(false);
    setOtp("");
  };

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
              <p className="mt-1 text-[11px] text-muted-foreground">
                We'll email a 6-digit code. Only registered accounts can sign in this way.
              </p>
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
                <p className="font-semibold text-foreground">Enter OTP</p>
                <p className="truncate text-xs text-muted-foreground">Sent to {email}</p>
              </div>
            </div>
            {info && <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success">{info}</p>}
            <div>
              <Label htmlFor="otp-code">6-digit code</Label>
              <Input id="otp-code" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => { setOtp(e.target.value); setError(""); }} placeholder="123456" />
            </div>
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying…" : "Verify & Sign In"}
            </Button>
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtp(""); setError(""); setInfo(""); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Use a different email
            </button>
          </form>
        )}
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
    </form>
  );
}

function ModePill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-smooth ${
        active
          ? "bg-primary/10 text-primary border border-primary/30"
          : "bg-secondary text-muted-foreground border border-transparent hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function SignUpFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("form");
  const [role, setRole] = useState<"customer" | "partner">("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [terms, setTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!terms) { setError("Please accept the Terms & Services"); return; }
    if (mobile.replace(/\D/g, "").length < 10) { setError("Enter a valid 10-digit mobile number"); return; }
    if (aadhaar.replace(/\D/g, "").length !== 12) { setError("Aadhaar must be 12 digits"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setStep("mobile-otp");
  };

  const verifyMobileOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp !== "123456") { setError("Invalid OTP. Demo code: 123456"); return; }
    setOtp("");
    setStep("aadhaar-otp");
  };

  const verifyAadhaarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp !== "654321") { setError("Invalid OTP. Demo code: 654321"); return; }
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
    });
    if (signUpError || !data.user) {
      setLoading(false);
      setError(signUpError?.message ?? "Signup failed");
      return;
    }

    const uid = data.user.id;
    const aadhaarLast4 = aadhaar.replace(/\D/g, "").slice(-4);
    const [{ error: pErr }, { error: rErr }] = await Promise.all([
      supabase.from("profiles").insert({
        id: uid,
        full_name: fullName,
        mobile,
        aadhaar_last4: aadhaarLast4,
        mobile_verified: true,
        aadhaar_verified: true,
        accepted_terms: true,
      }),
      supabase.from("user_roles").insert({ user_id: uid, role }),
    ]);
    setLoading(false);
    if (pErr || rErr) { setError(pErr?.message ?? rErr?.message ?? "Profile setup failed"); return; }
    setStep("done");
    setTimeout(onDone, 1200);
  };

  if (step === "mobile-otp" || step === "aadhaar-otp") {
    const isMobile = step === "mobile-otp";
    return (
      <form
        onSubmit={isMobile ? verifyMobileOtp : verifyAadhaarOtp}
        className="space-y-4 animate-fade-in-up"
      >
        <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            {isMobile ? <Phone className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div className="text-sm">
            <p className="font-semibold text-foreground">
              {isMobile ? "Verify Mobile" : "Verify Aadhaar"}
            </p>
            <p className="text-xs text-muted-foreground">
              Enter OTP sent to {isMobile ? mobile : `Aadhaar ••${aadhaar.slice(-4)}`}
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="otp">6-digit OTP</Label>
          <Input id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => { setOtp(e.target.value); setError(""); }} placeholder={isMobile ? "123456" : "654321"} />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Demo OTP: <span className="font-mono font-bold">{isMobile ? "123456" : "654321"}</span>
          </p>
        </div>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Verify & Continue"}
        </Button>
      </form>
    );
  }

  if (step === "done") {
    return (
      <div className="text-center py-8 animate-scale-in">
        <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
        <p className="font-bold">All set!</p>
        <p className="text-xs text-muted-foreground">Please sign in to continue.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onFormSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["customer", "partner"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
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
        <Label htmlFor="su-mob">Mobile (10 digits)</Label>
        <Input id="su-mob" inputMode="tel" required value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" />
      </div>
      <div>
        <Label htmlFor="su-aadhaar">Aadhaar (12 digits)</Label>
        <Input id="su-aadhaar" inputMode="numeric" maxLength={12} required value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} placeholder="XXXX XXXX XXXX" />
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <Checkbox checked={terms} onCheckedChange={(v) => { setTerms(!!v); setError(""); }} className="mt-0.5" />
        <span>
          I agree to QuickServe's <span className="text-primary font-semibold">Terms & Services</span> and consent to mobile + Aadhaar verification.
        </span>
      </label>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <Button type="submit" className="w-full">
        Continue <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </form>
  );
}
