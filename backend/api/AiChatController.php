<?php

/**
 * Patient-facing AI chat endpoint.
 *
 * Gemini is used only here, on the server, to detect intent (booking,
 * cancellation, document request) and answer non-workflow questions.
 * Every write is delegated to the appropriate controller so that existing
 * validation, authorisation, and business rules are always enforced.
 */
class AiChatController
{
    private const MAX_MESSAGE_LENGTH = 2000;

    private PDO $db;
    private AppointmentController $appointments;
    private AvailabilityController $availability;
    private DocumentRequestController $documents;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->appointments = new AppointmentController();
        $this->availability = new AvailabilityController();
        $this->documents    = new DocumentRequestController();
    }

    /**
     * POST /api/ai/chat
     *
     * Actions are intentionally structured rather than parsed out of model
     * text. The browser can only submit a doctor and a slot that this endpoint
     * has supplied, and the existing appointment controller validates them
     * again immediately before creating the record.
     */
    public function reply(array $data): array
    {
        $patient = $this->patient();
        if ($patient === null) {
            return ['success' => false, 'error' => 'Patient authentication is required.', 'status' => 401];
        }

        $action = $data['action'] ?? 'message';
        $validActions = [
            'message', 'start_booking', 'select_doctor', 'select_slot',
            'start_cancellation', 'confirm_cancellation',
            'start_document_request', 'select_document_type',
        ];
        if (!is_string($action) || !in_array($action, $validActions, true)) {
            return ['success' => false, 'error' => 'Unknown AI chat action.'];
        }

        if ($action === 'start_booking') {
            return $this->startBooking();
        }

        if ($action === 'select_doctor') {
            return $this->selectDoctor($data);
        }

        if ($action === 'select_slot') {
            return $this->selectSlot($data);
        }

        if ($action === 'start_cancellation') {
            return $this->startCancellation($patient);
        }

        if ($action === 'confirm_cancellation') {
            return $this->confirmCancellation($data);
        }

        if ($action === 'start_document_request') {
            return $this->startDocumentRequest();
        }

        if ($action === 'select_document_type') {
            return $this->selectDocumentType($data, $patient);
        }

        $message = $this->cleanMessage($data['message'] ?? null);
        if ($message === null) {
            return ['success' => false, 'error' => 'Please enter a message of up to ' . self::MAX_MESSAGE_LENGTH . ' characters.'];
        }

        $geminiReply = $this->askGemini($message);

        // Check document-request intent first — it is the most specific.
        if ($this->isDocumentRequest($message, $geminiReply)) {
            return $this->startDocumentRequest();
        }
        if ($this->isCancellationRequest($message, $geminiReply)) {
            return $this->startCancellation($patient);
        }
        if ($this->isBookingRequest($message, $geminiReply)) {
            return $this->startBooking();
        }

        // If Gemini returned a useful general answer, show it.
        $cleanReply = $this->stripIntentMarkers($geminiReply);
        if ($cleanReply !== null) {
            return [
                'success'    => true,
                'message'    => $cleanReply,
                'nextAction' => 'message',
            ];
        }

        // Gemini was unavailable or produced nothing useful — show the fallback menu.
        return $this->fallbackMenuResponse();
    }

    private function startBooking(): array
    {
        $directory = $this->appointments->doctors([]);
        if (!$directory['success']) {
            return $directory;
        }

        $doctors = $directory['doctors'] ?? [];
        if ($doctors === []) {
            return [
                'success' => true,
                'message' => 'There are no doctors available for online booking right now. Please contact the clinic.',
                'nextAction' => 'message',
                'doctors' => [],
            ];
        }

        return [
            'success' => true,
            'message' => 'I can help you book an appointment. Please choose a doctor.',
            'nextAction' => 'select_doctor',
            'doctors' => $doctors,
        ];
    }

    private function selectDoctor(array $data): array
    {
        $doctorId = $this->cleanId($data['doctorId'] ?? null);
        if ($doctorId === null) {
            return ['success' => false, 'error' => 'Please choose a valid doctor.'];
        }

        // doctors() is the canonical directory and also verifies that the
        // chosen account remains an active doctor.
        $directory = $this->appointments->doctors([]);
        if (!$directory['success']) {
            return $directory;
        }

        $doctor = null;
        foreach ($directory['doctors'] as $candidate) {
            if ((int) $candidate['id'] === $doctorId) {
                $doctor = $candidate;
                break;
            }
        }
        if ($doctor === null) {
            return ['success' => false, 'error' => 'That doctor is no longer available for booking.'];
        }

        $from = date('Y-m-d');
        $to = date('Y-m-d', strtotime($from . ' +29 days'));
        $slots = $this->availability->slots(['doctorId' => (string) $doctorId, 'from' => $from, 'to' => $to]);
        if (!$slots['success']) {
            return $slots;
        }

        $days = array_values(array_filter($slots['days'] ?? [], static fn(array $day): bool => !empty($day['slots'])));
        if ($days === []) {
            return [
                'success' => true,
                'message' => sprintf('%s has no available appointments in the next 30 days. Please choose another doctor.', $doctor['name']),
                'nextAction' => 'select_doctor',
                'doctors' => $directory['doctors'],
            ];
        }

        return [
            'success' => true,
            'message' => sprintf('Here are the available dates and times for %s. Please choose a time slot.', $doctor['name']),
            'nextAction' => 'select_slot',
            'doctor' => $doctor,
            'days' => $days,
        ];
    }

    private function selectSlot(array $data): array
    {
        $doctorId = $this->cleanId($data['doctorId'] ?? null);
        if ($doctorId === null) {
            return ['success' => false, 'error' => 'Please choose a valid doctor.'];
        }

        // The AppointmentController runs slotsFor() again and the database's
        // unique active-slot index arbitrates a simultaneous final selection.
        $booking = $this->appointments->create([
            'doctorId' => $doctorId,
            'date' => $data['date'] ?? null,
            'time' => $data['time'] ?? null,
            'reason' => 'Appointment booked through the AI assistant.',
            'type' => 'consultation',
        ]);

        if (!$booking['success']) {
            return $booking;
        }

        $appointment = $booking['appointment'] ?? null;
        if (!is_array($appointment)) {
            return ['success' => false, 'error' => 'The appointment was created but could not be loaded.'];
        }

        return [
            'success' => true,
            'message' => sprintf(
                'Your appointment request with %s has been created for %s at %s. The doctor will review it and you will be notified of any update.',
                $appointment['doctorName'],
                $appointment['date'],
                $appointment['time'],
            ),
            'nextAction' => 'message',
            'appointment' => $appointment,
        ];
    }

    // -------------------------------------------------------------------------
    // Document request flow
    // -------------------------------------------------------------------------

    /**
     * Return the list of requestable document types so the patient can pick one.
     * Types come directly from DocumentRequestController::DOCUMENT_TYPES —
     * no copy is kept here.
     */
    private function startDocumentRequest(): array
    {
        $types = [];
        foreach (DocumentRequestController::DOCUMENT_TYPES as $key) {
            $types[] = [
                'key'   => $key,
                'label' => ucwords(str_replace('_', ' ', $key)),
            ];
        }

        return [
            'success'       => true,
            'message'       => 'Sure! Which document do you need? Please select from the list below.',
            'nextAction'    => 'select_document_type',
            'documentTypes' => $types,
        ];
    }

    /**
     * The patient selected a document type.
     *
     * 1. Validate the type against the authoritative list in DocumentRequestController.
     * 2. Check whether the patient already has a completed document of this type
     *    (both secretary-uploaded and auto-generated consultation reports).
     * 3a. If found  → return it with a download link.
     * 3b. If not    → create a new pending request via DocumentRequestController::create().
     *
     * Ownership is enforced by DocumentRequestController — the patient ID is
     * read from the Bearer token, never from the request body.
     */
    private function selectDocumentType(array $data, array $patient): array
    {
        $type = $data['documentType'] ?? null;
        if (!is_string($type) || !in_array($type, DocumentRequestController::DOCUMENT_TYPES, true)) {
            return ['success' => false, 'error' => 'Please select a valid document type.'];
        }

        $typeLabel = ucwords(str_replace('_', ' ', $type));

        // ── Step 1: Check for a completed/uploaded request of this type ──────
        $existingRequests = $this->documents->listRequests(['status' => 'completed']);
        if ($existingRequests['success']) {
            foreach ($existingRequests['requests'] ?? [] as $req) {
                if ($req['documentType'] === $type
                    && (int) $req['patientId'] === $patient['id']
                    && $req['document'] !== null
                ) {
                    return [
                        'success'           => true,
                        'message'           => sprintf(
                            'Your %s is ready to download.',
                            $typeLabel
                        ),
                        'nextAction'        => 'message',
                        'documentReady'     => true,
                        'documentAvailable' => [
                            'id'               => $req['document']['id'],
                            'fileName'         => $req['document']['fileName'],
                            'documentType'     => $type,
                            'documentTypeLabel' => $typeLabel,
                        ],
                    ];
                }
            }
        }

        // ── Step 2: Check auto-generated docs (e.g. consultation reports) ────
        $myDocs = $this->documents->myDocuments();
        if ($myDocs['success']) {
            foreach ($myDocs['documents'] ?? [] as $doc) {
                if ($doc['documentType'] === $type) {
                    return [
                        'success'           => true,
                        'message'           => sprintf(
                            'Your %s is available for download.',
                            $typeLabel
                        ),
                        'nextAction'        => 'message',
                        'documentReady'     => true,
                        'documentAvailable' => [
                            'id'               => $doc['id'],
                            'fileName'         => $doc['fileName'],
                            'documentType'     => $type,
                            'documentTypeLabel' => $typeLabel,
                        ],
                    ];
                }
            }
        }

        // ── Step 3: No document exists — create a pending request ─────────────
        $created = $this->documents->create([
            'documentType' => $type,
            'note'         => 'Requested via AI assistant.',
        ]);

        if (!$created['success']) {
            return $created;
        }

        $req = $created['request'];

        return [
            'success'          => true,
            'message'          => sprintf(
                'Your request for a %s has been submitted. The medical team will review and prepare it for you.',
                $typeLabel
            ),
            'nextAction'       => 'message',
            'documentRequested' => true,
            'documentRequest'  => [
                'id'               => $req['id'],
                'documentType'     => $req['documentType'],
                'documentTypeLabel' => $req['documentTypeLabel'],
                'status'           => $req['status'],
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Cancellation flow
    // -------------------------------------------------------------------------

    /**
     * Fetch the patient's own pending/confirmed appointments and return them
     * as a selectable list. Delegates entirely to AppointmentController::index()
     * so the same role-scoping, SQL, and row-mapping is used consistently.
     */
    private function startCancellation(array $patient): array
    {
        $result = $this->appointments->index(['status' => '']);
        if (!$result['success']) {
            return $result;
        }

        // Filter to only the statuses a patient can cancel: pending and confirmed.
        $all = $result['appointments'] ?? [];
        $cancellable = array_values(array_filter($all, static function (array $appt) use ($patient): bool {
            return in_array($appt['status'], ['pending', 'confirmed'], true)
                && (int) $appt['patientId'] === $patient['id'];
        }));

        if ($cancellable === []) {
            return [
                'success'    => true,
                'message'    => 'You have no appointments that can be cancelled right now.',
                'nextAction' => 'message',
            ];
        }

        return [
            'success'                 => true,
            'message'                 => 'Here are your upcoming appointments. Select the one you\'d like to cancel.',
            'nextAction'              => 'select_cancellation',
            'cancellableAppointments' => $cancellable,
        ];
    }

    /**
     * Confirm a cancellation selected by the patient.
     * Delegates to AppointmentController::cancel() which re-validates ownership
     * and status server-side, so the patient cannot cancel someone else's
     * appointment even if they craft a request manually.
     */
    private function confirmCancellation(array $data): array
    {
        $appointmentId = $this->cleanId($data['appointmentId'] ?? null);
        if ($appointmentId === null) {
            return ['success' => false, 'error' => 'Please select a valid appointment to cancel.'];
        }

        $result = $this->appointments->cancel(['id' => $appointmentId]);
        if (!$result['success']) {
            return $result;
        }

        $appointment = $result['appointment'] ?? null;

        return [
            'success'     => true,
            'message'     => sprintf(
                'Your appointment with %s on %s at %s has been successfully cancelled.',
                $appointment['doctorName'] ?? 'your doctor',
                $appointment['date'] ?? '',
                $appointment['time'] ?? ''
            ),
            'nextAction'  => 'message',
            'appointment' => $appointment,
            'cancelled'   => true,
        ];
    }

    /** @return array{id:int,roles:list<string>}|null */
    private function patient(): ?array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $matches)) {
            return null;
        }

        $stmt = $this->db->prepare('SELECT id, roles FROM `user` WHERE id = ?');
        $stmt->execute([(int) $matches[1]]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        $roles = json_decode((string) $row['roles'], true);
        if (!is_array($roles) || !in_array('ROLE_PATIENT', $roles, true)) {
            return null;
        }

        return ['id' => (int) $row['id'], 'roles' => $roles];
    }

    private function cleanId($value): ?int
    {
        if (is_int($value) && $value > 0) {
            return $value;
        }
        if (is_string($value) && ctype_digit($value) && (int) $value > 0) {
            return (int) $value;
        }

        return null;
    }

    private function cleanMessage($value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $message = trim($value);
        if ($message === '' || mb_strlen($message) > self::MAX_MESSAGE_LENGTH) {
            return null;
        }

        return $message;
    }

    /**
     * Calls Gemini only from PHP. The client never receives the API key, model
     * configuration, or provider error details.
     */
    private function askGemini(string $message): ?string
    {
        $key = $this->env('GEMINI_API_KEY');
        if ($key === null || !function_exists('curl_init')) {
            return null;
        }

        $model = $this->env('GEMINI_MODEL') ?? 'gemini-2.5-flash';
        $prompt = "You are a clinic assistant. Do not diagnose or give urgent medical instructions. "
            . "If the patient wants to book, schedule, or make an appointment, start your response with [BOOK_APPOINTMENT] and a brief helpful sentence. "
            . "If the patient wants to cancel, remove, or withdraw an existing appointment, start your response with [CANCEL_APPOINTMENT] and a brief helpful sentence. "
            . "If the patient wants to request, get, or download a medical document, certificate, prescription, report, referral, or sick-leave note, start your response with [REQUEST_DOCUMENT] and a brief helpful sentence. "
            . "Otherwise provide a brief, general, non-diagnostic response and suggest contacting a clinician for urgent concerns.\n\n"
            . "Patient message: " . $message;

        $payload = json_encode([
            'contents' => [[
                'role' => 'user',
                'parts' => [['text' => $prompt]],
            ]],
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 250,
            ],
        ], JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            return null;
        }

        $request = curl_init('https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent');
        curl_setopt_array($request, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $key],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 12,
        ]);
        $response = curl_exec($request);
        $status = (int) curl_getinfo($request, CURLINFO_RESPONSE_CODE);
        curl_close($request);

        if (!is_string($response) || $status < 200 || $status >= 300) {
            return null;
        }

        $decoded = json_decode($response, true);
        $text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;

        return is_string($text) && trim($text) !== '' ? trim($text) : null;
    }

    private function isBookingRequest(string $message, ?string $geminiReply): bool
    {
        if ($geminiReply !== null && str_starts_with(ltrim($geminiReply), '[BOOK_APPOINTMENT]')) {
            return true;
        }

        // Gemini downtime must not make booking inaccessible. This fallback is
        // deliberately narrow; it only starts a workflow, never creates data.
        return (bool) preg_match('/\b(book|schedule|make|need|want)\b.{0,60}\b(appointment|visit|consultation)\b|\bappointment\b.{0,60}\b(book|schedule|please)\b/i', $message);
    }

    private function isCancellationRequest(string $message, ?string $geminiReply): bool
    {
        if ($geminiReply !== null && str_starts_with(ltrim($geminiReply), '[CANCEL_APPOINTMENT]')) {
            return true;
        }

        // Fallback regex for when Gemini is unavailable.
        return (bool) preg_match('/\b(cancel|cancellation|withdraw|remove|delete)\b.{0,60}\b(appointment|visit|booking|consultation)\b|\bappointment\b.{0,60}\bcancel/i', $message);
    }

    private function isDocumentRequest(string $message, ?string $geminiReply): bool
    {
        if ($geminiReply !== null && str_starts_with(ltrim($geminiReply), '[REQUEST_DOCUMENT]')) {
            return true;
        }

        // Fallback regex — matches common document-request phrasings.
        return (bool) preg_match(
            '/\b(need|want|request|get|provide|send|give)\b.{0,80}\b(document|certificate|prescription|report|referral|sick.?leave|lab(oratory)?|imaging|letter|summary)\b'
            . '|\b(medical.?document|medical.?certificate|sick.?note|doctor.?note|doc.?request)\b/i',
            $message
        );
    }

    /**
     * Strip any intent marker ([BOOK_APPOINTMENT], [CANCEL_APPOINTMENT],
     * or [REQUEST_DOCUMENT]) from a Gemini reply so only the human-readable
     * sentence remains.
     */
    private function stripIntentMarkers(?string $reply): ?string
    {
        if ($reply === null) {
            return null;
        }

        $cleaned = trim(preg_replace('/^\[(BOOK_APPOINTMENT|CANCEL_APPOINTMENT|REQUEST_DOCUMENT)\]\s*/i', '', $reply));

        return $cleaned === '' ? null : $cleaned;
    }

    /** @deprecated Use stripIntentMarkers() instead. Kept for call-site compatibility. */
    private function stripBookingMarker(?string $reply): ?string
    {
        return $this->stripIntentMarkers($reply);
    }

    private function fallbackMenuResponse(): array
    {
        return [
            'success'    => true,
            'message'    => 'I can help you with the following services. Please select an option:',
            'nextAction' => 'show_fallback_menu',
        ];
    }

    /** @deprecated Kept for backward compatibility only. */
    private function fallbackReply(): string
    {
        return 'I can help with appointment booking and general clinic information. For urgent symptoms or an emergency, please contact local emergency services or the clinic directly.';
    }

    /** Read Symfony's .env when the legacy API is serving the request directly. */
    private function env(string $name): ?string
    {
        $value = $_ENV[$name] ?? getenv($name);
        if (is_string($value) && $value !== '') {
            return $value;
        }

        $path = dirname(__DIR__) . '/.env';
        if (!is_readable($path)) {
            return null;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines ?: [] as $line) {
            if (str_starts_with(ltrim($line), '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $raw] = explode('=', $line, 2);
            if (trim($key) !== $name) {
                continue;
            }

            $value = trim($raw);
            if (strlen($value) >= 2 && $value[0] === '"' && substr($value, -1) === '"') {
                $value = substr($value, 1, -1);
            }

            return $value !== '' ? $value : null;
        }

        return null;
    }
}
