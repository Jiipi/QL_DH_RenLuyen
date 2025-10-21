const cors = require('cors');

/**
 * Parse CORS_ORIGIN environment variable
 * Supports: single origin, comma-separated list, or wildcard
 */
function getAllowedOrigins() {
  const envOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  
  // Wildcard: allow all origins (use carefully!)
  if (envOrigin === '*' || envOrigin === 'true') {
    return true;
  }
  
  // Comma-separated list: "http://localhost:3000,http://192.168.1.100:3000"
  if (envOrigin.includes(',')) {
    return envOrigin.split(',').map(o => o.trim()).filter(Boolean);
  }
  
  // Single origin
  return envOrigin;
}

// CORS configuration with flexible origin handling
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Development: allow all origins for easier testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CORS] Dev mode - allowing origin: ${origin || '(no origin)'}`);
      return callback(null, true);
    }
    
    // Production: check against whitelist
    if (allowedOrigins === true) {
      return callback(null, true);
    }
    
    // No origin (same-origin request or server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // Array of allowed origins
    if (Array.isArray(allowedOrigins)) {
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      console.warn(`[CORS] Rejected origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // Single allowed origin
    if (origin === allowedOrigins) {
      return callback(null, true);
    }
    
    console.warn(`[CORS] Rejected origin: ${origin}. Expected: ${allowedOrigins}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'X-Tab-Id'],
  exposedHeaders: ['X-Tab-Id'],
  optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);