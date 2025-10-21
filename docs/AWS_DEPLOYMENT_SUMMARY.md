# 📚 Tổng hợp Tài liệu Deploy AWS

## 📖 Danh sách tài liệu đã tạo

### 1️⃣ **AWS_DEPLOYMENT_GUIDE.md** (Hướng dẫn chi tiết - 100+ trang)
**Nội dung:** Hướng dẫn deploy đầy đủ từ A-Z
- ✅ Chuẩn bị EC2 instance
- ✅ Cài đặt Docker, Nginx, SSL
- ✅ Upload code và database với PuTTY/WinSCP
- ✅ Cấu hình domain và Let's Encrypt
- ✅ Monitoring và maintenance
- ✅ Troubleshooting đầy đủ

**Dùng khi:** Deploy lần đầu hoặc cần tham khảo chi tiết

---

### 2️⃣ **AWS_QUICK_REFERENCE.md** (Tham khảo nhanh)
**Nội dung:** Các lệnh và checklist tóm tắt
- ✅ Checklist 5 bước deploy
- ✅ Lệnh Docker thường dùng
- ✅ Lệnh Database operations
- ✅ Nginx và SSL commands
- ✅ Troubleshooting nhanh
- ✅ Security checklist

**Dùng khi:** Cần tìm nhanh một lệnh hoặc fix lỗi

---

### 3️⃣ **scripts/prepare-deployment.ps1** (Windows PowerShell)
**Chức năng:** Chuẩn bị files để deploy
- ✅ Backup database tự động
- ✅ Backup thư mục uploads
- ✅ Tạo .env templates
- ✅ Tạo deployment checklist

**Cách dùng:**
```powershell
cd D:\DACN_Web_quanly_hoatdongrenluyen-master
.\scripts\prepare-deployment.ps1
```

**Output:** Thư mục `deployment-package/` với tất cả files cần upload

---

### 4️⃣ **scripts/aws-setup.sh** (Linux Bash)
**Chức năng:** Tự động cài đặt môi trường trên EC2
- ✅ Cài Docker + Docker Compose
- ✅ Cài Nginx + Certbot
- ✅ Cấu hình firewall (UFW)
- ✅ Tạo backup scripts
- ✅ Setup cron jobs

**Cách dùng:**
```bash
# Upload file này lên EC2 bằng WinSCP
# Sau đó chạy:
chmod +x ~/aws-setup.sh
./aws-setup.sh
```

**Thời gian:** ~5-10 phút

---

### 5️⃣ **scripts/verify-deployment.sh** (Linux Bash)
**Chức năng:** Kiểm tra deployment hoàn chỉnh
- ✅ Kiểm tra Docker containers
- ✅ Test database connection
- ✅ Test API endpoints
- ✅ Kiểm tra Nginx và SSL
- ✅ Kiểm tra disk/memory usage
- ✅ Kiểm tra backup setup

**Cách dùng:**
```bash
cd ~/dacn-web/app
bash ~/verify-deployment.sh
```

**Output:** Báo cáo đầy đủ với ✅ / ❌ / ⚠️

---

## 🚀 Quy trình Deploy Chuẩn

### Phase 1: Chuẩn bị (Máy Windows)
```powershell
# 1. Backup database và uploads
cd D:\DACN_Web_quanly_hoatdongrenluyen-master
.\scripts\prepare-deployment.ps1

# 2. Kiểm tra output
ls .\deployment-package\
```

**Kết quả:** Thư mục `deployment-package/` với:
- `db_production.dump` (~15-20MB)
- `uploads_backup.zip` (~5-10MB)
- `backend.env.template`
- `frontend.env.template`
- `DEPLOYMENT_CHECKLIST.txt`

---

### Phase 2: Tạo EC2 (AWS Console)

1. **Vào AWS Console** → EC2 → Launch Instance
2. **Cấu hình:**
   - OS: Ubuntu 22.04 LTS
   - Type: t3.medium (2vCPU, 4GB RAM)
   - Key: Tạo `dacn-web-key.pem`
   - Storage: 30GB gp3
   - Security Group: Ports 22, 80, 443

3. **Download .pem key và convert sang .ppk:**
   - Dùng PuTTYgen: Load .pem → Save private key (.ppk)

4. **Lưu Public IP:** VD: `54.169.123.45`

---

### Phase 3: Setup Server (EC2)

**3.1. Kết nối SSH với PuTTY**
- Host: `ubuntu@54.169.123.45`
- Auth: Chọn file .ppk
- Connect

**3.2. Upload và chạy setup script**

Dùng WinSCP:
- Upload `scripts/aws-setup.sh` → `/home/ubuntu/`

Trong PuTTY:
```bash
chmod +x ~/aws-setup.sh
./aws-setup.sh
```

Đợi 5-10 phút, sau đó:
```bash
exit
# SSH lại để apply docker group permissions
```

---

### Phase 4: Deploy Application

**4.1. Upload deployment files**

Dùng WinSCP, upload toàn bộ `deployment-package/` → `/home/ubuntu/dacn-web/backups/`

**4.2. Clone repository**
```bash
cd ~/dacn-web
git clone https://github.com/ThLin57/DACN_Web_quanly_hoatdongrenluyen.git app
cd app
```

**4.3. Tạo .env files**
```bash
# Backend
nano ~/dacn-web/app/backend/.env
```
Copy nội dung từ `backend.env.template`, đổi:
- `DATABASE_URL` password
- `JWT_SECRET` (dùng: `openssl rand -base64 48`)
- `CORS_ORIGIN` thành domain của bạn

```bash
# Frontend
nano ~/dacn-web/app/frontend/.env
```
Copy nội dung từ `frontend.env.template`, đổi:
- `REACT_APP_API_URL` thành domain của bạn

**4.4. Sửa docker-compose.yml**
```bash
nano ~/dacn-web/app/docker-compose.yml
```
Đổi:
- `POSTGRES_PASSWORD` → password mạnh
- `restart: unless-stopped` → `restart: always`
- Comment dòng `ports: - "5432:5432"`

**4.5. Build và deploy**
```bash
cd ~/dacn-web/app

# Build
docker compose --profile prod build

# Chạy database
docker compose up -d db
sleep 15

# Restore database
docker cp ~/dacn-web/backups/db_production.dump dacn_db_prod:/tmp/db.dump
docker compose exec db bash -c "pg_restore -U admin -d Web_QuanLyDiemRenLuyen -c -v /tmp/db.dump"

# Restore uploads
cd ~/dacn-web/backups
unzip uploads_backup.zip
mkdir -p ~/dacn-web/app/backend/uploads
cp -r uploads/* ~/dacn-web/app/backend/uploads/

# Chạy application
cd ~/dacn-web/app
docker compose --profile prod up -d app

# Xem logs
docker compose logs -f app
```

**4.6. Test**
```bash
curl http://localhost:3001/api/health
# Nên thấy: {"status":"ok",...}
```

---

### Phase 5: Cấu hình Domain & SSL

**5.1. Trỏ domain về EC2**

Tại domain provider (GoDaddy, Namecheap, etc.):
```
Type    Name    Value               TTL
A       @       54.169.123.45       600
A       www     54.169.123.45       600
```

**5.2. Cấu hình Nginx**
```bash
sudo nano /etc/nginx/sites-available/dacn-web
```
Copy config từ `AWS_DEPLOYMENT_GUIDE.md` (section 6.2)

```bash
sudo ln -s /etc/nginx/sites-available/dacn-web /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

**5.3. Cài SSL**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Chọn option 2: Redirect HTTP to HTTPS
```

**5.4. Rebuild app với domain mới**
```bash
cd ~/dacn-web/app

# Sửa .env với domain thật
nano backend/.env    # CORS_ORIGIN=https://yourdomain.com
nano frontend/.env   # REACT_APP_API_URL=https://yourdomain.com/api

# Rebuild
docker compose --profile prod build app
docker compose --profile prod up -d app
```

---

### Phase 6: Verification

```bash
cd ~/dacn-web/app
bash ~/verify-deployment.sh
```

Xem báo cáo và fix nếu có lỗi.

**Test trong browser:**
- `https://yourdomain.com` → Giao diện web
- `https://yourdomain.com/api/health` → {"status":"ok"}
- Đăng nhập với tài khoản test

---

## ✅ Checklist hoàn thành

### Pre-deployment:
- [ ] Đã backup database bằng `prepare-deployment.ps1`
- [ ] Đã có AWS account
- [ ] Đã có domain name (hoặc dùng IP tạm)
- [ ] Đã cài PuTTY, PuTTYgen, WinSCP

### EC2 Setup:
- [ ] Đã tạo EC2 t3.medium
- [ ] Đã tạo và lưu key pair (.pem → .ppk)
- [ ] Đã cấu hình Security Group
- [ ] Đã SSH thành công với PuTTY

### Server Setup:
- [ ] Đã chạy `aws-setup.sh`
- [ ] Đã cài Docker, Nginx, Certbot
- [ ] Đã tạo thư mục `~/dacn-web`

### Application:
- [ ] Đã clone repository
- [ ] Đã tạo .env files (backend & frontend)
- [ ] Đã đổi JWT_SECRET và passwords
- [ ] Đã sửa docker-compose.yml
- [ ] Đã build Docker images
- [ ] Đã restore database
- [ ] Đã restore uploads
- [ ] Đã test API: `/api/health` → 200 OK

### Domain & SSL:
- [ ] Đã trỏ A record về EC2 IP
- [ ] Đã cấu hình Nginx proxy
- [ ] Đã cài SSL certificate
- [ ] Đã test HTTPS: `https://yourdomain.com`
- [ ] Đã update .env với domain thật
- [ ] Đã rebuild app

### Security & Monitoring:
- [ ] Đã đổi tất cả default passwords
- [ ] Đã đóng port 5432 (PostgreSQL)
- [ ] Đã setup auto-restart (restart: always)
- [ ] Đã setup backup tự động (cron job)
- [ ] Đã chạy `verify-deployment.sh` → Pass

---

## 🔧 Maintenance Checklist (Hàng tuần/tháng)

### Hàng tuần:
```bash
# 1. Kiểm tra health
~/check-health.sh

# 2. Xem logs lỗi
docker compose logs app | grep -i error | tail -20

# 3. Kiểm tra disk space
df -h

# 4. Verify backups
ls -lh ~/dacn-web/backups/db_backup_*.dump | tail -3
```

### Hàng tháng:
```bash
# 1. Update system
sudo apt-get update
sudo apt-get upgrade -y

# 2. Verify SSL auto-renewal
sudo certbot renew --dry-run

# 3. Cleanup old logs
sudo find /var/log -name "*.log" -mtime +30 -delete

# 4. Review security
sudo ufw status
docker compose exec db psql -U admin -d Web_QuanLyDiemRenLuyen -c "SELECT COUNT(*) FROM \"NguoiDung\";"
```

---

## 🐛 Common Issues & Solutions

### Issue: Website không truy cập được
```bash
# Quick fix
docker compose restart
sudo systemctl restart nginx

# Debug
docker compose ps
docker compose logs app | tail -50
sudo tail -50 /var/log/nginx/error.log
```

### Issue: Database connection failed
```bash
# Check DB container
docker compose ps db
docker compose logs db | tail -30

# Restart DB
docker compose restart db
sleep 10
docker compose restart app
```

### Issue: Out of Memory
```bash
# Add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Restart containers
docker compose restart
```

### Issue: SSL expired
```bash
sudo certbot renew
sudo systemctl restart nginx
```

---

## 💰 Chi phí ước tính

### Hàng tháng (AWS):
```
EC2 t3.medium:      $30/month
Storage 30GB:       $2/month
Data transfer:      $2-5/month
Elastic IP:         $0 (nếu attach vào instance)
─────────────────────────────
Total:              ~$35-40/month
```

### Tiết kiệm chi phí:
- ✅ Dùng Reserved Instance (1 năm) → ~$20/month (-40%)
- ✅ Stop instance ngoài giờ làm việc (dev/test)
- ✅ Enable CloudWatch alerts để theo dõi usage

---

## 📞 Liên hệ và Hỗ trợ

### Tài liệu tham khảo:
- 📖 AWS EC2: https://docs.aws.amazon.com/ec2/
- 📖 Docker Docs: https://docs.docker.com/
- 📖 Nginx Docs: https://nginx.org/en/docs/
- 📖 Let's Encrypt: https://letsencrypt.org/

### Log files quan trọng:
```bash
# Application
~/dacn-web/app/backend/logs/combined.log
~/dacn-web/app/backend/logs/error.log

# Docker
docker compose logs

# Nginx
/var/log/nginx/access.log
/var/log/nginx/error.log

# System
sudo journalctl -u docker
```

---

## 🎯 Kết luận

**Sau khi hoàn thành tất cả các bước, bạn sẽ có:**

✅ Website chạy trên AWS EC2 với domain riêng  
✅ SSL certificate (HTTPS) miễn phí từ Let's Encrypt  
✅ Database PostgreSQL với dữ liệu đầy đủ từ local  
✅ Uploads/images đầy đủ  
✅ Auto-restart khi server reboot  
✅ Backup tự động hàng ngày  
✅ Monitoring và logging đầy đủ  
✅ Security được cấu hình đúng chuẩn  

**Thời gian deploy:** 1.5 - 2 giờ (lần đầu)

**Bảo trì:** 15-30 phút/tuần

---

## 🚨 QUAN TRỌNG - ĐỌC KỸ!

### ⚠️ Bảo mật:
1. **ĐỔI tất cả passwords mặc định**
   - PostgreSQL password
   - JWT_SECRET
   - Không để `abc`, `changeme`, `supersecret`

2. **Giữ an toàn .ppk key file**
   - Backup ở nơi an toàn
   - Không share cho người khác
   - Mất = không SSH được vào server!

3. **Đóng ports không cần thiết**
   - Chỉ mở: 22, 80, 443
   - ĐỪNG expose: 3000, 3001, 5432 ra internet

### 💾 Backup:
1. **Database backup tự động** (cron job)
2. **Manual backup trước khi update**
3. **Giữ ít nhất 7 backups gần nhất**
4. **Test restore định kỳ** (mỗi tháng 1 lần)

### 📊 Monitoring:
1. **Enable AWS CloudWatch billing alerts**
2. **Chạy `check-health.sh` hàng tuần**
3. **Theo dõi disk space** (alert khi >80%)
4. **Kiểm tra SSL expiry** (auto-renew phải hoạt động)

---

**Chúc bạn deploy thành công! 🚀**

Nếu gặp vấn đề, xem:
- `AWS_DEPLOYMENT_GUIDE.md` (chi tiết)
- `AWS_QUICK_REFERENCE.md` (tham khảo nhanh)
- Hoặc chạy `verify-deployment.sh` để tự động kiểm tra lỗi
