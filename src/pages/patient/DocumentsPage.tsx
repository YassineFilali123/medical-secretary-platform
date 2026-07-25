import { useState, useMemo } from "react";
import { FileText, Pill, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { patientService } from "@/services/patient";

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "report" | "prescription">("all");

  const documents = useMemo(() => patientService.getDocuments(), []);

  const filtered = useMemo(() => {
    let result = documents;
    if (typeFilter !== "all") result = result.filter((d) => d.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(q) || d.doctorName.toLowerCase().includes(q));
    }
    return result;
  }, [documents, search, typeFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Medical Documents</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search documents..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="all">All Types</option>
          <option value="report">Medical Reports</option>
          <option value="prescription">Prescriptions</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No documents found.</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <div key={doc.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-elevated">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${
                    doc.type === "report" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {doc.type === "report" ? <FileText className="h-5 w-5" /> : <Pill className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{doc.title}</div>
                    <div className="text-xs text-muted-foreground">{doc.doctorName} &middot; {doc.date}</div>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  doc.type === "report" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                }`}>{doc.type === "report" ? "Report" : "Prescription"}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{doc.description}</p>
              <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Download className="h-3 w-3" /> Download PDF
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
