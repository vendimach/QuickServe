import { ArrowLeft, Star, Clock, ShieldCheck, Award } from "lucide-react";
import { services } from "@/data/services";
import { useApp } from "@/contexts/AppContext";

interface Props {
  serviceId: string;
}

export const ServiceDetail = ({ serviceId }: Props) => {
  const { navigate } = useApp();
  const service = services.find((s) => s.id === serviceId);
  if (!service) return null;

  return (
    <div className="-mt-5 px-5 pb-6">
      <button
        onClick={() => navigate({ name: "category", categoryId: service.categoryId })}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft transition-smooth"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="text-xl font-bold text-foreground">{service.name}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-warning">
            <Star className="h-3 w-3 fill-current" />
            <span className="font-semibold">{service.rating}</span>
            <span className="opacity-80">({service.reviews.toLocaleString()})</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {service.duration}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{service.description}</p>
        <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Starting at</p>
            <p className="text-2xl font-bold text-foreground">₹{service.price}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <ShieldCheck className="h-5 w-5 text-success" />
          <p className="mt-2 text-xs font-semibold text-foreground">Verified Pros</p>
          <p className="text-[11px] text-muted-foreground">Background-checked</p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <Award className="h-5 w-5 text-primary" />
          <p className="mt-2 text-xs font-semibold text-foreground">Quality Promise</p>
          <p className="text-[11px] text-muted-foreground">Free re-do if unhappy</p>
        </div>
      </div>

      <button
        onClick={() => navigate({ name: "booking-flow", serviceId: service.id })}
        className="mt-6 w-full rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground shadow-elevated transition-bounce hover:-translate-y-0.5 active:scale-[0.98]"
      >
        Continue to Booking
      </button>
    </div>
  );
};