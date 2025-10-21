# 🔒 HƯỚNG DẪN FIX DATABASE SECURITY TRÊN EC2

## ⚠️ VẤN ĐỀ NGHIÊM TRỌNG

**Production Database đang EXPOSE port 5432 ra internet!**

Điều này cho phép:
- ❌ Bất kỳ ai biết IP và credentials có thể truy cập
- ❌ Dev local có thể kết nối và thay đổi production data
- ❌ Nguy cơ bảo mật cực kỳ cao

---

## ✅ GIẢI PHÁP

### **Phương án 1: Tự động (Khuyến nghị)**

**SSH vào EC2 và chạy script:**

```bash
# 1. SSH vào EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# 2. Di chuyển vào thư mục app
cd ~/app

# 3. Download script fix
curl -o fix-db-security.sh https://raw.githubusercontent.com/YOUR_REPO/main/scripts/ec2-fix-database-security.sh

# Hoặc tạo file mới:
nano fix-db-security.sh
# Paste nội dung từ scripts/ec2-fix-database-security.sh
# Save: Ctrl+O, Enter, Ctrl+X

# 4. Cho phép execute
chmod +x fix-db-security.sh

# 5. Chạy script
./fix-db-security.sh
```

Script sẽ:
1. ✅ Backup file cũ
2. ✅ Comment out port 5432
3. ✅ Restart containers
4. ✅ Verify backend vẫn hoạt động

---

### **Phương án 2: Thủ công**

**Bước 1: SSH vào EC2**
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
cd ~/app
```

**Bước 2: Backup docker-compose**
```bash
cp docker-compose.production.yml docker-compose.production.yml.backup
```

**Bước 3: Sửa file docker-compose.production.yml**
```bash
nano docker-compose.production.yml
```

**Tìm section `db:` và COMMENT hoặc XÓA phần `ports:`:**

```yaml
# BEFORE (NGUY HIỂM):
services:
  db:
    image: postgres:15
    container_name: dacn_db_prod
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: Web_QuanLyDiemRenLuyen
    ports:
      - "5432:5432"  # ← XÓA DÒNG NÀY!
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - dacn_network
```

```yaml
# AFTER (AN TOÀN):
services:
  db:
    image: postgres:15
    container_name: dacn_db_prod
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: Web_QuanLyDiemRenLuyen
    # ports:  # ← COMMENT OUT
    #   - "5432:5432"  # ← KHÔNG EXPOSE PORT
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - dacn_network
```

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Bước 4: Restart containers**
```bash
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

**Bước 5: Verify**
```bash
# Backend vẫn connect được DB không?
docker compose -f docker-compose.production.yml logs backend | grep -i "database\|prisma"

# Test DB connection
docker compose -f docker-compose.production.yml exec backend node -e "const {PrismaClient}=require('@prisma/client');(async()=>{try{const p=new PrismaClient();await p.\$connect();console.log('✅ DB Connected');await p.\$disconnect()}catch(e){console.error('❌',e.message)}})()"
```

**Kết quả mong đợi:** `✅ DB Connected`

---

## 🔐 TĂNG CƯỜNG BẢO MẬT AWS

Ngoài việc đóng port trong Docker, **PHẢI** cấu hình AWS Security Group:

**Bước 1: Truy cập AWS Console**
- Vào EC2 Dashboard
- Click vào instance của bạn
- Tab **Security** → Click vào **Security Group**

**Bước 2: Edit Inbound Rules**
- Click **Edit inbound rules**
- **XÓA** rule cho phép port 5432 (nếu có)
- Chỉ giữ lại:
  - Port 22 (SSH) - Source: My IP
  - Port 80 (HTTP) - Source: 0.0.0.0/0
  - Port 443 (HTTPS) - Source: 0.0.0.0/0
  - Port 3333 (App) - Source: 0.0.0.0/0 (nếu cần)

**Bước 3: Save rules**

---

## ✅ KIỂM TRA SAU KHI FIX

### Test 1: Backend vẫn hoạt động bình thường
```bash
curl https://your-domain.com/api/health
# Hoặc
curl http://your-ec2-ip:3333/api/health
```
**Kết quả mong đợi:** `{"success":true}`

### Test 2: Database KHÔNG accessible từ bên ngoài
```bash
# Từ máy dev local (Windows)
Test-NetConnection -ComputerName <EC2_IP> -Port 5432
```
**Kết quả mong đợi:** `TcpTestSucceeded : False` (Connection refused)

### Test 3: Backend trong Docker vẫn connect được DB
```bash
# Trên EC2
docker compose -f docker-compose.production.yml exec backend npx prisma db pull
```
**Kết quả mong đợi:** `✔ Introspected 20 models`

---

## 🆘 ROLLBACK (Nếu có vấn đề)

```bash
# Trên EC2
cd ~/app

# Restore file cũ
mv docker-compose.production.yml.backup docker-compose.production.yml

# Restart
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

---

## 📋 CHECKLIST

- [ ] SSH vào EC2 thành công
- [ ] Backup file docker-compose.production.yml
- [ ] Comment out hoặc xóa `ports: - "5432:5432"`
- [ ] Restart containers
- [ ] Backend vẫn kết nối được DB
- [ ] Website hoạt động bình thường
- [ ] Test từ bên ngoài KHÔNG connect được port 5432
- [ ] AWS Security Group đã xóa rule port 5432
- [ ] Document lại thay đổi

---

## 🎯 SAU KHI FIX

**✅ Database đã an toàn:**
- Chỉ accessible trong Docker network
- Backend vẫn hoạt động bình thường
- Dev local KHÔNG THỂ connect tới production DB
- Dữ liệu production được bảo vệ

**📊 Kiến trúc mới:**
```
Internet
    ↓
  Nginx (port 80/443)
    ↓
  Backend Container (port 3333)
    ↓ (internal network)
  Database Container (NO external port)
```

**❌ Dev local KHÔNG THỂ:**
```
Dev Local → X → EC2:5432 (BLOCKED)
```

**✅ Backend VẪN CÓ THỂ:**
```
Backend Container → ✓ → DB Container (internal: db:5432)
```

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Kiểm tra logs: `docker compose -f docker-compose.production.yml logs`
2. Xem CRITICAL_DATABASE_WARNING.md
3. Rollback về backup
4. Liên hệ admin

---

**Ngày cập nhật:** 2025-10-22  
**Mức độ ưu tiên:** 🔴 P0 - CRITICAL  
**Thời gian thực hiện:** ~5 phút
