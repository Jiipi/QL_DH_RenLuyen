$ErrorActionPreference = 'Stop'

function Invoke-WebJson {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [Parameter(Mandatory=$true)][string]$Url,
        [hashtable]$Headers,
        $Body
    )
    try {
        if ($Body -ne $null) {
            if ($Body -is [string]) { $json = $Body } else { $json = $Body | ConvertTo-Json -Depth 10 -Compress }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType 'application/json; charset=utf-8' -Body $bytes -ErrorAction Stop
        } else {
            $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ErrorAction Stop
        }
        return [pscustomobject]@{ StatusCode = $resp.StatusCode; Body = $resp.Content }
    } catch {
        $status = $_.Exception.Response.StatusCode.Value__
        $content = $null
        try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $content = $reader.ReadToEnd(); $reader.Close() } catch {}
        return [pscustomobject]@{ StatusCode = $status; Body = $content }
    }
}

function To-JsonObj($content) { if ([string]::IsNullOrWhiteSpace($content)) { return $null }; try { return $content | ConvertFrom-Json } catch { return $null } }

$base = 'http://localhost:3001'
$dummyId = '00000000-0000-0000-0000-000000000000'
Write-Host "RBAC activities e2e (SV000013) starting... ($base)" -ForegroundColor Cyan

# Admin login
$adminResp = Invoke-WebJson -Method 'POST' -Url "$base/api/auth/login" -Body @{ maso = 'admin'; password = 'Admin@123' }
if ($adminResp.StatusCode -ne 200) { Write-Host "Admin login failed: $($adminResp.StatusCode) $($adminResp.Body)" -ForegroundColor Red; exit 1 }
$adminObj = To-JsonObj $adminResp.Body
$adminToken = $adminObj.data.token
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

# Student login (SV000013/123456)
$svResp = Invoke-WebJson -Method 'POST' -Url "$base/api/auth/login" -Body @{ maso = 'SV000013'; password = '123456' }
if ($svResp.StatusCode -ne 200) { Write-Host "Student login failed: $($svResp.StatusCode) $($svResp.Body)" -ForegroundColor Red; exit 1 }
$svObj = To-JsonObj $svResp.Body
$svToken = $svObj.data.token
$svHeaders = @{ Authorization = "Bearer $svToken" }

# Get SINH_VIÊN role detail
$rolesResp = Invoke-WebJson -Method 'GET' -Url "$base/api/admin/roles?page=1&limit=100" -Headers $adminHeaders
if ($rolesResp.StatusCode -ne 200) { Write-Host "List roles failed: $($rolesResp.StatusCode)" -ForegroundColor Red; exit 1 }
$roles = (To-JsonObj $rolesResp.Body).data.items
$role = $roles | Where-Object { ($_.ten_vt -eq 'SINH_VIÊN') -or ($_.ten_vt -eq 'SINH_VIEN') -or ($_.ten_vt -like '*SINH*') } | Select-Object -First 1
if (-not $role) { Write-Host "Role SINH_VIÊN not found" -ForegroundColor Red; exit 1 }
$roleId = $role.id
$roleDetail = To-JsonObj (Invoke-WebJson -Method 'GET' -Url "$base/api/admin/roles/$roleId" -Headers $adminHeaders).Body
$origPerms = @()
if ($roleDetail.data.quyen_han -is [System.Array]) { $origPerms = @($roleDetail.data.quyen_han) }

function Set-Perms($perms) {
    # Only update permissions to avoid accidental role name encoding changes
    $body = @{ quyen_han = $perms }
  $r = Invoke-WebJson -Method 'PUT' -Url "$base/api/admin/roles/$roleId" -Headers $adminHeaders -Body $body
  if ($r.StatusCode -ne 200) { Write-Host "Update role failed: $($r.StatusCode) $($r.Body)" -ForegroundColor Red; exit 1 }
}

# Matrix: activities.view, registrations.register, registrations.cancel, attendance.mark
# Include legacy aliases to ensure DB does not implicitly allow via old slugs
$actViewAliases = @('activities.view','activities.read')
$regRegisterAliases = @('registrations.register','activities.register','registrations.write')
$regCancelAliases = @('registrations.cancel','registrations.write')
$attendAliases = @('attendance.mark','activities.attend','attendance.write')
$allToRemove = @() + $actViewAliases + $regRegisterAliases + $regCancelAliases + $attendAliases

# Step 1: Remove all targeted perms (and aliases) -> expect 403 for all
$perms1 = $origPerms | Where-Object { $_ -notin $allToRemove }
Set-Perms $perms1

$resp1 = Invoke-WebJson -Method 'GET' -Url "$base/api/activities" -Headers $svHeaders
Write-Host "[1] activities.view GET /activities -> $($resp1.StatusCode) (expect 403)" -ForegroundColor Yellow

# Try register and cancel on a dummy id (403 permission before validation)
$resp2 = Invoke-WebJson -Method 'POST' -Url "$base/api/activities/$dummyId/register" -Headers $svHeaders
Write-Host "[1] registrations.register POST /activities/:id/register -> $($resp2.StatusCode) (expect 403)" -ForegroundColor Yellow
$resp3 = Invoke-WebJson -Method 'POST' -Url "$base/api/activities/$dummyId/cancel" -Headers $svHeaders
Write-Host "[1] registrations.cancel POST /activities/:id/cancel -> $($resp3.StatusCode) (expect 403)" -ForegroundColor Yellow

$resp4 = Invoke-WebJson -Method 'POST' -Url "$base/api/activities/attendance/scan" -Headers $svHeaders -Body @{ qr_code = '{"hd":"'+$dummyId+'","token":"t"}' }
Write-Host "[1] attendance.mark POST /activities/attendance/scan -> $($resp4.StatusCode) (expect 403)" -ForegroundColor Yellow

# Step 2: Enable activities.view only (canonical is enough)
$perms2 = @('activities.view') + ($perms1 | Where-Object { $_ -notin ($regRegisterAliases + $regCancelAliases + $attendAliases) })
Set-Perms $perms2
$resp5 = Invoke-WebJson -Method 'GET' -Url "$base/api/activities" -Headers $svHeaders
Write-Host "[2] activities.view GET /activities -> $($resp5.StatusCode) (expect 200)" -ForegroundColor Yellow
$resp6 = Invoke-WebJson -Method 'POST' -Url "$base/api/activities/$dummyId/register" -Headers $svHeaders
Write-Host "[2] registrations.register -> $($resp6.StatusCode) (expect 403)" -ForegroundColor Yellow

# Step 3: Enable registrations.register + registrations.cancel (canonical only)
$perms3 = @('activities.view','registrations.register','registrations.cancel') + ($perms1 | Where-Object { $_ -notin $attendAliases })
Set-Perms $perms3
$resp7 = Invoke-WebJson -Method 'POST' -Url "$base/api/activities/$dummyId/register" -Headers $svHeaders
Write-Host "[3] registrations.register -> $($resp7.StatusCode) (expect 404 or 400 after validation)" -ForegroundColor Yellow
$resp8 = Invoke-WebJson -Method 'POST' -Url "$base/api/activities/$dummyId/cancel" -Headers $svHeaders
Write-Host "[3] registrations.cancel -> $($resp8.StatusCode) (expect 404 or 400 after validation)" -ForegroundColor Yellow

# Step 4: Enable attendance.mark
$perms4 = @('activities.view','registrations.register','registrations.cancel','attendance.mark')
Set-Perms $perms4
$resp9 = Invoke-WebJson -Method 'POST' -Url "$base/api/activities/attendance/scan" -Headers $svHeaders -Body @{ qr_code = '{"hd":"'+$dummyId+'","token":"t"}' }
Write-Host "[4] attendance.mark -> $($resp9.StatusCode) (expect 404 or 400 after validation)" -ForegroundColor Yellow

# Restore original perms
Set-Perms $origPerms
Write-Host "RBAC activities e2e finished." -ForegroundColor Cyan
