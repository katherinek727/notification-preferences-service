/**
 * Database migration runner
 * Run with: node dist/infrastructure/database/migrations/run-migrations.js [up|down]
 */

import { DatabaseConnection } from '../connection.js';
import { createEnumTypesSQL, createTablesSQL, createIndexesSQL, dropTablesSQL } from '../models/index.js';

async function runMigrations() {
  const command = process.argv[2] || 'up';
  const db = DatabaseConnection.getInstance();
  
  console.log(`Running migrations: ${command}`);
  
  try {
    await db.isConnected();
    console.log('Database connected successfully');
    
    if (command === 'up') {
      await migrateUp(db);
    } else if (command === 'down') {
      await migrateDown(db);
    } else {
      console.error('Invalid command. Use "up" or "down"');
      process.exit(1);
    }
    
    console.log(`Migrations ${command} completed successfully`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function migrateUp(db) {
  console.log('Creating enum types...');
  await db.query(createEnumTypesSQL());
  
  console.log('Creating tables...');
  await db.query(createTablesSQL());
  
  console.log('Creating indexes...');
  await db.query(createIndexesSQL());
  
  console.log('Inserting default data...');
  await insertDefaultData(db);
}

async function migrateDown(db) {
  console.log('Dropping tables...');
  await db.query(dropTablesSQL());
}

async function insertDefaultData(db) {
  // Insert common default preferences
  const defaultPreferences = [
    // Transactional notifications
    ['transactional_email', 'email', true, 10],
    ['transactional_sms', 'sms', true, 20],
    ['transactional_push', 'push', true, 30],
    
    // Security alerts
    ['security_alert', 'email', true, 5],
    ['security_alert', 'sms', true, 15],
    ['security_alert', 'push', true, 25],
    
    // System notifications
    ['system_notification', 'in_app', true, 50],
    
    // Marketing notifications
    ['marketing_email', 'email', false, 100],
    ['marketing_sms', 'sms', false, 110],
    ['marketing_push', 'push', false, 120],
  ];
  
  for (const [notificationType, channel, enabled, priority] of defaultPreferences) {
    await db.query(
      `INSERT INTO default_preferences (id, notification_type, channel, enabled, priority, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (notification_type, channel) DO NOTHING`,
      [`default_${notificationType}_${channel}`, notificationType, channel, enabled, priority]
    );
  }
  
  console.log('Default data inserted');
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations };