import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  FileCheck,
  Stethoscope,
  Users as UsersIcon,
  GraduationCap,
  HeartPulse,
  AlertOctagon,
  Utensils,
  Sparkles,
  Baby,
  Video,
  PhoneCall,
  Mail,
  ClipboardCheck,
} from "lucide-react";

const items = [
  { icon: FileCheck, title: "Govt ID Verified", body: "Aadhaar, PAN, voter ID checked", color: "bg-primary/10 text-primary" },
  { icon: ShieldCheck, title: "Police BG Check", body: "No criminal record", color: "bg-success/15 text-success" },
  { icon: Stethoscope, title: "Medical Fitness", body: "Annual health certificate", color: "bg-accent/10 text-accent" },
  { icon: UsersIcon, title: "Reference Check", body: "2+ verified references", color: "bg-warning/15 text-warning" },
  { icon: GraduationCap, title: "Skill Training", body: "First aid, hygiene, safety", color: "bg-primary/10 text-primary" },
  { icon: HeartPulse, title: "First Aid Certified", body: "CPR & emergency trained", color: "bg-destructive/10 text-destructive" },
  { icon: AlertOctagon, title: "Emergency Drill", body: "Quick-response trained", color: "bg-warning/15 text-warning" },
  { icon: Utensils, title: "Feeding & Diet", body: "Specialised nutrition care", color: "bg-success/15 text-success" },
  { icon: Sparkles, title: "Hygiene Standards", body: "Sanitation protocols followed", color: "bg-accent/10 text-accent" },
  { icon: Baby, title: "Newborn Handling", body: "Specialised infant care", color: "bg-primary/10 text-primary" },
  { icon: Video, title: "Cam Monitoring", body: "Live in-home view available", color: "bg-accent/10 text-accent" },
  { icon: PhoneCall, title: "Feedback Calls", body: "We call after every visit", color: "bg-success/15 text-success" },
  { icon: Mail, title: "Email Reports", body: "Service summaries to you", color: "bg-primary/10 text-primary" },
  { icon: ClipboardCheck, title: "Quality Checks", body: "Random monthly audits", color: "bg-warning/15 text-warning" },
];

export const VerificationCarousel = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = setInterval(() => {
      const next = (page + 1) % items.length;
      const card = el.children[next] as HTMLElement | undefined;
      card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      setPage(next);
    }, 3500);
    return () => clearInterval(id);
  }, [page]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Verified Partners</h2>
          <p className="text-[11px] text-muted-foreground">Every pro passes 10+ checks before joining</p>
        </div>
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
          ✓ Trusted
        </span>
      </div>
      <div
        ref={ref}
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.title}
              className="snap-start shrink-0 w-[68%] sm:w-[42%] lg:w-[28%] rounded-2xl bg-card p-4 shadow-card"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${it.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-bold text-foreground">{it.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{it.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
