<?php

/**
 * Pushes live-chat events to the realtime (WebSocket) server.
 *
 * This is the ONLY thing PHP does for realtime. The message has already been
 * validated, authorised and committed by LiveChatController before anything
 * here runs — this just tells connected sockets that it happened.
 *
 * FAILURE IS NOT AN ERROR
 *   Every call is best-effort and short-timeout. If the realtime process is not
 *   running, chat must still work: the message is already in the database and
 *   the history endpoint will return it. A chat that refuses to send because a
 *   push relay is down would be a far worse failure than one that arrives on
 *   the next page load.
 */
class RealtimeNotifier
{
    /** Kept short — the API response must not wait on a push. */
    private const TIMEOUT_SECONDS = 1;

    private string $publishUrl;
    private string $secret;

    public function __construct()
    {
        $config = require __DIR__ . '/config.php';

        $this->publishUrl = $config['realtime_publish_url'] ?? 'http://127.0.0.1:8081/publish';
        $this->secret     = $config['realtime_secret'] ?? 'local-dev-realtime-secret';
    }

    /** A new message was stored in this conversation. */
    public function message(int $chatId, array $message): void
    {
        $this->publish($chatId, 'message', $message);
    }

    /**
     * A secretary accepted the conversation.
     *
     * Goes to the conversation (so the patient learns who joined) and to the
     * lobby (so it leaves every other secretary's waiting queue).
     */
    public function accepted(int $chatId, array $chat): void
    {
        $this->publish($chatId, 'accepted', $chat, true);
    }

    /** The conversation was closed. */
    public function closed(int $chatId, array $chat): void
    {
        $this->publish($chatId, 'closed', $chat);
    }

    /**
     * A patient joined the waiting queue.
     *
     * Nobody is subscribed to this conversation yet, so it is announced to the
     * lobby — the room every secretary watching the queue is in.
     */
    public function waiting(int $chatId, array $chat): void
    {
        $this->publish($chatId, 'waiting', $chat, true);
    }

    /** @param bool $lobby Also deliver to every secretary watching the queue. */
    private function publish(int $chatId, string $event, array $data, bool $lobby = false): void
    {
        if (!function_exists('curl_init')) {
            return;
        }

        $payload = json_encode([
            'secret' => $this->secret,
            'chatId' => $chatId,
            'event'  => $event,
            'data'   => $data,
            'lobby'  => $lobby,
        ], JSON_UNESCAPED_UNICODE);

        if ($payload === false) {
            return;
        }

        try {
            $request = curl_init($this->publishUrl);
            curl_setopt_array($request, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => self::TIMEOUT_SECONDS,
                CURLOPT_TIMEOUT        => self::TIMEOUT_SECONDS,
            ]);
            curl_exec($request);
            curl_close($request);
        } catch (Throwable $e) {
            // Deliberately swallowed — see the class docblock.
        }
    }
}
