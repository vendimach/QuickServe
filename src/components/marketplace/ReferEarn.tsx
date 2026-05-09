import { useState } from "react";
import {
  ArrowLeft,
  Gift,
  Copy,
  Share2,
  Check,
  Users,
  Wallet,
  Sparkles,
  Ticket,
  Link2,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  REFERRAL_REWARD,
  SIGNUP_BONUS,
  MONTHLY_REFERRAL_CAP,
  useWallet,
} from "@/contexts/WalletContext";

export const ReferEarn = () => {
  const { navigate, goBack } = useApp();
  const { push } = useNotifications();
  const {
    myReferralCode,
    myReferralLink,
    referrals,
    completedReferralCount,
    balance,
    redeemReferralCode,
  } = useWallet();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const copy = async (value: string, setFlag: (v: boolean) => void, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFlag(true);
      push({ kind: "success", title: `${label} copied`, body: value });
      setTimeout(() => setFlag(false), 1800);
    } catch {
      push({ kind: "warning", title: "Copy failed", body: "Long-press to copy manually" });
    }
  };

  const handleShare = async () => {
    const message = `Try QuickServe for trusted home services! Use my code ${myReferralCode} to get ₹${SIGNUP_BONUS} off your first booking. ${myReferralLink}`;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "Join me on QuickServe", text: message });
        return;
      } catch {
        // user cancelled
      }
    }
    await navigator.clipboard.writeText(message);
    push({ kind: "info", title: "Invite copied", body: "Paste it in any chat to share" });
  };

  const handleRedeem = () => {
    setRedeemError(null);
    const result = redeemReferralCode(redeemInput);
    if (!result.ok) {
      setRedeemError(result.reason ?? "Couldn't redeem this code");
      return;
    }
    push({
      kind: "success",
      title: `₹${SIGNUP_BONUS} added to wallet`,
      body: `Code ${redeemInput.trim().toUpperCase()} unlocked your signup bonus`,
    });
    setRedeemInput("");
  };

  return (
    <div className="space-y-4 px-5 pb-6">
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground shadow-card">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-4 h-28 w-28 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Refer & Earn
          </div>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight">
            Give ₹{SIGNUP_BONUS}, get ₹{REFERRAL_REWARD}
          </h2>
          <p className="mt-1 text-sm text-primary-foreground/85">
            Friends save ₹{SIGNUP_BONUS} on their first booking. You earn ₹{REFERRAL_REWARD} when they complete it.
          </p>
        </div>
      </div>

      {/* Code card */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your referral code</p>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3">
          <span className="font-mono text-lg font-extrabold tracking-[0.25em] text-primary">
            {myReferralCode || "—"}
          </span>
          <button
            onClick={() => copy(myReferralCode, setCopiedCode, "Code")}
            disabled={!myReferralCode}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-soft transition-smooth hover:opacity-90 disabled:opacity-40"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedCode ? "Copied" : "Copy"}
          </button>
        </div>

        {myReferralLink && (
          <button
            onClick={() => copy(myReferralLink, setCopiedLink, "Link")}
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2.5 text-left transition-smooth hover:bg-muted"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate text-xs text-foreground">{myReferralLink}</span>
            </div>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary">
              {copiedLink ? "Copied" : "Copy link"}
            </span>
          </button>
        )}

        <button
          onClick={handleShare}
          disabled={!myReferralCode}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background shadow-soft transition-smooth hover:opacity-90 disabled:opacity-40"
        >
          <Share2 className="h-4 w-4" /> Share invite
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate({ name: "wallet" })}
          className="rounded-2xl bg-card p-4 text-left shadow-soft transition-smooth hover:bg-secondary/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
            <Wallet className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Wallet balance</p>
          <p className="text-xl font-extrabold text-foreground">₹{balance.toLocaleString("en-IN")}</p>
        </button>
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Friends joined</p>
          <p className="text-xl font-extrabold text-foreground">
            {referrals.length}
            <span className="ml-1 text-xs font-semibold text-muted-foreground">
              ({completedReferralCount} completed)
            </span>
          </p>
        </div>
      </div>

      {/* Redeem */}
      <div className="rounded-2xl bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-accent" />
          <p className="text-sm font-bold text-foreground">Have a referral code?</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter a friend's code to claim your ₹{SIGNUP_BONUS} signup bonus.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={redeemInput}
            onChange={(e) => {
              setRedeemInput(e.target.value.toUpperCase());
              if (redeemError) setRedeemError(null);
            }}
            placeholder="ENTER CODE"
            maxLength={12}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm tracking-widest text-foreground outline-none transition-smooth focus:border-primary"
          />
          <button
            onClick={handleRedeem}
            disabled={!redeemInput.trim()}
            className="rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-soft transition-smooth hover:opacity-90 disabled:opacity-40"
          >
            Redeem
          </button>
        </div>
        {redeemError && (
          <p className="mt-2 text-xs font-medium text-destructive">{redeemError}</p>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How it works</p>
        <ol className="mt-3 space-y-3">
          {[
            { t: "Share your code", d: "Send your code or link to friends and family." },
            { t: "They sign up & book", d: `Friend gets ₹${SIGNUP_BONUS} off their first service.` },
            { t: "You earn credits", d: `₹${REFERRAL_REWARD} added to your wallet on completion.` },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.t}</p>
                <p className="text-xs text-muted-foreground">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Referral history */}
      <div>
        <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Your referrals
        </p>
        {referrals.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center text-xs text-muted-foreground shadow-soft">
            <Gift className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            No referrals yet — share your code to get started.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
            {referrals.map((r, i) => (
              <div
                key={`${r.refereeId ?? r.code}-${i}`}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i !== referrals.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {(r.refereeName ?? "??").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {r.refereeName ?? "Friend"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.date).toLocaleDateString("en", { dateStyle: "medium" })}
                  </p>
                </div>
                {r.status === "completed" ? (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                    +₹{r.reward}
                  </span>
                ) : (
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="px-2 text-center text-[10px] text-muted-foreground">
        Credits never expire. Max {MONTHLY_REFERRAL_CAP} referral payouts per month. T&C apply.
      </p>
    </div>
  );
};
