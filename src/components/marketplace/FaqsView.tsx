import { useMemo, useState } from "react";
import { ArrowLeft, Search, HelpCircle, ChevronDown } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS: { category: string; q: string; a: string }[] = [
  { category: "Bookings", q: "How do I book an instant service?", a: "Choose a category, pick a service, tap Book Immediately and we'll match you with the nearest verified partner within minutes." },
  { category: "Bookings", q: "Can I schedule for later?", a: "Yes — pick Schedule for Later, choose your date and time slot. You can cancel free of charge before the partner accepts." },
  { category: "Bookings", q: "Where do completed bookings go?", a: "Once a service is completed, the booking moves from 'Scheduled' into the 'Completed' tab where you can rate the partner." },
  { category: "Cancellations", q: "Are there cancellation fees?", a: "Free before partner accepts. ₹49 after acceptance. ₹99 within 15 minutes of arrival. Refunds for paid bookings are auto-initiated to the original method." },
  { category: "Payments", q: "Which payment methods are supported?", a: "UPI, all major credit/debit cards, popular wallets and Cash on Delivery via our Razorpay integration." },
  { category: "Payments", q: "Is my card information stored?", a: "No raw card data is stored on our servers. Razorpay (PCI-DSS Level 1) handles all card data; we keep only the brand and last 4 digits for display." },
  { category: "Safety", q: "How are partners verified?", a: "Every partner clears Aadhaar verification, mobile OTP, in-person background checks and a service-specific skill assessment before going live." },
  { category: "Safety", q: "What is the start OTP?", a: "Each booking generates a 4-digit OTP shown to you. Share it with the partner only when they arrive — service can't begin without it." },
  { category: "Live Cam", q: "How does the live cam work?", a: "When the partner arrives we provide them a sanitised camera. The encrypted feed is available to you only during the active session and is deleted afterwards." },
  { category: "Account", q: "How do I delete my account?", a: "Profile → Edit Profile → Delete account. Your profile and saved data will be removed; bookings remain for legal/compliance reporting." },
  { category: "Refer & Earn", q: "How does Refer & Earn work?", a: "Share your referral code. Your friend gets ₹100 off their first booking, you get ₹200 credited after their service completes." },
];

export const FaqsView = () => {
  const { goBack } = useApp();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return FAQS;
    return FAQS.filter((f) => `${f.q} ${f.a} ${f.category}`.toLowerCase().includes(term));
  }, [q]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof FAQS>();
    filtered.forEach((f) => {
      const arr = m.get(f.category) ?? [];
      arr.push(f);
      m.set(f.category, arr);
    });
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <div className="space-y-3 px-5 pb-6">
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">FAQs & Help</h2>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search questions…"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
          No matching answers. Try different keywords.
        </div>
      )}

      {grouped.map(([cat, items]) => (
        <div key={cat} className="rounded-2xl bg-card p-4 shadow-soft">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{cat}</p>
          <Accordion type="single" collapsible>
            {items.map((f, i) => (
              <AccordionItem key={f.q} value={`${cat}-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
};
