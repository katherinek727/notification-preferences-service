/**
 * GlobalPolicies repository implementation
 */

import { 
  GlobalPolicy, 
  NotificationType, 
  Channel, 
  Region 
} from '../../../../domain/index.js';
import { DatabaseConnection } from '../connection.js';
import { 
  GlobalPolicyModel,
  TABLE_NAMES 
} from '../models/index.js';

/**
 * GlobalPolicies repository interface
 */
export interface IGlobalPoliciesRepository {
  getGlobalPolicy(id: string): Promise<GlobalPolicy | null>;
  getGlobalPolicies(): Promise<GlobalPolicy[]>;
  getGlobalPoliciesByFilter(filter: {
    notificationType?: NotificationType;
    channel?: Channel;
    region?: Region;
  }): Promise<GlobalPolicy[]>;
  saveGlobalPolicy(policy: GlobalPolicy): Promise<void>;
  deleteGlobalPolicy(id: string): Promise<boolean>;
  countPolicies(): Promise<number>;
}

/**
 * GlobalPolicies repository implementation
 */
export class GlobalPoliciesRepository implements IGlobalPoliciesRepository {
  constructor(private readonly db: DatabaseConnection) {}

  /**
   * Get global policy by ID
   */
  async getGlobalPolicy(id: string): Promise<GlobalPolicy | null> {
    try {
      const result = await this.db.query<GlobalPolicyModel>(
        `SELECT * FROM ${TABLE_NAMES.GLOBAL_POLICIES} WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return this.rowToEntity(row);
    } catch (error) {
      console.error('Error getting global policy:', error);
      throw new Error(`Failed to get global policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all global policies
   */
  async getGlobalPolicies(): Promise<GlobalPolicy[]> {
    try {
      const result = await this.db.query<GlobalPolicyModel>(
        `SELECT * FROM ${TABLE_NAMES.GLOBAL_POLICIES} ORDER BY region, notification_type, channel`
      );

      return result.rows.map(row => this.rowToEntity(row));
    } catch (error) {
      console.error('Error getting global policies:', error);
      throw new Error(`Failed to get global policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get global policies by filter
   */
  async getGlobalPoliciesByFilter(filter: {
    notificationType?: NotificationType;
    channel?: Channel;
    region?: Region;
  }): Promise<GlobalPolicy[]> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filter.notificationType) {
        conditions.push(`notification_type = $${paramIndex}`);
        params.push(filter.notificationType);
        paramIndex++;
      }

      if (filter.channel) {
        conditions.push(`channel = $${paramIndex}`);
        params.push(filter.channel);
        paramIndex++;
      }

      if (filter.region) {
        conditions.push(`region = $${paramIndex}`);
        params.push(filter.region);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      const result = await this.db.query<GlobalPolicyModel>(
        `SELECT * FROM ${TABLE_NAMES.GLOBAL_POLICIES} ${whereClause} ORDER BY region, notification_type, channel`,
        params
      );

      return result.rows.map(row => this.rowToEntity(row));
    } catch (error) {
      console.error('Error getting filtered global policies:', error);
      throw new Error(`Failed to get filtered global policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save global policy
   */
  async saveGlobalPolicy(policy: GlobalPolicy): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO ${TABLE_NAMES.GLOBAL_POLICIES} 
         (id, notification_type, channel, region, enabled, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           enabled = $5,
           description = $6,
           updated_at = $8`,
        [
          policy.id,
          policy.notificationType,
          policy.channel,
          policy.region,
          policy.enabled,
          policy.description,
          policy.createdAt,
          policy.updatedAt
        ]
      );
    } catch (error) {
      console.error('Error saving global policy:', error);
      throw new Error(`Failed to save global policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete global policy
   */
  async deleteGlobalPolicy(id: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `DELETE FROM ${TABLE_NAMES.GLOBAL_POLICIES} WHERE id = $1 RETURNING id`,
        [id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting global policy:', error);
      throw new Error(`Failed to delete global policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count total policies
   */
  async countPolicies(): Promise<number> {
    try {
      const result = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${TABLE_NAMES.GLOBAL_POLICIES}`
      );
      
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('Error counting policies:', error);
      throw new Error(`Failed to count policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get policies that would block a notification
   */
  async getBlockingPolicies(
    notificationType: NotificationType,
    channel: Channel,
    region: Region
  ): Promise<GlobalPolicy[]> {
    try {
      const result = await this.db.query<GlobalPolicyModel>(
        `SELECT * FROM ${TABLE_NAMES.GLOBAL_POLICIES} 
         WHERE notification_type = $1 
           AND channel = $2 
           AND (region = $3 OR region = 'GLOBAL')
           AND enabled = false`,
        [notificationType, channel, region]
      );

      return result.rows.map(row => this.rowToEntity(row));
    } catch (error) {
      console.error('Error getting blocking policies:', error);
      throw new Error(`Failed to get blocking policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a policy exists for the given criteria
   */
  async policyExists(
    notificationType: NotificationType,
    channel: Channel,
    region: Region,
    excludeId?: string
  ): Promise<boolean> {
    try {
      let query = `SELECT COUNT(*) as count FROM ${TABLE_NAMES.GLOBAL_POLICIES} 
                   WHERE notification_type = $1 AND channel = $2 AND region = $3`;
      
      const params: any[] = [notificationType, channel, region];
      let paramIndex = 4;

      if (excludeId) {
        query += ` AND id != $${paramIndex}`;
        params.push(excludeId);
      }

      const result = await this.db.query<{ count: string }>(query, params);
      
      return parseInt(result.rows[0].count, 10) > 0;
    } catch (error) {
      console.error('Error checking if policy exists:', error);
      throw new Error(`Failed to check if policy exists: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get policies by region
   */
  async getPoliciesByRegion(region: Region): Promise<GlobalPolicy[]> {
    try {
      const result = await this.db.query<GlobalPolicyModel>(
        `SELECT * FROM ${TABLE_NAMES.GLOBAL_POLICIES} 
         WHERE region = $1 OR region = 'GLOBAL'
         ORDER BY notification_type, channel`,
        [region]
      );

      return result.rows.map(row => this.rowToEntity(row));
    } catch (error) {
      console.error('Error getting policies by region:', error);
      throw new Error(`Failed to get policies by region: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert database row to domain entity
   */
  private rowToEntity(row: GlobalPolicyModel): GlobalPolicy {
    return new GlobalPolicy(
      row.id,
      row.notification_type,
      row.channel,
      row.region,
      row.enabled,
      row.description,
      row.created_at,
      row.updated_at
    );
  }
}