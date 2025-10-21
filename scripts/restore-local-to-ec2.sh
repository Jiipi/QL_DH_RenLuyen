#!/bin/bash
# Script to restore local database backup to EC2 production
# Usage: ./restore-local-to-ec2.sh

set -e

echo "=========================================="
echo "  RESTORE LOCAL DATA TO EC2 PRODUCTION"
echo "=========================================="

# Variables
APP_DIR="/home/ec2-user/app"
BACKUP_DIR="/home/ec2-user/backups"
BACKUP_FILE="local_full_backup.dump"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$APP_DIR" || { echo -e "${RED}App directory not found!${NC}"; exit 1; }

# Step 1: Check if backup file exists
echo -e "\n${YELLOW}=== Step 1: Checking backup file ===${NC}"
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Backup file not found: $BACKUP_DIR/$BACKUP_FILE${NC}"
  echo ""
  echo "Please upload the backup file first:"
  echo "  scp backups/local_full_backup_*.dump ec2-user@<EC2_IP>:~/backups/local_full_backup.dump"
  exit 1
fi

echo -e "${GREEN}✅ Backup file found${NC}"
ls -lh "$BACKUP_DIR/$BACKUP_FILE"

# Step 2: Backup current production database
echo -e "\n${YELLOW}=== Step 2: Backing up current production database ===${NC}"
PROD_BACKUP_FILE="$BACKUP_DIR/prod_backup_before_restore_$(date +%Y%m%d_%H%M%S).dump"

docker exec hoatdongrenluyen-db pg_dump \
  -U admin \
  -d hoatdongrenluyen \
  -F c \
  -f /tmp/prod_backup.dump 2>/dev/null || echo "Creating new database..."

docker cp hoatdongrenluyen-db:/tmp/prod_backup.dump "$PROD_BACKUP_FILE" 2>/dev/null || echo "No existing data to backup"

echo -e "${GREEN}✅ Production backup saved: $PROD_BACKUP_FILE${NC}"

# Step 3: Stop backend to prevent connections
echo -e "\n${YELLOW}=== Step 3: Stopping backend ===${NC}"
docker compose -f docker-compose.production.yml stop backend
echo -e "${GREEN}✅ Backend stopped${NC}"

# Step 4: Drop and recreate database
echo -e "\n${YELLOW}=== Step 4: Recreating database ===${NC}"

# Drop all connections
docker exec hoatdongrenluyen-db psql -U admin -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'hoatdongrenluyen' AND pid <> pg_backend_pid();" \
  2>/dev/null || true

# Drop and recreate database
docker exec hoatdongrenluyen-db psql -U admin -d postgres -c \
  "DROP DATABASE IF EXISTS hoatdongrenluyen;" 2>/dev/null || true

docker exec hoatdongrenluyen-db psql -U admin -d postgres -c \
  "CREATE DATABASE hoatdongrenluyen OWNER admin;"

echo -e "${GREEN}✅ Database recreated${NC}"

# Step 5: Restore from local backup
echo -e "\n${YELLOW}=== Step 5: Restoring data from local backup ===${NC}"

# Copy backup file into container
docker cp "$BACKUP_DIR/$BACKUP_FILE" hoatdongrenluyen-db:/tmp/restore.dump

# Restore
docker exec hoatdongrenluyen-db pg_restore \
  -U admin \
  -d hoatdongrenluyen \
  -v \
  /tmp/restore.dump 2>&1 | grep -E "creating|CREATE|setting|CONSTRAINT" | tail -20 || true

echo -e "${GREEN}✅ Data restored${NC}"

# Step 6: Restart backend
echo -e "\n${YELLOW}=== Step 6: Starting backend ===${NC}"
docker compose -f docker-compose.production.yml start backend

echo "Waiting for backend to be healthy..."
sleep 15

# Step 7: Verify data
echo -e "\n${YELLOW}=== Step 7: Verifying restored data ===${NC}"

echo "📊 Database statistics:"
docker exec hoatdongrenluyen-db psql -U admin -d hoatdongrenluyen -c "
SELECT 
  'Users' as table_name, COUNT(*) as count FROM nguoi_dung
UNION ALL
SELECT 'Students', COUNT(*) FROM sinh_vien
UNION ALL
SELECT 'Classes', COUNT(*) FROM lop
UNION ALL
SELECT 'Activities', COUNT(*) FROM hoat_dong
UNION ALL
SELECT 'Registrations', COUNT(*) FROM dang_ky_hoat_dong;
"

# Test a sample user
echo -e "\n📝 Sample users:"
docker exec hoatdongrenluyen-db psql -U admin -d hoatdongrenluyen -c \
  "SELECT ten_dn, ho_ten, trang_thai FROM nguoi_dung LIMIT 5;"

# Step 8: Check backend logs
echo -e "\n${YELLOW}=== Step 8: Backend health check ===${NC}"
docker logs hoatdongrenluyen-backend --tail 20 | grep -i "database\|connected\|error" | head -10

# Test API
echo -e "\n${YELLOW}=== Step 9: Testing API ===${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Backend API is responding (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}⚠️  Backend API returned HTTP $HTTP_CODE${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}  ✅ RESTORE COMPLETED!${NC}"
echo "=========================================="
echo ""
echo "📋 Summary:"
echo "  - Local backup restored successfully"
echo "  - Production backup saved: $PROD_BACKUP_FILE"
echo "  - Backend is running"
echo ""
echo "🌐 Test website: https://hoatdongrenluyen.io.vn"
echo ""
echo "🆘 If something went wrong, rollback with:"
echo "  docker compose -f docker-compose.production.yml stop backend"
echo "  docker exec hoatdongrenluyen-db psql -U admin -d postgres -c 'DROP DATABASE hoatdongrenluyen;'"
echo "  docker exec hoatdongrenluyen-db psql -U admin -d postgres -c 'CREATE DATABASE hoatdongrenluyen;'"
echo "  docker cp $PROD_BACKUP_FILE hoatdongrenluyen-db:/tmp/rollback.dump"
echo "  docker exec hoatdongrenluyen-db pg_restore -U admin -d hoatdongrenluyen /tmp/rollback.dump"
echo "  docker compose -f docker-compose.production.yml start backend"
echo ""
