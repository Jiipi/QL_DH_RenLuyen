# ===============================================
# SCRIPT KIỂM TRA NHANH 2 VẤN ĐỀ
# ===============================================

Write-Host ""
Write-Host "🔍 KIỂM TRA HỆ THỐNG - 2 VẤN ĐỀ" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# Vấn đề 1: Database Isolation
Write-Host "📊 VẤN ĐỀ 1: KIỂM TRA DATABASE ISOLATION" -ForegroundColor Yellow
Write-Host "-" * 60

Write-Host "`n1️⃣  Database Dev (Local Docker):" -ForegroundColor White
try {
    $devDb = docker compose exec -T db psql -U admin -d Web_QuanLyDiemRenLuyen -t -c "SELECT current_database(), inet_server_addr() as db_ip;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Dev DB đang chạy:" -ForegroundColor Green
        Write-Host "   $devDb" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Không kết nối được dev DB" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Lỗi: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2️⃣  Kiểm tra port 5432 có mở từ bên ngoài không:" -ForegroundColor White
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress
if ($localIP) {
    Write-Host "   IP máy local: $localIP" -ForegroundColor Cyan
    Write-Host "   ⚠️  Nếu EC2 có thể connect tới $localIP`:5432 => NGUY HIỂM!" -ForegroundColor Yellow
} else {
    Write-Host "   ℹ️  Không tìm thấy IP local" -ForegroundColor Gray
}

Write-Host "`n3️⃣  Kiểm tra DATABASE_URL trong backend-dev:" -ForegroundColor White
$dbUrl = docker compose exec -T backend-dev sh -c 'echo $DATABASE_URL' 2>&1
if ($dbUrl -match "@db:5432") {
    Write-Host "   ✅ Backend đang kết nối tới Docker DB (db:5432)" -ForegroundColor Green
    Write-Host "   $dbUrl" -ForegroundColor Gray
} elseif ($dbUrl -match "@localhost:5432") {
    Write-Host "   ✅ Backend đang kết nối tới localhost:5432 (Docker exposed)" -ForegroundColor Green
    Write-Host "   $dbUrl" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  DATABASE_URL: $dbUrl" -ForegroundColor Yellow
    if ($dbUrl -match "(\d+\.\d+\.\d+\.\d+)") {
        Write-Host "   ⚠️  Phát hiện IP: $($Matches[1]) - Có thể là EC2!" -ForegroundColor Red
    }
}

# Vấn đề 2: Cross-Device Login
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "🌐 VẤN ĐỀ 2: KIỂM TRA CROSS-DEVICE ACCESS" -ForegroundColor Yellow
Write-Host "-" * 60

Write-Host "`n1️⃣  Lấy IP local của máy này:" -ForegroundColor White
$myIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress
if ($myIP) {
    Write-Host "   ✅ IP: $myIP" -ForegroundColor Green
    Write-Host "   📱 Thiết bị khác có thể truy cập:" -ForegroundColor Cyan
    Write-Host "      Frontend: http://$myIP`:3000" -ForegroundColor White
    Write-Host "      Backend:  http://$myIP`:3001/api" -ForegroundColor White
} else {
    Write-Host "   ❌ Không tìm thấy IP local" -ForegroundColor Red
}

Write-Host "`n2️⃣  Kiểm tra CORS_ORIGIN trong backend:" -ForegroundColor White
$corsOrigin = docker compose exec -T backend-dev sh -c 'echo $CORS_ORIGIN' 2>&1
if ($corsOrigin) {
    Write-Host "   CORS_ORIGIN = $corsOrigin" -ForegroundColor Gray
    
    if ($corsOrigin -match "\*" -or $corsOrigin -eq "true") {
        Write-Host "   ✅ Cho phép TẤT CẢ origins (Development mode)" -ForegroundColor Green
    } elseif ($corsOrigin -match ",") {
        Write-Host "   ✅ Cho phép NHIỀU origins" -ForegroundColor Green
        $origins = $corsOrigin -split "," | ForEach-Object { $_.Trim() }
        foreach ($origin in $origins) {
            Write-Host "      - $origin" -ForegroundColor Cyan
        }
    } elseif ($corsOrigin -match "localhost") {
        Write-Host "   ⚠️  CHỈ cho phép localhost - thiết bị khác sẽ BỊ CHẶN!" -ForegroundColor Yellow
    } else {
        Write-Host "   ℹ️  Origin: $corsOrigin" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ❌ Không đọc được CORS_ORIGIN" -ForegroundColor Red
}

Write-Host "`n3️⃣  Kiểm tra REACT_APP_API_URL trong frontend:" -ForegroundColor White
$apiUrl = docker compose exec -T frontend-dev sh -c 'echo $REACT_APP_API_URL' 2>&1
if ($apiUrl) {
    Write-Host "   REACT_APP_API_URL = $apiUrl" -ForegroundColor Gray
    
    if ($apiUrl -match "localhost" -or $apiUrl -match "127\.0\.0\.1") {
        Write-Host "   ⚠️  Frontend chỉ biết localhost - thiết bị khác KHÔNG connect được!" -ForegroundColor Yellow
        if ($myIP) {
            Write-Host "   💡 Nên đổi thành: http://$myIP`:3001/api" -ForegroundColor Cyan
        }
    } elseif ($apiUrl -match "(\d+\.\d+\.\d+\.\d+)") {
        Write-Host "   ✅ Frontend đang dùng IP: $($Matches[1])" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  API URL: $apiUrl" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ❌ Không đọc được REACT_APP_API_URL" -ForegroundColor Red
}

Write-Host "`n4️⃣  Test API từ máy local:" -ForegroundColor White
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Backend API hoạt động!" -ForegroundColor Green
    Write-Host "   Response: $($healthCheck | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Không kết nối được API: $($_.Exception.Message)" -ForegroundColor Red
}

# Tổng kết
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "📋 TÓM TẮT VÀ KHUYẾN NGHỊ" -ForegroundColor Cyan
Write-Host "-" * 60

Write-Host "`n🎯 Để FIX 2 vấn đề:" -ForegroundColor White

Write-Host "`n1. DATABASE ISOLATION:" -ForegroundColor Yellow
Write-Host "   • Đảm bảo dev KHÔNG connect tới EC2 production DB" -ForegroundColor White
Write-Host "   • Nếu cần: Restore backup từ prod về dev" -ForegroundColor White
Write-Host "   • Script: .\scripts\restore-prod-to-dev.ps1" -ForegroundColor Gray

Write-Host "`n2. CROSS-DEVICE LOGIN:" -ForegroundColor Yellow
if ($myIP) {
    Write-Host "   a) Cập nhật docker-compose.yml:" -ForegroundColor White
    Write-Host "      CORS_ORIGIN: `"http://localhost:3000,http://$myIP`:3000`"" -ForegroundColor Cyan
    Write-Host "      REACT_APP_API_URL: `"http://$myIP`:3001/api`"" -ForegroundColor Cyan
    
    Write-Host "`n   b) Restart containers:" -ForegroundColor White
    Write-Host "      docker compose down" -ForegroundColor Gray
    Write-Host "      docker compose --profile dev up -d" -ForegroundColor Gray
    
    Write-Host "`n   c) Truy cập từ thiết bị khác:" -ForegroundColor White
    Write-Host "      http://$myIP`:3000" -ForegroundColor Cyan
} else {
    Write-Host "   ⚠️  Không tìm thấy IP local để cấu hình" -ForegroundColor Red
}

Write-Host "`n📚 Tài liệu chi tiết:" -ForegroundColor White
Write-Host "   • CRITICAL_DATABASE_WARNING.md" -ForegroundColor Cyan
Write-Host "   • FIX_CROSS_DEVICE_LOGIN.md" -ForegroundColor Cyan

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""
