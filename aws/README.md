# 🚀 AWS Deployment Guide - Student Activity Management System

Complete guide for deploying the Student Activity Management System to AWS with automated CI/CD pipeline.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup Guide](#detailed-setup-guide)
4. [CI/CD Configuration](#cicd-configuration)
5. [Maintenance](#maintenance)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

---

## 🎯 Prerequisites

### Required Accounts & Tools

- **AWS Account** (Free tier available for 12 months)
- **GitHub Account** (for CI/CD automation)
- **AWS CLI** installed on your local machine
- **SSH Client** (built-in on Mac/Linux, use Git Bash on Windows)
- **Git** installed

### System Requirements

- **EC2 Instance**: t3.medium or higher (2 vCPU, 4GB RAM)
- **Storage**: Minimum 30GB EBS volume
- **OS**: Amazon Linux 2023
- **Network**: Public IP with ports 22, 80, 443, 3000, 3001 open

---

## ⚡ Quick Start (15 minutes)

### Step 1: Install AWS CLI

**Windows (PowerShell as Administrator):**
```powershell
winget install -e --id Amazon.AWSCLI
```

**Mac:**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

Verify installation:
```bash
aws --version
```

### Step 2: Configure AWS Credentials

1. **Create IAM User in AWS Console**
   - Go to AWS Console → IAM → Users → Create User
   - Username: `student-app-deployer`
   - Select: "Programmatic access"
   - Attach policies:
     - `AmazonEC2FullAccess`
     - `AmazonVPCFullAccess`
     - `IAMFullAccess` (for creating roles)
     - `AWSCloudFormationFullAccess`
   - Save the Access Key ID and Secret Access Key

2. **Configure AWS CLI:**
```bash
aws configure
```
Enter:
- AWS Access Key ID: `[Your Access Key]`
- AWS Secret Access Key: `[Your Secret Key]`
- Default region: `ap-southeast-1` (Singapore)
- Default output format: `json`

### Step 3: Deploy Infrastructure

```bash
cd aws/scripts
chmod +x setup-aws.sh
./setup-aws.sh
```

This will:
- Create EC2 key pair
- Deploy CloudFormation stack (VPC, Security Groups, EC2 instance)
- Configure Docker and Docker Compose on EC2
- Set up monitoring and backup scripts

**Save the output information:**
- Public IP address
- SSH command
- Application URLs

### Step 4: Deploy Application

1. **SSH into EC2 instance:**
```bash
ssh -i student-app-key.pem ec2-user@YOUR_PUBLIC_IP
```

2. **Clone your repository:**
```bash
cd /home/ec2-user/student-app
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

3. **Create environment file:**
```bash
nano .env
```

Add:
```env
# Database Configuration
DB_NAME=Web_QuanLyDiemRenLuyen
DB_USER=admin
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE

# JWT Configuration
JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_HERE
JWT_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://YOUR_PUBLIC_IP:3000

# Frontend Configuration
REACT_APP_API_URL=http://YOUR_PUBLIC_IP:3001/api
```

4. **Run deployment:**
```bash
chmod +x aws/scripts/deploy.sh
./aws/scripts/deploy.sh
```

5. **Access your application:**
- Frontend: `http://YOUR_PUBLIC_IP:3000`
- Backend API: `http://YOUR_PUBLIC_IP:3001/api`

---

## 📚 Detailed Setup Guide

### Infrastructure as Code (CloudFormation)

The `cloudformation/ec2-infrastructure.yml` creates:

- **VPC** with public subnet
- **Internet Gateway** for internet access
- **Security Groups** with proper firewall rules
- **EC2 Instance** with Docker pre-installed
- **Elastic IP** (static IP address)
- **IAM Roles** for CloudWatch and SSM

### Production Docker Configuration

The `docker-compose.prod.yml` includes:

- **PostgreSQL 15** with Alpine Linux (optimized)
- **Backend** (Node.js 18)
- **Frontend** (React with Nginx)
- **Health checks** for all services
- **Resource limits** to prevent memory issues
- **Automatic restarts** on failure

### Automation Scripts

| Script | Purpose | Frequency |
|--------|---------|-----------|
| `deploy.sh` | Deploy/update application | On-demand |
| `backup.sh` | Backup database & files | Daily (2 AM) |
| `restore.sh` | Restore from backup | On-demand |
| `monitor.sh` | System health monitoring | Hourly |
| `health-check.sh` | Auto-restart unhealthy services | Every 30 min |
| `setup-cron.sh` | Configure automated tasks | Once |

---

## 🔄 CI/CD Configuration

### GitHub Actions Setup

The CI/CD pipeline automatically deploys to AWS on every push to `main` branch.

#### Required GitHub Secrets

Go to: Repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | Your IAM access key | From IAM user |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret key | From IAM user |
| `AWS_REGION` | `ap-southeast-1` | Your AWS region |
| `EC2_HOST` | Your EC2 public IP | From CloudFormation output |
| `EC2_SSH_PRIVATE_KEY` | Contents of `.pem` file | Your EC2 key pair |
| `DB_PASSWORD` | Your database password | Strong password |
| `JWT_SECRET` | Your JWT secret | Random secure string |

#### Generate Strong Secrets

```bash
# Generate DB Password
openssl rand -base64 32

# Generate JWT Secret
openssl rand -base64 64
```

#### Pipeline Stages

1. **Build and Test**
   - Checkout code
   - Install dependencies
   - Run linters
   - Build frontend
   - Run tests

2. **Deploy**
   - Create deployment package
   - Upload to EC2
   - Stop old containers
   - Build new images
   - Start containers
   - Run migrations
   - Health checks

3. **Rollback** (on failure)
   - Restore previous version
   - Restart containers

### Manual Deployment

If you prefer manual deployment without CI/CD:

```bash
# From local machine
cd aws/scripts
./manual-deploy.sh YOUR_PUBLIC_IP
```

---

## 🛠️ Maintenance

### Daily Operations

#### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

#### Check Status
```bash
# Quick status
./aws/scripts/monitor.sh

# Container status
docker-compose -f docker-compose.prod.yml ps

# Resource usage
docker stats
```

#### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Backup & Restore

#### Manual Backup
```bash
./aws/scripts/backup.sh
```

Backups are stored in:
- Database: `/home/ec2-user/student-app/backups/database/`
- Files: `/home/ec2-user/student-app/backups/files/`

#### Restore from Backup
```bash
./aws/scripts/restore.sh
```

Follow the interactive prompts to select a backup.

#### Automated Backups

Configured via cron (runs automatically):
- Daily at 2:00 AM
- Weekly on Sunday at 3:00 AM
- Retention: 7 days for regular, 30 days for weekly

### Database Management

#### Access Database
```bash
docker-compose -f docker-compose.prod.yml exec db psql -U admin -d Web_QuanLyDiemRenLuyen
```

#### Run Migrations
```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

#### Database Size
```bash
docker-compose -f docker-compose.prod.yml exec db psql -U admin -d Web_QuanLyDiemRenLuyen -c \
  "SELECT pg_size_pretty(pg_database_size('Web_QuanLyDiemRenLuyen'));"
```

### Updates & Maintenance

#### Update Application
```bash
cd /home/ec2-user/student-app
git pull origin main
./aws/scripts/deploy.sh
```

#### Update System Packages
```bash
sudo dnf update -y
sudo reboot
```

#### Clean Docker Resources
```bash
# Remove unused images
docker image prune -a

# Full cleanup (caution!)
docker system prune -af --volumes
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Application Not Responding

**Symptom**: Can't access frontend or backend

**Solution**:
```bash
# Check if containers are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart

# If still failing, full rebuild
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 2. Database Connection Errors

**Symptom**: "Cannot connect to database"

**Solution**:
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Restart database
docker-compose -f docker-compose.prod.yml restart db
```

#### 3. Out of Disk Space

**Symptom**: "No space left on device"

**Solution**:
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -af --volumes

# Clean old logs
find /home/ec2-user/student-app/logs -name "*.log" -mtime +7 -delete

# Clean old backups
find /home/ec2-user/student-app/backups -name "*.sql.gz" -mtime +30 -delete
```

#### 4. High Memory Usage

**Symptom**: Server slow, containers crashing

**Solution**:
```bash
# Check memory
free -h

# Check container usage
docker stats

# Restart containers to free memory
docker-compose -f docker-compose.prod.yml restart

# If persistent, upgrade instance type
```

#### 5. SSL/HTTPS Issues

**Symptom**: Need HTTPS support

**Solution**: Use Cloudflare Tunnel (free) or Let's Encrypt:

**Option A: Cloudflare Tunnel (Recommended)**
```bash
# Install cloudflared
docker run -d \
  --name cloudflared \
  --restart unless-stopped \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run --token YOUR_TOKEN
```

**Option B: Let's Encrypt**
```bash
# Install certbot
sudo dnf install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d your-domain.com
```

### Health Check Commands

```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend health
curl http://localhost:3000

# Database health
docker-compose -f docker-compose.prod.yml exec db pg_isready

# All services
./aws/scripts/monitor.sh
```

### Logs Locations

- Application logs: `/home/ec2-user/student-app/logs/`
- Docker logs: `docker-compose -f docker-compose.prod.yml logs`
- System logs: `/var/log/`
- Cron logs: `/home/ec2-user/student-app/logs/backup.log`

---

## 🔒 Security Best Practices

### 1. Access Control

```bash
# Change SSH port (optional but recommended)
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Disable password authentication
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Update Security Group in AWS Console to new port
```

### 2. Firewall Configuration

```bash
# Enable firewall
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### 3. Regular Updates

```bash
# Auto-update security patches
sudo dnf install dnf-automatic -y
sudo systemctl enable --now dnf-automatic.timer
```

### 4. Monitoring & Alerts

Set up CloudWatch alarms:
- CPU usage > 80%
- Memory usage > 80%
- Disk usage > 85%
- Application health checks

### 5. Backup Verification

```bash
# Test restore monthly
./aws/scripts/restore.sh --quick-db

# Verify backup integrity
gzip -t /home/ec2-user/student-app/backups/database/*.sql.gz
```

### 6. Secret Management

- Never commit `.env` files
- Rotate passwords quarterly
- Use AWS Secrets Manager for production
- Enable MFA on AWS account

### 7. Database Security

```bash
# Change default database password
docker-compose -f docker-compose.prod.yml exec db psql -U admin -d Web_QuanLyDiemRenLuyen
ALTER USER admin WITH PASSWORD 'new_secure_password';
```

Update `.env` file with new password.

---

## 📊 Monitoring & Performance

### CloudWatch Integration

The EC2 instance has CloudWatch agent configured. View metrics in AWS Console:
- CPU Utilization
- Memory Usage
- Disk I/O
- Network Traffic

### Custom Monitoring

```bash
# Real-time monitoring
watch -n 5 ./aws/scripts/monitor.sh

# Performance testing
ab -n 1000 -c 10 http://YOUR_IP:3001/api/health
```

---

## 🚀 Scaling & Optimization

### Vertical Scaling (Bigger Instance)

1. Stop application:
```bash
docker-compose -f docker-compose.prod.yml down
```

2. In AWS Console:
   - Stop EC2 instance
   - Actions → Instance Settings → Change Instance Type
   - Select larger type (e.g., t3.large)
   - Start instance

3. Restart application

### Performance Optimization

```bash
# Enable Nginx caching (frontend)
# Add Redis for session management
# Use CDN for static assets
# Database query optimization
```

---

## 📞 Support & Resources

### Useful Commands Cheatsheet

```bash
# Deploy
./aws/scripts/deploy.sh

# Backup
./aws/scripts/backup.sh

# Restore
./aws/scripts/restore.sh

# Monitor
./aws/scripts/monitor.sh

# Setup cron
./aws/scripts/setup-cron.sh

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart
docker-compose -f docker-compose.prod.yml restart

# Stop
docker-compose -f docker-compose.prod.yml down

# Start
docker-compose -f docker-compose.prod.yml up -d
```

### Additional Resources

- [AWS Documentation](https://docs.aws.amazon.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [React Documentation](https://react.dev/)

---

## 🎉 Success!

Your Student Activity Management System is now running on AWS with:

✅ Automated CI/CD pipeline  
✅ Daily automated backups  
✅ Health monitoring  
✅ Auto-restart on failures  
✅ Production-ready infrastructure  
✅ Security best practices  

**Next Steps:**
1. Configure custom domain (optional)
2. Set up SSL/HTTPS
3. Configure email notifications
4. Set up CloudWatch alarms
5. Perform load testing

---

**Created by:** AWS Deployment Automation System  
**Version:** 1.0.0  
**Last Updated:** 2024
