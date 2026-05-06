import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { MarketplaceDataProvider } from "@/contexts/MarketplaceDataContext";
import { UserDataProvider } from "@/contexts/UserDataContext";
import { PartnerDataProvider } from "@/contexts/PartnerDataContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { BadgeProvider } from "@/contexts/BadgeContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Single source of truth for "is auth still resolving?". As long as the
 * AuthContext's `loading` flag is honoured here, no guard will ever navigate
 * with stale or in-flight state. `loading` is true while either getSession
 * is pending OR a SIGNED_IN event triggered a profile refetch.
 *
 * We deliberately do NOT block on `profile === null` here — a brand-new user
 * legitimately has no profile row yet, and that's exactly the case that
 * should fall through to the onboarding redirect.
 */
const useAuthGate = (): React.ReactNode | null => {
  const { loading } = useAuth();
  if (loading) return <Spinner />;
  return null;
};

// /auth — accessible only when NOT logged in (or not fully onboarded)
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const gate = useAuthGate();
  const { user, onboardingStep } = useAuth();
  if (gate) return gate;
  if (user) {
    console.log("[route] AuthGuard → redirecting", { onboardingStep });
    return onboardingStep === 5
      ? <Navigate to="/" replace />
      : <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

// /onboarding — must be logged in AND onboarding incomplete
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const gate = useAuthGate();
  const { user, onboardingStep } = useAuth();
  if (gate) return gate;
  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingStep === 5) {
    console.log("[route] OnboardingGuard → already complete, redirect to /");
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// / — must be logged in AND fully onboarded
const Protected = ({ children }: { children: React.ReactNode }) => {
  const gate = useAuthGate();
  const { user, onboardingStep } = useAuth();
  if (gate) return gate;
  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingStep < 5) {
    console.log("[route] Protected → onboarding not complete", { onboardingStep });
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

// /admin — must be logged in AND have admin role
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const gate = useAuthGate();
  const { user, role } = useAuth();
  if (gate) return gate;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <MarketplaceDataProvider>
                <UserDataProvider>
                  <PartnerDataProvider>
                    <WalletProvider>
                    <BadgeProvider>
                    <FavoritesProvider>
                    <Routes>
                      <Route
                        path="/auth"
                        element={<AuthGuard><Auth /></AuthGuard>}
                      />
                      <Route
                        path="/onboarding"
                        element={<OnboardingGuard><Onboarding /></OnboardingGuard>}
                      />
                      <Route
                        path="/admin"
                        element={<AdminGuard><Admin /></AdminGuard>}
                      />
                      <Route
                        path="/admin/*"
                        element={<AdminGuard><Admin /></AdminGuard>}
                      />
                      <Route
                        path="/"
                        element={<Protected><Index /></Protected>}
                      />
                      <Route
                        path="/*"
                        element={<Protected><Index /></Protected>}
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </FavoritesProvider>
                    </BadgeProvider>
                    </WalletProvider>
                  </PartnerDataProvider>
                </UserDataProvider>
              </MarketplaceDataProvider>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
