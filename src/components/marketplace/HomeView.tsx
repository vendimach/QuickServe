import { Search, MapPin, ChevronRight, Sparkles, Wrench, Scissors, Refrigerator, Star } from "lucide-react";
import { categories, services } from "@/data/services";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const iconMap = { Sparkles, Wrench, Scissors, Refrigerator };
const colorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/10 text-success",
};

export const HomeView = () => {
  const { navigate } = useApp();
  const featured = services.slice(0, 3);

  return (
    <div className="-mt-5 space-y-6 px-5">
      {/* Search */}
      <div className="rounded-2xl bg-card p-3 shadow-card">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search for services…"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>12, MG Road, Bengaluru</span>
        </div>
      </div>

      {/* Categories */}
      <section className="animate-fade-in-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Categories</h2>
          <button className="text-xs font-medium text-primary">See all</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon as keyof typeof iconMap];
            return (
              <button
                key={cat.id}
                onClick={() => navigate({ name: "category", categoryId: cat.id })}
                className="group flex flex-col items-center gap-2 rounded-2xl bg-card p-3 shadow-soft transition-bounce hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl transition-smooth group-hover:scale-110", colorMap[cat.color])}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-semibold text-foreground">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Promo banner */}
      <section className="overflow-hidden rounded-2xl gradient-accent p-5 text-accent-foreground shadow-card animate-scale-in">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Limited Offer</p>
            <h3 className="mt-0.5 text-lg font-bold leading-tight">Flat 30% off on first booking</h3>
            <p className="mt-1 text-xs opacity-90">Use code QUICK30 at checkout</p>
          </div>
          <Sparkles className="h-12 w-12 opacity-40" />
        </div>
      </section>

      {/* Featured */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Most booked</h2>
        </div>
        <div className="space-y-3">
          {featured.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate({ name: "service-detail", serviceId: s.id })}
              className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-soft transition-smooth hover:shadow-card"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">{s.name}</h3>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span className="font-medium text-foreground">{s.rating}</span>
                  </span>
                  <span>•</span>
                  <span>{s.duration}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-foreground">₹{s.price}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};