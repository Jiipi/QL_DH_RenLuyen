const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

const config = require('./config/app');
const { connectDB, disconnectDB } = require('./config/database');
const corsMw = require('./middlewares/cors');
const notFound = require('./middlewares/notFound');
const error = require('./middlewares/error');
const routes = require('./routes');
const { logInfo, logError } = require('./utils/logger');
const autoPointCalculationService = require('./services/auto-point-calculation.service');

const app = express();

// CORS middleware - phải được đặt trước tất cả routes
app.use(corsMw);

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  ...config.rateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.user?.sub || 'anon'}`,
  skip: (req) => {
    // Skip rate limiting for demo accounts endpoint
    return req.path === '/api/auth/demo-accounts';
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logInfo(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Serve uploaded files statically with CORS enabled
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', corsMw, express.static(uploadsPath, {
  setHeaders: (res, path) => {
    // Add CORS headers for all uploaded files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Set proper cache headers
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// Serve frontend build (single-process deployment)
try {
  // In container, we copy built frontend to /app/frontend/build
  const frontendBuildPath = path.resolve(__dirname, '../../frontend/build');
  if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
  }
} catch (e) {
  // ignore if build not present
}

// 404 handler
app.use(notFound);

// Error handler
app.use(error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('SIGTERM received, shutting down gracefully');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logInfo('SIGINT received, shutting down gracefully');
  await disconnectDB();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize auto point calculation scheduler if available
    try {
      if (autoPointCalculationService && typeof autoPointCalculationService.init === 'function') {
        autoPointCalculationService.init();
      } else {
        logInfo('Auto point calculation service disabled (no-op)');
      }
    } catch (e) {
      logError('Auto point calculation init failed (continuing without it)', e);
    }
    
    // Start listening
    app.listen(config.port, () => {
      logInfo(`🚀 Server started successfully`, {
        port: config.port,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logError('Failed to start server', error);
    process.exit(1);
  }
};

startServer();