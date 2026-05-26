/**
 * UserPreferences repository implementation
 */

import { 
  UserPreferences, 
  NotificationType, 
  Channel,
  Timezone,
  DayOfWeek,
  NotificationPreference,
  QuietHours
} from '../../../../domain/index.js';
import { DatabaseConnection } from '../connection.js';
import { 
  UserModel, 
  UserPreferenceModel, 
  UserQuietHoursModel,
  TABLE_NAMES 
} from '../models/index.js';

/**
 * UserPreferences repository interface
 */
export interface IUserPreferencesRepository {
  getUserPreferences(userId: string): Promise<UserPreferences | null>;
  saveUserPreferences(preferences: UserPreferences): Promise<void>;
  deleteUserPreferences(userId: string): Promise<boolean>;
  getUserIdsWithPreferences(): Promise<string[]>;
  countUsers(): Promise<number>;
}

/**
 * UserPreferences repository implementation
 */
export class UserPreferencesRepository implements IUserPreferencesRepository {
  constructor(private readonly db: DatabaseConnection) {}

  /**
   * Get user preferences by user ID
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      // Get user (or create if doesn't exist)
      const userResult = await this.db.query<UserModel>(
        `SELECT * FROM ${TABLE_NAMES.USERS} WHERE id = $1`,
        [userId]
      );

      let user: UserModel;
      
      if (userResult.rows.length === 0) {
        // User doesn't exist yet
        return null;
      } else {
        user = userResult.rows[0];
      }

      // Get user preferences
      const preferencesResult = await this.db.query<UserPreferenceModel>(
        `SELECT * FROM ${TABLE_NAMES.USER_PREFERENCES} WHERE user_id = $1 ORDER BY notification_type, channel`,
        [userId]
      );

      // Get quiet hours
      const quietHoursResult = await this.db.query<UserQuietHoursModel>(
        `SELECT * FROM ${TABLE_NAMES.USER_QUIET_HOURS} WHERE user_id = $1`,
        [userId]
      );

      // Convert to domain entities
      const preferences: NotificationPreference[] = preferencesResult.rows.map(row => ({
        notificationType: row.notification_type,
        channel: row.channel,
        enabled: row.enabled,
        updatedAt: row.updated_at
      }));

      let quietHours: QuietHours | undefined;
      
      if (quietHoursResult.rows.length > 0) {
        const row = quietHoursResult.rows[0];
        quietHours = {
          start: { hour: row.start_hour, minute: row.start_minute },
          end: { hour: row.end_hour, minute: row.end_minute },
          timezone: row.timezone,
          days: row.days as DayOfWeek[]
        };
      }

      return new UserPreferences(
        userId,
        preferences,
        quietHours,
        user.created_at,
        user.updated_at
      );
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error(`Failed to get user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      await this.db.transaction(async (client) => {
        const userId = preferences.userId;
        
        // Upsert user
        await client.query(
          `INSERT INTO ${TABLE_NAMES.USERS} (id, created_at, updated_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET updated_at = $3`,
          [userId, preferences.createdAt, preferences.updatedAt]
        );

        // Delete existing preferences
        await client.query(
          `DELETE FROM ${TABLE_NAMES.USER_PREFERENCES} WHERE user_id = $1`,
          [userId]
        );

        // Insert new preferences
        if (preferences.preferences.length > 0) {
          const values = preferences.preferences.map((pref, index) => {
            const base = index * 5;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
          }).join(', ');

          const params = preferences.preferences.flatMap(pref => [
            userId,
            pref.notificationType,
            pref.channel,
            pref.enabled,
            pref.updatedAt,
            pref.updatedAt // created_at same as updated_at for new records
          ]);

          await client.query(
            `INSERT INTO ${TABLE_NAMES.USER_PREFERENCES} 
             (user_id, notification_type, channel, enabled, updated_at, created_at)
             VALUES ${values}`,
            params
          );
        }

        // Handle quiet hours
        if (preferences.quietHours) {
          const { start, end, timezone, days } = preferences.quietHours;
          
          await client.query(
            `INSERT INTO ${TABLE_NAMES.USER_QUIET_HOURS} 
             (user_id, start_hour, start_minute, end_hour, end_minute, timezone, days, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (user_id) DO UPDATE SET
               start_hour = $2,
               start_minute = $3,
               end_hour = $4,
               end_minute = $5,
               timezone = $6,
               days = $7,
               updated_at = $9`,
            [
              userId,
              start.hour,
              start.minute,
              end.hour,
              end.minute,
              timezone,
              JSON.stringify(days),
              preferences.updatedAt,
              preferences.updatedAt
            ]
          );
        } else {
          // Remove quiet hours if they were removed
          await client.query(
            `DELETE FROM ${TABLE_NAMES.USER_QUIET_HOURS} WHERE user_id = $1`,
            [userId]
          );
        }
      });
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw new Error(`Failed to save user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete user preferences
   */
  async deleteUserPreferences(userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `DELETE FROM ${TABLE_NAMES.USERS} WHERE id = $1 RETURNING id`,
        [userId]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      throw new Error(`Failed to delete user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all user IDs that have preferences
   */
  async getUserIdsWithPreferences(): Promise<string[]> {
    try {
      const result = await this.db.query<{ id: string }>(
        `SELECT id FROM ${TABLE_NAMES.USERS} ORDER BY created_at DESC`
      );
      
      return result.rows.map(row => row.id);
    } catch (error) {
      console.error('Error getting user IDs:', error);
      throw new Error(`Failed to get user IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count total users
   */
  async countUsers(): Promise<number> {
    try {
      const result = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${TABLE_NAMES.USERS}`
      );
      
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('Error counting users:', error);
      throw new Error(`Failed to count users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a single preference (optimized for single updates)
   */
  async updateSinglePreference(
    userId: string,
    notificationType: NotificationType,
    channel: Channel,
    enabled: boolean
  ): Promise<boolean> {
    try {
      const updatedAt = new Date();
      
      // First ensure user exists
      await this.db.query(
        `INSERT INTO ${TABLE_NAMES.USERS} (id, created_at, updated_at)
         VALUES ($1, $2, $2)
         ON CONFLICT (id) DO UPDATE SET updated_at = $2`,
        [userId, updatedAt]
      );

      // Update or insert preference
      const result = await this.db.query(
        `INSERT INTO ${TABLE_NAMES.USER_PREFERENCES} 
         (user_id, notification_type, channel, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5)
         ON CONFLICT (user_id, notification_type, channel) DO UPDATE SET
           enabled = $4,
           updated_at = $5
         RETURNING id`,
        [userId, notificationType, channel, enabled, updatedAt]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error updating single preference:', error);
      throw new Error(`Failed to update preference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get users with specific preference
   */
  async getUsersWithPreference(
    notificationType: NotificationType,
    channel: Channel,
    enabled: boolean
  ): Promise<string[]> {
    try {
      const result = await this.db.query<{ user_id: string }>(
        `SELECT user_id FROM ${TABLE_NAMES.USER_PREFERENCES} 
         WHERE notification_type = $1 AND channel = $2 AND enabled = $3`,
        [notificationType, channel, enabled]
      );
      
      return result.rows.map(row => row.user_id);
    } catch (error) {
      console.error('Error getting users with preference:', error);
      throw new Error(`Failed to get users with preference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has a specific preference
   */
  async hasPreference(
    userId: string,
    notificationType: NotificationType,
    channel: Channel
  ): Promise<boolean> {
    try {
      const result = await this.db.query<{ enabled: boolean }>(
        `SELECT enabled FROM ${TABLE_NAMES.USER_PREFERENCES} 
         WHERE user_id = $1 AND notification_type = $2 AND channel = $3`,
        [userId, notificationType, channel]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking preference:', error);
      throw new Error(`Failed to check preference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}