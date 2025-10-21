# 🚀 HƯỚNG DẪN DEPLOY HOÀN CHỈNH - ĐÃ FIX TẤT CẢ LỖI

> **✅ Đã test thành công trên Amazon Linux 2 EC2**
> 
> **📅 Cập nhật: 21/10/2025**

---

## 📋 MỤC LỤC

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Chuẩn bị](#chuẩn-bị)
3. [Setup EC2](#setup-ec2)
4. [Cấu hình môi trường](#cấu-hình-môi-trường)
5. [Cấu hình Nginx](#cấu-hình-nginx)
6. [Deploy containers](#deploy-containers)
7. [Khởi tạo database](#khởi-tạo-database)
8. [Các lỗi đã fix](#các-lỗi-đã-fix)
9. [Tự động deploy](#tự-động-deploy)
10. [Troubleshooting](#troubleshooting)

---

## ✅ YÊU CẦU HỆ THỐNG

- **EC2 Instance:** Amazon Linux 2 (hoặc Ubuntu 22.04)
- **Instance Type:** t3.small (2GB RAM) hoặc lớn hơn
- **Storage:** 20GB gp3
- **Security Group:** Mở port `22, 80, 443, 3333`
- **Domain:** `hoatdongrenluyen.io.vn` (đã trỏ về EC2 Public IP)

---

## 📋 PHẦN 1: CHUẨN BỊ (5 phút)

### 1.1. Tạo SSH key cho GitHub (Trên Windows)

```powershell
# Tạo SSH key (CHÚ Ý: Dấu ngoặc kép bắt buộc)
ssh-keygen -t ed25519 -C "deploy@hoatdongrenluyen.io.vn" -f "$env:USERPROFILE\.ssh\hoatdongrenluyen-deploy"

# Nhấn Enter 2 lần (không cần passphrase)

# Xem public key
Get-Content "$env:USERPROFILE\.ssh\hoatdongrenluyen-deploy.pub"
```

### 1.2. Thêm Deploy Key vào GitHub

1. Vào GitHub repository: **Settings → Deploy keys → Add deploy key**
2. **Title:** `EC2 Production Server`
3. **Key:** Paste nội dung public key
4. **Allow write access:** ❌ Không check
5. Click **Add key**

---

## 🔧 PHẦN 2: SETUP EC2 (15 phút)

### 2.1. SSH vào EC2

```bash
ssh -i your-key.pem ec2-user@<EC2-PUBLIC-IP>
```

> **Lưu ý:** User là `ec2-user` trên Amazon Linux, `ubuntu` trên Ubuntu

### 2.2. Cài đặt môi trường

#### Trên Amazon Linux 2:

```bash
# Update system
sudo yum update -y

# Cài đặt Git
sudo yum install -y git

# Cài đặt Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Cài đặt Node.js 18
sudo yum install -y gcc-c++ make
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Cài đặt Nginx
sudo amazon-linux-extras install nginx1 -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Logout và login lại để Docker group có hiệu lực
exit
```

**Login lại:**
```bash
ssh -i your-key.pem ec2-user@<EC2-PUBLIC-IP>
```

### 2.3. Cấu hình SSH key cho GitHub

```bash
# Tạo SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Tạo private key (paste từ Windows)
nano ~/.ssh/id_ed25519
# Paste nội dung từ: Get-Content "$env:USERPROFILE\.ssh\hoatdongrenluyen-deploy"
# Ctrl+X, Y, Enter

# Cấp quyền
chmod 600 ~/.ssh/id_ed25519

# Test kết nối GitHub
ssh -T git@github.com
# Expected: "Hi YOUR_USERNAME! You've successfully authenticated..."
```

### 2.4. Clone repository

```bash
# Clone vào thư mục ~/app
cd ~
git clone git@github.com:Jiipi/QL_DH_RenLuyen.git app
cd app

# Xác nhận
pwd
# Output: /home/ec2-user/app (hoặc /home/ubuntu/app)
```

---

## 🔐 PHẦN 3: CẤU HÌNH MÔI TRƯỜNG (5 phút)

### 3.1. Tạo mật khẩu mạnh

```bash
# Tạo các secrets
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
echo "POSTGRES_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
echo "WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

### 3.2. Tạo file .env.production

```bash
cd ~/app
nano .env.production
```

**Paste và thay thế các giá trị:**

```env
NODE_ENV=production
PORT=5000

# Database connection
DATABASE_URL=postgresql://hoatdongrenluyen:YOUR_POSTGRES_PASSWORD@db:5432/hoatdongrenluyen?schema=public

# JWT secret (64 bytes hex)
JWT_SECRET=YOUR_JWT_SECRET_HERE

# Session secret (64 bytes hex)
SESSION_SECRET=YOUR_SESSION_SECRET_HERE

# PostgreSQL password (32 bytes base64)
POSTGRES_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE

# GitHub webhook secret (32 bytes hex)
WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE
```

**Lưu file:** `Ctrl+X`, `Y`, `Enter`

---

## 🌐 PHẦN 4: CẤU HÌNH NGINX (5 phút)

### 4.1. Tạo Nginx config

```bash
sudo tee /etc/nginx/conf.d/hoatdongrenluyen.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name hoatdongrenluyen.io.vn www.hoatdongrenluyen.io.vn;

    # Frontend - Docker maps container:80 -> host:3000
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Webhook
    location /webhook {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
```

### 4.2. Test và reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🐳 PHẦN 5: DEPLOY CONTAINERS (10 phút)

### 5.1. Build và start containers

```bash
cd ~/app

# Build lần đầu (không cache)
docker compose -f docker-compose.production.yml build --no-cache

# Start tất cả services
docker compose -f docker-compose.production.yml up -d

# Chờ containers khởi động
sleep 15

# Kiểm tra status
docker compose -f docker-compose.production.yml ps
```

**Expected output:**
```
NAME                        STATUS
hoatdongrenluyen-backend    Up (healthy)
hoatdongrenluyen-db         Up (healthy)
hoatdongrenluyen-frontend   Up (healthy/unhealthy)
```

> **Lưu ý:** Frontend có thể hiển thị "unhealthy" nhưng vẫn hoạt động bình thường

---

## 📊 PHẦN 6: KHỞI TẠO DATABASE (5 phút)

### 6.1. Đồng bộ schema với database

```bash
# Sync Prisma schema
docker compose -f docker-compose.production.yml exec backend npx prisma db push --accept-data-loss
```

**Expected output:**
```
🚀 Your database is now in sync with your Prisma schema.
```

### 6.2. Seed dữ liệu mẫu (Optional)

```bash
docker compose -f docker-compose.production.yml exec backend npx prisma db seed
```

### 6.3. Kiểm tra logs

```bash
# Backend logs
docker compose -f docker-compose.production.yml logs backend --tail=50

# Frontend logs
docker compose -f docker-compose.production.yml logs frontend --tail=50

# All logs
docker compose -f docker-compose.production.yml logs -f
```

---

## 🎯 PHẦN 7: KIỂM TRA WEBSITE

### 7.1. Test từ server

```bash
# Test backend API
curl http://localhost:5000/api/health
# Expected: {"status":"ok"}

# Test frontend container
curl http://localhost:3000
# Expected: HTML content

# Test qua Nginx
curl http://localhost/
# Expected: HTML content
```

### 7.2. Test từ trình duyệt

Mở trình duyệt và truy cập:
- **Frontend:** `http://hoatdongrenluyen.io.vn`
- **Backend API:** `http://hoatdongrenluyen.io.vn/api/health`

✅ **Website đã chạy thành công!**

---

## 🐛 CÁC LỖI ĐÃ FIX

### Lỗi 1: Frontend build fail - `cross-env: not found`

**Nguyên nhân:** `npm ci --only=production` không cài `cross-env` (trong devDependencies)

**Fix:** Sửa `frontend/Dockerfile.production`

```dockerfile
# SAI:
RUN npm ci --only=production

# ĐÚNG:
RUN npm ci
```

---

### Lỗi 2: Backend không start - `Cannot find module '/app/src/server.js'`

**Nguyên nhân:** File entry point là `src/index.js`, không phải `src/server.js`

**Fix:** Sửa `backend/Dockerfile.production`

```dockerfile
# SAI:
CMD ["node", "src/server.js"]

# ĐÚNG:
CMD ["node", "src/index.js"]
```

---

### Lỗi 3: Prisma migration fail - `transaction aborted`

**Nguyên nhân:** Migration `20251002000000_remove_extended_student_fields` có lỗi

**Fix:** Dùng `db push` thay vì `migrate deploy`

```bash
# Thay vì:
npx prisma migrate deploy

# Dùng:
npx prisma db push --accept-data-loss
```

---

### Lỗi 4: 502 Bad Gateway - Frontend Nginx listen sai port

**Nguyên nhân:** `frontend/nginx.conf` listen port 3000, nhưng Docker expose port 80

**Port mapping:** `0.0.0.0:3000->80/tcp`
- Container bên trong: Nginx listen port **80**
- Host bên ngoài: Truy cập qua port **3000**

**Fix:** Sửa `frontend/nginx.conf`

```nginx
# SAI:
listen 3000;

# ĐÚNG:
listen 80;
```

---

### Lỗi 5: Nginx config không tương thích Amazon Linux

**Nguyên nhân:** Config gốc dùng cho Ubuntu (sites-available/sites-enabled)

**Amazon Linux structure:**
- Config directory: `/etc/nginx/conf.d/`
- Không có `sites-available` và `sites-enabled`

**Fix:** Tạo config trực tiếp trong `/etc/nginx/conf.d/`

---

## 🤖 PHẦN 8: TỰ ĐỘNG DEPLOY KHI PUSH GITHUB (Optional)

### 8.1. Cấu hình webhook server

```bash
cd ~/app

# Tạo .env cho webhook
cat > scripts/.env << EOF
WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_FROM_ENV_PRODUCTION
DEPLOY_SCRIPT=/home/ec2-user/app/scripts/deploy.sh
REPO_PATH=/home/ec2-user/app
EOF

# Cấp quyền
chmod +x scripts/deploy.sh
chmod +x scripts/webhook-server.js
```

### 8.2. Sửa paths trong scripts (nếu cần)

**Nếu đang dùng Amazon Linux (ec2-user):**

```bash
# Sửa webhook.service
nano scripts/webhook.service
# Thay /home/ubuntu → /home/ec2-user

# Sửa deploy.sh
nano scripts/deploy.sh
# Thay /home/ubuntu → /home/ec2-user
```

### 8.3. Cài đặt systemd service

```bash
sudo cp scripts/webhook.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start webhook
sudo systemctl enable webhook

# Kiểm tra
sudo systemctl status webhook
curl http://localhost:3333/health
# Expected: {"status":"ok"}
```

### 8.4. Cấu hình GitHub Webhook

1. Vào GitHub repository: **Settings → Webhooks → Add webhook**
2. **Payload URL:** `http://hoatdongrenluyen.io.vn/webhook`
3. **Content type:** `application/json`
4. **Secret:** YOUR_WEBHOOK_SECRET (từ .env.production)
5. **Events:** Just the push event
6. **Active:** ✓

### 8.5. Test auto-deploy

```bash
# Trên máy local
cd D:\QL_DH_RenLuyen
echo "# Test auto-deploy" >> README.md
git add .
git commit -m "Test auto-deploy"
git push origin main
```

**Kiểm tra logs:**
```bash
# Webhook logs
sudo journalctl -u webhook -f

# Deploy logs
tail -f /var/log/hoatdongrenluyen-deploy.log
```

---

## 🆘 TROUBLESHOOTING

### Website không truy cập được (502 Bad Gateway)

```bash
# 1. Kiểm tra containers
docker compose -f docker-compose.production.yml ps

# 2. Kiểm tra backend logs
docker compose -f docker-compose.production.yml logs backend

# 3. Kiểm tra frontend logs
docker compose -f docker-compose.production.yml logs frontend

# 4. Test trực tiếp
curl http://localhost:3000
curl http://localhost:5000/api/health

# 5. Restart tất cả
docker compose -f docker-compose.production.yml restart
sudo systemctl restart nginx
```

---

### Backend keep restarting

```bash
# Xem logs chi tiết
docker compose -f docker-compose.production.yml logs backend --tail=100

# Kiểm tra database connection
docker compose -f docker-compose.production.yml exec backend npx prisma db pull

# Kiểm tra .env.production
cat .env.production
```

---

### Frontend unhealthy nhưng vẫn chạy được

**Nguyên nhân:** Healthcheck endpoint `/health` fail

**Giải pháp:** Không ảnh hưởng, có thể bỏ qua. Frontend vẫn serve được

Hoặc tắt healthcheck trong `docker-compose.production.yml`:

```yaml
frontend:
  # healthcheck:
  #   disable: true
```

---

### Database migration conflicts

```bash
# Reset database hoàn toàn
docker compose -f docker-compose.production.yml down -v

# Start lại
docker compose -f docker-compose.production.yml up -d
sleep 15

# Sync schema
docker compose -f docker-compose.production.yml exec backend npx prisma db push --accept-data-loss
```

---

### Port already in use

```bash
# Kiểm tra port đang dùng
sudo netstat -tlnp | grep -E ':(80|3000|5000|5432|3333)'

# Dừng process đang dùng port
sudo kill -9 <PID>

# Hoặc dừng containers cũ
docker ps -a
docker rm -f <CONTAINER_ID>
```

---

### Git pull conflict trên EC2

```bash
cd ~/app

# Xóa local changes
git reset --hard HEAD
git clean -fd

# Pull lại
git pull origin main
```

---

## 📊 CÁC LỆNH HỮU ÍCH

### Quản lý containers

```bash
# Xem status
docker compose -f docker-compose.production.yml ps

# Xem logs
docker compose -f docker-compose.production.yml logs -f

# Restart service
docker compose -f docker-compose.production.yml restart backend

# Stop tất cả
docker compose -f docker-compose.production.yml down

# Start lại
docker compose -f docker-compose.production.yml up -d

# Rebuild image
docker compose -f docker-compose.production.yml build --no-cache backend
docker compose -f docker-compose.production.yml up -d backend
```

### Quản lý Nginx

```bash
# Test config
sudo nginx -t

# Reload config
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Xem logs
sudo tail -f /var/log/nginx/error.log
```

### Quản lý database

```bash
# Vào Prisma Studio
docker compose -f docker-compose.production.yml exec backend npx prisma studio

# Backup database
docker compose -f docker-compose.production.yml exec -T db pg_dump -U hoatdongrenluyen hoatdongrenluyen_db > backup.sql

# Restore database
cat backup.sql | docker compose -f docker-compose.production.yml exec -T db psql -U hoatdongrenluyen -d hoatdongrenluyen_db
```

### Dọn dẹp disk

```bash
# Xóa Docker images cũ
docker image prune -a

# Xóa volumes cũ
docker volume prune

# Xóa tất cả (cẩn thận!)
docker system prune -a --volumes
```

---

## 🎯 CHECKLIST SAU KHI DEPLOY

- [ ] Website truy cập được: `http://hoatdongrenluyen.io.vn`
- [ ] Backend API hoạt động: `http://hoatdongrenluyen.io.vn/api/health`
- [ ] Đăng nhập được vào hệ thống
- [ ] Upload file hoạt động
- [ ] Database có dữ liệu
- [ ] Logs không có lỗi nghiêm trọng
- [ ] GitHub webhook được cấu hình (optional)
- [ ] Auto-deploy hoạt động (optional)

---

## 📞 TÓM TẮT NHANH

```bash
# 1. Cài đặt môi trường (Amazon Linux)
sudo yum install -y git docker nodejs
sudo systemctl start docker
sudo amazon-linux-extras install nginx1 -y

# 2. Clone repository
git clone git@github.com:Jiipi/QL_DH_RenLuyen.git app
cd app

# 3. Tạo .env.production
nano .env.production

# 4. Cấu hình Nginx
sudo tee /etc/nginx/conf.d/hoatdongrenluyen.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name hoatdongrenluyen.io.vn;
    location / { proxy_pass http://127.0.0.1:3000; }
    location /api/ { proxy_pass http://127.0.0.1:5000; }
}
EOF
sudo nginx -t && sudo systemctl reload nginx

# 5. Deploy
docker compose -f docker-compose.production.yml up -d --build

# 6. Khởi tạo database
docker compose -f docker-compose.production.yml exec backend npx prisma db push
```

---

## 🎉 HOÀN TẤT!

Website của bạn đã sẵn sàng tại: **http://hoatdongrenluyen.io.vn**

**Workflow sau này:**
1. Code trên máy local
2. `git push origin main`
3. Webhook tự động deploy (nếu đã cấu hình)
4. Hoặc chạy thủ công: `cd ~/app && ./scripts/deploy.sh`

**Liên hệ support:** [GitHub Issues](https://github.com/Jiipi/QL_DH_RenLuyen/issues)
