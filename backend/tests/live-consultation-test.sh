#!/usr/bin/env bash
# Live consultation & schedule adjustment.
#
# Builds the exact schedule from the spec (09:00 / 09:30 / 10:00, back to back)
# and drives all three decision branches plus emergency mode.
API=http://localhost:8080/api
MY="C:/xampp/mysql/bin/mysql.exe"
DOCTOR=9; SECRETARY=12; ADMIN=7
PA=13; PB=14; PC=17     # patients A, B, C

pass=0; fail=0
ok(){ pass=$((pass+1)); echo "  PASS  $1"; }
bad(){ fail=$((fail+1)); echo "  FAIL  $1"; echo "        got: $2"; }
check(){ if echo "$2" | grep -q -- "$3"; then ok "$1"; else bad "$1" "$2"; fi; }
nocheck(){ if echo "$2" | grep -q -- "$3"; then bad "$1" "$2"; else ok "$1"; fi; }
get(){ curl -s -H "Authorization: Bearer token_$1" "$API$2"; }
post(){ curl -s -X POST -H "Authorization: Bearer token_$1" -H 'Content-Type: application/json' -d "$3" "$API$2"; }

TODAY=$(date +%Y-%m-%d)

wipe(){ $MY -u root medisecretary -e "
  DELETE FROM appointment_delay_history WHERE appointment_id IN (SELECT id FROM appointment WHERE doctor_user_id=$DOCTOR AND appointment_date='$TODAY');
  DELETE FROM schedule_adjustment_request WHERE doctor_user_id=$DOCTOR;
  DELETE FROM appointment WHERE doctor_user_id=$DOCTOR AND appointment_date='$TODAY';
  -- Every secretary is notified, not just the one this test signs in as, so
  -- clear the whole role or the others accumulate rows run after run.
  DELETE FROM notification WHERE user_id IN ($DOCTOR,$PA,$PB,$PC)
      OR user_id IN (SELECT id FROM user WHERE roles LIKE '%ROLE_SECRETARY%');" 2>/dev/null; }

# seed <patient> <start> <end> <status> -> id
#
# Duration via TIME_TO_SEC, not TIMESTAMPDIFF: the latter wants datetimes and
# silently returns NULL for bare time strings, which fails the NOT NULL column.
seed(){
  $MY -u root medisecretary -N -e "INSERT INTO appointment
    (patient_user_id,doctor_user_id,appointment_date,start_time,end_time,duration_minutes,status,type,reason,created_by_user_id,created_at)
    VALUES ($1,$DOCTOR,'$TODAY','$2:00','$3:00',(TIME_TO_SEC('$3:00')-TIME_TO_SEC('$2:00'))/60,'$4','consultation','Visit for $1',$1,NOW());
    SELECT LAST_INSERT_ID();" | tr -d '\r'; }

# mysql.exe emits CRLF. $() strips the \n but keeps the \r, so an unfiltered id
# is "61\r" — which JSON accepts as whitespace (so requests worked) but which
# never matches in a string comparison.
times(){ $MY -u root medisecretary -N -e "SELECT CONCAT(id,'=',TIME_FORMAT(start_time,'%H:%i'),'-',TIME_FORMAT(end_time,'%H:%i')) FROM appointment WHERE doctor_user_id=$DOCTOR AND appointment_date='$TODAY' ORDER BY start_time;" 2>/dev/null | tr -d '\r' | tr '\n' ' '; }

col(){ $MY -u root medisecretary -N -e "$1" 2>/dev/null | tr -d '\r'; }

# =============================================================================
echo "=== CASE 1: no following appointment -> auto-approve ==="
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
check "consultation starts"     "$(post $DOCTOR /consultations/start "{\"appointmentId\":$A}")" '"status":"in_progress"'
R=$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":15,\"reasonCategory\":\"additional_examination\"}")
check "auto-approved"           "$R" '"outcome":"approved"'
check "  ...basis is no_next"   "$R" '"basis":"no_next"'
check "  ...nothing affected"   "$R" '"affected":\[\]'
check "end time moved to 09:45" "$(times)" "$A=09:00-09:45"
check "no secretary request"    "$(get $SECRETARY "/adjustments?status=pending")" '"pendingCount":0'
check "doctor was notified"     "$(get $DOCTOR /notifications)" 'Consultation extended by 15 minutes'

# =============================================================================
echo
echo "=== CASE 2: fits in the free gap -> auto-approve ==="
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
B=$(seed $PB "10:00" "10:30" confirmed)     # 30-minute gap after A
post $DOCTOR /consultations/start "{\"appointmentId\":$A}" > /dev/null
R=$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":20,\"reasonCategory\":\"patient_explanation\"}")
check "auto-approved"            "$R" '"outcome":"approved"'
check "  ...basis is free_gap"   "$R" '"basis":"free_gap"'
check "  ...nobody affected"     "$R" '"affected":\[\]'
check "A ends 09:50, B untouched" "$(times)" "$A=09:00-09:50 $B=10:00-10:30"
check "no secretary request"     "$(get $SECRETARY "/adjustments?status=pending")" '"pendingCount":0'
nocheck "patient B not notified" "$(get $PB /notifications)" 'moved to'

# =============================================================================
echo
echo "=== CASE 3: the spec's example -> secretary approval, then cascade ==="
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
B=$(seed $PB "09:30" "10:00" confirmed)
C=$(seed $PC "10:00" "10:30" confirmed)
echo "  before: $(times)"
post $DOCTOR /consultations/start "{\"appointmentId\":$A}" > /dev/null
R=$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":10,\"reasonCategory\":\"patient_explanation\",\"reason\":\"Patient needs more explanation\"}")
check "needs approval"           "$R" '"outcome":"needs_approval"'
check "  ...basis is conflict"   "$R" '"basis":"conflict"'
check "  ...2 appointments listed" "$R" '"delay":10'
check "nothing moved yet"        "$(times)" "$A=09:00-09:30 $B=09:30-10:00 $C=10:00-10:30"
REQ=$(echo "$R" | sed 's/.*"requestId":\([0-9]*\).*/\1/')

check "secretary sees it pending"  "$(get $SECRETARY "/adjustments?status=pending")" '"pendingCount":1'
check "  ...with the reason"       "$(get $SECRETARY "/adjustments?status=pending")" 'Patient needs more explanation'
check "secretary was notified"     "$(get $SECRETARY /notifications)" 'needs 10 extra minutes'
check "doctor sees own request"    "$(get $DOCTOR /adjustments)" "\"id\":$REQ"
check "duplicate request refused"  "$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":5}")" 'already have a request waiting'

echo "  --- role checks ---"
check "doctor cannot decide"    "$(post $DOCTOR /adjustments/decide "{\"id\":$REQ,\"decision\":\"approve\"}")" 'Only a secretary'
check "admin cannot decide"     "$(post $ADMIN  /adjustments/decide "{\"id\":$REQ,\"decision\":\"approve\"}")" 'Only a secretary'
check "patient cannot decide"   "$(post $PA     /adjustments/decide "{\"id\":$REQ,\"decision\":\"approve\"}")" 'Only a secretary'
check "patient cannot see queue" "$(get $PA /adjustments)" 'Staff access required'

echo "  --- approve ---"
R=$(post $SECRETARY /adjustments/decide "{\"id\":$REQ,\"decision\":\"approve\"}")
check "secretary approves"       "$R" '"success":true'
check "  ...2 appointments moved" "$R" '"shifted":2'
check "SPEC: 09:00-09:40 / 09:40-10:10 / 10:10-10:40" "$(times)" "$A=09:00-09:40 $B=09:40-10:10 $C=10:10-10:40"
check "cannot decide twice"      "$(post $SECRETARY /adjustments/decide "{\"id\":$REQ,\"decision\":\"reject\"}")" 'already been approved'
check "patient B notified"       "$(get $PB /notifications)" 'now starts at 09:40'
check "patient C notified"       "$(get $PC /notifications)" 'now starts at 10:10'
check "doctor notified"          "$(get $DOCTOR /notifications)" 'Extra time approved'

echo "  --- audit trail ---"
H=$(get $SECRETARY "/adjustments/history?appointmentId=$B")
check "history recorded"        "$H" '"changeType":"cascade"'
check "  ...records the before" "$H" '"start":"09:30"'
check "  ...records the after"  "$H" '"start":"09:40"'
check "  ...and the reason"     "$H" 'Patient needs more explanation'
check "extension logged too"    "$(get $SECRETARY "/adjustments/history?appointmentId=$A")" '"changeType":"extension"'

# =============================================================================
echo
echo "=== CASE 3b: a later gap absorbs the cascade ==="
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
B=$(seed $PB "09:30" "10:00" confirmed)
C=$(seed $PC "11:00" "11:30" confirmed)     # an hour later — should not move
post $DOCTOR /consultations/start "{\"appointmentId\":$A}" > /dev/null
R=$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":10}")
REQ=$(echo "$R" | sed 's/.*"requestId":\([0-9]*\).*/\1/')
post $SECRETARY /adjustments/decide "{\"id\":$REQ,\"decision\":\"approve\"}" > /dev/null
check "only B moved; C untouched" "$(times)" "$A=09:00-09:40 $B=09:40-10:10 $C=11:00-11:30"
nocheck "patient C not notified"  "$(get $PC /notifications)" 'now starts at'

# =============================================================================
echo
echo "=== secretary can grant less than asked (modify) ==="
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
B=$(seed $PB "09:30" "10:00" confirmed)
post $DOCTOR /consultations/start "{\"appointmentId\":$A}" > /dev/null
R=$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":30}")
REQ=$(echo "$R" | sed 's/.*"requestId":\([0-9]*\).*/\1/')
R=$(post $SECRETARY /adjustments/decide "{\"id\":$REQ,\"decision\":\"approve\",\"minutes\":10,\"note\":\"10 is all I can give you\"}")
check "granted 10 not 30"     "$R" '"granted":10'
check "schedule shows +10"    "$(times)" "$A=09:00-09:40 $B=09:40-10:10"
check "doctor told it differs" "$(get $DOCTOR /notifications)" '10 min of the 30'

# =============================================================================
echo
echo "=== reject leaves the schedule alone ==="
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
B=$(seed $PB "09:30" "10:00" confirmed)
post $DOCTOR /consultations/start "{\"appointmentId\":$A}" > /dev/null
R=$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":15}")
REQ=$(echo "$R" | sed 's/.*"requestId":\([0-9]*\).*/\1/')
check "secretary rejects"      "$(post $SECRETARY /adjustments/decide "{\"id\":$REQ,\"decision\":\"reject\",\"note\":\"Fully booked\"}")" '"success":true'
check "schedule unchanged"     "$(times)" "$A=09:00-09:30 $B=09:30-10:00"
check "doctor told"            "$(get $DOCTOR /notifications)" 'Extra time declined'

# =============================================================================
echo
echo "=== EMERGENCY: bypasses the queue ==="
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
B=$(seed $PB "09:30" "10:00" confirmed)
post $DOCTOR /consultations/start "{\"appointmentId\":$A}" > /dev/null
R=$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":20,\"reasonCategory\":\"emergency\",\"isEmergency\":true}")
check "applied immediately"       "$R" '"outcome":"approved"'
check "schedule already shifted"  "$(times)" "$A=09:00-09:50 $B=09:50-10:20"
check "no approval was queued"    "$(get $SECRETARY "/adjustments?status=pending")" '"pendingCount":0'
check "patient told it's an emergency" "$(get $PB /notifications)" 'handling an emergency'
check "secretary informed anyway" "$(get $SECRETARY /notifications)" 'Emergency:'
check "patient marked as delayed" "$(col "SELECT delayed_minutes FROM appointment WHERE id=$B")" '20'

# =============================================================================
echo
echo "=== guards ==="
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
B=$(seed $PB "10:00" "10:30" confirmed)
check "cannot extend before starting" "$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":5}")" 'only be requested during'
post $DOCTOR /consultations/start "{\"appointmentId\":$A}" > /dev/null
check "second live consult refused"   "$(post $DOCTOR /consultations/start "{\"appointmentId\":$B}")" 'already have a consultation in progress'
check "zero minutes refused"          "$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":0}")" 'between 1 and 240'
check "absurd extension refused"      "$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":999}")" 'between 1 and 240'
check "bad category refused"          "$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":5,\"reasonCategory\":\"nope\"}")" 'Unknown reason category'
check "secretary cannot start one"    "$(post $SECRETARY /consultations/start "{\"appointmentId\":$A}")" 'Only doctors'
check "live slot is NOT bookable"     "$(get $PA "/availability/slots?doctorId=$DOCTOR&from=$TODAY&to=$TODAY")" '"date"'
nocheck "  ...09:00 not offered"      "$(get $PA "/availability/slots?doctorId=$DOCTOR&from=$TODAY&to=$TODAY")" '"start":"09:00"'
check "consultation ends"             "$(post $DOCTOR /consultations/end "{\"appointmentId\":$A,\"notes\":\"Reviewed\"}")" '"status":"completed"'
check "  ...notes stored"             "$(get $DOCTOR "/appointments/get?id=$A")" 'Reviewed'

echo
echo "=== pending request is closed when the consultation ends ==="
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
B=$(seed $PB "09:30" "10:00" confirmed)
post $DOCTOR /consultations/start "{\"appointmentId\":$A}" > /dev/null
R=$(post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":15}")
REQ=$(echo "$R" | sed 's/.*"requestId":\([0-9]*\).*/\1/')
check "ending cancels the request" "$(post $DOCTOR /consultations/end "{\"appointmentId\":$A}")" '"cancelledRequests":1'
check "stale approval refused"     "$(post $SECRETARY /adjustments/decide "{\"id\":$REQ,\"decision\":\"approve\"}")" 'already been cancelled'
check "schedule untouched"         "$(times)" "$B=09:30-10:00"

echo
echo "=== notifications ==="
# Guarantee the doctor has one: an extension with nothing after it always
# auto-approves and always notifies them.
wipe
A=$(seed $PA "09:00" "09:30" confirmed)
post $DOCTOR /consultations/start "{\"appointmentId\":$A}" > /dev/null
post $DOCTOR /consultations/extend "{\"appointmentId\":$A,\"minutes\":5}" > /dev/null
check "unread count exposed"   "$(get $DOCTOR /notifications)" '"unreadCount":1'
NID=$(get $DOCTOR /notifications | sed 's/.*"notifications":\[{"id":\([0-9]*\).*/\1/')
check "mark one read"          "$(post $DOCTOR /notifications/read "{\"id\":$NID}")" 'Marked as read'
check "cannot read another's"  "$(post $PB /notifications/read "{\"id\":$NID}")" 'not found'
check "mark all read"          "$(post $DOCTOR /notifications/read '{"all":true}')" 'All notifications marked'
check "unread now zero"        "$(get $DOCTOR /notifications)" '"unreadCount":0'
check "since cursor works"     "$(get $DOCTOR "/notifications?since=999999")" '"notifications":\[\]'

echo
echo "=== cleanup ==="
wipe
echo "  removed seeded rows"
echo
echo "  $pass passed, $fail failed"
