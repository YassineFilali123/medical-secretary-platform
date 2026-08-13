<?php
return [
    'db_host' => '127.0.0.1',
    'db_port' => '3306',
    'db_name' => 'medisecretary',
    'db_user' => 'root',
    'db_pass' => '',

    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => 587,
    'smtp_user' => 'gameryassine12s@gmail.com',
    'smtp_pass' => 'lmifkksehvbwksjk',
    'smtp_from' => 'gameryassine12s@gmail.com',
    'smtp_from_name' => 'MedSecretary',

    // The clinic's timezone. Set explicitly because XAMPP's php.ini ships
    // Europe/Berlin, which put PHP an hour ahead of both Windows and MariaDB —
    // that skewed "is this slot in the past?" and, near midnight, the date.
    'timezone' => 'Africa/Casablanca',

    // Realtime (WebSocket) relay. The secret must match REALTIME_SECRET in
    // backend/realtime/server.js; only the local backend may publish.
    'realtime_publish_url' => 'http://127.0.0.1:8081/publish',
    'realtime_secret' => 'local-dev-realtime-secret',

    'code_length' => 6,
    'code_expiry_minutes' => 10,
];
