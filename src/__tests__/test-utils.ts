/**
 * Test utilities for Notification Preferences Service
 */

import { 
  NotificationType, 
  Channel, 
  Region,
  Timezone,
  DayOfWeek,
  NotificationPreference,
  QuietHours,
  UserPreferences,
  GlobalPolicy
} from '../domain/index.js';

/**
 * Test data generators
 */
export class TestUtils {
  /**
   * Generate a random user ID
   */
  static generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a random policy ID
   */
  static generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create test notification preferences
   */
  static createTestPreferences(): NotificationPreference[] {
    return [
      {
        notificationType: 'transactional_email',
        channel: 'email',
        enabled: true,
        updatedAt: new Date()
      },
      {
        notificationType: 'marketing_email',
        channel: 'email',
        enabled: false,
        updatedAt: new Date()
      },
      {
        notificationType: 'transactional_sms',
        channel: 'sms',
        enabled: true,
        updatedAt: new Date()
      },
      {
        notificationType: 'marketing_sms',
        channel: 'sms',
        enabled: false,
        updatedAt: new Date()
      }
    ];
  }

  /**
   * Create test quiet hours
   */
  static createTestQuietHours(): QuietHours {
    return {
      start: { hour: 22, minute: 0 },
      end: { hour: 8, minute: 0 },
      timezone: 'UTC',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    };
  }

  /**
   * Create test user preferences
   */
  static createTestUserPreferences(userId?: string): UserPreferences {
    return new UserPreferences(
      userId || this.generateUserId(),
      this.createTestPreferences(),
      this.createTestQuietHours(),
      new Date(),
      new Date()
    );
  }

  /**
   * Create test global policy
   */
  static createTestGlobalPolicy(): GlobalPolicy {
    return new GlobalPolicy(
      this.generatePolicyId(),
      'marketing_sms',
      'sms',
      'EU',
      false,
      'Test blocking policy',
      new Date(),
      new Date()
    );
  }

  /**
   * Create test notification evaluation request
   */
  static createTestEvaluationRequest(userId?: string) {
    return {
      userId: userId || this.generateUserId(),
      notificationType: 'marketing_email' as NotificationType,
      channel: 'email' as Channel,
      region: 'EU' as Region,
      datetime: new Date().toISOString()
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mock database connection for testing
   */
  static createMockDatabaseConnection() {
    return {
      query: jest.fn(),
      transaction: jest.fn(),
      getClient: jest.fn(),
      isConnected: jest.fn().mockResolvedValue(true),
      close: jest.fn(),
      getStats: jest.fn()
    };
  }

  /**
   * Mock repository for testing
   */
  static createMockUserPreferencesRepository() {
    return {
      getUserPreferences: jest.fn(),
      saveUserPreferences: jest.fn(),
      deleteUserPreferences: jest.fn(),
      getUserIdsWithPreferences: jest.fn(),
      countUsers: jest.fn(),
      updateSinglePreference: jest.fn(),
      getUsersWithPreference: jest.fn(),
      hasPreference: jest.fn()
    };
  }

  /**
   * Mock repository for testing
   */
  static createMockGlobalPoliciesRepository() {
    return {
      getGlobalPolicy: jest.fn(),
      getGlobalPolicies: jest.fn(),
      getGlobalPoliciesByFilter: jest.fn(),
      saveGlobalPolicy: jest.fn(),
      deleteGlobalPolicy: jest.fn(),
      countPolicies: jest.fn(),
      getBlockingPolicies: jest.fn(),
      policyExists: jest.fn(),
      getPoliciesByRegion: jest.fn()
    };
  }

  /**
   * Mock repository for testing
   */
  static createMockDefaultPreferencesRepository() {
    return {
      getDefaultPreferences: jest.fn(),
      getDefaultPreference: jest.fn(),
      saveDefaultPreference: jest.fn(),
      deleteDefaultPreference: jest.fn(),
      setDefaultPreference: jest.fn(),
      getEnabledDefaultPreferences: jest.fn(),
      getDisabledDefaultPreferences: jest.fn(),
      isEnabledByDefault: jest.fn(),
      initializeWithCommonDefaults: jest.fn(),
      clearAll: jest.fn()
    };
  }

  /**
   * Assert that an error is a specific domain exception
   */
  static assertDomainError(error: unknown, expectedCode: string): void {
    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toContain(expectedCode);
    }
  }

  /**
   * Create a test Express request
   */
  static createMockRequest(overrides: any = {}): any {
    return {
      params: {},
      query: {},
      body: {},
      headers: {},
      id: 'test-request-id',
      ...overrides
    };
  }

  /**
   * Create a test Express response
   */
  static createMockResponse(): any {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  }

  /**
   * Create a test Express next function
   */
  static createMockNext(): jest.Mock {
    return jest.fn();
  }

  /**
   * Validate API response structure
   */
  static validateApiResponse(response: any, expectedStatus: number = 200): void {
    expect(response.status).toHaveBeenCalledWith(expectedStatus);
    expect(response.json).toHaveBeenCalled();
    
    const responseBody = response.json.mock.calls[0][0];
    expect(responseBody).toHaveProperty('success');
    expect(responseBody.success).toBe(true);
    expect(responseBody).toHaveProperty('data');
  }

  /**
   * Validate API error response
   */
  static validateApiErrorResponse(response: any, expectedStatus: number, expectedCode: string): void {
    expect(response.status).toHaveBeenCalledWith(expectedStatus);
    expect(response.json).toHaveBeenCalled();
    
    const responseBody = response.json.mock.calls[0][0];
    expect(responseBody).toHaveProperty('success');
    expect(responseBody.success).toBe(false);
    expect(responseBody).toHaveProperty('error');
    expect(responseBody.error).toHaveProperty('code', expectedCode);
  }
}

/**
 * Test constants
 */
export const TEST_CONSTANTS = {
  // Test user IDs
  TEST_USER_ID: 'test-user-123',
  TEST_USER_ID_2: 'test-user-456',
  
  // Test notification types
  TEST_NOTIFICATION_TYPES: {
    TRANSACTIONAL_EMAIL: 'transactional_email' as NotificationType,
    MARKETING_EMAIL: 'marketing_email' as NotificationType,
    TRANSACTIONAL_SMS: 'transactional_sms' as NotificationType,
    MARKETING_SMS: 'marketing_sms' as NotificationType,
    SECURITY_ALERT: 'security_alert' as NotificationType,
    SYSTEM_NOTIFICATION: 'system_notification' as NotificationType
  },
  
  // Test channels
  TEST_CHANNELS: {
    EMAIL: 'email' as Channel,
    SMS: 'sms' as Channel,
    PUSH: 'push' as Channel,
    IN_APP: 'in_app' as Channel
  },
  
  // Test regions
  TEST_REGIONS: {
    US: 'US' as Region,
    EU: 'EU' as Region,
    APAC: 'APAC' as Region,
    GLOBAL: 'GLOBAL' as Region
  },
  
  // Test timezones
  TEST_TIMEZONES: {
    UTC: 'UTC' as Timezone,
    LONDON: 'Europe/London' as Timezone,
    NEW_YORK: 'America/New_York' as Timezone
  },
  
  // Test days of week
  TEST_DAYS: {
    MONDAY: 'monday' as DayOfWeek,
    TUESDAY: 'tuesday' as DayOfWeek,
    WEDNESDAY: 'wednesday' as DayOfWeek,
    THURSDAY: 'thursday' as DayOfWeek,
    FRIDAY: 'friday' as DayOfWeek,
    SATURDAY: 'saturday' as DayOfWeek,
    SUNDAY: 'sunday' as DayOfWeek,
    ALL: 'all' as DayOfWeek
  },
  
  // Test quiet hours
  TEST_QUIET_HOURS: {
    START: { hour: 22, minute: 0 },
    END: { hour: 8, minute: 0 },
    DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]
  },
  
  // Test dates
  TEST_DATES: {
    NOW: new Date(),
    TOMORROW: new Date(Date.now() + 24 * 60 * 60 * 1000),
    YESTERDAY: new Date(Date.now() - 24 * 60 * 60 * 1000),
    
    // Specific times for quiet hours testing
    DURING_QUIET_HOURS: new Date('2026-05-26T23:30:00Z'), // 23:30 UTC
    OUTSIDE_QUIET_HOURS: new Date('2026-05-26T14:30:00Z'), // 14:30 UTC
    AT_QUIET_HOURS_START: new Date('2026-05-26T22:00:00Z'), // 22:00 UTC
    AT_QUIET_HOURS_END: new Date('2026-05-26T08:00:00Z') // 08:00 UTC
  }
} as const;