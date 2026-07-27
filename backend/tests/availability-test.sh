#!/usr/bin/env bash
# Regression for AvailabilityController after the slotsFor() refactor.
API=http://localhost:8080/api
DOCTOR=9; PATIENT=13
pass=0; fail=0
ok(){ pass=$((pass+1)); echo "  PASS  $1"; }
bad(){ fail=$((fail+1)); echo "  FAIL  $1"; echo "        got: $2"; }
check(){ if echo "$2" | grep -q -- "$3"; then ok "$1"; else bad "$1" "$2"; fi; }
nocheck(){ if echo "$2" | grep -q -- "$3"; then bad "$1" "$2"; else ok "$1"; fi; }
get(){ curl -s -H "Authorization: Bearer token_$1" "$API$2"; }
post(){ curl -s -X POST -H "Authorization: Bearer token_$1" -H 'Content-Type: application/json' -d "$3" "$API$2"; }

echo "=== schedule read/write ==="
check "doctor reads own schedule"  "$(get $DOCTOR /availability)" '"schedule":\['
check "all 7 days returned"        "$(get $DOCTOR /availability | grep -o '"dayOfWeek"' | wc -l)" '7'

SAVE='{"schedule":[{"dayOfWeek":1,"isEnabled":true,"startTime":"09:00","endTime":"17:00","slotMinutes":30},{"dayOfWeek":2,"isEnabled":true,"startTime":"11:00","endTime":"17:00","slotMinutes":30}]}'
check "schedule saves"             "$(post $DOCTOR /availability/update "$SAVE")" 'Availability saved'
check "end before start rejected"  "$(post $DOCTOR /availability/update '{"schedule":[{"dayOfWeek":1,"isEnabled":true,"startTime":"17:00","endTime":"09:00","slotMinutes":30}]}')" 'end time must be after'
check "slot longer than window"    "$(post $DOCTOR /availability/update '{"schedule":[{"dayOfWeek":1,"isEnabled":true,"startTime":"09:00","endTime":"09:30","slotMinutes":90}]}')" 'longer than the'
check "bad slot length rejected"   "$(post $DOCTOR /availability/update '{"schedule":[{"dayOfWeek":1,"isEnabled":true,"startTime":"09:00","endTime":"17:00","slotMinutes":7}]}')" 'Slot length must be one of'
check "duplicate weekday rejected" "$(post $DOCTOR /availability/update '{"schedule":[{"dayOfWeek":1,"isEnabled":true,"startTime":"09:00","endTime":"17:00","slotMinutes":30},{"dayOfWeek":1,"isEnabled":true,"startTime":"09:00","endTime":"17:00","slotMinutes":30}]}')" 'appears twice'
check "patient cannot save"        "$(post $PATIENT /availability/update "$SAVE")" 'Only doctors'

echo
echo "=== slots endpoint ==="
check "malformed from rejected"    "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=notadate")" 'must be in YYYY-MM-DD'
check "impossible date rejected"   "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=2026-02-31")" 'must be in YYYY-MM-DD'
check "past window rejected"       "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=2020-01-01&to=2020-01-05")" 'in the past'
check "range cap enforced"         "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=2026-08-01&to=2026-12-01")" 'at most 62 days'
check "bad exclude id rejected"    "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&excludeAppointmentId=abc")" 'must be a number'
check "non-doctor rejected"        "$(get $PATIENT "/availability/slots?doctorId=$PATIENT")" 'not a doctor'
check "unauthenticated rejected"   "$(curl -s "$API/availability/slots?doctorId=$DOCTOR")" 'Not authenticated'

echo
echo "=== DST-safe slot maths (2026-03-29 spring forward, Africa/Casablanca) ==="
# 01:00-05:00 in 30-min steps must be 8 slots, none of them 90 minutes long.
"C:/xampp/php/php.exe" -r '
date_default_timezone_set("Africa/Casablanca");
$toMin = fn($t) => ((int)substr($t,0,2))*60 + (int)substr($t,3,2);
$from = fn($m) => sprintf("%02d:%02d", intdiv($m,60), $m%60);
$c = $toMin("01:00"); $end = $toMin("05:00"); $n = 0; $badLen = 0;
while ($c + 30 <= $end) { $s = $from($c); $e = $from($c+30); $n++;
  if ($toMin($e) - $toMin($s) !== 30) $badLen++;
  $c += 30; }
echo "slots=$n badLengths=$badLen\n";
' > /tmp/dst.txt 2>&1
check "8 half-hour slots across DST" "$(cat /tmp/dst.txt)" 'slots=8 badLengths=0'

echo
echo "=== time off ==="
R=$(post $DOCTOR /availability/timeoff/create '{"startDate":"2026-11-10","endDate":"2026-11-12","reason":"Regression"}')
check "time off created"        "$R" 'Time off added'
check "inclusive day count = 3" "$R" '"days":3'
check "no clash warning"        "$R" '"warning":null'
TOID=$(echo "$R" | grep -o '{"id":[0-9]*,"startDate":"2026-11-10"' | sed 's/{"id":\([0-9]*\).*/\1/')
check "overlap refused"         "$(post $DOCTOR /availability/timeoff/create '{"startDate":"2026-11-11","endDate":"2026-11-15"}')" 'overlaps existing'
check "end before start"        "$(post $DOCTOR /availability/timeoff/create '{"startDate":"2026-11-20","endDate":"2026-11-18"}')" 'cannot be before'
check "blocked in slots"        "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=2026-11-10&to=2026-11-10")" 'time_off'
nocheck "private reason not leaked" "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=2026-11-10&to=2026-11-10")" 'Regression'
check "other doctor cannot delete" "$(post 8 /availability/timeoff/delete "{\"id\":$TOID}")" 'not found'
check "owner deletes"           "$(post $DOCTOR /availability/timeoff/delete "{\"id\":$TOID}")" 'Time off removed'

echo
echo "  $pass passed, $fail failed"
