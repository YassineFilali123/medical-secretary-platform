<?php

/**
 * Document requests: patients request official documents, secretaries process them.
 *
 * Flow: pending → approved → uploaded → completed
 *       pending → rejected
 *
 * File uploads use multipart/form-data (not JSON). The index.php router
 * detects the content type and passes $_FILES instead of $body for upload.
 */
class DocumentRequestController
{
    public const DOCUMENT_TYPES = [
        'medical_certificate',
        'prescription',
        'medical_report',
        'sick_leave_certificate',
        'laboratory_request',
        'imaging_request',
        'referral_letter',
        'consultation_summary',
        'consultation_report',
        'other',
    ];

    public const STATUSES = ['pending', 'approved', 'uploaded', 'completed', 'rejected'];

    private const UPLOAD_DIR = __DIR__ . '/../uploads/documents';
    private const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

    private PDO $db;
    private Notifier $notifier;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->notifier = new Notifier($this->db);
    }

    // =========================================================================
    // POST /api/documents/request   { documentType, note? }
    // Patient creates a new document request.
    // =========================================================================
    public function create(array $data): array
    {
        $patientId = $this->currentUserId(['ROLE_PATIENT']);
        if (is_array($patientId)) {
            return $patientId;
        }

        $type = $data['documentType'] ?? null;
        if (!is_string($type) || !in_array($type, self::DOCUMENT_TYPES, true)) {
            return ['success' => false, 'error' => 'Please select a valid document type.'];
        }

        $note = null;
        if (isset($data['note']) && is_string($data['note'])) {
            $note = trim($data['note']);
            if (mb_strlen($note) > 1000) {
                return ['success' => false, 'error' => 'Note must be 1000 characters or fewer.'];
            }
            $note = $note === '' ? null : $note;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO document_request (patient_user_id, document_type, note) VALUES (?, ?, ?)'
        );
        $stmt->execute([$patientId, $type, $note]);
        $requestId = (int) $this->db->lastInsertId();

        // Notify all secretaries
        $this->notifier->sendMany($this->notifier->secretaryIds(), [
            'type'        => Notifier::DOCUMENT_REQUESTED,
            'title'       => 'New document request',
            'body'        => sprintf(
                'A patient has requested: %s.%s',
                $this->typeLabel($type),
                $note ? ' Note: ' . mb_substr($note, 0, 80) : ''
            ),
            'relatedType' => 'document_request',
            'relatedId'   => $requestId,
            'urgent'      => false,
        ]);

        return [
            'success' => true,
            'message' => 'Your document request has been submitted.',
            'request' => $this->shapeRequest($requestId),
        ];
    }

    // =========================================================================
    // GET /api/documents/requests   (patient: own, secretary: all)
    // =========================================================================
    public function listRequests(array $query): array
    {
        $userId = $this->requireAuth();
        if (is_array($userId)) {
            return $userId;
        }

        $roles = $this->userRoles($userId);
        $isSecretary = in_array('ROLE_SECRETARY', $roles, true);
        $isPatient   = in_array('ROLE_PATIENT', $roles, true);

        if (!$isSecretary && !$isPatient) {
            return ['success' => false, 'error' => 'Access denied.', 'status' => 403];
        }

        $statusFilter = $query['status'] ?? null;
        if (is_string($statusFilter) && !in_array($statusFilter, self::STATUSES, true)) {
            $statusFilter = null;
        }

        $sql = "SELECT r.id, r.patient_user_id, r.document_type, r.note, r.status,
                       r.rejection_reason, r.secretary_message,
                       r.processed_by_user_id, r.processed_at, r.created_at,
                       u.name AS patient_name, p.avatar_url AS patient_avatar,
                       su.name AS secretary_name,
                       d.id AS document_id, d.file_name, d.created_at AS upload_date
                  FROM document_request r
                  JOIN `user` u ON u.id = r.patient_user_id
                  LEFT JOIN user_profile p ON p.user_id = u.id
                  LEFT JOIN `user` su ON su.id = r.processed_by_user_id
                  LEFT JOIN patient_document d ON d.document_request_id = r.id";
        $params = [];

        if ($isPatient && !$isSecretary) {
            $sql .= ' WHERE r.patient_user_id = ?';
            $params[] = $userId;
        }

        if ($statusFilter !== null) {
            $sql .= ($params === [] ? ' WHERE' : ' AND') . ' r.status = ?';
            $params[] = $statusFilter;
        }

        $sql .= ' ORDER BY r.created_at DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $requests = array_map(fn(array $r): array => $this->shapeRequestRow($r), $stmt->fetchAll());

        return ['success' => true, 'requests' => $requests, 'total' => count($requests)];
    }

    // =========================================================================
    // POST /api/documents/approve   { requestId, message? }
    // Secretary approves a pending request.
    // =========================================================================
    public function approve(array $data): array
    {
        $secretaryId = $this->currentUserId(['ROLE_SECRETARY']);
        if (is_array($secretaryId)) {
            return $secretaryId;
        }

        $requestId = $this->intParam($data, 'requestId');
        if ($requestId === null) {
            return ['success' => false, 'error' => 'A valid request id is required.'];
        }

        $row = $this->findRequest($requestId);
        if ($row === null) {
            return ['success' => false, 'error' => 'Request not found.', 'status' => 404];
        }
        if ($row['status'] !== 'pending') {
            return ['success' => false, 'error' => 'Only pending requests can be approved.'];
        }

        $message = null;
        if (isset($data['message']) && is_string($data['message'])) {
            $message = trim($data['message']);
            $message = $message === '' ? null : $message;
        }

        $stmt = $this->db->prepare(
            "UPDATE document_request
                SET status = 'approved', secretary_message = ?,
                    processed_by_user_id = ?, processed_at = NOW()
              WHERE id = ? AND status = 'pending'"
        );
        $stmt->execute([$message, $secretaryId, $requestId]);

        // Notify patient
        $this->notifier->send((int) $row['patient_user_id'], [
            'type'        => Notifier::DOCUMENT_APPROVED,
            'title'       => 'Document request approved',
            'body'        => sprintf(
                'Your request for "%s" has been approved. The document will be prepared shortly.',
                $this->typeLabel($row['document_type'])
            ),
            'relatedType' => 'document_request',
            'relatedId'   => $requestId,
            'urgent'      => false,
        ]);

        return ['success' => true, 'message' => 'Request approved.'];
    }

    // =========================================================================
    // POST /api/documents/reject   { requestId, reason? }
    // Secretary rejects a pending request.
    // =========================================================================
    public function reject(array $data): array
    {
        $secretaryId = $this->currentUserId(['ROLE_SECRETARY']);
        if (is_array($secretaryId)) {
            return $secretaryId;
        }

        $requestId = $this->intParam($data, 'requestId');
        if ($requestId === null) {
            return ['success' => false, 'error' => 'A valid request id is required.'];
        }

        $row = $this->findRequest($requestId);
        if ($row === null) {
            return ['success' => false, 'error' => 'Request not found.', 'status' => 404];
        }
        if ($row['status'] !== 'pending') {
            return ['success' => false, 'error' => 'Only pending requests can be rejected.'];
        }

        $reason = null;
        if (isset($data['reason']) && is_string($data['reason'])) {
            $reason = trim($data['reason']);
            $reason = $reason === '' ? null : $reason;
        }

        $stmt = $this->db->prepare(
            "UPDATE document_request
                SET status = 'rejected', rejection_reason = ?,
                    processed_by_user_id = ?, processed_at = NOW()
              WHERE id = ? AND status = 'pending'"
        );
        $stmt->execute([$reason, $secretaryId, $requestId]);

        // Notify patient
        $this->notifier->send((int) $row['patient_user_id'], [
            'type'        => Notifier::DOCUMENT_REJECTED,
            'title'       => 'Document request rejected',
            'body'        => sprintf(
                'Your request for "%s" has been rejected.%s',
                $this->typeLabel($row['document_type']),
                $reason ? ' Reason: ' . mb_substr($reason, 0, 100) : ''
            ),
            'relatedType' => 'document_request',
            'relatedId'   => $requestId,
            'urgent'      => false,
        ]);

        return ['success' => true, 'message' => 'Request rejected.'];
    }

    // =========================================================================
    // POST /api/documents/upload   (multipart/form-data)
    //   requestId + file
    //
    // Secretary uploads the document file. This also completes the request.
    // =========================================================================
    public function upload(): array
    {
        $secretaryId = $this->currentUserId(['ROLE_SECRETARY']);
        if (is_array($secretaryId)) {
            return $secretaryId;
        }

        $requestId = isset($_POST['requestId']) ? (int) $_POST['requestId'] : 0;
        if ($requestId <= 0) {
            return ['success' => false, 'error' => 'A valid request id is required.'];
        }

        $row = $this->findRequest($requestId);
        if ($row === null) {
            return ['success' => false, 'error' => 'Request not found.', 'status' => 404];
        }
        if (!in_array($row['status'], ['pending', 'approved'], true)) {
            return ['success' => false, 'error' => 'This request cannot receive uploads.'];
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $errCode = $_FILES['file']['error'] ?? -1;
            return ['success' => false, 'error' => 'File upload failed (error code: ' . $errCode . ').'];
        }

        $file = $_FILES['file'];

        // Validate file
        if ($file['size'] > self::MAX_FILE_SIZE) {
            return ['success' => false, 'error' => 'File too large. Maximum size is 20 MB.'];
        }

        $allowedMime = [
            'application/pdf',
            'image/jpeg', 'image/png', 'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        if (!in_array($mimeType, $allowedMime, true)) {
            return ['success' => false, 'error' => 'Unsupported file type. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX.'];
        }

        // Create upload directory
        if (!is_dir(self::UPLOAD_DIR)) {
            mkdir(self::UPLOAD_DIR, 0755, true);
        }

        // Generate unique filename
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'bin';
        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
        $uniqueName = sprintf('%s_%s.%s', $safeName, bin2hex(random_bytes(4)), $ext);
        $destPath = self::UPLOAD_DIR . '/' . $uniqueName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            return ['success' => false, 'error' => 'Could not save the uploaded file.'];
        }

        $message = isset($_POST['message']) ? trim($_POST['message']) : null;
        $message = ($message === '' ? null : $message);

        $this->db->beginTransaction();
        try {
            // Update request status
            $this->db->prepare(
                "UPDATE document_request
                    SET status = 'completed', secretary_message = ?,
                        processed_by_user_id = ?, processed_at = COALESCE(processed_at, NOW())
                  WHERE id = ?"
            )->execute([$message, $secretaryId, $requestId]);

            // Insert document record
            $this->db->prepare(
                'INSERT INTO patient_document
                     (document_request_id, patient_user_id, uploaded_by_user_id,
                      document_type, file_name, file_path, file_size, mime_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $requestId,
                (int) $row['patient_user_id'],
                $secretaryId,
                $row['document_type'],
                $file['name'],
                $uniqueName,
                $file['size'],
                $mimeType,
            ]);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            @unlink($destPath);
            throw $e;
        }

        // Notify patient
        $this->notifier->send((int) $row['patient_user_id'], [
            'type'        => Notifier::DOCUMENT_READY,
            'title'       => 'Document ready for download',
            'body'        => sprintf(
                'Your requested document "%s" is ready. You can download it now.',
                $this->typeLabel($row['document_type'])
            ),
            'relatedType' => 'document_request',
            'relatedId'   => $requestId,
            'urgent'      => false,
        ]);

        return ['success' => true, 'message' => 'Document uploaded and sent to patient.'];
    }

    // =========================================================================
    // GET /api/documents/download?id=5
    // Patient downloads their document file.
    // =========================================================================
    public function download(array $query): void
    {
        $userId = $this->requireAuth();
        if (is_array($userId)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Not authenticated.']);
            return;
        }

        $docId = isset($query['id']) ? (int) $query['id'] : 0;
        if ($docId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'A valid document id is required.']);
            return;
        }

        $stmt = $this->db->prepare(
            "SELECT d.id, d.file_name, d.file_path, d.file_size, d.mime_type, d.patient_user_id
               FROM patient_document d
              WHERE d.id = ?"
        );
        $stmt->execute([$docId]);
        $doc = $stmt->fetch();

        if ($doc === false) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Document not found.']);
            return;
        }

        // Only the patient who owns it or a secretary/admin can download
        $roles = $this->userRoles($userId);
        if ((int) $doc['patient_user_id'] !== $userId
            && !in_array('ROLE_SECRETARY', $roles, true)
            && !in_array('ROLE_ADMIN', $roles, true)
        ) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Access denied.']);
            return;
        }

        $fullPath = self::UPLOAD_DIR . '/' . $doc['file_path'];
        if (!file_exists($fullPath)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'File not found on server.']);
            return;
        }

        // Track download
        $this->db->prepare(
            'UPDATE patient_document SET download_count = download_count + 1, last_downloaded_at = NOW() WHERE id = ?'
        )->execute([$docId]);

        // Send file
        header('Content-Type: ' . ($doc['mime_type'] ?: 'application/octet-stream'));
        header('Content-Disposition: inline; filename="' . $doc['file_name'] . '"');
        header('Content-Length: ' . filesize($fullPath));
        header('Cache-Control: private');
        readfile($fullPath);
        exit;
    }

    // =========================================================================
    // GET /api/documents/my
    // Patient's received documents.
    // =========================================================================
    public function myDocuments(): array
    {
        $patientId = $this->currentUserId(['ROLE_PATIENT']);
        if (is_array($patientId)) {
            return $patientId;
        }

        $stmt = $this->db->prepare(
            "SELECT d.id, d.file_name, d.file_size, d.mime_type, d.download_count,
                    d.last_downloaded_at, d.created_at,
                    COALESCE(d.document_type, r.document_type) AS document_type,
                    r.status AS request_status,
                    su.name AS uploaded_by
               FROM patient_document d
               LEFT JOIN document_request r ON r.id = d.document_request_id
               LEFT JOIN `user` su ON su.id = d.uploaded_by_user_id
              WHERE d.patient_user_id = ?
              ORDER BY d.created_at DESC"
        );
        $stmt->execute([$patientId]);

        $documents = array_map(static function (array $r): array {
            return [
                'id'              => (int) $r['id'],
                'fileName'        => $r['file_name'],
                'fileSize'        => (int) $r['file_size'],
                'mimeType'        => $r['mime_type'],
                'documentType'    => $r['document_type'],
                'uploadedBy'      => $r['uploaded_by'],
                'downloadCount'   => (int) $r['download_count'],
                'lastDownloaded'  => $r['last_downloaded_at'],
                'createdAt'       => $r['created_at'],
            ];
        }, $stmt->fetchAll());

        return ['success' => true, 'documents' => $documents, 'total' => count($documents)];
    }

    // =========================================================================
    // INTERNAL: Generate consultation report PDF
    //
    // Called by ConsultationController when a doctor ends a consultation
    // and submits the report. Generates a professional PDF and stores it
    // as a patient_document record.
    //
    // Returns the document ID on success, null on failure.
    // =========================================================================
    public function generateConsultationReport(
        int $appointmentId,
        int $doctorId,
        int $patientId,
        array $report,
        string $doctorName,
        string $patientName,
        string $appointmentDate
    ): ?int {
        // Load FPDF
        require_once __DIR__ . '/../lib/fpdf/fpdf.php';

        // Create upload directory
        if (!is_dir(self::UPLOAD_DIR)) {
            mkdir(self::UPLOAD_DIR, 0755, true);
        }

        // Generate PDF
        $pdf = new \FPDF();
        $pdf->AddPage();
        $pdf->SetAutoPageBreak(true, 15);

        // Header
        $pdf->SetFont('Arial', 'B', 18);
        $pdf->Cell(0, 12, 'MedSecretary - Consultation Report', 0, 1, 'C');
        $pdf->Ln(5);

        // Divider
        $pdf->SetDrawColor(200, 200, 200);
        $pdf->Line(10, $pdf->GetY(), 200, $pdf->GetY());
        $pdf->Ln(8);

        // Meta info
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(50, 6, 'Date:', 0, 0);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 6, $appointmentDate, 0, 1);

        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(50, 6, 'Doctor:', 0, 0);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 6, $doctorName, 0, 1);

        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(50, 6, 'Patient:', 0, 0);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 6, $patientName, 0, 1);
        $pdf->Ln(8);

        // Diagnosis
        if (!empty($report['diagnosis'])) {
            $pdf->SetFont('Arial', 'B', 12);
            $pdf->Cell(0, 8, 'Diagnosis', 0, 1);
            $pdf->SetFont('Arial', '', 10);
            $pdf->MultiCell(0, 5, $this->utf8ToWin($report['diagnosis']));
            $pdf->Ln(5);
        }

        // Clinical Notes
        if (!empty($report['notes'])) {
            $pdf->SetFont('Arial', 'B', 12);
            $pdf->Cell(0, 8, 'Clinical Notes', 0, 1);
            $pdf->SetFont('Arial', '', 10);
            $pdf->MultiCell(0, 5, $this->utf8ToWin($report['notes']));
            $pdf->Ln(5);
        }

        // Prescription
        if (!empty($report['prescription'])) {
            $pdf->SetFont('Arial', 'B', 12);
            $pdf->Cell(0, 8, 'Prescription', 0, 1);
            $pdf->SetFont('Arial', '', 10);
            $pdf->MultiCell(0, 5, $this->utf8ToWin($report['prescription']));
            $pdf->Ln(5);
        }

        // Recommended Examinations
        if (!empty($report['recommendedExaminations'])) {
            $pdf->SetFont('Arial', 'B', 12);
            $pdf->Cell(0, 8, 'Recommended Examinations', 0, 1);
            $pdf->SetFont('Arial', '', 10);
            $pdf->MultiCell(0, 5, $this->utf8ToWin($report['recommendedExaminations']));
            $pdf->Ln(5);
        }

        // Follow-up Instructions
        if (!empty($report['followUpInstructions'])) {
            $pdf->SetFont('Arial', 'B', 12);
            $pdf->Cell(0, 8, 'Follow-up Instructions', 0, 1);
            $pdf->SetFont('Arial', '', 10);
            $pdf->MultiCell(0, 5, $this->utf8ToWin($report['followUpInstructions']));
            $pdf->Ln(5);
        }

        // Next Appointment Recommendation
        if (!empty($report['nextAppointmentRecommended'])) {
            $pdf->SetFont('Arial', 'B', 12);
            $pdf->Cell(0, 8, 'Next Appointment', 0, 1);
            $pdf->SetFont('Arial', '', 10);
            $pdf->Cell(0, 5, 'Recommended', 0, 1);
            if (!empty($report['nextAppointmentReason'])) {
                $pdf->MultiCell(0, 5, $this->utf8ToWin($report['nextAppointmentReason']));
            }
            $pdf->Ln(5);
        }

        // Footer
        $pdf->Ln(10);
        $pdf->SetDrawColor(200, 200, 200);
        $pdf->Line(10, $pdf->GetY(), 200, $pdf->GetY());
        $pdf->Ln(5);
        $pdf->SetFont('Arial', 'I', 8);
        $pdf->Cell(0, 5, 'Generated by MedSecretary Platform on ' . date('Y-m-d H:i:s'), 0, 1, 'C');

        // Save PDF
        $uniqueName = sprintf(
            'Consultation_Report_%d_%s.pdf',
            $appointmentId,
            bin2hex(random_bytes(4))
        );
        $destPath = self::UPLOAD_DIR . '/' . $uniqueName;
        $pdfContent = $pdf->Output('S'); // Return as string

        if (file_put_contents($destPath, $pdfContent) === false) {
            return null;
        }

        $fileSize = strlen($pdfContent);

        // Insert into patient_document (no document_request_id)
        $stmt = $this->db->prepare(
            'INSERT INTO patient_document
                 (document_request_id, patient_user_id, uploaded_by_user_id,
                  document_type, file_name, file_path, file_size, mime_type)
             VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $patientId,
            $doctorId,
            'consultation_report',
            sprintf('Consultation_Report_%d.pdf', $appointmentId),
            $uniqueName,
            $fileSize,
            'application/pdf',
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * Convert UTF-8 to Windows-1252 (ISO-8859-1) for FPDF.
     * FPDF's built-in fonts don't support UTF-8.
     */
    private function utf8ToWin(string $str): string
    {
        return mb_convert_encoding($str, 'windows-1252', 'UTF-8');
    }

    // =========================================================================
    // Internals
    // =========================================================================

    private function findRequest(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM document_request WHERE id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    private function shapeRequest(int $id): ?array
    {
        $row = $this->findRequest($id);
        if ($row === null) return null;

        $stmt = $this->db->prepare(
            "SELECT u.name, p.avatar_url
               FROM `user` u
               LEFT JOIN user_profile p ON p.user_id = u.id
              WHERE u.id = ?"
        );
        $stmt->execute([$row['patient_user_id']]);
        $patient = $stmt->fetch();

        return $this->shapeRequestRow(array_merge($row, [
            'patient_name'    => $patient ? $patient['name'] : 'Unknown',
            'patient_avatar'  => $patient ? $patient['avatar_url'] : null,
            'secretary_name'  => null,
            'document_id'     => null,
            'file_name'       => null,
            'upload_date'     => null,
        ]));
    }

    private function shapeRequestRow(array $r): array
    {
        return [
            'id'               => (int) $r['id'],
            'patientId'        => (int) $r['patient_user_id'],
            'patientName'      => $r['patient_name'] ?? 'Unknown',
            'patientAvatar'    => $r['patient_avatar'] ?? null,
            'documentType'     => $r['document_type'],
            'documentTypeLabel' => $this->typeLabel($r['document_type']),
            'note'             => $r['note'],
            'status'           => $r['status'],
            'rejectionReason'  => $r['rejection_reason'] ?? null,
            'secretaryMessage' => $r['secretary_message'] ?? null,
            'secretaryName'    => $r['secretary_name'] ?? null,
            'processedAt'      => $r['processed_at'] ?? null,
            'createdAt'        => $r['created_at'],
            'document'         => isset($r['document_id']) && $r['document_id'] !== null ? [
                'id'         => (int) $r['document_id'],
                'fileName'   => $r['file_name'],
                'uploadDate' => $r['upload_date'],
            ] : null,
        ];
    }

    private function typeLabel(string $type): string
    {
        return ucwords(str_replace('_', ' ', $type));
    }

    private function intParam(array $data, string $key): ?int
    {
        $val = $data[$key] ?? null;
        if (is_int($val)) return $val;
        if (is_string($val) && ctype_digit($val)) return (int) $val;
        return null;
    }

    private function requireAuth()
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        $userId = (int) $m[1];
        $stmt = $this->db->prepare('SELECT id FROM `user` WHERE id = ?');
        $stmt->execute([$userId]);
        if ($stmt->fetchColumn() === false) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        return $userId;
    }

    private function userRoles(int $userId): array
    {
        $stmt = $this->db->prepare('SELECT roles FROM `user` WHERE id = ?');
        $stmt->execute([$userId]);
        $roles = $stmt->fetchColumn();
        if ($roles === false) return [];
        $decoded = json_decode((string) $roles, true);
        return is_array($decoded) ? $decoded : [];
    }

    /** @return int|array */
    private function currentUserId(array $requiredRoles)
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer\s+token_(\d+)$/', trim($header), $m)) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        $userId = (int) $m[1];
        $stmt = $this->db->prepare('SELECT roles FROM `user` WHERE id = ?');
        $stmt->execute([$userId]);
        $roles = $stmt->fetchColumn();
        if ($roles === false) {
            return ['success' => false, 'error' => 'Not authenticated.', 'status' => 401];
        }
        $decoded = json_decode((string) $roles, true);
        if (!is_array($decoded) || empty(array_intersect($decoded, $requiredRoles))) {
            return ['success' => false, 'error' => 'You do not have permission for this action.', 'status' => 403];
        }
        return $userId;
    }
}
