/**
 * Application layer exports
 * This layer orchestrates domain logic and handles input/output
 */

// DTOs
export * from './dtos/index.js';

// Use Cases
export * from './use-cases/index.js';

// Services
export * from './services/NotificationPreferences.service.js';

// Application constants
export const APPLICATION_CONSTANTS = {
  // API configuration
  API_PREFIX: '/api/v1',
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  
  // Rate limiting (requests per minute)
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Cache TTLs (in milliseconds)
  CACHE_TTL: {
    USER_PREFERENCES: 5 * 60 * 1000, // 5 minutes
    GLOBAL_POLICIES: 10 * 60 * 1000, // 10 minutes
    DEFAULT_PREFERENCES: 60 * 60 * 1000, // 1 hour
  },
  
  // Validation limits
  VALIDATION_LIMITS: {
    USER_ID_MAX_LENGTH: 100,
    POLICY_DESCRIPTION_MAX_LENGTH: 500,
    QUIET_HOURS_DAYS_MAX: 7,
  },
  
  // Supported API versions
  SUPPORTED_API_VERSIONS: ['v1'],
  
  // Feature flags (could be moved to environment variables)
  FEATURE_FLAGS: {
    ENABLE_BATCH_EVALUATION: true,
    ENABLE_POLICY_MANAGEMENT: true,
    ENABLE_QUIET_HOURS: true,
    ENABLE_METRICS: true,
  }
} as const;