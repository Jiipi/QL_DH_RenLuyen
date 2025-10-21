#!/bin/bash
# Script kiểm tra deployment hoàn chỉnh
# Chạy sau khi deploy xong để verify mọi thứ hoạt động

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🔍 Deployment Verification Script"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Check Docker is running
echo "1️⃣  Checking Docker..."
docker --version > /dev/null 2>&1
print_status $? "Docker is installed and running"

# 2. Check Docker Compose
echo ""
echo "2️⃣  Checking Docker Compose..."
docker compose version > /dev/null 2>&1
print_status $? "Docker Compose is available"

# 3. Check project directory
echo ""
echo "3️⃣  Checking project directory..."
if [ -d "$HOME/dacn-web/app" ]; then
    print_status 0 "Project directory exists: ~/dacn-web/app"
    cd "$HOME/dacn-web/app"
else
    print_status 1 "Project directory NOT found: ~/dacn-web/app"
    exit 1
fi

# 4. Check .env files
echo ""
echo "4️⃣  Checking configuration files..."
if [ -f "backend/.env" ]; then
    print_status 0 "Backend .env exists"
    
    # Check critical env vars
    if grep -q "JWT_SECRET=.*CHANGE" backend/.env 2>/dev/null; then
        print_warning "JWT_SECRET still contains 'CHANGE' - security risk!"
    fi
    
    if grep -q "CORS_ORIGIN=.*yourdomain" backend/.env 2>/dev/null; then
        print_warning "CORS_ORIGIN still has placeholder 'yourdomain.com'"
    fi
else
    print_status 1 "Backend .env NOT found"
fi

if [ -f "frontend/.env" ]; then
    print_status 0 "Frontend .env exists"
else
    print_warning "Frontend .env NOT found (optional)"
fi

# 5. Check docker-compose.yml
echo ""
echo "5️⃣  Checking docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    print_status 0 "docker-compose.yml exists"
    
    # Check if using default password
    if grep -q "POSTGRES_PASSWORD: abc" docker-compose.yml 2>/dev/null; then
        print_warning "PostgreSQL using DEFAULT password - security risk!"
    fi
    
    # Check restart policy
    if grep -q "restart: always" docker-compose.yml 2>/dev/null; then
        print_status 0 "Restart policy set to 'always'"
    else
        print_warning "Restart policy NOT set to 'always' - containers won't auto-start"
    fi
else
    print_status 1 "docker-compose.yml NOT found"
fi

# 6. Check containers are running
echo ""
echo "6️⃣  Checking Docker containers..."
DB_STATUS=$(docker compose ps db --format json 2>/dev/null | jq -r '.State' 2>/dev/null || echo "not_found")
APP_STATUS=$(docker compose ps app --format json 2>/dev/null | jq -r '.State' 2>/dev/null || echo "not_found")

if [ "$DB_STATUS" = "running" ]; then
    print_status 0 "Database container is running"
else
    print_status 1 "Database container is NOT running (State: $DB_STATUS)"
fi

if [ "$APP_STATUS" = "running" ]; then
    print_status 0 "Application container is running"
else
    print_status 1 "Application container is NOT running (State: $APP_STATUS)"
fi

# 7. Check database connection
echo ""
echo "7️⃣  Testing database connection..."
DB_TEST=$(docker compose exec -T app node -e "const {Client}=require('pg');(async()=>{try{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();console.log('OK');await c.end();}catch(e){console.log('FAIL')}})()" 2>/dev/null | grep -o "OK" || echo "FAIL")
if [ "$DB_TEST" = "OK" ]; then
    print_status 0 "Database connection successful"
else
    print_status 1 "Database connection FAILED"
fi

# 8. Check database tables
echo ""
echo "8️⃣  Checking database tables..."
TABLE_COUNT=$(docker compose exec -T db psql -U admin -d Web_QuanLyDiemRenLuyen -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$TABLE_COUNT" -gt 10 ]; then
    print_status 0 "Database has $TABLE_COUNT tables (looks seeded)"
elif [ "$TABLE_COUNT" -gt 0 ]; then
    print_warning "Database has only $TABLE_COUNT tables (might need seeding)"
else
    print_status 1 "Database has NO tables (needs migration/restore)"
fi

# 9. Check API health endpoint
echo ""
echo "9️⃣  Testing API health endpoint..."
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    print_status 0 "API health check passed (HTTP 200)"
else
    print_status 1 "API health check FAILED (HTTP $API_HEALTH)"
fi

# 10. Check Nginx
echo ""
echo "🔟 Checking Nginx..."
if command -v nginx &> /dev/null; then
    NGINX_STATUS=$(systemctl is-active nginx 2>/dev/null || echo "inactive")
    if [ "$NGINX_STATUS" = "active" ]; then
        print_status 0 "Nginx is running"
        
        # Test Nginx config
        sudo nginx -t > /dev/null 2>&1
        print_status $? "Nginx configuration is valid"
    else
        print_status 1 "Nginx is NOT running"
    fi
else
    print_warning "Nginx is not installed"
fi

# 11. Check SSL certificate
echo ""
echo "1️⃣1️⃣  Checking SSL certificate..."
if [ -d "/etc/letsencrypt/live" ]; then
    CERT_DOMAINS=$(sudo ls /etc/letsencrypt/live 2>/dev/null | grep -v README | head -1)
    if [ -n "$CERT_DOMAINS" ]; then
        CERT_FILE="/etc/letsencrypt/live/$CERT_DOMAINS/cert.pem"
        if [ -f "$CERT_FILE" ]; then
            EXPIRY_DATE=$(sudo openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
            EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null)
            NOW_EPOCH=$(date +%s)
            DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
            
            if [ $DAYS_LEFT -gt 30 ]; then
                print_status 0 "SSL certificate valid ($DAYS_LEFT days remaining)"
            elif [ $DAYS_LEFT -gt 0 ]; then
                print_warning "SSL certificate expires soon ($DAYS_LEFT days)"
            else
                print_status 1 "SSL certificate EXPIRED"
            fi
        fi
    else
        print_warning "No SSL certificates found"
    fi
else
    print_warning "Let's Encrypt directory not found (SSL not configured)"
fi

# 12. Check firewall
echo ""
echo "1️⃣2️⃣  Checking firewall..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status | grep -i "Status: active" || echo "inactive")
    if [ -n "$UFW_STATUS" ]; then
        print_status 0 "UFW firewall is active"
        
        # Check important ports
        if sudo ufw status | grep -q "22/tcp.*ALLOW"; then
            print_info "Port 22 (SSH) is open"
        else
            print_warning "Port 22 (SSH) might be blocked"
        fi
        
        if sudo ufw status | grep -q "80/tcp.*ALLOW"; then
            print_info "Port 80 (HTTP) is open"
        else
            print_warning "Port 80 (HTTP) is not open"
        fi
        
        if sudo ufw status | grep -q "443/tcp.*ALLOW"; then
            print_info "Port 443 (HTTPS) is open"
        else
            print_warning "Port 443 (HTTPS) is not open"
        fi
    else
        print_warning "UFW firewall is NOT active"
    fi
fi

# 13. Check disk space
echo ""
echo "1️⃣3️⃣  Checking disk space..."
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_status 0 "Disk usage: ${DISK_USAGE}% (healthy)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    print_warning "Disk usage: ${DISK_USAGE}% (consider cleanup)"
else
    print_status 1 "Disk usage: ${DISK_USAGE}% (CRITICAL - cleanup needed!)"
fi

# 14. Check memory
echo ""
echo "1️⃣4️⃣  Checking memory..."
TOTAL_MEM=$(free -m | grep Mem | awk '{print $2}')
USED_MEM=$(free -m | grep Mem | awk '{print $3}')
MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))

if [ "$MEM_PERCENT" -lt 80 ]; then
    print_status 0 "Memory usage: ${MEM_PERCENT}% ($USED_MEM/$TOTAL_MEM MB)"
elif [ "$MEM_PERCENT" -lt 90 ]; then
    print_warning "Memory usage: ${MEM_PERCENT}% ($USED_MEM/$TOTAL_MEM MB)"
else
    print_status 1 "Memory usage: ${MEM_PERCENT}% (CRITICAL - might cause OOM!)"
fi

# 15. Check backup setup
echo ""
echo "1️⃣5️⃣  Checking backup configuration..."
if [ -f "$HOME/backup-database.sh" ]; then
    print_status 0 "Backup script exists"
    
    # Check cron job
    if crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
        print_status 0 "Cron job configured for automatic backups"
    else
        print_warning "No cron job found for automatic backups"
    fi
    
    # Check backup directory
    BACKUP_COUNT=$(ls -1 "$HOME/dacn-web/backups/"db_backup_*.dump 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        LATEST_BACKUP=$(ls -t "$HOME/dacn-web/backups/"db_backup_*.dump 2>/dev/null | head -1)
        print_info "Found $BACKUP_COUNT backup(s). Latest: $(basename $LATEST_BACKUP)"
    else
        print_warning "No backups found in ~/dacn-web/backups/"
    fi
else
    print_warning "Backup script not found"
fi

# 16. Check uploads directory
echo ""
echo "1️⃣6️⃣  Checking uploads directory..."
if [ -d "$HOME/dacn-web/app/backend/uploads" ]; then
    IMAGE_COUNT=$(find "$HOME/dacn-web/app/backend/uploads/images" -type f 2>/dev/null | wc -l)
    print_status 0 "Uploads directory exists ($IMAGE_COUNT images)"
else
    print_warning "Uploads directory not found"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 VERIFICATION SUMMARY"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo "Your deployment is healthy and ready for production."
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH $WARNINGS WARNING(S)${NC}"
    echo "Deployment is working but some optimizations recommended."
else
    echo -e "${RED}❌ FOUND $ERRORS ERROR(S) and $WARNINGS WARNING(S)${NC}"
    echo "Please fix the errors before going to production."
fi

echo ""
echo "📝 Detailed information:"
echo "   Errors: $ERRORS"
echo "   Warnings: $WARNINGS"
echo ""

# Quick actions
if [ $ERRORS -gt 0 ]; then
    echo "🔧 Suggested actions:"
    echo "   1. Check logs: docker compose logs -f"
    echo "   2. Restart containers: docker compose restart"
    echo "   3. Check AWS_DEPLOYMENT_GUIDE.md for troubleshooting"
    echo ""
fi

# External access test
echo "🌐 External Access Test:"
echo "   Try accessing these URLs from your browser:"
echo "   - http://$(curl -s ifconfig.me):3001/api/health (if port 3001 is open)"
echo "   - https://yourdomain.com (if domain is configured)"
echo ""

echo "=========================================="
exit $ERRORS
