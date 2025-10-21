# Script chuẩn bị files để deploy lên AWS
# Chạy trên máy Windows trước khi upload

param(
    [string]$OutputDir = ".\deployment-package"
)

Write-Host "🚀 Chuẩn bị deployment package..." -ForegroundColor Cyan

# Tạo thư mục output
if (Test-Path $OutputDir) {
    Remove-Item -Recurse -Force $OutputDir
}
New-Item -ItemType Directory -Path $OutputDir | Out-Null

# 1. Backup database
Write-Host "`n📦 1. Backup database..." -ForegroundColor Yellow
.\scripts\backup-db.ps1 -Output "$OutputDir\db_production.dump"

if (Test-Path "$OutputDir\db_production.dump") {
    $dbSize = (Get-Item "$OutputDir\db_production.dump").Length / 1MB
    Write-Host "   ✅ Database backup: $([math]::Round($dbSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "   ❌ Database backup failed!" -ForegroundColor Red
    exit 1
}

# 2. Backup uploads folder
Write-Host "`n📦 2. Backup uploads folder..." -ForegroundColor Yellow
if (Test-Path ".\backend\uploads") {
    Compress-Archive -Path ".\backend\uploads\*" -DestinationPath "$OutputDir\uploads_backup.zip" -Force
    $uploadSize = (Get-Item "$OutputDir\uploads_backup.zip").Length / 1MB
    Write-Host "   ✅ Uploads backup: $([math]::Round($uploadSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No uploads folder found (skip)" -ForegroundColor Yellow
}

# 3. Create .env template
Write-Host "`n📦 3. Create .env template..." -ForegroundColor Yellow
$envTemplate = @"
# ⚠️ ĐỔI TẤT CẢ GIÁ TRỊ NÀY TRƯỚC KHI DEPLOY!

NODE_ENV=production
PORT=3001

# Database - Đổi password mạnh!
DATABASE_URL=postgresql://admin:CHANGE_THIS_PASSWORD@db:5432/Web_QuanLyDiemRenLuyen?schema=public

# JWT Secret - Tạo chuỗi ngẫu nhiên bằng: openssl rand -base64 48
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_MIN_32_CHARS
JWT_EXPIRES_IN=7d

# CORS - Đổi thành domain của bạn
CORS_ORIGIN=https://yourdomain.com

# Log Level
LOG_LEVEL=info
"@
$envTemplate | Out-File -FilePath "$OutputDir\backend.env.template" -Encoding UTF8
Write-Host "   ✅ Created: backend.env.template" -ForegroundColor Green

$frontendEnvTemplate = @"
# Frontend Environment Variables

# API URL - Đổi thành domain của bạn
REACT_APP_API_URL=https://yourdomain.com/api
"@
$frontendEnvTemplate | Out-File -FilePath "$OutputDir\frontend.env.template" -Encoding UTF8
Write-Host "   ✅ Created: frontend.env.template" -ForegroundColor Green

# 4. Create deployment instructions
Write-Host "`n📦 4. Create deployment checklist..." -ForegroundColor Yellow
$checklist = @"
# 📋 DEPLOYMENT CHECKLIST

## Files trong package này:
- ✅ db_production.dump - Database backup
- ✅ uploads_backup.zip - Uploaded files
- ✅ backend.env.template - Backend environment template
- ✅ frontend.env.template - Frontend environment template
- ✅ DEPLOYMENT_CHECKLIST.txt - File này

## Bước tiếp theo:

### 1. Upload files lên EC2 bằng WinSCP
   - Kết nối WinSCP với EC2 (dùng .ppk key)
   - Upload tất cả files vào: /home/ubuntu/dacn-web/backups/

### 2. SSH vào EC2 bằng PuTTY

### 3. Clone repository
   cd ~/dacn-web
   git clone https://github.com/ThLin57/DACN_Web_quanly_hoatdongrenluyen.git app
   cd app

### 4. Tạo .env files
   # Backend
   nano ~/dacn-web/app/backend/.env
   # Copy nội dung từ backend.env.template
   # ⚠️ ĐỔI: DATABASE_URL password, JWT_SECRET, CORS_ORIGIN
   
   # Frontend
   nano ~/dacn-web/app/frontend/.env
   # Copy nội dung từ frontend.env.template
   # ⚠️ ĐỔI: REACT_APP_API_URL thành domain của bạn

### 5. Tạo JWT Secret ngẫu nhiên mạnh
   openssl rand -base64 48
   # Copy output và paste vào backend/.env → JWT_SECRET=...

### 6. Sửa docker-compose.yml
   nano ~/dacn-web/app/docker-compose.yml
   # Đổi POSTGRES_PASSWORD và DATABASE_URL password
   # Đổi restart: unless-stopped → restart: always
   # Comment/xóa dòng expose port 5432

### 7. Build và chạy database
   cd ~/dacn-web/app
   docker compose --profile prod build
   docker compose up -d db
   sleep 10

### 8. Restore database
   docker cp ~/dacn-web/backups/db_production.dump dacn_db_prod:/tmp/db.dump
   docker compose exec db bash -c "pg_restore -U admin -d Web_QuanLyDiemRenLuyen -c -v /tmp/db.dump"

### 9. Restore uploads
   cd ~/dacn-web/backups
   unzip uploads_backup.zip
   cp -r uploads/* ~/dacn-web/app/backend/uploads/

### 10. Chạy application
   cd ~/dacn-web/app
   docker compose --profile prod up -d app
   docker compose logs -f app

### 11. Test
   curl http://localhost:3001/api/health
   # Nên thấy: {"status":"ok",...}

### 12. Cấu hình Nginx + SSL
   # Xem hướng dẫn chi tiết trong AWS_DEPLOYMENT_GUIDE.md

---

📖 Xem hướng dẫn đầy đủ: AWS_DEPLOYMENT_GUIDE.md
"@
$checklist | Out-File -FilePath "$OutputDir\DEPLOYMENT_CHECKLIST.txt" -Encoding UTF8
Write-Host "   ✅ Created: DEPLOYMENT_CHECKLIST.txt" -ForegroundColor Green

# 5. Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT PACKAGE READY!" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "`nPackage location: $OutputDir" -ForegroundColor Yellow
Write-Host "`nFiles created:" -ForegroundColor White
Get-ChildItem $OutputDir | ForEach-Object {
    $size = if ($_.Length) { "$([math]::Round($_.Length / 1MB, 2)) MB" } else { "N/A" }
    Write-Host "   - $($_.Name) ($size)" -ForegroundColor Gray
}

Write-Host "`n📌 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Đọc DEPLOYMENT_CHECKLIST.txt" -ForegroundColor White
Write-Host "   2. Upload files bằng WinSCP lên EC2" -ForegroundColor White
Write-Host "   3. Xem AWS_DEPLOYMENT_GUIDE.md để biết chi tiết" -ForegroundColor White

Write-Host "`n⚠️  QUAN TRỌNG:" -ForegroundColor Yellow
Write-Host "   - Đổi tất cả passwords và secrets trong .env templates!" -ForegroundColor Red
Write-Host "   - Backup file .ppk key của EC2 an toàn!" -ForegroundColor Red
Write-Host "   - Giữ file db_production.dump ở nơi an toàn!" -ForegroundColor Red

Write-Host ""
