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
Write-Host "RBAC e2e test (SV000013) starting... ($base)" -ForegroundColor Cyan

# Admin login
$adminResp = Invoke-WebJson -Method 'POST' -Url "$base/api/auth/login" -Body @{ maso = 'admin'; password = 'Admin@123' }
if ($adminResp.StatusCode -ne 200) { Write-Host "Admin login failed: $($adminResp.StatusCode) $($adminResp.Body)" -ForegroundColor Red; exit 1 }
$adminObj = To-JsonObj $adminResp.Body
$adminToken = $adminObj.data.token
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
Write-Host "Admin login OK" -ForegroundColor Green

# Student login (SV000013/123456)
$svResp = Invoke-WebJson -Method 'POST' -Url "$base/api/auth/login" -Body @{ maso = 'SV000013'; password = '123456' }
if ($svResp.StatusCode -ne 200) { Write-Host "Student login failed: $($svResp.StatusCode) $($svResp.Body)" -ForegroundColor Red; exit 1 }
$svObj = To-JsonObj $svResp.Body
$svToken = $svObj.data.token
$svHeaders = @{ Authorization = "Bearer $svToken" }
Write-Host "Student login OK" -ForegroundColor Green

# Get roles and find SINH_VIÊN
$rolesResp = Invoke-WebJson -Method 'GET' -Url "$base/api/admin/roles?page=1&limit=100" -Headers $adminHeaders
if ($rolesResp.StatusCode -ne 200) { Write-Host "List roles failed: $($rolesResp.StatusCode)" -ForegroundColor Red; exit 1 }
$roles = (To-JsonObj $rolesResp.Body).data.items
$role = $roles | Where-Object { ($_.ten_vt -eq 'SINH_VIÊN') -or ($_.ten_vt -eq 'SINH_VIEN') -or ($_.ten_vt -like '*SINH*') } | Select-Object -First 1
if (-not $role) { Write-Host "Role SINH_VIÊN not found" -ForegroundColor Red; exit 1 }
$roleId = $role.id

# Load full role
$roleDetail = To-JsonObj (Invoke-WebJson -Method 'GET' -Url "$base/api/admin/roles/$roleId" -Headers $adminHeaders).Body
$origPerms = @()
if ($roleDetail.data.quyen_han -is [System.Array]) { $origPerms = @($roleDetail.data.quyen_han) }

# Helper to update role perms
function Set-Perms($perms) {
    # Only update permissions field to avoid touching role name/description
    $body = @{ quyen_han = $perms }
  $r = Invoke-WebJson -Method 'PUT' -Url "$base/api/admin/roles/$roleId" -Headers $adminHeaders -Body $body
  if ($r.StatusCode -ne 200) { Write-Host "Update role failed: $($r.StatusCode) $($r.Body)" -ForegroundColor Red; exit 1 }
}

# Case A: remove profile.*
$noProfile = $origPerms | Where-Object { $_ -ne 'profile.read' -and $_ -ne 'profile.update' }
Set-Perms $noProfile
$g = Invoke-WebJson -Method 'GET' -Url "$base/api/users/profile" -Headers $svHeaders; Write-Host "[A] GET profile -> $($g.StatusCode) (expect 403)" -ForegroundColor Yellow
$p = Invoke-WebJson -Method 'PUT' -Url "$base/api/users/profile" -Headers $svHeaders -Body @{ name = 'Attempt Blocked' }; Write-Host "[A] PUT profile -> $($p.StatusCode) (expect 403)" -ForegroundColor Yellow

# Case B: allow read only
$readOnly = @('profile.read') + ($noProfile | Where-Object { $_ -ne 'profile.update' })
Set-Perms $readOnly
$g2 = Invoke-WebJson -Method 'GET' -Url "$base/api/users/profile" -Headers $svHeaders; Write-Host "[B] GET profile -> $($g2.StatusCode) (expect 200)" -ForegroundColor Yellow
$p2 = Invoke-WebJson -Method 'PUT' -Url "$base/api/users/profile" -Headers $svHeaders -Body @{ name = 'Should Fail' }; Write-Host "[B] PUT profile -> $($p2.StatusCode) (expect 403)" -ForegroundColor Yellow

# Case C: allow read+update
$readWrite = @('profile.read','profile.update') + ($noProfile | Where-Object { $_ -ne 'profile.update' })
Set-Perms $readWrite
$g3 = Invoke-WebJson -Method 'GET' -Url "$base/api/users/profile" -Headers $svHeaders; Write-Host "[C] GET profile -> $($g3.StatusCode) (expect 200)" -ForegroundColor Yellow
$p3 = Invoke-WebJson -Method 'PUT' -Url "$base/api/users/profile" -Headers $svHeaders -Body @{ name = 'Updated OK' }; Write-Host "[C] PUT profile -> $($p3.StatusCode) (expect 200)" -ForegroundColor Yellow

# Restore original perms
Set-Perms $origPerms
Write-Host "RBAC e2e test finished." -ForegroundColor Cyan
