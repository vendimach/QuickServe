import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const loadScript = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export interface PayArgs {
  amount: number; // INR rupees
  bookingId: string;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
  description?: string;
}

export async function payWithRazorpay(args: PayArgs): Promise<{ paid: boolean; reason?: string }> {
  const ok = await loadScript();
  if (!ok) return { paid: false, reason: "Could not load Razorpay" };

  // 1. Create order
  const { data: orderData, error: orderErr } = await supabase.functions.invoke("razorpay-create-order", {
    body: { amount: args.amount, bookingId: args.bookingId },
  });
  if (orderErr || !orderData?.orderId) {
    console.error("razorpay create order error", orderErr, orderData);
    return { paid: false, reason: orderErr?.message ?? orderData?.error ?? "Order failed" };
  }

  // Demo mode: skip the Razorpay checkout widget and auto-verify
  if (orderData.isDemo) {
    const { data: vData, error: vErr } = await supabase.functions.invoke("razorpay-verify", {
      body: {
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: `demo_pay_${Date.now()}`,
        razorpay_signature: "demo",
        bookingId: args.bookingId,
      },
    });
    if (vErr || !vData?.verified) {
      console.error("demo verify failed", vErr, vData);
      return { paid: false, reason: "Demo payment verification failed" };
    }
    return { paid: true };
  }

  return new Promise((resolve) => {
    const rzp = new window.Razorpay!({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "QuickServe",
      description: args.description ?? "Service booking",
      order_id: orderData.orderId,
      prefill: {
        name: args.customerName,
        email: args.customerEmail,
        contact: args.customerContact,
      },
      theme: { color: "#3b82f6" },
      handler: async (response: any) => {
        try {
          const { data: vData, error: vErr } = await supabase.functions.invoke("razorpay-verify", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: args.bookingId,
            },
          });
          if (vErr || !vData?.verified) {
            console.error("verify failed", vErr, vData);
            return resolve({ paid: false, reason: "Signature verification failed" });
          }
          resolve({ paid: true });
        } catch (e: any) {
          resolve({ paid: false, reason: e.message });
        }
      },
      modal: {
        ondismiss: () => resolve({ paid: false, reason: "Payment cancelled" }),
      },
    });
    rzp.on("payment.failed", (resp: any) => {
      console.error("Razorpay payment failed", resp?.error);
      resolve({ paid: false, reason: resp?.error?.description ?? "Payment failed" });
    });
    rzp.open();
  });
}
