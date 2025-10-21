# ⚠️ CẢNH BÁO NGHIÊM TRỌNG VỀ DATABASE

## 🚨 VẤN ĐỀ HIỆN TẠI

**DEV và PRODUCTION đang dùng CHUNG DATABASE!**

Điều này cực kỳ nguy hiểm vì:
- Thay đổi ở dev → Ảnh hưởng production
- Test/debug ở dev → Phá vỡ dữ liệu thật
- Xóa data ở dev → Mất dữ liệu production

## ✅ GIẢI PHÁP KHẨN CẤP

### Phương án 1: Tắt port exposure của Production DB (BẮT BUỘC)

**Trên EC2 Production:**

```bash
ssh ec2-user@your-ec2-ip

# Sửa docker-compose.production.yml
cd ~/app
nano docker-compose.production.yml
```

**Tìm section `db:` và COMMENT hoặc XÓA phần `ports:`:**

```yaml
services:
  db:
    image: postgres:15
    container_name: dacn_db_prod
    # ⚠️ XÓA HOẶC COMMENT DÒNG SAU:
    # ports:
    #   - "5432:5432"  # ← ĐỪNG EXPOSE RA NGOÀI!
```

**Restart containers:**
```bash
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

✅ **Kết quả:** Dev local không thể connect tới Production DB nữa

---

### Phương án 2: Dùng Database riêng cho Dev

**Cách 1: Dùng Docker DB local (KHUYẾN NGHỊ)**

File `docker-compose.yml` hiện tại đã có DB riêng cho dev:
```yaml
services:
  db:
    image: postgres:15
    container_name: dacn_db  # ← DB riêng cho dev
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: Web_QuanLyDiemRenLuyen
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: abc
```

**KI\u1ec2M TRA dev có đang connect đúng DB local:**

```powershell
# Trong D:\DACN_Web_quanly_hoatdongrenluyen-master
docker compose exec db psql -U admin -d Web_QuanLyDiemRenLuyen -c "SELECT current_database(), inet_server_addr();"
```

Nếu thấy IP `172.x.x.x` → Đúng, đang dùng DB trong Docker  
Nếu thấy IP public của EC2 → SAI, đang connect tới production!

---

**Cách 2: Restore backup từ Production về Dev (An toàn)**

```powershell
# Chạy script restore
cd D:\DACN_Web_quanly_hoatdongrenluyen-master
.\scripts\restore-prod-to-dev.ps1
```

Script này sẽ:
1. Backup DB từ EC2 production
2. Download về local
3. Restore vào Docker DB local
4. ✅ Dev có dữ liệu giống prod nhưng TÁCH BIỆT

---

## 🔒 KIỂM TRA BẢO MẬT

### Test 1: Dev không thể connect tới Production DB

```powershell
# Thử connect từ máy local tới EC2 DB
psql -h <EC2_PUBLIC_IP> -p 5432 -U admin -d Web_QuanLyDiemRenLuyen
```

**Kết quả mong đợi:** `Connection refused` hoặc `timeout`  
**Nếu connect được:** ❌ NGUY HIỂM! Port 5432 vẫn mở!

### Test 2: Production backend vẫn connect được DB

```bash
# SSH vào EC2
ssh ec2-user@your-ec2-ip

# Test connection
docker compose -f docker-compose.production.yml exec backend node -e "const {PrismaClient}=require('@prisma/client');(async()=>{try{const p=new PrismaClient();await p.\$connect();console.log('✅ DB Connected');await p.\$disconnect();}catch(e){console.error('❌',e.message)}})()"
```

**Kết quả mong đợi:** `✅ DB Connected`

---

## 📋 CHECKLIST BẢO MẬT

- [ ] Production DB không expose port 5432 ra ngoài
- [ ] Dev dùng database riêng (Docker local)
- [ ] Test từ dev không connect được tới prod DB
- [ ] Production backend vẫn hoạt động bình thường
- [ ] Có backup định kỳ cho cả dev và prod

---

## 🆘 NẾU ĐÃ XẢY RA SỰ CỐ

Nếu đã vô tình xóa/sửa dữ liệu production:

1. **STOP ngay tất cả thao tác**
2. **Restore từ backup:**
   ```bash
   # Trên EC2
   cd ~/app/backups
   ls -lah  # Tìm file backup gần nhất
   
   # Restore
   docker compose -f docker-compose.production.yml exec db psql -U admin -d Web_QuanLyDiemRenLuyen < backup_file.sql
   ```

3. **Liên hệ admin ngay lập tức**

---

**Ngày tạo:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Mức độ:** 🔴 CRITICAL  
**Ưu tiên:** P0 - Khắc phục ngay
