#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] Starting container (PID $$)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

echo "[entrypoint] Waiting for database..."
ATTEMPTS=0
until node -e "const {Client}=require('pg');(async()=>{try{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.end();process.exit(0)}catch(e){process.exit(1)}})()"; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [ "$ATTEMPTS" -gt 60 ]; then
    echo "[entrypoint] ERROR: Database not reachable after 60 attempts" >&2
    exit 1
  fi
  echo "[entrypoint] Database not ready yet, retrying... ($ATTEMPTS)"
  sleep 2
done

echo "[entrypoint] Running prisma migrate deploy..."
npx prisma migrate deploy

if [ -f prisma/seed.js ]; then
  echo "[entrypoint] Seeding database (ignore errors if already seeded)..."
  node prisma/seed.js || echo "[entrypoint] Seed script exited non-zero (probably already seeded)"
fi

echo "[entrypoint] Launching: $*"
exec "$@"
