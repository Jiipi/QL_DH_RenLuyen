#!/bin/bash
set -e

# Colors
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
EC2_HOST=$1
SSH_KEY=${2:-student-app-key.pem}
DEPLOY_DIR="/home/ec2-user/student-app"

if [ -z "$EC2_HOST" ]; then
    print_error "Usage: $0 <EC2_HOST> [SSH_KEY_PATH]"
    echo ""
    echo "Example:"
    echo "  $0 54.169.123.45"
    echo "  $0 54.169.123.45 /path/to/key.pem"
    exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key not found: $SSH_KEY"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           Manual Deployment to AWS EC2                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

print_info "Target: ec2-user@$EC2_HOST"
print_info "SSH Key: $SSH_KEY"
echo ""

# Test SSH connection
print_info "Testing SSH connection..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$EC2_HOST" "echo 'Connected'" 2>/dev/null; then
    print_error "Cannot connect to EC2 instance"
    print_info "Make sure:"
    echo "  1. EC2 instance is running"
    echo "  2. Security group allows SSH from your IP"
    echo "  3. SSH key is correct"
    exit 1
fi
print_success "SSH connection successful"

# Create deployment package
print_info "Creating deployment package..."
TEMP_DIR=$(mktemp -d)
PACKAGE_FILE="$TEMP_DIR/deploy-package.tar.gz"

tar -czf "$PACKAGE_FILE" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='frontend/node_modules' \
    --exclude='backend/node_modules' \
    --exclude='frontend/build' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='*.log' \
    --exclude='student-app-key.pem' \
    backend/ frontend/ docker-compose.prod.yml aws/ nginx/ .dockerignore Makefile

PACKAGE_SIZE=$(du -h "$PACKAGE_FILE" | cut -f1)
print_success "Package created: $PACKAGE_SIZE"

# Upload package
print_info "Uploading package to EC2..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PACKAGE_FILE" ec2-user@"$EC2_HOST":/tmp/deploy-package.tar.gz
print_success "Package uploaded"

# Deploy on EC2
print_info "Deploying on EC2..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@"$EC2_HOST" << 'ENDSSH'
set -e

echo "📦 Starting deployment process..."

# Create app directory if not exists
mkdir -p /home/ec2-user/student-app
cd /home/ec2-user/student-app

# Backup current version
if [ -d "backend" ]; then
    echo "📦 Creating backup..."
    tar -czf "backup-$(date +%Y%m%d-%H%M%S).tar.gz" \
        backend frontend docker-compose.prod.yml 2>/dev/null || true
    # Keep only last 5 backups
    ls -t backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
fi

# Extract new version
echo "📂 Extracting deployment package..."
tar -xzf /tmp/deploy-package.tar.gz
rm /tmp/deploy-package.tar.gz

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found! Creating from example..."
    if [ -f .env.production.example ]; then
        cp .env.production.example .env
        echo "❌ Please edit .env file with your configuration!"
        echo "   nano .env"
        exit 1
    fi
fi

# Make scripts executable
chmod +x aws/scripts/*.sh

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Pull base images
echo "🐳 Pulling base images..."
docker pull postgres:15-alpine
docker pull node:18-alpine
docker pull nginx:alpine

# Build and start
echo "🏗️  Building containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 20

# Run migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy || true

# Health check
echo "🏥 Running health checks..."
sleep 5

if curl -sf http://localhost:3001/api/health &>/dev/null; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed"
fi

if curl -sf http://localhost:3000 &>/dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend health check failed"
fi

# Show status
echo ""
echo "📦 Container status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deployment completed!"
ENDSSH

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
print_success "╔════════════════════════════════════════════════════════════╗"
print_success "║           Deployment Completed Successfully! 🎉           ║"
print_success "╚════════════════════════════════════════════════════════════╝"
echo ""

print_info "Application URLs:"
echo "  Frontend: http://$EC2_HOST:3000"
echo "  Backend:  http://$EC2_HOST:3001/api"
echo ""

print_info "Useful commands:"
echo "  SSH into server: ssh -i $SSH_KEY ec2-user@$EC2_HOST"
echo "  View logs:       make logs EC2_HOST=$EC2_HOST"
echo "  Monitor:         make monitor EC2_HOST=$EC2_HOST"
echo ""
