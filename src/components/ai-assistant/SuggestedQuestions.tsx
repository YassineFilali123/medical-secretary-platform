import { Sparkles } from "lucide-react";

type SuggestedQuestionsProps = {
  questions: string[];
  onSelect: (question: string) => void;
};

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span>Suggested questions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-full border border-border bg-card px-4 py-2 text-left text-sm text-foreground shadow-soft transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-elevated"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
