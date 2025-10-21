param(
  [string]$Service = "db",
  [string]$DbName = "Web_QuanLyDiemRenLuyen",
  [string]$User = "admin",
  [string]$Output = $(Join-Path (Get-Location) ("db_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".dump"))
)

Write-Host "Backing up Postgres database '$DbName' from service '$Service' to '$Output'..." -ForegroundColor Cyan

# Create dump inside container
$remoteDump = "/tmp/backup.dump"
$cmdCreate = "pg_dump -U $User -d $DbName -Fc -f $remoteDump"

$createRes = docker compose exec $Service bash -lc $cmdCreate 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to create dump inside container. Output: $createRes"
  exit 1
}

# Copy dump to host
try {
  # Resolve container ID for the compose service
  $containerId = (docker compose ps -q $Service).Trim()
  if (-not $containerId) { throw "Could not resolve container for service '$Service'" }
  docker cp "$( $containerId ):$remoteDump" "$Output"
} catch {
  Write-Error "Failed to copy dump to host: $_"
  exit 1
}

Write-Host "Backup completed: $Output" -ForegroundColor Green
