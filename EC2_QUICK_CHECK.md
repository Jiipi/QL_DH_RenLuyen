# 🚀 QUICK START - EC2 DATABASE SECURITY CHECK

**Chạy commands này TRỰC TIẾP trên EC2 (đã SSH vào rồi)**

---

## ⚡ KIỂM TRA NHANH (30 giây)

```bash
# 1. Di chuyển vào thư mục app
cd ~/app

# 2. Check port exposure
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "db|postgres"
```

**Xem kết quả:**

✅ **AN TOÀN** nếu thấy:
```
dacn_db        (không có gì sau tên container)
```

❌ **NGUY HIỂM** nếu thấy:
```
dacn_db        0.0.0.0:5432->5432/tcp
```

---

## 🔍 KIỂM TRA CHI TIẾT (2 phút)

### Option 1: Script tự động

```bash
cd ~/app

# Tạo script
curl -o check-db.sh https://raw.githubusercontent.com/YOUR_REPO/main/scripts/ec2-check-db-security.sh

# Hoặc tạo thủ công
nano check-db.sh
# Paste nội dung từ scripts/ec2-check-db-security.sh

# Run
chmod +x check-db.sh
./check-db.sh
```

### Option 2: Manual checks

```bash
# Check 1: Container ports
docker port $(docker ps -q -f name=db)
# Nếu rỗng → ✅ AN TOÀN
# Nếu có "5432/tcp -> 0.0.0.0:5432" → ❌ NGUY HIỂM

# Check 2: Config file
grep "5432" docker-compose*.yml
# Nếu thấy "# - \"5432:5432\"" (commented) → ✅ AN TOÀN
# Nếu thấy "- \"5432:5432\"" (active) → ❌ NGUY HIỂM

# Check 3: Backend connection
docker exec $(docker ps -q -f name=backend) \
  node -e "require('@prisma/client').PrismaClient && console.log('OK')" 2>&1
# Nếu "OK" → ✅ Backend connect được DB
```

---

## 🔧 NẾU PHÁT HIỆN NGUY HIỂM - FIX NGAY

```bash
cd ~/app

# Backup
cp docker-compose.production.yml docker-compose.production.yml.backup_$(date +%Y%m%d_%H%M%S)

# Sửa file
nano docker-compose.production.yml

# Tìm section db: và comment out ports:
# Từ:
#   ports:
#     - "5432:5432"
# Thành:
#   # ports:
#   #   - "5432:5432"

# Save (Ctrl+O, Enter, Ctrl+X)

# Restart
docker compose -f docker-compose.production.yml restart db

# Verify
docker ps | grep db
# Không thấy "5432" trong cột PORTS → ✅ THÀNH CÔNG
```

---

## ✅ VERIFY SAU KHI FIX

```bash
# 1. Port đã đóng
docker port $(docker ps -q -f name=db) || echo "✅ Port closed"

# 2. Backend vẫn hoạt động
curl http://localhost:3333/api/health
# Hoặc
docker compose logs backend | tail -20

# 3. Website vẫn OK
curl -I https://your-domain.com
```

---

## 📋 COPY-PASTE COMMANDS

**Full check sequence:**

```bash
#!/bin/bash
echo "=== EC2 DB SECURITY CHECK ==="
cd ~/app || exit
echo ""
echo "1. Docker containers:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}" | grep -E "NAME|db|postgres"
echo ""
echo "2. Port mapping:"
docker port $(docker ps -q -f name=db) || echo "No ports exposed ✅"
echo ""
echo "3. Config file:"
grep -B 2 -A 2 "5432" docker-compose*.yml | head -10
echo ""
echo "4. Backend connection:"
docker exec $(docker ps -q -f name=backend) \
  node -e "const {PrismaClient}=require('@prisma/client');(async()=>{try{const p=new PrismaClient();await p.\$connect();console.log('✅ Connected');await p.\$disconnect()}catch(e){console.error('❌ Failed')}})()"
echo ""
echo "=== END CHECK ==="
```

---

## 🆘 QUICK HELP

**Lỗi thường gặp:**

1. **"docker: command not found"**
   ```bash
   sudo yum install docker -y
   sudo service docker start
   ```

2. **"Permission denied"**
   ```bash
   sudo usermod -aG docker $USER
   # Logout và login lại
   ```

3. **"No such container"**
   ```bash
   docker ps -a  # Xem tất cả containers
   docker compose ps  # Xem containers trong compose
   ```

---

## 📞 SUPPORT

- 📄 Chi tiết: `docs/EC2_CHECK_COMMANDS.md`
- 🔧 Fix script: `scripts/ec2-fix-database-security.sh`
- ⚠️ Cảnh báo: `CRITICAL_DATABASE_WARNING.md`

---

**Tạo:** 2025-10-22  
**Cập nhật:** Real-time trên EC2  
**Thời gian:** 30 giây - 2 phút
