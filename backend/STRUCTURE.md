# Cấu trúc Backend - DACN

## 🏗️ Cấu trúc thư mục mới (Client-side Rendering)

```
backend/
├── src/
│   ├── config/                 # Cấu hình ứng dụng
│   │   ├── app.js             # Cấu hình chính
│   │   └── database.js        # Cấu hình database
│   ├── controllers/            # Controllers xử lý logic
│   │   └── users.controller.js
│   ├── middlewares/            # Middlewares
│   │   ├── auth.js            # Authentication & Authorization
│   │   ├── cors.js            # CORS configuration
│   │   ├── error.js           # Error handling
│   │   └── notFound.js        # 404 handler
│   ├── routes/                 # API routes
│   │   ├── auth.route.js      # Authentication routes
│   │   ├── users.route.js     # User management routes
│   │   └── index.js           # Route aggregator
│   ├── services/               # Business logic (nếu cần)
│   ├── utils/                  # Utility functions
│   │   ├── response.js        # Standardized API responses
│   │   ├── logger.js          # Logging utilities
│   │   └── validation.js      # Input validation
│   ├── validators/             # Validation schemas (legacy)
│   ├── libs/                   # External libraries (legacy)
│   └── index.js                # Server entry point
├── prisma/                     # Database schema & migrations
├── logs/                       # Application logs
├── package.json
├── STRUCTURE.md                # This file
└── LOGIN_GUIDE.md             # Login documentation
```

## 🔄 Thay đổi chính

### 1. **Cấu trúc mới**
- **`config/`**: Tập trung cấu hình ứng dụng
- **`utils/`**: Utility functions tái sử dụng
- **`logs/`**: Thư mục chứa log files

### 2. **Cải tiến bảo mật**
- **Helmet**: Security headers
- **Rate Limiting**: Chống spam requests
- **Compression**: Nén response
- **Input Validation**: Validation với Zod
- **Input Sanitization**: Làm sạch input

### 3. **Logging & Monitoring**
- **Winston**: Structured logging
- **Request Logging**: Log tất cả requests
- **Error Tracking**: Theo dõi lỗi chi tiết

### 4. **Response Standardization**
- **ApiResponse Class**: Chuẩn hóa response format
- **Error Handling**: Xử lý lỗi nhất quán
- **Status Codes**: HTTP status codes chuẩn

### 5. **Database Management**
- **Connection Pooling**: Quản lý kết nối database
- **Graceful Shutdown**: Đóng kết nối an toàn
- **Health Checks**: Kiểm tra trạng thái database

## 🚀 Tính năng mới

### **Security**
- ✅ Helmet security headers
- ✅ Rate limiting
- ✅ Input validation & sanitization
- ✅ CORS configuration
- ✅ JWT authentication

### **Performance**
- ✅ Response compression
- ✅ Database connection pooling
- ✅ Request logging
- ✅ Error tracking

### **Maintainability**
- ✅ Modular structure
- ✅ Standardized responses
- ✅ Centralized configuration
- ✅ Comprehensive logging

## 📝 Cách sử dụng

### **1. Khởi động server**
```bash
npm run dev
```

### **2. Kiểm tra logs**
```bash
# Logs được lưu trong thư mục logs/
tail -f logs/combined.log
tail -f logs/error.log
```

### **3. Health check**
```bash
curl http://localhost:3001/health
```

### **4. API endpoints**
```bash
# Authentication
POST /api/auth/login
POST /api/auth/register
GET /api/auth/profile
POST /api/auth/logout

# Users (Admin only)
GET /api/users
GET /api/users/:id
PUT /api/users/:id
DELETE /api/users/:id
```

## 🔧 Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dacn_db"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="1d"

# CORS
CORS_ORIGIN="http://localhost:3000"
```

## 📊 Monitoring & Logging

### **Request Logs**
- Tất cả API requests được log
- IP address và User-Agent tracking
- Response time monitoring

### **Error Logs**
- Detailed error stack traces
- Error context information
- User action tracking

### **Security Logs**
- Login/logout events
- Failed authentication attempts
- Rate limit violations

## 🚨 Lưu ý quan trọng

1. **Chức năng đăng nhập**: Hoàn toàn không bị ảnh hưởng
2. **API endpoints**: Giữ nguyên tất cả endpoints
3. **Response format**: Có thể thay đổi format response
4. **Database**: Không thay đổi schema hoặc data
5. **Frontend**: Cần cập nhật để xử lý response format mới

## 🔄 Migration từ cấu trúc cũ

### **Bước 1: Cài đặt dependencies**
```bash
npm install
```

### **Bước 2: Kiểm tra cấu hình**
```bash
# Kiểm tra file .env
# Kiểm tra database connection
npm run migrate
npm run seed
```

### **Bước 3: Test API**
```bash
node test-api.js
```

### **Bước 4: Khởi động server**
```bash
npm run dev
```

## 📈 Lợi ích của cấu trúc mới

1. **Bảo mật tốt hơn**: Helmet, rate limiting, validation
2. **Dễ bảo trì**: Modular structure, standardized code
3. **Monitoring tốt hơn**: Comprehensive logging, error tracking
4. **Performance tốt hơn**: Compression, connection pooling
5. **Scalability**: Dễ dàng mở rộng và thêm tính năng mới
