import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { patientService } from "@/services/patient";
import type { ChatMessage } from "@/types/patient";

const SUGGESTED_QUESTIONS = [
  "What are the side effects of my medication?",
  "When should I schedule my next checkup?",
  "Can you explain my lab results?",
  "How can I manage my blood pressure?",
];

const MOCK_RESPONSES = [
  "That's a great question! Based on your medical history, I'd recommend discussing this with your doctor at your next appointment. Would you like me to help you schedule one?",
  "I understand your concern. Here's what I can tell you based on general medical guidelines... However, please remember that this is not a substitute for professional medical advice.",
  "Let me check your records. From your last visit, your vital signs were stable. I'd suggest maintaining your current routine and following up as scheduled.",
  "Good question! Here are some general tips that might help: 1) Stay consistent with your medication schedule. 2) Keep a symptom diary. 3) Don't hesitate to reach out to your doctor if anything changes.",
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

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => patientService.getChatHistory());
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

    const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)] ?? "I'll look into that for you. Please give me a moment.";
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
          <h1 className="text-xl font-semibold tracking-tight">AI Medical Assistant</h1>
          <p className="text-xs text-muted-foreground">Ask me anything about your health</p>
        </div>
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Suggested questions
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
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

      {/* Chat area */}
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
              aria-label="Send message"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-white shadow-soft disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">This AI assistant provides general information only, not medical advice.</p>
        </div>
      </div>
    </div>
  );
}
