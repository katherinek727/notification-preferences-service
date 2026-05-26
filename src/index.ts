/**
 * Notification Preferences Service - Main Entry Point
 */

import dotenv from 'dotenv';
import { ExpressApp } from './infrastructure/api/app.js';
import { INFRASTRUCTURE_CONSTANTS } from './infrastructure/index.js';

// Load environment variables
dotenv.config();

/**
 * Main application class
 */
class NotificationPreferencesService {
  private expressApp: ExpressApp;

  constructor() {
    this.expressApp = new ExpressApp();
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    console.log('Starting Notification Preferences Service...');
    console.log(`Environment: ${INFRASTRUCTURE_CONSTANTS.SERVER.NODE_ENV}`);
    
    const port = INFRASTRUCTURE_CONSTANTS.SERVER.PORT;
    
    try {
      await this.expressApp.start(port);
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('Failed to start service:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        await this.expressApp.shutdown();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  /**
   * Get Express app for testing
   */
  getApp() {
    return this.expressApp.getApp();
  }
}

// Create and start the service
const service = new NotificationPreferencesService();

// Start if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  service.start().catch(error => {
    console.error('Failed to start service:', error);
    process.exit(1);
  });
}

export { service, NotificationPreferencesService };