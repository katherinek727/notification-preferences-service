/**
 * Database connection manager
 */

import { Pool, PoolConfig, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Database connection manager
 */
export class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor(config: DatabaseConfig) {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    };

    this.pool = new Pool(poolConfig);

    // Set up error handling
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      const config = this.getConfigFromEnv();
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  /**
   * Get configuration from environment variables
   */
  private static getConfigFromEnv(): DatabaseConfig {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      // Parse DATABASE_URL format: postgresql://user:password@host:port/database
      const url = new URL(databaseUrl);
      
      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.substring(1), // Remove leading slash
        user: url.username,
        password: url.password,
        ssl: url.searchParams.get('sslmode') !== 'disable',
      };
    }
    
    // Fallback to individual environment variables
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'notification_preferences',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true',
    };
  }

  /**
   * Get a client from the pool
   */
  public async getClient() {
    return await this.pool.connect();
  }

  /**
   * Execute a query
   */
  public async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const client = await this.getClient();
    
    try {
      const result = await client.query<T>(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a transaction
   */
  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is connected
   */
  public async isConnected(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }

  /**
   * Close the connection pool
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Create a test connection (for testing environment)
   */
  public static createTestConnection(): DatabaseConnection {
    const testConfig: DatabaseConfig = {
      host: process.env.DB_TEST_HOST || 'localhost',
      port: parseInt(process.env.DB_TEST_PORT || '5433'),
      database: process.env.DB_TEST_NAME || 'notification_preferences_test',
      user: process.env.DB_TEST_USER || 'postgres',
      password: process.env.DB_TEST_PASSWORD || 'password',
      ssl: false,
      maxConnections: 5,
    };

    return new DatabaseConnection(testConfig);
  }

  /**
   * Migrate database (run migrations)
   */
  public async migrate(): Promise<void> {
    try {
      // This would run migration scripts
      // For now, we'll just check connection
      console.log('Database migration would run here');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

/**
 * Export singleton instance
 */
export const db = DatabaseConnection.getInstance();