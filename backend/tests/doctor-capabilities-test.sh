#!/usr/bin/env bash
# The doctor's four capabilities, end to end:
#   view appointments / accept / reject / mark completed.
#
# Seeds a realistic mix (past, today, future) directly in the database so the
# "already happened" cases can be tested without waiting for the clock.
API=http://localhost:8080/api
MY="C:/xampp/mysql/bin/mysql.exe"
DOCTOR=9; PATIENT=13; OTHER_DOCTOR=8; SECRETARY=12

pass=0; fail=0
ok(){ pass=$((pass+1)); echo "  PASS  $1"; }
bad(){ fail=$((fail+1)); echo "  FAIL  $1"; echo "        got: $2"; }
check(){ if echo "$2" | grep -q -- "$3"; then ok "$1"; else bad "$1" "$2"; fi; }
nocheck(){ if echo "$2" | grep -q -- "$3"; then bad "$1" "$2"; else ok "$1"; fi; }
get(){ curl -s -H "Authorization: Bearer token_$1" "$API$2"; }
post(){ curl -s -X POST -H "Authorization: Bearer token_$1" -H 'Content-Type: application/json' -d "$3" "$API$2"; }

TODAY=$(date +%Y-%m-%d)
YEST=$(date -d "yesterday" +%Y-%m-%d)
LASTWK=$(date -d "7 days ago" +%Y-%m-%d)
TOMORROW=$(date -d "tomorrow" +%Y-%m-%d)

# seed <date> <time> <status> <reason>  -> prints the new id
#
# INSERT and LAST_INSERT_ID() must share one connection — each `mysql -e` opens
# its own, where LAST_INSERT_ID() is 0. End time via ADDTIME, not
# `'10:00:00' + INTERVAL 30 MINUTE`, which reads the string as a DATE and
# returns NULL, failing the NOT NULL column.
seed(){
  $MY -u root medisecretary -N -e "INSERT INTO appointment
    (patient_user_id,doctor_user_id,appointment_date,start_time,end_time,duration_minutes,status,type,reason,created_by_user_id,created_at)
    VALUES ($PATIENT,$DOCTOR,'$1','$2:00',ADDTIME('$2:00','00:30:00'),30,'$3','consultation','$4',$PATIENT,NOW());
    SELECT LAST_INSERT_ID();"
}

echo "=== seeding ==="
OVERDUE=$(seed "$LASTWK"   "10:00" confirmed "Last week, never closed out")
YCONF=$(seed   "$YEST"     "11:00" confirmed "Yesterday visit")
TPEND=$(seed   "$TODAY"    "08:00" pending   "Today request")
FPEND=$(seed   "$TOMORROW" "09:00" pending   "Tomorrow request")
FCONF=$(seed   "$TOMORROW" "10:00" confirmed "Tomorrow confirmed")
echo "  overdue=$OVERDUE yesterday=$YCONF todayPending=$TPEND futurePending=$FPEND futureConfirmed=$FCONF"

echo
echo "=== 1. VIEW: the doctor sees their whole list ==="
ALL=$(get $DOCTOR "/appointments?limit=500")
for id in $OVERDUE $YCONF $TPEND $FPEND $FCONF; do
  check "appointment $id is visible" "$ALL" "\"id\":$id,"
done
# This is the regression that prompted the rebuild: a today-only window hides
# exactly the appointments that still need completing.
OLDVIEW=$(get $DOCTOR "/appointments?from=$TODAY")
nocheck "a from=today window would hide the overdue one" "$OLDVIEW" "\"id\":$OVERDUE,"
check "sees another doctor's? (must not)" "$(get $OTHER_DOCTOR "/appointments?limit=500" | grep -c "\"id\":$OVERDUE,")" '^0$'

echo
echo "=== 2. ACCEPT ==="
check "accepts a pending request"    "$(post $DOCTOR /appointments/status "{\"id\":$TPEND,\"status\":\"confirmed\"}")" '"status":"confirmed"'
check "accepts a future request"     "$(post $DOCTOR /appointments/status "{\"id\":$FPEND,\"status\":\"confirmed\"}")" '"status":"confirmed"'
check "cannot accept twice"          "$(post $DOCTOR /appointments/status "{\"id\":$TPEND,\"status\":\"confirmed\"}")" 'this one is confirmed'
check "cannot accept another doctor's" "$(post $OTHER_DOCTOR /appointments/status "{\"id\":$FCONF,\"status\":\"confirmed\"}")" 'not found'

echo
echo "=== 3. REJECT ==="
REJ=$(seed "$TOMORROW" "14:00" pending "To be rejected")
R=$(post $DOCTOR /appointments/status "{\"id\":$REJ,\"status\":\"rejected\",\"reason\":\"Fully booked that week\"}")
check "rejects a pending request"    "$R" '"status":"rejected"'
check "  ...reason recorded"         "$R" 'Fully booked that week'
check "patient sees the reason"      "$(get $PATIENT "/appointments/get?id=$REJ")" 'Fully booked that week'
check "cannot reject a confirmed"    "$(post $DOCTOR /appointments/status "{\"id\":$FCONF,\"status\":\"rejected\"}")" 'Only a pending'
check "rejected slot is free again"  "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=$TOMORROW&to=$TOMORROW")" '"start":"14:00"'

echo
echo "=== 4. MARK COMPLETED ==="
R=$(post $DOCTOR /appointments/status "{\"id\":$OVERDUE,\"status\":\"completed\",\"notes\":\"Prescribed rest\"}")
check "completes the overdue one"       "$R" '"status":"completed"'
check "  ...notes saved"                "$R" 'Prescribed rest'
check "completes yesterday's"           "$(post $DOCTOR /appointments/status "{\"id\":$YCONF,\"status\":\"completed\"}")" '"status":"completed"'
check "completes today's, once started" "$(post $DOCTOR /appointments/status "{\"id\":$TPEND,\"status\":\"completed\"}")" '"status":"completed"'
check "cannot complete a future one"    "$(post $DOCTOR /appointments/status "{\"id\":$FCONF,\"status\":\"completed\"}")" 'once it has begun'
check "cannot complete twice"           "$(post $DOCTOR /appointments/status "{\"id\":$OVERDUE,\"status\":\"completed\"}")" 'Only a confirmed'
check "secretary cannot complete"       "$(post $SECRETARY /appointments/status "{\"id\":$FPEND,\"status\":\"completed\"}")" 'Only the doctor'

echo
echo "=== 5. clinical notes stay with the clinic ==="
check "doctor reads own notes"    "$(get $DOCTOR "/appointments/get?id=$OVERDUE")" 'Prescribed rest'
nocheck "patient never sees them" "$(get $PATIENT "/appointments/get?id=$OVERDUE")" 'Prescribed rest'
check "patient still sees status" "$(get $PATIENT "/appointments/get?id=$OVERDUE")" '"status":"completed"'

echo
echo "=== 6. a completed visit keeps its slot ==="
nocheck "completed slot not re-offered" "$(get $PATIENT "/availability/slots?doctorId=$DOCTOR&from=$TOMORROW&to=$TOMORROW")" '"start":"10:00"'

echo
echo "=== cleanup ==="
for id in $OVERDUE $YCONF $TPEND $FPEND $FCONF $REJ; do
  [ -n "$id" ] && $MY -u root medisecretary -e "DELETE FROM appointment WHERE id=$id" 2>/dev/null
done
echo "  removed seeded rows"

echo
echo "  $pass passed, $fail failed"
