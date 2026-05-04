import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/types";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface ProfileRow {
  full_name: string;
  mobile: string | null;
  aadhaar_last4: string | null;
  mobile_verified: boolean;
  aadhaar_verified: boolean;
  onboarding_completed: boolean;
  home_lat: number | null;
  home_lng: number | null;
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
  if (!role || !profile) return 1;
  // Existing users (DEFAULT true) and users who finished onboarding go straight to app
  if (profile.onboarding_completed) return 5;
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
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, mobile, aadhaar_last4, mobile_verified, aadhaar_verified, onboarding_completed, home_lat, home_lng")
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    setProfile(p ?? null);
    setRole((r?.role as Role | undefined) ?? null);
  };

  useEffect(() => {
    let cancelled = false;

    // Primary: use getSession to seed state; await profile load before clearing loading
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      if (cancelled) return;
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

    // Secondary: react to auth events (sign in, sign out, token refresh)
    // Skip INITIAL_SESSION — getSession() handles the first load above
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sess) => {
        if (cancelled || event === "INITIAL_SESSION") return;
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          // Defer to avoid calling Supabase inside its own callback
          setTimeout(() => {
            if (!cancelled) loadProfile(sess.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
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
