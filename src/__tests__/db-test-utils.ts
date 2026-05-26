/**
 * Database test utilities
 */

import { DatabaseConnection } from '../infrastructure/database/connection.js';
import { createEnumTypesSQL, createTablesSQL, createIndexesSQL, dropTablesSQL } from '../infrastructure/database/models/index.js';

/**
 * Test database manager
 */
export class TestDatabaseManager {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.createTestConnection();
  }

  /**
   * Setup test database
   */
  async setup(): Promise<void> {
    try {
      // Drop existing tables
      await this.db.query(dropTablesSQL());
      
      // Create enum types
      await this.db.query(createEnumTypesSQL());
      
      // Create tables
      await this.db.query(createTablesSQL());
      
      // Create indexes
      await this.db.query(createIndexesSQL());
      
      console.log('Test database setup completed');
    } catch (error) {
      console.error('Test database setup failed:', error);
      throw error;
    }
  }

  /**
   * Teardown test database
   */
  async teardown(): Promise<void> {
    try {
      await this.db.query(dropTablesSQL());
      await this.db.close();
      console.log('Test database teardown completed');
    } catch (error) {
      console.error('Test database teardown failed:', error);
      throw error;
    }
  }

  /**
   * Clear all data from tables
   */
  async clearAllData(): Promise<void> {
    try {
      const tables = [
        'notification_evaluation_logs',
        'default_preferences',
        'global_policies',
        'user_quiet_hours',
        'user_preferences',
        'users'
      ];

      for (const table of tables) {
        await this.db.query(`DELETE FROM ${table}`);
      }
      
      console.log('All test data cleared');
    } catch (error) {
      console.error('Failed to clear test data:', error);
      throw error;
    }
  }

  /**
   * Insert test data
   */
  async insertTestData(): Promise<void> {
    try {
      // Insert default preferences
      const defaultPreferences = [
        ['transactional_email', 'email', true, 10],
        ['transactional_sms', 'sms', true, 20],
        ['transactional_push', 'push', true, 30],
        ['security_alert', 'email', true, 5],
        ['security_alert', 'sms', true, 15],
        ['security_alert', 'push', true, 25],
        ['system_notification', 'in_app', true, 50],
        ['marketing_email', 'email', false, 100],
        ['marketing_sms', 'sms', false, 110],
        ['marketing_push', 'push', false, 120],
      ];

      for (const [notificationType, channel, enabled, priority] of defaultPreferences) {
        await this.db.query(
          `INSERT INTO default_preferences (id, notification_type, channel, enabled, priority, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [`default_${notificationType}_${channel}`, notificationType, channel, enabled, priority]
        );
      }

      // Insert test user
      await this.db.query(
        `INSERT INTO users (id, created_at, updated_at)
         VALUES ($1, NOW(), NOW())`,
        ['test-user-123']
      );

      // Insert test user preferences
      const userPreferences = [
        ['test-user-123', 'transactional_email', 'email', true],
        ['test-user-123', 'marketing_email', 'email', false],
        ['test-user-123', 'transactional_sms', 'sms', true],
        ['test-user-123', 'marketing_sms', 'sms', false],
      ];

      for (const [userId, notificationType, channel, enabled] of userPreferences) {
        await this.db.query(
          `INSERT INTO user_preferences (user_id, notification_type, channel, enabled, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [userId, notificationType, channel, enabled]
        );
      }

      // Insert test quiet hours
      await this.db.query(
        `INSERT INTO user_quiet_hours (user_id, start_hour, start_minute, end_hour, end_minute, timezone, days, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          'test-user-123',
          22, 0, 8, 0, 'UTC',
          JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
        ]
      );

      // Insert test global policy
      await this.db.query(
        `INSERT INTO global_policies (id, notification_type, channel, region, enabled, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        ['test-policy-1', 'marketing_sms', 'sms', 'EU', false, 'Block marketing SMS in EU']
      );

      console.log('Test data inserted');
    } catch (error) {
      console.error('Failed to insert test data:', error);
      throw error;
    }
  }

  /**
   * Get database connection
   */
  getConnection(): DatabaseConnection {
    return this.db;
  }

  /**
   * Check if database is connected
   */
  async isConnected(): Promise<boolean> {
    return await this.db.isConnected();
  }

  /**
   * Run a test in transaction
   */
  async runInTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return await this.db.transaction(async (client) => {
      return await callback();
    });
  }
}

/**
 * Create test database manager singleton
 */
let testDbManager: TestDatabaseManager | null = null;

export function getTestDatabaseManager(): TestDatabaseManager {
  if (!testDbManager) {
    testDbManager = new TestDatabaseManager();
  }
  return testDbManager;
}

/**
 * Test database hooks for Jest
 */
export function setupTestDatabase() {
  const dbManager = getTestDatabaseManager();

  beforeAll(async () => {
    await dbManager.setup();
    await dbManager.insertTestData();
  });

  afterEach(async () => {
    await dbManager.clearAllData();
    await dbManager.insertTestData();
  });

  afterAll(async () => {
    await dbManager.teardown();
  });
}