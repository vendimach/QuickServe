import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Gift, Copy, Share2, Check, Users, Wallet, Sparkles, Ticket, ChevronDown, HelpCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";

const REWARD_PER_REFERRAL = 200; // ₹ credited when a friend completes their first booking
const SIGNUP_BONUS = 100; // ₹ for the friend

interface ReferralRecord {
  code: string;
  name: string;
  status: "joined" | "completed";
  date: string;
  reward: number;
}

interface ReferralState {
  credits: number;
  redeemed: string[]; // codes already applied to this account
  referrals: ReferralRecord[];
}

const STORAGE_KEY = "qs.referral.v1";

const loadState = (): ReferralState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ReferralState;
  } catch {
    /* ignore */
  }
  // Seed with a couple of demo referrals so the screen feels alive
  return {
    credits: 200,
    redeemed: [],
    referrals: [
      { code: "SEED1", name: "Priya S.", status: "completed", date: new Date(Date.now() - 86400000 * 3).toISOString(), reward: REWARD_PER_REFERRAL },
      { code: "SEED2", name: "Arjun M.", status: "joined", date: new Date(Date.now() - 86400000).toISOString(), reward: 0 },
    ],
  };
};

const saveState = (s: ReferralState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
};

const codeFromUser = (uid: string | undefined, name: string) => {
  const base = (name.replace(/[^A-Za-z]/g, "").slice(0, 4) || "USER").toUpperCase();
  const tail = (uid ?? "anon").replace(/-/g, "").slice(-4).toUpperCase();
  return `${base}${tail}`;
};

export const ReferEarn = () => {
  const { navigate } = useApp();
  const { user, profile } = useAuth();
  const { push } = useNotifications();

  const myCode = useMemo(
    () => codeFromUser(user?.id, profile?.full_name ?? "Friend"),
    [user?.id, profile?.full_name],
  );

  const [state, setState] = useState<ReferralState>(() => loadState());
  const [copied, setCopied] = useState(false);
  const [redeemInput, setRedeemInput] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const completedCount = state.referrals.filter((r) => r.status === "completed").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      push({ kind: "success", title: "Code copied", body: `${myCode} is on your clipboard` });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      push({ kind: "warning", title: "Copy failed", body: "Long-press to copy manually" });
    }
  };

  const handleShare = async () => {
    const message = `Try QuickServe for trusted home services! Use my code ${myCode} to get ₹${SIGNUP_BONUS} off your first booking.`;
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: "Join me on QuickServe",
          text: message,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(message);
    push({ kind: "info", title: "Invite copied", body: "Paste it in any chat to share" });
  };

  const handleRedeem = () => {
    const code = redeemInput.trim().toUpperCase();
    if (!code) return;
    if (code === myCode) {
      push({ kind: "warning", title: "Can't use your own code", body: "Share it with a friend instead" });
      return;
    }
    if (state.redeemed.includes(code)) {
      push({ kind: "warning", title: "Already redeemed", body: "This code is already on your account" });
      return;
    }
    setState((s) => ({
      ...s,
      credits: s.credits + SIGNUP_BONUS,
      redeemed: [...s.redeemed, code],
    }));
    push({
      kind: "success",
      title: "₹100 added!",
      body: `Code ${code} unlocked your signup bonus`,
    });
    setRedeemInput("");
  };

  const simulateInvite = () => {
    // Demo helper: simulates a friend completing their first booking
    const sampleNames = ["Rohit K.", "Aisha P.", "Vikram T.", "Neha R.", "Karan D."];
    const name = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    setState((s) => ({
      ...s,
      credits: s.credits + REWARD_PER_REFERRAL,
      referrals: [
        {
          code: myCode,
          name,
          status: "completed",
          date: new Date().toISOString(),
          reward: REWARD_PER_REFERRAL,
        },
        ...s.referrals,
      ],
    }));
    push({
      kind: "success",
      title: `+₹${REWARD_PER_REFERRAL} earned!`,
      body: `${name} completed their first booking`,
    });
  };

  return (
    <div className="-mt-5 space-y-4 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "profile" })}
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
            Give ₹{SIGNUP_BONUS}, get ₹{REWARD_PER_REFERRAL}
          </h2>
          <p className="mt-1 text-sm text-primary-foreground/85">
            Friends save ₹{SIGNUP_BONUS} on their first booking. You earn ₹{REWARD_PER_REFERRAL} when they complete it.
          </p>
        </div>
      </div>

      {/* Code card */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your referral code</p>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3">
          <span className="font-mono text-lg font-extrabold tracking-[0.25em] text-primary">{myCode}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-soft transition-smooth hover:opacity-90"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button
          onClick={handleShare}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background shadow-soft transition-smooth hover:opacity-90"
        >
          <Share2 className="h-4 w-4" /> Share invite
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
            <Wallet className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Wallet credits</p>
          <p className="text-xl font-extrabold text-foreground">₹{state.credits.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Friends joined</p>
          <p className="text-xl font-extrabold text-foreground">
            {state.referrals.length}
            <span className="ml-1 text-xs font-semibold text-muted-foreground">
              ({completedCount} completed)
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
            onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
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
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How it works</p>
        <ol className="mt-3 space-y-3">
          {[
            { t: "Share your code", d: "Send your code to friends and family." },
            { t: "They sign up & book", d: `Friend gets ₹${SIGNUP_BONUS} off their first service.` },
            { t: "You earn credits", d: `₹${REWARD_PER_REFERRAL} added to your wallet on completion.` },
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
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Your referrals
          </p>
          <button
            onClick={simulateInvite}
            className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
          >
            + Simulate
          </button>
        </div>
        {state.referrals.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center text-xs text-muted-foreground shadow-soft">
            <Gift className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            No referrals yet — share your code to get started.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
            {state.referrals.map((r, i) => (
              <div
                key={`${r.name}-${i}`}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i !== state.referrals.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
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
        Credits never expire. Max ₹{REWARD_PER_REFERRAL * 25} per month. T&C apply.
      </p>

      <ReferralFAQ />
    </div>
  );
};

const faqItems: { q: string; a: string }[] = [
  {
    q: "When do I receive my ₹200 reward?",
    a: "Your reward is credited within 24 hours of your friend completing their first booking and a successful payment.",
  },
  {
    q: "How do I use my wallet credits?",
    a: "Wallet credits auto-apply at checkout. You can use up to ₹200 per booking. They never expire.",
  },
  {
    q: "Is there a limit on referrals?",
    a: `Yes — you can earn up to ₹${REWARD_PER_REFERRAL * 25} per month. There is no lifetime cap on the number of friends you invite.`,
  },
  {
    q: "What if my friend cancels their booking?",
    a: "If the booking is cancelled or refunded, your reward will be reversed automatically.",
  },
  {
    q: "Can I refer existing QuickServe users?",
    a: "No, the offer is valid only for friends who are completely new to QuickServe and have never booked before.",
  },
  {
    q: "Where can I see my referral status?",
    a: "Scroll up to the 'Your referrals' section — every friend's join and completion status is tracked there.",
  },
];

const ReferralFAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="rounded-2xl bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-foreground">Refer & Earn FAQ</p>
      </div>
      <div className="mt-3 divide-y divide-border">
        {faqItems.map((item, i) => {
          const isOpen = open === i;
          return (
            <button
              key={item.q}
              onClick={() => setOpen(isOpen ? null : i)}
              className="block w-full py-3 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{item.q}</p>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
              {isOpen && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{item.a}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
};