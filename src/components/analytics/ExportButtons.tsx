import { Download, FileText, Printer } from "lucide-react";
import { analyticsService } from "@/services/analytics";

type ExportButtonsProps = {
  onExport?: (type: "excel" | "pdf" | "print") => void;
  /**
   * Perform the export instead of the placeholder behaviour.
   *
   * The original implementation only ever showed an alert. Callers that pass
   * this do the real work themselves; callers that don't keep the old
   * behaviour, so the existing analytics pages are untouched.
   */
  handlers?: Partial<Record<"excel" | "pdf" | "print", () => void>>;
};

export function ExportButtons({ onExport, handlers }: ExportButtonsProps) {
  function handleExport(type: "excel" | "pdf" | "print") {
    onExport?.(type);

    const handler = handlers?.[type];
    if (handler) {
      handler();
      return;
    }

    const filename = analyticsService.getExportData(type);
    if (type === "print") {
      window.print();
      return;
    }
    alert(`${type.toUpperCase()} export ready: ${filename} (placeholder)`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleExport("excel")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
      >
        <Download className="h-3.5 w-3.5" />
        Export Excel
      </button>
      <button
        onClick={() => handleExport("pdf")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
      >
        <FileText className="h-3.5 w-3.5" />
        Export PDF
      </button>
      <button
        onClick={() => handleExport("print")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
      >
        <Printer className="h-3.5 w-3.5" />
        Print Report
      </button>
    </div>
  );
}
