<?php

class SmtpMailer
{
    private string $host;
    private int $port;
    private string $username;
    private string $password;
    private string $fromEmail;
    private string $fromName;

    private $socket = false;

    public function __construct(array $config)
    {
        $this->host      = $config['smtp_host'];
        $this->port      = $config['smtp_port'];
        $this->username  = $config['smtp_user'];
        $this->password  = $config['smtp_pass'];
        $this->fromEmail = $config['smtp_from'];
        $this->fromName  = $config['smtp_from_name'];
    }

    public function send(string $toEmail, string $subject, string $htmlBody): bool
    {
        $this->connect();
        $this->sendCommand("EHLO localhost", "250");
        $this->sendCommand("STARTTLS", "220");
        $this->startTls();
        $this->sendCommand("EHLO localhost", "250");
        $this->sendAuth();
        $this->sendCommand("MAIL FROM:<{$this->fromEmail}>", "250");
        $this->sendCommand("RCPT TO:<{$toEmail}>", "250");
        $this->sendCommand("DATA", "354");

        $headers  = "From: =?UTF-8?B?" . base64_encode($this->fromName) . "?= <{$this->fromEmail}>\r\n";
        $headers .= "To: <{$toEmail}>\r\n";
        $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "Date: " . date('r') . "\r\n";
        $headers .= "\r\n";

        $this->sendCommand($headers . $htmlBody . "\r\n.", "250");
        $this->sendCommand("QUIT", "221");
        $this->disconnect();

        return true;
    }

    private function connect(): void
    {
        $this->socket = fsockopen($this->host, $this->port, $errno, $errstr, 10);
        if (!$this->socket) {
            throw new RuntimeException("SMTP connection failed: {$errstr} ({$errno})");
        }
        $banner = fgets($this->socket, 512);
        if (strpos($banner, '220') === false) {
            throw new RuntimeException("SMTP banner error: {$banner}");
        }
    }

    private function disconnect(): void
    {
        if (is_resource($this->socket)) {
            fclose($this->socket);
        }
        $this->socket = false;
    }

    private function sendCommand(string $command, string $expectedCode): string
    {
        fwrite($this->socket, $command . "\r\n");
        $response = '';
        while (true) {
            $line = fgets($this->socket, 512);
            $response .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        $code = substr($response, 0, 3);
        if ($code !== $expectedCode) {
            throw new RuntimeException("SMTP error after [{$command}]: {$response}");
        }
        return $response;
    }

    private function startTls(): void
    {
        if (!stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
            throw new RuntimeException("STARTTLS handshake failed");
        }
    }

    private function sendAuth(): void
    {
        $b64User = base64_encode($this->username);
        $b64Pass = base64_encode($this->password);
        $this->sendCommand("AUTH LOGIN", "334");
        $this->sendCommand($b64User, "334");
        $this->sendCommand($b64Pass, "235");
    }
}
