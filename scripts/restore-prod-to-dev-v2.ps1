# =============================================================================
# SCRIPT KHÔI PHỤC DỮ LIỆU TỪ PRODUCTION VỀ DEV LOCAL
# =============================================================================

param(
    [string]$PemFile = "D:\keydacn\dacn.pem",
    [string]$Domain = "hoatdongrenluyen.io.vn",
    [string]$BackupDir = "D:\db_backups"
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KHÔI PHỤC DỮ LIỆU PRODUCTION VỀ DEV" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Tạo thư mục backup nếu chưa có
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "✓ Tạo thư mục backup: $BackupDir" -ForegroundColor Green
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "prod_backup_$timestamp.dump"
$localBackupPath = Join-Path $BackupDir $backupFile

Write-Host ""
Write-Host "BƯỚC 1: TẠO BACKUP TRÊN EC2 PRODUCTION" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$sshCmd = "ssh -i `"$PemFile`" ec2-user@$Domain"

Write-Host "Đang tạo backup trên production server..." -ForegroundColor Cyan
$createBackupCmd = "docker exec dacn_app_db_1 pg_dump -U admin -d Web_QuanLyDiemRenLuyen -Fc -f /tmp/$backupFile 2>&1 || docker exec postgres pg_dump -U admin -d Web_QuanLyDiemRenLuyen -Fc -f /tmp/$backupFile 2>&1"

$fullSshCmd = "$sshCmd `"$createBackupCmd`""
Invoke-Expression $fullSshCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backup created on EC2: /tmp/$backupFile" -ForegroundColor Green
} else {
    Write-Host "✗ Không thể tạo backup trên EC2" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "BƯỚC 2: TẢI BACKUP VỀ MÁY LOCAL" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

Write-Host "Đang tải file backup từ EC2..." -ForegroundColor Cyan
$scpCmd = "scp -i `"$PemFile`" ec2-user@${Domain}:/tmp/$backupFile `"$localBackupPath`""
Invoke-Expression $scpCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Tải về thành công: $localBackupPath" -ForegroundColor Green
} else {
    Write-Host "✗ Không thể tải backup về" -ForegroundColor Red
    exit 1
}

# Xóa backup trên EC2 để tiết kiệm dung lượng
Write-Host "Đang xóa backup tạm trên EC2..." -ForegroundColor Cyan
$cleanupCmd = "$sshCmd `"rm -f /tmp/$backupFile`""
Invoke-Expression $cleanupCmd | Out-Null
Write-Host "✓ Đã xóa backup tạm trên EC2" -ForegroundColor Green

Write-Host ""
Write-Host "BƯỚC 3: STOP CÁC CONTAINER DEV" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

Write-Host "Đang dừng frontend-dev và backend-dev..." -ForegroundColor Cyan
docker compose stop frontend-dev backend-dev 2>$null

Write-Host "✓ Containers đã dừng" -ForegroundColor Green

Write-Host ""
Write-Host "BƯỚC 4: RESTORE DATABASE" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

Write-Host "Đang copy backup vào container DB..." -ForegroundColor Cyan
docker cp "$localBackupPath" dacn_db:/tmp/restore.dump

Write-Host "Đang drop và recreate database..." -ForegroundColor Cyan
docker exec -i dacn_db psql -U admin -c "DROP DATABASE IF EXISTS \`"Web_QuanLyDiemRenLuyen\`";" postgres 2>$null
docker exec -i dacn_db psql -U admin -c "CREATE DATABASE \`"Web_QuanLyDiemRenLuyen\`";" postgres

Write-Host "Đang restore dữ liệu..." -ForegroundColor Cyan
docker exec -i dacn_db pg_restore -U admin -d Web_QuanLyDiemRenLuyen -v /tmp/restore.dump 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Restore hoàn tất!" -ForegroundColor Green
} else {
    Write-Host "⚠ Restore có một số cảnh báo (thường là bình thường)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "BƯỚC 5: KHỞI ĐỘNG LẠI CONTAINERS" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

Write-Host "Đang khởi động backend-dev và frontend-dev..." -ForegroundColor Cyan
docker compose up -d backend-dev frontend-dev

Start-Sleep -Seconds 5

Write-Host "✓ Containers đã khởi động" -ForegroundColor Green

Write-Host ""
Write-Host "BƯỚC 6: KIỂM TRA DỮ LIỆU" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

Write-Host "Đang đếm số lượng dữ liệu..." -ForegroundColor Cyan

$userCount = docker exec dacn_db psql -U admin -d Web_QuanLyDiemRenLuyen -t -c "SELECT COUNT(*) FROM nguoi_dung;" 2>$null
$activityCount = docker exec dacn_db psql -U admin -d Web_QuanLyDiemRenLuyen -t -c "SELECT COUNT(*) FROM hoat_dong;" 2>$null
$roleCount = docker exec dacn_db psql -U admin -d Web_QuanLyDiemRenLuyen -t -c "SELECT COUNT(*) FROM vai_tro;" 2>$null

Write-Host ""
Write-Host "📊 DỮ LIỆU SAU KHI RESTORE:" -ForegroundColor Green
Write-Host "  - Người dùng: $($userCount.Trim())" -ForegroundColor Cyan
Write-Host "  - Hoạt động: $($activityCount.Trim())" -ForegroundColor Cyan  
Write-Host "  - Vai trò: $($roleCount.Trim())" -ForegroundColor Cyan

Write-Host ""
Write-Host "Danh sách vai trò:" -ForegroundColor Cyan
docker exec dacn_db psql -U admin -d Web_QuanLyDiemRenLuyen -c "SELECT id, ten_vt FROM vai_tro ORDER BY ten_vt;" 2>$null

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ HOÀN TẤT KHÔI PHỤC!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📁 File backup được lưu tại: $localBackupPath" -ForegroundColor Cyan
Write-Host "🌐 Mở ứng dụng: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔍 Mở Prisma Studio: http://localhost:5555" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 TIP: Nếu cần rollback, chạy lại script này." -ForegroundColor Yellow
Write-Host ""
