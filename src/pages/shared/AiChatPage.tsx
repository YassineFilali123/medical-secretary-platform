import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessage } from "@/types/patient";

const ROLE_GREETINGS: Record<string, string> = {
  admin: "Ask me anything about system settings, user management, or platform configuration.",
  doctor: "Ask me about patient cases, medical guidelines, or your schedule.",
  secretary: "Ask me about appointment management, patient queue, or call handling.",
  patient: "Ask me about your appointments, medications, or health questions.",
};

const ROLE_QUESTIONS: Record<string, string[]> = {
  admin: [
    "How do I configure AI parameters?",
    "How can I manage user roles?",
    "Show me recent activity logs",
  ],
  doctor: [
    "Summarize my patient queue",
    "What are today's appointments?",
    "Check medication interactions",
  ],
  secretary: [
    "How do I manage the patient queue?",
    "What's the appointment process?",
    "Handle an emergency case",
  ],
  patient: [
    "When is my next appointment?",
    "How do I reschedule?",
    "Tell me about my medications",
  ],
};

const MOCK_RESPONSES = [
  "I'd be happy to help you with that! Based on the available information, here's what I can tell you...",
  "Great question! Let me look into that for you. In the meantime, here are some helpful resources...",
  "I understand what you're looking for. Here's a step-by-step guide that should help...",
  "Let me check the system for you. Based on current data, here's what I found...",
  "That's a common question! Here's the information you need...",
];

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-start gap-2 max-w-[80%] ${isUser ? "flex-row-reverse" : ""}`}>
        <div className={`grid h-8 w-8 place-items-center rounded-full shrink-0 ${
          isUser ? "bg-gradient-primary text-white" : "bg-gradient-health text-white"
        }`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        <div className={`rounded-2xl px-4 py-2.5 text-sm ${
          isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
        }`}>
          {message.content}
        </div>
      </div>
    </div>
  );
}

export default function AiChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const role = user?.role ?? "patient";
  const greeting = ROLE_GREETINGS[role] ?? "";
  const suggestedQuestions = ROLE_QUESTIONS[role] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `m${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

    const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)] ?? "Let me look into that for you. Please give me a moment.";
    const aiMsg: ChatMessage = {
      id: `m${Date.now()}`,
      role: "assistant",
      content: response,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-health text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AI Chat</h1>
          <p className="text-xs text-muted-foreground">{greeting}</p>
        </div>
      </div>

      {messages.length === 0 && !isTyping && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Suggested questions
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="h-[400px] overflow-y-auto p-4 space-y-3">
          {messages.map((m) => <ChatBubble key={m.id} message={m} />)}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-health text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your question..."
              className="h-11 rounded-xl"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-white shadow-soft disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">AI responses are for guidance only. Always verify critical information through official channels.</p>
        </div>
      </div>
    </div>
  );
}
