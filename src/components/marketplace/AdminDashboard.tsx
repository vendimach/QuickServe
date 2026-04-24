import { useEffect, useState } from "react";
import {
  Users,
  Calendar,
  IndianRupee,
  TrendingUp,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Metrics {
  totalUsers: number;
  totalPartners: number;
  totalBookings: number;
  completed: number;
  cancelled: number;
  refunded: number;
  revenue: number;
  recent: Array<{
    id: string;
    service_name: string;
    status: string;
    price: number;
    created_at: string;
  }>;
}

export const AdminDashboard = () => {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    if (role !== "admin") {
      setLoading(false);
      return;
    }
    const load = async () => {
      const [{ count: profCount }, { data: roles }, bookingsResp] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
        supabase
          .from("bookings")
          .select("id, service_name, status, price, created_at, payment_status, refund_status")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      const bookings = bookingsResp.data ?? [];
      const partners = (roles ?? []).filter((r) => r.role === "partner").length;
      const completed = bookings.filter((b) => b.status === "completed").length;
      const cancelled = bookings.filter((b) => b.status === "cancelled").length;
      const refunded = bookings.filter((b) => b.refund_status === "refunded").length;
      const revenue = bookings
        .filter((b) => b.payment_status === "paid")
        .reduce((sum, b) => sum + Number(b.price ?? 0), 0);
      setMetrics({
        totalUsers: profCount ?? 0,
        totalPartners: partners,
        totalBookings: bookings.length,
        completed,
        cancelled,
        refunded,
        revenue,
        recent: bookings.slice(0, 10).map((b) => ({
          id: b.id,
          service_name: b.service_name,
          status: b.status,
          price: Number(b.price),
          created_at: b.created_at,
        })),
      });
      setLoading(false);
    };
    load();
  }, [role]);

  if (role !== "admin") {
    return (
      <div className="-mt-5 px-5 pb-6">
        <div className="rounded-2xl bg-card p-6 text-center shadow-card">
          <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
          <p className="mt-3 text-sm font-bold text-foreground">Admin access required</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You need admin privileges to view this dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !metrics) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "Users", value: metrics.totalUsers, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Partners", value: metrics.totalPartners, icon: ShieldCheck, color: "bg-accent/10 text-accent" },
    { label: "Bookings", value: metrics.totalBookings, icon: Calendar, color: "bg-warning/15 text-warning" },
    { label: "Revenue", value: `₹${metrics.revenue.toLocaleString()}`, icon: IndianRupee, color: "bg-success/15 text-success" },
  ];

  return (
    <div className="-mt-5 space-y-4 px-5 pb-6">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <h2 className="text-base font-bold text-foreground">Admin Dashboard</h2>
        <p className="text-xs text-muted-foreground">Marketplace metrics & activity</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl bg-card p-4 shadow-soft">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-extrabold text-foreground">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</p>
          <p className="mt-1 text-lg font-extrabold text-success">{metrics.completed}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cancelled</p>
          <p className="mt-1 text-lg font-extrabold text-destructive">{metrics.cancelled}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Refunded</p>
          <p className="mt-1 text-lg font-extrabold text-warning">{metrics.refunded}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Recent bookings</p>
        </div>
        {metrics.recent.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No bookings yet</p>
        ) : (
          <div className="divide-y divide-border">
            {metrics.recent.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{b.service_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(b.created_at).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">₹{b.price}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">{b.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
