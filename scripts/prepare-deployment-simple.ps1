# Script backup database va uploads de deploy len AWS
# Chay tren may Windows truoc khi upload

param(
    [string]$OutputDir = ".\deployment-package"
)

Write-Host "Chuan bi deployment package..." -ForegroundColor Cyan

# Tao thu muc output
if (Test-Path $OutputDir) {
    Remove-Item -Recurse -Force $OutputDir
}
New-Item -ItemType Directory -Path $OutputDir | Out-Null

# 1. Backup database
Write-Host "`n1. Backup database..." -ForegroundColor Yellow
.\scripts\backup-db.ps1 -Output "$OutputDir\db_production.dump"

if (Test-Path "$OutputDir\db_production.dump") {
    $dbSize = (Get-Item "$OutputDir\db_production.dump").Length / 1MB
    Write-Host "   Database backup: $([math]::Round($dbSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "   Database backup failed!" -ForegroundColor Red
    exit 1
}

# 2. Backup uploads folder
Write-Host "`n2. Backup uploads folder..." -ForegroundColor Yellow
if (Test-Path ".\backend\uploads") {
    Compress-Archive -Path ".\backend\uploads\*" -DestinationPath "$OutputDir\uploads_backup.zip" -Force
    $uploadSize = (Get-Item "$OutputDir\uploads_backup.zip").Length / 1MB
    Write-Host "   Uploads backup: $([math]::Round($uploadSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "   No uploads folder found (skip)" -ForegroundColor Yellow
}

# 3. Create .env template
Write-Host "`n3. Create .env template..." -ForegroundColor Yellow

# Backend env template
@"
NODE_ENV=production
PORT=3001

DATABASE_URL=postgresql://admin:CHANGE_PASSWORD@db:5432/Web_QuanLyDiemRenLuyen?schema=public

JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_MIN_32_CHARS
JWT_EXPIRES_IN=7d

CORS_ORIGIN=https://yourdomain.com

LOG_LEVEL=info
"@ | Out-File -FilePath "$OutputDir\backend.env.template" -Encoding UTF8

Write-Host "   Created: backend.env.template" -ForegroundColor Green

# Frontend env template
@"
REACT_APP_API_URL=https://yourdomain.com/api
"@ | Out-File -FilePath "$OutputDir\frontend.env.template" -Encoding UTF8

Write-Host "   Created: frontend.env.template" -ForegroundColor Green

# 4. Create deployment checklist
Write-Host "`n4. Create deployment checklist..." -ForegroundColor Yellow

@"
DEPLOYMENT CHECKLIST

Files trong package nay:
- db_production.dump - Database backup
- uploads_backup.zip - Uploaded files
- backend.env.template - Backend environment template
- frontend.env.template - Frontend environment template

Buoc tiep theo:

1. Upload files len EC2 bang WinSCP
   - Ket noi WinSCP voi EC2 (dung .ppk key)
   - Upload tat ca files vao: /home/ubuntu/dacn-web/backups/

2. SSH vao EC2 bang PuTTY

3. Clone repository
   cd ~/dacn-web
   git clone https://github.com/ThLin57/DACN_Web_quanly_hoatdongrenluyen.git app
   cd app

4. Tao .env files
   nano ~/dacn-web/app/backend/.env
   # Copy noi dung tu backend.env.template
   # DOI: DATABASE_URL password, JWT_SECRET, CORS_ORIGIN

5. Tao JWT Secret ngau nhien manh
   openssl rand -base64 48
   # Copy output va paste vao backend/.env

6. Build va chay
   docker compose --profile prod build
   docker compose up -d db
   docker compose --profile prod up -d app

Xem huong dan day du: AWS_DEPLOYMENT_GUIDE.md
"@ | Out-File -FilePath "$OutputDir\DEPLOYMENT_CHECKLIST.txt" -Encoding UTF8

Write-Host "   Created: DEPLOYMENT_CHECKLIST.txt" -ForegroundColor Green

# Summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT PACKAGE READY!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "`nPackage location: $OutputDir" -ForegroundColor Yellow
Write-Host "`nFiles created:" -ForegroundColor White
Get-ChildItem $OutputDir | ForEach-Object {
    $size = if ($_.Length) { "$([math]::Round($_.Length / 1MB, 2)) MB" } else { "N/A" }
    Write-Host "   - $($_.Name) ($size)" -ForegroundColor Gray
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "   1. Doc DEPLOYMENT_CHECKLIST.txt" -ForegroundColor White
Write-Host "   2. Upload files bang WinSCP len EC2" -ForegroundColor White
Write-Host "   3. Xem AWS_DEPLOYMENT_GUIDE.md de biet chi tiet" -ForegroundColor White

Write-Host "`nQUAN TRONG:" -ForegroundColor Yellow
Write-Host "   - Doi tat ca passwords va secrets trong .env templates!" -ForegroundColor Red
Write-Host "   - Backup file .ppk key cua EC2 an toan!" -ForegroundColor Red
Write-Host "   - Giu file db_production.dump o noi an toan!" -ForegroundColor Red

Write-Host ""
