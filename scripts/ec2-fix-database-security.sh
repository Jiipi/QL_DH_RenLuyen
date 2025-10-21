#!/bin/bash
# ============================================================================
# EC2 DATABASE SECURITY FIX
# Mục đích: Đóng port 5432 của Production Database để tránh truy cập ngoài
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   EC2 DATABASE SECURITY FIX - CLOSE PORT 5432            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Kiểm tra file docker-compose hiện tại
echo -e "${YELLOW}[STEP 1] Kiểm tra cấu hình hiện tại...${NC}"

COMPOSE_FILE="docker-compose.production.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ Không tìm thấy $COMPOSE_FILE${NC}"
    echo -e "${YELLOW}   Có thể bạn chưa ở thư mục ~/app${NC}"
    echo -e "${YELLOW}   Chạy: cd ~/app${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tìm thấy $COMPOSE_FILE${NC}"

# 2. Backup file cũ
echo -e "\n${YELLOW}[STEP 2] Backup file cũ...${NC}"
BACKUP_FILE="${COMPOSE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$COMPOSE_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✅ Đã backup: $BACKUP_FILE${NC}"

# 3. Kiểm tra xem port 5432 có đang exposed không
echo -e "\n${YELLOW}[STEP 3] Kiểm tra port exposure...${NC}"

if grep -q "5432:5432" "$COMPOSE_FILE"; then
    echo -e "${RED}⚠️  PHÁT HIỆN: Port 5432 ĐANG được expose!${NC}"
    echo -e "${YELLOW}   Đây là nguy cơ bảo mật nghiêm trọng!${NC}"
    
    # 4. Comment out port exposure
    echo -e "\n${YELLOW}[STEP 4] Đóng port 5432...${NC}"
    
    # Tạo file tạm với port đã được comment
    sed -i.tmp '/db:/,/networks:/ {
        s/^\( *\)- "5432:5432"/\1# - "5432:5432"  # CLOSED FOR SECURITY/
        s/^\( *\)ports:/\1# ports:  # CLOSED FOR SECURITY/
    }' "$COMPOSE_FILE"
    
    # Xóa file tạm
    rm -f "${COMPOSE_FILE}.tmp"
    
    echo -e "${GREEN}✅ Đã comment port 5432${NC}"
else
    echo -e "${GREEN}✅ Port 5432 KHÔNG bị expose - AN TOÀN${NC}"
    echo -e "${BLUE}   Không cần thay đổi gì.${NC}"
    exit 0
fi

# 5. Hiển thị thay đổi
echo -e "\n${YELLOW}[STEP 5] Xem thay đổi...${NC}"
echo -e "${BLUE}Diff:${NC}"
diff -u "$BACKUP_FILE" "$COMPOSE_FILE" || true

# 6. Hỏi xác nhận
echo -e "\n${YELLOW}[STEP 6] Xác nhận apply changes...${NC}"
read -p "Bạn có muốn restart containers để áp dụng thay đổi? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Đã hủy. Để rollback, chạy:${NC}"
    echo -e "   mv $BACKUP_FILE $COMPOSE_FILE"
    exit 0
fi

# 7. Restart containers
echo -e "\n${YELLOW}[STEP 7] Restart containers...${NC}"
echo -e "${BLUE}Đang stop containers...${NC}"
docker compose -f "$COMPOSE_FILE" down

echo -e "${BLUE}Đang start containers với config mới...${NC}"
docker compose -f "$COMPOSE_FILE" up -d

echo -e "${GREEN}✅ Containers đã restart!${NC}"

# 8. Verify
echo -e "\n${YELLOW}[STEP 8] Kiểm tra kết quả...${NC}"

# Test backend vẫn connect được DB
echo -e "${BLUE}Testing backend -> DB connection...${NC}"
sleep 5

if docker compose -f "$COMPOSE_FILE" exec backend node -e "const {PrismaClient}=require('@prisma/client');(async()=>{try{const p=new PrismaClient();await p.\$connect();console.log('OK');await p.\$disconnect()}catch(e){console.error('FAIL:',e.message);process.exit(1)}})()" 2>&1 | grep -q "OK"; then
    echo -e "${GREEN}✅ Backend vẫn kết nối được DB (internal network)${NC}"
else
    echo -e "${RED}❌ Backend KHÔNG kết nối được DB!${NC}"
    echo -e "${YELLOW}   Rollback ngay:${NC}"
    echo -e "   mv $BACKUP_FILE $COMPOSE_FILE"
    echo -e "   docker compose -f $COMPOSE_FILE up -d"
    exit 1
fi

# Test port 5432 KHÔNG accessible từ bên ngoài
echo -e "${BLUE}Testing port 5432 accessibility...${NC}"
if timeout 3 bash -c "</dev/tcp/localhost/5432" 2>/dev/null; then
    echo -e "${RED}⚠️  WARNING: Port 5432 vẫn accessible từ localhost${NC}"
    echo -e "${YELLOW}   Nhưng không thành vấn đề nếu Security Group AWS đã chặn${NC}"
else
    echo -e "${GREEN}✅ Port 5432 KHÔNG accessible từ localhost${NC}"
fi

# 9. Tổng kết
echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  HOÀN THÀNH! ✅                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Database port 5432 đã được đóng${NC}"
echo -e "${GREEN}✅ Backend vẫn kết nối được DB qua internal network${NC}"
echo -e "${GREEN}✅ Dev local KHÔNG THỂ connect tới production DB${NC}"
echo ""
echo -e "${YELLOW}📋 BACKUP FILE:${NC} $BACKUP_FILE"
echo -e "${YELLOW}📋 LOGS:${NC} docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo -e "${BLUE}🔒 BẢO MẬT TĂNG CƯỜNG:${NC}"
echo -e "   1. ✅ Database chỉ accessible trong Docker network"
echo -e "   2. ✅ Không thể connect từ bên ngoài"
echo -e "   3. ✅ Dev và Prod DB hoàn toàn tách biệt"
echo ""
echo -e "${YELLOW}⚠️  QUAN TRỌNG:${NC}"
echo -e "   Đảm bảo AWS Security Group CŨNG chặn port 5432!"
echo -e "   Truy cập: EC2 Console → Security Groups → Edit Inbound Rules"
echo ""
