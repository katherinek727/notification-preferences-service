/**
 * Database models for PostgreSQL
 * These represent the database schema
 */

import { 
  NotificationType, 
  Channel, 
  Region, 
  Timezone,
  DayOfWeek 
} from '../../../domain/index.js';

/**
 * User model
 */
export interface UserModel {
  id: string;
  email?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * User preferences model
 */
export interface UserPreferenceModel {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  channel: Channel;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * User quiet hours model
 */
export interface UserQuietHoursModel {
  id: string;
  user_id: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  timezone: Timezone;
  days: DayOfWeek[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Global policy model
 */
export interface GlobalPolicyModel {
  id: string;
  notification_type: NotificationType;
  channel: Channel;
  region: Region;
  enabled: boolean;
  description: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Default preference model
 */
export interface DefaultPreferenceModel {
  id: string;
  notification_type: NotificationType;
  channel: Channel;
  enabled: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Notification evaluation log model
 */
export interface NotificationEvaluationLogModel {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  channel: Channel;
  region: Region;
  evaluated_at: Date;
  decision: 'allow' | 'deny';
  reason: string;
  details?: string;
  created_at: Date;
}

/**
 * Database table names
 */
export const TABLE_NAMES = {
  USERS: 'users',
  USER_PREFERENCES: 'user_preferences',
  USER_QUIET_HOURS: 'user_quiet_hours',
  GLOBAL_POLICIES: 'global_policies',
  DEFAULT_PREFERENCES: 'default_preferences',
  NOTIFICATION_EVALUATION_LOGS: 'notification_evaluation_logs'
} as const;

/**
 * Database column types
 */
export const COLUMN_TYPES = {
  // Common types
  UUID: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
  TEXT: 'TEXT',
  BOOLEAN: 'BOOLEAN',
  INTEGER: 'INTEGER',
  JSONB: 'JSONB',
  TIMESTAMP: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
  
  // Enums
  NOTIFICATION_TYPE: `notification_type_enum`,
  CHANNEL: `channel_enum`,
  REGION: `region_enum`,
  DAY_OF_WEEK: `day_of_week_enum`,
  DECISION: `decision_enum`
} as const;

/**
 * Create enum types SQL
 */
export function createEnumTypesSQL(): string {
  return `
    -- Notification type enum
    DO $$ BEGIN
      CREATE TYPE notification_type_enum AS ENUM (
        'transactional_email',
        'marketing_email',
        'transactional_sms',
        'marketing_sms',
        'transactional_push',
        'marketing_push',
        'security_alert',
        'system_notification'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Channel enum
    DO $$ BEGIN
      CREATE TYPE channel_enum AS ENUM (
        'email',
        'sms',
        'push',
        'in_app'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Region enum
    DO $$ BEGIN
      CREATE TYPE region_enum AS ENUM (
        'US',
        'EU',
        'APAC',
        'LATAM',
        'MEA',
        'GLOBAL'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Day of week enum
    DO $$ BEGIN
      CREATE TYPE day_of_week_enum AS ENUM (
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
        'all'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Decision enum
    DO $$ BEGIN
      CREATE TYPE decision_enum AS ENUM (
        'allow',
        'deny'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;
}

/**
 * Create tables SQL
 */
export function createTablesSQL(): string {
  return `
    -- Users table
    CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.USERS} (
      id ${COLUMN_TYPES.UUID},
      email ${COLUMN_TYPES.TEXT},
      created_at ${COLUMN_TYPES.TIMESTAMP},
      updated_at ${COLUMN_TYPES.TIMESTAMP},
      PRIMARY KEY (id)
    );

    -- User preferences table
    CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.USER_PREFERENCES} (
      id ${COLUMN_TYPES.UUID},
      user_id ${COLUMN_TYPES.UUID} NOT NULL,
      notification_type ${COLUMN_TYPES.NOTIFICATION_TYPE} NOT NULL,
      channel ${COLUMN_TYPES.CHANNEL} NOT NULL,
      enabled ${COLUMN_TYPES.BOOLEAN} NOT NULL DEFAULT true,
      created_at ${COLUMN_TYPES.TIMESTAMP},
      updated_at ${COLUMN_TYPES.TIMESTAMP},
      PRIMARY KEY (id),
      FOREIGN KEY (user_id) REFERENCES ${TABLE_NAMES.USERS}(id) ON DELETE CASCADE,
      UNIQUE (user_id, notification_type, channel)
    );

    -- User quiet hours table
    CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.USER_QUIET_HOURS} (
      id ${COLUMN_TYPES.UUID},
      user_id ${COLUMN_TYPES.UUID} NOT NULL,
      start_hour ${COLUMN_TYPES.INTEGER} NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
      start_minute ${COLUMN_TYPES.INTEGER} NOT NULL CHECK (start_minute >= 0 AND start_minute <= 59),
      end_hour ${COLUMN_TYPES.INTEGER} NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
      end_minute ${COLUMN_TYPES.INTEGER} NOT NULL CHECK (end_minute >= 0 AND end_minute <= 59),
      timezone ${COLUMN_TYPES.TEXT} NOT NULL,
      days ${COLUMN_TYPES.JSONB} NOT NULL,
      created_at ${COLUMN_TYPES.TIMESTAMP},
      updated_at ${COLUMN_TYPES.TIMESTAMP},
      PRIMARY KEY (id),
      FOREIGN KEY (user_id) REFERENCES ${TABLE_NAMES.USERS}(id) ON DELETE CASCADE,
      UNIQUE (user_id)
    );

    -- Global policies table
    CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.GLOBAL_POLICIES} (
      id ${COLUMN_TYPES.UUID},
      notification_type ${COLUMN_TYPES.NOTIFICATION_TYPE} NOT NULL,
      channel ${COLUMN_TYPES.CHANNEL} NOT NULL,
      region ${COLUMN_TYPES.REGION} NOT NULL,
      enabled ${COLUMN_TYPES.BOOLEAN} NOT NULL DEFAULT true,
      description ${COLUMN_TYPES.TEXT} NOT NULL,
      created_at ${COLUMN_TYPES.TIMESTAMP},
      updated_at ${COLUMN_TYPES.TIMESTAMP},
      PRIMARY KEY (id),
      UNIQUE (notification_type, channel, region)
    );

    -- Default preferences table
    CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.DEFAULT_PREFERENCES} (
      id ${COLUMN_TYPES.UUID},
      notification_type ${COLUMN_TYPES.NOTIFICATION_TYPE} NOT NULL,
      channel ${COLUMN_TYPES.CHANNEL} NOT NULL,
      enabled ${COLUMN_TYPES.BOOLEAN} NOT NULL DEFAULT true,
      priority ${COLUMN_TYPES.INTEGER} NOT NULL DEFAULT 100,
      created_at ${COLUMN_TYPES.TIMESTAMP},
      updated_at ${COLUMN_TYPES.TIMESTAMP},
      PRIMARY KEY (id),
      UNIQUE (notification_type, channel)
    );

    -- Notification evaluation logs table
    CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.NOTIFICATION_EVALUATION_LOGS} (
      id ${COLUMN_TYPES.UUID},
      user_id ${COLUMN_TYPES.UUID} NOT NULL,
      notification_type ${COLUMN_TYPES.NOTIFICATION_TYPE} NOT NULL,
      channel ${COLUMN_TYPES.CHANNEL} NOT NULL,
      region ${COLUMN_TYPES.REGION} NOT NULL,
      evaluated_at ${COLUMN_TYPES.TIMESTAMP} NOT NULL,
      decision ${COLUMN_TYPES.DECISION} NOT NULL,
      reason ${COLUMN_TYPES.TEXT} NOT NULL,
      details ${COLUMN_TYPES.TEXT},
      created_at ${COLUMN_TYPES.TIMESTAMP},
      PRIMARY KEY (id)
    );
  `;
}

/**
 * Create indexes SQL
 */
export function createIndexesSQL(): string {
  return `
    -- Indexes for user preferences
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON ${TABLE_NAMES.USER_PREFERENCES}(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_preferences_enabled ON ${TABLE_NAMES.USER_PREFERENCES}(enabled) WHERE enabled = true;
    
    -- Indexes for global policies
    CREATE INDEX IF NOT EXISTS idx_global_policies_region ON ${TABLE_NAMES.GLOBAL_POLICIES}(region);
    CREATE INDEX IF NOT EXISTS idx_global_policies_enabled ON ${TABLE_NAMES.GLOBAL_POLICIES}(enabled) WHERE enabled = false;
    CREATE INDEX IF NOT EXISTS idx_global_policies_notification_channel ON ${TABLE_NAMES.GLOBAL_POLICIES}(notification_type, channel);
    
    -- Indexes for default preferences
    CREATE INDEX IF NOT EXISTS idx_default_preferences_priority ON ${TABLE_NAMES.DEFAULT_PREFERENCES}(priority);
    CREATE INDEX IF NOT EXISTS idx_default_preferences_enabled ON ${TABLE_NAMES.DEFAULT_PREFERENCES}(enabled) WHERE enabled = true;
    
    -- Indexes for notification evaluation logs
    CREATE INDEX IF NOT EXISTS idx_evaluation_logs_user_id ON ${TABLE_NAMES.NOTIFICATION_EVALUATION_LOGS}(user_id);
    CREATE INDEX IF NOT EXISTS idx_evaluation_logs_evaluated_at ON ${TABLE_NAMES.NOTIFICATION_EVALUATION_LOGS}(evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_evaluation_logs_decision ON ${TABLE_NAMES.NOTIFICATION_EVALUATION_LOGS}(decision);
    CREATE INDEX IF NOT EXISTS idx_evaluation_logs_notification_channel ON ${TABLE_NAMES.NOTIFICATION_EVALUATION_LOGS}(notification_type, channel);
  `;
}

/**
 * Drop tables SQL (for migrations down)
 */
export function dropTablesSQL(): string {
  return `
    DROP TABLE IF EXISTS ${TABLE_NAMES.NOTIFICATION_EVALUATION_LOGS} CASCADE;
    DROP TABLE IF EXISTS ${TABLE_NAMES.DEFAULT_PREFERENCES} CASCADE;
    DROP TABLE IF EXISTS ${TABLE_NAMES.GLOBAL_POLICIES} CASCADE;
    DROP TABLE IF EXISTS ${TABLE_NAMES.USER_QUIET_HOURS} CASCADE;
    DROP TABLE IF EXISTS ${TABLE_NAMES.USER_PREFERENCES} CASCADE;
    DROP TABLE IF EXISTS ${TABLE_NAMES.USERS} CASCADE;
    
    -- Drop enum types
    DROP TYPE IF EXISTS ${COLUMN_TYPES.DECISION};
    DROP TYPE IF EXISTS ${COLUMN_TYPES.DAY_OF_WEEK};
    DROP TYPE IF EXISTS ${COLUMN_TYPES.REGION};
    DROP TYPE IF EXISTS ${COLUMN_TYPES.CHANNEL};
    DROP TYPE IF EXISTS ${COLUMN_TYPES.NOTIFICATION_TYPE};
  `;
}