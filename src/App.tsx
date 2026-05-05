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

// /auth — accessible only when NOT logged in (or not fully onboarded)
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, onboardingStep } = useAuth();
  if (loading) return <Spinner />;
  if (user) {
    return onboardingStep === 5
      ? <Navigate to="/" replace />
      : <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

// /onboarding — must be logged in AND onboarding incomplete
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, onboardingStep } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingStep === 5) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// / — must be logged in AND fully onboarded
const Protected = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, onboardingStep } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingStep < 5) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

// /admin — must be logged in AND have admin role
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role } = useAuth();
  if (loading) return <Spinner />;
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
