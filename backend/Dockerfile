# ----- Base image for building (Node + tools) -----
FROM node:18-alpine AS base
WORKDIR /app

# Install OS dependencies needed by Prisma and building
RUN apk add --no-cache \
     openssl \
     bash \
     curl \
     git \
     libc6-compat

# ----- Install backend deps -----
FROM base AS backend_deps
WORKDIR /app/backend
COPY ./backend/package.json ./backend/package-lock.json ./
RUN npm ci

# We need prisma at build time to generate client
RUN npm install --no-save prisma@latest pg

# Copy backend source and Prisma files
COPY ./backend/prisma ./prisma
COPY ./backend/src ./src

# Generate Prisma Client with retry on failure
RUN npx prisma generate || npx prisma generate

# ----- Build frontend -----
FROM base AS frontend_build
WORKDIR /app/frontend
# Optional cache-buster to force rebuild of the frontend layer only
ARG FRONTEND_BUILD_ID
ENV FRONTEND_BUILD_ID=${FRONTEND_BUILD_ID}
COPY ./frontend/package.json ./frontend/package-lock.json ./
RUN npm install
COPY ./frontend/ ./
RUN npm run build

# ----- Runtime image -----
FROM node:18-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend

# Install minimal OS deps for Prisma engines
RUN apk add --no-cache \
     openssl \
     bash \
     libc6-compat

# Copy backend runtime files from build stage
COPY --from=backend_deps /app/backend ./

# Copy frontend build to expected path so Express can serve it
COPY --from=frontend_build /app/frontend/build ../frontend/build

# Add entrypoint script
COPY ./backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]


