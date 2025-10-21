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
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="$APP_DIR/backups/deployments"

# Change to app directory
cd "$APP_DIR" || exit 1

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Student Activity System - Deployment             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup current version if exists
if [ -d "backend" ] && [ -d "frontend" ]; then
    print_info "Creating backup of current version..."
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" \
        --exclude='node_modules' \
        --exclude='backend/node_modules' \
        --exclude='frontend/node_modules' \
        --exclude='frontend/build' \
        --exclude='*.log' \
        backend frontend docker-compose.prod.yml .env 2>/dev/null || true
    
    print_success "Backup created: $BACKUP_FILE"
    
    # Keep only last 10 backups
    ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm
    print_info "Old backups cleaned up (keeping last 10)"
fi

# Pull latest code if git repo exists
if [ -d ".git" ]; then
    print_info "Pulling latest code from repository..."
    git fetch origin
    git pull origin main || git pull origin master || print_warning "Could not pull latest code"
    print_success "Code updated"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_info "Creating template .env file..."
    cat > .env << 'EOF'
# Database Configuration
DB_NAME=Web_QuanLyDiemRenLuyen
DB_USER=admin
DB_PASSWORD=CHANGE_ME_SECURE_PASSWORD

# JWT Configuration
JWT_SECRET=CHANGE_ME_SUPER_SECRET_KEY
JWT_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://YOUR_SERVER_IP:3000

# Frontend Configuration
REACT_APP_API_URL=http://YOUR_SERVER_IP:3001/api
EOF
    print_warning "Please edit .env file with your configuration and run deploy again!"
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
REQUIRED_VARS=("DB_PASSWORD" "JWT_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" == "CHANGE_ME"* ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Missing or invalid environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    print_warning "Please update your .env file"
    exit 1
fi

# Stop existing containers
print_info "Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down || true
print_success "Containers stopped"

# Clean up dangling images (optional)
print_info "Cleaning up old Docker images..."
docker image prune -f || true

# Pull base images
print_info "Pulling base Docker images..."
docker pull postgres:15-alpine
docker pull node:18-alpine
docker pull nginx:alpine
print_success "Base images updated"

# Build application
print_info "Building application containers..."
docker-compose -f "$COMPOSE_FILE" build --no-cache
print_success "Build completed"

# Start containers
print_info "Starting containers..."
docker-compose -f "$COMPOSE_FILE" up -d
print_success "Containers started"

# Wait for database to be ready
print_info "Waiting for database to be ready..."
ATTEMPTS=0
MAX_ATTEMPTS=30

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready -U "$DB_USER" &>/dev/null; then
        print_success "Database is ready"
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    echo -n "."
    sleep 2
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
    print_error "Database failed to start in time"
    docker-compose -f "$COMPOSE_FILE" logs db
    exit 1
fi

# Run database migrations
print_info "Running database migrations..."
docker-compose -f "$COMPOSE_FILE" exec -T backend npx prisma migrate deploy || {
    print_warning "Migration failed, but continuing..."
}

# Generate Prisma client
print_info "Generating Prisma client..."
docker-compose -f "$COMPOSE_FILE" exec -T backend npx prisma generate || {
    print_warning "Prisma generate failed, but continuing..."
}

# Wait for services to stabilize
print_info "Waiting for services to stabilize..."
sleep 15

# Health checks
print_info "Running health checks..."
HEALTH_PASSED=true

# Check backend
if curl -sf http://localhost:3001/api/health &>/dev/null; then
    print_success "Backend: ✓ Healthy"
else
    print_warning "Backend: ✗ Not responding"
    HEALTH_PASSED=false
fi

# Check frontend
if curl -sf http://localhost:3000 &>/dev/null; then
    print_success "Frontend: ✓ Healthy"
else
    print_warning "Frontend: ✗ Not responding"
    HEALTH_PASSED=false
fi

# Check database
if docker-compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
    print_success "Database: ✓ Connected"
else
    print_warning "Database: ✗ Connection failed"
    HEALTH_PASSED=false
fi

# Show container status
echo ""
print_info "Container status:"
docker-compose -f "$COMPOSE_FILE" ps

# Show resource usage
echo ""
print_info "Resource usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
    $(docker-compose -f "$COMPOSE_FILE" ps -q)

# Show recent logs
echo ""
print_info "Recent logs (last 30 lines):"
docker-compose -f "$COMPOSE_FILE" logs --tail=30

echo ""
if [ "$HEALTH_PASSED" = true ]; then
    print_success "╔════════════════════════════════════════════════════════════╗"
    print_success "║           Deployment Completed Successfully! 🎉           ║"
    print_success "╚════════════════════════════════════════════════════════════╝"
    echo ""
    print_info "Application URLs:"
    echo "  Frontend: http://$(curl -s ifconfig.me):3000"
    echo "  Backend:  http://$(curl -s ifconfig.me):3001/api"
    echo ""
    print_info "Useful commands:"
    echo "  View logs:      docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Stop app:       docker-compose -f $COMPOSE_FILE down"
    echo "  Restart:        docker-compose -f $COMPOSE_FILE restart"
    echo "  View stats:     docker stats"
    echo ""
else
    print_warning "╔════════════════════════════════════════════════════════════╗"
    print_warning "║       Deployment Completed with Warnings ⚠️                ║"
    print_warning "╚════════════════════════════════════════════════════════════╝"
    echo ""
    print_info "Some health checks failed. Check logs with:"
    echo "  docker-compose -f $COMPOSE_FILE logs"
    echo ""
fi

# Save deployment info
cat > "$APP_DIR/last-deployment.txt" << EOF
Deployment Date: $(date)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")
Health Status: $HEALTH_PASSED
EOF

exit 0
