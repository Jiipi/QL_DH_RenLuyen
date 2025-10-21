#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() { echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"; }
print_footer() { echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"; }
print_title() { echo -e "${CYAN}║ $1${NC}"; }
print_info() { echo -e "${BLUE}$1${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

# Configuration
APP_DIR="/home/ec2-user/student-app"
COMPOSE_FILE="docker-compose.prod.yml"
THRESHOLD_CPU=80
THRESHOLD_MEM=80
THRESHOLD_DISK=85

# Change to app directory if it exists
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
fi

# Clear screen for better visibility
clear

# Header
print_header
print_title "          Student Activity System - Monitor Dashboard          "
print_footer
echo ""

# System Information
echo -e "${CYAN}=== SYSTEM INFORMATION ===${NC}"
echo ""
echo "Hostname:     $(hostname)"
echo "Uptime:       $(uptime -p)"
echo "Date:         $(date '+%Y-%m-%d %H:%M:%S')"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# Disk Usage
echo -e "${CYAN}=== DISK USAGE ===${NC}"
echo ""
df -h / /home | tail -n +2 | while read line; do
    usage=$(echo $line | awk '{print $5}' | sed 's/%//')
    if [ "$usage" -ge "$THRESHOLD_DISK" ]; then
        print_error "$line"
    elif [ "$usage" -ge 70 ]; then
        print_warning "$line"
    else
        print_success "$line"
    fi
done
echo ""

# Memory Usage
echo -e "${CYAN}=== MEMORY USAGE ===${NC}"
echo ""
free -h | grep -E 'Mem|Swap'
MEMORY_PERCENT=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$MEMORY_PERCENT" -ge "$THRESHOLD_MEM" ]; then
    print_error "Memory usage: ${MEMORY_PERCENT}% (High!)"
elif [ "$MEMORY_PERCENT" -ge 60 ]; then
    print_warning "Memory usage: ${MEMORY_PERCENT}%"
else
    print_success "Memory usage: ${MEMORY_PERCENT}%"
fi
echo ""

# Docker Status
echo -e "${CYAN}=== DOCKER CONTAINERS STATUS ===${NC}"
echo ""
if [ -f "$COMPOSE_FILE" ]; then
    docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null || docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi
echo ""

# Container Resource Usage
echo -e "${CYAN}=== CONTAINER RESOURCE USAGE ===${NC}"
echo ""
if command -v docker &> /dev/null; then
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null
fi
echo ""

# Application Health Checks
echo -e "${CYAN}=== APPLICATION HEALTH CHECKS ===${NC}"
echo ""

# Check Backend
if curl -sf http://localhost:3001/api/health &>/dev/null; then
    print_success "Backend API (Port 3001): Healthy"
else
    print_error "Backend API (Port 3001): Not responding"
fi

# Check Frontend
if curl -sf http://localhost:3000 &>/dev/null; then
    print_success "Frontend (Port 3000): Healthy"
else
    print_error "Frontend (Port 3000): Not responding"
fi

# Check Database
if [ -f "$COMPOSE_FILE" ]; then
    if docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready &>/dev/null; then
        print_success "Database: Connected"
    else
        print_error "Database: Not ready"
    fi
fi
echo ""

# Network Connections
echo -e "${CYAN}=== ACTIVE CONNECTIONS ===${NC}"
echo ""
echo "Total connections:"
ss -s 2>/dev/null | grep TCP || netstat -s 2>/dev/null | grep "connections established"
echo ""
echo "Listening ports:"
ss -tlnp 2>/dev/null | grep LISTEN | awk '{print $4, $7}' | column -t || \
    netstat -tlnp 2>/dev/null | grep LISTEN | awk '{print $4, $7}' | column -t
echo ""

# Recent Logs
echo -e "${CYAN}=== RECENT APPLICATION LOGS (Last 20 lines) ===${NC}"
echo ""
if [ -f "$COMPOSE_FILE" ]; then
    docker-compose -f "$COMPOSE_FILE" logs --tail=20 --no-color 2>/dev/null | tail -30
else
    echo "Docker Compose file not found"
fi
echo ""

# Database Statistics
echo -e "${CYAN}=== DATABASE STATISTICS ===${NC}"
echo ""
if [ -f "$COMPOSE_FILE" ] && [ -f ".env" ]; then
    source .env
    
    # Database size
    DB_SIZE=$(docker-compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)
    
    if [ -n "$DB_SIZE" ]; then
        echo "Database Size: $DB_SIZE"
        
        # Connection count
        CONN_COUNT=$(docker-compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
        echo "Active Connections: $CONN_COUNT"
        
        # Table counts
        echo ""
        echo "Table Statistics:"
        docker-compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c \
            "SELECT schemaname, tablename, 
                    n_tup_ins as inserts, 
                    n_tup_upd as updates, 
                    n_tup_del as deletes 
             FROM pg_stat_user_tables 
             ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC 
             LIMIT 5;" 2>/dev/null | head -10
    else
        print_warning "Could not retrieve database statistics"
    fi
else
    print_warning "Cannot check database (missing compose file or .env)"
fi
echo ""

# Backup Status
echo -e "${CYAN}=== BACKUP STATUS ===${NC}"
echo ""
BACKUP_DIR="$APP_DIR/backups/database"
if [ -d "$BACKUP_DIR" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d' ' -f1,2 | cut -d'.' -f1)
        BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        print_success "Latest backup: $(basename $LATEST_BACKUP)"
        echo "              Date: $BACKUP_DATE"
        echo "              Size: $BACKUP_SIZE"
        
        BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
        echo "              Total backups: $BACKUP_COUNT"
    else
        print_warning "No backups found"
    fi
else
    print_warning "Backup directory not found"
fi
echo ""

# SSL Certificate Status (if applicable)
if [ -d "/etc/letsencrypt/live" ]; then
    echo -e "${CYAN}=== SSL CERTIFICATE STATUS ===${NC}"
    echo ""
    for cert in /etc/letsencrypt/live/*/cert.pem; do
        if [ -f "$cert" ]; then
            domain=$(dirname "$cert" | xargs basename)
            expiry=$(openssl x509 -enddate -noout -in "$cert" | cut -d= -f2)
            echo "Domain: $domain"
            echo "Expires: $expiry"
        fi
    done
    echo ""
fi

# Security Alerts
echo -e "${CYAN}=== SECURITY ALERTS ===${NC}"
echo ""

# Check for failed login attempts
FAILED_LOGINS=$(grep "Failed password" /var/log/secure 2>/dev/null | tail -5 | wc -l)
if [ "$FAILED_LOGINS" -gt 0 ]; then
    print_warning "Failed SSH login attempts: $FAILED_LOGINS (recent)"
else
    print_success "No recent failed login attempts"
fi

# Check Docker security
if docker ps --format '{{.Image}}' | grep -q "latest"; then
    print_warning "Some containers using 'latest' tag (not recommended for production)"
else
    print_success "All containers using specific version tags"
fi
echo ""

# Quick Actions
print_header
print_title "                      QUICK ACTIONS                            "
print_footer
echo ""
echo "View logs:           docker-compose -f $COMPOSE_FILE logs -f"
echo "Restart all:         docker-compose -f $COMPOSE_FILE restart"
echo "Stop all:            docker-compose -f $COMPOSE_FILE down"
echo "Backup database:     ./backup.sh"
echo "Deploy update:       ./deploy.sh"
echo ""

# Alerts Summary
echo -e "${CYAN}=== ALERTS SUMMARY ===${NC}"
echo ""

ALERTS=0

if [ "$MEMORY_PERCENT" -ge "$THRESHOLD_MEM" ]; then
    print_error "High memory usage: ${MEMORY_PERCENT}%"
    ALERTS=$((ALERTS + 1))
fi

DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -ge "$THRESHOLD_DISK" ]; then
    print_error "High disk usage: ${DISK_USAGE}%"
    ALERTS=$((ALERTS + 1))
fi

if ! curl -sf http://localhost:3001/api/health &>/dev/null; then
    print_error "Backend is not responding"
    ALERTS=$((ALERTS + 1))
fi

if ! curl -sf http://localhost:3000 &>/dev/null; then
    print_error "Frontend is not responding"
    ALERTS=$((ALERTS + 1))
fi

if [ $ALERTS -eq 0 ]; then
    print_success "All systems operational ✓"
else
    print_warning "$ALERTS alert(s) detected"
fi

echo ""
echo "Last updated: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
