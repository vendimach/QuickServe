import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { MarketplaceDataProvider } from "@/contexts/MarketplaceDataContext";
import { UserDataProvider } from "@/contexts/UserDataContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <MarketplaceDataProvider>
                <UserDataProvider>
                  <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/"
                  element={
                    <Protected>
                      <Index />
                    </Protected>
                  }
                />
                <Route
                  path="/*"
                  element={
                    <Protected>
                      <Index />
                    </Protected>
                  }
                />
                <Route path="*" element={<NotFound />} />
                  </Routes>
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
