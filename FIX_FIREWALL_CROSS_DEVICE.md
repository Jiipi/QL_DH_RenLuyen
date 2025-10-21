# HƯỚNG DẪN FIX CROSS-DEVICE LOGIN - WINDOWS FIREWALL

## ⚠️ VẤN ĐỀ HIỆN TẠI:

Backend đã có CORS đúng:
```
CORS_ORIGIN=http://localhost:3000,http://192.168.2.12:3000,http://192.168.1.8:3000
```

Nhưng Windows Firewall đang chặn kết nối từ thiết bị khác!

---

## ✅ GIẢI PHÁP:

### CÁCH 1: Tạo Firewall Rule (KHUYẾN NGHỊ)

**Chạy PowerShell AS ADMINISTRATOR:**

```powershell
# Mở PowerShell với quyền Admin (Right-click → Run as Administrator)

# Tạo rule cho Frontend (port 3000)
New-NetFirewallRule -DisplayName "React Dev Server (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Tạo rule cho Backend API (port 3001)
New-NetFirewallRule -DisplayName "Node Backend API (Port 3001)" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Verify rules đã tạo
Get-NetFirewallRule -DisplayName "*3000*","*3001*" | Select-Object DisplayName, Enabled, Direction
```

---

### CÁCH 2: Tắt Firewall tạm thời (CHỈ ĐỂ TEST)

**Mở Windows Defender Firewall:**

1. Nhấn `Win + R`, gõ `firewall.cpl`, Enter
2. Chọn "Turn Windows Defender Firewall on or off"
3. Chọn "Turn off" cho Private network
4. Click OK

⚠️ **LƯU Ý:** Chỉ nên tắt tạm thời để test. Sau đó nên bật lại và dùng Cách 1.

---

### CÁCH 3: Tạo Rule qua GUI

**Windows Defender Firewall với Advanced Security:**

1. Nhấn `Win + R`, gõ `wf.msc`, Enter
2. Click "Inbound Rules" → "New Rule..."
3. Chọn "Port" → Next
4. Chọn "TCP", nhập "3000,3001" → Next
5. Chọn "Allow the connection" → Next
6. Check tất cả (Domain, Private, Public) → Next
7. Name: "Docker Dev Ports" → Finish

---

## 🧪 SAU KHI TẠO FIREWALL RULES:

### 1. Test từ máy chủ (Windows):

```
http://localhost:3000
http://192.168.2.12:3000
```

### 2. Test từ điện thoại:

Đảm bảo điện thoại cùng mạng WiFi với máy Windows, sau đó mở browser:

```
http://192.168.2.12:3000
```

**Login với:**
- Username: `SV000013` (hoặc bất kỳ user nào)
- Password: `123456`

---

## 🔍 TROUBLESHOOTING:

### Nếu vẫn không kết nối được:

1. **Kiểm tra IP của máy Windows:**
   ```powershell
   Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}
   ```

2. **Kiểm tra containers đang chạy:**
   ```powershell
   docker ps
   ```

3. **Test từ máy Windows trước:**
   ```powershell
   curl http://192.168.2.12:3001/api/health
   ```

4. **Kiểm tra backend logs khi login từ điện thoại:**
   ```powershell
   docker logs dacn_backend_dev --tail 50 -f
   ```
   Tìm dòng `[CORS]` để xem origin nào đang được allowed.

---

## ✅ KẾT QUẢ MONG ĐỢI:

Sau khi tạo firewall rules:

1. ✅ Từ điện thoại truy cập `http://192.168.2.12:3000` → Website load
2. ✅ Login thành công, không có lỗi "máy chủ không phản hồi"
3. ✅ Backend logs hiển thị: `[CORS] Dev mode - allowing origin: http://192.168.2.12:3000`
4. ✅ Không có CORS error trong console

---

## 📱 LƯU Ý VỚI HTTPS:

Nếu điện thoại yêu cầu HTTPS:
- Development không dùng HTTPS → Sử dụng HTTP
- Một số browser mobile chặn HTTP → Thử Chrome/Firefox mobile
- iOS có thể cần cấu hình "Allow Insecure Localhost"

---

**Hãy chạy PowerShell AS ADMINISTRATOR và tạo firewall rules, sau đó test lại từ điện thoại!**
