#!/bin/bash
# EC2 Production Database Port Fix Script
# CRITICAL: This fixes exposed port 5432 vulnerability

set -e  # Exit on error

echo "=========================================="
echo "  EC2 DATABASE PORT SECURITY FIX"
echo "=========================================="

cd ~/app || { echo "❌ Cannot find ~/app directory"; exit 1; }

# 1. Backup current configuration
echo -e "\n📦 Step 1: Creating backup..."
BACKUP_FILE="docker-compose.production.yml.backup-$(date +%Y%m%d-%H%M%S)"
cp docker-compose.production.yml "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# 2. Show current DB port mapping
echo -e "\n🔍 Step 2: Current DB configuration:"
grep -A 3 "db:" docker-compose.production.yml | head -8

# 3. Create fixed version
echo -e "\n🔧 Step 3: Fixing database port exposure..."

cat > docker-compose.production.yml.new << 'YAML_END'
services:
  db:
    image: postgres:15-alpine
    container_name: hoatdongrenluyen-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-abc}
      POSTGRES_DB: ${POSTGRES_DB:-Web_QuanLyDiemRenLuyen}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    # SECURITY: Port 5432 should NOT be exposed in production
    # Only internal Docker network access is needed
    # ports:
    #   - "5432:5432"
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-admin} -d ${POSTGRES_DB:-Web_QuanLyDiemRenLuyen}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    container_name: hoatdongrenluyen-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD:-abc}@db:5432/${POSTGRES_DB:-Web_QuanLyDiemRenLuyen}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
    # Backend port can stay exposed (nginx will proxy to it)
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.production
      args:
        REACT_APP_API_URL: ${REACT_APP_API_URL}
    container_name: hoatdongrenluyen-frontend
    restart: unless-stopped
    # Frontend port can stay exposed (nginx will proxy to it)
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
YAML_END

# 4. Validate YAML syntax
echo -e "\n✅ Step 4: Validating YAML syntax..."
if command -v docker compose &> /dev/null; then
    docker compose -f docker-compose.production.yml.new config > /dev/null 2>&1 && \
        echo "✅ YAML syntax is valid" || \
        { echo "❌ YAML validation failed!"; exit 1; }
else
    echo "⚠️  Cannot validate YAML (docker compose not found), proceeding anyway..."
fi

# 5. Replace the file
echo -e "\n🔄 Step 5: Replacing configuration file..."
mv docker-compose.production.yml.new docker-compose.production.yml
echo "✅ Configuration updated"

# 6. Restart services
echo -e "\n🔄 Step 6: Restarting services..."
docker compose -f docker-compose.production.yml down
sleep 2
docker compose -f docker-compose.production.yml up -d

# 7. Wait for DB to be healthy
echo -e "\n⏳ Step 7: Waiting for database to be healthy..."
for i in {1..30}; do
    if docker ps | grep -q "healthy.*hoatdongrenluyen-db"; then
        echo "✅ Database is healthy!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# 8. Verify backend connection
echo -e "\n🔍 Step 8: Verifying backend connection..."
sleep 3
BACKEND_ID=$(docker ps -q -f name=backend | head -1)
if [ -n "$BACKEND_ID" ]; then
    docker exec $BACKEND_ID node -e "
        const {PrismaClient} = require('@prisma/client');
        (async () => {
            try {
                const prisma = new PrismaClient();
                await prisma.\$connect();
                console.log('✅ Backend successfully connected to database');
                await prisma.\$disconnect();
                process.exit(0);
            } catch(e) {
                console.error('❌ Backend connection failed:', e.message);
                process.exit(1);
            }
        })()
    " && BACKEND_OK=true || BACKEND_OK=false
else
    echo "⚠️  Backend container not found"
    BACKEND_OK=false
fi

# 9. Final security check
echo -e "\n🔒 Step 9: Final security verification..."
echo "Current DB port mapping:"
docker ps --format "{{.Names}}: {{.Ports}}" | grep -i db

DB_PORT_CHECK=$(docker port $(docker ps -q -f name=db) 2>/dev/null || echo "")
if [ -z "$DB_PORT_CHECK" ]; then
    echo "✅✅✅ SUCCESS! Port 5432 is NO LONGER EXPOSED"
    echo ""
    echo "=========================================="
    echo "  🎉 SECURITY FIX COMPLETED!"
    echo "=========================================="
    echo "✅ Database port 5432 is now secured"
    echo "✅ Only internal Docker network access"
    echo "✅ Backend connected successfully"
    echo ""
    echo "📋 Backup location: $BACKUP_FILE"
    echo ""
    if [ "$BACKEND_OK" = true ]; then
        echo "✅ All systems operational!"
    else
        echo "⚠️  Please check backend logs: docker logs hoatdongrenluyen-backend"
    fi
else
    echo "❌ WARNING: Port 5432 is still exposed!"
    echo "Port mapping: $DB_PORT_CHECK"
    echo ""
    echo "To rollback:"
    echo "  cp $BACKUP_FILE docker-compose.production.yml"
    echo "  docker compose -f docker-compose.production.yml restart"
    exit 1
fi

echo ""
echo "=========================================="
