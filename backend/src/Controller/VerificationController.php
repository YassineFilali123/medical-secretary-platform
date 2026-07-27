<?php

namespace App\Controller;

use App\Entity\User;
use App\Form\VerificationFormType;
use App\Repository\UserRepository;
use App\Service\EmailVerifier;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class VerificationController extends AbstractController
{
    public function __construct(
        private readonly EmailVerifier $emailVerifier,
        private readonly UserRepository $userRepository,
    ) {
    }

    #[Route('/verify/email', name: 'app_verify_email')]
    public function verifyEmail(Request $request): Response
    {
        $email = $request->query->get('email', '');

        if (!$email) {
            $this->addFlash('error', 'No email address provided.');
            return $this->redirectToRoute('app_register');
        }

        $user = $this->userRepository->findOneBy(['email' => $email]);

        if (!$user) {
            $this->addFlash('error', 'User not found.');
            return $this->redirectToRoute('app_register');
        }

        if ($user->isVerified()) {
            $this->addFlash('info', 'Your email is already verified. Please log in.');
            return $this->redirectToRoute('app_login');
        }

        $form = $this->createForm(VerificationFormType::class);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $code = trim((string) $form->get('code')->getData());

            if ($this->emailVerifier->isCodeExpired($user)) {
                $this->addFlash('error', 'This code has expired. Please request a new one.');
                return $this->render('registration/verify_email.html.twig', [
                    'form' => $form->createView(),
                    'email' => $email,
                ]);
            }

            if ($this->emailVerifier->verifyCode($user, $code)) {
                $this->addFlash('success', 'Your email has been verified! You can now log in.');
                return $this->redirectToRoute('app_login');
            }

            $this->addFlash('error', 'Invalid verification code. Please try again.');
        }

        return $this->render('registration/verify_email.html.twig', [
            'form' => $form->createView(),
            'email' => $email,
        ]);
    }

    #[Route('/verify/email/resend', name: 'app_verify_email_resend')]
    public function resendVerificationCode(Request $request): Response
    {
        $email = $request->query->get('email', '');

        if (!$email) {
            $this->addFlash('error', 'No email address provided.');
            return $this->redirectToRoute('app_register');
        }

        $user = $this->userRepository->findOneBy(['email' => $email]);

        if (!$user) {
            $this->addFlash('error', 'User not found.');
            return $this->redirectToRoute('app_register');
        }

        if ($user->isVerified()) {
            $this->addFlash('info', 'Your email is already verified.');
            return $this->redirectToRoute('app_login');
        }

        $this->emailVerifier->resendVerificationEmail($user);

        $this->addFlash('success', 'A new verification code has been sent to your email.');

        return $this->redirectToRoute('app_verify_email', ['email' => $email]);
    }
}
