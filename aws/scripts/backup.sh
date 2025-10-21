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
BACKUP_DIR="$APP_DIR/backups"
DB_BACKUP_DIR="$BACKUP_DIR/database"
FILES_BACKUP_DIR="$BACKUP_DIR/files"
COMPOSE_FILE="docker-compose.prod.yml"
RETENTION_DAYS=7

# Date format for backup files
DATE=$(date +%Y%m%d_%H%M%S)
DATE_SHORT=$(date +%Y%m%d)

# Load environment variables
if [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
else
    print_error ".env file not found!"
    exit 1
fi

# Create backup directories
mkdir -p "$DB_BACKUP_DIR"
mkdir -p "$FILES_BACKUP_DIR"

cd "$APP_DIR" || exit 1

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Database & Files Backup System                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Backup database
backup_database() {
    print_info "Starting database backup..."
    
    BACKUP_FILE="$DB_BACKUP_DIR/db_backup_${DATE}.sql"
    
    # Check if database container is running
    if ! docker-compose -f "$COMPOSE_FILE" ps db | grep -q "Up"; then
        print_error "Database container is not running!"
        return 1
    fi
    
    # Perform backup
    if docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --create \
        --verbose \
        > "$BACKUP_FILE" 2>/tmp/backup.log; then
        
        # Compress backup
        gzip "$BACKUP_FILE"
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
        
        print_success "Database backup completed: ${BACKUP_FILE}.gz (${BACKUP_SIZE})"
        
        # Create daily backup (only one per day)
        DAILY_BACKUP="$DB_BACKUP_DIR/db_backup_daily_${DATE_SHORT}.sql.gz"
        if [ ! -f "$DAILY_BACKUP" ]; then
            cp "${BACKUP_FILE}.gz" "$DAILY_BACKUP"
            print_info "Daily backup created: $DAILY_BACKUP"
        fi
        
        return 0
    else
        print_error "Database backup failed!"
        cat /tmp/backup.log
        return 1
    fi
}

# Backup uploaded files
backup_files() {
    print_info "Starting files backup..."
    
    UPLOADS_DIR="$APP_DIR/backend/uploads"
    
    if [ ! -d "$UPLOADS_DIR" ] || [ -z "$(ls -A $UPLOADS_DIR 2>/dev/null)" ]; then
        print_warning "No files to backup in uploads directory"
        return 0
    fi
    
    BACKUP_FILE="$FILES_BACKUP_DIR/files_backup_${DATE}.tar.gz"
    
    if tar -czf "$BACKUP_FILE" -C "$APP_DIR/backend" uploads 2>/dev/null; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        print_success "Files backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})"
        return 0
    else
        print_error "Files backup failed!"
        return 1
    fi
}

# Backup application configuration
backup_config() {
    print_info "Starting configuration backup..."
    
    CONFIG_BACKUP_DIR="$BACKUP_DIR/config"
    mkdir -p "$CONFIG_BACKUP_DIR"
    
    BACKUP_FILE="$CONFIG_BACKUP_DIR/config_backup_${DATE}.tar.gz"
    
    tar -czf "$BACKUP_FILE" \
        --exclude='*.log' \
        .env \
        docker-compose.prod.yml \
        nginx.conf 2>/dev/null || true
    
    print_success "Configuration backup completed: $BACKUP_FILE"
}

# Cleanup old backups
cleanup_old_backups() {
    print_info "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
    
    # Database backups (except daily)
    DELETED=$(find "$DB_BACKUP_DIR" -name "db_backup_2*.sql.gz" \
        ! -name "*daily*" \
        -mtime +${RETENTION_DAYS} \
        -delete -print | wc -l)
    print_info "Deleted $DELETED old database backups"
    
    # Keep daily backups for 30 days
    DELETED=$(find "$DB_BACKUP_DIR" -name "*daily*.sql.gz" \
        -mtime +30 \
        -delete -print | wc -l)
    print_info "Deleted $DELETED old daily backups"
    
    # Files backups
    DELETED=$(find "$FILES_BACKUP_DIR" -name "files_backup_*.tar.gz" \
        -mtime +${RETENTION_DAYS} \
        -delete -print | wc -l)
    print_info "Deleted $DELETED old file backups"
    
    # Config backups (keep for 30 days)
    DELETED=$(find "$BACKUP_DIR/config" -name "config_backup_*.tar.gz" \
        -mtime +30 \
        -delete -print | wc -l)
    print_info "Deleted $DELETED old config backups"
    
    print_success "Cleanup completed"
}

# Show backup statistics
show_backup_stats() {
    echo ""
    print_info "Backup Statistics:"
    echo ""
    
    # Database backups
    DB_COUNT=$(find "$DB_BACKUP_DIR" -name "*.sql.gz" 2>/dev/null | wc -l)
    DB_SIZE=$(du -sh "$DB_BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "  Database backups: $DB_COUNT files ($DB_SIZE)"
    
    # Files backups
    FILES_COUNT=$(find "$FILES_BACKUP_DIR" -name "*.tar.gz" 2>/dev/null | wc -l)
    FILES_SIZE=$(du -sh "$FILES_BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "  Files backups:    $FILES_COUNT files ($FILES_SIZE)"
    
    # Total
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "  Total size:       $TOTAL_SIZE"
    echo ""
}

# Verify backup integrity
verify_backup() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        return 1
    fi
    
    # Test if file is a valid gzip
    if gzip -t "$backup_file" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Main backup process
main() {
    local EXIT_CODE=0
    
    # Perform backups
    if backup_database; then
        # Verify database backup
        LATEST_DB_BACKUP=$(ls -t "$DB_BACKUP_DIR"/db_backup_${DATE}*.sql.gz 2>/dev/null | head -n1)
        if [ -n "$LATEST_DB_BACKUP" ] && verify_backup "$LATEST_DB_BACKUP"; then
            print_success "Database backup verified"
        else
            print_warning "Database backup verification failed"
            EXIT_CODE=1
        fi
    else
        EXIT_CODE=1
    fi
    
    backup_files || EXIT_CODE=1
    backup_config
    cleanup_old_backups
    show_backup_stats
    
    # Save backup log
    echo "Backup completed at $(date)" >> "$BACKUP_DIR/backup.log"
    
    echo ""
    if [ $EXIT_CODE -eq 0 ]; then
        print_success "╔════════════════════════════════════════════════════════════╗"
        print_success "║           All Backups Completed Successfully! 🎉          ║"
        print_success "╚════════════════════════════════════════════════════════════╝"
    else
        print_warning "╔════════════════════════════════════════════════════════════╗"
        print_warning "║         Backup Completed with Warnings ⚠️                  ║"
        print_warning "╚════════════════════════════════════════════════════════════╝"
    fi
    echo ""
    
    exit $EXIT_CODE
}

# Run main function
main "$@"
