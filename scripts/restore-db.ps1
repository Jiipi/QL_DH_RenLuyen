param(
  [Parameter(Mandatory=$true)]
  [Alias("Input")]
  [string]$DumpPath,
  [string]$Service = "db",
  [string]$DbName = "Web_QuanLyDiemRenLuyen",
  [string]$User = "admin"
)

if (!(Test-Path $DumpPath)) {
  Write-Error "Input file not found: $DumpPath"
  exit 1
}

Write-Host "Restoring Postgres database '$DbName' in service '$Service' from '$DumpPath'..." -ForegroundColor Cyan

# Copy dump into container
$remoteDump = "/tmp/restore.dump"
try {
  $containerId = (docker compose ps -q $Service).Trim()
  if (-not $containerId) { throw "Could not resolve container for service '$Service'" }
  docker cp "$DumpPath" "$( $containerId ):$remoteDump"
} catch {
  Write-Error "Failed to copy dump into container: $_"
  exit 1
}

# Restore with clean and single transaction
$cmdRestore = "pg_restore -U $User -d $DbName --clean --if-exists --no-owner --no-privileges -1 $remoteDump"
$restoreRes = docker compose exec $Service bash -lc $cmdRestore 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "Restore failed. Output: $restoreRes"
  exit 1
}

Write-Host "Restore completed successfully." -ForegroundColor Green
