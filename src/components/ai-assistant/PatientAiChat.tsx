import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bot,
  CalendarCheck,
  CalendarPlus,
  CalendarX2,
  Download,
  FileText,
  MessageCircle,
  Send,
  Sparkles,
  User,
  XCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiChatService, AiChatError, type AiChatResponse } from "@/services/ai-chat";
import { liveChatService, type LiveChatMessage } from "@/services/live-chat";
import { useLiveChatSocket } from "@/hooks/useLiveChatSocket";
import { ConnectionStatus } from "@/components/shared/ConnectionStatus";
import { API_BASE_URL, authHeader } from "@/lib/api-config";
import type { Appointment, Doctor } from "@/types/appointment";
import type { ChatMessage } from "@/types/patient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a YYYY-MM-DD string as "Monday, 11 Aug 2026". */
function friendlyDate(iso: string): string {
  const parts = iso.split("-");
  const y = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "1", 10);
  const d = parseInt(parts[2] ?? "1", 10);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Generate consistent avatar colour from a name. */
function avatarBg(name: string): string {
  const colours = [
    "bg-violet-500",
    "bg-sky-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colours[Math.abs(hash) % colours.length] ?? "bg-violet-500";
}

/** First letters of up-to-two words (e.g. "John Smith" → "JS"). */
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("");
}

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  "What are the side effects of my medication?",
  "When should I schedule my next checkup?",
  "Can you explain my lab results?",
  "How can I manage my blood pressure?",
];

type PatientAiChatProps = {
  /** Removes the standalone page heading when rendered inside the floating panel. */
  compact?: boolean;
};

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
            isUser ? "bg-gradient-primary text-white" : "bg-gradient-health text-white"
          }`}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted text-foreground"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

/** Live-chat message bubble (patient or secretary). */
function LiveChatBubble({ msg }: { msg: LiveChatMessage }) {
  const isPatient = msg.senderRole === "patient";
  return (
    <div className={`flex ${isPatient ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] items-start gap-2 ${isPatient ? "flex-row-reverse" : ""}`}>
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
            isPatient ? "bg-primary" : "bg-teal-500"
          }`}
        >
          {initials(msg.senderName)}
        </div>
        <div>
          <p className={`mb-0.5 text-[10px] text-muted-foreground ${isPatient ? "text-right" : ""}`}>
            {isPatient ? "You" : msg.senderName}
          </p>
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isPatient
                ? "rounded-tr-sm bg-primary text-primary-foreground"
                : "rounded-tl-sm bg-teal-50 text-foreground dark:bg-teal-950/30"
            }`}
          >
            {msg.content}
          </div>
          <p className={`mt-0.5 text-[10px] text-muted-foreground ${isPatient ? "text-right" : ""}`}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Fallback service-menu bubble — shown when the AI can't handle a message.
 * Clicking a button triggers the appropriate existing flow or starts live chat.
 */
/** Scenario name → how its fallback button looks. */
const FALLBACK_BUTTONS = {
  book_appointment: {
    icon: CalendarPlus,
    label: "Book an Appointment",
    className:
      "border-primary/30 bg-primary/5 text-primary hover:border-primary/60 hover:bg-primary/10",
  },
  cancel_appointment: {
    icon: CalendarX2,
    label: "Cancel an Appointment",
    className:
      "border-rose-300/50 bg-rose-50/60 text-rose-600 hover:border-rose-400/70 hover:bg-rose-100/70 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-400",
  },
  document_request: {
    icon: FileText,
    label: "Request a Document",
    className:
      "border-violet-300/50 bg-violet-50/60 text-violet-600 hover:border-violet-400/70 hover:bg-violet-100/70 dark:border-violet-700/40 dark:bg-violet-950/30 dark:text-violet-400",
  },
  live_chat: {
    icon: MessageCircle,
    label: "Live Chat with Secretary",
    className:
      "border-teal-300/50 bg-teal-50/60 text-teal-600 hover:border-teal-400/70 hover:bg-teal-100/70 dark:border-teal-700/40 dark:bg-teal-950/30 dark:text-teal-400",
  },
} as const;

type FallbackAction = keyof typeof FALLBACK_BUTTONS;

/** Order used when the server does not say which options are available. */
const DEFAULT_FALLBACK_ACTIONS: FallbackAction[] = [
  "book_appointment",
  "cancel_appointment",
  "document_request",
  "live_chat",
];

/**
 * The "I didn't understand" menu.
 *
 * Both the wording and which buttons appear come from the server, so an
 * administrator changing the fallback message or deactivating a scenario is
 * reflected here. The defaults reproduce the previous fixed menu, so an older
 * backend that sends neither still renders exactly as before.
 */
function FallbackMenuBubble({
  onBook,
  onCancel,
  onDocument,
  onLiveChat,
  disabled,
  message,
  options,
}: {
  onBook: () => void;
  onCancel: () => void;
  onDocument: () => void;
  onLiveChat: () => void;
  disabled: boolean;
  message?: string;
  options?: { action: string; label: string }[];
}) {
  const handlers: Record<FallbackAction, () => void> = {
    book_appointment: onBook,
    cancel_appointment: onCancel,
    document_request: onDocument,
    live_chat: onLiveChat,
  };

  const actions: FallbackAction[] =
    options && options.length > 0
      ? options
          .map((o) => o.action)
          .filter((a): a is FallbackAction => a in FALLBACK_BUTTONS)
      : DEFAULT_FALLBACK_ACTIONS;

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[90%] items-start gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-health text-white">
          <Bot className="h-4 w-4" />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm">
          <p className="mb-3 leading-relaxed text-foreground">
            {message ?? "Sorry, I couldn't understand your request. Please select one of the options below:"}
          </p>
          <div className="flex flex-col gap-2">
            {actions.map((action) => {
              const cfg = FALLBACK_BUTTONS[action];
              const Icon = cfg.icon;
              const label = options?.find((o) => o.action === action)?.label ?? cfg.label;

              return (
                <button
                  key={action}
                  onClick={handlers[action]}
                  disabled={disabled}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 ${cfg.className}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Waiting-for-secretary banner shown inline in the chat. */
function WaitingBanner() {
  return (
    <div className="ml-10 flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950/30">
      <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
      <div>
        <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">
          Please wait. A secretary will join the conversation shortly.
        </p>
        <p className="text-[11px] text-teal-600 dark:text-teal-500">
          You will be connected automatically when a secretary accepts your chat.
        </p>
      </div>
    </div>
  );
}

/** Banner shown when the secretary has closed the live chat. */
function ChatClosedBanner() {
  return (
    <div className="ml-10 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
      <CheckCircle2 className="h-5 w-5 text-gray-400" />
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Live chat session ended.
        </p>
        <p className="text-[11px] text-gray-500">
          The secretary has closed this conversation. You can continue using the AI assistant below.
        </p>
      </div>
    </div>
  );
}

/** Rich card shown for each bookable doctor. */
function DoctorCard({
  doctor,
  onSelect,
  disabled,
}: {
  doctor: Doctor;
  onSelect: (d: Doctor) => void;
  disabled: boolean;
}) {
  const bg = avatarBg(doctor.name);
  return (
    <button
      onClick={() => onSelect(doctor)}
      disabled={disabled}
      className="group w-full rounded-xl border border-border bg-card p-3 text-left shadow-soft transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-elevated disabled:pointer-events-none disabled:opacity-50"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${bg}`}
        >
          {initials(doctor.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
            {doctor.name}
          </p>
          <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {doctor.specialty}
          </span>
          {doctor.bio && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {doctor.bio}
            </p>
          )}
          {doctor.clinicName && (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              📍 {doctor.clinicName}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

/** Compact success card shown after an appointment is created. */
function AppointmentConfirmCard({
  doctorName,
  date,
  time,
}: {
  doctorName: string;
  date: string;
  time: string;
}) {
  return (
    <div className="ml-10 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white">
          <CalendarCheck className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Appointment Requested
        </p>
      </div>
      <div className="space-y-1 pl-9 text-sm text-emerald-700 dark:text-emerald-400">
        <p>
          <span className="font-medium">Doctor:</span> {doctorName}
        </p>
        <p>
          <span className="font-medium">Date:</span> {friendlyDate(date)}
        </p>
        <p>
          <span className="font-medium">Time:</span> {time}
        </p>
      </div>
      <p className="mt-3 pl-9 text-[11px] text-emerald-600 dark:text-emerald-500">
        Status is <strong>pending</strong> — you will be notified once the doctor confirms.
      </p>
    </div>
  );
}

/** Status badge for a cancellable appointment card. */
function StatusPill({ status }: { status: string }) {
  const styles =
    status === "confirmed"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  const label = status === "confirmed" ? "Confirmed" : "Pending";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}>
      {label}
    </span>
  );
}

/** Clickable appointment row shown during the cancellation selection step. */
function CancellableAppointmentCard({
  appointment,
  onSelect,
  disabled,
}: {
  appointment: Appointment;
  onSelect: (a: Appointment) => void;
  disabled: boolean;
}) {
  const bg = avatarBg(appointment.doctorName);
  return (
    <button
      onClick={() => onSelect(appointment)}
      disabled={disabled}
      className="group w-full rounded-xl border border-border bg-card p-3 text-left shadow-soft transition-all hover:border-rose-400/50 hover:bg-rose-50/50 hover:shadow-elevated disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-rose-950/20"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${bg}`}
        >
          {initials(appointment.doctorName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground group-hover:text-rose-600">
              {appointment.doctorName}
            </p>
            <StatusPill status={appointment.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {friendlyDate(appointment.date)} &middot; {appointment.time}
          </p>
          {appointment.specialty && (
            <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {appointment.specialty}
            </span>
          )}
        </div>
        <XCircle className="h-4 w-4 shrink-0 text-rose-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  );
}

/** Shown after the backend confirms the cancellation. */
function CancellationSuccessCard({
  doctorName,
  date,
  time,
}: {
  doctorName: string;
  date: string;
  time: string;
}) {
  return (
    <div className="ml-10 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/30">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-rose-500 text-white">
          <CalendarX2 className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Appointment Cancelled</p>
      </div>
      <div className="space-y-1 pl-9 text-sm text-rose-700 dark:text-rose-400">
        <p>
          <span className="font-medium">Doctor:</span> {doctorName}
        </p>
        <p>
          <span className="font-medium">Date:</span> {friendlyDate(date)}
        </p>
        <p>
          <span className="font-medium">Time:</span> {time}
        </p>
      </div>
      <p className="mt-3 pl-9 text-[11px] text-rose-600 dark:text-rose-500">
        The appointment has been cancelled. You can book a new one at any time.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document-request sub-components
// ---------------------------------------------------------------------------

/** Icon lookup for document types (falls back to FileText). */
const DOC_TYPE_ICONS: Record<string, string> = {
  medical_certificate:    "📋",
  prescription:           "💊",
  medical_report:         "📊",
  sick_leave_certificate: "🏥",
  laboratory_request:     "🧪",
  imaging_request:        "🩻",
  referral_letter:        "✉️",
  consultation_summary:   "📝",
  consultation_report:    "📄",
  other:                  "📁",
};

/** Clickable tile for one document type in the picker grid. */
function DocumentTypeCard({
  docKey,
  label,
  onSelect,
  disabled,
}: {
  docKey: string;
  label: string;
  onSelect: (key: string) => void;
  disabled: boolean;
}) {
  const icon = DOC_TYPE_ICONS[docKey] ?? "📄";
  return (
    <button
      onClick={() => onSelect(docKey)}
      disabled={disabled}
      className="group flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-soft transition-all hover:border-violet-400/50 hover:bg-violet-50/60 hover:shadow-elevated disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-violet-950/20"
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="text-xs font-medium text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300">
        {label}
      </span>
    </button>
  );
}

/** Shown after a new pending document request has been submitted. */
function DocumentRequestedCard({
  typeLabel,
  requestId,
}: {
  typeLabel: string;
  requestId: number;
}) {
  return (
    <div className="ml-10 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-violet-500 text-white">
          <FileText className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Request Submitted</p>
      </div>
      <div className="space-y-1 pl-9 text-sm text-violet-700 dark:text-violet-400">
        <p>
          <span className="font-medium">Document:</span> {typeLabel}
        </p>
        <p>
          <span className="font-medium">Request #:</span> {requestId}
        </p>
        <p>
          <span className="font-medium">Status:</span>{" "}
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            Pending Review
          </span>
        </p>
      </div>
      <p className="mt-3 pl-9 text-[11px] text-violet-600 dark:text-violet-500">
        The medical team will review and prepare your document. You will be notified when it is ready.
      </p>
    </div>
  );
}

/** Shown when a completed document is already available for download. */
function DocumentReadyCard({
  typeLabel,
  fileName,
  documentId,
}: {
  typeLabel: string;
  fileName: string;
  documentId: number;
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/documents/download?id=${documentId}`, {
        headers: { ...authHeader() },
      });
      if (!response.ok) throw new Error("Download failed.");
      const blob = await response.blob();
      const cd = response.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="?(.+?)"?$/i);
      const name = match?.[1] ?? fileName;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download the document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-10 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950/30">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-teal-500 text-white">
          <FileText className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">Document Available</p>
      </div>
      <div className="space-y-1 pl-9 text-sm text-teal-700 dark:text-teal-400">
        <p>
          <span className="font-medium">Type:</span> {typeLabel}
        </p>
        <p>
          <span className="font-medium">File:</span> {fileName}
        </p>
      </div>
      <div className="mt-3 pl-9">
        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {loading ? "Downloading…" : "Download"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live-chat state machine types
// ---------------------------------------------------------------------------

type LiveChatState =
  | null                                              // Not in live-chat mode
  | { phase: "starting" }                             // Starting (API call in progress)
  | { phase: "waiting"; chatId: number }              // Waiting for a secretary
  | { phase: "active"; chatId: number; secretaryName: string } // Secretary joined
  | { phase: "closed" };                              // Secretary ended the chat

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/** The single patient chat experience, shared by its legacy route and launcher. */
export function PatientAiChat({ compact = false }: PatientAiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I can help you book or cancel an appointment, request medical documents, or answer general clinic questions. How can I help today?",
      timestamp: nowTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  /**
   * The live booking state — non-null while we are in a multi-step flow.
   * Cleared only when nextAction returns to "message" AND there is no
   * pending-slot-taken retry.
   */
  const [booking, setBooking] = useState<AiChatResponse | null>(null);

  /**
   * When the slot the patient chose was just taken, we keep the previous
   * slot-picker state so they can try another slot without going back.
   */
  const [slotTakenState, setSlotTakenState] = useState<AiChatResponse | null>(null);

  /**
   * The live cancellation state — non-null while we are in a multi-step
   * cancellation flow (showing appointment list → inline confirmation).
   */
  const [cancellation, setCancellation] = useState<AiChatResponse | null>(null);

  /**
   * The appointment the patient clicked but has not yet confirmed cancelling.
   * Cleared when they either confirm or abort.
   */
  const [pendingCancelAppt, setPendingCancelAppt] = useState<Appointment | null>(null);

  /**
   * The live document-request flow state — non-null while showing the
   * type picker, a pending-request card, or a document-ready card.
   */
  const [docFlow, setDocFlow] = useState<AiChatResponse | null>(null);

  /**
   * Whether we should show the fallback service-selection menu in the chat.
   * Shown as a special bot bubble with four action buttons.
   */
  const [showFallbackMenu, setShowFallbackMenu] = useState(false);
  /** Wording and options for the fallback menu, as supplied by the server. */
  const [fallbackData, setFallbackData] = useState<{
    message: string;
    options?: { action: string; label: string }[];
  } | null>(null);

  /**
   * Live-chat state machine. null = AI mode; "starting/waiting/active/closed" = live-chat mode.
   */
  const [liveChat, setLiveChat] = useState<LiveChatState>(null);

  /**
   * Live-chat messages loaded from the backend while in active/waiting mode.
   */
  const [liveChatMessages, setLiveChatMessages] = useState<LiveChatMessage[]>([]);
  const [liveChatInput, setLiveChatInput] = useState("");
  const [isSendingLiveMsg, setIsSendingLiveMsg] = useState(false);

  /** ID of the last live-chat message we've seen (used for incremental polls). */
  const lastLiveMsgIdRef = useRef(0);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, booking, slotTakenState, cancellation, pendingCancelAppt, docFlow, liveChatMessages, liveChat]);

  // -------------------------------------------------------------------------
  // Live chat realtime
  //
  // The 3-second poll is gone. Messages and status changes arrive over the
  // WebSocket; the transcript is still loaded over HTTP when the chat opens.
  // -------------------------------------------------------------------------

  /** The conversation to watch, or null when not in live chat. */
  const liveChatId =
    liveChat && liveChat.phase !== "closed" && liveChat.phase !== "starting"
      ? (liveChat as { chatId: number }).chatId
      : null;

  const handleLiveMessage = useCallback((message: LiveChatMessage) => {
    setLiveChatMessages((prev) => {
      // The patient's own message was appended optimistically on send, and a
      // reconnect can redeliver — so never add the same id twice.
      if (prev.some((m) => m.id === message.id)) return prev;
      lastLiveMsgIdRef.current = Math.max(lastLiveMsgIdRef.current, message.id);
      return [...prev, message];
    });
  }, []);

  const handleLiveChatEvent = useCallback(
    (event: "accepted" | "closed") => {
      if (event === "accepted") {
        // Load the chat so the secretary's name is shown accurately, rather
        // than guessing it from the event payload.
        void liveChatService.myChat().then((chat) => {
          if (!chat) return;
          setLiveChat({
            phase: "active",
            chatId: chat.id,
            secretaryName: chat.secretaryName ?? "Secretary",
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `lc_joined_${Date.now()}`,
              role: "assistant",
              content: `${chat.secretaryName ?? "A secretary"} has joined the conversation.`,
              timestamp: nowTime(),
            },
          ]);
        });
        return;
      }

      setLiveChat({ phase: "closed" });
    },
    [],
  );

  const { status: liveSocketStatus } = useLiveChatSocket(
    liveChatId,
    handleLiveMessage,
    handleLiveChatEvent,
  );

  // -------------------------------------------------------------------------
  // Core send helpers (AI mode)
  // -------------------------------------------------------------------------

  const appendAssistant = (response: AiChatResponse) => {
    // Handle fallback menu — show the special bubble instead of plain text.
    // The bubble renders the server's message itself, so appending it here as
    // well would print the same sentence twice.
    if (response.nextAction === "show_fallback_menu") {
      setFallbackData({
        message: response.message,
        options: response.fallbackOptions,
      });
      setShowFallbackMenu(true);
      setBooking(null);
      setCancellation(null);
      setDocFlow(null);
      setSlotTakenState(null);
      setPendingCancelAppt(null);
      return;
    }

    setShowFallbackMenu(false);

    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}_assistant`,
        role: "assistant",
        content: response.message,
        timestamp: nowTime(),
      },
    ]);

    // Route to the right flow state.
    if (response.nextAction === "select_cancellation") {
      setCancellation(response);
      setBooking(null);
      setDocFlow(null);
    } else if (response.nextAction === "select_document_type") {
      setDocFlow(response);
      setBooking(null);
      setCancellation(null);
    } else if (response.nextAction === "message" && response.cancelled) {
      setCancellation(response);
      setBooking(null);
      setDocFlow(null);
    } else if (response.nextAction === "message" && (response.documentRequested || response.documentReady)) {
      setDocFlow(response);
      setBooking(null);
      setCancellation(null);
    } else {
      setCancellation(null);
      setDocFlow(null);
      setBooking(response);
    }
    setSlotTakenState(null);
    setPendingCancelAppt(null);
  };

  const sendToAssistant = async (
    content: string,
    request: Parameters<typeof aiChatService.send>[0],
  ) => {
    setShowFallbackMenu(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}_user`,
        role: "user",
        content,
        timestamp: nowTime(),
      },
    ]);
    // Clear both booking and slot-taken state at the start of a new user turn,
    // *unless* this turn IS the slot selection (we re-render on error).
    if (request.action !== "select_slot") {
      setBooking(null);
      setSlotTakenState(null);
    }
    // Always clear cancellation state when a new turn begins (other than
    // confirm_cancellation, which keeps the pending state until resolved).
    if (request.action !== "confirm_cancellation") {
      setCancellation(null);
      setPendingCancelAppt(null);
    }
    // Clear document flow for all new turns except within the flow itself.
    if (request.action !== "select_document_type") {
      setDocFlow(null);
    }
    setIsTyping(true);

    try {
      appendAssistant(await aiChatService.send(request));
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "I could not complete that request. Please try again.";
      const isSlotTaken =
        error instanceof AiChatError && error.code === "SLOT_TAKEN";

      setMessages((prev) => [
        ...prev,
        {
          id: `m${Date.now()}_error`,
          role: "assistant",
          content: msg,
          timestamp: nowTime(),
        },
      ]);

      // On a slot-taken race, keep (or restore) the slot picker so the patient
      // can pick a different time without having to go back to doctor selection.
      if (isSlotTaken && booking?.nextAction === "select_slot") {
        setSlotTakenState(booking);
      } else {
        setSlotTakenState(null);
      }
    } finally {
      setIsTyping(false);
    }
  };

  // -------------------------------------------------------------------------
  // Action handlers (AI mode)
  // -------------------------------------------------------------------------

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const message = input.trim();
    setInput("");
    await sendToAssistant(message, { action: "message", message });
  };

  const handleBookButton = async () => {
    if (isTyping) return;
    setShowFallbackMenu(false);
    await sendToAssistant("I'd like to book an appointment.", { action: "start_booking" });
  };

  const handleCancelButton = async () => {
    if (isTyping) return;
    setShowFallbackMenu(false);
    await sendToAssistant("I'd like to cancel an appointment.", { action: "start_cancellation" });
  };

  const handleDoctorSelect = async (doctor: Doctor) => {
    if (isTyping) return;
    await sendToAssistant(`I choose ${doctor.name}.`, {
      action: "select_doctor",
      doctorId: doctor.id,
    });
  };

  const handleSlotSelect = async (date: string, time: string) => {
    if (isTyping || !booking?.doctor) return;
    await sendToAssistant(`I choose ${friendlyDate(date)} at ${time}.`, {
      action: "select_slot",
      doctorId: booking.doctor.id,
      date,
      time,
    });
  };

  /**
   * Patient clicked an appointment card — store it and show the inline
   * confirmation prompt. No backend call yet.
   */
  const handleAppointmentSelect = (appt: Appointment) => {
    if (isTyping) return;
    setPendingCancelAppt(appt);
  };

  /** Patient confirmed — send the cancellation to the backend. */
  const handleCancelConfirm = async () => {
    if (!pendingCancelAppt || isTyping) return;
    const appt = pendingCancelAppt;
    await sendToAssistant(
      `Yes, please cancel my appointment with ${appt.doctorName} on ${friendlyDate(appt.date)} at ${appt.time}.`,
      { action: "confirm_cancellation", appointmentId: appt.id },
    );
  };

  /** Patient chose to keep their appointment — just clear the pending state. */
  const handleCancelAbort = () => {
    setPendingCancelAppt(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}_assistant`,
        role: "assistant",
        content: "No problem — your appointment has been kept.",
        timestamp: nowTime(),
      },
    ]);
  };

  const handleDocumentButton = async () => {
    if (isTyping) return;
    setShowFallbackMenu(false);
    await sendToAssistant("I need a medical document.", { action: "start_document_request" });
  };

  const handleDocumentTypeSelect = async (key: string) => {
    if (isTyping) return;
    const label = docFlow?.documentTypes?.find((t) => t.key === key)?.label ?? key;
    await sendToAssistant(`I need a ${label}.`, { action: "select_document_type", documentType: key });
  };

  // -------------------------------------------------------------------------
  // Live-chat handlers
  // -------------------------------------------------------------------------

  const handleStartLiveChat = async () => {
    if (isTyping) return;
    setShowFallbackMenu(false);
    setLiveChat({ phase: "starting" });
    setLiveChatMessages([]);
    lastLiveMsgIdRef.current = 0;

    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}_user`,
        role: "user",
        content: "I'd like to chat with a secretary.",
        timestamp: nowTime(),
      },
    ]);

    try {
      const chat = await liveChatService.start();
      if (chat.status === "active") {
        // Rare case: secretary already waiting and accepted instantly
        setLiveChat({
          phase: "active",
          chatId: chat.id,
          secretaryName: chat.secretaryName ?? "Secretary",
        });
        // Load existing messages
        const msgRes = await liveChatService.messages(chat.id, 0);
        if (msgRes.messages.length > 0) {
          setLiveChatMessages(msgRes.messages);
          lastLiveMsgIdRef.current = msgRes.messages[msgRes.messages.length - 1]!.id;
        }
      } else {
        setLiveChat({ phase: "waiting", chatId: chat.id });
      }
    } catch (err) {
      setLiveChat(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `m${Date.now()}_error`,
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Could not start live chat. Please try again.",
          timestamp: nowTime(),
        },
      ]);
    }
  };

  const handleSendLiveMessage = async () => {
    if (!liveChatInput.trim() || isSendingLiveMsg) return;
    if (liveChat?.phase !== "active") return;

    const content = liveChatInput.trim();
    setLiveChatInput("");
    setIsSendingLiveMsg(true);

    try {
      const msg = await liveChatService.sendMessage(liveChat.chatId, content);
      setLiveChatMessages((prev) => [...prev, msg]);
      lastLiveMsgIdRef.current = msg.id;
    } catch {
      // Restore input on failure
      setLiveChatInput(content);
    } finally {
      setIsSendingLiveMsg(false);
    }
  };

  const handleReturnToAiChat = () => {
    setLiveChat(null);
    setLiveChatMessages([]);
    lastLiveMsgIdRef.current = 0;
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}_assistant`,
        role: "assistant",
        content: "You're back in the AI assistant. How can I help you?",
        timestamp: nowTime(),
      },
    ]);
  };

  // -------------------------------------------------------------------------
  // Derived rendering state
  // -------------------------------------------------------------------------

  /** Which booking state to render interactive widgets for. */
  const activeBooking = slotTakenState ?? booking;

  const showDoctorPicker =
    activeBooking?.nextAction === "select_doctor" && activeBooking.doctors != null;
  const showSlotPicker =
    (slotTakenState != null || activeBooking?.nextAction === "select_slot") &&
    activeBooking?.days != null;
  const showConfirmCard =
    booking?.nextAction === "message" && booking.appointment != null && slotTakenState == null && !booking.cancelled;

  // Cancellation-flow derived state.
  const showCancellationPicker =
    cancellation?.nextAction === "select_cancellation" &&
    (cancellation.cancellableAppointments?.length ?? 0) > 0 &&
    pendingCancelAppt === null;
  const showCancellationSuccessCard =
    cancellation?.nextAction === "message" && cancellation.cancelled === true && cancellation.appointment != null;

  // Document-request-flow derived state.
  const showDocumentTypePicker =
    docFlow?.nextAction === "select_document_type" &&
    (docFlow.documentTypes?.length ?? 0) > 0;
  const showDocumentRequestedCard =
    docFlow?.nextAction === "message" && docFlow.documentRequested === true && docFlow.documentRequest != null;
  const showDocumentReadyCard =
    docFlow?.nextAction === "message" && docFlow.documentReady === true && docFlow.documentAvailable != null;

  // Show quick-action buttons only when no flow is active and not in live-chat mode.
  const showBookButton =
    messages.length <= 2 &&
    !isTyping &&
    booking === null &&
    cancellation === null &&
    docFlow === null &&
    slotTakenState === null &&
    liveChat === null &&
    !showFallbackMenu;

  const showCancelButton   = showBookButton;
  const showDocumentButton = showBookButton;

  // Whether the normal AI text input is available.
  const inLiveChatMode = liveChat !== null && liveChat.phase !== "starting";

  /**
   * Reaching a secretary must never depend on the assistant failing to
   * understand. The fallback menu only appears when Gemini gives up, so on its
   * own it left a patient with a well-answered question no way through. This
   * offers live chat at all times, except while a live chat is already
   * starting, waiting or running (the closed state has its own "Return to AI
   * Assistant" button, after which this reappears).
   */
  const showLiveChatEntry = liveChat === null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={compact ? "" : "space-y-6"}>
      {/* ---- Page heading (full-page mode only) ---- */}
      {!compact && (
        <>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-health text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">AI Medical Assistant</h1>
              <p className="text-xs text-muted-foreground">Ask me anything about your health</p>
            </div>
          </div>

          {messages.length <= 1 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Suggested questions
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ---- Chat card ---- */}
      <div className={`rounded-2xl border border-border bg-card shadow-soft ${compact ? "" : "mt-6"}`}>
        {/* Message list */}
        <div
          className={`${
            compact ? "h-[min(52vh,420px)]" : "h-[400px]"
          } space-y-3 overflow-y-auto p-4`}
        >
          {/* AI chat messages */}
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}

          {/* Fallback service-selection menu */}
          {showFallbackMenu && (
            <FallbackMenuBubble
              onBook={handleBookButton}
              onCancel={handleCancelButton}
              onDocument={handleDocumentButton}
              onLiveChat={handleStartLiveChat}
              disabled={isTyping}
              message={fallbackData?.message}
              options={fallbackData?.options}
            />
          )}

          {/* Quick-action buttons: Book / Cancel / Document */}
          {(showBookButton || showCancelButton || showDocumentButton) && (
            <div className="flex flex-wrap justify-start gap-2 pl-10">
              {showBookButton && (
                <button
                  onClick={handleBookButton}
                  className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary shadow-soft transition-all hover:border-primary/60 hover:bg-primary/10 hover:shadow-elevated"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Book an Appointment
                </button>
              )}
              {showCancelButton && (
                <button
                  onClick={handleCancelButton}
                  className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-2.5 text-sm font-medium text-rose-600 shadow-soft transition-all hover:border-rose-400/70 hover:bg-rose-100/70 hover:shadow-elevated dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/40"
                >
                  <CalendarX2 className="h-4 w-4" />
                  Cancel an Appointment
                </button>
              )}
              {showDocumentButton && (
                <button
                  onClick={handleDocumentButton}
                  className="flex items-center gap-2 rounded-xl border border-violet-300/50 bg-violet-50/60 px-4 py-2.5 text-sm font-medium text-violet-600 shadow-soft transition-all hover:border-violet-400/70 hover:bg-violet-100/70 hover:shadow-elevated dark:border-violet-700/40 dark:bg-violet-950/30 dark:text-violet-400 dark:hover:bg-violet-900/40"
                >
                  <FileText className="h-4 w-4" />
                  Request a Document
                </button>
              )}
            </div>
          )}

          {/* Doctor selection */}
          {showDoctorPicker && (
            <div className="ml-10 rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Available doctors — click to select
              </p>
              <div className="space-y-2">
                {activeBooking!.doctors!.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    onSelect={handleDoctorSelect}
                    disabled={isTyping}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Time-slot selection */}
          {showSlotPicker && (
            <div className="ml-10 space-y-4 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Available dates and times — click to book
              </p>
              {activeBooking!.days!.map((day) => (
                <div key={day.date}>
                  <p className="mb-2 text-sm font-semibold">{friendlyDate(day.date)}</p>
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => (
                      <Button
                        key={slot.start}
                        size="sm"
                        variant="outline"
                        onClick={() => handleSlotSelect(day.date, slot.start)}
                        disabled={isTyping}
                        className="h-8 rounded-lg px-3 text-xs font-medium hover:border-primary/50 hover:bg-primary/5"
                      >
                        {slot.start}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cancellation — appointment picker */}
          {showCancellationPicker && (
            <div className="ml-10 rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Your cancellable appointments — click one to cancel
              </p>
              <div className="space-y-2">
                {cancellation!.cancellableAppointments!.map((appt) => (
                  <CancellableAppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onSelect={handleAppointmentSelect}
                    disabled={isTyping}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cancellation — inline confirmation prompt */}
          {pendingCancelAppt !== null && (
            <div className="ml-10 rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-800 dark:bg-rose-950/20">
              <p className="mb-1 text-sm font-semibold text-rose-800 dark:text-rose-300">
                Are you sure you want to cancel this appointment?
              </p>
              <p className="mb-4 text-xs text-rose-700 dark:text-rose-400">
                {pendingCancelAppt.doctorName} &middot; {friendlyDate(pendingCancelAppt.date)} at{" "}
                {pendingCancelAppt.time}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelConfirm}
                  disabled={isTyping}
                  className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
                >
                  Yes, cancel it
                </button>
                <button
                  onClick={handleCancelAbort}
                  disabled={isTyping}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}

          {/* Cancellation — success card */}
          {showCancellationSuccessCard && (
            <CancellationSuccessCard
              doctorName={cancellation!.appointment!.doctorName}
              date={cancellation!.appointment!.date}
              time={cancellation!.appointment!.time}
            />
          )}

          {/* Document — type picker */}
          {showDocumentTypePicker && (
            <div className="ml-10 rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Select the document you need
              </p>
              <div className="grid grid-cols-2 gap-2">
                {docFlow!.documentTypes!.map((t) => (
                  <DocumentTypeCard
                    key={t.key}
                    docKey={t.key}
                    label={t.label}
                    onSelect={handleDocumentTypeSelect}
                    disabled={isTyping}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Document — pending request submitted */}
          {showDocumentRequestedCard && (
            <DocumentRequestedCard
              typeLabel={docFlow!.documentRequest!.documentTypeLabel}
              requestId={docFlow!.documentRequest!.id}
            />
          )}

          {/* Document — existing doc ready for download */}
          {showDocumentReadyCard && (
            <DocumentReadyCard
              typeLabel={docFlow!.documentAvailable!.documentTypeLabel}
              fileName={docFlow!.documentAvailable!.fileName}
              documentId={docFlow!.documentAvailable!.id}
            />
          )}

          {/* Booking — appointment confirmation card */}
          {showConfirmCard && (
            <AppointmentConfirmCard
              doctorName={booking!.appointment!.doctorName}
              date={booking!.appointment!.date}
              time={booking!.appointment!.time}
            />
          )}

          {/* ----------------------------------------------------------------- */}
          {/* Live-chat area                                                     */}
          {/* ----------------------------------------------------------------- */}

          {/* Starting spinner */}
          {liveChat?.phase === "starting" && (
            <div className="flex items-center gap-2 pl-10">
              <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
              <span className="text-xs text-muted-foreground">Connecting to secretary…</span>
            </div>
          )}

          {/* Waiting banner */}
          {liveChat?.phase === "waiting" && <WaitingBanner />}

          {/* Active live-chat messages */}
          {(liveChat?.phase === "active" || (liveChat?.phase === "closed" && liveChatMessages.length > 0)) &&
            liveChatMessages.map((msg) => <LiveChatBubble key={msg.id} msg={msg} />)}

          {/* Chat closed banner */}
          {liveChat?.phase === "closed" && (
            <>
              <ChatClosedBanner />
              <div className="pl-10">
                <button
                  onClick={handleReturnToAiChat}
                  className="mt-1 rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Return to AI Assistant
                </button>
              </div>
            </>
          )}

          {/* Typing indicator (AI mode) */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-health text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-border p-4">
          {/* Live-chat input (active state) */}
          {liveChat?.phase === "active" && (
            <>
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-teal-50 px-3 py-1.5 dark:bg-teal-950/30">
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-teal-500" />
                  <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
                    Live chat with {liveChat.secretaryName}
                  </span>
                </span>
                <ConnectionStatus status={liveSocketStatus} />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={liveChatInput}
                  onChange={(e) => setLiveChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendLiveMessage()}
                  placeholder="Type a message to the secretary…"
                  className="h-11 rounded-xl"
                  disabled={isSendingLiveMsg}
                />
                <button
                  aria-label="Send message to secretary"
                  onClick={handleSendLiveMessage}
                  disabled={!liveChatInput.trim() || isSendingLiveMsg}
                  className="grid h-11 w-11 place-items-center rounded-xl bg-teal-500 text-white shadow-soft disabled:opacity-50 hover:bg-teal-600 transition-colors"
                >
                  {isSendingLiveMsg ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </>
          )}

          {/* Waiting state — no input */}
          {liveChat?.phase === "waiting" && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Waiting for a secretary to accept your chat…
              </span>
            </div>
          )}

          {/* Closed / starting states — no input, handled by buttons above */}
          {liveChat?.phase === "starting" && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Connecting…</span>
            </div>
          )}

          {/* Always-available route to a secretary — never gated on what the
              assistant did or did not understand. */}
          {showLiveChatEntry && (
            <button
              onClick={handleStartLiveChat}
              disabled={isTyping}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-300/50 bg-teal-50/60 px-4 py-2.5 text-sm font-medium text-teal-600 transition-colors hover:border-teal-400/70 hover:bg-teal-100/70 disabled:opacity-50 dark:border-teal-700/40 dark:bg-teal-950/30 dark:text-teal-400 dark:hover:bg-teal-900/40"
            >
              <MessageCircle className="h-4 w-4" />
              Live Chat with Secretary
            </button>
          )}

          {/* Normal AI input */}
          {!inLiveChatMode && liveChat?.phase !== "closed" && (
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your question…"
                className="h-11 rounded-xl"
              />
              <button
                aria-label="Send message"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-white shadow-soft disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}

          {liveChat?.phase !== "closed" && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {inLiveChatMode
                ? "You are now in a live session with a secretary."
                : "This AI assistant provides general information only, not medical advice."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
