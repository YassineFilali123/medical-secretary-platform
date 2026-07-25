type LiveIndicatorProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
};

export function LiveIndicator({ size = "md", label }: LiveIndicatorProps) {
  const sizes = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75 ${sizes[size]}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 ${sizes[size]}`} />
      </span>
      {label && <span className="text-xs font-medium text-green-700">{label}</span>}
    </span>
  );
}
