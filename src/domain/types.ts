/**
 * Core domain types for the Notification Preferences Service
 */

/**
 * Notification types supported by the system
 */
export type NotificationType = 
  | 'transactional_email'
  | 'marketing_email'
  | 'transactional_sms'
  | 'marketing_sms'
  | 'transactional_push'
  | 'marketing_push'
  | 'security_alert'
  | 'system_notification';

/**
 * Delivery channels for notifications
 */
export type Channel = 'email' | 'sms' | 'push' | 'in_app';

/**
 * Geographic regions for policy enforcement
 */
export type Region = 'US' | 'EU' | 'APAC' | 'LATAM' | 'MEA' | 'GLOBAL';

/**
 * Timezone string in IANA format (e.g., 'America/New_York', 'Europe/London')
 */
export type Timezone = string;

/**
 * Decision result for notification evaluation
 */
export type Decision = 'allow' | 'deny';

/**
 * Reasons for notification decisions
 */
export type DecisionReason = 
  | 'notification_allowed'
  | 'user_preference_disabled'
  | 'quiet_hours_active'
  | 'global_policy_blocked'
  | 'invalid_notification_type'
  | 'invalid_channel'
  | 'user_not_found';

/**
 * Day of week for quiet hours configuration
 */
export type DayOfWeek = 
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
  | 'all';

/**
 * Interface for a time range (used for quiet hours)
 */
export interface TimeRange {
  hour: number;    // 0-23
  minute: number;  // 0-59
}

/**
 * Interface for quiet hours configuration
 */
export interface QuietHours {
  start: TimeRange;
  end: TimeRange;
  timezone: Timezone;
  days: DayOfWeek[];
}

/**
 * Interface for a notification preference
 */
export interface NotificationPreference {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
  updatedAt: Date;
}

/**
 * Interface for a global policy
 */
export interface GlobalPolicy {
  id: string;
  notificationType: NotificationType;
  channel: Channel;
  region: Region;
  enabled: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for default preferences (applied to new users)
 */
export interface DefaultPreference {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
  priority: number; // Lower number = higher priority
}

/**
 * Interface for notification evaluation request
 */
export interface NotificationEvaluationRequest {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  region: Region;
  datetime: Date;
}

/**
 * Interface for notification evaluation result
 */
export interface NotificationEvaluationResult {
  decision: Decision;
  reason: DecisionReason;
  details?: string;
  evaluatedAt: Date;
}

/**
 * Interface for user preferences
 */
export interface UserPreferences {
  userId: string;
  preferences: NotificationPreference[];
  quietHours?: QuietHours;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type guard to check if a string is a valid NotificationType
 */
export function isNotificationType(value: string): value is NotificationType {
  const validTypes: NotificationType[] = [
    'transactional_email',
    'marketing_email',
    'transactional_sms',
    'marketing_sms',
    'transactional_push',
    'marketing_push',
    'security_alert',
    'system_notification'
  ];
  return validTypes.includes(value as NotificationType);
}

/**
 * Type guard to check if a string is a valid Channel
 */
export function isChannel(value: string): value is Channel {
  const validChannels: Channel[] = ['email', 'sms', 'push', 'in_app'];
  return validChannels.includes(value as Channel);
}

/**
 * Type guard to check if a string is a valid Region
 */
export function isRegion(value: string): value is Region {
  const validRegions: Region[] = ['US', 'EU', 'APAC', 'LATAM', 'MEA', 'GLOBAL'];
  return validRegions.includes(value as Region);
}

/**
 * Type guard to check if a string is a valid DayOfWeek
 */
export function isDayOfWeek(value: string): value is DayOfWeek {
  const validDays: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'all'
  ];
  return validDays.includes(value as DayOfWeek);
}