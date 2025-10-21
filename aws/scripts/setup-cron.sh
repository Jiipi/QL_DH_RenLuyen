#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Configuration
APP_DIR="/home/ec2-user/student-app"
SCRIPTS_DIR="$APP_DIR/aws/scripts"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Automated Cron Jobs Setup                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if scripts directory exists
if [ ! -d "$SCRIPTS_DIR" ]; then
    print_error "Scripts directory not found: $SCRIPTS_DIR"
    exit 1
fi

# Ensure scripts are executable
print_info "Making scripts executable..."
chmod +x "$SCRIPTS_DIR"/*.sh
print_success "Scripts are now executable"

# Backup existing crontab
print_info "Backing up existing crontab..."
crontab -l > /tmp/crontab.backup 2>/dev/null || touch /tmp/crontab.backup
print_success "Crontab backed up to /tmp/crontab.backup"

# Create new crontab
print_info "Setting up cron jobs..."

# Remove old student-app cron jobs if they exist
crontab -l 2>/dev/null | grep -v "student-app" > /tmp/crontab.new || touch /tmp/crontab.new

# Add new cron jobs
cat >> /tmp/crontab.new << 'EOF'

# ============================================
# Student Activity System - Automated Tasks
# ============================================

# Database backup - Every day at 2:00 AM
0 2 * * * /home/ec2-user/student-app/aws/scripts/backup.sh >> /home/ec2-user/student-app/logs/backup.log 2>&1

# Weekly database backup - Every Sunday at 3:00 AM (long-term retention)
0 3 * * 0 /home/ec2-user/student-app/aws/scripts/backup.sh >> /home/ec2-user/student-app/logs/backup-weekly.log 2>&1

# System monitoring - Every hour
0 * * * * /home/ec2-user/student-app/aws/scripts/monitor.sh >> /home/ec2-user/student-app/logs/monitor.log 2>&1

# Docker cleanup - Every Sunday at 4:00 AM
0 4 * * 0 docker system prune -af --volumes >> /home/ec2-user/student-app/logs/docker-cleanup.log 2>&1

# Check disk space - Every 6 hours
0 */6 * * * df -h / | tail -1 | awk '{if($5+0 > 85) print "Warning: Disk usage is "$5}' >> /home/ec2-user/student-app/logs/disk-alert.log 2>&1

# Restart containers if unhealthy - Every 30 minutes
*/30 * * * * /home/ec2-user/student-app/aws/scripts/health-check.sh >> /home/ec2-user/student-app/logs/health-check.log 2>&1

# Log rotation - Every day at 1:00 AM
0 1 * * * find /home/ec2-user/student-app/logs -name "*.log" -size +100M -exec truncate -s 0 {} \; >> /home/ec2-user/student-app/logs/log-rotation.log 2>&1

# Update system packages - Every Monday at 5:00 AM
0 5 * * 1 sudo dnf update -y >> /home/ec2-user/student-app/logs/system-update.log 2>&1

EOF

# Install new crontab
crontab /tmp/crontab.new
print_success "Cron jobs installed successfully"

# Create logs directory if not exists
mkdir -p "$APP_DIR/logs"

# Create health check script
print_info "Creating health check script..."
cat > "$SCRIPTS_DIR/health-check.sh" << 'HEALTHEOF'
#!/bin/bash
# Automatic health check and restart script

APP_DIR="/home/ec2-user/student-app"
cd "$APP_DIR" || exit 1

COMPOSE_FILE="docker-compose.prod.yml"

# Check if backend is responding
if ! curl -sf http://localhost:3001/api/health &>/dev/null; then
    echo "[$(date)] Backend is not responding. Restarting..."
    docker-compose -f "$COMPOSE_FILE" restart backend
    sleep 10
    
    # Check again
    if curl -sf http://localhost:3001/api/health &>/dev/null; then
        echo "[$(date)] Backend restarted successfully"
    else
        echo "[$(date)] Backend restart failed - manual intervention required"
        # Send alert (configure your notification method here)
    fi
fi

# Check if frontend is responding
if ! curl -sf http://localhost:3000 &>/dev/null; then
    echo "[$(date)] Frontend is not responding. Restarting..."
    docker-compose -f "$COMPOSE_FILE" restart frontend
    sleep 10
    
    if curl -sf http://localhost:3000 &>/dev/null; then
        echo "[$(date)] Frontend restarted successfully"
    else
        echo "[$(date)] Frontend restart failed - manual intervention required"
    fi
fi

# Check database
if ! docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready &>/dev/null; then
    echo "[$(date)] Database is not ready. Restarting..."
    docker-compose -f "$COMPOSE_FILE" restart db
    sleep 15
    
    if docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready &>/dev/null; then
        echo "[$(date)] Database restarted successfully"
    else
        echo "[$(date)] Database restart failed - manual intervention required"
    fi
fi

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -ge 90 ]; then
    echo "[$(date)] Critical: Disk usage is ${DISK_USAGE}%"
    # Clean up old logs
    find "$APP_DIR/logs" -name "*.log" -mtime +7 -delete
    find "$APP_DIR/backups/database" -name "*.sql.gz" ! -name "*daily*" -mtime +7 -delete
fi
HEALTHEOF

chmod +x "$SCRIPTS_DIR/health-check.sh"
print_success "Health check script created"

# Show installed cron jobs
echo ""
print_info "Installed cron jobs:"
echo ""
crontab -l | grep -A 20 "Student Activity System"

echo ""
print_success "╔════════════════════════════════════════════════════════════╗"
print_success "║          Cron Jobs Setup Completed Successfully! 🎉       ║"
print_success "╚════════════════════════════════════════════════════════════╝"
echo ""

print_info "Summary:"
echo "  ✓ Daily database backups at 2:00 AM"
echo "  ✓ Weekly backups every Sunday at 3:00 AM"
echo "  ✓ Hourly system monitoring"
echo "  ✓ Health checks every 30 minutes"
echo "  ✓ Weekly Docker cleanup"
echo "  ✓ Disk space monitoring every 6 hours"
echo "  ✓ Daily log rotation"
echo "  ✓ Weekly system updates"
echo ""

print_info "View cron logs:"
echo "  Backup logs:      tail -f $APP_DIR/logs/backup.log"
echo "  Monitor logs:     tail -f $APP_DIR/logs/monitor.log"
echo "  Health logs:      tail -f $APP_DIR/logs/health-check.log"
echo ""

print_warning "Note: Make sure your system timezone is correct!"
echo "  Current timezone: $(timedatectl 2>/dev/null | grep "Time zone" || date +%Z)"
echo "  To change: sudo timedatectl set-timezone Asia/Ho_Chi_Minh"
echo ""
