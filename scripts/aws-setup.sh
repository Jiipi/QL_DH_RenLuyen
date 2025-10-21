#!/bin/bash
# Script tự động cài đặt môi trường trên EC2 Ubuntu 22.04
# Chạy trên server sau khi SSH vào lần đầu

set -e

echo "=========================================="
echo "🚀 AWS EC2 Setup Script"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Please run as regular user (ubuntu), not root!"
   exit 1
fi

# Update system
echo "📦 1. Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Install Docker
echo "📦 2. Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update -qq
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    echo "   ✅ Docker installed: $(docker --version)"
else
    echo "   ✅ Docker already installed: $(docker --version)"
fi

# Install Docker Compose
echo "📦 3. Verifying Docker Compose..."
if docker compose version &> /dev/null; then
    echo "   ✅ Docker Compose installed: $(docker compose version)"
else
    echo "   ❌ Docker Compose not found!"
    exit 1
fi

# Install Nginx
echo "📦 4. Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    echo "   ✅ Nginx installed: $(nginx -v 2>&1)"
else
    echo "   ✅ Nginx already installed: $(nginx -v 2>&1)"
fi

# Install Git
echo "📦 5. Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
    echo "   ✅ Git installed: $(git --version)"
else
    echo "   ✅ Git already installed: $(git --version)"
fi

# Install useful tools
echo "📦 6. Installing additional tools..."
sudo apt-get install -y htop curl wget unzip vim net-tools

# Install Certbot for SSL
echo "📦 7. Installing Certbot for Let's Encrypt SSL..."
if ! command -v certbot &> /dev/null; then
    sudo apt-get install -y certbot python3-certbot-nginx
    echo "   ✅ Certbot installed: $(certbot --version)"
else
    echo "   ✅ Certbot already installed: $(certbot --version)"
fi

# Create directory structure
echo "📦 8. Creating directory structure..."
mkdir -p ~/dacn-web/backups
mkdir -p ~/dacn-web/data
echo "   ✅ Directories created:"
echo "      - ~/dacn-web"
echo "      - ~/dacn-web/backups"
echo "      - ~/dacn-web/data"

# Configure firewall (UFW)
echo "📦 9. Configuring firewall (UFW)..."
if ! sudo ufw status | grep -q "Status: active"; then
    sudo ufw --force enable
fi
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
echo "   ✅ UFW configured"

# Setup swap (if not exists and RAM < 4GB)
echo "📦 10. Checking swap space..."
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 4096 ] && [ ! -f /swapfile ]; then
    echo "   Creating 2GB swap file (RAM < 4GB)..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "   ✅ Swap created: 2GB"
else
    echo "   ✅ Swap OK or RAM sufficient"
fi

# Create backup script
echo "📦 11. Creating backup script..."
cat > ~/backup-database.sh << 'EOFBACKUP'
#!/bin/bash
set -e

BACKUP_DIR="$HOME/dacn-web/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.dump"

echo "Starting backup at $DATE"

cd "$HOME/dacn-web/app" || exit 1

# Create backup inside container
docker compose exec -T db pg_dump -U admin -d Web_QuanLyDiemRenLuyen -Fc > "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE"

# Keep only last 7 backups
cd "$BACKUP_DIR"
ls -t db_backup_*.dump | tail -n +8 | xargs -r rm

echo "Cleanup old backups done"
EOFBACKUP

chmod +x ~/backup-database.sh
echo "   ✅ Backup script created: ~/backup-database.sh"

# Setup cron for daily backups (2 AM)
echo "📦 12. Setting up cron job for daily backups..."
(crontab -l 2>/dev/null || true; echo "0 2 * * * $HOME/backup-database.sh >> $HOME/backup.log 2>&1") | crontab -
echo "   ✅ Cron job added: Daily backup at 2 AM"

# Create health check script
echo "📦 13. Creating health check script..."
cat > ~/check-health.sh << 'EOFHEALTH'
#!/bin/bash

echo "=========================================="
echo "🏥 System Health Check"
echo "=========================================="
echo ""

echo "📊 Disk Usage:"
df -h / | tail -1 | awk '{print "   Used: "$3" / "$2" ("$5")"}'

echo ""
echo "💾 Memory Usage:"
free -h | grep Mem | awk '{print "   Used: "$3" / "$2" ("$3/$2*100"%)"}'

echo ""
echo "🐳 Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "   Docker not running"

echo ""
echo "🌐 Nginx Status:"
sudo systemctl is-active nginx >/dev/null 2>&1 && echo "   ✅ Running" || echo "   ❌ Stopped"

echo ""
echo "🔥 SSL Certificate Expiry:"
if [ -d "/etc/letsencrypt/live" ]; then
    DOMAINS=$(sudo ls /etc/letsencrypt/live 2>/dev/null | grep -v README)
    if [ -n "$DOMAINS" ]; then
        for DOMAIN in $DOMAINS; do
            EXPIRY=$(sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/cert.pem 2>/dev/null | cut -d= -f2)
            echo "   $DOMAIN: $EXPIRY"
        done
    else
        echo "   No certificates found"
    fi
else
    echo "   No SSL certificates installed"
fi

echo ""
echo "=========================================="
EOFHEALTH

chmod +x ~/check-health.sh
echo "   ✅ Health check script created: ~/check-health.sh"

# Enable Docker service
echo "📦 14. Enabling Docker service..."
sudo systemctl enable docker

# Summary
echo ""
echo "=========================================="
echo "✅ SETUP COMPLETED!"
echo "=========================================="
echo ""
echo "📌 Installed Software:"
echo "   - Docker: $(docker --version)"
echo "   - Docker Compose: $(docker compose version)"
echo "   - Nginx: $(nginx -v 2>&1)"
echo "   - Git: $(git --version)"
echo "   - Certbot: $(certbot --version)"
echo ""
echo "📁 Directory Structure:"
echo "   - ~/dacn-web (main directory)"
echo "   - ~/dacn-web/backups (for database backups)"
echo "   - ~/dacn-web/data (for additional data)"
echo ""
echo "🛠️  Helper Scripts:"
echo "   - ~/backup-database.sh (manual backup)"
echo "   - ~/check-health.sh (system health check)"
echo ""
echo "⏰ Cron Jobs:"
echo "   - Daily backup at 2:00 AM"
echo ""
echo "🔥 Firewall (UFW):"
echo "   - Port 22 (SSH): Open"
echo "   - Port 80 (HTTP): Open"
echo "   - Port 443 (HTTPS): Open"
echo ""
echo "📌 Next Steps:"
echo "   1. Logout và login lại để apply docker group: exit"
echo "   2. Upload deployment files bằng WinSCP"
echo "   3. Clone repository: cd ~/dacn-web && git clone <repo-url> app"
echo "   4. Tạo .env files"
echo "   5. Xem: AWS_DEPLOYMENT_GUIDE.md để biết chi tiết"
echo ""
echo "⚠️  IMPORTANT: Logout and login again for Docker permissions!"
echo "=========================================="
