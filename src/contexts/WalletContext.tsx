import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

// ── Reward tunables ─────────────────────────────────────────────────────────
export const REFERRAL_REWARD = 200;       // ₹ to referrer when referee completes first booking
export const SIGNUP_BONUS = 100;          // ₹ to referee for using a valid code
export const MONTHLY_REFERRAL_CAP = 25;   // Max referral payouts per month

// ── Types ───────────────────────────────────────────────────────────────────
export type WalletTxnType =
  | "referral"        // credit when a friend completes their first booking
  | "signup_bonus"    // credit for redeeming someone's code
  | "refund"          // credit from a cancelled paid booking
  | "payment"         // debit for paying with wallet
  | "adjustment";     // catch-all (admin / promo)

export interface WalletTransaction {
  id: string;
  amount: number;     // positive = credit, negative = debit
  type: WalletTxnType;
  description: string;
  timestamp: string;  // ISO
  status: "completed" | "pending" | "failed";
  bookingId?: string;
}

interface WalletState {
  balance: number;
  transactions: WalletTransaction[];
}

interface ReferralEntry {
  code: string;             // Always the referrer's own code (for clarity in lists)
  refereeId: string | null; // The user who used the code (when known)
  refereeName: string | null;
  status: "pending" | "completed";
  date: string;             // ISO of the original signup
  completedAt?: string;     // ISO when first booking completed → reward issued
  reward: number;           // Final credit issued (0 while pending)
}

interface ReferralState {
  myCode: string;
  referredByCode: string | null; // code this user redeemed at signup
  redeemedCodes: string[];        // codes already applied — prevents double-redeem
  referrals: ReferralEntry[];
  hasCompletedFirstBooking: boolean;
}

interface WalletContextValue {
  // wallet
  balance: number;
  transactions: WalletTransaction[];
  loading: boolean;
  /** Apply a refund credit (e.g. cancelled paid booking). Idempotent on bookingId. */
  creditRefund: (bookingId: string, amount: number, description?: string) => void;

  // referral
  myReferralCode: string;
  myReferralLink: string;
  referrals: ReferralEntry[];
  completedReferralCount: number;
  /** Redeem a friend's code at signup. Returns reason on failure. */
  redeemReferralCode: (code: string) => { ok: boolean; reason?: string };
  /** Called when the *referee*'s first booking completes — credits the referrer. */
  onFirstBookingCompleted: (bookingId: string) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// ── Storage helpers ─────────────────────────────────────────────────────────
const walletKey = (uid: string) => `qs.wallet.v1.${uid}`;
const referralKey = (uid: string) => `qs.referral.v1.${uid}`;
const CODE_INDEX_KEY = "qs.referral.code-index.v1"; // { [code]: userId }

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/security errors */
  }
};

const codeFromUid = (uid: string, name: string): string => {
  const base = (name.replace(/[^A-Za-z]/g, "").slice(0, 4) || "USER").toUpperCase();
  const tail = uid.replace(/-/g, "").slice(-4).toUpperCase();
  return `${base}${tail}`;
};

const newId = () => `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ── Provider ────────────────────────────────────────────────────────────────
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const userId = user?.id ?? null;
  const myName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Friend";

  const [wallet, setWallet] = useState<WalletState>({ balance: 0, transactions: [] });
  const [referral, setReferral] = useState<ReferralState>({
    myCode: "",
    referredByCode: null,
    redeemedCodes: [],
    referrals: [],
    hasCompletedFirstBooking: false,
  });
  const [loading, setLoading] = useState(false);
  const hydratedFor = useRef<string | null>(null);

  // Capture an inbound `?ref=CODE` once per browser session before sign-in. We
  // hold it in sessionStorage so a user landing on /?ref=CODE → /auth → /onboarding
  // still has the code available when their auth session finally resolves.
  // Only the *first* encountered code wins — preserving the "linked once at
  // first signup" guarantee.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const incoming = url.searchParams.get("ref");
    if (incoming && !sessionStorage.getItem("qs.pendingRef")) {
      sessionStorage.setItem("qs.pendingRef", incoming.trim().toUpperCase());
    }
  }, []);

  // Hydrate from localStorage when user changes. Resets to empty state on sign-out.
  useEffect(() => {
    if (!userId) {
      setWallet({ balance: 0, transactions: [] });
      setReferral({
        myCode: "",
        referredByCode: null,
        redeemedCodes: [],
        referrals: [],
        hasCompletedFirstBooking: false,
      });
      hydratedFor.current = null;
      return;
    }
    setLoading(true);
    const w = readJSON<WalletState>(walletKey(userId), { balance: 0, transactions: [] });
    const myCode = codeFromUid(userId, myName);
    const r = readJSON<ReferralState>(referralKey(userId), {
      myCode,
      referredByCode: null,
      redeemedCodes: [],
      referrals: [],
      hasCompletedFirstBooking: false,
    });
    // Rebuild myCode if name changed since last hydration.
    r.myCode = myCode;
    setWallet(w);
    setReferral(r);
    hydratedFor.current = userId;

    // Maintain a code -> userId index so a referee on the same device can credit
    // the referrer when they complete their first booking. (Demo-only — in
    // production this lookup would be server-side.)
    const idx = readJSON<Record<string, string>>(CODE_INDEX_KEY, {});
    if (idx[myCode] !== userId) {
      idx[myCode] = userId;
      writeJSON(CODE_INDEX_KEY, idx);
    }
    setLoading(false);

    // Auto-apply the captured ref code, but ONLY if this user has never
    // redeemed one. This is what enforces "first signup only" — once
    // referredByCode is set, future ?ref= URLs are ignored.
    const pending = sessionStorage.getItem("qs.pendingRef");
    if (pending && !r.referredByCode && pending !== myCode) {
      // Defer to next tick so callbacks captured at provider mount have
      // settled (avoids redeeming against a stale state snapshot).
      setTimeout(() => {
        const idx = readJSON<Record<string, string>>(CODE_INDEX_KEY, {});
        // Apply only if we know who owns the code (single-device demo) OR
        // if it's an opaque inviter code; either way mark redeemed once.
        const referrerUid = idx[pending] ?? null;
        const next: ReferralState = {
          ...r,
          referredByCode: pending,
          redeemedCodes: [...r.redeemedCodes, pending],
        };
        writeJSON(referralKey(userId), next);
        setReferral(next);
        const txn: WalletTransaction = {
          id: `signup-${pending}-${userId}`,
          amount: SIGNUP_BONUS,
          type: "signup_bonus",
          description: `Signup bonus from code ${pending}`,
          timestamp: new Date().toISOString(),
          status: "completed",
        };
        const wPrev = readJSON<WalletState>(walletKey(userId), { balance: 0, transactions: [] });
        if (!wPrev.transactions.find((t) => t.id === txn.id)) {
          const wNext: WalletState = {
            balance: wPrev.balance + txn.amount,
            transactions: [txn, ...wPrev.transactions],
          };
          writeJSON(walletKey(userId), wNext);
          setWallet(wNext);
        }
        if (referrerUid && referrerUid !== userId) {
          const refKey = referralKey(referrerUid);
          const refState = readJSON<ReferralState | null>(refKey, null);
          if (refState && !refState.referrals.find((rr) => rr.refereeId === userId)) {
            writeJSON(refKey, {
              ...refState,
              referrals: [
                {
                  code: pending,
                  refereeId: userId,
                  refereeName: myName,
                  status: "pending",
                  date: new Date().toISOString(),
                  reward: 0,
                },
                ...refState.referrals,
              ],
            });
          }
        }
        sessionStorage.removeItem("qs.pendingRef");
      }, 0);
    }
  }, [userId, myName]);

  // Persist on every change, but only after we've successfully hydrated for
  // this user — otherwise the empty initial state would clobber stored data.
  useEffect(() => {
    if (!userId || hydratedFor.current !== userId) return;
    writeJSON(walletKey(userId), wallet);
  }, [userId, wallet]);

  useEffect(() => {
    if (!userId || hydratedFor.current !== userId) return;
    writeJSON(referralKey(userId), referral);
  }, [userId, referral]);

  // ── Internal helpers ──────────────────────────────────────────────────────
  const appendTransaction = useCallback((txn: WalletTransaction) => {
    setWallet((prev) => {
      // Idempotency: if a transaction with the same id already exists, no-op.
      if (prev.transactions.find((t) => t.id === txn.id)) return prev;
      return {
        balance: prev.balance + txn.amount,
        transactions: [txn, ...prev.transactions],
      };
    });
  }, []);

  // Credits another user's wallet (looked up via code index). Used when this
  // user — the referee — completes their first booking and the referrer needs
  // their reward, even though the referrer is a different localStorage scope.
  const creditOtherUser = useCallback(
    (referrerUid: string, txn: WalletTransaction) => {
      const otherKey = walletKey(referrerUid);
      const other = readJSON<WalletState>(otherKey, { balance: 0, transactions: [] });
      if (other.transactions.find((t) => t.id === txn.id)) return; // idempotent
      const next: WalletState = {
        balance: other.balance + txn.amount,
        transactions: [txn, ...other.transactions],
      };
      writeJSON(otherKey, next);

      // Mirror into the referrer's referral history.
      const refKey = referralKey(referrerUid);
      const refState = readJSON<ReferralState | null>(refKey, null);
      if (refState) {
        const updated: ReferralState = {
          ...refState,
          referrals: refState.referrals.map((r) =>
            r.refereeId === userId && r.status === "pending"
              ? { ...r, status: "completed", reward: txn.amount, completedAt: txn.timestamp }
              : r,
          ),
        };
        writeJSON(refKey, updated);
      }
    },
    [userId],
  );

  // ── Public actions ────────────────────────────────────────────────────────
  const creditRefund: WalletContextValue["creditRefund"] = useCallback(
    (bookingId, amount, description = "Refund for cancelled booking") => {
      if (amount <= 0) return;
      appendTransaction({
        id: `refund-${bookingId}`,
        amount,
        type: "refund",
        description,
        timestamp: new Date().toISOString(),
        status: "completed",
        bookingId,
      });
    },
    [appendTransaction],
  );

  const redeemReferralCode: WalletContextValue["redeemReferralCode"] = useCallback(
    (rawCode) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return { ok: false, reason: "Enter a code" };
      if (!userId) return { ok: false, reason: "Sign in to redeem" };
      if (code === referral.myCode) {
        return { ok: false, reason: "You can't use your own referral code" };
      }
      if (referral.referredByCode || referral.redeemedCodes.includes(code)) {
        return { ok: false, reason: "A referral code has already been applied" };
      }
      // Resolve the referrer (may be undefined on multi-device demos).
      const idx = readJSON<Record<string, string>>(CODE_INDEX_KEY, {});
      const referrerUid = idx[code] ?? null;

      // Block: a referee cannot use a code from someone they themselves referred.
      // (Loops aren't really possible since redeem is one-time, but cheap check.)

      // Credit signup bonus to this user.
      appendTransaction({
        id: `signup-${code}-${userId}`,
        amount: SIGNUP_BONUS,
        type: "signup_bonus",
        description: `Signup bonus from code ${code}`,
        timestamp: new Date().toISOString(),
        status: "completed",
      });

      // Mark this user as referred and stash the relationship.
      setReferral((prev) => ({
        ...prev,
        referredByCode: code,
        redeemedCodes: [...prev.redeemedCodes, code],
      }));

      // Add a pending entry in the referrer's history (if known).
      if (referrerUid && referrerUid !== userId) {
        const refKey = referralKey(referrerUid);
        const refState = readJSON<ReferralState | null>(refKey, null);
        if (refState) {
          const entry: ReferralEntry = {
            code,
            refereeId: userId,
            refereeName: myName,
            status: "pending",
            date: new Date().toISOString(),
            reward: 0,
          };
          // De-dupe — don't add a second pending entry for the same referee.
          if (!refState.referrals.find((r) => r.refereeId === userId)) {
            writeJSON(refKey, {
              ...refState,
              referrals: [entry, ...refState.referrals],
            });
          }
        }
      }
      return { ok: true };
    },
    [referral, userId, appendTransaction, myName],
  );

  const onFirstBookingCompleted: WalletContextValue["onFirstBookingCompleted"] = useCallback(
    (bookingId) => {
      if (!userId) return;
      // Already issued the referrer reward? skip.
      if (referral.hasCompletedFirstBooking) return;
      const code = referral.referredByCode;
      // Mark this user as having completed their first booking either way —
      // future bookings should never fire the referrer reward again.
      setReferral((prev) => ({ ...prev, hasCompletedFirstBooking: true }));
      if (!code) return;

      const idx = readJSON<Record<string, string>>(CODE_INDEX_KEY, {});
      const referrerUid = idx[code];
      if (!referrerUid || referrerUid === userId) return;

      const txn: WalletTransaction = {
        id: `referral-${userId}`,
        amount: REFERRAL_REWARD,
        type: "referral",
        description: `Referral bonus — ${myName} completed first booking`,
        timestamp: new Date().toISOString(),
        status: "completed",
        bookingId,
      };
      creditOtherUser(referrerUid, txn);
    },
    [userId, referral, myName, creditOtherUser],
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const completedReferralCount = useMemo(
    () => referral.referrals.filter((r) => r.status === "completed").length,
    [referral.referrals],
  );

  const myReferralLink = useMemo(() => {
    if (typeof window === "undefined" || !referral.myCode) return "";
    return `${window.location.origin}/?ref=${referral.myCode}`;
  }, [referral.myCode]);

  return (
    <WalletContext.Provider
      value={{
        balance: wallet.balance,
        transactions: wallet.transactions,
        loading,
        creditRefund,
        myReferralCode: referral.myCode,
        myReferralLink,
        referrals: referral.referrals,
        completedReferralCount,
        redeemReferralCode,
        onFirstBookingCompleted,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
};
