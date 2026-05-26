/**
 * Domain layer exports
 * This is the core business logic of the Notification Preferences Service
 */

// Types
export * from './types.js';

// Entities
export * from './entities/UserPreferences.entity.js';
export * from './entities/GlobalPolicy.entity.js';

// Services
export * from './services/NotificationEvaluator.service.js';
export * from './services/DefaultPreferences.service.js';

// Exceptions
export * from './exceptions/index.js';

// Domain constants
export const DOMAIN_CONSTANTS = {
  // Default quiet hours (22:00 to 08:00)
  DEFAULT_QUIET_HOURS: {
    start: { hour: 22, minute: 0 },
    end: { hour: 8, minute: 0 }
  },
  
  // Maximum number of preferences per user
  MAX_PREFERENCES_PER_USER: 100,
  
  // Maximum number of global policies
  MAX_GLOBAL_POLICIES: 1000,
  
  // Supported timezones (common ones)
  SUPPORTED_TIMEZONES: [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'Pacific/Auckland'
  ],
  
  // Notification type categories
  NOTIFICATION_CATEGORIES: {
    TRANSACTIONAL: ['transactional_email', 'transactional_sms', 'transactional_push'],
    MARKETING: ['marketing_email', 'marketing_sms', 'marketing_push'],
    SECURITY: ['security_alert'],
    SYSTEM: ['system_notification']
  },
  
  // Channel capabilities
  CHANNEL_CAPABILITIES: {
    email: ['transactional_email', 'marketing_email', 'security_alert'],
    sms: ['transactional_sms', 'marketing_sms', 'security_alert'],
    push: ['transactional_push', 'marketing_push', 'security_alert'],
    in_app: ['system_notification']
  }
} as const;