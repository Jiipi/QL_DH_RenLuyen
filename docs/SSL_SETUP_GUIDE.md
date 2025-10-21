# 🔒 HƯỚNG DẪN CÀI ĐẶT SSL CHO WEBSITE

## 📅 Ngày: 21/10/2025
## 🌐 Domain: hoatdongrenluyen.io.vn
## 🖥️ Server: AWS EC2 (Amazon Linux 2)

---

## ✅ YÊU CẦU TRƯỚC KHI BẮT ĐẦU

- [x] Domain đã trỏ về IP của EC2
- [x] Website đang chạy HTTP (port 80)
- [x] Nginx đã được cài đặt
- [x] Port 80 và 443 đã mở trong Security Group

---

## 🚀 BƯỚC 1: KIỂM TRA DOMAIN ĐÃ TRỎ ĐÚNG IP CHƯA

```bash
# Trên máy local (Windows PowerShell)
nslookup hoatdongrenluyen.io.vn

# Kết quả phải hiển thị IP của EC2
# Ví dụ: 13.229.xxx.xxx
```

---

## 🚀 BƯỚC 2: SSH VÀO EC2

```bash
# Trên máy local
ssh -i "D:\keydacn\dacn.pem" ec2-user@hoatdongrenluyen.io.vn
```

---

## 🚀 BƯỚC 3: CÀI ĐẶT CERTBOT

### 3.1. Cài đặt EPEL Repository
```bash
sudo yum install -y epel-release
```

### 3.2. Cài đặt Certbot và Nginx plugin
```bash
sudo yum install -y certbot python3-certbot-nginx
```

### 3.3. Kiểm tra phiên bản
```bash
certbot --version
# Kết quả: certbot 2.x.x
```

---

## 🚀 BƯỚC 4: KIỂM TRA NGINX CONFIG

### 4.1. Kiểm tra file config hiện tại
```bash
cat /etc/nginx/conf.d/hoatdongrenluyen.conf
```

### 4.2. Đảm bảo có `server_name`
File `/etc/nginx/conf.d/hoatdongrenluyen.conf` phải có:
```nginx
server {
    listen 80;
    server_name hoatdongrenluyen.io.vn www.hoatdongrenluyen.io.vn;
    
    # ... rest of config
}
```

### 4.3. Test Nginx config
```bash
sudo nginx -t
```

---

## 🚀 BƯỚC 5: CẤP CHỨNG CHỈ SSL VỚI CERTBOT

### 5.1. Chạy Certbot (Auto mode - Recommended)
```bash
sudo certbot --nginx -d hoatdongrenluyen.io.vn -d www.hoatdongrenluyen.io.vn
```

**Trong quá trình cài đặt:**
1. Nhập email của bạn (để nhận thông báo gia hạn)
2. Đồng ý Terms of Service: `Y`
3. Share email với EFF (tùy chọn): `N`
4. Chọn redirect HTTP to HTTPS: `2` (Recommended)

### 5.2. Nếu gặp lỗi port 80 bị chiếm
```bash
# Kiểm tra process đang dùng port 80
sudo netstat -tlnp | grep :80

# Nếu Nginx đang chạy, reload
sudo systemctl reload nginx
```

### 5.3. Kết quả thành công
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/hoatdongrenluyen.io.vn/fullchain.pem
Key is saved at: /etc/letsencrypt/live/hoatdongrenluyen.io.vn/privkey.pem
```

---

## 🚀 BƯỚC 6: KIỂM TRA NGINX CONFIG SAU KHI CÀI SSL

```bash
cat /etc/nginx/conf.d/hoatdongrenluyen.conf
```

**Certbot đã tự động thêm:**
```nginx
server {
    listen 443 ssl;
    server_name hoatdongrenluyen.io.vn www.hoatdongrenluyen.io.vn;
    
    ssl_certificate /etc/letsencrypt/live/hoatdongrenluyen.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hoatdongrenluyen.io.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ... rest of config
}

server {
    listen 80;
    server_name hoatdongrenluyen.io.vn www.hoatdongrenluyen.io.vn;
    return 301 https://$server_name$request_uri;
}
```

---

## 🚀 BƯỚC 7: RELOAD NGINX

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚀 BƯỚC 8: KIỂM TRA SSL HOẠT ĐỘNG

### 8.1. Test trên browser
```
https://hoatdongrenluyen.io.vn
```

Phải thấy:
- ✅ Ổ khóa xanh (hoặc "Secure")
- ✅ Website load bình thường
- ✅ HTTP tự động redirect sang HTTPS

### 8.2. Test bằng command
```bash
# Kiểm tra SSL certificate
curl -I https://hoatdongrenluyen.io.vn

# Kiểm tra redirect HTTP -> HTTPS
curl -I http://hoatdongrenluyen.io.vn
# Kết quả: HTTP/1.1 301 Moved Permanently
```

### 8.3. Test SSL grade
```
https://www.ssllabs.com/ssltest/analyze.html?d=hoatdongrenluyen.io.vn
```

---

## 🚀 BƯỚC 9: TỰ ĐỘNG GIA HẠN SSL

### 9.1. Kiểm tra auto-renewal
```bash
sudo certbot renew --dry-run
```

### 9.2. Kiểm tra systemd timer
```bash
sudo systemctl status certbot-renew.timer
```

### 9.3. Nếu timer không có, tạo cron job
```bash
# Mở crontab
sudo crontab -e

# Thêm dòng này (check mỗi ngày lúc 2:30 AM)
30 2 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## 📝 CONFIG NGINX ĐẦY ĐỦ (SAU KHI CÀI SSL)

File: `/etc/nginx/conf.d/hoatdongrenluyen.conf`

```nginx
# HTTP -> HTTPS Redirect
server {
    listen 80;
    server_name hoatdongrenluyen.io.vn www.hoatdongrenluyen.io.vn;
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name hoatdongrenluyen.io.vn www.hoatdongrenluyen.io.vn;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/hoatdongrenluyen.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hoatdongrenluyen.io.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;

    # Frontend (React app)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
    }

    # Uploaded images
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
    }

    # GitHub webhook
    location /webhook {
        proxy_pass http://127.0.0.1:3333;
    }

    # Access logs
    access_log /var/log/nginx/hoatdongrenluyen_access.log;
    error_log /var/log/nginx/hoatdongrenluyen_error.log;
}
```

---

## 🛠️ TROUBLESHOOTING

### Lỗi 1: "Port 80 is already in use"
```bash
# Kill process đang dùng port 80
sudo netstat -tlnp | grep :80
sudo kill <PID>

# Hoặc stop Nginx tạm thời
sudo systemctl stop nginx
sudo certbot --nginx -d hoatdongrenluyen.io.vn -d www.hoatdongrenluyen.io.vn
sudo systemctl start nginx
```

### Lỗi 2: "Unable to find a virtual host"
```bash
# Kiểm tra Nginx config có server_name chưa
sudo nginx -T | grep server_name

# Thêm server_name vào config
sudo nano /etc/nginx/conf.d/hoatdongrenluyen.conf

# Thêm dòng:
server_name hoatdongrenluyen.io.vn www.hoatdongrenluyen.io.vn;
```

### Lỗi 3: "Challenge failed for domain"
```bash
# Kiểm tra domain có trỏ đúng IP chưa
nslookup hoatdongrenluyen.io.vn

# Kiểm tra port 80 có accessible từ internet không
curl -I http://hoatdongrenluyen.io.vn

# Kiểm tra Security Group EC2:
# - Inbound rule: Port 80 (HTTP) - 0.0.0.0/0
# - Inbound rule: Port 443 (HTTPS) - 0.0.0.0/0
```

### Lỗi 4: "Mixed Content" sau khi cài SSL
**Nguyên nhân:** Frontend đang hardcode HTTP URLs

**Giải pháp:**
```javascript
// frontend/.env.production
REACT_APP_API_URL=https://hoatdongrenluyen.io.vn/api

// Hoặc trong code
const API_URL = window.location.protocol + '//' + window.location.host + '/api';
```

### Lỗi 5: Certificate sắp hết hạn
```bash
# Kiểm tra expiry date
sudo certbot certificates

# Gia hạn manual
sudo certbot renew

# Force renew
sudo certbot renew --force-renewal
```

---

## 📊 KIỂM TRA HEALTH

### Check 1: SSL Certificate Info
```bash
echo | openssl s_client -servername hoatdongrenluyen.io.vn -connect hoatdongrenluyen.io.vn:443 2>/dev/null | openssl x509 -noout -dates
```

### Check 2: Nginx Status
```bash
sudo systemctl status nginx
```

### Check 3: Certificate Files
```bash
sudo ls -la /etc/letsencrypt/live/hoatdongrenluyen.io.vn/
```

### Check 4: Auto-renewal Test
```bash
sudo certbot renew --dry-run
```

---

## 🔐 BẢO MẬT NÂNG CAO (OPTIONAL)

### 1. Tăng cường SSL Security
```bash
sudo nano /etc/letsencrypt/options-ssl-nginx.conf
```

Thêm:
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_stapling on;
ssl_stapling_verify on;
```

### 2. HTTP Strict Transport Security (HSTS)
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 3. Content Security Policy
```nginx
add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

---

## 📝 CHECKLIST HOÀN TẤT

- [ ] Domain đã trỏ về IP EC2
- [ ] Port 80 và 443 đã mở trong Security Group
- [ ] Certbot đã cài đặt thành công
- [ ] SSL certificate đã được cấp
- [ ] HTTPS hoạt động bình thường
- [ ] HTTP redirect sang HTTPS
- [ ] Auto-renewal đã được cấu hình
- [ ] Test dry-run renewal thành công
- [ ] Website hoạt động trên HTTPS
- [ ] Không có Mixed Content warnings
- [ ] SSL Labs grade A hoặc A+

---

## 📞 SUPPORT

### Kiểm tra logs nếu có lỗi:
```bash
# Nginx logs
sudo tail -f /var/log/nginx/error.log

# Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# System logs
sudo journalctl -u nginx -f
```

### Renew certificate manually:
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## 🎉 HOÀN TẤT!

Sau khi hoàn thành tất cả các bước:

✅ Website của bạn đã có HTTPS
✅ Bảo mật cao với Let's Encrypt SSL
✅ Tự động gia hạn mỗi 90 ngày
✅ HTTP tự động redirect sang HTTPS
✅ Security headers đã được thêm

**Truy cập:** https://hoatdongrenluyen.io.vn 🚀

---

## 📚 TÀI LIỆU THAM KHẢO

- [Let's Encrypt Official](https://letsencrypt.org/)
- [Certbot Documentation](https://certbot.eff.org/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
