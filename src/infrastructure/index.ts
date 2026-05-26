/**
 * Infrastructure layer exports
 * This layer contains external adapters and frameworks
 */

// Database
export * from './database/connection.js';
export * from './database/models/index.js';
export * from './database/repositories/index.js';

// API
export * from './api/app.js';
export * from './api/controllers/UserPreferences.controller.js';
export * from './api/controllers/GlobalPolicies.controller.js';

// Infrastructure constants
export const INFRASTRUCTURE_CONSTANTS = {
  // Server configuration
  SERVER: {
    PORT: parseInt(process.env.PORT || '3000'),
    HOST: process.env.HOST || '0.0.0.0',
    NODE_ENV: process.env.NODE_ENV || 'development'
  },
  
  // Database configuration
  DATABASE: {
    MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT || '30000')
  },
  
  // Logging configuration
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    FORMAT: process.env.LOG_FORMAT || 'combined'
  },
  
  // Security configuration
  SECURITY: {
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100')
  }
} as const;