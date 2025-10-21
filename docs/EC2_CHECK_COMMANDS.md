# 🔍 HƯỚNG DẪN KIỂM TRA DATABASE SECURITY TRÊN EC2

## 📋 YÊU CẦU

- ✅ Đã SSH vào EC2
- ✅ Có quyền sudo hoặc Docker
- ✅ Đang ở thư mục chứa docker-compose file

---

## 🚀 CÁCH 1: CHẠY SCRIPT TỰ ĐỘNG (KHUYẾN NGHỊ)

### Bước 1: Tạo script kiểm tra

```bash
# Di chuyển vào thư mục app
cd ~/app

# Tạo file script
cat > check-db-security.sh << 'SCRIPT_EOF'
#!/bin/bash
# Paste toàn bộ nội dung từ scripts/ec2-check-db-security.sh vào đây
# Hoặc download từ GitHub
SCRIPT_EOF

# Cho phép execute
chmod +x check-db-security.sh
```

### Bước 2: Chạy script

```bash
./check-db-security.sh
```

**Output mẫu:**

```
╔═══════════════════════════════════════════════════════════╗
║        EC2 DATABASE SECURITY CHECK                       ║
╚═══════════════════════════════════════════════════════════╝

[1] Kiểm tra thư mục hiện tại...
   📂 Đang ở: /home/ec2-user/app
✅ Tìm thấy: docker-compose.production.yml

[2] Kiểm tra Docker containers...
...
```

---

## 🔧 CÁCH 2: CHẠY TỪNG LỆNH THỦ CÔNG

### 1️⃣ Di chuyển vào thư mục app

```bash
cd ~/app
# Hoặc nơi chứa docker-compose.yml
```

### 2️⃣ Kiểm tra containers đang chạy

```bash
docker compose ps
# Hoặc
docker ps
```

**Xem cột PORTS:**
```
PORTS
0.0.0.0:5432->5432/tcp  ← ❌ NGUY HIỂM! Port exposed
                         ← ✅ AN TOÀN! Không có port exposure
```

### 3️⃣ Kiểm tra port mapping của DB container

```bash
# Tìm DB container ID
DB_CONTAINER=$(docker ps -q -f name=db -f name=postgres | head -1)
echo "DB Container: $DB_CONTAINER"

# Kiểm tra ports
docker port $DB_CONTAINER
```

**Kết quả:**

**❌ NGUY HIỂM nếu thấy:**
```
5432/tcp -> 0.0.0.0:5432
```

**✅ AN TOÀN nếu thấy:**
```
(không có output hoặc rỗng)
```

### 4️⃣ Kiểm tra trong docker-compose file

```bash
# Với production
grep -A 5 "db:" docker-compose.production.yml | grep "5432"

# Với dev
grep -A 5 "db:" docker-compose.yml | grep "5432"
```

**❌ NGUY HIỂM nếu thấy:**
```yaml
ports:
  - "5432:5432"
```

**✅ AN TOÀN nếu thấy:**
```yaml
# ports:
#   - "5432:5432"
```

### 5️⃣ Test kết nối từ localhost

```bash
timeout 2 bash -c "</dev/tcp/localhost/5432" && echo "Port 5432 MỞ" || echo "Port 5432 ĐÓNG"
```

### 6️⃣ Lấy IP của EC2

```bash
# Public IP
curl -s http://169.254.169.254/latest/meta-data/public-ipv4
# Hoặc
curl ifconfig.me

# Private IP
curl -s http://169.254.169.254/latest/meta-data/local-ipv4
```

### 7️⃣ Test backend vẫn connect được DB

```bash
# Tìm backend container
BACKEND=$(docker ps -q -f name=backend | head -1)

# Test connection
docker exec $BACKEND node -e "
const {PrismaClient} = require('@prisma/client');
(async () => {
  try {
    const prisma = new PrismaClient();
    await prisma.\$connect();
    console.log('✅ Backend connect DB thành công!');
    await prisma.\$disconnect();
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  }
})()
"
```

**Kết quả mong đợi:**
```
✅ Backend connect DB thành công!
```

---

## 📊 KIỂM TRA NHANH - ONE-LINER

```bash
# All-in-one check
echo "=== DB PORT CHECK ===" && \
docker ps --format "{{.Names}}: {{.Ports}}" | grep -i "db\|postgres" && \
echo "=== CONFIG CHECK ===" && \
grep -A 2 "5432" docker-compose*.yml 2>/dev/null | head -5
```

---

## 🎯 DIỄN GIẢI KẾT QUẢ

### ✅ AN TOÀN (Mẫu output tốt)

```bash
=== DB PORT CHECK ===
dacn_db:                     ← Không có port mapping

=== CONFIG CHECK ===
# ports:
#   - "5432:5432"             ← Port đã bị comment
```

### ❌ NGUY HIỂM (Cần fix ngay)

```bash
=== DB PORT CHECK ===
dacn_db: 0.0.0.0:5432->5432/tcp    ← Port ĐANG MỞ!

=== CONFIG CHECK ===
ports:
  - "5432:5432"                     ← Config expose port
```

→ **PHẢI FIX NGAY!**

---

## 🔧 NẾU PHÁT HIỆN VẤN ĐỀ - FIX NGAY

### Quick Fix (30 giây)

```bash
cd ~/app

# Backup
cp docker-compose.production.yml docker-compose.production.yml.backup

# Comment out port
sed -i '/db:/,/networks:/ s/^\( *\)- "5432:5432"/\1# - "5432:5432"/' docker-compose.production.yml

# Restart
docker compose -f docker-compose.production.yml restart db

# Verify
docker ps | grep db
```

### Verify sau khi fix

```bash
# Port không còn exposed
docker port $(docker ps -q -f name=db) || echo "✅ Port đã đóng"

# Backend vẫn hoạt động
curl http://localhost:3333/api/health
```

---

## 📞 TROUBLESHOOTING

### Lỗi: "Cannot find DB container"

```bash
# List tất cả containers
docker ps -a

# Tìm tên chính xác
docker ps --format "{{.Names}}" | grep -i postgres
docker ps --format "{{.Names}}" | grep -i db
```

### Lỗi: "Backend không connect được DB"

```bash
# Xem logs
docker compose logs backend | tail -50

# Kiểm tra DATABASE_URL
docker exec $(docker ps -q -f name=backend) printenv DATABASE_URL
```

### Lỗi: "Permission denied"

```bash
# Thêm sudo
sudo docker ps
sudo docker exec ...
```

---

## 📚 TÀI LIỆU LIÊN QUAN

- `scripts/ec2-check-db-security.sh` - Script tự động
- `scripts/ec2-fix-database-security.sh` - Script fix
- `docs/EC2_FIX_DATABASE_SECURITY.md` - Hướng dẫn chi tiết
- `CRITICAL_DATABASE_WARNING.md` - Cảnh báo bảo mật

---

## ✅ CHECKLIST

- [ ] SSH vào EC2
- [ ] Chạy script kiểm tra
- [ ] Kiểm tra output - An toàn hay Nguy hiểm?
- [ ] Nếu nguy hiểm → Chạy fix script
- [ ] Verify sau khi fix
- [ ] Document kết quả

---

**Cập nhật:** 2025-10-22  
**Platform:** EC2 Linux (Amazon Linux / Ubuntu)  
**Thời gian:** ~2 phút
