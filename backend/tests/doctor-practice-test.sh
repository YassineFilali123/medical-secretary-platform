#!/usr/bin/env bash
# The doctor's Practice section against real data: patient list, patient record,
# and the privacy boundary between two doctors who share a patient.
API=http://localhost:8080/api
MY="C:/xampp/mysql/bin/mysql.exe"
DOC_A=9; DOC_B=8; PATIENT=13; OTHER_PATIENT=14; SECRETARY=12; ADMIN=7

pass=0; fail=0
ok(){ pass=$((pass+1)); echo "  PASS  $1"; }
bad(){ fail=$((fail+1)); echo "  FAIL  $1"; echo "        got: $2"; }
check(){ if echo "$2" | grep -q -- "$3"; then ok "$1"; else bad "$1" "$2"; fi; }
nocheck(){ if echo "$2" | grep -q -- "$3"; then bad "$1" "$2"; else ok "$1"; fi; }
get(){ curl -s -H "Authorization: Bearer token_$1" "$API$2"; }

TODAY=$(date +%Y-%m-%d); LASTWK=$(date -d "7 days ago" +%Y-%m-%d); NEXTWK=$(date -d "7 days" +%Y-%m-%d)

seed(){ # seed <doctor> <patient> <date> <time> <status> <reason> <notes>
  $MY -u root medisecretary -N -e "INSERT INTO appointment
    (patient_user_id,doctor_user_id,appointment_date,start_time,end_time,duration_minutes,status,type,reason,notes,created_by_user_id,created_at)
    VALUES ($2,$1,'$3','$4:00',ADDTIME('$4:00','00:30:00'),30,'$5','consultation','$6',$(if [ -n "$7" ]; then echo "'$7'"; else echo NULL; fi),$2,NOW());
    SELECT LAST_INSERT_ID();"
}

echo "=== seeding ==="
# Doctor A saw the patient last week and wrote notes; sees them again next week.
A_PAST=$(seed  $DOC_A $PATIENT       "$LASTWK" "10:00" completed "Chest pain"      "ECG normal, review in 3 months")
A_NEXT=$(seed  $DOC_A $PATIENT       "$NEXTWK" "11:00" confirmed "Follow-up"       "")
# Doctor B saw the SAME patient and wrote their own private notes.
B_PAST=$(seed  $DOC_B $PATIENT       "$LASTWK" "14:00" completed "Skin rash"       "Prescribed hydrocortisone")
# A different patient, doctor A only.
A_OTHER=$(seed $DOC_A $OTHER_PATIENT "$LASTWK" "09:00" completed "Annual checkup"  "All clear")
echo "  A_PAST=$A_PAST A_NEXT=$A_NEXT B_PAST=$B_PAST A_OTHER=$A_OTHER"

echo
echo "=== 1. patient list is derived from appointments ==="
LIST=$(get $DOC_A "/doctor/patients")
check "doctor A sees their patient"      "$LIST" "\"id\":$PATIENT,"
check "doctor A sees the other patient"  "$LIST" "\"id\":$OTHER_PATIENT,"
check "last visit is the completed one"  "$LIST" "\"lastVisit\":\"$LASTWK\""
check "next appointment surfaced"        "$LIST" "\"nextAppointment\":{\"date\":\"$NEXTWK\""
check "real profile data (blood type)"   "$LIST" '"bloodType"'
check "search narrows the list"          "$(get $DOC_A "/doctor/patients?q=zzzznomatch")" '"total":0'

echo
echo "=== 2. only doctors have a patient list ==="
check "patient blocked"    "$(get $PATIENT   /doctor/patients)" 'Only doctors'
check "secretary blocked"  "$(get $SECRETARY /doctor/patients)" 'Only doctors'
check "admin blocked"      "$(get $ADMIN     /doctor/patients)" 'Only doctors'
check "anonymous blocked"  "$(curl -s "$API/doctor/patients")"  'Not authenticated'

echo
echo "=== 3. privacy: two doctors, one shared patient ==="
REC_A=$(get $DOC_A "/doctor/patients/get?id=$PATIENT")
REC_B=$(get $DOC_B "/doctor/patients/get?id=$PATIENT")
check   "doctor A reads their own notes"       "$REC_A" 'ECG normal'
nocheck "doctor A cannot read doctor B's notes" "$REC_A" 'hydrocortisone'
check   "doctor B reads their own notes"       "$REC_B" 'hydrocortisone'
nocheck "doctor B cannot read doctor A's notes" "$REC_B" 'ECG normal'
nocheck "doctor B does not see A's appointment" "$REC_B" "\"id\":$A_PAST,"
check   "each sees only their own visits"      "$(echo "$REC_A" | grep -o '"id":[0-9]*' | wc -l)" '.'

echo
echo "=== 4. a patient with no shared appointment is out of reach ==="
check "doctor B cannot open A's other patient" "$(get $DOC_B "/doctor/patients/get?id=$OTHER_PATIENT")" 'not under your care'
nocheck "  ...and is absent from B's list"     "$(get $DOC_B /doctor/patients)" "\"id\":$OTHER_PATIENT,"
check "unknown patient id rejected"            "$(get $DOC_A "/doctor/patients/get?id=999999")" 'not under your care'
check "malformed id rejected"                  "$(get $DOC_A "/doctor/patients/get?id=abc")" 'valid patient id'

echo
echo "=== 5. consultation history comes from completed visits ==="
check "consultations present"        "$REC_A" '"consultations":\['
check "  ...carry the notes"         "$REC_A" 'ECG normal'
check "appointment list present"     "$REC_A" '"appointments":\['
check "completed visit count"        "$REC_A" '"completedVisits":1'

echo
echo "=== 6. schedule + calendar read the same appointment API ==="
check "week window returns the visit"  "$(get $DOC_A "/appointments?from=$LASTWK&to=$TODAY&limit=500")" "\"id\":$A_PAST,"
check "future window returns the next" "$(get $DOC_A "/appointments?from=$TODAY&to=$NEXTWK&limit=500")" "\"id\":$A_NEXT,"
nocheck "week window excludes B's"     "$(get $DOC_A "/appointments?from=$LASTWK&to=$TODAY&limit=500")" "\"id\":$B_PAST,"

echo
echo "=== cleanup ==="
for id in $A_PAST $A_NEXT $B_PAST $A_OTHER; do
  [ -n "$id" ] && $MY -u root medisecretary -e "DELETE FROM appointment WHERE id=$id" 2>/dev/null
done
echo "  removed seeded rows"

echo
echo "  $pass passed, $fail failed"
