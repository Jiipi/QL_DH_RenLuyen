# 🚀 EC2 - HƯỚNG DẪN NHANH ÁP DỤNG BẢN VÁ

## 📋 BƯỚC 1: SSH VÀO EC2

```bash
ssh ec2-user@<YOUR_EC2_IP>
```

---

## 📥 BƯỚC 2: PULL CODE MỚI VÀ CHẠY SCRIPT TỰ ĐỘNG

### Option A: Chạy script tự động (KHUYẾN NGHỊ)

```bash
cd ~/app

# Pull code mới từ GitHub
git pull origin main

# Make script executable
chmod +x EC2_QUICK_APPLY.sh

# Run the automated script
./EC2_QUICK_APPLY.sh
```

Script sẽ tự động:
- ✅ Backup database
- ✅ Backup docker-compose.production.yml
- ✅ Pull latest code
- ✅ Rebuild containers
- ✅ Restart services
- ✅ Verify deployment

---

### Option B: Chạy từng lệnh thủ công

```bash
cd ~/app

# 1. Backup
mkdir -p ~/backups
docker exec hoatdongrenluyen-db pg_dump -U admin -d hoatdongrenluyen -F c -f /tmp/backup_$(date +%Y%m%d_%H%M%S).dump
docker cp hoatdongrenluyen-db:/tmp/backup_*.dump ~/backups/
cp docker-compose.production.yml docker-compose.production.yml.backup-$(date +%Y%m%d_%H%M%S)

# 2. Pull code mới
git stash  # Nếu có local changes
git pull origin main

# 3. Kiểm tra CORS config (QUAN TRỌNG!)
grep "CORS_ORIGIN" docker-compose.production.yml

# Nếu cần sửa CORS_ORIGIN:
nano docker-compose.production.yml
# Sửa thành: CORS_ORIGIN: https://hoatdongrenluyen.io.vn,http://hoatdongrenluyen.io.vn
# Lưu: Ctrl+X, Y, Enter

# 4. Validate YAML
docker compose -f docker-compose.production.yml config > /dev/null && echo "✅ YAML OK"

# 5. Rebuild và restart
docker compose -f docker-compose.production.yml build backend --no-cache
docker compose -f docker-compose.production.yml build frontend --no-cache
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d

# 6. Wait and verify
sleep 20
docker ps
docker logs hoatdongrenluyen-backend --tail 20 | grep -i "started\|database"
```

---

## ✅ BƯỚC 3: VERIFY

```bash
# Kiểm tra database port security
docker ps --format "{{.Names}}: {{.Ports}}" | grep db
# Expected: "5432/tcp" (NO 0.0.0.0!)

# Kiểm tra containers
docker ps

# Kiểm tra backend logs
docker logs hoatdongrenluyen-backend --tail 30

# Test website
curl -I http://localhost:3000
curl http://localhost:5000/api/semesters | head -20
```

---

## 🌐 BƯỚC 4: TEST TRÊN BROWSER

Mở browser và truy cập:
```
https://hoatdongrenluyen.io.vn
```

Checklist:
- [ ] Website load thành công
- [ ] Login thành công (không CORS error)
- [ ] Semester dropdown hoạt động
- [ ] Không có lỗi trong Console (F12)

---

## 🆘 ROLLBACK NẾU CẦN

```bash
cd ~/app

# Restore config
LATEST=$(ls -t docker-compose.production.yml.backup-* | head -1)
cp "$LATEST" docker-compose.production.yml

# Restart
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

---

## 📊 CÁC BẢN VÁ ĐÃ ÁP DỤNG

1. ✅ **Database Security** - Port 5432 không còn exposed
2. ✅ **CORS Enhancement** - Hỗ trợ multiple origins
3. ✅ **Semester Auto-unlock** - Reactivation tự động unlock classes
4. ✅ **LOP_TRUONG Permissions** - Có quyền tạo activities

---

## 📞 TRỢ GIÚP

Xem logs:
```bash
docker compose -f docker-compose.production.yml logs -f
docker logs hoatdongrenluyen-backend
docker logs hoatdongrenluyen-frontend
docker logs hoatdongrenluyen-db
```

Kiểm tra chi tiết: Xem file `EC2_APPLY_FIXES.md`
