# =============================================================================
# MedSecretary API smoke test
# Exercises: register -> verify -> login -> change password -> login (new pw)
#
# Prereqs: MySQL running, migration applied, backend on http://localhost:8080
# Run:     powershell -ExecutionPolicy Bypass -File backend\tests\smoke-test.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

$Api      = "http://localhost:8080/api"
$Mysql    = "C:\xampp\mysql\bin\mysql.exe"
$Db       = "medisecretary"
$Email    = "smoketest+$(Get-Random -Maximum 99999)@example.com"
$OldPw    = "oldpass123"
$NewPw    = "newpass456"

$pass = 0
$fail = 0

# NOTE: Windows PowerShell 5.1's `Set-Content -Encoding utf8` writes a UTF-8 BOM,
# which json_decode() rejects - the server then sees an empty body. Always write
# JSON with a BOM-less encoder.
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-Json($path, $text) {
    [System.IO.File]::WriteAllText($path, $text, $script:Utf8NoBom)
}

function Post($path, $bodyHash) {
    $tmp = [System.IO.Path]::GetTempFileName()
    Write-Json $tmp ($bodyHash | ConvertTo-Json -Compress)
    $raw = & curl.exe -s -X POST "$Api$path" -H "Content-Type: application/json" -d "@$tmp"
    Remove-Item $tmp -Force
    if (-not $raw) { return $null }
    return $raw | ConvertFrom-Json
}

function PostAuth($path, $bodyHash, $token) {
    $tmp = [System.IO.Path]::GetTempFileName()
    Write-Json $tmp ($bodyHash | ConvertTo-Json -Compress)
    $raw = & curl.exe -s -X POST "$Api$path" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "@$tmp"
    Remove-Item $tmp -Force
    if (-not $raw) { return $null }
    return $raw | ConvertFrom-Json
}

function Get-Auth($path, $token) {
    $raw = & curl.exe -s "$Api$path" -H "Authorization: Bearer $token"
    if (-not $raw) { return $null }
    return $raw | ConvertFrom-Json
}

function Check($label, $condition, $detail) {
    if ($condition) {
        Write-Host "  PASS  $label" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  FAIL  $label" -ForegroundColor Red
        if ($detail) { Write-Host "        -> $detail" -ForegroundColor DarkGray }
        $script:fail++
    }
}

Write-Host ""
Write-Host "MedSecretary API smoke test" -ForegroundColor Cyan
Write-Host "test account: $Email"
Write-Host ""

# --- 0. schema present? ------------------------------------------------------
Write-Host "[0] Schema" -ForegroundColor Yellow
$cols = & $Mysql -u root $Db -N -e "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$Db' AND TABLE_NAME='user' AND COLUMN_NAME='password_changed_at';"
Check "user.password_changed_at exists" ($cols -match "password_changed_at") "run the SQL migration first"
$tbl = & $Mysql -u root $Db -N -e "SHOW TABLES LIKE 'user_profile';"
Check "user_profile table exists" ($tbl -match "user_profile") "run the SQL migration first"

if ($fail -gt 0) {
    Write-Host ""
    Write-Host "Migration not applied. Run:" -ForegroundColor Red
    Write-Host '  Get-Content backend\sql\2026_07_26_profile_and_password.sql -Raw | & "C:\xampp\mysql\bin\mysql.exe" -u root medisecretary'
    exit 1
}

# --- 1. register -------------------------------------------------------------
Write-Host "[1] Register" -ForegroundColor Yellow
$r = Post "/register" @{ name = "Smoke Test"; email = $Email; password = $OldPw; role = "patient" }
Check "register succeeds" ($r -and $r.success) $r.error
$userId = $r.userId

# profile row auto-created? (only if trigger/backfill covers new rows)
$prof = & $Mysql -u root $Db -N -e "SELECT COUNT(*) FROM user_profile WHERE user_id=$userId;"
Write-Host "        profile rows for new user: $prof (0 is expected - created on first update)" -ForegroundColor DarkGray

# --- 2. verify (read code straight from DB) ----------------------------------
Write-Host "[2] Verify email" -ForegroundColor Yellow
$code = (& $Mysql -u root $Db -N -e "SELECT verification_code FROM user WHERE email='$Email';").Trim()
$r = Post "/verify" @{ email = $Email; code = $code }
Check "verify succeeds" ($r -and $r.success) $r.error

# --- 3. login with original password -----------------------------------------
Write-Host "[3] Login (old password)" -ForegroundColor Yellow
$r = Post "/login" @{ email = $Email; password = $OldPw }
Check "login succeeds" ($r -and $r.success) $r.error
$token = "token_$($r.user.id)"

# --- 4. password change: rejection cases -------------------------------------
Write-Host "[4] Password change - validation" -ForegroundColor Yellow
$r = Post "/profile/password" @{ email = $Email; currentPassword = "wrongpassword"; newPassword = $NewPw }
Check "wrong current password rejected" (-not $r.success) "should have failed"

$r = Post "/profile/password" @{ email = $Email; currentPassword = $OldPw; newPassword = "short" }
Check "password under 8 chars rejected" (-not $r.success) "should have failed"

$r = Post "/profile/password" @{ email = $Email; currentPassword = $OldPw; newPassword = $NewPw; confirmPassword = "different" }
Check "confirmation mismatch rejected" (-not $r.success) "should have failed"

$r = Post "/profile/password" @{ email = $Email; currentPassword = $OldPw; newPassword = $OldPw }
Check "reusing current password rejected" (-not $r.success) "should have failed"

$r = Post "/profile/password" @{ email = "nobody-$(Get-Random)@example.com"; currentPassword = $OldPw; newPassword = $NewPw }
Check "unknown email gives generic error" ($r.error -eq "Current password is incorrect.") "leaked which emails exist: $($r.error)"

# --- 5. password change: happy path ------------------------------------------
Write-Host "[5] Password change - success" -ForegroundColor Yellow
$r = Post "/profile/password" @{ email = $Email; currentPassword = $OldPw; newPassword = $NewPw; confirmPassword = $NewPw }
Check "password change succeeds" ($r -and $r.success) $r.error

$changed = (& $Mysql -u root $Db -N -e "SELECT password_changed_at IS NOT NULL FROM user WHERE email='$Email';").Trim()
Check "password_changed_at written" ($changed -eq "1") "column still NULL"

# --- 6. old password dead, new password works --------------------------------
Write-Host "[6] Login after change" -ForegroundColor Yellow
$r = Post "/login" @{ email = $Email; password = $OldPw }
Check "old password rejected" (-not $r.success) "old password still works!"

$r = Post "/login" @{ email = $Email; password = $NewPw }
Check "new password accepted" ($r -and $r.success) $r.error

# --- 7. profile read/update --------------------------------------------------
Write-Host "[7] Profile" -ForegroundColor Yellow
$r = Get-Auth "/profile" $token
Check "GET /profile returns data" ($r -and $r.success) $r.error
Check "email matches" ($r.profile.email -eq $Email) "got $($r.profile.email)"

$r = Post "/profile/update" @{ name = "Updated Name"; phone = "+212 6 12 34 56 78"; bloodType = "O+" }
Check "update without token rejected" (-not $r.success) "unauthenticated update was allowed!"

$r = PostAuth "/profile/update" @{ name = "Updated Name"; phone = "+212 6 12 34 56 78"; bloodType = "O+" } $token
Check "authenticated update succeeds" ($r -and $r.success) $r.error
Check "blood type persisted" ($r.profile.bloodType -eq "O+") "got $($r.profile.bloodType)"

$r = PostAuth "/profile/update" @{ bloodType = "XX" } $token
Check "invalid blood type rejected" (-not $r.success) "should have failed"

$r = PostAuth "/profile/update" @{} $token
Check "empty payload does not report success" (-not $r.success) "claimed success while writing nothing"

# --- 8. avatar URL -----------------------------------------------------------
Write-Host "[8] Avatar URL" -ForegroundColor Yellow
$r = PostAuth "/profile/update" @{ avatarUrl = "javascript:alert(1)" } $token
Check "javascript: scheme rejected" (-not $r.success) "XSS scheme accepted!"

$r = PostAuth "/profile/update" @{ avatarUrl = "data:image/svg+xml;base64,PHN2Zz4=" } $token
Check "data: URI rejected" (-not $r.success) "data URI accepted!"

$r = PostAuth "/profile/update" @{ avatarUrl = ("https://example.com/" + ("a" * 260) + ".jpg") } $token
Check "over-long URL rejected" (-not $r.success) "would silently truncate at VARCHAR(255)"

$r = PostAuth "/profile/update" @{ avatarUrl = "https://i.pravatar.cc/300" } $token
Check "valid https URL accepted" ($r -and $r.success) $r.error
Check "avatar URL persisted" ($r.profile.avatarUrl -eq "https://i.pravatar.cc/300") "got $($r.profile.avatarUrl)"

# --- cleanup -----------------------------------------------------------------
& $Mysql -u root $Db -e "DELETE FROM user WHERE email='$Email';" | Out-Null

Write-Host ""
Write-Host "$pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host ""
exit $(if ($fail -eq 0) { 0 } else { 1 })
