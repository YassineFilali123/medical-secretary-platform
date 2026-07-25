import { useNavigate } from "react-router-dom";
import { Bot, MessageSquarePlus, History, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiAssistantService } from "@/services/ai-assistant";
import { QuickActionCards, SuggestedQuestions } from "@/components/ai-assistant";
import { ROUTES } from "@/constants/routes";

export default function AiAssistantHomePage() {
  const navigate = useNavigate();
  const conversations = aiAssistantService.getConversations().slice(0, 5);

  const handleStartChat = (prompt: string) => {
    const conv = aiAssistantService.createConversation(prompt);
    navigate(`${ROUTES.AI_ASSISTANT_CHAT}/${conv.id}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Medical Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Your intelligent health companion, available 24/7
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => navigate(ROUTES.AI_ASSISTANT_HISTORY)}
          >
            <History className="mr-1 h-4 w-4" /> History
          </Button>
          <Button
            className="rounded-xl bg-gradient-primary text-white shadow-soft"
            onClick={() => navigate(ROUTES.AI_ASSISTANT_CHAT)}
          >
            <MessageSquarePlus className="mr-1 h-4 w-4" /> New Chat
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gradient-health shadow-elevated">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">
            How can I help you today?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask about appointments, doctors, symptoms, or medical services.
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold tracking-tight">Quick Actions</h3>
        <QuickActionCards
          actions={aiAssistantService.QUICK_ACTIONS}
          onSelect={handleStartChat}
        />
      </div>

      <div>
        <SuggestedQuestions
          questions={aiAssistantService.SUGGESTED_QUESTIONS}
          onSelect={handleStartChat}
        />
      </div>

      {conversations.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">Recent Conversations</h3>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => navigate(ROUTES.AI_ASSISTANT_HISTORY)}
            >
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`${ROUTES.AI_ASSISTANT_CHAT}/${c.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-elevated"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-soft">
                  <MessageSquarePlus className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.messages.length} messages ·{" "}
                    {new Date(c.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
