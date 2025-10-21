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

# Load environment variables
if [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
else
    print_error ".env file not found!"
    exit 1
fi

cd "$APP_DIR" || exit 1

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Database & Files Restore System               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# List available backups
list_backups() {
    local backup_type=$1
    local backup_dir=$2
    local pattern=$3
    
    print_info "Available $backup_type backups:"
    echo ""
    
    if [ ! -d "$backup_dir" ]; then
        print_warning "No backup directory found: $backup_dir"
        return 1
    fi
    
    local backups=($(ls -t "$backup_dir"/$pattern 2>/dev/null))
    
    if [ ${#backups[@]} -eq 0 ]; then
        print_warning "No backups found"
        return 1
    fi
    
    local index=1
    for backup in "${backups[@]}"; do
        local size=$(du -h "$backup" | cut -f1)
        local date=$(stat -c %y "$backup" | cut -d' ' -f1,2 | cut -d'.' -f1)
        echo "  [$index] $(basename $backup) - $size - $date"
        index=$((index + 1))
    done
    
    echo ""
    return 0
}

# Select backup
select_backup() {
    local backup_type=$1
    local backup_dir=$2
    local pattern=$3
    
    if ! list_backups "$backup_type" "$backup_dir" "$pattern"; then
        return 1
    fi
    
    local backups=($(ls -t "$backup_dir"/$pattern 2>/dev/null))
    local total=${#backups[@]}
    
    echo -n "Select backup number (1-$total) or 'q' to quit: "
    read selection
    
    if [ "$selection" = "q" ]; then
        print_info "Restore cancelled"
        exit 0
    fi
    
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt "$total" ]; then
        print_error "Invalid selection"
        return 1
    fi
    
    local index=$((selection - 1))
    SELECTED_BACKUP="${backups[$index]}"
    echo "$SELECTED_BACKUP"
}

# Restore database
restore_database() {
    print_warning "⚠️  WARNING: This will replace the current database!"
    echo -n "Are you sure you want to continue? (yes/no): "
    read confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_info "Database restore cancelled"
        return 0
    fi
    
    local backup_file=$(select_backup "database" "$DB_BACKUP_DIR" "*.sql.gz")
    
    if [ -z "$backup_file" ]; then
        print_error "No backup selected"
        return 1
    fi
    
    print_info "Selected backup: $(basename $backup_file)"
    
    # Check if database container is running
    if ! docker-compose -f "$COMPOSE_FILE" ps db | grep -q "Up"; then
        print_error "Database container is not running!"
        print_info "Start it with: docker-compose -f $COMPOSE_FILE up -d db"
        return 1
    fi
    
    # Create a safety backup before restore
    print_info "Creating safety backup of current database..."
    SAFETY_BACKUP="$DB_BACKUP_DIR/safety_backup_before_restore_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        > "$SAFETY_BACKUP" 2>/dev/null || true
    gzip "$SAFETY_BACKUP"
    print_success "Safety backup created: ${SAFETY_BACKUP}.gz"
    
    # Restore database
    print_info "Restoring database from backup..."
    
    if gunzip -c "$backup_file" | docker-compose -f "$COMPOSE_FILE" exec -T db psql \
        -U "$DB_USER" \
        -d postgres 2>&1 | tee /tmp/restore.log; then
        
        print_success "Database restored successfully!"
        
        # Verify restoration
        print_info "Verifying database..."
        if docker-compose -f "$COMPOSE_FILE" exec -T db psql \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "SELECT COUNT(*) FROM \"User\"" &>/dev/null; then
            print_success "Database verification passed"
        else
            print_warning "Database verification failed - check logs"
        fi
        
        return 0
    else
        print_error "Database restore failed!"
        print_info "Check logs: /tmp/restore.log"
        print_info "Safety backup is available: ${SAFETY_BACKUP}.gz"
        return 1
    fi
}

# Restore files
restore_files() {
    print_warning "⚠️  WARNING: This will replace current uploaded files!"
    echo -n "Are you sure you want to continue? (yes/no): "
    read confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_info "Files restore cancelled"
        return 0
    fi
    
    local backup_file=$(select_backup "files" "$FILES_BACKUP_DIR" "*.tar.gz")
    
    if [ -z "$backup_file" ]; then
        print_error "No backup selected"
        return 1
    fi
    
    print_info "Selected backup: $(basename $backup_file)"
    
    # Create safety backup
    UPLOADS_DIR="$APP_DIR/backend/uploads"
    if [ -d "$UPLOADS_DIR" ] && [ -n "$(ls -A $UPLOADS_DIR 2>/dev/null)" ]; then
        print_info "Creating safety backup of current files..."
        SAFETY_BACKUP="$FILES_BACKUP_DIR/safety_backup_before_restore_$(date +%Y%m%d_%H%M%S).tar.gz"
        tar -czf "$SAFETY_BACKUP" -C "$APP_DIR/backend" uploads 2>/dev/null || true
        print_success "Safety backup created: $SAFETY_BACKUP"
    fi
    
    # Restore files
    print_info "Restoring files from backup..."
    
    # Remove old uploads directory
    rm -rf "$UPLOADS_DIR"
    
    # Extract backup
    if tar -xzf "$backup_file" -C "$APP_DIR/backend" 2>/dev/null; then
        print_success "Files restored successfully!"
        
        # Fix permissions
        chown -R $(whoami):$(whoami) "$UPLOADS_DIR"
        
        # Count restored files
        FILE_COUNT=$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l)
        print_info "Restored $FILE_COUNT files"
        
        return 0
    else
        print_error "Files restore failed!"
        return 1
    fi
}

# Quick restore (latest backup)
quick_restore() {
    local backup_type=$1
    
    print_info "Quick restore: Using latest $backup_type backup"
    
    case $backup_type in
        database)
            local latest=$(ls -t "$DB_BACKUP_DIR"/*.sql.gz 2>/dev/null | head -n1)
            if [ -z "$latest" ]; then
                print_error "No database backups found"
                return 1
            fi
            
            print_info "Latest backup: $(basename $latest)"
            SELECTED_BACKUP="$latest"
            
            # Create safety backup
            print_info "Creating safety backup..."
            docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                > "$DB_BACKUP_DIR/safety_$(date +%Y%m%d_%H%M%S).sql" || true
            
            # Restore
            gunzip -c "$latest" | docker-compose -f "$COMPOSE_FILE" exec -T db psql \
                -U "$DB_USER" \
                -d postgres
            ;;
            
        files)
            local latest=$(ls -t "$FILES_BACKUP_DIR"/*.tar.gz 2>/dev/null | head -n1)
            if [ -z "$latest" ]; then
                print_error "No files backups found"
                return 1
            fi
            
            print_info "Latest backup: $(basename $latest)"
            tar -xzf "$latest" -C "$APP_DIR/backend"
            ;;
            
        *)
            print_error "Unknown backup type: $backup_type"
            return 1
            ;;
    esac
    
    print_success "Quick restore completed!"
}

# Show menu
show_menu() {
    echo "Select restore option:"
    echo ""
    echo "  1) Restore database (interactive)"
    echo "  2) Restore files (interactive)"
    echo "  3) Restore both (interactive)"
    echo "  4) Quick restore database (latest)"
    echo "  5) Quick restore files (latest)"
    echo "  6) List all backups"
    echo "  q) Quit"
    echo ""
    echo -n "Your choice: "
}

# Main function
main() {
    if [ "$1" = "--quick-db" ]; then
        quick_restore database
        exit $?
    elif [ "$1" = "--quick-files" ]; then
        quick_restore files
        exit $?
    fi
    
    while true; do
        show_menu
        read choice
        echo ""
        
        case $choice in
            1)
                restore_database
                ;;
            2)
                restore_files
                ;;
            3)
                restore_database && restore_files
                ;;
            4)
                quick_restore database
                ;;
            5)
                quick_restore files
                ;;
            6)
                list_backups "database" "$DB_BACKUP_DIR" "*.sql.gz"
                echo ""
                list_backups "files" "$FILES_BACKUP_DIR" "*.tar.gz"
                ;;
            q)
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid choice"
                ;;
        esac
        
        echo ""
        echo "Press Enter to continue..."
        read
        clear
    done
}

# Run main function
main "$@"
