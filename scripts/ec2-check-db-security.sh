#!/bin/bash
# ============================================================================
# EC2 DATABASE SECURITY CHECK
# Kiểm tra xem database có đang expose port 5432 ra ngoài không
# Chạy TRỰC TIẾP trên EC2, không cần máy local
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        EC2 DATABASE SECURITY CHECK                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Kiểm tra đang ở đúng thư mục chưa
echo -e "${CYAN}[1] Kiểm tra thư mục hiện tại...${NC}"
CURRENT_DIR=$(pwd)
echo -e "   📂 Đang ở: ${YELLOW}$CURRENT_DIR${NC}"

if [ ! -f "docker-compose.production.yml" ] && [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Không tìm thấy docker-compose file!${NC}"
    echo -e "${YELLOW}   Hãy cd vào thư mục chứa docker-compose.yml${NC}"
    echo -e "${YELLOW}   Ví dụ: cd ~/app${NC}"
    exit 1
fi

# Xác định file compose nào đang dùng
COMPOSE_FILE=""
if [ -f "docker-compose.production.yml" ]; then
    COMPOSE_FILE="docker-compose.production.yml"
    echo -e "${GREEN}✅ Tìm thấy: docker-compose.production.yml${NC}"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo -e "${GREEN}✅ Tìm thấy: docker-compose.yml${NC}"
fi

echo ""

# 2. Kiểm tra Docker containers đang chạy
echo -e "${CYAN}[2] Kiểm tra Docker containers...${NC}"
echo -e "${YELLOW}Running containers:${NC}"
docker compose -f "$COMPOSE_FILE" ps
echo ""

# 3. Kiểm tra database container
echo -e "${CYAN}[3] Kiểm tra Database container...${NC}"
DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db 2>/dev/null || docker ps -q -f name=postgres -f name=db | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo -e "${RED}❌ Không tìm thấy database container!${NC}"
    echo -e "${YELLOW}   Containers đang chạy:${NC}"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
    exit 1
fi

echo -e "${GREEN}✅ Database container: $DB_CONTAINER${NC}"

# 4. Kiểm tra port mapping
echo ""
echo -e "${CYAN}[4] Kiểm tra port exposure...${NC}"
PORT_INFO=$(docker port $DB_CONTAINER 2>/dev/null || echo "")

if [ -z "$PORT_INFO" ]; then
    echo -e "${GREEN}✅ TUYỆT VỜI! Database KHÔNG expose port ra ngoài${NC}"
    echo -e "${GREEN}   → Port 5432 CHỈ accessible trong Docker network${NC}"
    echo -e "${GREEN}   → Bảo mật HOÀN HẢO! ✅${NC}"
    EXPOSED=false
else
    echo -e "${RED}⚠️  CẢNH BÁO! Database ĐANG expose ports:${NC}"
    echo -e "${YELLOW}$PORT_INFO${NC}"
    
    if echo "$PORT_INFO" | grep -q "0.0.0.0:5432"; then
        echo -e "${RED}❌ NGUY HIỂM! Port 5432 mở cho TẤT CẢ interfaces (0.0.0.0)${NC}"
        echo -e "${RED}   → Bất kỳ ai biết IP có thể truy cập database!${NC}"
    fi
    EXPOSED=true
fi

# 5. Kiểm tra trong docker-compose file
echo ""
echo -e "${CYAN}[5] Kiểm tra cấu hình trong $COMPOSE_FILE...${NC}"
if grep -A 5 "db:" "$COMPOSE_FILE" | grep -q "5432:5432"; then
    echo -e "${RED}❌ Tìm thấy '5432:5432' trong file config!${NC}"
    echo -e "${YELLOW}   Dòng cấu hình:${NC}"
    grep -B 2 -A 2 "5432:5432" "$COMPOSE_FILE" | sed 's/^/   /'
else
    echo -e "${GREEN}✅ Không tìm thấy '5432:5432' trong config${NC}"
fi

# 6. Test kết nối từ localhost
echo ""
echo -e "${CYAN}[6] Test kết nối tới port 5432 từ localhost...${NC}"
if timeout 2 bash -c "</dev/tcp/localhost/5432" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Port 5432 có thể connect từ localhost${NC}"
    echo -e "${YELLOW}   (Điều này OK nếu AWS Security Group đã chặn từ bên ngoài)${NC}"
else
    echo -e "${GREEN}✅ Port 5432 KHÔNG accessible từ localhost${NC}"
fi

# 7. Lấy Public IP của EC2
echo ""
echo -e "${CYAN}[7] Lấy thông tin EC2...${NC}"
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "N/A")
PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4 2>/dev/null || echo "N/A")

echo -e "   Public IP:  ${YELLOW}$PUBLIC_IP${NC}"
echo -e "   Private IP: ${YELLOW}$PRIVATE_IP${NC}"

# 8. Test từ bên ngoài (nếu có nc/netcat)
echo ""
echo -e "${CYAN}[8] Test từ bên ngoài EC2...${NC}"
if command -v nc &> /dev/null; then
    if timeout 2 nc -zv $PUBLIC_IP 5432 2>&1 | grep -q "succeeded"; then
        echo -e "${RED}❌ NGUY HIỂM! Port 5432 ACCESSIBLE từ internet!${NC}"
    else
        echo -e "${GREEN}✅ Port 5432 KHÔNG accessible từ internet${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  'netcat' không có sẵn, skip test này${NC}"
fi

# 9. Kiểm tra backend vẫn kết nối được DB không
echo ""
echo -e "${CYAN}[9] Test backend → database connection...${NC}"

BACKEND_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q backend 2>/dev/null || docker ps -q -f name=backend | head -1)

if [ -n "$BACKEND_CONTAINER" ]; then
    if docker exec $BACKEND_CONTAINER node -e "const {PrismaClient}=require('@prisma/client');(async()=>{try{const p=new PrismaClient();await p.\$connect();console.log('OK');await p.\$disconnect()}catch(e){console.error('FAIL');process.exit(1)}})()" 2>&1 | grep -q "OK"; then
        echo -e "${GREEN}✅ Backend KẾT NỐI ĐƯỢC database (internal network)${NC}"
    else
        echo -e "${RED}❌ Backend KHÔNG kết nối được database!${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Không tìm thấy backend container${NC}"
fi

# 10. Tổng kết và khuyến nghị
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TÓM TẮT KẾT QUẢ                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$EXPOSED" = true ]; then
    echo -e "${RED}🔴 TRẠNG THÁI: NGUY HIỂM - CẦN FIX NGAY!${NC}"
    echo ""
    echo -e "${YELLOW}📋 VẤN ĐỀ:${NC}"
    echo -e "   • Database đang expose port 5432 ra ngoài"
    echo -e "   • Bất kỳ ai biết IP + credentials có thể truy cập"
    echo -e "   • Dev local có thể kết nối và thay đổi production data"
    echo ""
    echo -e "${GREEN}✅ GIẢI PHÁP:${NC}"
    echo -e "   1. Chạy script fix tự động:"
    echo -e "      ${CYAN}./fix-db-security.sh${NC}"
    echo ""
    echo -e "   2. Hoặc sửa thủ công:"
    echo -e "      ${CYAN}nano $COMPOSE_FILE${NC}"
    echo -e "      Comment out: ${YELLOW}ports: - \"5432:5432\"${NC}"
    echo -e "      Restart: ${CYAN}docker compose -f $COMPOSE_FILE restart db${NC}"
    echo ""
else
    echo -e "${GREEN}🟢 TRẠNG THÁI: AN TOÀN ✅${NC}"
    echo ""
    echo -e "${GREEN}✓ Database KHÔNG expose port ra ngoài${NC}"
    echo -e "${GREEN}✓ Port 5432 chỉ accessible trong Docker network${NC}"
    echo -e "${GREEN}✓ Backend vẫn kết nối được DB${NC}"
    echo -e "${GREEN}✓ Bảo mật database HOÀN HẢO!${NC}"
    echo ""
    echo -e "${CYAN}📌 KHUYẾN NGHỊ BỔ SUNG:${NC}"
    echo -e "   • Đảm bảo AWS Security Group cũng chặn port 5432"
    echo -e "   • Định kỳ backup database"
    echo -e "   • Monitor access logs"
    echo ""
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
