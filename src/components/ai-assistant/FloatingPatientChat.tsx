import { useEffect, useState } from "react";
import { Bot, MessageCircle, X } from "lucide-react";
import { PatientAiChat } from "@/components/ai-assistant/PatientAiChat";

/** Persistent patient-only launcher, mounted by DashboardLayout. */
export function FloatingPatientChat() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
    {isOpen && <section role="dialog" aria-label="AI chat" className="absolute bottom-16 right-0 w-[calc(100vw-2rem)] max-w-[26rem] overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:bottom-20">
      <div className="flex items-center gap-3 border-b border-border bg-gradient-health px-4 py-3 text-white">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-white/15"><Bot className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">AI Chat</p><p className="text-xs text-white/80">Appointment booking and clinic help</p></div>
        <button onClick={() => setIsOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-white/90 transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close AI chat"><X className="h-4 w-4" /></button>
      </div>
      <PatientAiChat compact />
    </section>}
    <button onClick={() => setIsOpen((open) => !open)} aria-label={isOpen ? "Close AI chat" : "Open AI chat"} aria-expanded={isOpen} className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/25">
      {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
    </button>
  </div>;
}
