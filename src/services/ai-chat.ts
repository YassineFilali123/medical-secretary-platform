import { API_BASE_URL, authHeader } from "@/lib/api-config";
import type { SlotDay } from "@/services/availability";
import type { Appointment, Doctor } from "@/types/appointment";

export type AiChatAction =
  | "message"
  | "start_booking"
  | "select_doctor"
  | "select_slot"
  | "start_cancellation"
  | "select_cancellation"
  | "confirm_cancellation"
  | "start_document_request"
  | "select_document_type"
  /** Backend could not understand or handle the message — show the fallback service menu. */
  | "show_fallback_menu";

export type AiChatResponse = {
  message: string;
  nextAction: AiChatAction;
  // Booking flow
  doctors?: Doctor[];
  doctor?: Doctor;
  days?: SlotDay[];
  // Shared (booking success / cancellation success)
  appointment?: Appointment;
  // Cancellation flow
  cancellableAppointments?: Appointment[];
  /** True when the returned appointment was just cancelled. */
  cancelled?: boolean;
  // Document request flow
  /** Shown during type-picker step. */
  documentTypes?: { key: string; label: string }[];
  /** True when the patient's document already exists and is ready. */
  documentReady?: boolean;
  /** The existing document the patient can download. */
  documentAvailable?: {
    id: number;
    fileName: string;
    documentType: string;
    documentTypeLabel: string;
  };
  /** True when a new pending request was just created. */
  documentRequested?: boolean;
  /** The newly created pending request. */
  documentRequest?: {
    id: number;
    documentType: string;
    documentTypeLabel: string;
    status: string;
  };
};

export class AiChatError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.code = code;
  }
}

export const aiChatService = {
  async send(input: {
    action?: AiChatAction;
    message?: string;
    // Booking
    doctorId?: number;
    date?: string;
    time?: string;
    // Cancellation
    appointmentId?: number;
    // Document request
    documentType?: string;
  }): Promise<AiChatResponse> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(input),
      });
    } catch {
      throw new AiChatError(`Cannot reach the server. Is the backend running on ${API_BASE_URL}?`);
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch {
      throw new AiChatError(`Server returned an invalid response (HTTP ${response.status}).`);
    }

    if (!data.success) {
      throw new AiChatError(
        (data.error as string) || `Request failed (HTTP ${response.status}).`,
        (data.code as string) ?? null,
      );
    }

    return data as unknown as AiChatResponse;
  },
};
