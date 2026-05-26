/**
 * DefaultPreferences repository implementation
 */

import { 
  NotificationType, 
  Channel,
  DefaultPreference
} from '../../../../domain/index.js';
import { DatabaseConnection } from '../connection.js';
import { 
  DefaultPreferenceModel,
  TABLE_NAMES 
} from '../models/index.js';

/**
 * DefaultPreferences repository interface
 */
export interface IDefaultPreferencesRepository {
  getDefaultPreferences(): Promise<DefaultPreference[]>;
  getDefaultPreference(notificationType: NotificationType, channel: Channel): Promise<DefaultPreference | null>;
  saveDefaultPreference(preference: DefaultPreference): Promise<void>;
  deleteDefaultPreference(notificationType: NotificationType, channel: Channel): Promise<boolean>;
  setDefaultPreference(notificationType: NotificationType, channel: Channel, enabled: boolean, priority: number): Promise<void>;
}

/**
 * DefaultPreferences repository implementation
 */
export class DefaultPreferencesRepository implements IDefaultPreferencesRepository {
  constructor(private readonly db: DatabaseConnection) {}

  /**
   * Get all default preferences
   */
  async getDefaultPreferences(): Promise<DefaultPreference[]> {
    try {
      const result = await this.db.query<DefaultPreferenceModel>(
        `SELECT * FROM ${TABLE_NAMES.DEFAULT_PREFERENCES} ORDER BY priority, notification_type, channel`
      );

      return result.rows.map(row => this.rowToEntity(row));
    } catch (error) {
      console.error('Error getting default preferences:', error);
      throw new Error(`Failed to get default preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get default preference by notification type and channel
   */
  async getDefaultPreference(
    notificationType: NotificationType, 
    channel: Channel
  ): Promise<DefaultPreference | null> {
    try {
      const result = await this.db.query<DefaultPreferenceModel>(
        `SELECT * FROM ${TABLE_NAMES.DEFAULT_PREFERENCES} 
         WHERE notification_type = $1 AND channel = $2`,
        [notificationType, channel]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.rowToEntity(result.rows[0]);
    } catch (error) {
      console.error('Error getting default preference:', error);
      throw new Error(`Failed to get default preference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save default preference
   */
  async saveDefaultPreference(preference: DefaultPreference): Promise<void> {
    try {
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO ${TABLE_NAMES.DEFAULT_PREFERENCES} 
         (id, notification_type, channel, enabled, priority, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (notification_type, channel) DO UPDATE SET
           enabled = $4,
           priority = $5,
           updated_at = $7`,
        [
          this.generateId(preference.notificationType, preference.channel),
          preference.notificationType,
          preference.channel,
          preference.enabled,
          preference.priority,
          now,
          now
        ]
      );
    } catch (error) {
      console.error('Error saving default preference:', error);
      throw new Error(`Failed to save default preference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete default preference
   */
  async deleteDefaultPreference(
    notificationType: NotificationType, 
    channel: Channel
  ): Promise<boolean> {
    try {
      const result = await this.db.query(
        `DELETE FROM ${TABLE_NAMES.DEFAULT_PREFERENCES} 
         WHERE notification_type = $1 AND channel = $2 
         RETURNING id`,
        [notificationType, channel]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting default preference:', error);
      throw new Error(`Failed to delete default preference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set default preference (upsert)
   */
  async setDefaultPreference(
    notificationType: NotificationType,
    channel: Channel,
    enabled: boolean,
    priority: number = 100
  ): Promise<void> {
    try {
      const now = new Date();
      const id = this.generateId(notificationType, channel);
      
      await this.db.query(
        `INSERT INTO ${TABLE_NAMES.DEFAULT_PREFERENCES} 
         (id, notification_type, channel, enabled, priority, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (notification_type, channel) DO UPDATE SET
           enabled = $4,
           priority = $5,
           updated_at = $7`,
        [id, notificationType, channel, enabled, priority, now, now]
      );
    } catch (error) {
      console.error('Error setting default preference:', error);
      throw new Error(`Failed to set default preference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get enabled default preferences
   */
  async getEnabledDefaultPreferences(): Promise<DefaultPreference[]> {
    try {
      const result = await this.db.query<DefaultPreferenceModel>(
        `SELECT * FROM ${TABLE_NAMES.DEFAULT_PREFERENCES} 
         WHERE enabled = true 
         ORDER BY priority, notification_type, channel`
      );

      return result.rows.map(row => this.rowToEntity(row));
    } catch (error) {
      console.error('Error getting enabled default preferences:', error);
      throw new Error(`Failed to get enabled default preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get disabled default preferences
   */
  async getDisabledDefaultPreferences(): Promise<DefaultPreference[]> {
    try {
      const result = await this.db.query<DefaultPreferenceModel>(
        `SELECT * FROM ${TABLE_NAMES.DEFAULT_PREFERENCES} 
         WHERE enabled = false 
         ORDER BY priority, notification_type, channel`
      );

      return result.rows.map(row => this.rowToEntity(row));
    } catch (error) {
      console.error('Error getting disabled default preferences:', error);
      throw new Error(`Failed to get disabled default preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a notification type and channel is enabled by default
   */
  async isEnabledByDefault(
    notificationType: NotificationType, 
    channel: Channel
  ): Promise<boolean> {
    try {
      const preference = await this.getDefaultPreference(notificationType, channel);
      return preference?.enabled ?? false;
    } catch (error) {
      console.error('Error checking if enabled by default:', error);
      throw new Error(`Failed to check if enabled by default: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize with common defaults
   */
  async initializeWithCommonDefaults(): Promise<void> {
    try {
      const commonDefaults: DefaultPreference[] = [
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

      for (const defaultPref of commonDefaults) {
        await this.saveDefaultPreference(defaultPref);
      }
    } catch (error) {
      console.error('Error initializing with common defaults:', error);
      throw new Error(`Failed to initialize with common defaults: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all default preferences
   */
  async clearAll(): Promise<void> {
    try {
      await this.db.query(`DELETE FROM ${TABLE_NAMES.DEFAULT_PREFERENCES}`);
    } catch (error) {
      console.error('Error clearing default preferences:', error);
      throw new Error(`Failed to clear default preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert database row to domain entity
   */
  private rowToEntity(row: DefaultPreferenceModel): DefaultPreference {
    return {
      notificationType: row.notification_type,
      channel: row.channel,
      enabled: row.enabled,
      priority: row.priority
    };
  }

  /**
   * Generate ID for default preference
   */
  private generateId(notificationType: NotificationType, channel: Channel): string {
    return `default_${notificationType}_${channel}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}