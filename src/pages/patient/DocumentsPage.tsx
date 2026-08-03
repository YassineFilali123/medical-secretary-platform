import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  FileCheck,
  Download,
  Eye,
  Search,
  File,
  FileImage,
  FileType,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type PatientDocument,
  type DocumentRequest,
  type DocumentType,
  type DocumentRequestStatus,
  DOCUMENT_TYPE_LABELS,
  documentRequestService,
  formatFileSize,
} from "@/services/document";

// ── Document type helpers ────────────────────────────────────

const DOCUMENT_TYPES = Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][];

const TYPE_ICON: Record<string, typeof FileText> = {
  prescription: FileType,
  medical_report: FileText,
  laboratory_request: FileImage,
  imaging_request: FileImage,
  consultation_report: Stethoscope,
};

function getDocIcon(type: DocumentType, mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  return TYPE_ICON[type] ?? File;
}

function getDocColor(type: DocumentType): { bg: string; fg: string } {
  const colors: Record<DocumentType, { bg: string; fg: string }> = {
    medical_certificate: { bg: "bg-blue-100", fg: "text-blue-700" },
    prescription: { bg: "bg-purple-100", fg: "text-purple-700" },
    medical_report: { bg: "bg-emerald-100", fg: "text-emerald-700" },
    sick_leave_certificate: { bg: "bg-amber-100", fg: "text-amber-700" },
    laboratory_request: { bg: "bg-rose-100", fg: "text-rose-700" },
    imaging_request: { bg: "bg-cyan-100", fg: "text-cyan-700" },
    referral_letter: { bg: "bg-indigo-100", fg: "text-indigo-700" },
    consultation_summary: { bg: "bg-orange-100", fg: "text-orange-700" },
    consultation_report: { bg: "bg-teal-100", fg: "text-teal-700" },
    other: { bg: "bg-gray-100", fg: "text-gray-700" },
  };
  return colors[type];
}

// ── Request status helpers ───────────────────────────────────

const STATUS_CONFIG: Record<
  DocumentRequestStatus,
  { icon: typeof Clock; label: string; color: string; bg: string }
> = {
  pending: { icon: Clock, label: "Pending", color: "text-amber-600", bg: "bg-amber-100" },
  approved: { icon: CheckCircle2, label: "Approved", color: "text-blue-600", bg: "bg-blue-100" },
  uploaded: { icon: Upload, label: "Uploaded", color: "text-purple-600", bg: "bg-purple-100" },
  completed: { icon: FileCheck, label: "Completed", color: "text-emerald-600", bg: "bg-emerald-100" },
  rejected: { icon: XCircle, label: "Rejected", color: "text-red-600", bg: "bg-red-100" },
};

// ── Tab types ────────────────────────────────────────────────

type Tab = "request" | "documents";

// ═════════════════════════════════════════════════════════════
// DocumentsPage — single page with two tabs
// ═════════════════════════════════════════════════════════════

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("request");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
        <button
          onClick={() => setActiveTab("request")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "request"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus className="mr-1.5 inline h-4 w-4" /> Request Document
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "documents"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="mr-1.5 inline h-4 w-4" /> My Documents
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "request" ? <RequestTab /> : <DocumentsTab />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 1 — Request Document
// ═════════════════════════════════════════════════════════════

function RequestTab() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("medical_certificate");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const data = await documentRequestService.list();
      setRequests(data.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await documentRequestService.create({
        documentType: docType,
        note: note.trim() || undefined,
      });
      setShowForm(false);
      setNote("");
      setDocType("medical_certificate");
      await loadRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* New Request Button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="gap-1.5 rounded-xl">
          <Plus className="h-4 w-4" /> New Document Request
        </Button>
      )}

      {/* Request Form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-base font-semibold">New Document Request</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Document Type *</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {DOCUMENT_TYPES.filter(([v]) => v !== "consultation_report").map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Additional Note <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Provide any details or context for your request..."
                maxLength={1000}
                rows={3}
                className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground/50">{note.length}/1000</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl">
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setNote("");
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
        </div>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            You haven't requested any documents yet.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Click "New Document Request" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const statusCfg = STATUS_CONFIG[req.status];
            const StatusIcon = statusCfg.icon;
            return (
              <div
                key={req.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-elevated"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{req.documentTypeLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        Requested{" "}
                        {new Date(req.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusCfg.bg} ${statusCfg.color}`}
                  >
                    <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                  </span>
                </div>
                {req.note && (
                  <p className="mt-3 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                    {req.note}
                  </p>
                )}
                {req.secretaryMessage && (
                  <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-700">
                    Secretary: {req.secretaryMessage}
                  </p>
                )}
                {req.rejectionReason && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                    Reason: {req.rejectionReason}
                  </p>
                )}
                {req.document && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
                    <FileCheck className="h-3.5 w-3.5" />
                    <span className="font-medium">{req.document.fileName}</span>
                    <span className="text-muted-foreground">
                      — uploaded {new Date(req.document.uploadDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 2 — My Documents
// ═════════════════════════════════════════════════════════════

function DocumentsTab() {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [downloading, setDownloading] = useState<number | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await documentRequestService.myDocuments();
      setDocuments(data.documents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filtered = documents.filter((doc) => {
    if (typeFilter !== "all" && doc.documentType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        doc.fileName.toLowerCase().includes(q) ||
        (DOCUMENT_TYPE_LABELS[doc.documentType] ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDownload = async (docId: number, fileName: string) => {
    setDownloading(docId);
    try {
      const { blob } = await documentRequestService.download(docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(null);
    }
  };

  const handleView = async (docId: number) => {
    try {
      const { blob } = await documentRequestService.download(docId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open document.");
    }
  };

  const uniqueTypes = [...new Set(documents.map((d) => d.documentType))];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Types</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>
              {DOCUMENT_TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No documents found.</p>
          <p className="text-xs text-muted-foreground/60">
            Consultation reports and documents from secretaries will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((doc) => {
            const Icon = getDocIcon(doc.documentType, doc.mimeType);
            const { bg, fg } = getDocColor(doc.documentType);
            const isPdf = doc.mimeType === "application/pdf";
            const isImage = doc.mimeType.startsWith("image/");
            return (
              <div
                key={doc.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-elevated"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-xl ${bg} ${fg}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold leading-tight">{doc.fileName}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType} &middot;{" "}
                        {formatFileSize(doc.fileSize)}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${bg} ${fg}`}
                  >
                    {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    {new Date(doc.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {doc.uploadedBy && <span>by {doc.uploadedBy}</span>}
                  {doc.downloadCount > 0 && (
                    <span>
                      {doc.downloadCount} download{doc.downloadCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleDownload(doc.id, doc.fileName)}
                    disabled={downloading === doc.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Download className="h-3 w-3" />
                    {downloading === doc.id ? "Downloading..." : "Download"}
                  </button>
                  {(isPdf || isImage) && (
                    <button
                      onClick={() => handleView(doc.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
