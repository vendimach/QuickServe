import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Send, Phone, Lock, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: "customer" | "partner";
  body: string;
  created_at: string;
}

interface Props {
  bookingId: string;
}

export const ChatView = ({ bookingId }: Props) => {
  const { bookings, goBack, role } = useApp();
  const { user } = useAuth();
  const { push } = useNotifications();
  const booking = bookings.find((b) => b.id === bookingId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Initial message load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("booking_messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setMessages((data ?? []) as Message[]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [bookingId]);

  // Realtime: listen for new messages on this booking
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            // Find an optimistic placeholder for this message (same sender + body)
            const optIdx = prev.findIndex(
              (m) => m.id.startsWith("opt-") && m.sender_id === incoming.sender_id && m.body === incoming.body,
            );
            if (optIdx !== -1) {
              // Replace the optimistic copy with the confirmed DB row
              const next = [...prev];
              next[optIdx] = incoming;
              return next;
            }
            // Guard against duplicate real rows (e.g. reconnect replay)
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          // Notify when the peer sends a message
          if (incoming.sender_id !== user?.id) {
            push({
              kind: "info",
              title: "New message",
              body: incoming.body.length > 60 ? incoming.body.slice(0, 57) + "…" : incoming.body,
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId, user?.id, push]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  if (!booking || !user) return null;

  const isClosed =
    booking.status === "completed" ||
    booking.status === "cancelled" ||
    booking.status === "refunded";

  const senderRole: "customer" | "partner" = role === "partner" ? "partner" : "customer";
  const peerName = role === "partner" ? "Customer" : (booking.professional?.name ?? "Partner");
  const peerAvatar = role === "partner" ? "C" : (booking.professional?.avatar ?? "P");

  const send = async () => {
    const body = text.trim();
    if (!body || sending || isClosed) return;
    setText("");
    setSending(true);

    // Optimistic insert — replaced by the real row from the realtime event
    const optId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optId, booking_id: bookingId, sender_id: user.id, sender_role: senderRole, body, created_at: new Date().toISOString() },
    ]);

    const { error } = await supabase.from("booking_messages").insert({
      booking_id: bookingId,
      sender_id: user.id,
      sender_role: senderRole,
      body,
    });

    if (error) {
      // Roll back the optimistic message and restore the draft text
      setMessages((prev) => prev.filter((m) => m.id !== optId));
      setText(body);
    }
    setSending(false);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col px-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-card">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="rounded-full bg-secondary p-1.5"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
            {peerAvatar}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{peerName}</p>
            <p className="text-[11px] text-muted-foreground">{booking.service.name}</p>
          </div>
        </div>
        <button aria-label="Call" className="rounded-full bg-success/15 p-2 text-success">
          <Phone className="h-4 w-4" />
        </button>
      </div>

      {/* Message list */}
      <div ref={scrollRef} className="mt-3 flex-1 overflow-y-auto rounded-2xl bg-secondary/40 p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
            {isClosed ? "This chat has ended." : "Send a message to start chatting"}
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const isMine = m.sender_id === user.id;
              const isOptimistic = m.id.startsWith("opt-");
              const time = new Date(m.created_at).toLocaleTimeString("en", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-soft transition-opacity",
                      isMine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-card text-foreground",
                      isOptimistic && "opacity-60",
                    )}
                  >
                    {m.body}
                    <div
                      className={cn(
                        "mt-0.5 text-[9px]",
                        isMine ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {isOptimistic ? "Sending…" : time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input or closed state */}
      {isClosed ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-xs font-medium text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Chat ended — booking is {booking.status}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-card p-2 shadow-card">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message…"
            className="flex-1 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-soft disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
