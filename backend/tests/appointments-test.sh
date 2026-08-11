#!/usr/bin/env bash
# End-to-end test of the appointment module.
API=http://localhost:8080/api
PATIENT=13; PATIENT2=14; DOCTOR=8; SECRETARY=12; ADMIN=7

pass=0; fail=0
ok()   { pass=$((pass+1)); echo "  PASS  $1"; }
bad()  { fail=$((fail+1)); echo "  FAIL  $1"; echo "        got: $2"; }
check(){ # check <label> <json> <expected-substring>
  if echo "$2" | grep -q -- "$3"; then ok "$1"; else bad "$1" "$2"; fi
}
get()  { curl -s -H "Authorization: Bearer token_$1" "$API$2"; }
post() { curl -s -X POST -H "Authorization: Bearer token_$1" -H 'Content-Type: application/json' -d "$3" "$API$2"; }

echo "=== setup: find a free slot ==="
SLOTS=$(get $PATIENT "/availability/slots?doctorId=$DOCTOR")
DATE=$(echo "$SLOTS" | grep -o '"date":"[^"]*","dayOfWeek":[0-9]*,"slots":\[{"start":"[^"]*"' | head -1 | sed 's/.*"date":"\([^"]*\)".*/\1/')
TIME=$(echo "$SLOTS" | grep -o '"date":"[^"]*","dayOfWeek":[0-9]*,"slots":\[{"start":"[^"]*"' | head -1 | sed 's/.*"start":"\([^"]*\)".*/\1/')
echo "  first free slot: $DATE $TIME"
[ -z "$DATE" ] && { echo "NO SLOTS - aborting"; exit 1; }

echo
echo "=== 1. patient books ==="
R=$(post $PATIENT /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"$TIME\",\"reason\":\"Chest pain\",\"type\":\"consultation\"}")
check "patient can book"                "$R" '"success":true'
check "patient booking starts pending"  "$R" '"status":"pending"'
APPT=$(echo "$R" | sed 's/.*"appointment":{"id":\([0-9]*\).*/\1/')
echo "  appointment id = $APPT"

echo
echo "=== 2. the slot is now gone from availability ==="
R=$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=$DATE&to=$DATE")
if echo "$R" | grep -q "\"start\":\"$TIME\""; then bad "booked slot removed from slot list" "$R"; else ok "booked slot removed from slot list"; fi

echo
echo "=== 3. double booking is refused ==="
R=$(post $PATIENT2 /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"$TIME\",\"reason\":\"Also wants it\"}")
check "second patient refused"          "$R" 'already booked'
check "  ...with SLOT_TAKEN code"       "$R" 'SLOT_TAKEN'

echo
echo "=== 4. one patient, two doctors, overlapping times ==="
# Deliberately a PARTIAL overlap with different start times: the unique index
# cannot see this one, so it proves the application-level check works.
OV=$("C:/xampp/php/php.exe" "$(dirname "$0")/pick-overlap.php" $PATIENT 9 $DOCTOR)
if [ -z "$OV" ]; then
  echo "  SKIP  no overlapping slot pair available"
else
  ODATE=${OV%%|*}; REST=${OV#*|}; ATIME=${REST%%|*}; BTIME=${REST##*|}
  echo "  $ODATE: doctor 9 @ $ATIME straddles doctor $DOCTOR @ $BTIME"
  R=$(post $PATIENT /appointments/create "{\"doctorId\":9,\"date\":\"$ODATE\",\"time\":\"$ATIME\",\"reason\":\"Overlap A\"}")
  check "  first of the pair books"     "$R" '"success":true'
  OVA=$(echo "$R" | sed 's/.*"appointment":{"id":\([0-9]*\).*/\1/')
  R=$(post $PATIENT /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$ODATE\",\"time\":\"$BTIME\",\"reason\":\"Overlap B\"}")
  check "patient cannot be in two places" "$R" 'one appointment per day'
  [ -n "$OVA" ] && "C:/xampp/mysql/bin/mysql.exe" -u root medisecretary -e "DELETE FROM appointment WHERE id=$OVA" 2>/dev/null
fi

echo
echo "=== 5. invalid slot times ==="
check "off-grid time refused"    "$(post $PATIENT /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"09:07\",\"reason\":\"x\"}")" 'not one of'
check "past date refused"        "$(post $PATIENT /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"2020-01-01\",\"time\":\"09:00\",\"reason\":\"x\"}")" 'already passed'
check "beyond horizon refused"   "$(post $PATIENT /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"2030-01-01\",\"time\":\"09:00\",\"reason\":\"x\"}")" '180 days'
check "empty reason refused"     "$(post $PATIENT /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"$TIME\",\"reason\":\"  \"}")" 'describe the reason'
check "bad type refused"         "$(post $PATIENT /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"$TIME\",\"reason\":\"x\",\"type\":\"surgery\"}")" 'type must be one of'
check "non-doctor refused"       "$(post $PATIENT /appointments/create "{\"doctorId\":$PATIENT2,\"date\":\"$DATE\",\"time\":\"$TIME\",\"reason\":\"x\"}")" 'not a doctor'

echo
echo "=== 6. role separation ==="
check "doctor cannot create"     "$(post $DOCTOR /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"$TIME\",\"reason\":\"x\"}")" 'Only patients and secretaries'
check "admin cannot create"      "$(post $ADMIN /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"$TIME\",\"reason\":\"x\"}")" 'Only patients and secretaries'
check "patient cannot confirm"   "$(post $PATIENT /appointments/status "{\"id\":$APPT,\"status\":\"confirmed\"}")" 'Only the doctor or a secretary'
check "patient cannot complete"  "$(post $PATIENT /appointments/status "{\"id\":$APPT,\"status\":\"completed\"}")" 'Only the doctor'
check "secretary cannot reject"  "$(post $SECRETARY /appointments/status "{\"id\":$APPT,\"status\":\"rejected\"}")" 'Only the doctor'
check "admin cannot confirm"     "$(post $ADMIN /appointments/status "{\"id\":$APPT,\"status\":\"confirmed\"}")" 'Only the doctor or a secretary'
check "stranger cannot see it"   "$(get $PATIENT2 "/appointments/get?id=$APPT")" 'not found'
check "admin can see it"         "$(get $ADMIN "/appointments/get?id=$APPT")" '"success":true'
check "patient stats blocked"    "$(get $PATIENT /appointments/stats)" 'Administrator access required'
check "secretary stats blocked"  "$(get $SECRETARY /appointments/stats)" 'Administrator access required'
check "admin stats allowed"      "$(get $ADMIN /appointments/stats)" '"success":true'

echo
echo "=== 7. notes are staff-only ==="
check "patient list omits notes" "$(get $PATIENT /appointments)" '"notes":null'

echo
echo "=== 8. lifecycle ==="
check "cannot complete a pending appt" "$(post $DOCTOR /appointments/status "{\"id\":$APPT,\"status\":\"completed\"}")" 'Only a confirmed'
check "doctor confirms"                "$(post $DOCTOR /appointments/status "{\"id\":$APPT,\"status\":\"confirmed\"}")" '"status":"confirmed"'
check "cannot confirm twice"           "$(post $DOCTOR /appointments/status "{\"id\":$APPT,\"status\":\"confirmed\"}")" 'this one is confirmed'
check "cannot reject a confirmed appt" "$(post $DOCTOR /appointments/status "{\"id\":$APPT,\"status\":\"rejected\"}")" 'Only a pending'
check "cannot complete before it starts" "$(post $DOCTOR /appointments/status "{\"id\":$APPT,\"status\":\"completed\"}")" 'can be completed once it has begun'

echo
echo "=== 9. reschedule ==="
NEXT=$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=$DATE&to=$DATE" | grep -o '"start":"[^"]*"' | head -1 | sed 's/"start":"\(.*\)"/\1/')
echo "  moving to $NEXT"
check "doctor cannot reschedule"  "$(post $DOCTOR /appointments/reschedule "{\"id\":$APPT,\"date\":\"$DATE\",\"time\":\"$NEXT\"}")" 'cannot reschedule'
R=$(post $PATIENT /appointments/reschedule "{\"id\":$APPT,\"date\":\"$DATE\",\"time\":\"$NEXT\"}")
check "patient reschedules"       "$R" '"success":true'
check "  ...moved time"           "$R" "\"time\":\"$NEXT\""
check "  ...back to pending"      "$R" '"status":"pending"'
check "same time refused"         "$(post $PATIENT /appointments/reschedule "{\"id\":$APPT,\"date\":\"$DATE\",\"time\":\"$NEXT\"}")" 'already the appointment time'

echo
echo "=== 10. old slot was released ==="
R=$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=$DATE&to=$DATE")
if echo "$R" | grep -q "\"start\":\"$TIME\""; then ok "vacated slot is bookable again"; else bad "vacated slot is bookable again" "$R"; fi

echo
echo "=== 11. secretary books for a patient ==="
FREE=$(get $SECRETARY "/availability/slots?doctorId=$DOCTOR&from=$DATE&to=$DATE" | grep -o '"start":"[^"]*"' | head -1 | sed 's/"start":"\(.*\)"/\1/')
R=$(post $SECRETARY /appointments/create "{\"patientId\":$PATIENT2,\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"$FREE\",\"reason\":\"Phone booking\"}")
check "secretary books for patient"    "$R" '"success":true'
check "  ...auto-confirmed"            "$R" '"status":"confirmed"'
APPT2=$(echo "$R" | sed 's/.*"appointment":{"id":\([0-9]*\).*/\1/')
check "secretary needs a patientId"    "$(post $SECRETARY /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"$FREE\",\"reason\":\"x\"}")" 'Choose a patient'
check "secretary cancels"              "$(post $SECRETARY /appointments/cancel "{\"id\":$APPT2,\"reason\":\"Patient called back\"}")" '"status":"cancelled"'
check "cannot cancel twice"            "$(post $SECRETARY /appointments/cancel "{\"id\":$APPT2}")" 'already cancelled'

echo
echo "=== 12. cancelled slot is reusable ==="
R=$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=$DATE&to=$DATE")
if echo "$R" | grep -q "\"start\":\"$FREE\""; then ok "cancelled slot returns to the pool"; else bad "cancelled slot returns to the pool" "$R"; fi

echo
echo "=== 13. patient cancels their own ==="
check "patient cancels"        "$(post $PATIENT /appointments/cancel "{\"id\":$APPT,\"reason\":\"Feeling better\"}")" '"status":"cancelled"'
check "cancel reason recorded" "$(get $PATIENT "/appointments/get?id=$APPT")" 'Feeling better'

echo
echo "=== 14. time off warns about existing bookings ==="
SLOT3=$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=$DATE&to=$DATE" | grep -o '"start":"[^"]*"' | head -1 | sed 's/"start":"\(.*\)"/\1/')
R=$(post $PATIENT /appointments/create "{\"doctorId\":$DOCTOR,\"date\":\"$DATE\",\"time\":\"$SLOT3\",\"reason\":\"Clash test\"}")
APPT3=$(echo "$R" | sed 's/.*"appointment":{"id":\([0-9]*\).*/\1/')
R=$(post $DOCTOR /availability/timeoff/create "{\"startDate\":\"$DATE\",\"reason\":\"Sick\"}")
check "time off warns about clashes" "$R" 'existing appointment'
TOID=$(echo "$R" | grep -o '"startDate":"'"$DATE"'"' >/dev/null && get $DOCTOR /availability | grep -o '{"id":[0-9]*,"startDate":"'"$DATE"'"' | sed 's/{"id":\([0-9]*\).*/\1/')
check "day is now blocked"           "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=$DATE&to=$DATE")" 'time_off'

echo
echo "=== cleanup ==="
[ -n "$TOID" ] && post $DOCTOR /availability/timeoff/delete "{\"id\":$TOID}" > /dev/null
for id in $APPT $APPT2 $APPT3; do
  [ -n "$id" ] && "C:/xampp/mysql/bin/mysql.exe" -u root medisecretary -e "DELETE FROM appointment WHERE id=$id" 2>/dev/null
done
echo "  removed test rows"

echo
echo "=============================="
echo "  $pass passed, $fail failed"
echo "=============================="
