import { useState } from "react";
import {
  LayoutDashboard, Package, FolderOpen, BarChart2, Menu, X,
  ChevronRight, LogOut, Zap, Award, Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type AdminSection = "dashboard" | "services" | "categories" | "analytics" | "partners" | "badges";

interface Props {
  section: AdminSection;
  onNavigate: (s: AdminSection) => void;
  children: React.ReactNode;
}

const NAV = [
  { id: "dashboard" as const,  label: "Dashboard",        icon: LayoutDashboard },
  { id: "partners"  as const,  label: "Partner insights", icon: Users },
  { id: "badges"    as const,  label: "Badges",           icon: Award },
  { id: "services"  as const,  label: "Services",         icon: Package },
  { id: "categories" as const, label: "Categories",       icon: FolderOpen },
  { id: "analytics" as const,  label: "Analytics",        icon: BarChart2 },
];

export const AdminLayout = ({ section, onNavigate, children }: Props) => {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const name = profile?.full_name ?? "Admin";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-card shadow-elevated transition-transform duration-300",
        "lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">QuickServe</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Admin Panel</p>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => { onNavigate(id); setSidebarOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-smooth",
                  active
                    ? "gradient-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              <p className="text-[11px] text-muted-foreground">Administrator</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-secondary hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-3 shadow-soft">
          <button
            className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-secondary lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">
            {NAV.find((n) => n.id === section)?.label}
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
