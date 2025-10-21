# 🔄 HƯỚNG DẪN ĐỒNG BỘ DỮ LIỆU TỪ LOCAL LÊN EC2

**Mục đích:** Copy toàn bộ dữ liệu từ database local (dev) lên EC2 production

---

## 📋 CÁC BƯỚC THỰC HIỆN:

### BƯỚC 1: Tạo backup trên máy local (WINDOWS)

```powershell
# Đã tạo backup tự động ở:
D:\DACN_Web_quanly_hoatdongrenluyen-master\backups\local_full_backup_20251022_014259.dump
```

**Kiểm tra backup:**
```powershell
ls D:\DACN_Web_quanly_hoatdongrenluyen-master\backups\
```

---

### BƯỚC 2: Upload backup lên EC2

**Mở PowerShell (Windows) và chạy:**

```powershell
# Thay <EC2_PUBLIC_IP> bằng IP của EC2
$EC2_IP = "<YOUR_EC2_PUBLIC_IP>"

# Upload backup file
scp D:\DACN_Web_quanly_hoatdongrenluyen-master\backups\local_full_backup_20251022_014259.dump ec2-user@${EC2_IP}:~/backups/local_full_backup.dump

# Upload restore script
scp D:\DACN_Web_quanly_hoatdongrenluyen-master\scripts\restore-local-to-ec2.sh ec2-user@${EC2_IP}:~/app/
```

**Ví dụ cụ thể:**
```powershell
scp D:\DACN_Web_quanly_hoatdongrenluyen-master\backups\local_full_backup_20251022_014259.dump ec2-user@54.123.45.67:~/backups/local_full_backup.dump

scp D:\DACN_Web_quanly_hoatdongrenluyen-master\scripts\restore-local-to-ec2.sh ec2-user@54.123.45.67:~/app/
```

---

### BƯỚC 3: Chạy restore script trên EC2

**SSH vào EC2:**
```bash
ssh ec2-user@<YOUR_EC2_IP>
```

**Chạy restore script:**
```bash
cd ~/app

# Make script executable
chmod +x restore-local-to-ec2.sh

# Run restore
./restore-local-to-ec2.sh
```

Script sẽ tự động:
1. ✅ Backup database production hiện tại
2. ✅ Stop backend
3. ✅ Drop và recreate database
4. ✅ Restore dữ liệu từ local backup
5. ✅ Start backend
6. ✅ Verify dữ liệu đã restore thành công

---

## 🔍 VERIFY SAU KHI RESTORE:

### Trên EC2:

```bash
# Kiểm tra số lượng bản ghi
docker exec hoatdongrenluyen-db psql -U admin -d hoatdongrenluyen -c "
SELECT 
  'Users' as table, COUNT(*) FROM nguoi_dung
UNION ALL
SELECT 'Students', COUNT(*) FROM sinh_vien
UNION ALL
SELECT 'Activities', COUNT(*) FROM hoat_dong;
"

# Kiểm tra sample users
docker exec hoatdongrenluyen-db psql -U admin -d hoatdongrenluyen -c "
SELECT ten_dn, ho_ten, trang_thai 
FROM nguoi_dung 
LIMIT 10;
"

# Test login với user cụ thể
docker exec hoatdongrenluyen-db psql -U admin -d hoatdongrenluyen -c "
SELECT ten_dn, ho_ten, LEFT(mat_khau, 30) as password_preview 
FROM nguoi_dung 
WHERE ten_dn = 'SV000013';
"
```

### Test trên website:

```
https://hoatdongrenluyen.io.vn
```

Login với tài khoản từ local (ví dụ: SV000013 / 123456)

---

## 🆘 ROLLBACK NẾU CẦN:

Nếu restore gặp vấn đề, rollback về production backup:

```bash
cd ~/app

# Stop backend
docker compose -f docker-compose.production.yml stop backend

# Drop database
docker exec hoatdongrenluyen-db psql -U admin -d postgres -c "DROP DATABASE hoatdongrenluyen;"

# Recreate
docker exec hoatdongrenluyen-db psql -U admin -d postgres -c "CREATE DATABASE hoatdongrenluyen;"

# Restore production backup
LATEST_PROD_BACKUP=$(ls -t ~/backups/prod_backup_before_restore_*.dump | head -1)
docker cp "$LATEST_PROD_BACKUP" hoatdongrenluyen-db:/tmp/rollback.dump
docker exec hoatdongrenluyen-db pg_restore -U admin -d hoatdongrenluyen /tmp/rollback.dump

# Start backend
docker compose -f docker-compose.production.yml start backend
```

---

## 📊 TÓM TẮT:

| Bước | Mô tả | Thực hiện trên |
|------|-------|----------------|
| 1 | Tạo backup local | ✅ Đã tạo: `local_full_backup_20251022_014259.dump` |
| 2 | Upload lên EC2 | Windows (SCP) |
| 3 | Chạy restore script | EC2 (SSH) |
| 4 | Test website | Browser |

---

## ⚠️ LƯU Ý:

1. **Backup production trước khi restore** - Script tự động làm việc này
2. **Website sẽ downtime ~30 giây** trong quá trình restore
3. **Tất cả dữ liệu production cũ sẽ bị thay thế** bằng dữ liệu từ local
4. **Users/passwords từ local** sẽ được dùng để login production

---

## 📞 HỖ TRỢ:

Nếu gặp lỗi khi restore:

```bash
# Xem logs chi tiết
docker logs hoatdongrenluyen-backend --tail 100

# Kiểm tra database connection
docker exec hoatdongrenluyen-db psql -U admin -d hoatdongrenluyen -c "SELECT version();"

# Kiểm tra backend environment
docker exec hoatdongrenluyen-backend printenv | grep DATABASE_URL
```

---

**Tạo bởi:** GitHub Copilot  
**Ngày:** 22/10/2025  
**Backup file:** `local_full_backup_20251022_014259.dump` (2.18MB)
