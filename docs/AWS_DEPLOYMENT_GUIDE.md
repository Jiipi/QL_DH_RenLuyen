# 🚀 Hướng dẫn Deploy dự án lên AWS EC2

## 📋 Mục lục
1. [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
2. [Yêu cầu trước khi deploy](#yêu-cầu-trước-khi-deploy)
3. [Phần 1: Chuẩn bị AWS EC2](#phần-1-chuẩn-bị-aws-ec2)
4. [Phần 2: Kết nối EC2 với PuTTY](#phần-2-kết-nối-ec2-với-putty)
5. [Phần 3: Cài đặt môi trường trên EC2](#phần-3-cài-đặt-môi-trường-trên-ec2)
6. [Phần 4: Upload dự án và database với WinSCP](#phần-4-upload-dự-án-và-database-với-winscp)
7. [Phần 5: Cấu hình và chạy dự án](#phần-5-cấu-hình-và-chạy-dự-án)
8. [Phần 6: Cấu hình Domain và SSL](#phần-6-cấu-hình-domain-và-ssl)
9. [Phần 7: Monitoring và Maintenance](#phần-7-monitoring-và-maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Tổng quan kiến trúc

### Cấu trúc dự án hiện tại:
```
┌─────────────────────────────────────────────────────────┐
│                  Docker Compose                         │
├─────────────────┬─────────────────┬────────────────────┤
│  Frontend       │   Backend       │   PostgreSQL       │
│  (React + Nginx)│   (Node.js +    │   Database         │
│  Port: 3000     │   Express)      │   Port: 5432       │
│                 │   Port: 3001    │                    │
└─────────────────┴─────────────────┴────────────────────┘
         │                 │                  │
         └─────────────────┴──────────────────┘
                         ↓
              Docker Network (dacn_network)
```

### Sau khi deploy lên AWS:
```
                     ┌─────────────────┐
                     │   Domain Name   │
                     │ yourdomain.com  │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │   Nginx Proxy   │
                     │   (Port 80/443) │
                     └────────┬────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │            AWS EC2 Instance                │
        │  ┌──────────────────────────────────────┐ │
        │  │        Docker Compose                │ │
        │  ├────────────┬────────────┬────────────┤ │
        │  │  Frontend  │  Backend   │ PostgreSQL │ │
        │  │  (Nginx)   │  (Express) │     DB     │ │
        │  └────────────┴────────────┴────────────┘ │
        └───────────────────────────────────────────┘
```

---

## Yêu cầu trước khi deploy

### Phần mềm cần có trên máy Windows:
- ✅ **PuTTY** - SSH client để kết nối EC2
- ✅ **PuTTYgen** - Chuyển đổi key .pem sang .ppk
- ✅ **WinSCP** - Upload file lên EC2
- ✅ **Docker Desktop** (đang dùng) - Để backup database

### Tài khoản và dịch vụ:
- ✅ **AWS Account** với quyền tạo EC2
- ✅ **Domain name** (nếu muốn dùng tên miền)
- ✅ **Credit card** (cho AWS billing)

### Dữ liệu cần backup:
- 📦 Database hiện tại (file .dump)
- 📦 Thư mục uploads/images (nếu có ảnh đã tải lên)
- 📦 Source code (đã có trên Git)

---

## Phần 1: Chuẩn bị AWS EC2

### 1.1. Đăng nhập AWS Console
1. Truy cập https://aws.amazon.com/console/
2. Đăng nhập bằng tài khoản AWS của bạn
3. Chọn region gần Việt Nam (khuyến nghị: **Singapore** - ap-southeast-1)

### 1.2. Tạo EC2 Instance
1. Vào **EC2 Dashboard** → Click **"Launch Instance"**
2. Cấu hình instance:

#### 📝 **Name and tags:**
```
Name: dacn-web-server
Environment: Production
```

#### 💻 **Application and OS Images (Amazon Machine Image):**
```
OS: Ubuntu Server 22.04 LTS (Free tier eligible)
Architecture: 64-bit (x86)
```

#### 🖥️ **Instance Type:**
```
Khuyến nghị: t3.medium (2 vCPU, 4GB RAM) - ~$0.0416/hour
Tối thiểu: t2.micro (1 vCPU, 1GB RAM) - Free tier nhưng có thể chậm

Lý do chọn t3.medium:
- Docker + PostgreSQL + Node.js cần ít nhất 2-3GB RAM
- 1GB RAM sẽ bị lag và OOM (Out of Memory)
```

#### 🔑 **Key pair (login):**
```
1. Click "Create new key pair"
2. Key pair name: dacn-web-key
3. Key pair type: RSA
4. Private key format: .pem (sẽ convert sang .ppk sau)
5. Click "Create key pair" → File dacn-web-key.pem sẽ được tải về
⚠️ LƯU FILE NÀY CẨN THẬN! Mất là không SSH được vào server!
```

#### 🌐 **Network settings:**
```
VPC: default
Auto-assign public IP: Enable
Firewall (Security groups): Create new security group
  Name: dacn-web-sg
  Description: Security group for DACN web application
  
  Inbound rules:
  ┌─────────┬────────┬─────────────┬─────────────────────────┐
  │  Type   │  Port  │  Source     │  Description            │
  ├─────────┼────────┼─────────────┼─────────────────────────┤
  │  SSH    │   22   │  My IP      │  SSH từ máy nhà         │
  │  HTTP   │   80   │  0.0.0.0/0  │  Web traffic            │
  │  HTTPS  │  443   │  0.0.0.0/0  │  Secure web traffic     │
  │ Custom  │  3000  │  0.0.0.0/0  │  Frontend (tạm thời)    │
  │ Custom  │  3001  │  0.0.0.0/0  │  Backend API (tạm thời) │
  └─────────┴────────┴─────────────┴─────────────────────────┘
  
  ⚠️ Sau khi setup Nginx proxy, có thể đóng port 3000 và 3001
```

#### 💾 **Configure storage:**
```
Size: 30 GiB (tối thiểu 20GB)
Volume type: gp3 (General Purpose SSD)
Delete on termination: No (giữ data nếu terminate instance)
```

#### 📊 **Advanced details:**
```
Để mặc định, hoặc thêm User data nếu muốn auto-install:
#!/bin/bash
apt-get update
apt-get install -y docker.io docker-compose-plugin
systemctl enable docker
systemctl start docker
```

3. Click **"Launch instance"**
4. Đợi 2-3 phút để instance khởi động
5. Copy **Public IPv4 address** (VD: 54.169.123.45)

---

## Phần 2: Kết nối EC2 với PuTTY

### 2.1. Chuyển đổi .pem sang .ppk bằng PuTTYgen

1. **Mở PuTTYgen** (Start menu → PuTTYgen)
2. Click **"Load"** → Chọn file `dacn-web-key.pem` (đổi filter sang "All Files (*.*)")
3. Thông báo "Successfully imported..." → Click **OK**
4. Click **"Save private key"**
5. Warning "without passphrase" → Click **Yes** (hoặc thêm passphrase nếu muốn bảo mật hơn)
6. Lưu file thành `dacn-web-key.ppk`

### 2.2. Kết nối SSH bằng PuTTY

1. **Mở PuTTY**
2. Cấu hình Session:
```
Host Name (or IP address): ubuntu@54.169.123.45
Port: 22
Connection type: SSH
Saved Sessions: dacn-web-production
```

3. Cấu hình Auth:
```
Category → Connection → SSH → Auth → Credentials
Private key file for authentication: Browse → chọn dacn-web-key.ppk
```

4. Cấu hình Keep-alive (tránh disconnect):
```
Category → Connection
Seconds between keepalives: 30
Enable TCP keepalives: ✓
```

5. Click **"Save"** để lưu session
6. Click **"Open"** để kết nối
7. Security alert "server's host key..." → Click **"Accept"**
8. Màn hình terminal xuất hiện:
```bash
ubuntu@ip-172-31-xx-xx:~$
```
✅ **Kết nối thành công!**

---

## Phần 3: Cài đặt môi trường trên EC2

### 3.1. Update hệ thống
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 3.2. Cài đặt Docker
```bash
# Cài Docker Engine
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Cho phép user ubuntu chạy docker (không cần sudo)
sudo usermod -aG docker ubuntu
newgrp docker

# Verify
docker --version
docker compose version
```

**Output mong đợi:**
```
Docker version 24.0.x, build xxxxx
Docker Compose version v2.23.x
```

### 3.3. Cài đặt Nginx (làm reverse proxy)
```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Test
curl localhost
# Nên thấy trang "Welcome to nginx!"
```

### 3.4. Cài đặt Git
```bash
sudo apt-get install -y git
git --version
```

### 3.5. Tạo cấu trúc thư mục
```bash
# Tạo thư mục dự án
mkdir -p ~/dacn-web
cd ~/dacn-web

# Tạo thư mục cho backups và uploads
mkdir -p backups
mkdir -p data
```

---

## Phần 4: Upload dự án và database với WinSCP

### 4.1. Backup database từ máy local

**Trên máy Windows (PowerShell):**
```powershell
# Di chuyển vào thư mục dự án
cd D:\DACN_Web_quanly_hoatdongrenluyen-master

# Chạy script backup
.\scripts\backup-db.ps1 -Output .\db_production.dump

# Kiểm tra file đã tạo
ls .\db_production.dump
```

**Output:**
```
-rw-r--r-- 1 user user 15M Jan 10 14:30 db_production.dump
```

### 4.2. Backup thư mục uploads (nếu có data)
```powershell
# Nén thư mục uploads
Compress-Archive -Path .\backend\uploads -DestinationPath .\uploads_backup.zip

# Kiểm tra
ls .\uploads_backup.zip
```

### 4.3. Cấu hình WinSCP

1. **Mở WinSCP**
2. Click **"New Site"**
3. Cấu hình:
```
File protocol: SFTP
Host name: 54.169.123.45  (Public IP của EC2)
Port number: 22
User name: ubuntu
Password: (để trống)
```

4. Click **"Advanced..."** → **SSH** → **Authentication**
```
Private key file: Browse → chọn dacn-web-key.ppk
```

5. Click **OK** → **Save** (đặt tên: "DACN Production")
6. Click **Login**
7. Warning "Continue connecting..." → **Yes**

✅ **Kết nối thành công!** Bạn sẽ thấy 2 panel:
- **Trái:** Máy Windows của bạn
- **Phải:** EC2 server (thư mục /home/ubuntu)

### 4.4. Upload files

1. **Panel trái (Local):** Navigate tới `D:\DACN_Web_quanly_hoatdongrenluyen-master`
2. **Panel phải (Remote):** Navigate tới `/home/ubuntu/dacn-web`
3. Select và upload:
   - ✅ `db_production.dump` → `/home/ubuntu/dacn-web/backups/`
   - ✅ `uploads_backup.zip` → `/home/ubuntu/dacn-web/backups/`
   - ⚠️ **KHÔNG upload toàn bộ project folder!** Sẽ dùng Git clone.

**Lý do dùng Git thay vì upload code:**
- ✅ Dễ cập nhật (git pull)
- ✅ Không upload node_modules (nặng và không cần)
- ✅ Version control
- ✅ Nhanh hơn

---

## Phần 5: Cấu hình và chạy dự án

### 5.1. Clone repository từ GitHub

**Quay lại PuTTY SSH session:**
```bash
cd ~/dacn-web
git clone https://github.com/ThLin57/DACN_Web_quanly_hoatdongrenluyen.git app
cd app

# Kiểm tra
ls -la
# Nên thấy: backend/, frontend/, docker-compose.yml, README.md...
```

### 5.2. Tạo file .env cho production

#### Backend .env
```bash
# Tạo file .env cho backend
nano ~/dacn-web/app/backend/.env
```

**Nội dung file .env:**
```bash
NODE_ENV=production
PORT=3001

# Database Connection
DATABASE_URL=postgresql://admin:STRONG_PASSWORD_HERE@db:5432/Web_QuanLyDiemRenLuyen?schema=public

# JWT Secret (⚠️ ĐỔI NGAY!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_abc123xyz789
JWT_EXPIRES_IN=7d

# CORS (sẽ đổi sau khi có domain)
CORS_ORIGIN=https://yourdomain.com

# Log Level
LOG_LEVEL=info
```

**Lưu file:** `Ctrl+O` → `Enter` → `Ctrl+X`

⚠️ **LƯU Ý BẢO MẬT:**
```bash
# Đổi JWT_SECRET thành chuỗi ngẫu nhiên mạnh:
JWT_SECRET=$(openssl rand -base64 48)
echo "JWT_SECRET=$JWT_SECRET"

# Copy chuỗi này và paste vào .env
```

#### Frontend .env (nếu cần)
```bash
nano ~/dacn-web/app/frontend/.env
```

**Nội dung:**
```bash
REACT_APP_API_URL=https://yourdomain.com/api
# hoặc tạm thời dùng IP:
# REACT_APP_API_URL=http://54.169.123.45/api
```

### 5.3. Sửa docker-compose.yml cho production

```bash
nano ~/dacn-web/app/docker-compose.yml
```

**Thay đổi cần thiết:**
```yaml
services:
  db:
    image: postgres:15
    container_name: dacn_db_prod
    restart: always  # ← Đổi thành always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: STRONG_PASSWORD_HERE  # ← Đổi password mạnh!
      POSTGRES_DB: Web_QuanLyDiemRenLuyen
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - dacn_network
    # ⚠️ QUAN TRỌNG: Bỏ expose port 5432 ra ngoài!
    # ports:
    #   - "5432:5432"  # ← Comment hoặc xóa dòng này

  app:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: dacn_app_prod
    restart: always  # ← Đổi thành always
    depends_on:
      - db
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://admin:STRONG_PASSWORD_HERE@db:5432/Web_QuanLyDiemRenLuyen?schema=public
      JWT_SECRET: ${JWT_SECRET}  # ← Đọc từ file .env
      JWT_EXPIRES_IN: 7d
      CORS_ORIGIN: https://yourdomain.com
    ports:
      - "3001:3001"
    volumes:
      - ./backend/uploads:/app/backend/uploads  # ← Persist uploads
      - ./backend/logs:/app/backend/logs
    networks:
      - dacn_network
    profiles:
      - prod

volumes:
  pgdata:
    driver: local

networks:
  dacn_network:
    driver: bridge
```

**Lưu:** `Ctrl+O` → `Enter` → `Ctrl+X`

### 5.4. Build và chạy containers

```bash
cd ~/dacn-web/app

# Build images (lần đầu sẽ mất 5-10 phút)
docker compose --profile prod build

# Chạy database trước
docker compose up -d db

# Đợi 10 giây cho DB khởi động
sleep 10

# Kiểm tra DB đã chạy chưa
docker compose ps
docker compose logs db | tail -20
# Nên thấy: "database system is ready to accept connections"
```

### 5.5. Restore database

```bash
# Copy file dump vào container
docker cp ~/dacn-web/backups/db_production.dump dacn_db_prod:/tmp/db.dump

# Restore database
docker compose exec db bash -c "pg_restore -U admin -d Web_QuanLyDiemRenLuyen -c -v /tmp/db.dump"

# Kiểm tra
docker compose exec db psql -U admin -d Web_QuanLyDiemRenLuyen -c "\dt"
# Nên thấy danh sách các bảng: SinhVien, HoatDong, DangKyHoatDong...
```

**Nếu có lỗi "table already exists":**
```bash
# Drop database và restore lại
docker compose exec db psql -U admin -c "DROP DATABASE IF EXISTS Web_QuanLyDiemRenLuyen;"
docker compose exec db psql -U admin -c "CREATE DATABASE Web_QuanLyDiemRenLuyen;"
docker compose exec db bash -c "pg_restore -U admin -d Web_QuanLyDiemRenLuyen -v /tmp/db.dump"
```

### 5.6. Restore thư mục uploads

```bash
# Giải nén uploads backup
cd ~/dacn-web/backups
unzip uploads_backup.zip

# Copy vào thư mục backend
cp -r uploads/* ~/dacn-web/app/backend/uploads/

# Kiểm tra
ls -lh ~/dacn-web/app/backend/uploads/images/
# Nên thấy các file ảnh
```

### 5.7. Chạy ứng dụng

```bash
cd ~/dacn-web/app

# Chạy app container
docker compose --profile prod up -d app

# Xem logs để đảm bảo không có lỗi
docker compose logs -f app

# Nên thấy:
# [entrypoint] Starting container...
# [entrypoint] Waiting for database...
# [entrypoint] Running prisma migrate deploy...
# Server started successfully on port 3001
```

**Kiểm tra containers đang chạy:**
```bash
docker compose ps

# Output:
# NAME              STATUS         PORTS
# dacn_db_prod      Up 5 minutes   5432/tcp
# dacn_app_prod     Up 2 minutes   0.0.0.0:3001->3001/tcp
```

### 5.8. Test API endpoint

```bash
# Test từ server
curl http://localhost:3001/api/health

# Output:
# {"status":"ok","timestamp":"2025-01-10T10:30:00.000Z"}

# Test từ bên ngoài (máy Windows)
# Truy cập: http://54.169.123.45:3001/api/health
```

✅ **Nếu thấy response JSON là thành công!**

---

## Phần 6: Cấu hình Domain và SSL

### 6.1. Trỏ domain về EC2

**Tại nhà cung cấp domain (VD: GoDaddy, Namecheap, PA.vn):**

1. Đăng nhập quản trị domain
2. Vào **DNS Management** / **Quản lý DNS**
3. Thêm/sửa records:

```
Type    Name    Value                   TTL
----    ----    -----                   ---
A       @       54.169.123.45           600
A       www     54.169.123.45           600
```

4. Lưu thay đổi
5. Đợi 5-30 phút để DNS propagate

**Kiểm tra DNS đã cập nhật:**
```bash
# Trên máy Windows (PowerShell)
nslookup yourdomain.com

# Hoặc
ping yourdomain.com
```

### 6.2. Cấu hình Nginx làm Reverse Proxy

**Trên EC2 (PuTTY):**
```bash
# Xóa config mặc định
sudo rm /etc/nginx/sites-enabled/default

# Tạo config mới cho dự án
sudo nano /etc/nginx/sites-available/dacn-web
```

**Nội dung file config:**
```nginx
# Redirect HTTP to HTTPS (sẽ thêm sau khi có SSL)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Tạm thời dùng HTTP (chưa có SSL)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoint
    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files (uploads)
    location /uploads {
        proxy_pass http://localhost:3001/uploads;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;
}
```

**Lưu:** `Ctrl+O` → `Enter` → `Ctrl+X`

**Kích hoạt config:**
```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/dacn-web /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Restart Nginx
sudo systemctl restart nginx

# Kiểm tra status
sudo systemctl status nginx
```

**Test truy cập:**
- Trình duyệt: `http://yourdomain.com`
- Nên thấy giao diện frontend của ứng dụng!

### 6.3. Cài đặt SSL Certificate (Let's Encrypt - FREE)

```bash
# Cài Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Tạo SSL certificate (thay yourdomain.com)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Làm theo hướng dẫn:
# 1. Nhập email: your-email@example.com
# 2. Agree to Terms: Yes (Y)
# 3. Share email: No (N)
# 4. Redirect HTTP to HTTPS: Yes (2)

# Certbot sẽ tự động:
# - Tạo certificate
# - Sửa config Nginx
# - Setup auto-renewal
```

**Output thành công:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
Key is saved at:         /etc/letsyncrypt/live/yourdomain.com/privkey.pem

Deploying certificate...
Successfully deployed certificate for yourdomain.com to /etc/nginx/sites-enabled/dacn-web
Successfully deployed certificate for www.yourdomain.com to /etc/nginx/sites-enabled/dacn-web

Congratulations! You have successfully enabled HTTPS!
```

**Kiểm tra auto-renewal:**
```bash
sudo certbot renew --dry-run

# Nếu thành công → Certificate sẽ tự động renew mỗi 60 ngày
```

**Test HTTPS:**
- Trình duyệt: `https://yourdomain.com`
- Kiểm tra có biểu tượng ổ khóa 🔒
- Xem certificate: Click vào ổ khóa → Valid!

### 6.4. Cập nhật CORS_ORIGIN và frontend API URL

**Backend .env:**
```bash
nano ~/dacn-web/app/backend/.env
```
**Sửa:**
```bash
CORS_ORIGIN=https://yourdomain.com
```

**Frontend .env:**
```bash
nano ~/dacn-web/app/frontend/.env
```
**Sửa:**
```bash
REACT_APP_API_URL=https://yourdomain.com/api
```

**Rebuild và restart app:**
```bash
cd ~/dacn-web/app
docker compose --profile prod build app
docker compose --profile prod up -d app

# Xem logs
docker compose logs -f app
```

✅ **HOÀN TẤT! Website đã chạy trên HTTPS với domain!**

---

## Phần 7: Monitoring và Maintenance

### 7.1. Xem logs

```bash
# Logs tất cả containers
docker compose logs -f

# Logs riêng app
docker compose logs -f app

# Logs riêng database
docker compose logs -f db

# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 7.2. Monitoring resource usage

```bash
# CPU, RAM, Disk usage
htop

# Nếu chưa có htop
sudo apt-get install -y htop

# Disk usage
df -h

# Docker stats
docker stats
```

### 7.3. Auto-start on reboot

```bash
# Docker containers đã có restart: always
# Kiểm tra:
docker compose ps

# Enable Docker service
sudo systemctl enable docker

# Test reboot
sudo reboot now

# Sau khi reboot, SSH lại và kiểm tra:
docker compose ps
# Containers nên tự động chạy lại!
```

### 7.4. Backup tự động

**Tạo script backup:**
```bash
nano ~/backup-database.sh
```

**Nội dung:**
```bash
#!/bin/bash
set -e

BACKUP_DIR="$HOME/dacn-web/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.dump"

echo "Starting backup at $DATE"

# Create backup inside container
docker compose exec -T db pg_dump -U admin -d Web_QuanLyDiemRenLuyen -Fc > "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE"

# Keep only last 7 backups
cd "$BACKUP_DIR"
ls -t db_backup_*.dump | tail -n +8 | xargs -r rm

echo "Cleanup old backups done"
```

**Cho phép chạy:**
```bash
chmod +x ~/backup-database.sh

# Test
~/backup-database.sh
```

**Setup cron job (backup hàng ngày lúc 2AM):**
```bash
crontab -e

# Thêm dòng này:
0 2 * * * /home/ubuntu/backup-database.sh >> /home/ubuntu/backup.log 2>&1
```

### 7.5. Update ứng dụng

**Khi có code mới trên GitHub:**
```bash
cd ~/dacn-web/app

# Pull code mới
git pull origin main

# Rebuild và restart
docker compose --profile prod build app
docker compose --profile prod up -d app

# Nếu có migration mới
docker compose exec app npx prisma migrate deploy

# Xem logs
docker compose logs -f app
```

### 7.6. Security Updates

```bash
# Cập nhật hệ thống định kỳ (mỗi tuần)
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get autoremove -y

# Reboot nếu cần
sudo reboot now
```

---

## Troubleshooting

### 🔴 Lỗi: "Cannot connect to database"

**Kiểm tra:**
```bash
# DB container có chạy không?
docker compose ps

# Xem logs DB
docker compose logs db | tail -50

# Test connection từ app container
docker compose exec app node -e "const {Client}=require('pg');(async()=>{try{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();console.log('✅ DB Connected');await c.end();}catch(e){console.error('❌ DB Error:',e.message)}})()"
```

**Fix:**
- Đảm bảo `DATABASE_URL` trong `.env` đúng
- Password trong `.env` khớp với `docker-compose.yml`
- DB container đã chạy và ready

---

### 🔴 Lỗi: "502 Bad Gateway" từ Nginx

**Kiểm tra:**
```bash
# App container có chạy không?
docker compose ps

# App có lắng nghe port 3001 không?
docker compose exec app netstat -tlnp | grep 3001

# Test direct
curl http://localhost:3001/api/health
```

**Fix:**
```bash
# Restart app container
docker compose restart app

# Xem logs
docker compose logs -f app
```

---

### 🔴 Lỗi: "Out of Memory" / OOM Killed

**Triệu chứng:**
```bash
docker compose logs app | grep -i "killed"
# Output: "Killed"
```

**Fix:**
```bash
# Tăng RAM của EC2 instance
# Hoặc thêm swap space:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Thêm vào /etc/fstab để persist sau reboot
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Kiểm tra
free -h
```

---

### 🔴 Lỗi: "Permission denied" khi upload ảnh

**Fix:**
```bash
# Đảm bảo thư mục uploads có quyền đúng
sudo chown -R 1000:1000 ~/dacn-web/app/backend/uploads
sudo chmod -R 755 ~/dacn-web/app/backend/uploads

# Restart app
docker compose restart app
```

---

### 🔴 Lỗi: "SSL certificate expired"

**Let's Encrypt certificate hết hạn sau 90 ngày.**

**Renew thủ công:**
```bash
sudo certbot renew

# Nếu có vấn đề
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx
```

**Kiểm tra auto-renewal:**
```bash
sudo systemctl status certbot.timer

# Nên thấy: active (running)
```

---

### 🔴 Lỗi: "Cannot connect to EC2" từ PuTTY

**Kiểm tra:**
1. EC2 instance có đang chạy không? (AWS Console)
2. Security Group có mở port 22 cho IP của bạn không?
3. Public IP có thay đổi không? (Elastic IP để fix IP tĩnh)
4. .ppk key file đúng không?

**Fix:**
```bash
# Tạo Elastic IP để giữ IP cố định:
# AWS Console → EC2 → Elastic IPs → Allocate Elastic IP
# Associate với instance dacn-web-server
# Cập nhật IP mới trong PuTTY và DNS records
```

---

### 🔴 Lỗi: Frontend không load được ảnh

**Kiểm tra:**
```bash
# Uploads path có đúng không?
ls -lh ~/dacn-web/app/backend/uploads/images/

# Nginx có proxy /uploads không?
sudo nginx -T | grep -A 10 "location /uploads"

# Test direct access
curl -I http://localhost:3001/uploads/images/test.jpg
```

**Fix:**
- Đảm bảo file ảnh tồn tại trong `backend/uploads/images/`
- Đảm bảo Nginx config có `location /uploads`
- Đảm bảo app container có mount volume: `./backend/uploads:/app/backend/uploads`

---

## 📊 Chi phí ước tính AWS

### EC2 Instance (t3.medium)
```
Instance: $0.0416/hour × 730 hours/month = ~$30/month
Storage (30GB gp3): $2.40/month
Data Transfer: ~$1-5/month (tùy traffic)
Elastic IP: $0 (nếu attach vào instance)

Total: ~$35-40/month
```

### Khuyến nghị tiết kiệm:
- ✅ Dùng **Reserved Instance** (1 year) → giảm ~40% ($20/month)
- ✅ Stop instance ngoài giờ làm việc nếu chỉ là dev/test
- ✅ Enable CloudWatch để theo dõi usage

---

## 🎯 Checklist hoàn thành

### Pre-deployment:
- [ ] Đã backup database local
- [ ] Đã backup thư mục uploads
- [ ] Đã có AWS account
- [ ] Đã có domain (hoặc tạm dùng IP)
- [ ] Đã cài PuTTY, PuTTYgen, WinSCP

### EC2 Setup:
- [ ] Đã tạo EC2 instance (t3.medium hoặc tương đương)
- [ ] Đã tạo và lưu key pair (.pem, .ppk)
- [ ] Đã cấu hình Security Group (ports 22, 80, 443)
- [ ] Đã kết nối SSH bằng PuTTY thành công

### Software Installation:
- [ ] Đã cài Docker + Docker Compose
- [ ] Đã cài Nginx
- [ ] Đã cài Git
- [ ] Đã clone repository

### Database & Uploads:
- [ ] Đã upload db_production.dump
- [ ] Đã restore database thành công
- [ ] Đã upload và extract uploads folder
- [ ] Đã verify data bằng Prisma Studio (optional)

### Application:
- [ ] Đã tạo .env cho backend và frontend
- [ ] Đã đổi JWT_SECRET thành chuỗi ngẫu nhiên mạnh
- [ ] Đã build Docker images
- [ ] Đã chạy containers (db + app)
- [ ] Đã test API endpoint `/api/health`

### Domain & SSL:
- [ ] Đã trỏ A record về EC2 IP
- [ ] Đã cấu hình Nginx reverse proxy
- [ ] Đã cài SSL certificate (Let's Encrypt)
- [ ] Đã test HTTPS với domain
- [ ] Đã update CORS_ORIGIN và REACT_APP_API_URL

### Monitoring & Maintenance:
- [ ] Đã setup auto-start (restart: always)
- [ ] Đã tạo backup script
- [ ] Đã setup cron job cho backup tự động
- [ ] Đã test reboot và auto-recovery

---

## 📞 Support

### Tài liệu tham khảo:
- AWS EC2: https://docs.aws.amazon.com/ec2/
- Docker Compose: https://docs.docker.com/compose/
- Nginx: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/docs/

### Log files quan trọng:
```bash
# Application logs
~/dacn-web/app/backend/logs/combined.log
~/dacn-web/app/backend/logs/error.log

# Docker logs
docker compose logs

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# System logs
sudo journalctl -u docker
sudo dmesg | tail -50
```

---

## ✅ Kết luận

**Sau khi hoàn thành hướng dẫn này, bạn sẽ có:**
- ✅ Website chạy trên AWS EC2 với domain riêng
- ✅ SSL certificate (HTTPS) miễn phí từ Let's Encrypt
- ✅ Database PostgreSQL với dữ liệu đầy đủ từ máy local
- ✅ Uploads/images đầy đủ
- ✅ Auto-restart khi reboot server
- ✅ Backup tự động hàng ngày
- ✅ Monitoring và logging đầy đủ

**Thời gian ước tính:**
- Setup EC2 và cài đặt: ~30 phút
- Upload và restore data: ~15 phút
- Cấu hình domain và SSL: ~20 phút
- Testing và troubleshooting: ~30 phút
- **Total: 1.5 - 2 giờ**

---

**📝 LƯU Ý QUAN TRỌNG:**
1. **Đổi password mặc định** trong docker-compose.yml và .env
2. **Backup thường xuyên** - Dữ liệu quan trọng hơn code!
3. **Theo dõi chi phí AWS** - Enable billing alerts
4. **Update security patches** - Chạy `sudo apt-get update && upgrade` định kỳ
5. **Giữ .ppk key file an toàn** - Mất là không SSH được!

**Chúc bạn deploy thành công! 🚀**
