import { mockStorage, type MockAppointment } from "./mock-data";

const originalFetch = window.fetch;

export function setupFetchInterceptor(): void {
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Only intercept API calls
    const isApiCall = urlString.includes("/api/") || urlString.includes(":8080");
    if (!isApiCall) {
      return originalFetch(input, init);
    }

    try {
      // Attempt real network call with a quick 2-second timeout check for local backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const requestSignal = init?.signal;
      const combinedSignal = controller.signal;

      if (requestSignal) {
        // If external signal aborts first, preserve it
        requestSignal.addEventListener("abort", () => controller.abort());
      }

      const response = await originalFetch(input, { ...init, signal: combinedSignal });
      clearTimeout(timeoutId);
      return response;
    } catch (err: unknown) {
      // Backend is offline or connection refused — handle with mock fallback!
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      // If it was explicitly aborted by user code (not timeout/network error), let it fail normally
      if (err instanceof DOMException && err.name === "AbortError" && init?.signal?.aborted) {
        throw err;
      }

      console.warn(`[Mock API Interceptor] Backend unreachable (${errorMsg}). Serving local mock response for ${urlString}`);

      return handleMockRequest(urlString, init);
    }
  };
}

function createJsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function handleMockRequest(urlStr: string, init?: RequestInit): Response {
  const url = new URL(urlStr, window.location.origin);
  const path = url.pathname;
  let body: Record<string, unknown> = {};

  if (init?.body && typeof init.body === "string") {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = {};
    }
  }

  // --- Auth endpoints ---
  if (path.endsWith("/login")) {
    const email = (body.email as string) || "doctor@med.com";
    const user = mockStorage.createOrGetUser(email);
    return createJsonResponse({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        status: user.status,
      },
      token: `mock_token_${user.id}`,
    });
  }

  if (path.endsWith("/register")) {
    const email = (body.email as string) || "user@med.com";
    const name = (body.name as string) || "New User";
    const role = (body.role as string) || "patient";
    const user = mockStorage.createOrGetUser(email, name, role);
    return createJsonResponse({
      success: true,
      needsVerification: true,
      email: user.email,
      debug_code: "123456",
      message: "Verification code sent (Mock Mode)",
    });
  }

  if (path.endsWith("/verify") || path.endsWith("/resend")) {
    return createJsonResponse({
      success: true,
      message: "Success (Mock Mode)",
    });
  }

  if (path.endsWith("/profile")) {
    const authUserStr = localStorage.getItem("auth_user");
    // Always resolves, so the profile below never has to cope with a missing user.
    let currentUser = mockStorage.createOrGetUser("doctor@med.com");
    if (authUserStr) {
      try {
        const parsed = JSON.parse(authUserStr);
        const found = mockStorage.findUserByEmail(parsed.email);
        if (found) currentUser = found;
      } catch {
        // fallback
      }
    }
    return createJsonResponse({
      success: true,
      profile: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        roles: currentUser.roles,
        status: "active",
      },
    });
  }

  // --- Specialties ---
  if (path.endsWith("/specialties")) {
    return createJsonResponse({
      success: true,
      specialties: mockStorage.getSpecialties(),
    });
  }

  if (path.endsWith("/specialties/create")) {
    const created = mockStorage.saveSpecialty({
      name: (body.name as string) || "New Specialty",
      description: (body.description as string) || null,
      isActive: true,
      sortOrder: (body.sortOrder as number) || 10,
    });
    return createJsonResponse({ success: true, specialty: created });
  }

  // --- Doctors & Patients ---
  if (path.endsWith("/doctors")) {
    return createJsonResponse({
      success: true,
      doctors: mockStorage.getDoctors(),
    });
  }

  if (path.endsWith("/patients") || path.endsWith("/doctor/patients")) {
    const users = mockStorage.getUsers().filter((u) => u.roles.includes("ROLE_PATIENT"));
    const patients = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: "+1 (555) 234-5678",
      avatarUrl: null,
      dateOfBirth: "1990-05-15",
      age: 34,
      gender: "male",
      bloodType: "A+",
      allergies: "None reported",
      emergencyContact: "Jane Doe (+1 555-999-0000)",
      totalAppointments: 3,
      completedVisits: 2,
      openAppointments: 1,
      lastVisit: "2025-01-10",
      nextAppointment: null,
    }));
    return createJsonResponse({ success: true, patients });
  }

  // --- Appointments ---
  if (path.endsWith("/appointments")) {
    const appointments = mockStorage.getAppointments();
    return createJsonResponse({
      success: true,
      appointments,
      total: appointments.length,
    });
  }

  if (path.endsWith("/appointments/get")) {
    const id = Number(url.searchParams.get("id") || 101);
    const appointment = mockStorage.getAppointments().find((a) => a.id === id) || mockStorage.getAppointments()[0];
    return createJsonResponse({ success: true, appointment });
  }

  if (path.endsWith("/appointments/stats")) {
    const appointments = mockStorage.getAppointments();
    const stats = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "pending").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      rejected: 0,
      in_progress: 0,
      todayTotal: appointments.length,
    };
    return createJsonResponse({ success: true, stats });
  }

  if (path.endsWith("/appointments/create")) {
    const appt = mockStorage.createAppointment(body);
    return createJsonResponse({ success: true, appointment: appt });
  }

  if (path.endsWith("/appointments/status")) {
    const updated = mockStorage.updateAppointmentStatus(
      Number(body.id),
      body.status as MockAppointment["status"],
      body.notes as string,
    );
    return createJsonResponse({ success: true, appointment: updated });
  }

  if (path.endsWith("/appointments/cancel")) {
    const updated = mockStorage.updateAppointmentStatus(Number(body.id), "cancelled");
    return createJsonResponse({ success: true, appointment: updated });
  }

  // --- Admin Endpoints ---
  if (path.endsWith("/admin/users")) {
    const users = mockStorage.getUsers();
    return createJsonResponse({ success: true, users, total: users.length });
  }

  if (path.endsWith("/admin/statistics")) {
    return createJsonResponse({
      success: true,
      stats: {
        totalUsers: mockStorage.getUsers().length,
        totalAppointments: mockStorage.getAppointments().length,
        activeDoctors: mockStorage.getDoctors().length,
        totalPatients: 24,
        revenue: 12500,
      },
    });
  }

  if (path.endsWith("/admin/ai/settings")) {
    return createJsonResponse({
      success: true,
      settings: {
        enabled: true,
        modelName: "gemini-1.5-pro",
        systemPrompt: "You are a helpful medical secretary.",
        maxTokens: 500,
      },
    });
  }

  if (path.endsWith("/admin/ai/faqs") || path.endsWith("/admin/ai/scenarios")) {
    return createJsonResponse({ success: true, faqs: [], scenarios: [] });
  }

  // --- AI Chat ---
  if (path.endsWith("/ai/chat")) {
    return createJsonResponse({
      success: true,
      reply: "Hello! I am your AI Medical Assistant. I can help answer questions regarding clinic hours, specialties, or setting up appointments.",
      conversationId: 1,
    });
  }

  // --- Consultations & Live Chat ---
  if (path.endsWith("/consultations/active")) {
    return createJsonResponse({ success: true, consultation: null });
  }

  if (path.endsWith("/notifications")) {
    return createJsonResponse({ success: true, notifications: [] });
  }

  if (path.endsWith("/livechat/my") || path.endsWith("/livechat/waiting") || path.endsWith("/livechat/active")) {
    return createJsonResponse({ success: true, chats: [], messages: [] });
  }

  // Generic fallback for any unhandled API endpoints
  return createJsonResponse({
    success: true,
    message: "Request succeeded (Mock Fallback)",
    data: [],
  });
}
