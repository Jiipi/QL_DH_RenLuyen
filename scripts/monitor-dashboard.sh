#!/bin/bash
# Real-time monitoring dashboard for deployed application
# Chạy script này để xem trạng thái hệ thống realtime

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to clear screen and print header
print_header() {
    clear
    echo -e "${BOLD}${CYAN}"
    cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                   DACN WEB - MONITORING DASHBOARD               ║
║                                                                 ║
║            📊 Real-time System & Application Monitor            ║
╚════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo -e "${YELLOW}Last update: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
}

# Function to get container status with color
get_container_status() {
    local container=$1
    local status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
    
    case $status in
        "running")
            echo -e "${GREEN}●${NC} Running"
            ;;
        "exited")
            echo -e "${RED}●${NC} Exited"
            ;;
        "paused")
            echo -e "${YELLOW}●${NC} Paused"
            ;;
        "restarting")
            echo -e "${YELLOW}●${NC} Restarting"
            ;;
        *)
            echo -e "${RED}●${NC} Not Found"
            ;;
    esac
}

# Function to format bytes to human readable
format_bytes() {
    local bytes=$1
    if [ $bytes -lt 1024 ]; then
        echo "${bytes}B"
    elif [ $bytes -lt 1048576 ]; then
        echo "$(($bytes / 1024))KB"
    elif [ $bytes -lt 1073741824 ]; then
        echo "$(($bytes / 1048576))MB"
    else
        echo "$(($bytes / 1073741824))GB"
    fi
}

# Function to get service status
get_service_status() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✓ Active${NC}"
    else
        echo -e "${RED}✗ Inactive${NC}"
    fi
}

# Main monitoring loop
while true; do
    print_header
    
    # ============ DOCKER CONTAINERS ============
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}🐳 Docker Containers${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Database container
    DB_STATUS=$(get_container_status "dacn_db_prod")
    DB_UPTIME=$(docker inspect -f '{{.State.StartedAt}}' dacn_db_prod 2>/dev/null | xargs -I {} date -d {} +%s 2>/dev/null || echo "0")
    if [ "$DB_UPTIME" != "0" ]; then
        NOW=$(date +%s)
        DB_UP_SECONDS=$((NOW - DB_UPTIME))
        DB_UP_TIME="$(($DB_UP_SECONDS / 86400))d $(($DB_UP_SECONDS % 86400 / 3600))h $(($DB_UP_SECONDS % 3600 / 60))m"
    else
        DB_UP_TIME="N/A"
    fi
    echo -e "  ${BOLD}Database:${NC}      $DB_STATUS  (Uptime: $DB_UP_TIME)"
    
    # App container
    APP_STATUS=$(get_container_status "dacn_app_prod")
    APP_UPTIME=$(docker inspect -f '{{.State.StartedAt}}' dacn_app_prod 2>/dev/null | xargs -I {} date -d {} +%s 2>/dev/null || echo "0")
    if [ "$APP_UPTIME" != "0" ]; then
        NOW=$(date +%s)
        APP_UP_SECONDS=$((NOW - APP_UPTIME))
        APP_UP_TIME="$(($APP_UP_SECONDS / 86400))d $(($APP_UP_SECONDS % 86400 / 3600))h $(($APP_UP_SECONDS % 3600 / 60))m"
    else
        APP_UP_TIME="N/A"
    fi
    echo -e "  ${BOLD}Application:${NC}   $APP_STATUS  (Uptime: $APP_UP_TIME)"
    
    echo ""
    
    # ============ RESOURCE USAGE ============
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}💻 Resource Usage${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # CPU Usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    CPU_INT=${CPU_USAGE%.*}
    if [ "$CPU_INT" -lt 70 ]; then
        CPU_COLOR=$GREEN
    elif [ "$CPU_INT" -lt 85 ]; then
        CPU_COLOR=$YELLOW
    else
        CPU_COLOR=$RED
    fi
    echo -e "  ${BOLD}CPU:${NC}           ${CPU_COLOR}${CPU_USAGE}%${NC}"
    
    # Memory Usage
    MEM_TOTAL=$(free -m | grep Mem | awk '{print $2}')
    MEM_USED=$(free -m | grep Mem | awk '{print $3}')
    MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))
    if [ "$MEM_PERCENT" -lt 70 ]; then
        MEM_COLOR=$GREEN
    elif [ "$MEM_PERCENT" -lt 85 ]; then
        MEM_COLOR=$YELLOW
    else
        MEM_COLOR=$RED
    fi
    echo -e "  ${BOLD}Memory:${NC}        ${MEM_COLOR}${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PERCENT}%)${NC}"
    
    # Disk Usage
    DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    DISK_USED=$(df -h / | tail -1 | awk '{print $3}')
    DISK_TOTAL=$(df -h / | tail -1 | awk '{print $2}')
    if [ "$DISK_USAGE" -lt 70 ]; then
        DISK_COLOR=$GREEN
    elif [ "$DISK_USAGE" -lt 85 ]; then
        DISK_COLOR=$YELLOW
    else
        DISK_COLOR=$RED
    fi
    echo -e "  ${BOLD}Disk:${NC}          ${DISK_COLOR}${DISK_USED} / ${DISK_TOTAL} (${DISK_USAGE}%)${NC}"
    
    # Load Average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | xargs)
    echo -e "  ${BOLD}Load Avg:${NC}      ${CYAN}${LOAD_AVG}${NC}"
    
    echo ""
    
    # ============ DOCKER STATS ============
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}📊 Container Statistics${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Get docker stats
    if docker ps --format "{{.Names}}" | grep -q "dacn_db_prod\|dacn_app_prod"; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep -E "NAME|dacn_" | sed 's/^/  /'
    else
        echo -e "  ${RED}No containers running${NC}"
    fi
    
    echo ""
    
    # ============ SYSTEM SERVICES ============
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}⚙️  System Services${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "  ${BOLD}Docker:${NC}        $(get_service_status docker)"
    echo -e "  ${BOLD}Nginx:${NC}         $(get_service_status nginx)"
    
    # UFW Status
    if command -v ufw &> /dev/null; then
        if sudo ufw status | grep -q "Status: active"; then
            echo -e "  ${BOLD}Firewall:${NC}      ${GREEN}✓ Active${NC}"
        else
            echo -e "  ${BOLD}Firewall:${NC}      ${YELLOW}○ Inactive${NC}"
        fi
    fi
    
    echo ""
    
    # ============ API HEALTH ============
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}🏥 API Health Check${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Test API endpoint
    API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3001/api/health 2>/dev/null || echo "000")
    if [ "$API_RESPONSE" = "200" ]; then
        echo -e "  ${BOLD}API Status:${NC}    ${GREEN}✓ Healthy${NC} (HTTP 200)"
    else
        echo -e "  ${BOLD}API Status:${NC}    ${RED}✗ Unhealthy${NC} (HTTP $API_RESPONSE)"
    fi
    
    # Database connection test
    if docker ps --format "{{.Names}}" | grep -q "dacn_app_prod"; then
        DB_TEST=$(docker exec dacn_app_prod node -e "const {Client}=require('pg');(async()=>{try{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();console.log('OK');await c.end();}catch(e){console.log('FAIL')}})()" 2>/dev/null || echo "FAIL")
        if [ "$DB_TEST" = "OK" ]; then
            echo -e "  ${BOLD}DB Connection:${NC} ${GREEN}✓ Connected${NC}"
        else
            echo -e "  ${BOLD}DB Connection:${NC} ${RED}✗ Failed${NC}"
        fi
    fi
    
    echo ""
    
    # ============ RECENT LOGS ============
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}📝 Recent Application Logs (Last 5)${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if docker ps --format "{{.Names}}" | grep -q "dacn_app_prod"; then
        docker logs dacn_app_prod --tail 5 2>&1 | sed 's/^/  /' | cut -c1-100
    else
        echo -e "  ${RED}Application container not running${NC}"
    fi
    
    echo ""
    
    # ============ NETWORK INFO ============
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}🌐 Network Information${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Public IP
    PUBLIC_IP=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || echo "N/A")
    echo -e "  ${BOLD}Public IP:${NC}     ${CYAN}${PUBLIC_IP}${NC}"
    
    # Open ports
    OPEN_PORTS=$(sudo netstat -tlnp 2>/dev/null | grep LISTEN | awk '{print $4}' | awk -F: '{print $NF}' | sort -n | uniq | tr '\n' ', ' | sed 's/,$//')
    echo -e "  ${BOLD}Open Ports:${NC}    ${CYAN}${OPEN_PORTS}${NC}"
    
    # Active connections
    ACTIVE_CONN=$(sudo netstat -an | grep ESTABLISHED | wc -l)
    echo -e "  ${BOLD}Active Conn:${NC}   ${CYAN}${ACTIVE_CONN}${NC}"
    
    echo ""
    
    # ============ SSL CERTIFICATE ============
    if [ -d "/etc/letsencrypt/live" ]; then
        CERT_DOMAIN=$(sudo ls /etc/letsencrypt/live 2>/dev/null | grep -v README | head -1)
        if [ -n "$CERT_DOMAIN" ]; then
            echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${BOLD}🔒 SSL Certificate${NC}"
            echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            
            CERT_FILE="/etc/letsencrypt/live/$CERT_DOMAIN/cert.pem"
            EXPIRY_DATE=$(sudo openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
            EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null)
            NOW_EPOCH=$(date +%s)
            DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
            
            if [ $DAYS_LEFT -gt 30 ]; then
                SSL_COLOR=$GREEN
            elif [ $DAYS_LEFT -gt 0 ]; then
                SSL_COLOR=$YELLOW
            else
                SSL_COLOR=$RED
            fi
            
            echo -e "  ${BOLD}Domain:${NC}        ${CYAN}${CERT_DOMAIN}${NC}"
            echo -e "  ${BOLD}Expires:${NC}       ${SSL_COLOR}${DAYS_LEFT} days${NC} (${EXPIRY_DATE})"
            echo ""
        fi
    fi
    
    # ============ FOOTER ============
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit | Auto-refresh: 5 seconds${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Sleep 5 seconds before refresh
    sleep 5
done
