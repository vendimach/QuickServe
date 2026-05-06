import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/types";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

// All fields are optional/nullable so `select("*")` from a DB that's missing
// a recently-added column doesn't blow up TypeScript. deriveStep + the rest
// of the app coerces undefined → falsy, which is the correct interpretation.
interface ProfileRow {
  full_name?: string | null;
  mobile?: string | null;
  aadhaar_last4?: string | null;
  mobile_verified?: boolean | null;
  aadhaar_verified?: boolean | null;
  onboarding_completed?: boolean | null;
  home_lat?: number | null;
  home_lng?: number | null;
  avatar_url?: string | null;
  bio?: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  role: Role | null;
  loading: boolean;
  onboardingStep: OnboardingStep;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function deriveStep(profile: ProfileRow | null, role: Role | null): OnboardingStep {
  // Without a profile we genuinely don't know — start at step 1.
  if (!profile) return 1;
  // Trust completed flag OR a fully-verified profile. The flag can fall out
  // of sync if the user re-entered Step 1 (whose upsert clobbers booleans),
  // so we treat "all gates passed" as functionally complete to keep
  // already-onboarded accounts out of the onboarding flow.
  const fullyVerified =
    !!profile.full_name &&
    !!profile.mobile &&
    profile.mobile_verified &&
    !!profile.aadhaar_last4 &&
    profile.aadhaar_verified;
  if (profile.onboarding_completed || fullyVerified) return 5;
  // Role only matters for genuinely-new users. For everyone else we already
  // returned step 5 above. Missing role here means the user truly hasn't
  // started onboarding.
  if (!role) return 1;
  if (!profile.full_name || !profile.mobile) return 1;
  if (!profile.mobile_verified) return 2;
  if (!profile.aadhaar_last4) return 3;
  if (!profile.aadhaar_verified) return 4;
  return 5;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    console.log("[auth] loadProfile start", { uid });
    // SELECT * — depending on a hand-written column list breaks the moment
    // the deployed DB is missing a column the auto-generated types claim
    // exists (this happened with `bio`: in types.ts but never migrated).
    // A failed select silently nulls the profile and reroutes onboarded
    // users into onboarding. Use * so we tolerate any subset of columns.
    const [profileRes, rolesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle(),
      // Fetch *all* role rows: a user can legitimately have both a customer
      // and a partner row (UNIQUE on user_id,role allows it). `maybeSingle()`
      // would return null in that case and silently demote the user to
      // "no role", which then routes them through onboarding on every login.
      supabase
        .from("user_roles")
        .select("role, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
    ]);
    if (profileRes.error) console.warn("[auth] profile fetch error", profileRes.error);
    if (rolesRes.error) console.warn("[auth] roles fetch error", rolesRes.error);

    // Cast to our local row shape. Missing columns surface as undefined,
    // which downstream code treats as null/false — never as "needs onboarding".
    const p = (profileRes.data ?? null) as ProfileRow | null;
    setProfile(p);
    // Prefer admin > partner > customer when multiple roles exist, otherwise
    // pick the newest. Most-privileged role wins so admins always see admin.
    const rows = (rolesRes.data ?? []) as Array<{ role: Role | null }>;
    const priority: Role[] = ["admin", "partner", "customer"];
    let chosen: Role | null = null;
    for (const r of priority) {
      if (rows.find((x) => x.role === r)) { chosen = r; break; }
    }
    if (!chosen && rows[0]?.role) chosen = rows[0].role;
    setRole(chosen);
    console.log("[auth] loadProfile done", {
      uid,
      hasProfile: !!p,
      onboardingCompleted: p?.onboarding_completed ?? null,
      role: chosen,
    });
  };

  useEffect(() => {
    let cancelled = false;

    // Primary: use getSession to seed state; await profile load before clearing loading
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      if (cancelled) return;
      console.log("[auth] getSession resolved", { hasSession: !!sess, uid: sess?.user?.id ?? null });
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        await loadProfile(sess.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }
      if (!cancelled) setLoading(false);
    });

    // Secondary: react to auth events (sign in, sign out, token refresh).
    // Skip INITIAL_SESSION — getSession() handles the first load above. Only
    // re-fetch the profile on real sign-in/out events, NOT on TOKEN_REFRESHED
    // (cheap silent refresh that shouldn't flash the loading spinner).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sess) => {
        if (cancelled || event === "INITIAL_SESSION") return;
        console.log("[auth] auth event", { event, hasSession: !!sess, uid: sess?.user?.id ?? null });
        setSession(sess);
        setUser(sess?.user ?? null);

        if (!sess?.user) {
          // Signed out — wipe profile/role immediately. No loading flicker.
          setProfile(null);
          setRole(null);
          return;
        }

        if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          // Same user, fresher token. No need to refetch profile or toggle
          // the loading spinner.
          return;
        }

        // SIGNED_IN (or any other "new session") → re-enter loading until the
        // profile catches up. Without this, route guards see
        // (user=truthy, profile=null) for one render and bounce a
        // fully-onboarded user through `/onboarding` before the profile load
        // completes — that's the post-login flash.
        setLoading(true);
        setTimeout(async () => {
          if (cancelled) return;
          try {
            await loadProfile(sess.user.id);
          } finally {
            if (!cancelled) setLoading(false);
          }
        }, 0);
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        onboardingStep: deriveStep(profile, role),
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
