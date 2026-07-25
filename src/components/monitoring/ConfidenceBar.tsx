type ConfidenceBarProps = {
  score: number;
  showLabel?: boolean;
};

export function ConfidenceBar({ score, showLabel = true }: ConfidenceBarProps) {
  const color =
    score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  const textColor =
    score >= 80 ? "text-green-700" : score >= 60 ? "text-amber-700" : "text-red-700";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-semibold ${textColor}`}>{score}%</span>
      )}
    </div>
  );
}
