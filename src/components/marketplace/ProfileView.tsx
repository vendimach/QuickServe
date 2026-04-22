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
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface Row {
  icon: typeof User;
  label: string;
  value?: string;
  status?: "verified" | "pending" | "none";
  iconColor: string;
  onClick?: () => void;
}

export const ProfileView = () => {
  const { role } = useApp();

  const profile = {
    name: role === "partner" ? "Rahul Verma" : "Ananya Gupta",
    address: "12, MG Road, Bengaluru 560001",
    aadhar: "verified" as const,
    mobile: "+91 98765 43210",
    mobileVerified: true,
    email: "ananya.g@example.com",
    emailVerified: false,
    rating: role === "partner" ? 4.9 : 4.8,
    paymentMethod: "UPI • HDFC ••4521",
  };

  const rows: Row[] = [
    {
      icon: ShieldCheck,
      label: "Aadhaar Verification",
      value: profile.aadhar === "verified" ? "Verified" : "Verify now",
      status: profile.aadhar,
      iconColor: "bg-success/15 text-success",
    },
    {
      icon: Phone,
      label: "Mobile Number",
      value: profile.mobile,
      status: profile.mobileVerified ? "verified" : "pending",
      iconColor: "bg-primary/10 text-primary",
    },
    {
      icon: Mail,
      label: "Email Verification",
      value: profile.email,
      status: profile.emailVerified ? "verified" : "pending",
      iconColor: "bg-accent/10 text-accent",
    },
    {
      icon: Star,
      label: "Your Rating",
      value: `${profile.rating} ★`,
      iconColor: "bg-warning/15 text-warning",
    },
    {
      icon: CreditCard,
      label: "Payment Methods",
      value: profile.paymentMethod,
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
  ];

  return (
    <div className="-mt-5 space-y-4 px-5 pb-6">
      {/* Profile header card */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-xl font-bold text-primary-foreground shadow-soft">
            {profile.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">
              {profile.name}
            </h2>
            <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">{profile.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail rows */}
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
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  r.iconColor,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {r.label}
                </p>
                {r.value && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {r.value}
                  </p>
                )}
              </div>
              {r.status === "verified" && (
                <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              )}
              {r.status === "pending" && (
                <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">
                  <AlertCircle className="h-3 w-3" /> Pending
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <button className="w-full rounded-2xl border border-destructive/30 bg-card py-3 text-sm font-bold text-destructive shadow-soft transition-smooth hover:bg-destructive/5">
        Sign Out
      </button>
    </div>
  );
};
