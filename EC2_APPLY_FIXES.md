# 🚀 EC2 - ÁP DỤNG CÁC BẢN VÁ LỖI

**Ngày:** 22/10/2025  
**Mục đích:** Pull code mới từ GitHub và áp dụng các fix cho EC2 production

---

## 📋 CHUẨN BỊ

### Các bản vá đã được push lên GitHub:

1. ✅ **Database Security Fix** - Đã áp dụng trên EC2 (port 5432 secured)
2. ✅ **CORS Enhancement** - `backend/src/middlewares/cors.js` hỗ trợ multiple origins
3. ✅ **Semester Reactivation Fix** - `backend/src/routes/semesters.route.js` auto-unlock classes
4. ✅ **Documentation** - Các file hướng dẫn và scripts

---

## 🔧 BƯỚC 1: BACKUP PRODUCTION

Trên EC2, chạy các lệnh sau:

```bash
# SSH vào EC2
ssh ec2-user@<EC2_PUBLIC_IP>

# Di chuyển vào thư mục app
cd ~/app

# 1. Backup database
echo "=== Backing up database ==="
docker exec hoatdongrenluyen-db pg_dump \
  -U admin \
  -d hoatdongrenluyen \
  -F c \
  -f /tmp/backup_before_update_$(date +%Y%m%d_%H%M%S).dump

# Copy backup ra host
docker cp hoatdongrenluyen-db:/tmp/backup_before_update_*.dump ~/backups/

# 2. Backup docker-compose.production.yml
cp docker-compose.production.yml docker-compose.production.yml.backup-$(date +%Y%m%d_%H%M%S)

# 3. Backup .env file (nếu có)
cp .env .env.backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "No .env file to backup"

echo "✅ Backups completed!"
ls -lh ~/backups/
```

---

## 🔄 BƯỚC 2: PULL CODE MỚI TỪ GITHUB

```bash
cd ~/app

# 1. Stash local changes (nếu có)
echo "=== Checking for local changes ==="
git status

# Nếu có thay đổi local, stash chúng
git stash save "Local changes before pull $(date +%Y%m%d_%H%M%S)"

# 2. Pull code mới
echo "=== Pulling latest code from GitHub ==="
git pull origin main

# 3. Xem các thay đổi vừa pull
echo "=== Recent changes ==="
git log -5 --oneline
```

---

## 🏗️ BƯỚC 3: CẬP NHẬT DOCKER-COMPOSE.PRODUCTION.YML

**Kiểm tra file `docker-compose.production.yml` đã được cập nhật:**

```bash
cd ~/app

# Xem cấu hình DB ports (phải được comment out)
echo "=== DB Configuration ==="
grep -A 20 "^  db:" docker-compose.production.yml | head -25

# Xem backend CORS config
echo -e "\n=== Backend CORS ==="
grep -A 5 "CORS_ORIGIN" docker-compose.production.yml
```

### ⚠️ **QUAN TRỌNG:** Cập nhật CORS_ORIGIN cho Production

Bạn cần cập nhật `CORS_ORIGIN` trong `docker-compose.production.yml`:

```bash
# Kiểm tra IP public của EC2
echo "=== EC2 Public IP ==="
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "Public IP: $EC2_PUBLIC_IP"

# Kiểm tra domain (nếu có)
echo "=== Your domain ==="
echo "Domain: hoatdongrenluyen.io.vn"
```

**Sửa thủ công file `docker-compose.production.yml`:**

```bash
nano docker-compose.production.yml
```

**Tìm và cập nhật phần backend environment:**

```yaml
  backend:
    environment:
      CORS_ORIGIN: https://hoatdongrenluyen.io.vn,http://hoatdongrenluyen.io.vn
      # Hoặc nếu dùng IP:
      # CORS_ORIGIN: http://<EC2_PUBLIC_IP>:3000,https://hoatdongrenluyen.io.vn
```

Lưu file: `Ctrl+X`, `Y`, `Enter`

---

## 🚀 BƯỚC 4: REBUILD VÀ RESTART SERVICES

```bash
cd ~/app

# 1. Verify YAML syntax
echo "=== Validating docker-compose.yml ==="
docker compose -f docker-compose.production.yml config > /dev/null && \
  echo "✅ YAML is valid" || echo "❌ YAML has errors - FIX BEFORE CONTINUING!"

# 2. Pull latest images (nếu có)
echo -e "\n=== Pulling Docker images ==="
docker compose -f docker-compose.production.yml pull

# 3. Rebuild backend (để áp dụng code mới)
echo -e "\n=== Rebuilding backend ==="
docker compose -f docker-compose.production.yml build backend --no-cache

# 4. Rebuild frontend (nếu có thay đổi)
echo -e "\n=== Rebuilding frontend ==="
docker compose -f docker-compose.production.yml build frontend --no-cache

# 5. Restart all services với images mới
echo -e "\n=== Restarting services ==="
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d

# 6. Wait for services to be healthy
echo -e "\n=== Waiting for services to start ==="
sleep 15

# 7. Check container status
echo -e "\n=== Container Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## ✅ BƯỚC 5: VERIFY CÁC BẢN VÁ ĐÃ ĐƯỢC ÁP DỤNG

### 1. **Kiểm tra Database Security (Port 5432)**

```bash
echo "=== DATABASE SECURITY CHECK ==="
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "NAME|db"

# Should show: "5432/tcp" (NO 0.0.0.0 mapping!)
docker port hoatdongrenluyen-db || echo "✅ Port 5432 NOT exposed - SECURED!"

# Netstat check
sudo netstat -tuln | grep 5432 || echo "✅ Port 5432 not listening externally"
```

**Expected Result:** ✅ Port 5432 chỉ mở internal, KHÔNG exposed ra internet

---

### 2. **Kiểm tra Backend CORS Middleware**

```bash
echo "=== BACKEND CORS CHECK ==="

# Check logs for CORS config
docker logs hoatdongrenluyen-backend --tail 50 | grep -i "cors\|server\|started"

# Test API endpoint
curl -s http://localhost:5000/api/health || echo "Backend may not have /health endpoint"

# Check environment variables
docker exec hoatdongrenluyen-backend printenv | grep CORS_ORIGIN
```

**Expected Result:** ✅ Backend logs show "Server started successfully"

---

### 3. **Kiểm tra Semester Reactivation Fix**

```bash
echo "=== CHECKING SEMESTER ROUTES ==="

# Verify backend code có fix semester reactivation
docker exec hoatdongrenluyen-backend cat /app/src/routes/semesters.route.js | grep -A 10 "Step 4" | head -15

# Should see code about unlocking LOCKED_HARD/LOCKED_SOFT classes
```

**Expected Result:** ✅ Code có logic unlock classes khi reactivate semester

---

### 4. **Test Production Application**

```bash
echo "=== APPLICATION HEALTH CHECK ==="

# Test frontend
curl -I http://localhost:3000 2>&1 | head -1

# Test backend API
curl -s http://localhost:5000/api/semesters | head -20

# Check database connection
docker logs hoatdongrenluyen-backend --tail 20 | grep -i "database\|connected"
```

**Expected Result:** ✅ Tất cả services đều healthy

---

## 🌐 BƯỚC 6: TEST TỪ BROWSER

### Từ browser, truy cập:

```
https://hoatdongrenluyen.io.vn
```

**Test checklist:**

- [ ] ✅ Website load thành công
- [ ] ✅ Login thành công (không có CORS error)
- [ ] ✅ API calls hoạt động bình thường
- [ ] ✅ Semester dropdown load được dữ liệu
- [ ] ✅ Không có lỗi trong Browser Console (F12)

---

## 🔍 TROUBLESHOOTING

### Nếu có lỗi, kiểm tra logs:

```bash
# Backend logs
docker logs hoatdongrenluyen-backend --tail 100

# Frontend logs
docker logs hoatdongrenluyen-frontend --tail 100

# Database logs
docker logs hoatdongrenluyen-db --tail 50

# All containers
docker compose -f docker-compose.production.yml logs --tail=50
```

### Nếu cần rollback:

```bash
cd ~/app

# 1. Restore docker-compose.yml
LATEST_BACKUP=$(ls -t docker-compose.production.yml.backup-* | head -1)
cp "$LATEST_BACKUP" docker-compose.production.yml

# 2. Restart services
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d

# 3. Restore database (nếu cần)
LATEST_DB_BACKUP=$(ls -t ~/backups/backup_before_update_*.dump | head -1)
docker exec -i hoatdongrenluyen-db pg_restore \
  -U admin \
  -d hoatdongrenluyen \
  -c \
  < "$LATEST_DB_BACKUP"
```

---

## 📊 SUMMARY - CÁC BẢN VÁ ĐÃ ÁP DỤNG

| Fix | Component | Status |
|-----|-----------|--------|
| Database Port Security | `docker-compose.production.yml` | ✅ Port 5432 commented out |
| CORS Multi-Origin | `backend/src/middlewares/cors.js` | ✅ Supports comma-separated origins |
| Semester Reactivation | `backend/src/routes/semesters.route.js` | ✅ Auto-unlock classes |
| LOP_TRUONG Permissions | Database | ✅ Added activities.create |

---

## 🎯 KẾT LUẬN

Sau khi hoàn thành các bước trên:

1. ✅ **Security:** Database port 5432 không còn exposed
2. ✅ **CORS:** Backend hỗ trợ multiple origins
3. ✅ **Features:** Semester reactivation auto-unlock classes
4. ✅ **Permissions:** LOP_TRUONG có đủ quyền tạo hoạt động

---

## 📞 SUPPORT

Nếu gặp vấn đề, kiểm tra:

1. Docker logs: `docker compose -f docker-compose.production.yml logs`
2. Container status: `docker ps -a`
3. Network connectivity: `curl http://localhost:5000/api/health`
4. Database connection: `docker exec hoatdongrenluyen-backend printenv DATABASE_URL`

---

**Hoàn thành bởi:** GitHub Copilot  
**Ngày:** 22/10/2025  
**Phiên bản:** Production v1.0
