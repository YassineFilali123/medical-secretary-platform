import { API_BASE_URL, authHeader } from "@/lib/api-config";

// ── Types ────────────────────────────────────────────────────

export type DocumentType =
  | "medical_certificate"
  | "prescription"
  | "medical_report"
  | "sick_leave_certificate"
  | "laboratory_request"
  | "imaging_request"
  | "referral_letter"
  | "consultation_summary"
  | "consultation_report"
  | "other";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  medical_certificate: "Medical Certificate",
  prescription: "Prescription",
  medical_report: "Medical Report",
  sick_leave_certificate: "Sick Leave Certificate",
  laboratory_request: "Laboratory Request",
  imaging_request: "Imaging Request",
  referral_letter: "Referral Letter",
  consultation_summary: "Consultation Summary",
  consultation_report: "Consultation Report",
  other: "Other",
};

export type DocumentRequestStatus = "pending" | "approved" | "uploaded" | "completed" | "rejected";

export type DocumentRequest = {
  id: number;
  patientId: number;
  patientName: string;
  patientAvatar: string | null;
  documentType: DocumentType;
  documentTypeLabel: string;
  note: string | null;
  status: DocumentRequestStatus;
  rejectionReason: string | null;
  secretaryMessage: string | null;
  secretaryName: string | null;
  processedAt: string | null;
  createdAt: string;
  document: {
    id: number;
    fileName: string;
    uploadDate: string;
  } | null;
};

export type PatientDocument = {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  uploadedBy: string | null;
  downloadCount: number;
  lastDownloaded: string | null;
  createdAt: string;
};

// ── Helpers ──────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(`Cannot reach the server. Is the backend running on ${API_BASE_URL}?`);
  }

  // File download returns a blob, not JSON
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/octet-stream") || ct.includes("application/pdf") || ct.startsWith("image/")) {
    return { blob: await res.blob(), fileName: extractFileName(res) } as unknown as T;
  }

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned an invalid response (HTTP ${res.status}).`);
  }

  if (!data.success) {
    throw new Error((data.error as string) || `Request failed (HTTP ${res.status}).`);
  }
  return data as T;
}

function extractFileName(res: Response): string {
  const cd = res.headers.get("content-disposition") ?? "";
  const match = cd.match(/filename="?(.+?)"?$/i);
  if (!match) return "document";
  return match[1] ?? "document";
}

const get = <T>(path: string) => request<T>(path, { method: "GET", headers: { ...authHeader() } });

const post = <T>(path: string, body: unknown) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });

// ── Document Request Service ─────────────────────────────────

export const documentRequestService = {
  /** Patient creates a new document request. */
  create: (input: { documentType: DocumentType; note?: string }) =>
    post<{ request: DocumentRequest; message: string }>("/documents/request", input),

  /** List requests (patient sees own, secretary sees all). */
  list: (status?: string) =>
    get<{ requests: DocumentRequest[]; total: number }>(
      `/documents/requests${status ? `?status=${status}` : ""}`,
    ),

  /** Secretary approves a request. */
  approve: (requestId: number, message?: string) =>
    post<{ message: string }>("/documents/approve", { requestId, message }),

  /** Secretary rejects a request. */
  reject: (requestId: number, reason?: string) =>
    post<{ message: string }>("/documents/reject", { requestId, reason }),

  /** Secretary uploads a file (multipart/form-data). */
  upload: async (requestId: number, file: File, message?: string) => {
    const formData = new FormData();
    formData.append("requestId", String(requestId));
    formData.append("file", file);
    if (message) formData.append("message", message);

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: "POST",
        headers: { ...authHeader() },
        body: formData,
      });
    } catch {
      throw new Error("Cannot reach the server.");
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Upload failed.");
    }
    return data as { success: boolean; message: string };
  },

  /** Download a document file. Returns a blob. */
  download: (documentId: number) =>
    get<{ blob: Blob; fileName: string }>(`/documents/download?id=${documentId}`),

  /** Patient's received documents. */
  myDocuments: () =>
    get<{ documents: PatientDocument[]; total: number }>("/documents/my"),
};

/** Format file size for display. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
