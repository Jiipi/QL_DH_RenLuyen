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

function To-JsonObj($content) {
    if ([string]::IsNullOrWhiteSpace($content)) { return $null }
    try { return $content | ConvertFrom-Json } catch { return $null }
}

$base = 'http://localhost:3001'
Write-Host "RBAC smoke test starting... ($base)" -ForegroundColor Cyan

# 1) Login as admin
$loginResp = Invoke-WebJson -Method 'POST' -Url "$base/api/auth/login" -Body @{ maso = 'admin'; password = 'Admin@123' }
if ($loginResp.StatusCode -ne 200) { Write-Host "Admin login failed: $($loginResp.StatusCode) $($loginResp.Body)" -ForegroundColor Red; exit 1 }
$loginObj = To-JsonObj $loginResp.Body
$adminToken = $loginObj.data.token
if (-not $adminToken) { Write-Host "No admin token in response" -ForegroundColor Red; exit 1 }
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
Write-Host "Admin login OK" -ForegroundColor Green

# 2) Find SINH_VIÊN role id
$rolesResp = Invoke-WebJson -Method 'GET' -Url "$base/api/admin/roles?page=1&limit=100" -Headers $adminHeaders
if ($rolesResp.StatusCode -ne 200) { Write-Host "List roles failed: $($rolesResp.StatusCode)" -ForegroundColor Red; exit 1 }
$rolesObj = To-JsonObj $rolesResp.Body
$items = $rolesObj.data.items
$role = $items | Where-Object { ($_.ten_vt -eq 'SINH_VIÊN') -or ($_.ten_vt -eq 'SINH_VIEN') -or ($_.ten_vt -like '*SINH*') } | Select-Object -First 1
if (-not $role) {
    $names = @()
    if ($items) { $names = $items | ForEach-Object { $_.ten_vt } }
    $nameList = ($names -join ', ')
    Write-Host "Role SINH_VIÊN/SINH_VIEN not found. Available: $nameList" -ForegroundColor Yellow
    exit 1
}
$roleId = $role.id
Write-Host "Found role: $($role.ten_vt) ($roleId)" -ForegroundColor Green

# 3) Get role details and strip profile.* permissions
$roleDetailResp = Invoke-WebJson -Method 'GET' -Url "$base/api/admin/roles/$roleId" -Headers $adminHeaders
if ($roleDetailResp.StatusCode -ne 200) { Write-Host "Get role failed: $($roleDetailResp.StatusCode)" -ForegroundColor Red; exit 1 }
$roleDetail = To-JsonObj $roleDetailResp.Body
$perms = @()
if ($roleDetail.data.quyen_han -is [System.Array]) { $perms = @($roleDetail.data.quyen_han) }
$permsNoProfile = $perms | Where-Object { $_ -ne 'profile.read' -and $_ -ne 'profile.update' }

$updateBody = @{ quyen_han = $permsNoProfile }
$updateResp = Invoke-WebJson -Method 'PUT' -Url "$base/api/admin/roles/$roleId" -Headers $adminHeaders -Body $updateBody
if ($updateResp.StatusCode -ne 200) { Write-Host "Update role (remove profile.*) failed: $($updateResp.StatusCode) $($updateResp.Body)" -ForegroundColor Red; exit 1 }
Write-Host "Removed profile.* permissions from role" -ForegroundColor Yellow

# 4) Register a new student
$suffix = Get-Random -Minimum 10000 -Maximum 99999

# Try to get a valid faculty and class
$facResp = Invoke-WebJson -Method 'GET' -Url "$base/api/auth/faculties"
if ($facResp.StatusCode -ne 200) { Write-Host "Get faculties failed: $($facResp.StatusCode) $($facResp.Body)" -ForegroundColor Red; exit 1 }
$facObj = To-JsonObj $facResp.Body
$faculty = $facObj.data | Select-Object -First 1
$lopId = $null
if ($faculty -and $faculty.value) {
    $clsResp = Invoke-WebJson -Method 'GET' -Url ("$base/api/auth/classes?faculty=" + [uri]::EscapeDataString($faculty.value))
    if ($clsResp.StatusCode -eq 200) {
        $clsObj = To-JsonObj $clsResp.Body
        $cls = $clsObj.data | Select-Object -First 1
        if ($cls -and $cls.value) { $lopId = $cls.value }
    }
}

$maso = (Get-Random -Minimum 1000000 -Maximum 9999999).ToString()
$password = 'Student@123'
$studentBody = @{ name = "Test Student $suffix"; maso = $maso; email = "sv$maso@dlu.edu.vn"; password = $password; confirmPassword = $password }
if ($lopId) { $studentBody.lopId = $lopId } elseif ($faculty -and $faculty.value) { $studentBody.khoa = $faculty.value }

$regResp = Invoke-WebJson -Method 'POST' -Url "$base/api/auth/register" -Body $studentBody
if ($regResp.StatusCode -ne 200) { Write-Host "Register student failed: $($regResp.StatusCode) $($regResp.Body)" -ForegroundColor Red; exit 1 }
$regObj = To-JsonObj $regResp.Body
$stuToken = $regObj.data.token
if (-not $stuToken) { Write-Host "No student token returned" -ForegroundColor Red; exit 1 }
$stuHeaders = @{ Authorization = "Bearer $stuToken" }
if ($regObj -and $regObj.data -and $regObj.data.user -and $regObj.data.user.username) {
    Write-Host "Student registered: $($regObj.data.user.username) token acquired" -ForegroundColor Green
} else {
    Write-Host "Student registered: token acquired" -ForegroundColor Green
}

# 5) As student: GET /users/profile should be 403
$get403 = Invoke-WebJson -Method 'GET' -Url "$base/api/users/profile" -Headers $stuHeaders
Write-Host "Student GET /users/profile -> $($get403.StatusCode)" -ForegroundColor Cyan

# 6) As student: PUT /users/profile should be 403
$put403 = Invoke-WebJson -Method 'PUT' -Url "$base/api/users/profile" -Headers $stuHeaders -Body @{ name = "Blocked $suffix" }
Write-Host "Student PUT /users/profile -> $($put403.StatusCode)" -ForegroundColor Cyan

# 7) Restore profile.* permissions
$permsRestored = @('profile.read','profile.update') + $permsNoProfile
$restoreBody = @{ quyen_han = $permsRestored }
$restoreResp = Invoke-WebJson -Method 'PUT' -Url "$base/api/admin/roles/$roleId" -Headers $adminHeaders -Body $restoreBody
if ($restoreResp.StatusCode -ne 200) { Write-Host "Restore role failed: $($restoreResp.StatusCode) $($restoreResp.Body)" -ForegroundColor Red; exit 1 }
Write-Host "Restored profile.* permissions" -ForegroundColor Green

# 8) As student: GET should be 200
$get200 = Invoke-WebJson -Method 'GET' -Url "$base/api/users/profile" -Headers $stuHeaders
Write-Host "Student GET /users/profile after restore -> $($get200.StatusCode)" -ForegroundColor Cyan

# 9) As student: PUT should be 200
$put200 = Invoke-WebJson -Method 'PUT' -Url "$base/api/users/profile" -Headers $stuHeaders -Body @{ name = "Allowed $suffix" }
Write-Host "Student PUT /users/profile after restore -> $($put200.StatusCode)" -ForegroundColor Cyan

Write-Host "RBAC smoke test finished." -ForegroundColor Cyan