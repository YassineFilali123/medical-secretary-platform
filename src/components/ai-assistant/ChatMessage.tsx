import { useState } from "react";
import { Copy, Check, RotateCcw, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/types/ai-assistant";

type ChatMessageProps = {
  message: Message;
  onRegenerate?: () => void;
  isLatest?: boolean;
};

export function ChatMessage({ message, onRegenerate, isLatest }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const renderContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <li key={i} className="ml-4 list-disc text-sm">
            {renderInline(line.slice(2))}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, "");
        const num = line.match(/^(\d+)\./)?.[1];
        return (
          <li key={i} className="ml-4 list-decimal text-sm">
            {num}. {renderInline(content)}
          </li>
        );
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={i} className="mt-2 text-sm font-semibold">
            {line.replace(/\*\*/g, "")}
          </p>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <p key={i} className="text-sm">
          {renderInline(line)}
        </p>
      );
    });
  };

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold">
            {part.replace(/\*\*/g, "")}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className={`group flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-health text-white">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={`flex max-w-[75%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card shadow-soft"
          }`}
        >
          <div className="space-y-0.5">{renderContent(message.content)}</div>
        </div>

        <div className="mt-1 flex items-center gap-2 px-1">
          <span className="text-[11px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            {!isUser && isLatest && onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRegenerate}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-white">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
