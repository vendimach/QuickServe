import { ReactNode } from "react";
import { Home, Calendar, User, Briefcase, Bell, Sun, Moon, HelpCircle, Mail, Shield, FileText, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { AiAssistant } from "./AiAssistant";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

export const AppShell = ({ children, title, subtitle, showHeader = true }: AppShellProps) => {
  const { role, view, navigate } = useApp();
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();

  const customerTabs = [
    { name: "Home", icon: Home, view: { name: "home" as const } },
    { name: "Bookings", icon: Calendar, view: { name: "bookings" as const } },
    { name: "Profile", icon: User, view: { name: "profile" as const } },
  ];

  const partnerTabs = [
    { name: "Home", icon: Home, view: { name: "partner-dashboard" as const } },
    { name: "Jobs", icon: Briefcase, view: { name: "bookings" as const } },
    { name: "Profile", icon: User, view: { name: "profile" as const } },
  ];

  const greeting = profile?.full_name?.split(" ")[0] ?? (role === "partner" ? "Partner" : "there");
  const tabs = role === "partner" ? partnerTabs : customerTabs;
  const isHome = view.name === "home" || view.name === "partner-dashboard";

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground font-bold">
            Q
          </div>
          <div>
            <p className="text-sm font-bold">QuickServe</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{role}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {tabs.map((tab) => {
            const active = view.name === tab.view.name;
            const Icon = tab.icon;
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.view)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-smooth",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {tab.name}
              </button>
            );
          })}
          <button
            onClick={() => navigate({ name: "notifications" })}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-smooth",
              view.name === "notifications"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate({ name: "faqs" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-smooth"
          >
            <HelpCircle className="h-4 w-4" /> Help
          </button>
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-xl bg-secondary px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-smooth"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="capitalize">{theme} mode</span>
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background shadow-elevated sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-3xl sm:overflow-hidden lg:my-0 lg:max-w-none lg:flex-1 lg:rounded-none lg:shadow-none">
        {showHeader && (
          <header className="gradient-hero relative px-5 pt-6 pb-6 text-primary-foreground lg:pb-8 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                  {role === "customer" ? `Hi ${greeting} 👋` : "Service Partner"}
                </p>
                <h1 className="text-xl font-bold lg:text-2xl">{title ?? "QuickServe"}</h1>
                {subtitle && (
                  <p className="mt-0.5 text-sm opacity-90">{subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  aria-label="Toggle theme"
                  onClick={toggleTheme}
                  className="rounded-full bg-white/15 p-2.5 backdrop-blur-sm transition-smooth hover:bg-white/25"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button
                  aria-label="Notifications"
                  onClick={() => navigate({ name: "notifications" })}
                  className="relative rounded-full bg-white/15 p-2.5 backdrop-blur-sm transition-smooth hover:bg-white/25"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto pt-5 pb-24 lg:pb-8">
          <div className="lg:mx-auto lg:max-w-3xl lg:px-2">{children}</div>
          {isHome && <SiteFooter />}
        </main>

        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-border bg-card/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:absolute sm:bottom-0 sm:left-0 sm:translate-x-0 lg:hidden">
          {tabs.map((tab) => {
            const active = view.name === tab.view.name;
            const Icon = tab.icon;
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.view)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 transition-smooth",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                <span className="text-[11px] font-medium">{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {view.name !== "chat" && <AiAssistant />}
    </div>
  );
};

const SiteFooter = () => {
  return (
    <footer className="mt-10 border-t border-border bg-card/40 px-5 py-8 text-xs text-muted-foreground lg:px-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold text-foreground">QuickServe</p>
          </div>
          <p className="mt-2 leading-relaxed">
            Trusted home services on demand. Verified partners, transparent pricing,
            real-time tracking.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Company</p>
          <ul className="mt-2 space-y-1.5">
            <li><a href="#" className="hover:text-foreground">About us</a></li>
            <li><a href="#" className="hover:text-foreground">Careers</a></li>
            <li><a href="#" className="hover:text-foreground">Press</a></li>
            <li><a href="#" className="hover:text-foreground">Blog</a></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Support</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-center gap-1.5"><HelpCircle className="h-3 w-3" /> Help Center</li>
            <li className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> support@quickserve.app</li>
            <li>+91 1800-123-456</li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Legal</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> Terms of service</li>
            <li className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> Privacy policy</li>
            <li>Refund policy</li>
            <li>Cancellation policy</li>
          </ul>
        </div>
      </div>
      <div className="mt-6 border-t border-border pt-4 text-center text-[11px]">
        © {new Date().getFullYear()} QuickServe Technologies Pvt. Ltd. All rights reserved.
      </div>
    </footer>
  );
};
