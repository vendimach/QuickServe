import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, Users, CheckCircle2, Star, IndianRupee, Calendar,
  ArrowUpRight, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

interface ChartPoint {
  label: string;
  revenue: number;
  bookings: number;
}

interface ServiceStat {
  name: string;
  bookings: number;
  revenue: number;
}

interface Metrics {
  revenue: number;
  bookings: number;
  customers: number;
  repeats: number;
  rating: number;
  completion: number;
}

interface DashboardData {
  metrics: Metrics;
  chartData: ChartPoint[];
  servicePerformance: ServiceStat[];
}

const EMPTY: DashboardData = {
  metrics: { revenue: 0, bookings: 0, customers: 0, repeats: 0, rating: 0, completion: 0 },
  chartData: [],
  servicePerformance: [],
};

function periodStart(period: Period): Date {
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // month
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildChartData(
  period: Period,
  rows: Array<{ created_at: string; final_amount: number | null; price: number }>,
): ChartPoint[] {
  const now = new Date();

  if (period === "today") {
    // Group by 2-hour blocks (0–22)
    const buckets: Record<number, ChartPoint> = {};
    for (let h = 0; h < 24; h += 2) {
      const label = `${String(h).padStart(2, "0")}:00`;
      buckets[h] = { label, revenue: 0, bookings: 0 };
    }
    for (const r of rows) {
      const h = new Date(r.created_at).getHours();
      const block = Math.floor(h / 2) * 2;
      if (buckets[block]) {
        buckets[block].revenue += r.final_amount ?? r.price ?? 0;
        buckets[block].bookings += 1;
      }
    }
    return Object.values(buckets);
  }

  if (period === "week") {
    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets: Record<string, ChartPoint> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { label: DAY_LABELS[d.getDay()], revenue: 0, bookings: 0 };
    }
    for (const r of rows) {
      const key = r.created_at.slice(0, 10);
      if (buckets[key]) {
        buckets[key].revenue += r.final_amount ?? r.price ?? 0;
        buckets[key].bookings += 1;
      }
    }
    return Object.values(buckets);
  }

  // month — group by day-of-month
  const buckets: Record<string, ChartPoint> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { label: String(d.getDate()), revenue: 0, bookings: 0 };
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    if (buckets[key]) {
      buckets[key].revenue += r.final_amount ?? r.price ?? 0;
      buckets[key].bookings += 1;
    }
  }
  return Object.values(buckets);
}

async function fetchDashboardData(period: Period): Promise<DashboardData> {
  const since = periodStart(period).toISOString();

  // Fetch bookings in period
  const { data: periodRows, error: periodErr } = await supabase
    .from("bookings")
    .select("created_at, status, price, final_amount, service_name, rating, user_id")
    .gte("created_at", since);

  if (periodErr) {
    console.error("[admin/dashboard] bookings fetch failed", periodErr);
    return EMPTY;
  }

  const rows = periodRows ?? [];

  // Total registered customers (distinct users who have made bookings)
  const { count: totalUsers } = await supabase
    .from("bookings")
    .select("user_id", { count: "exact", head: true });

  // Compute metrics
  const completedRows = rows.filter((r) => r.status === "completed");
  const revenue = completedRows.reduce(
    (sum, r) => sum + (Number(r.final_amount) || Number(r.price) || 0),
    0,
  );
  const bookingCount = rows.length;
  const completion = bookingCount > 0
    ? Math.round((completedRows.length / bookingCount) * 100)
    : 0;

  const ratedRows = completedRows.filter((r) => r.rating != null);
  const avgRating = ratedRows.length > 0
    ? ratedRows.reduce((s, r) => s + Number(r.rating), 0) / ratedRows.length
    : 0;

  // Repeat customers: users with >1 booking in period
  const userBookingCount: Record<string, number> = {};
  for (const r of rows) {
    userBookingCount[r.user_id] = (userBookingCount[r.user_id] ?? 0) + 1;
  }
  const uniqueUsers = Object.keys(userBookingCount).length;
  const repeatUsers = Object.values(userBookingCount).filter((c) => c > 1).length;
  const repeatPct = uniqueUsers > 0 ? Math.round((repeatUsers / uniqueUsers) * 100) : 0;

  // Service performance
  const serviceMap: Record<string, ServiceStat> = {};
  for (const r of completedRows) {
    const name = r.service_name ?? "Unknown";
    if (!serviceMap[name]) serviceMap[name] = { name, bookings: 0, revenue: 0 };
    serviceMap[name].bookings += 1;
    serviceMap[name].revenue += Number(r.final_amount) || Number(r.price) || 0;
  }
  const servicePerformance = Object.values(serviceMap)
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 6);

  return {
    metrics: {
      revenue: Math.round(revenue),
      bookings: bookingCount,
      customers: totalUsers ?? uniqueUsers,
      repeats: repeatPct,
      rating: avgRating > 0 ? Math.round(avgRating * 100) / 100 : 0,
      completion,
    },
    chartData: buildChartData(period, rows),
    servicePerformance,
  };
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: typeof TrendingUp;
  iconClass: string;
  trend?: string;
}

function StatCard({ label, value, sub, icon: Icon, iconClass, trend }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
            <ArrowUpRight className="h-3 w-3" /> {trend}
          </span>
        )}
      </div>
      <p className="mt-3 text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export const AdminDashboard = () => {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchDashboardData(period);
    setData(result);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh whenever any booking changes
  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const m = data.metrics;
  const chartData = data.chartData;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["today", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-smooth",
                period === p
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-soft hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Total Revenue"
          value={`₹${m.revenue.toLocaleString("en-IN")}`}
          icon={IndianRupee}
          iconClass="bg-primary/10 text-primary"
        />
        <StatCard
          label="Bookings"
          value={m.bookings.toLocaleString()}
          sub={PERIOD_LABELS[period]}
          icon={Calendar}
          iconClass="bg-accent/10 text-accent"
        />
        <StatCard
          label="Active Users"
          value={m.customers.toLocaleString()}
          sub="Total with bookings"
          icon={Users}
          iconClass="bg-success/10 text-success"
        />
        <StatCard
          label="Repeat Customers"
          value={`${m.repeats}%`}
          sub="Of period bookings"
          icon={TrendingUp}
          iconClass="bg-warning/15 text-warning"
        />
        <StatCard
          label="Avg Rating"
          value={m.rating > 0 ? `${m.rating} ★` : "—"}
          sub="Across completed services"
          icon={Star}
          iconClass="bg-amber-500/15 text-amber-500"
        />
        <StatCard
          label="Completion Rate"
          value={`${m.completion}%`}
          sub="Services completed"
          icon={CheckCircle2}
          iconClass="bg-success/10 text-success"
        />
      </div>

      {/* Revenue line chart */}
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="mb-4 text-sm font-bold text-foreground">Revenue Over Time</p>
        {loading ? (
          <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: 12,
                }}
                formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bookings bar chart */}
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="mb-4 text-sm font-bold text-foreground">Bookings Volume</p>
        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: 12,
                }}
                formatter={(v: number) => [v, "Bookings"]}
              />
              <Bar
                dataKey="bookings"
                fill="hsl(var(--accent))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Service performance */}
      <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground">Service Performance</p>
        </div>
        {loading ? (
          <div className="p-6 text-center text-xs text-muted-foreground">Loading…</div>
        ) : data.servicePerformance.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No completed bookings yet for this period.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.servicePerformance.map((s, i) => {
              const maxBookings = data.servicePerformance[0].bookings;
              const pct = Math.round((s.bookings / maxBookings) * 100);
              return (
                <div key={s.name} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-4 text-[11px] font-bold text-muted-foreground">
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{s.name}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full gradient-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">{s.bookings}</p>
                    <p className="text-[10px] text-muted-foreground">bookings</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-success">
                      ₹{s.revenue >= 1000 ? `${(s.revenue / 1000).toFixed(0)}k` : s.revenue}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
