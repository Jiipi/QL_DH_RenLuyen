# 🚀 AWS Deployment Quick Reference

## 📋 Tóm tắt các bước deploy (checklist nhanh)

### Phase 1: Chuẩn bị trên máy Windows (30 phút)

```powershell
# 1. Backup database và uploads
cd D:\DACN_Web_quanly_hoatdongrenluyen-master
.\scripts\prepare-deployment.ps1

# 2. Kiểm tra deployment-package/
ls .\deployment-package\
# Nên có: db_production.dump, uploads_backup.zip, *.env.template, DEPLOYMENT_CHECKLIST.txt
```

### Phase 2: Tạo và cấu hình EC2 (20 phút)

1. **AWS Console** → EC2 → Launch Instance
2. Cấu hình:
   - **Name:** `dacn-web-server`
   - **OS:** Ubuntu 22.04 LTS
   - **Type:** `t3.medium` (2 vCPU, 4GB RAM)
   - **Key:** Create `dacn-web-key.pem` → Download
   - **Security Group:** Ports 22, 80, 443, 3000, 3001
   - **Storage:** 30GB gp3
3. Launch và đợi instance khởi động
4. Copy **Public IP:** `54.169.xxx.xxx`

### Phase 3: Kết nối và cài đặt môi trường (20 phút)

```bash
# 1. Convert .pem → .ppk bằng PuTTYgen
# 2. Kết nối SSH bằng PuTTY (ubuntu@54.169.xxx.xxx)

# 3. Upload và chạy script setup (trên EC2)
# Dùng WinSCP upload file: scripts/aws-setup.sh → /home/ubuntu/
chmod +x ~/aws-setup.sh
./aws-setup.sh

# 4. Logout và login lại
exit
# (SSH lại để apply docker group)
```

### Phase 4: Deploy ứng dụng (30 phút)

```bash
# 1. Clone repository
cd ~/dacn-web
git clone https://github.com/ThLin57/DACN_Web_quanly_hoatdongrenluyen.git app
cd app

# 2. Tạo .env files
# Backend
nano ~/dacn-web/app/backend/.env
```
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://admin:YOUR_STRONG_PASSWORD@db:5432/Web_QuanLyDiemRenLuyen?schema=public
JWT_SECRET=$(openssl rand -base64 48)  # Chạy lệnh này để tạo secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

```bash
# Frontend
nano ~/dacn-web/app/frontend/.env
```
```bash
REACT_APP_API_URL=https://yourdomain.com/api
```

```bash
# 3. Sửa docker-compose.yml
nano ~/dacn-web/app/docker-compose.yml
# Đổi:
# - POSTGRES_PASSWORD → password mạnh
# - restart: unless-stopped → restart: always
# - Comment port 5432 (không expose ra ngoài)

# 4. Build và chạy database
docker compose --profile prod build
docker compose up -d db
sleep 15

# 5. Restore database (upload db_production.dump trước bằng WinSCP)
docker cp ~/dacn-web/backups/db_production.dump dacn_db_prod:/tmp/db.dump
docker compose exec db bash -c "pg_restore -U admin -d Web_QuanLyDiemRenLuyen -c -v /tmp/db.dump"

# 6. Restore uploads (upload uploads_backup.zip trước)
cd ~/dacn-web/backups
unzip uploads_backup.zip
mkdir -p ~/dacn-web/app/backend/uploads
cp -r uploads/* ~/dacn-web/app/backend/uploads/

# 7. Chạy application
cd ~/dacn-web/app
docker compose --profile prod up -d app

# 8. Kiểm tra logs
docker compose logs -f app
# Chờ thấy: "Server started successfully on port 3001"

# 9. Test API
curl http://localhost:3001/api/health
# Nên thấy: {"status":"ok",...}
```

### Phase 5: Cấu hình Nginx và SSL (30 phút)

```bash
# 1. Cấu hình Nginx
sudo nano /etc/nginx/sites-available/dacn-web
```
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
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
    }
}
```

```bash
# 2. Enable config
sudo ln -s /etc/nginx/sites-available/dacn-web /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 3. Trỏ domain A record về EC2 IP
# (Làm trên domain provider: GoDaddy, Namecheap, etc.)

# 4. Cài SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Chọn option 2 (Redirect HTTP to HTTPS)

# 5. Test
curl https://yourdomain.com/api/health
```

---

## 🔧 Lệnh thường dùng

### Docker containers

```bash
# Xem status tất cả containers
docker compose ps

# Xem logs
docker compose logs -f              # Tất cả
docker compose logs -f app          # Backend
docker compose logs -f db           # Database

# Restart containers
docker compose restart app          # Restart backend
docker compose restart db           # Restart database

# Stop containers
docker compose --profile prod down  # Stop tất cả

# Start containers
docker compose --profile prod up -d # Start lại
```

### Database operations

```bash
# Backup database
~/backup-database.sh

# Manual backup
docker compose exec -T db pg_dump -U admin -d Web_QuanLyDiemRenLuyen -Fc > ~/backup_$(date +%Y%m%d).dump

# Restore database
docker cp ~/backup.dump dacn_db_prod:/tmp/restore.dump
docker compose exec db bash -c "pg_restore -U admin -d Web_QuanLyDiemRenLuyen -c -v /tmp/restore.dump"

# Connect to database
docker compose exec db psql -U admin -d Web_QuanLyDiemRenLuyen

# List tables
docker compose exec db psql -U admin -d Web_QuanLyDiemRenLuyen -c "\dt"

# Count records
docker compose exec db psql -U admin -d Web_QuanLyDiemRenLuyen -c "SELECT 'SinhVien', COUNT(*) FROM \"SinhVien\" UNION ALL SELECT 'HoatDong', COUNT(*) FROM \"HoatDong\";"
```

### Nginx operations

```bash
# Test config
sudo nginx -t

# Reload config (no downtime)
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log

# Check status
sudo systemctl status nginx
```

### SSL Certificate

```bash
# Renew certificate manually
sudo certbot renew

# Force renew
sudo certbot renew --force-renewal

# Check auto-renewal timer
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run
```

### System monitoring

```bash
# Health check
~/check-health.sh

# CPU/RAM usage (interactive)
htop

# Disk usage
df -h

# Docker stats (realtime)
docker stats

# View all running processes
ps aux | grep node
ps aux | grep postgres

# Check open ports
sudo netstat -tlnp | grep LISTEN

# Memory info
free -h

# System logs
sudo journalctl -u docker -n 50
```

### Update application

```bash
# Pull latest code
cd ~/dacn-web/app
git pull origin main

# Rebuild and restart
docker compose --profile prod build app
docker compose --profile prod up -d app

# Run migrations (if any)
docker compose exec app npx prisma migrate deploy

# View logs
docker compose logs -f app
```

---

## 🐛 Troubleshooting nhanh

### Lỗi: Website không truy cập được

```bash
# 1. Kiểm tra containers có chạy không
docker compose ps
# Nếu dừng → docker compose --profile prod up -d

# 2. Kiểm tra Nginx
sudo systemctl status nginx
# Nếu dừng → sudo systemctl start nginx

# 3. Kiểm tra logs
docker compose logs app | tail -50
sudo tail -50 /var/log/nginx/error.log

# 4. Test API direct
curl http://localhost:3001/api/health
```

### Lỗi: Database connection failed

```bash
# 1. Kiểm tra DB container
docker compose ps db
docker compose logs db | tail -30

# 2. Test connection từ app
docker compose exec app node -e "const {Client}=require('pg');(async()=>{try{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();console.log('✅ Connected');await c.end();}catch(e){console.error('❌',e.message)}})()"

# 3. Kiểm tra DATABASE_URL
docker compose exec app printenv DATABASE_URL

# 4. Restart DB
docker compose restart db
sleep 10
docker compose restart app
```

### Lỗi: Out of Memory

```bash
# 1. Kiểm tra memory
free -h
docker stats --no-stream

# 2. Thêm swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Restart containers
docker compose restart
```

### Lỗi: SSL certificate error

```bash
# 1. Check certificate expiry
sudo certbot certificates

# 2. Renew certificate
sudo certbot renew
sudo systemctl restart nginx

# 3. If renewal fails, re-issue
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com --force-renewal
```

### Lỗi: Port already in use

```bash
# 1. Tìm process đang dùng port
sudo lsof -i :3001
sudo lsof -i :80

# 2. Kill process (nếu không phải app của bạn)
sudo kill -9 <PID>

# 3. Restart containers
docker compose --profile prod down
docker compose --profile prod up -d
```

---

## 📊 Security Checklist

### ✅ Sau khi deploy xong, kiểm tra:

```bash
# 1. Password đã đổi chưa?
# - PostgreSQL password trong docker-compose.yml
# - JWT_SECRET trong backend/.env (dùng openssl rand -base64 48)

# 2. Ports không cần thiết đã đóng?
sudo ufw status
# Chỉ cần: 22 (SSH), 80 (HTTP), 443 (HTTPS)
# KHÔNG expose: 3000, 3001, 5432 ra internet

# 3. SSH key có an toàn không?
# - File .ppk trên máy Windows giữ cẩn thận
# - Không share cho người khác

# 4. Backup có tự động không?
crontab -l
# Nên thấy: 0 2 * * * ... backup-database.sh

# 5. SSL certificate có tự động renew không?
sudo systemctl status certbot.timer
# Nên thấy: active (running)

# 6. Log files có rotate không?
docker inspect dacn_app_prod | grep -A 5 LogConfig
# Nên thấy: "max-size": "20m", "max-file": "10"
```

---

## 🎯 Performance Optimization

### Nếu website chậm:

```bash
# 1. Enable Nginx caching
sudo nano /etc/nginx/sites-available/dacn-web
```
```nginx
# Thêm vào block server:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

# Trong location /:
proxy_cache my_cache;
proxy_cache_valid 200 60m;
proxy_cache_valid 404 1m;
add_header X-Cache-Status $upstream_cache_status;
```

```bash
# 2. Enable gzip compression (thêm vào server block)
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1000;

# 3. Restart Nginx
sudo systemctl restart nginx
```

### Database optimization:

```bash
# Vacuum database
docker compose exec db psql -U admin -d Web_QuanLyDiemRenLuyen -c "VACUUM ANALYZE;"

# Check slow queries (nếu có)
docker compose logs app | grep -i "slow query"
```

---

## 📞 Liên hệ và Support

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
sudo journalctl -xe
```

### Useful commands tổng hợp:

```bash
# Full system status report
cat << EOF
=== SYSTEM STATUS ===
Uptime: $(uptime)
Disk: $(df -h / | tail -1 | awk '{print $3"/"$2" ("$5")"}')
Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')
Containers: $(docker compose ps --format "{{.Name}}: {{.Status}}" | paste -sd ", ")
Nginx: $(sudo systemctl is-active nginx)
Last backup: $(ls -t ~/dacn-web/backups/db_backup_*.dump 2>/dev/null | head -1)
SSL expiry: $(sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/*/cert.pem 2>/dev/null | cut -d= -f2 || echo "No SSL")
EOF
```

---

## 💡 Tips and Tricks

### Tự động khởi động lại app nếu crash:

```bash
# Đã có trong docker-compose.yml:
restart: always

# Kiểm tra:
docker inspect dacn_app_prod | grep -i restart
# Nên thấy: "RestartPolicy": {"Name": "always"}
```

### Tăng file upload limit:

```bash
# Sửa Nginx config
sudo nano /etc/nginx/nginx.conf
# Thêm vào http block:
client_max_body_size 50M;

# Restart
sudo systemctl restart nginx
```

### Rate limiting (chống DDoS):

```bash
sudo nano /etc/nginx/sites-available/dacn-web
# Thêm trước server block:
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Trong location /api:
limit_req zone=api_limit burst=20 nodelay;
```

---

**Lưu file này để tham khảo nhanh khi cần! 🚀**
