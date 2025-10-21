# DACN Web Quan Ly Hoat Dong Ren Luyen - Development Quick Start
# Script nay khoi dong toan bo he thong development voi tat ca services can thiet

param(
    [switch]$Recreate,
    [switch]$Build
)

Write-Host "Starting DACN Development Environment..." -ForegroundColor Green

# Stop existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker compose down

if ($Recreate) {
    Write-Host "Recreating containers..." -ForegroundColor Yellow
    docker compose --profile dev up -d --force-recreate db prisma-studio backend-dev frontend-dev
}
elseif ($Build) {
    Write-Host "Building and starting containers..." -ForegroundColor Yellow
    docker compose --profile dev up -d --build db prisma-studio backend-dev frontend-dev
}
else {
    Write-Host "Starting containers..." -ForegroundColor Yellow
    docker compose --profile dev up -d db prisma-studio backend-dev frontend-dev
}

# Wait a moment for services to initialize
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check container status
Write-Host "Container Status:" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "Development Environment Started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Database: localhost:5432 (PostgreSQL)" -ForegroundColor Cyan
Write-Host "Prisma Studio: http://localhost:5555" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view logs: docker compose logs -f [service-name]" -ForegroundColor Yellow
Write-Host "To stop: docker compose down" -ForegroundColor Yellow
Write-Host ""
