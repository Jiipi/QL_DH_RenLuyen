# 🔒 SSL QUICK REFERENCE

## 🚀 CÁCH 1: TỰ ĐỘNG (KHUYẾN NGHỊ)

### Trên Windows (máy local):
```powershell
cd D:\DACN_Web_quanly_hoatdongrenluyen-master\scripts
.\install-ssl-windows.ps1
```

Script sẽ tự động:
1. ✅ Kiểm tra DNS
2. ✅ Upload script lên EC2
3. ✅ Cài đặt Certbot
4. ✅ Cấp SSL certificate
5. ✅ Cấu hình auto-renewal
6. ✅ Kiểm tra HTTPS

---

## 🔧 CÁCH 2: THỦ CÔNG

### Bước 1: SSH vào EC2
```bash
ssh -i "D:\keydacn\dacn.pem" ec2-user@hoatdongrenluyen.io.vn
```

### Bước 2: Cài Certbot
```bash
sudo yum install -y epel-release
sudo yum install -y certbot python3-certbot-nginx
```

### Bước 3: Cấp certificate
```bash
sudo certbot --nginx -d hoatdongrenluyen.io.vn -d www.hoatdongrenluyen.io.vn
```

**Trong quá trình cài:**
- Email: `admin@hoatdongrenluyen.io.vn`
- Agree Terms: `Y`
- Share email: `N`
- Redirect HTTP to HTTPS: `2`

### Bước 4: Test auto-renewal
```bash
sudo certbot renew --dry-run
```

---

## ✅ KIỂM TRA SAU KHI CÀI

### 1. Kiểm tra HTTPS
```bash
curl -I https://hoatdongrenluyen.io.vn
```

### 2. Kiểm tra redirect
```bash
curl -I http://hoatdongrenluyen.io.vn
# Kết quả: 301 Moved Permanently
```

### 3. Xem certificate info
```bash
sudo certbot certificates
```

### 4. Test SSL grade
```
https://www.ssllabs.com/ssltest/analyze.html?d=hoatdongrenluyen.io.vn
```

---

## 🛠️ LỆNH HỮU ÍCH

### Gia hạn thủ công
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Force renew
```bash
sudo certbot renew --force-renewal
```

### Xem logs
```bash
sudo tail -f /var/log/letsencrypt/letsencrypt.log
sudo tail -f /var/log/nginx/error.log
```

### Xóa certificate (nếu cần)
```bash
sudo certbot delete --cert-name hoatdongrenluyen.io.vn
```

---

## 🐛 TROUBLESHOOTING

### Lỗi: "Port 80 already in use"
```bash
sudo netstat -tlnp | grep :80
sudo systemctl stop nginx
sudo certbot --nginx -d hoatdongrenluyen.io.vn
sudo systemctl start nginx
```

### Lỗi: "Challenge failed"
```bash
# Kiểm tra DNS
nslookup hoatdongrenluyen.io.vn

# Kiểm tra port 80 accessible
curl -I http://hoatdongrenluyen.io.vn
```

### Lỗi: "Mixed Content"
Sửa file `.env.production`:
```bash
REACT_APP_API_URL=https://hoatdongrenluyen.io.vn/api
```

---

## 📅 AUTO-RENEWAL

Certificate tự động gia hạn mỗi 90 ngày.

### Kiểm tra cron job:
```bash
sudo crontab -l | grep certbot
```

### Kiểm tra systemd timer:
```bash
sudo systemctl status certbot-renew.timer
```

---

## 📊 CHECKLIST

- [ ] Domain đã trỏ về IP EC2
- [ ] Port 80, 443 đã mở trong Security Group
- [ ] Certbot đã cài đặt
- [ ] Certificate đã được cấp
- [ ] HTTPS hoạt động
- [ ] HTTP redirect sang HTTPS
- [ ] Auto-renewal đã test
- [ ] SSL Labs grade A/A+

---

## 📞 FILES QUAN TRỌNG

```
/etc/letsencrypt/live/hoatdongrenluyen.io.vn/
├── fullchain.pem       # Certificate + chain
├── privkey.pem         # Private key
├── cert.pem            # Certificate only
└── chain.pem           # Chain only

/etc/nginx/conf.d/hoatdongrenluyen.conf  # Nginx config
/var/log/letsencrypt/                     # Certbot logs
/var/log/nginx/                           # Nginx logs
```

---

## 🎯 ONE-LINER COMMANDS

```bash
# Full setup
curl -sS https://raw.githubusercontent.com/Jiipi/QL_DH_RenLuyen/main/scripts/install-ssl.sh | sudo bash

# Quick renew
sudo certbot renew && sudo systemctl reload nginx

# Check expiry
sudo certbot certificates | grep "Expiry Date"

# Test HTTPS
curl -Ik https://hoatdongrenluyen.io.vn | head -1
```

---

✅ **DONE! SSL đã được cài đặt và tự động gia hạn mỗi 90 ngày!**
