# 🌐 FIX LOGIN TỪ THIẾT BỊ KHÁC

## 🚨 VẤN ĐỀ HIỆN TẠI

Login chỉ hoạt động trên máy chạy Docker, thiết bị khác bị lỗi vì:

1. **CORS chặn requests** từ IP khác localhost
2. **Frontend không biết IP backend** (hardcoded localhost)
3. **Không có proper network routing**

---

## ✅ GIẢI PHÁP

### **Bước 1: Lấy IP local của máy chạy Docker**

```powershell
# Trên Windows (máy chạy Docker)
ipconfig | Select-String "IPv4"
```

**Ví dụ output:** `IPv4 Address: 192.168.1.100`

Ghi nhớ IP này: `192.168.1.100` (thay bằng IP thực của bạn)

---

### **Bước 2: Cập nhật docker-compose.yml**

Sửa file `docker-compose.yml`:

```yaml
# Backend dev environment
backend-dev:
  environment:
    # ... các env khác ...
    
    # ❌ CŨ - Chỉ cho localhost
    # CORS_ORIGIN: http://localhost:3000
    
    # ✅ MỚI - Cho phép nhiều origins
    CORS_ORIGIN: "http://localhost:3000,http://192.168.1.100:3000,http://127.0.0.1:3000"
    
  ports:
    # Expose ra tất cả interfaces, không chỉ localhost
    - "0.0.0.0:3001:3001"  # ← Quan trọng!

# Frontend dev
frontend-dev:
  environment:
    # ✅ Dùng biến động thay vì hardcode
    REACT_APP_API_URL: "http://192.168.1.100:3001/api"
    
  ports:
    - "0.0.0.0:3000:3000"  # ← Expose ra tất cả interfaces
```

---

### **Bước 3: Cập nhật CORS middleware (Linh hoạt hơn)**

File: `backend/src/middlewares/cors.js`

```javascript
const cors = require('cors');

// Parse CORS_ORIGIN env (hỗ trợ nhiều origins)
function getAllowedOrigins() {
  const envOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  
  // Nếu là comma-separated list
  if (envOrigin.includes(',')) {
    return envOrigin.split(',').map(o => o.trim());
  }
  
  // Nếu là '*', cho phép tất cả (CHỈ DEV!)
  if (envOrigin === '*' || envOrigin === 'true') {
    return true;
  }
  
  return envOrigin;
}

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Trong dev mode, cho phép tất cả
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Production: check whitelist
    if (allowedOrigins === true) {
      return callback(null, true);
    }
    
    if (Array.isArray(allowedOrigins)) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
    } else {
      if (!origin || origin === allowedOrigins) {
        return callback(null, true);
      }
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'X-Tab-Id'],
  exposedHeaders: ['X-Tab-Id'],
  optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);
```

---

### **Bước 4: Restart Docker containers**

```powershell
# Trong D:\DACN_Web_quanly_hoatdongrenluyen-master
docker compose down
docker compose --profile dev up -d

# Kiểm tra logs
docker compose logs -f backend-dev | Select-String "CORS"
docker compose logs -f frontend-dev | Select-String "API"
```

---

### **Bước 5: Test từ thiết bị khác**

**Trên thiết bị khác (điện thoại, laptop khác):**

1. **Kết nối cùng mạng WiFi** với máy chạy Docker
2. **Mở trình duyệt**, truy cập:
   ```
   http://192.168.1.100:3000
   ```
   (Thay `192.168.1.100` bằng IP máy bạn)

3. **Login** với tài khoản test
4. **Kiểm tra Network tab** (F12):
   - API calls tới `http://192.168.1.100:3001/api/...`
   - Status: `200 OK` (không phải `CORS error`)

---

## 🔥 GIẢI PHÁP NHANH (Temporary - CHỈ DEV)

Nếu cần test ngay, làm nhanh:

**1. Sửa docker-compose.yml:**
```yaml
backend-dev:
  environment:
    CORS_ORIGIN: "*"  # ⚠️ Cho phép TẤT CẢ (CHỈ DEV!)
```

**2. Restart:**
```powershell
docker compose restart backend-dev
```

**3. Truy cập từ thiết bị khác:**
```
http://<IP_MÁY_DOCKER>:3000
```

⚠️ **CHÚ Ý:** `CORS_ORIGIN: "*"` chỉ dùng trong dev, **KHÔNG BAO GIỜ** dùng trong production!

---

## 🎯 GIẢI PHÁP DÀI HẠN

### **Dùng domain local (mDNS)**

**1. Đặt hostname cho máy chạy Docker:**
```
hostname: dacn-dev.local
```

**2. Update docker-compose.yml:**
```yaml
CORS_ORIGIN: "http://dacn-dev.local:3000"
REACT_APP_API_URL: "http://dacn-dev.local:3001/api"
```

**3. Các thiết bị khác truy cập:**
```
http://dacn-dev.local:3000
```

### **Dùng ngrok (Public URL tạm thời)**

```powershell
# Install ngrok: https://ngrok.com/download

# Expose frontend
ngrok http 3000

# Expose backend
ngrok http 3001
```

Nhận được URL công khai:
```
Frontend: https://abc123.ngrok.io
Backend: https://def456.ngrok.io/api
```

Update docker-compose.yml với URLs này.

---

## 📊 TROUBLESHOOTING

### Lỗi: "CORS policy: No 'Access-Control-Allow-Origin'"

**Nguyên nhân:** Backend chặn request từ origin không được phép

**Fix:**
```javascript
// backend/src/middlewares/cors.js
origin: true,  // Cho phép tất cả trong dev
```

### Lỗi: "Network Error" hoặc "ERR_CONNECTION_REFUSED"

**Nguyên nhân:** Firewall chặn port 3000/3001

**Fix (Windows):**
```powershell
# Cho phép port qua firewall
netsh advfirewall firewall add rule name="React Dev" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Node API" dir=in action=allow protocol=TCP localport=3001
```

### Lỗi: "Invalid token" sau khi login

**Nguyên nhân:** Token lưu trong sessionStorage của tab cũ

**Fix:** Clear sessionStorage hoặc login lại

---

## ✅ CHECKLIST

- [ ] Lấy được IP local máy chạy Docker
- [ ] Update CORS_ORIGIN trong docker-compose.yml
- [ ] Update REACT_APP_API_URL với IP thực
- [ ] Restart containers
- [ ] Firewall cho phép port 3000, 3001
- [ ] Test login từ thiết bị khác thành công
- [ ] API calls không có CORS error

---

**Ngày tạo:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Mức độ:** 🟡 MEDIUM  
**Ưu tiên:** P1 - Cải thiện trải nghiệm dev
