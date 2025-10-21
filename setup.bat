@echo off
setlocal EnableDelayedExpansion

REM Simple setup helper for this project (Windows)
REM Usage: double-click or run: setup.bat

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend

echo ======================================================
echo  DACN - One-time Setup and Dev Runner (Windows)
echo ======================================================
echo.
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Please install Node.js LTS first: https://nodejs.org/
  goto :end
)

echo Select an action:
echo   1^) Full setup (install deps, migrate, seed)
echo   2^) Start dev servers (backend + frontend)
echo   3^) Open Prisma Studio
echo   4^) Start Postgres via docker-compose (db only)
echo   5^) Docker One-Click Setup (dev + optional restore)
echo   6^) Backup current DB to data\db.dump
echo   0^) Exit
set /p _choice=Enter number [1/2/3/4/5/6/0]: 

if "%_choice%"=="1" goto :full_setup
if "%_choice%"=="2" goto :start_dev
if "%_choice%"=="3" goto :studio
if "%_choice%"=="4" goto :db_up
if "%_choice%"=="5" goto :docker_one_click
if "%_choice%"=="6" goto :backup_db
goto :end

:full_setup
  echo --- Installing backend dependencies ---
  pushd "%BACKEND_DIR%"
    if exist package-lock.json (
      call npm ci || goto :fail
    ) else (
      call npm install || goto :fail
    )
    echo --- Generating Prisma client ---
    call npx prisma generate || goto :fail
    echo --- Applying migrations ---
    call npx prisma migrate deploy || goto :fail
    if exist prisma\seed.js (
      echo --- Seeding database (prisma/seed.js) ---
      node prisma\seed.js || echo [WARN] seed.js failed/skipped
    )
  popd

  echo --- Installing frontend dependencies ---
  pushd "%FRONTEND_DIR%"
    if exist package-lock.json (
      call npm ci || goto :fail
    ) else (
      call npm install || goto :fail
    )
  popd

  echo [OK] Setup completed.
  goto :end

:start_dev
  echo --- Starting backend (dev) in new window ---
  pushd "%BACKEND_DIR%"
    REM Prefer npm run dev if available else start
    findstr /i /r "\"dev\"[ \t]*:" package.json >nul 2>nul
    if not errorlevel 1 (
      start "backend:dev" cmd /k "cd /d %BACKEND_DIR% && npm run dev"
    ) else (
      start "backend:start" cmd /k "cd /d %BACKEND_DIR% && npm start"
    )
  popd

  echo --- Starting frontend (dev) in new window ---
  start "frontend:start" cmd /k "cd /d %FRONTEND_DIR% && npm start"
  goto :end

:studio
  echo --- Opening Prisma Studio on an available port ---
  pushd "%BACKEND_DIR%"
    REM Try 5555 then 5556
    call npx prisma studio --schema prisma\schema.prisma --port 5555 || ^
    call npx prisma studio --schema prisma\schema.prisma --port 5556
  popd
  goto :end

:db_up
  if exist "%ROOT_DIR%docker-compose.yml" (
    echo --- Starting only the database service via docker-compose ---
    pushd "%ROOT_DIR%"
      docker compose up -d db || docker-compose up -d db
    popd
  ) else (
    echo [WARN] docker-compose.yml not found at project root. Skipping.
  )
  goto :end

:docker_one_click
  echo --- Starting Docker dev stack (db + backend-dev + frontend-dev + prisma-studio) ---
  pushd "%ROOT_DIR%"
    docker compose --profile dev up -d || goto :fail
  popd

  REM Optional: auto-restore DB if .\data\db.dump exists
  if exist "%ROOT_DIR%data\db.dump" (
    echo --- Found data\db.dump. Restoring into DB container ---
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%scripts\restore-db.ps1" -Input "%ROOT_DIR%data\db.dump" || echo [WARN] Restore failed or skipped.
  ) else (
    echo [INFO] No data\db.dump found. Skipping restore. You can place a dump file at data\db.dump and rerun this.
  )

  echo --- Verifying services ---
  docker compose ps
  echo --- Opening URLs ---
  start http://localhost:3001/health
  start http://localhost:5555
  start http://localhost:3000
  goto :end

:backup_db
  if not exist "%ROOT_DIR%data" (
    mkdir "%ROOT_DIR%data" >nul 2>nul
  )
  echo --- Ensuring DB service is running ---
  pushd "%ROOT_DIR%"
    docker compose up -d db || docker-compose up -d db
  popd
  echo --- Backing up DB to data\db.dump ---
  powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%scripts\backup-db.ps1" -Output "%ROOT_DIR%data\db.dump" || goto :fail
  for %%I in ("%ROOT_DIR%data\db.dump") do set _dbsize=%%~zI
  echo [OK] Backup created at data\db.dump (%%_dbsize%% bytes)
  goto :end

:fail
  echo.
  echo [ERROR] A step failed. Please scroll up for details.
  goto :end

:end
endlocal
exit /b 0


