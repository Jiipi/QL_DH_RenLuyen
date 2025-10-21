#!/bin/bash
# Auto deployment script
# Được gọi bởi GitHub webhook hoặc chạy thủ công

set -e

PROJECT_DIR="/var/www/hoatdongrenluyen"
BRANCH="main"
DEPLOY_LOG="/var/log/hoatdongrenluyen-deploy.log"

# Function to log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

log "======================================"
log "Starting deployment..."
log "======================================"

cd "$PROJECT_DIR"

# Pull latest code
log "Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/$BRANCH
git pull origin $BRANCH

# Check if docker-compose file exists
if [ ! -f "docker-compose.yml" ]; then
    log "❌ ERROR: docker-compose.yml not found!"
    exit 1
fi

# Stop old containers
log "Stopping old containers..."
docker-compose down || true

# Build and start new containers
log "Building and starting new containers..."
docker-compose up -d --build

# Wait for services to be ready
log "Waiting for services to start..."
sleep 10

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    log "✅ Deployment successful!"
    
    # Show running containers
    log "Running containers:"
    docker-compose ps | tee -a "$DEPLOY_LOG"
    
    # Cleanup old images
    log "Cleaning up old images..."
    docker image prune -f
    
else
    log "❌ ERROR: Containers failed to start!"
    docker-compose logs --tail=50 | tee -a "$DEPLOY_LOG"
    exit 1
fi

log "======================================"
log "Deployment completed at $(date)"
log "======================================"
