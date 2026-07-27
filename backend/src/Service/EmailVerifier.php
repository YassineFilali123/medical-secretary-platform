<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
class EmailVerifier
{
    private const CODE_LENGTH = 6;
    private const CODE_EXPIRY_MINUTES = 10;

    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly UserRepository $userRepository,
    ) {
    }

    public function generateVerificationCode(): string
    {
        return str_pad((string) random_int(100000, 999999), self::CODE_LENGTH, '0', STR_PAD_LEFT);
    }

    public function sendVerificationEmail(User $user): void
    {
        $code = $this->generateVerificationCode();
        $expiresAt = new \DateTimeImmutable('+' . self::CODE_EXPIRY_MINUTES . ' minutes');

        $user->setVerificationCode($code);
        $user->setVerificationExpiresAt($expiresAt);
        $this->userRepository->save($user, true);

        $email = (new Email())
            ->from('gameryassine12s@gmail.com')
            ->to($user->getEmail())
            ->subject('Vérification de votre compte')
            ->html($this->buildVerificationHtml($user->getName(), $code));

        $this->mailer->send($email);
    }

    public function verifyCode(User $user, string $code): bool
    {
        if ($user->isVerified()) {
            return false;
        }

        if ($user->getVerificationCode() === null || $user->getVerificationExpiresAt() === null) {
            return false;
        }

        if (new \DateTimeImmutable() > $user->getVerificationExpiresAt()) {
            return false;
        }

        if (!hash_equals($user->getVerificationCode(), $code)) {
            return false;
        }

        $user->setIsVerified(true);
        $user->setVerificationCode(null);
        $user->setVerificationExpiresAt(null);
        $this->userRepository->save($user, true);

        return true;
    }

    public function isCodeExpired(User $user): bool
    {
        if ($user->getVerificationExpiresAt() === null) {
            return true;
        }
        return new \DateTimeImmutable() > $user->getVerificationExpiresAt();
    }

    public function resendVerificationEmail(User $user): void
    {
        $this->sendVerificationEmail($user);
    }

    private function buildVerificationHtml(string $name, string $code): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
            <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:24px;">MedSecretary</h1>
                </div>
                <div style="padding:40px 32px;">
                    <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Bonjour {$name},</h2>
                    <p style="color:#475569;line-height:1.6;margin:0 0 24px;">Merci de vous être inscrit. Votre code de vérification est :</p>
                    <div style="background:#f8fafc;border:2px dashed #6366f1;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
                        <span style="font-size:36px;font-weight:bold;color:#6366f1;letter-spacing:8px;">{$code}</span>
                    </div>
                    <p style="color:#475569;line-height:1.6;margin:0 0 16px;">Ce code est valable pendant <strong>10 minutes</strong>.</p>
                    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet e-mail.</p>
                </div>
                <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
                    <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 MedSecretary. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
        HTML;
    }
}
