<?php
/**
 * Find a date where doctor A has a slot that straddles the middle of one of
 * doctor B's slots, so booking both would put one patient in two rooms at once
 * WITHOUT the two start times being equal (which the unique index would catch).
 * Prints "DATE|A_START|B_START" or nothing.
 */
$api = 'http://localhost:8080/api';
[$script, $tokenId, $docA, $docB] = $argv + [null, '13', '9', '8'];

function slots(string $api, string $token, int $doctor): array
{
    $ctx = stream_context_create(['http' => ['header' => "Authorization: Bearer token_{$token}\r\n"]]);
    $raw = file_get_contents("{$api}/availability/slots?doctorId={$doctor}", false, $ctx);

    return json_decode((string) $raw, true)['days'] ?? [];
}

$toMin = static fn(string $t): int => ((int) substr($t, 0, 2)) * 60 + (int) substr($t, 3, 2);

$a = slots($api, $tokenId, (int) $docA);
$b = slots($api, $tokenId, (int) $docB);

$bByDate = [];
foreach ($b as $day) {
    $bByDate[$day['date']] = $day['slots'];
}

foreach ($a as $day) {
    foreach ($day['slots'] as $slotA) {
        $aStart = $toMin($slotA['start']);
        $aEnd   = $toMin($slotA['end']);

        foreach ($bByDate[$day['date']] ?? [] as $slotB) {
            $bStart = $toMin($slotB['start']);
            // Strictly inside A, and not the same start time.
            if ($bStart > $aStart && $bStart < $aEnd) {
                echo "{$day['date']}|{$slotA['start']}|{$slotB['start']}";
                exit(0);
            }
        }
    }
}
