import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  FileCheck,
  Search,
  AlertCircle,
  Paperclip,
  Send,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type DocumentRequest,
  type DocumentRequestStatus,
  documentRequestService,
} from "@/services/document";

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

export default function DocumentRequestsPage() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "upload" | null>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const statusParam = statusFilter === "all" ? undefined : statusFilter;
      const data = await documentRequestService.list(statusParam);
      setRequests(data.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filtered = requests.filter((r) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.patientName.toLowerCase().includes(q) ||
        r.documentTypeLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await documentRequestService.approve(selectedRequest.id, message.trim() || undefined);
      closeModal();
      await loadRequests();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await documentRequestService.reject(selectedRequest.id, reason.trim() || undefined);
      closeModal();
      await loadRequests();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reject.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedRequest || !file) return;
    setSubmitting(true);
    try {
      await documentRequestService.upload(selectedRequest.id, file, message.trim() || undefined);
      closeModal();
      await loadRequests();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setAction(null);
    setMessage("");
    setReason("");
    setFile(null);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Document Requests</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600">
              {pendingCount} pending request{pendingCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient or document type..."
            className="h-10 rounded-xl pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-soft">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No document requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const statusCfg = STATUS_CONFIG[req.status];
            const StatusIcon = statusCfg.icon;
            const isPending = req.status === "pending";
            const isApproved = req.status === "approved";
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" /> {req.patientName}
                        </span>
                        <span>&middot;</span>
                        <span>
                          {new Date(req.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
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
                    <span className="font-medium">Note:</span> {req.note}
                  </p>
                )}

                {req.secretaryMessage && (
                  <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-700">
                    Message: {req.secretaryMessage}
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

                {/* Actions */}
                {(isPending || isApproved) && (
                  <div className="mt-4 flex gap-2">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(req);
                            setAction("approve");
                          }}
                          className="rounded-xl"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(req);
                            setAction("reject");
                          }}
                          className="rounded-xl text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(req);
                        setAction("upload");
                      }}
                      className="rounded-xl"
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload & Send
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedRequest && action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {action === "approve" && "Approve Request"}
              {action === "reject" && "Reject Request"}
              {action === "upload" && "Upload & Send Document"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedRequest.documentTypeLabel} for {selectedRequest.patientName}
            </p>

            <div className="mt-5 space-y-4">
              {action === "approve" && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Message for patient <span className="text-muted-foreground/60">(optional)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a note for the patient..."
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm"
                  />
                </div>
              )}

              {action === "reject" && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Rejection reason <span className="text-muted-foreground/60">(optional)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this request is being rejected..."
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm"
                  />
                </div>
              )}

              {action === "upload" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Document file *</label>
                    <div className="mt-1 rounded-xl border-2 border-dashed border-border p-4 text-center">
                      <input
                        type="file"
                        id="doc-upload"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <label htmlFor="doc-upload" className="cursor-pointer">
                        <Paperclip className="mx-auto h-6 w-6 text-muted-foreground/50" />
                        <p className="mt-1 text-sm text-muted-foreground">
                          {file ? (
                            <span className="font-medium text-foreground">{file.name}</span>
                          ) : (
                            "Click to select a file"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          PDF, DOC, DOCX, JPEG, PNG, WebP (max 20 MB)
                        </p>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Message for patient <span className="text-muted-foreground/60">(optional)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Add a note for the patient..."
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                {action === "approve" && (
                  <Button onClick={handleApprove} disabled={submitting} className="rounded-xl">
                    {submitting ? "Approving..." : (
                      <>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
                      </>
                    )}
                  </Button>
                )}
                {action === "reject" && (
                  <Button
                    onClick={handleReject}
                    disabled={submitting}
                    className="rounded-xl bg-red-600 hover:bg-red-700"
                  >
                    {submitting ? "Rejecting..." : (
                      <>
                        <XCircle className="mr-1.5 h-4 w-4" /> Reject
                      </>
                    )}
                  </Button>
                )}
                {action === "upload" && (
                  <Button
                    onClick={handleUpload}
                    disabled={submitting || !file}
                    className="rounded-xl"
                  >
                    {submitting ? "Uploading..." : (
                      <>
                        <Send className="mr-1.5 h-4 w-4" /> Send to Patient
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
