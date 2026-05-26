import { 
  NotificationType, 
  Channel, 
  Timezone, 
  QuietHours, 
  NotificationPreference,
  UserPreferences as UserPreferencesInterface
} from '../types.js';

/**
 * UserPreferences entity representing a user's notification preferences
 * Contains business logic for managing preferences and quiet hours
 */
export class UserPreferences implements UserPreferencesInterface {
  constructor(
    public readonly userId: string,
    public preferences: NotificationPreference[],
    public quietHours?: QuietHours,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  /**
   * Get preference for a specific notification type and channel
   */
  getPreference(notificationType: NotificationType, channel: Channel): NotificationPreference | undefined {
    return this.preferences.find(
      pref => pref.notificationType === notificationType && pref.channel === channel
    );
  }

  /**
   * Check if a notification type and channel is enabled for this user
   */
  isEnabled(notificationType: NotificationType, channel: Channel): boolean {
    const preference = this.getPreference(notificationType, channel);
    return preference?.enabled ?? false;
  }

  /**
   * Update or add a preference
   * Returns true if the preference was changed, false if it was already set to the same value
   */
  updatePreference(
    notificationType: NotificationType, 
    channel: Channel, 
    enabled: boolean
  ): boolean {
    const existingPreference = this.getPreference(notificationType, channel);
    
    if (existingPreference) {
      // Idempotent operation: only update if value is different
      if (existingPreference.enabled === enabled) {
        return false;
      }
      
      existingPreference.enabled = enabled;
      existingPreference.updatedAt = new Date();
    } else {
      // Add new preference
      this.preferences.push({
        notificationType,
        channel,
        enabled,
        updatedAt: new Date()
      });
    }
    
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Update quiet hours configuration
   */
  updateQuietHours(quietHours: QuietHours): void {
    this.quietHours = quietHours;
    this.updatedAt = new Date();
  }

  /**
   * Check if quiet hours are currently active for a given datetime and timezone
   */
  isQuietHoursActive(checkTime: Date, checkTimezone: Timezone): boolean {
    if (!this.quietHours) {
      return false;
    }

    // Convert check time to the quiet hours timezone
    // For now, we'll use a simplified approach - in production we'd use a proper timezone library
    const checkHour = checkTime.getUTCHours();
    const checkMinute = checkTime.getUTCMinutes();
    
    const { start, end } = this.quietHours;
    
    // Convert time to minutes since midnight for easier comparison
    const checkMinutes = checkHour * 60 + checkMinute;
    const startMinutes = start.hour * 60 + start.minute;
    const endMinutes = end.hour * 60 + end.minute;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      // Quiet hours span midnight
      return checkMinutes >= startMinutes || checkMinutes < endMinutes;
    } else {
      // Quiet hours within same day
      return checkMinutes >= startMinutes && checkMinutes < endMinutes;
    }
  }

  /**
   * Get all enabled preferences
   */
  getEnabledPreferences(): NotificationPreference[] {
    return this.preferences.filter(pref => pref.enabled);
  }

  /**
   * Get all disabled preferences
   */
  getDisabledPreferences(): NotificationPreference[] {
    return this.preferences.filter(pref => !pref.enabled);
  }

  /**
   * Create a new UserPreferences instance with default preferences
   */
  static createWithDefaults(userId: string, defaultPreferences: NotificationPreference[]): UserPreferences {
    return new UserPreferences(
      userId,
      defaultPreferences.map(pref => ({
        ...pref,
        updatedAt: new Date()
      })),
      undefined,
      new Date(),
      new Date()
    );
  }

  /**
   * Merge preferences from another UserPreferences object
   * Useful for applying updates from API requests
   */
  mergePreferences(otherPreferences: NotificationPreference[]): number {
    let changes = 0;
    
    for (const pref of otherPreferences) {
      if (this.updatePreference(pref.notificationType, pref.channel, pref.enabled)) {
        changes++;
      }
    }
    
    return changes;
  }
}