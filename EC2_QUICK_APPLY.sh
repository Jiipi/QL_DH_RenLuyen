#!/bin/bash
# EC2 Quick Apply Script - Áp dụng các bản vá từ GitHub
# Run this on EC2 after pushing code to GitHub

set -e  # Exit on error

echo "=========================================="
echo "  EC2 PRODUCTION UPDATE SCRIPT"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
APP_DIR="${APP_DIR:-~/app}"
BACKUP_DIR="${BACKUP_DIR:-~/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}=== STEP 1: BACKUP CURRENT STATE ===${NC}"
cd "$APP_DIR" || { echo "App directory not found!"; exit 1; }

# Backup database
echo "📦 Backing up database..."
docker exec hoatdongrenluyen-db pg_dump \
  -U admin \
  -d hoatdongrenluyen \
  -F c \
  -f /tmp/backup_${TIMESTAMP}.dump

docker cp hoatdongrenluyen-db:/tmp/backup_${TIMESTAMP}.dump "$BACKUP_DIR/"
echo -e "${GREEN}✅ Database backup saved to $BACKUP_DIR/backup_${TIMESTAMP}.dump${NC}"

# Backup docker-compose
echo "📦 Backing up docker-compose.production.yml..."
cp docker-compose.production.yml "$BACKUP_DIR/docker-compose.production.yml.backup-${TIMESTAMP}"
echo -e "${GREEN}✅ Docker-compose backup saved${NC}"

# Backup .env if exists
if [ -f .env ]; then
  cp .env "$BACKUP_DIR/.env.backup-${TIMESTAMP}"
  echo -e "${GREEN}✅ .env backup saved${NC}"
fi

echo ""
echo -e "${YELLOW}=== STEP 2: PULL LATEST CODE FROM GITHUB ===${NC}"

# Stash local changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  Local changes detected, stashing..."
  git stash save "Local changes before update ${TIMESTAMP}"
fi

# Pull latest code
echo "📥 Pulling from GitHub..."
git pull origin main || { echo -e "${RED}❌ Git pull failed!${NC}"; exit 1; }
echo -e "${GREEN}✅ Code updated from GitHub${NC}"

# Show recent commits
echo ""
echo "📋 Recent changes:"
git log -3 --oneline --decorate

echo ""
echo -e "${YELLOW}=== STEP 3: UPDATE PRODUCTION CONFIG ===${NC}"

# Get EC2 public IP
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
if [ -n "$EC2_PUBLIC_IP" ]; then
  echo "📍 EC2 Public IP: $EC2_PUBLIC_IP"
else
  echo "⚠️  Could not detect EC2 public IP"
fi

# Show current CORS config
echo ""
echo "Current CORS configuration:"
grep -A 3 "CORS_ORIGIN" docker-compose.production.yml || echo "No CORS_ORIGIN found"

echo ""
echo -e "${YELLOW}⚠️  MANUAL ACTION REQUIRED:${NC}"
echo "Please ensure CORS_ORIGIN in docker-compose.production.yml includes your production domain:"
echo "  CORS_ORIGIN: https://hoatdongrenluyen.io.vn,http://hoatdongrenluyen.io.vn"
echo ""
read -p "Have you verified CORS_ORIGIN is correct? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Please edit docker-compose.production.yml first:"
  echo "  nano docker-compose.production.yml"
  exit 1
fi

echo ""
echo -e "${YELLOW}=== STEP 4: VALIDATE CONFIGURATION ===${NC}"

# Validate YAML
echo "🔍 Validating docker-compose.yml syntax..."
docker compose -f docker-compose.production.yml config > /dev/null 2>&1 && \
  echo -e "${GREEN}✅ YAML is valid${NC}" || \
  { echo -e "${RED}❌ YAML validation failed!${NC}"; exit 1; }

# Check if DB ports are commented out (security check)
echo "🔒 Checking database port security..."
if grep -q "^[^#]*- \"5432:5432\"" docker-compose.production.yml; then
  echo -e "${RED}❌ WARNING: Port 5432 is EXPOSED in docker-compose.production.yml!${NC}"
  echo "This is a security risk. Please comment out the ports section for db service."
  exit 1
else
  echo -e "${GREEN}✅ Database port 5432 is secured (not exposed)${NC}"
fi

echo ""
echo -e "${YELLOW}=== STEP 5: REBUILD AND RESTART SERVICES ===${NC}"

# Pull images
echo "📥 Pulling Docker images..."
docker compose -f docker-compose.production.yml pull

# Rebuild backend
echo "🏗️  Rebuilding backend (this may take a few minutes)..."
docker compose -f docker-compose.production.yml build backend --no-cache

# Rebuild frontend
echo "🏗️  Rebuilding frontend..."
docker compose -f docker-compose.production.yml build frontend --no-cache

# Restart services
echo "🔄 Restarting all services..."
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d

echo ""
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

echo ""
echo -e "${YELLOW}=== STEP 6: VERIFY DEPLOYMENT ===${NC}"

# Check container status
echo "🐳 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔒 Database Security Check:"
docker ps --format "{{.Names}}: {{.Ports}}" | grep -i db
docker port hoatdongrenluyen-db 2>/dev/null && \
  echo -e "${RED}❌ WARNING: Port 5432 is still exposed!${NC}" || \
  echo -e "${GREEN}✅ Port 5432 is secured${NC}"

echo ""
echo "🔌 Backend Health:"
docker logs hoatdongrenluyen-backend --tail 20 | grep -i "database\|connected\|started" || \
  echo "⚠️  Check backend logs manually"

echo ""
echo "🌐 Testing Application:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
  echo -e "${GREEN}✅ Frontend is responding (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}⚠️  Frontend returned HTTP $HTTP_CODE${NC}"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/semesters 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Backend API is responding (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}⚠️  Backend API returned HTTP $HTTP_CODE${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  ✅ UPDATE COMPLETED!${NC}"
echo "=========================================="
echo ""
echo "📋 Summary:"
echo "  - Database backup: $BACKUP_DIR/backup_${TIMESTAMP}.dump"
echo "  - Config backup: $BACKUP_DIR/docker-compose.production.yml.backup-${TIMESTAMP}"
echo "  - Services restarted with latest code"
echo ""
echo "🔍 Next steps:"
echo "  1. Test the website: https://hoatdongrenluyen.io.vn"
echo "  2. Check logs: docker compose -f docker-compose.production.yml logs"
echo "  3. Monitor containers: docker ps"
echo ""
echo "🆘 If something went wrong, rollback with:"
echo "  cp $BACKUP_DIR/docker-compose.production.yml.backup-${TIMESTAMP} docker-compose.production.yml"
echo "  docker compose -f docker-compose.production.yml down"
echo "  docker compose -f docker-compose.production.yml up -d"
echo ""
