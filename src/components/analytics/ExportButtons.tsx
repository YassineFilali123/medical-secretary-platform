import { Download, FileText, Printer } from "lucide-react";

type ExportKind = "excel" | "pdf" | "print";

type ExportButtonsProps = {
  onExport?: (type: ExportKind) => void;
  /** Performs the export. Anything without a handler is simply not offered. */
  handlers?: Partial<Record<ExportKind, () => void>>;
};

const BUTTONS: Array<{ kind: ExportKind; label: string; Icon: typeof Download }> = [
  { kind: "excel", label: "Export Excel", Icon: Download },
  { kind: "pdf", label: "Export PDF", Icon: FileText },
  { kind: "print", label: "Print Report", Icon: Printer },
];

export function ExportButtons({ onExport, handlers }: ExportButtonsProps) {
  const available = BUTTONS.filter(({ kind }) => handlers?.[kind] ?? onExport);

  return (
    <div className="flex items-center gap-2">
      {available.map(({ kind, label, Icon }) => (
        <button
          key={kind}
          onClick={() => {
            onExport?.(kind);
            handlers?.[kind]?.();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
