<?php

// Must run before any date/time work. Without this PHP falls back to whatever
// php.ini says (XAMPP defaults to Europe/Berlin), which can disagree with the
// database and make "now" wrong by hours.
$appConfig = require __DIR__ . '/config.php';
if (!empty($appConfig['timezone'])) {
    date_default_timezone_set($appConfig['timezone']);
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/SmtpMailer.php';
require_once __DIR__ . '/AuthController.php';
require_once __DIR__ . '/ProfileController.php';
require_once __DIR__ . '/SpecialtyController.php';
require_once __DIR__ . '/AvailabilityController.php';
require_once __DIR__ . '/AppointmentController.php';
require_once __DIR__ . '/DoctorPatientController.php';
require_once __DIR__ . '/Notifier.php';
require_once __DIR__ . '/ScheduleAdjuster.php';
require_once __DIR__ . '/ConsultationController.php';
require_once __DIR__ . '/AdjustmentController.php';
require_once __DIR__ . '/NotificationController.php';

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Parse JSON body
$body = [];
$badJson = false;
if ($method === 'POST') {
    $raw = file_get_contents('php://input');

    // Some clients (notably Windows PowerShell's Set-Content -Encoding utf8)
    // prefix the payload with a UTF-8 BOM, which json_decode rejects.
    $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);

    if (trim($raw) === '') {
        $body = [];
    } else {
        $decoded = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
            // Fail loudly instead of silently treating the request as empty.
            $badJson = true;
        } else {
            $body = $decoded;
        }
    }
}

if ($badJson) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Request body is not valid JSON: ' . json_last_error_msg(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$controller = new AuthController();
$profile    = new ProfileController();
$specialty  = new SpecialtyController();
$availability = new AvailabilityController();
$appointments = new AppointmentController();
$doctorPatients = new DoctorPatientController();
$consultations  = new ConsultationController();
$adjustments    = new AdjustmentController();
$notifications  = new NotificationController();

try {
    $notFound = false;

    switch ("{$method} {$uri}") {

        case 'POST /api/register':
            $result = $controller->register($body);
            break;

        case 'POST /api/verify':
            $result = $controller->verify($body);
            break;

        case 'POST /api/resend':
            $result = $controller->resend($body);
            break;

        case 'POST /api/login':
            $result = $controller->login($body);
            break;

        case 'GET /api/profile':
            $result = $profile->show();
            break;

        case 'POST /api/profile/update':
            $result = $profile->update($body);
            break;

        case 'POST /api/profile/password':
            $result = $profile->changePassword($body);
            break;

        // --- Specialties: read is open to any signed-in user (the doctor
        // profile dropdown needs it); every write is admin-only. ---
        case 'GET /api/specialties':
            $result = $specialty->index();
            break;

        case 'POST /api/specialties/create':
            $result = $specialty->create($body);
            break;

        case 'POST /api/specialties/update':
            $result = $specialty->update($body);
            break;

        case 'POST /api/specialties/delete':
            $result = $specialty->delete($body);
            break;

        case 'POST /api/specialties/toggle':
            $result = $specialty->toggle($body);
            break;

        // --- Doctor availability. Writes are the signed-in doctor's own
        // schedule; /slots is readable by anyone signed in so patients can book.
        case 'GET /api/availability':
            $result = $availability->show();
            break;

        case 'POST /api/availability/update':
            $result = $availability->update($body);
            break;

        case 'POST /api/availability/timeoff/create':
            $result = $availability->createTimeOff($body);
            break;

        case 'POST /api/availability/timeoff/delete':
            $result = $availability->deleteTimeOff($body);
            break;

        case 'GET /api/availability/slots':
            $result = $availability->slots($_GET);
            break;

        // --- Appointments. Every handler scopes itself by role: patients see
        // their own, doctors theirs, secretaries and admins the whole clinic.
        case 'GET /api/doctors':
            $result = $appointments->doctors($_GET);
            break;

        case 'GET /api/patients':
            $result = $appointments->patients($_GET);
            break;

        case 'GET /api/appointments':
            $result = $appointments->index($_GET);
            break;

        case 'GET /api/appointments/get':
            $result = $appointments->show($_GET);
            break;

        case 'GET /api/appointments/stats':
            $result = $appointments->stats();
            break;

        case 'POST /api/appointments/create':
            $result = $appointments->create($body);
            break;

        case 'POST /api/appointments/cancel':
            $result = $appointments->cancel($body);
            break;

        case 'POST /api/appointments/reschedule':
            $result = $appointments->reschedule($body);
            break;

        case 'POST /api/appointments/status':
            $result = $appointments->updateStatus($body);
            break;

        // --- A doctor's own patients, derived from who has booked with them.
        case 'GET /api/doctor/patients':
            $result = $doctorPatients->index($_GET);
            break;

        case 'GET /api/doctor/patients/get':
            $result = $doctorPatients->show($_GET);
            break;

        // --- Live consultation. The doctor drives all of these.
        case 'GET /api/consultations/active':
            $result = $consultations->active();
            break;

        case 'POST /api/consultations/start':
            $result = $consultations->start($body);
            break;

        case 'POST /api/consultations/end':
            $result = $consultations->end($body);
            break;

        case 'POST /api/consultations/extend':
            $result = $consultations->extend($body);
            break;

        // --- Schedule adjustment requests. Secretaries decide; doctors read.
        case 'GET /api/adjustments':
            $result = $adjustments->index($_GET);
            break;

        case 'GET /api/adjustments/history':
            $result = $adjustments->history($_GET);
            break;

        case 'POST /api/adjustments/decide':
            $result = $adjustments->decide($body);
            break;

        // --- Notifications, polled by every signed-in client.
        case 'GET /api/notifications':
            $result = $notifications->index($_GET);
            break;

        case 'POST /api/notifications/read':
            $result = $notifications->markRead($body);
            break;

        default:
            $notFound = true;
            $result = ['success' => false, 'error' => 'Endpoint not found.'];
            break;
    }

    // A controller may request a specific status (e.g. 401); otherwise 200/400.
    $status = $result['status'] ?? ($notFound ? 404 : ($result['success'] ? 200 : 400));
    unset($result['status']);

    http_response_code($status);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Server error: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
