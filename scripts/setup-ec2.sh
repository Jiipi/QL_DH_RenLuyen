#!/bin/bash
# Script cài đặt môi trường trên EC2 Ubuntu
# Chạy với quyền sudo: sudo bash setup-ec2.sh

set -e

echo "======================================"
echo "Installing Node.js 18.x LTS..."
echo "======================================"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "======================================"
echo "Installing Docker..."
echo "======================================"
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

echo "======================================"
echo "Installing Docker Compose..."
echo "======================================"
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "======================================"
echo "Installing Nginx..."
echo "======================================"
sudo apt-get install -y nginx certbot python3-certbot-nginx

echo "======================================"
echo "Adding ubuntu user to docker group..."
echo "======================================"
sudo usermod -aG docker ubuntu

echo "======================================"
echo "Creating deployment directory..."
echo "======================================"
sudo mkdir -p /var/www/hoatdongrenluyen
sudo chown -R ubuntu:ubuntu /var/www/hoatdongrenluyen

echo "======================================"
echo "Setup GitHub deployment key..."
echo "======================================"
echo "1. Generate SSH key on EC2:"
echo "   ssh-keygen -t ed25519 -C 'deploy@hoatdongrenluyen.io.vn' -f ~/.ssh/github_deploy"
echo ""
echo "2. Add public key to GitHub:"
echo "   cat ~/.ssh/github_deploy.pub"
echo "   Go to: GitHub Repo > Settings > Deploy keys > Add deploy key"
echo ""
echo "3. Configure SSH:"
echo "   Add to ~/.ssh/config:"
echo "   Host github.com"
echo "     HostName github.com"
echo "     User git"
echo "     IdentityFile ~/.ssh/github_deploy"
echo ""

echo "======================================"
echo "✅ Setup completed!"
echo "======================================"
echo "Next steps:"
echo "1. Setup SSH keys for GitHub"
echo "2. Configure domain DNS"
echo "3. Setup webhook for auto-deployment"
echo "4. Run initial deployment"
