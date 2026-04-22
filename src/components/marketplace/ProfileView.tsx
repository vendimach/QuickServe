import {
  User,
  MapPin,
  ShieldCheck,
  Phone,
  Mail,
  Star,
  CreditCard,
  Home,
  Info,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export const ProfileView = () => {
  const { role } = useApp();
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const name = profile?.full_name ?? "Guest";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const rows = [
    {
      icon: ShieldCheck,
      label: "Aadhaar Verification",
      value: profile?.aadhaar_verified ? `Verified • ••${profile.aadhaar_last4}` : "Verify now",
      status: profile?.aadhaar_verified ? "verified" : "pending",
      iconColor: "bg-success/15 text-success",
    },
    {
      icon: Phone,
      label: "Mobile Number",
      value: profile?.mobile ?? "—",
      status: profile?.mobile_verified ? "verified" : "pending",
      iconColor: "bg-primary/10 text-primary",
    },
    {
      icon: Mail,
      label: "Email",
      value: user?.email ?? "—",
      status: user?.email_confirmed_at ? "verified" : "pending",
      iconColor: "bg-accent/10 text-accent",
    },
    {
      icon: Star,
      label: "Your Rating",
      value: role === "partner" ? "4.9 ★" : "4.8 ★",
      iconColor: "bg-warning/15 text-warning",
    },
    {
      icon: CreditCard,
      label: "Payment Methods",
      value: "UPI • HDFC ••4521",
      iconColor: "bg-primary/10 text-primary",
    },
    {
      icon: Home,
      label: "Saved Addresses",
      value: "Home, Work • 2 saved",
      iconColor: "bg-accent/10 text-accent",
    },
    {
      icon: Info,
      label: "About Us",
      value: "Version 1.0.0",
      iconColor: "bg-muted text-muted-foreground",
    },
  ] as const;

  return (
    <div className="-mt-5 space-y-4 px-5 pb-6">
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-xl font-bold text-primary-foreground shadow-soft">
            {initials || <User className="h-7 w-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">{name}</h2>
            <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">12, MG Road, Bengaluru 560001</span>
            </div>
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Theme toggle row */}
      <button
        onClick={toggleTheme}
        className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 shadow-soft transition-smooth hover:bg-secondary/50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">Appearance</p>
          <p className="mt-0.5 text-xs text-muted-foreground capitalize">{theme} mode</p>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-foreground">
          Switch
        </span>
      </button>

      <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <button
              key={r.label}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-smooth hover:bg-secondary/50",
                i !== rows.length - 1 && "border-b border-border",
              )}
            >
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", r.iconColor)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{r.label}</p>
                {r.value && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.value}</p>
                )}
              </div>
              {(r as { status?: string }).status === "verified" && (
                <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              )}
              {(r as { status?: string }).status === "pending" && (
                <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
                  <AlertCircle className="h-3 w-3" /> Pending
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-card py-3 text-sm font-bold text-destructive shadow-soft transition-smooth hover:bg-destructive/5"
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
};
