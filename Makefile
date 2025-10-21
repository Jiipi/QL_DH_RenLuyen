# Makefile for Student Activity Management System
# Quick commands for development and production

.PHONY: help dev prod deploy backup restore logs monitor clean test

# Default target
.DEFAULT_GOAL := help

# Variables
COMPOSE_DEV = docker-compose.yml
COMPOSE_PROD = docker-compose.prod.yml

## help: Show this help message
help:
	@echo "Student Activity Management System - Available Commands:"
	@echo ""
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'
	@echo ""

## dev: Start development environment
dev:
	@echo "🚀 Starting development environment..."
	docker-compose -f $(COMPOSE_DEV) --profile dev up -d
	@echo "✅ Development environment started!"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend:  http://localhost:3001"
	@echo "   Prisma Studio: http://localhost:5555"

## dev-logs: View development logs
dev-logs:
	docker-compose -f $(COMPOSE_DEV) --profile dev logs -f

## dev-down: Stop development environment
dev-down:
	docker-compose -f $(COMPOSE_DEV) --profile dev down

## prod: Start production environment (local testing)
prod:
	@echo "🚀 Starting production environment..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found!"; \
		echo "   Copy .env.production.example to .env and configure it"; \
		exit 1; \
	fi
	docker-compose -f $(COMPOSE_PROD) up -d --build
	@echo "✅ Production environment started!"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend:  http://localhost:3001"

## prod-logs: View production logs
prod-logs:
	docker-compose -f $(COMPOSE_PROD) logs -f

## prod-down: Stop production environment
prod-down:
	docker-compose -f $(COMPOSE_PROD) down

## deploy: Deploy to AWS (requires SSH access)
deploy:
	@if [ -z "$(EC2_HOST)" ]; then \
		echo "❌ EC2_HOST not set!"; \
		echo "   Usage: make deploy EC2_HOST=your-ec2-ip"; \
		exit 1; \
	fi
	@echo "🚀 Deploying to AWS EC2: $(EC2_HOST)..."
	@bash aws/scripts/manual-deploy.sh $(EC2_HOST)

## backup: Run backup on AWS
backup:
	@if [ -z "$(EC2_HOST)" ]; then \
		echo "❌ EC2_HOST not set!"; \
		echo "   Usage: make backup EC2_HOST=your-ec2-ip"; \
		exit 1; \
	fi
	@echo "📦 Running backup on $(EC2_HOST)..."
	@ssh -i student-app-key.pem ec2-user@$(EC2_HOST) "cd /home/ec2-user/student-app && ./aws/scripts/backup.sh"

## restore: Restore from backup on AWS
restore:
	@if [ -z "$(EC2_HOST)" ]; then \
		echo "❌ EC2_HOST not set!"; \
		echo "   Usage: make restore EC2_HOST=your-ec2-ip"; \
		exit 1; \
	fi
	@echo "🔄 Running restore on $(EC2_HOST)..."
	@ssh -i student-app-key.pem ec2-user@$(EC2_HOST) "cd /home/ec2-user/student-app && ./aws/scripts/restore.sh"

## logs: View production logs on AWS
logs:
	@if [ -z "$(EC2_HOST)" ]; then \
		echo "❌ EC2_HOST not set!"; \
		echo "   Usage: make logs EC2_HOST=your-ec2-ip"; \
		exit 1; \
	fi
	@ssh -i student-app-key.pem ec2-user@$(EC2_HOST) "cd /home/ec2-user/student-app && docker-compose -f docker-compose.prod.yml logs -f"

## monitor: View system monitor on AWS
monitor:
	@if [ -z "$(EC2_HOST)" ]; then \
		echo "❌ EC2_HOST not set!"; \
		echo "   Usage: make monitor EC2_HOST=your-ec2-ip"; \
		exit 1; \
	fi
	@ssh -i student-app-key.pem ec2-user@$(EC2_HOST) "cd /home/ec2-user/student-app && ./aws/scripts/monitor.sh"

## ssh: SSH into AWS EC2
ssh:
	@if [ -z "$(EC2_HOST)" ]; then \
		echo "❌ EC2_HOST not set!"; \
		echo "   Usage: make ssh EC2_HOST=your-ec2-ip"; \
		exit 1; \
	fi
	@ssh -i student-app-key.pem ec2-user@$(EC2_HOST)

## clean: Clean up Docker resources
clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker system prune -af
	@echo "✅ Cleanup completed!"

## clean-all: Clean up everything including volumes
clean-all:
	@echo "🧹 Cleaning up all Docker resources including volumes..."
	docker-compose -f $(COMPOSE_DEV) down -v
	docker-compose -f $(COMPOSE_PROD) down -v
	docker system prune -af --volumes
	@echo "✅ Deep cleanup completed!"

## test: Run tests
test:
	@echo "🧪 Running tests..."
	cd backend && npm test
	cd frontend && npm test
	@echo "✅ Tests completed!"

## migrate: Run database migrations (development)
migrate:
	@echo "📊 Running database migrations..."
	docker-compose -f $(COMPOSE_DEV) exec backend-dev npx prisma migrate dev
	@echo "✅ Migrations completed!"

## migrate-prod: Run database migrations (production)
migrate-prod:
	@echo "📊 Running database migrations (production)..."
	docker-compose -f $(COMPOSE_PROD) exec backend npx prisma migrate deploy
	@echo "✅ Migrations completed!"

## seed: Seed database with sample data
seed:
	@echo "🌱 Seeding database..."
	docker-compose -f $(COMPOSE_DEV) exec backend-dev node seed_complete_data.js
	@echo "✅ Database seeded!"

## studio: Open Prisma Studio
studio:
	@echo "🎨 Opening Prisma Studio..."
	@echo "   Access at: http://localhost:5555"
	docker-compose -f $(COMPOSE_DEV) up -d prisma-studio

## status: Show status of all services
status:
	@echo "📊 Development Environment:"
	@docker-compose -f $(COMPOSE_DEV) ps
	@echo ""
	@echo "📊 Production Environment:"
	@docker-compose -f $(COMPOSE_PROD) ps

## setup-aws: Setup AWS infrastructure
setup-aws:
	@echo "🏗️  Setting up AWS infrastructure..."
	@cd aws/scripts && chmod +x setup-aws.sh && ./setup-aws.sh

## env: Create .env file from example
env:
	@if [ -f .env ]; then \
		echo "⚠️  .env file already exists!"; \
		echo "   Remove it first if you want to recreate: rm .env"; \
	else \
		cp .env.production.example .env; \
		echo "✅ .env file created from example"; \
		echo "   Edit it with your configuration: nano .env"; \
	fi

## install: Install dependencies for both frontend and backend
install:
	@echo "📦 Installing backend dependencies..."
	cd backend && npm install
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ All dependencies installed!"

## build: Build Docker images
build:
	@echo "🏗️  Building Docker images..."
	docker-compose -f $(COMPOSE_PROD) build --no-cache
	@echo "✅ Build completed!"

## restart: Restart all services
restart:
	@echo "🔄 Restarting services..."
	docker-compose -f $(COMPOSE_PROD) restart
	@echo "✅ Services restarted!"

## health: Check health of all services
health:
	@echo "🏥 Checking service health..."
	@curl -f http://localhost:3001/api/health && echo "✅ Backend: Healthy" || echo "❌ Backend: Unhealthy"
	@curl -f http://localhost:3000 && echo "✅ Frontend: Healthy" || echo "❌ Frontend: Unhealthy"

## version: Show versions of all components
version:
	@echo "📋 Component Versions:"
	@echo "   Node:          $$(node --version)"
	@echo "   npm:           $$(npm --version)"
	@echo "   Docker:        $$(docker --version)"
	@echo "   Docker Compose: $$(docker-compose --version)"
	@echo "   AWS CLI:       $$(aws --version 2>&1 | head -n1)"
