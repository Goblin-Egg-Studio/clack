// Production configuration for Clack Chat
module.exports = {
  // Server configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  
  // Database
  database: {
    url: process.env.DATABASE_URL || './chat.db'
  },
  
  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: '7d'
  },
  
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'https://your-domain.com',
    credentials: true
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // SSE Configuration
  sse: {
    heartbeatInterval: parseInt(process.env.SSE_HEARTBEAT_INTERVAL) || 30000,
    reconnectDelay: parseInt(process.env.SSE_RECONNECT_DELAY) || 5000
  }
};
