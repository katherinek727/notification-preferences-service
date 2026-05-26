import { 
  NotificationType, 
  Channel, 
  DefaultPreference,
  NotificationPreference
} from '../types.js';

/**
 * DefaultPreferences service responsible for managing default notification preferences
 * These are applied to new users when they are created
 */
export class DefaultPreferencesService {
  private defaultPreferences: DefaultPreference[];

  constructor(defaultPreferences: DefaultPreference[] = []) {
    this.defaultPreferences = defaultPreferences;
  }

  /**
   * Get all default preferences
   */
  getAll(): DefaultPreference[] {
    return [...this.defaultPreferences];
  }

  /**
   * Get default preferences for a specific notification type
   */
  getByNotificationType(notificationType: NotificationType): DefaultPreference[] {
    return this.defaultPreferences.filter(pref => pref.notificationType === notificationType);
  }

  /**
   * Get default preferences for a specific channel
   */
  getByChannel(channel: Channel): DefaultPreference[] {
    return this.defaultPreferences.filter(pref => pref.channel === channel);
  }

  /**
   * Get default preference for a specific notification type and channel
   */
  getPreference(notificationType: NotificationType, channel: Channel): DefaultPreference | undefined {
    return this.defaultPreferences.find(
      pref => pref.notificationType === notificationType && pref.channel === channel
    );
  }

  /**
   * Add or update a default preference
   * Returns true if the preference was added/updated, false if it already exists with same values
   */
  setPreference(
    notificationType: NotificationType,
    channel: Channel,
    enabled: boolean,
    priority: number = 100
  ): boolean {
    const existingIndex = this.defaultPreferences.findIndex(
      pref => pref.notificationType === notificationType && pref.channel === channel
    );

    if (existingIndex >= 0) {
      const existing = this.defaultPreferences[existingIndex];
      
      // Idempotent: only update if values are different
      if (existing.enabled === enabled && existing.priority === priority) {
        return false;
      }
      
      this.defaultPreferences[existingIndex] = {
        notificationType,
        channel,
        enabled,
        priority
      };
    } else {
      this.defaultPreferences.push({
        notificationType,
        channel,
        enabled,
        priority
      });
    }

    // Sort by priority (lower number = higher priority)
    this.defaultPreferences.sort((a, b) => a.priority - b.priority);
    
    return true;
  }

  /**
   * Remove a default preference
   * Returns true if the preference was removed, false if it didn't exist
   */
  removePreference(notificationType: NotificationType, channel: Channel): boolean {
    const initialLength = this.defaultPreferences.length;
    this.defaultPreferences = this.defaultPreferences.filter(
      pref => !(pref.notificationType === notificationType && pref.channel === channel)
    );
    return this.defaultPreferences.length < initialLength;
  }

  /**
   * Convert default preferences to notification preferences (for new users)
   */
  toNotificationPreferences(): NotificationPreference[] {
    return this.defaultPreferences.map(pref => ({
      notificationType: pref.notificationType,
      channel: pref.channel,
      enabled: pref.enabled,
      updatedAt: new Date()
    }));
  }

  /**
   * Get enabled default preferences
   */
  getEnabledPreferences(): DefaultPreference[] {
    return this.defaultPreferences.filter(pref => pref.enabled);
  }

  /**
   * Get disabled default preferences
   */
  getDisabledPreferences(): DefaultPreference[] {
    return this.defaultPreferences.filter(pref => !pref.enabled);
  }

  /**
   * Check if a notification type and channel is enabled by default
   */
  isEnabledByDefault(notificationType: NotificationType, channel: Channel): boolean {
    const preference = this.getPreference(notificationType, channel);
    return preference?.enabled ?? false;
  }

  /**
   * Create default preferences with common sensible defaults
   */
  static createWithCommonDefaults(): DefaultPreferencesService {
    const defaults: DefaultPreference[] = [
      // Transactional notifications are enabled by default (high priority)
      { notificationType: 'transactional_email', channel: 'email', enabled: true, priority: 10 },
      { notificationType: 'transactional_sms', channel: 'sms', enabled: true, priority: 20 },
      { notificationType: 'transactional_push', channel: 'push', enabled: true, priority: 30 },
      
      // Security alerts are enabled by default (high priority)
      { notificationType: 'security_alert', channel: 'email', enabled: true, priority: 5 },
      { notificationType: 'security_alert', channel: 'sms', enabled: true, priority: 15 },
      { notificationType: 'security_alert', channel: 'push', enabled: true, priority: 25 },
      
      // System notifications are enabled by default (medium priority)
      { notificationType: 'system_notification', channel: 'in_app', enabled: true, priority: 50 },
      
      // Marketing notifications are disabled by default (low priority)
      { notificationType: 'marketing_email', channel: 'email', enabled: false, priority: 100 },
      { notificationType: 'marketing_sms', channel: 'sms', enabled: false, priority: 110 },
      { notificationType: 'marketing_push', channel: 'push', enabled: false, priority: 120 },
    ];

    return new DefaultPreferencesService(defaults);
  }

  /**
   * Create default preferences with all notifications enabled
   * Useful for testing or permissive environments
   */
  static createWithAllEnabled(): DefaultPreferencesService {
    const notificationTypes: NotificationType[] = [
      'transactional_email', 'marketing_email',
      'transactional_sms', 'marketing_sms',
      'transactional_push', 'marketing_push',
      'security_alert', 'system_notification'
    ];

    const channels: Channel[] = ['email', 'sms', 'push', 'in_app'];
    
    const defaults: DefaultPreference[] = [];
    let priority = 10;

    for (const notificationType of notificationTypes) {
      for (const channel of channels) {
        // Only add combinations that make sense
        if (this.isValidCombination(notificationType, channel)) {
          defaults.push({
            notificationType,
            channel,
            enabled: true,
            priority: priority++
          });
        }
      }
    }

    return new DefaultPreferencesService(defaults);
  }

  /**
   * Check if a notification type and channel combination is valid
   * Some combinations don't make sense (e.g., system_notification via SMS)
   */
  private static isValidCombination(notificationType: NotificationType, channel: Channel): boolean {
    const invalidCombinations = [
      { notificationType: 'system_notification', channel: 'sms' },
      { notificationType: 'system_notification', channel: 'email' },
      { notificationType: 'system_notification', channel: 'push' },
    ];

    return !invalidCombinations.some(
      invalid => invalid.notificationType === notificationType && invalid.channel === channel
    );
  }
}