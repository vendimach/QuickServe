import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useState } from "react";
import {
  TrendingUp, Users, CheckCircle2, Star, IndianRupee, Calendar,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month";

// -- Mock data generators --
const revenueData = {
  today: Array.from({ length: 12 }, (_, i) => ({
    label: `${(i + 1) * 2}:00`,
    revenue: Math.round(800 + Math.random() * 1800),
    bookings: Math.round(2 + Math.random() * 6),
  })),
  week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    label: day,
    revenue: Math.round(6000 + Math.random() * 14000),
    bookings: Math.round(12 + Math.random() * 28),
  })),
  month: Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1}`,
    revenue: Math.round(4000 + Math.random() * 12000),
    bookings: Math.round(8 + Math.random() * 22),
  })),
};

const servicePerformance = [
  { name: "Daily Housemaid", bookings: 432, revenue: 172368 },
  { name: "Evening Babysitter", bookings: 289, revenue: 144211 },
  { name: "Senior Day Companion", bookings: 215, revenue: 193285 },
  { name: "Dog Walking", bookings: 198, revenue: 59202 },
  { name: "Deep Home Cleaning", bookings: 163, revenue: 211837 },
  { name: "Full-Day Nanny", bookings: 121, revenue: 181479 },
];

const metrics = {
  today:  { revenue: 28450, bookings: 62,  customers: 1840, repeats: 48, rating: 4.82, completion: 94 },
  week:   { revenue: 192340, bookings: 430, customers: 1840, repeats: 48, rating: 4.82, completion: 94 },
  month:  { revenue: 842760, bookings: 1820, customers: 1840, repeats: 48, rating: 4.82, completion: 94 },
};

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

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
  const data = revenueData[period];
  const m = metrics[period];

  return (
    <div className="space-y-5">
      {/* Period filter */}
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Total Revenue"
          value={`₹${m.revenue.toLocaleString("en-IN")}`}
          icon={IndianRupee}
          iconClass="bg-primary/10 text-primary"
          trend="+12%"
        />
        <StatCard
          label="Bookings"
          value={m.bookings.toLocaleString()}
          sub={`${PERIOD_LABELS[period]}`}
          icon={Calendar}
          iconClass="bg-accent/10 text-accent"
          trend="+8%"
        />
        <StatCard
          label="Active Users"
          value={m.customers.toLocaleString()}
          sub="Total registered"
          icon={Users}
          iconClass="bg-success/10 text-success"
          trend="+5%"
        />
        <StatCard
          label="Repeat Customers"
          value={`${m.repeats}%`}
          sub="Of monthly bookings"
          icon={TrendingUp}
          iconClass="bg-warning/15 text-warning"
        />
        <StatCard
          label="Avg Rating"
          value={`${m.rating} ★`}
          sub="Across all services"
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
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
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
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
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
      </div>

      {/* Bookings bar chart */}
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="mb-4 text-sm font-bold text-foreground">Bookings Volume</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
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
      </div>

      {/* Service performance */}
      <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground">Service Performance</p>
        </div>
        <div className="divide-y divide-border">
          {servicePerformance.map((s, i) => {
            const maxBookings = servicePerformance[0].bookings;
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
                  <p className="text-xs font-bold text-success">₹{(s.revenue / 1000).toFixed(0)}k</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
