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
require_once __DIR__ . '/AiChatController.php';
require_once __DIR__ . '/DoctorPatientController.php';
require_once __DIR__ . '/Notifier.php';
require_once __DIR__ . '/ScheduleAdjuster.php';
require_once __DIR__ . '/ConsultationController.php';
require_once __DIR__ . '/AdjustmentController.php';
require_once __DIR__ . '/NotificationController.php';
require_once __DIR__ . '/RatingController.php';
require_once __DIR__ . '/DocumentRequestController.php';
require_once __DIR__ . '/FollowUpController.php';
require_once __DIR__ . '/LiveChatController.php';

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Parse JSON body (skip for multipart/form-data which PHP handles via $_POST/$_FILES)
$body = [];
$badJson = false;
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if ($method === 'POST' && stripos($contentType, 'multipart/form-data') === false) {
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
$aiChat = new AiChatController();
$doctorPatients = new DoctorPatientController();
$consultations  = new ConsultationController();
$adjustments    = new AdjustmentController();
$notifications  = new NotificationController();
$ratings        = new RatingController();
$docRequests    = new DocumentRequestController();
$followUps      = new FollowUpController();
$liveChat       = new LiveChatController();

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

        // --- Patient AI chat. Gemini is invoked server-side only. ---
        case 'POST /api/ai/chat':
            $result = $aiChat->reply($body);
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

        case 'POST /api/consultations/auto-start':
            $result = $consultations->autoStart();
            break;

        // --- Doctor ratings. Patients submit; everyone reads stats.
        case 'POST /api/ratings/submit':
            $result = $ratings->submit($body);
            break;

        case 'GET /api/ratings/doctor':
            $result = $ratings->doctorStats($_GET);
            break;

        case 'GET /api/ratings/doctor/reviews':
            $result = $ratings->doctorReviews($_GET);
            break;

        case 'GET /api/ratings/check':
            $result = $ratings->check($_GET);
            break;

        case 'GET /api/ratings/pending':
            $result = $ratings->pending($_GET);
            break;

        case 'GET /api/ratings/all':
            $result = $ratings->allRatings($_GET);
            break;

        // --- Document requests. Patients request; secretaries process and upload.
        case 'POST /api/documents/request':
            $result = $docRequests->create($body);
            break;

        case 'GET /api/documents/requests':
            $result = $docRequests->listRequests($_GET);
            break;

        case 'POST /api/documents/approve':
            $result = $docRequests->approve($body);
            break;

        case 'POST /api/documents/reject':
            $result = $docRequests->reject($body);
            break;

        case 'POST /api/documents/upload':
            $result = $docRequests->upload();
            break;

        case 'GET /api/documents/download':
            // This endpoint streams a file and calls exit, so it doesn't
            // return a normal JSON result. Handle it here directly.
            $docRequests->download($_GET);
            exit;

        case 'GET /api/documents/my':
            $result = $docRequests->myDocuments();
            break;

        // --- Follow-up recommendations. Doctor creates; patient accepts/books.
        case 'POST /api/followups/create':
            $result = $followUps->create($body);
            break;

        case 'GET /api/followups/doctor':
            $result = $followUps->doctorList($_GET);
            break;

        case 'GET /api/followups/patient':
            $result = $followUps->patientList();
            break;

        case 'GET /api/followups/secretary':
            $result = $followUps->secretaryList();
            break;

        case 'GET /api/followups/calendar':
            $result = $followUps->calendar($_GET);
            break;

        case 'POST /api/followups/secretary/book':
            $result = $followUps->secretaryBook($body);
            break;

        case 'POST /api/followups/book':
            $result = $followUps->book($body);
            break;

        case 'POST /api/followups/reminders':
            $result = $followUps->checkReminders();
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

        // --- Secretary ↔ Patient Live Chat ---
        case 'POST /api/livechat/start':
            $result = $liveChat->start();
            break;

        case 'GET /api/livechat/my':
            $result = $liveChat->myChat();
            break;

        case 'GET /api/livechat/waiting':
            $result = $liveChat->waitingQueue();
            break;

        case 'GET /api/livechat/active':
            $result = $liveChat->myActiveChats();
            break;

        case 'POST /api/livechat/accept':
            $result = $liveChat->accept($body);
            break;

        case 'GET /api/livechat/messages':
            $result = $liveChat->messages($_GET);
            break;

        case 'POST /api/livechat/message':
            $result = $liveChat->sendMessage($body);
            break;

        case 'POST /api/livechat/close':
            $result = $liveChat->close($body);
            break;

        case 'GET /api/livechat/poll':
            $result = $liveChat->poll($_GET);
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
