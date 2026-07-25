import { Bot } from "lucide-react";
import { QuickActionCards } from "./QuickActionCards";
import { SuggestedQuestions } from "./SuggestedQuestions";
import type { QuickAction } from "@/types/ai-assistant";

type EmptyChatStateProps = {
  quickActions: QuickAction[];
  suggestedQuestions: string[];
  onSelectAction: (prompt: string) => void;
  onSelectQuestion: (question: string) => void;
};

export function EmptyChatState({
  quickActions,
  suggestedQuestions,
  onSelectAction,
  onSelectQuestion,
}: EmptyChatStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-health shadow-elevated">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            MediSecretary AI Assistant
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask me anything about appointments, doctors, medical services, or health guidance.
          </p>
        </div>

        <QuickActionCards actions={quickActions} onSelect={onSelectAction} />

        <SuggestedQuestions questions={suggestedQuestions} onSelect={onSelectQuestion} />
      </div>
    </div>
  );
}
