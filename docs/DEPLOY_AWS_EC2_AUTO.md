# 🚀 HƯỚNG DẪN DEPLOY HOATDONGRENLUYEN.IO.VN LÊN AWS EC2

## ✅ Yêu cầu đã đáp ứng

- ✅ **Tự động update khi push GitHub** - Không cần SSH vào server mỗi lần
- ✅ **Giảm dung lượng** - Dùng Alpine Linux images (nhỏ gấp 3-5 lần)
- ✅ **Đơn giản nhất** - Chỉ cần chạy 1 lần setup, sau đó chỉ việc push code

---

## 📋 PHẦN 1: CHUẨN BỊ (5 phút)

### 1.1. Tạo AWS EC2 Instance

```bash
# Chọn cấu hình:
- AMI: Ubuntu 22.04 LTS
- Instance Type: t3.small (2GB RAM) hoặc t3.medium (4GB RAM)
- Storage: 20GB gp3
- Security Group: Mở port 22, 80, 443, 3333
```

### 1.2. Trỏ domain về EC2

Vào quản lý DNS của `hoatdongrenluyen.io.vn`:
```
A Record:  @  → <EC2-PUBLIC-IP>
A Record:  www → <EC2-PUBLIC-IP>
```

### 1.3. Tạo SSH key cho GitHub

**Mục đích:** Tạo cặp SSH key để EC2 server có thể tự động pull code từ GitHub repository private

**Trên Windows (PowerShell):**
```powershell
# Tạo SSH key (CHÚ Ý: Cần dấu ngoặc kép quanh đường dẫn)
ssh-keygen -t ed25519 -C "deploy@hoatdongrenluyen.io.vn" -f "$env:USERPROFILE\.ssh\hoatdongrenluyen-deploy"

# Sau khi chạy lệnh trên:
# - Nhấn Enter 2 lần (không cần passphrase)
# - Sẽ tạo 2 file:
#   + hoatdongrenluyen-deploy (private key - giữ bí mật)
#   + hoatdongrenluyen-deploy.pub (public key - thêm vào GitHub)

# Xem public key (copy để thêm vào GitHub sau)
Get-Content "$env:USERPROFILE\.ssh\hoatdongrenluyen-deploy.pub"
```

**❗ Nếu gặp lỗi "ssh-keygen: command not found":**
```powershell
# Kiểm tra OpenSSH có cài chưa
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'

# Cài đặt OpenSSH Client nếu chưa có
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

**Trên Linux/Mac:**
```bash
ssh-keygen -t ed25519 -C "deploy@hoatdongrenluyen.io.vn" -f ~/.ssh/hoatdongrenluyen-deploy
cat ~/.ssh/hoatdongrenluyen-deploy.pub
```

**⚠️ LƯU Ý:**
- File `hoatdongrenluyen-deploy` (không có .pub) là **private key** - KHÔNG BAO GIỜ share
- File `hoatdongrenluyen-deploy.pub` là **public key** - thêm vào GitHub Deploy Keys
- Private key sẽ được copy vào EC2 server ở bước 2.4

---

## 🔧 PHẦN 2: SETUP EC2 (10 phút)

### 2.1. SSH vào EC2

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

### 2.2. Clone repository

```bash
# Di chuyển về thư mục home
cd ~

# Clone repository vào thư mục "app"
# Thư mục đầy đủ sẽ là: /home/ubuntu/app
git clone git@github.com:Jiipi/QL_DH_RenLuyen.git app

# Di chuyển vào thư mục app
cd app

# Kiểm tra xem clone thành công chưa
pwd
# Output: /home/ubuntu/app
```

**📂 Cấu trúc thư mục trên EC2:**
```
/home/ubuntu/
└── app/                    ← Repository code ở đây
    ├── backend/
    ├── frontend/
    ├── scripts/
    ├── nginx/
    ├── docker-compose.production.yml
    └── ...
```

**⚠️ LƯU Ý:**
- **Tất cả scripts và configs đều giả định code ở `/home/ubuntu/app`**
- Nếu clone vào thư mục khác, phải sửa lại các file:
  - `scripts/deploy.sh`
  - `scripts/webhook.service`
  - `nginx/hoatdongrenluyen.conf`
- Nếu gặp "Host key verification failed", chạy lệnh sau rồi thử lại:
  ```bash
  ssh-keyscan github.com >> ~/.ssh/known_hosts
  ```

### 2.3. Chạy script setup tự động

```bash
chmod +x scripts/setup-ec2.sh
./scripts/setup-ec2.sh
```

Script này sẽ tự động cài đặt:
- Node.js 18.x
- Docker & Docker Compose
- Nginx
- Certbot (SSL)

### 2.4. Cấu hình SSH key để pull từ GitHub

**Bước 1: Copy private key lên EC2**

Trên máy local (Windows PowerShell):
```powershell
# Xem nội dung private key
Get-Content "$env:USERPROFILE\.ssh\hoatdongrenluyen-deploy"
# Copy toàn bộ nội dung (từ -----BEGIN... đến ...END-----)
```

Trên EC2 server:
```bash
# Tạo và paste private key
nano ~/.ssh/id_ed25519
# Paste nội dung private key đã copy ở trên
# Ctrl+X, Y, Enter để lưu

# Cấp quyền đúng
chmod 600 ~/.ssh/id_ed25519

# Test kết nối GitHub
ssh -T git@github.com
# Expected output: "Hi YOUR_USERNAME! You've successfully authenticated..."
```

**Bước 2: Thêm public key vào GitHub**

1. Copy nội dung public key (trên máy local):
   ```powershell
   Get-Content "$env:USERPROFILE\.ssh\hoatdongrenluyen-deploy.pub"
   ```

2. Vào GitHub repository: **Settings → Deploy keys → Add deploy key**
   - **Title:** `EC2 Production Server`
   - **Key:** Paste nội dung public key
   - **Allow write access:** ❌ Không cần check (chỉ cần read)
   - Click **Add key**

**Bước 3: Test pull code**
```bash
cd ~/app
git pull origin main
# Nếu thành công → SSH key đã hoạt động!
```

---

## 🔐 PHẦN 3: CẤU HÌNH BIẾN MÔI TRƯỜNG (5 phút)

### 3.1. Tạo file .env.production

```bash
cd ~/app
cp .env.production.template .env.production
nano .env.production
```

### 3.2. Tạo mật khẩu mạnh

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# POSTGRES_PASSWORD
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# WEBHOOK_SECRET (dùng cho GitHub webhook)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy các giá trị này vào file `.env.production`**

---

## 🌐 PHẦN 4: CẤU HÌNH NGINX & SSL (5 phút)

### 4.1. Copy Nginx config

```bash
sudo cp ~/app/nginx/hoatdongrenluyen.conf /etc/nginx/sites-available/hoatdongrenluyen
sudo ln -s /etc/nginx/sites-available/hoatdongrenluyen /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Xóa config mặc định
```

### 4.2. Test Nginx config

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3. Cài đặt SSL certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d hoatdongrenluyen.io.vn -d www.hoatdongrenluyen.io.vn
```

Certbot sẽ tự động:
- Tạo SSL certificate
- Cập nhật Nginx config
- Setup auto-renewal

---

## 🐳 PHẦN 5: DEPLOY LẦN ĐẦU (5 phút)

### 5.1. Build và start containers

```bash
cd ~/app
docker compose -f docker-compose.production.yml up -d --build
```

### 5.2. Khởi tạo database

```bash
# Chạy Prisma migrations
docker compose -f docker-compose.production.yml exec backend npx prisma migrate deploy

# Seed dữ liệu (nếu cần)
docker compose -f docker-compose.production.yml exec backend npx prisma db seed
```

### 5.3. Kiểm tra logs

```bash
# Xem logs tất cả services
docker compose -f docker-compose.production.yml logs -f

# Xem logs từng service
docker compose -f docker-compose.production.yml logs -f backend
docker compose -f docker-compose.production.yml logs -f frontend
```

### 5.4. Test website

Mở trình duyệt: `https://hoatdongrenluyen.io.vn`

---

## 🤖 PHẦN 6: TỰ ĐỘNG DEPLOY KHI PUSH GITHUB (10 phút)

### 6.1. Cấu hình webhook server

```bash
cd ~/app

# Tạo file .env cho webhook server
cat > scripts/.env << EOF
WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_FROM_ENV_PRODUCTION
DEPLOY_SCRIPT=/home/ubuntu/app/scripts/deploy.sh
REPO_PATH=/home/ubuntu/app
EOF

# Cấp quyền thực thi
chmod +x scripts/deploy.sh
chmod +x scripts/webhook-server.js
```

### 6.2. Cài đặt Systemd service

```bash
# Copy service file
sudo cp scripts/webhook.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Start webhook service
sudo systemctl start webhook
sudo systemctl enable webhook

# Kiểm tra status
sudo systemctl status webhook
```

### 6.3. Test webhook locally

```bash
curl http://localhost:3333/health
# Expected: {"status":"ok"}
```

### 6.4. Cấu hình GitHub Webhook

Trên GitHub repository:
1. Settings → Webhooks → Add webhook
2. Điền thông tin:
   ```
   Payload URL: https://hoatdongrenluyen.io.vn/webhook
   Content type: application/json
   Secret: YOUR_WEBHOOK_SECRET (từ .env.production)
   Events: Just the push event
   Active: ✓
   ```
3. Nhấn "Add webhook"

### 6.5. Test tự động deploy

```bash
# Trên máy local
cd your-project-folder
echo "# Test auto-deploy" >> README.md
git add .
git commit -m "Test auto-deploy"
git push origin main
```

**Kiểm tra logs trên server:**
```bash
# Logs của webhook server
sudo journalctl -u webhook -f

# Logs của deployment
tail -f /var/log/hoatdongrenluyen-deploy.log
```

Sau khoảng 2-3 phút, website sẽ tự động update!

---

## 📊 PHẦN 7: GIÁM SÁT & BẢO TRÌ

### 7.1. Xem logs

```bash
# Webhook logs
sudo journalctl -u webhook -n 50 --no-pager

# Deployment logs
tail -50 /var/log/hoatdongrenluyen-deploy.log

# Docker logs
docker compose -f docker-compose.production.yml logs --tail=50
```

### 7.2. Restart services

```bash
# Restart webhook server
sudo systemctl restart webhook

# Restart Docker containers
cd ~/app
docker compose -f docker-compose.production.yml restart
```

### 7.3. Update thủ công (nếu webhook bị lỗi)

```bash
cd ~/app
./scripts/deploy.sh
```

### 7.4. Kiểm tra dung lượng

```bash
# Xem dung lượng Docker images
docker images

# Dọn dẹp images cũ
docker image prune -a

# Xem dung lượng disk
df -h
```

---

## ❓ XỬ LÝ SỰ CỐ

### Lỗi 1: Website không truy cập được

```bash
# Kiểm tra Nginx
sudo nginx -t
sudo systemctl status nginx

# Kiểm tra Docker containers
docker compose -f docker-compose.production.yml ps

# Restart tất cả
sudo systemctl restart nginx
docker compose -f docker-compose.production.yml restart
```

### Lỗi 2: Webhook không chạy

```bash
# Kiểm tra service
sudo systemctl status webhook

# Xem logs lỗi
sudo journalctl -u webhook -n 100 --no-pager

# Restart
sudo systemctl restart webhook
```

### Lỗi 3: Database connection failed

```bash
# Kiểm tra PostgreSQL container
docker compose -f docker-compose.production.yml exec db psql -U hoatdongrenluyen -d hoatdongrenluyen_db

# Kiểm tra DATABASE_URL trong .env.production
cat .env.production | grep DATABASE_URL
```

### Lỗi 4: Hết dung lượng disk

```bash
# Xóa Docker images cũ
docker system prune -a --volumes

# Xóa logs cũ
sudo journalctl --vacuum-time=7d

# Xóa file upload cũ (nếu cần)
cd ~/app/backend/uploads
find . -type f -mtime +90 -delete
```

---

## 🎯 CHECKLIST SAU KHI DEPLOY

- [ ] Website truy cập được qua `https://hoatdongrenluyen.io.vn`
- [ ] SSL certificate hoạt động (hiển thị ổ khóa xanh)
- [ ] Đăng nhập được vào hệ thống
- [ ] Upload file hoạt động
- [ ] GitHub webhook được cấu hình
- [ ] Test push code → website tự động update
- [ ] Webhook logs không có lỗi
- [ ] Backup database được setup (khuyến nghị)

---

## 💡 LƯU Ý QUAN TRỌNG

### Bảo mật
- ✅ Luôn dùng mật khẩu mạnh cho database
- ✅ Không commit file `.env.production` lên GitHub
- ✅ Thường xuyên cập nhật packages: `docker compose pull`

### Hiệu suất
- ✅ Nginx đã bật gzip compression
- ✅ Static files được cache 1 năm
- ✅ Docker images dùng Alpine (nhẹ nhất)

### Backup
```bash
# Backup database (chạy hàng ngày)
docker compose -f docker-compose.production.yml exec -T db pg_dump -U hoatdongrenluyen hoatdongrenluyen_db | gzip > backup-$(date +%F).sql.gz

# Backup uploads
tar -czf uploads-backup-$(date +%F).tar.gz backend/uploads/
```

### Monitoring
- Setup CloudWatch hoặc Uptime Robot để monitor website
- Cấu hình alert khi website down

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra:
1. Logs webhook: `sudo journalctl -u webhook -n 100`
2. Logs deploy: `tail -100 /var/log/hoatdongrenluyen-deploy.log`
3. Logs Docker: `docker compose -f docker-compose.production.yml logs`

**Workflow lý tưởng sau khi setup:**
```
Developer → Push code lên GitHub → GitHub gửi webhook → Server tự động pull & rebuild → Website update
```

🎉 **Chúc mừng! Bạn đã hoàn thành việc deploy!**
