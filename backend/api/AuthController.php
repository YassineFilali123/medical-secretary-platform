<?php

class AuthController
{
    private PDO $db;
    private SmtpMailer $mailer;
    private array $config;

    public function __construct()
    {
        $this->db     = Database::getConnection();
        $this->config = require __DIR__ . '/config.php';
        $this->mailer = new SmtpMailer($this->config);
    }

    // POST /api/register
    public function register(array $data): array
    {
        $name     = trim($data['name'] ?? '');
        $email    = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        if ($name === '' || $email === '' || $password === '') {
            return ['success' => false, 'error' => 'Name, email, and password are required.'];
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'error' => 'Invalid email address.'];
        }
        if (strlen($password) < 6) {
            return ['success' => false, 'error' => 'Password must be at least 6 characters.'];
        }

        $stmt = $this->db->prepare("SELECT id FROM user WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            return ['success' => false, 'error' => 'An account with this email already exists.'];
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $code           = $this->generateCode();
        $expiresAt      = date('Y-m-d H:i:s', time() + $this->config['code_expiry_minutes'] * 60);

        $roleInput = strtolower(trim($data['role'] ?? 'patient'));
        $roleMap = [
            'doctor'    => 'ROLE_DOCTOR',
            'secretary' => 'ROLE_SECRETARY',
            'admin'     => 'ROLE_ADMIN',
            'patient'   => 'ROLE_PATIENT',
        ];
        $role = $roleMap[$roleInput] ?? 'ROLE_PATIENT';
        $rolesJson = json_encode([$role]);

        $stmt = $this->db->prepare(
            "INSERT INTO user (email, password, name, roles, is_verified, verification_code, verification_expires_at, created_at)
             VALUES (?, ?, ?, ?, 0, ?, ?, NOW())"
        );
        $stmt->execute([$email, $hashedPassword, $name, $rolesJson, $code, $expiresAt]);
        $userId = (int) $this->db->lastInsertId();

        $emailSent = false;
        try {
            $this->sendVerificationEmail($email, $name, $code);
            $emailSent = true;
        } catch (\Throwable $e) {
            // Email failed — still allow registration
        }

        $result = [
            'success'  => true,
            'message'  => $emailSent
                ? 'Account created. A verification code has been sent to your email.'
                : 'Account created. Email sending failed — use the debug code below.',
            'userId'   => $userId,
            'email'    => $email,
        ];

        if (!$emailSent) {
            $result['debug_code'] = $code;
        }

        return $result;
    }

    // POST /api/verify
    public function verify(array $data): array
    {
        $email = trim($data['email'] ?? '');
        $code  = trim($data['code'] ?? '');

        if ($email === '' || $code === '') {
            return ['success' => false, 'error' => 'Email and code are required.'];
        }

        $stmt = $this->db->prepare("SELECT * FROM user WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            return ['success' => false, 'error' => 'User not found.'];
        }
        if ($user['is_verified']) {
            return ['success' => false, 'error' => 'Account is already verified.'];
        }
        if ($user['verification_code'] === null || $user['verification_expires_at'] === null) {
            return ['success' => false, 'error' => 'No verification code found. Please request a new one.'];
        }
        if (time() > strtotime($user['verification_expires_at'])) {
            return ['success' => false, 'error' => 'Verification code has expired. Please request a new one.'];
        }
        if (!hash_equals($user['verification_code'], $code)) {
            return ['success' => false, 'error' => 'Invalid verification code.'];
        }

        $stmt = $this->db->prepare(
            "UPDATE user SET is_verified = 1, verification_code = NULL, verification_expires_at = NULL WHERE id = ?"
        );
        $stmt->execute([$user['id']]);

        return [
            'success' => true,
            'message' => 'Email verified successfully. You can now log in.',
        ];
    }

    // POST /api/resend
    public function resend(array $data): array
    {
        $email = trim($data['email'] ?? '');

        if ($email === '') {
            return ['success' => false, 'error' => 'Email is required.'];
        }

        $stmt = $this->db->prepare("SELECT * FROM user WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            return ['success' => false, 'error' => 'User not found.'];
        }
        if ($user['is_verified']) {
            return ['success' => false, 'error' => 'Account is already verified.'];
        }

        $code      = $this->generateCode();
        $expiresAt = date('Y-m-d H:i:s', time() + $this->config['code_expiry_minutes'] * 60);

        $stmt = $this->db->prepare(
            "UPDATE user SET verification_code = ?, verification_expires_at = ? WHERE id = ?"
        );
        $stmt->execute([$code, $expiresAt, $user['id']]);

        $this->sendVerificationEmail($email, $user['name'], $code);

        return [
            'success' => true,
            'message' => 'A new verification code has been sent to your email.',
        ];
    }

    // POST /api/login
    public function login(array $data): array
    {
        $email    = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        if ($email === '' || $password === '') {
            return ['success' => false, 'error' => 'Email and password are required.'];
        }

        $stmt = $this->db->prepare("SELECT * FROM user WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            return ['success' => false, 'error' => 'Invalid email or password.'];
        }
        if (!$user['is_verified']) {
            return [
                'success' => false,
                'error'   => 'Please verify your email before logging in.',
                'needsVerification' => true,
                'email'   => $email,
            ];
        }

        return [
            'success' => true,
            'message' => 'Login successful.',
            'user'    => [
                'id'        => (int) $user['id'],
                'name'      => $user['name'],
                'email'     => $user['email'],
                'roles'     => json_decode($user['roles'], true),
                'isVerified'=> (bool) $user['is_verified'],
                'createdAt' => $user['created_at'],
            ],
        ];
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(100000, 999999), $this->config['code_length'], '0', STR_PAD_LEFT);
    }

    private function sendVerificationEmail(string $toEmail, string $name, string $code): void
    {
        $subject = 'MedSecretary - Verify your email';
        $html    = $this->buildEmailHtml($name, $code);
        $this->mailer->send($toEmail, $subject, $html);
    }

    private function buildEmailHtml(string $name, string $code): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:'Segoe UI',Tahoma,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">MedSecretary</h1>
    </div>
    <div style="padding:40px 32px;">
        <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Hello {$name},</h2>
        <p style="color:#475569;line-height:1.6;margin:0 0 24px;">Your verification code is:</p>
        <div style="background:#f8fafc;border:2px dashed #6366f1;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
            <span style="font-size:36px;font-weight:bold;color:#6366f1;letter-spacing:8px;">{$code}</span>
        </div>
        <p style="color:#475569;line-height:1.6;margin:0 0 16px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:13px;margin:0;">If you did not create this account, ignore this email.</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; 2026 MedSecretary</p>
    </div>
</div>
</body>
</html>
HTML;
    }
}
