/**
 * Business scenario tests based on requirements
 */

import { 
  UserPreferences,
  GlobalPolicy,
  NotificationEvaluator,
  DefaultPreferencesService
} from '../domain/index.js';
import { TestUtils, TEST_CONSTANTS } from './test-utils.js';

describe('Business Scenarios from Requirements', () => {
  let evaluator: NotificationEvaluator;
  let defaultPreferencesService: DefaultPreferencesService;

  beforeEach(() => {
    evaluator = new NotificationEvaluator();
    defaultPreferencesService = DefaultPreferencesService.createWithCommonDefaults();
  });

  describe('Scenario 1: New User and Defaults', () => {
    test('new user should have default preferences', () => {
      const userId = 'new-user-123';
      const defaultPreferences = defaultPreferencesService.toNotificationPreferences();
      
      const userPreferences = UserPreferences.createWithDefaults(userId, defaultPreferences);
      
      // Check that defaults are applied
      expect(userPreferences.isEnabled('transactional_email', 'email')).toBe(true);
      expect(userPreferences.isEnabled('marketing_email', 'email')).toBe(false);
      expect(userPreferences.isEnabled('security_alert', 'email')).toBe(true);
      expect(userPreferences.isEnabled('system_notification', 'in_app')).toBe(true);
      
      // User should not have quiet hours by default
      expect(userPreferences.quietHours).toBeUndefined();
    });

    test('default preferences should be sensible', () => {
      const defaultPreferences = defaultPreferencesService.getAll();
      
      // Transactional notifications should be enabled
      const transactionalEmail = defaultPreferences.find(
        p => p.notificationType === 'transactional_email' && p.channel === 'email'
      );
      expect(transactionalEmail?.enabled).toBe(true);
      
      // Marketing notifications should be disabled
      const marketingEmail = defaultPreferences.find(
        p => p.notificationType === 'marketing_email' && p.channel === 'email'
      );
      expect(marketingEmail?.enabled).toBe(false);
      
      // Security alerts should be enabled (high priority)
      const securityAlertEmail = defaultPreferences.find(
        p => p.notificationType === 'security_alert' && p.channel === 'email'
      );
      expect(securityAlertEmail?.enabled).toBe(true);
      expect(securityAlertEmail?.priority).toBeLessThan(20); // High priority
    });
  });

  describe('Scenario 2: User Changes Preferences', () => {
    test('user can disable marketing emails', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      
      // Initially marketing email is disabled
      expect(userPreferences.isEnabled('marketing_email', 'email')).toBe(false);
      
      // User enables it
      userPreferences.updatePreference('marketing_email', 'email', true);
      expect(userPreferences.isEnabled('marketing_email', 'email')).toBe(true);
      
      // User disables it
      userPreferences.updatePreference('marketing_email', 'email', false);
      expect(userPreferences.isEnabled('marketing_email', 'email')).toBe(false);
      
      // Transactional email should remain enabled
      expect(userPreferences.isEnabled('transactional_email', 'email')).toBe(true);
    });

    test('preference changes are reflected in evaluation', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      const globalPolicies: GlobalPolicy[] = [];
      
      // Initially marketing email is disabled
      const request1 = {
        userId,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };
      
      let result = evaluator.evaluate(request1, userPreferences, globalPolicies);
      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('user_preference_disabled');
      
      // User enables marketing email
      userPreferences.updatePreference('marketing_email', 'email', true);
      
      // Now it should be allowed (outside quiet hours)
      result = evaluator.evaluate(request1, userPreferences, globalPolicies);
      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('notification_allowed');
    });
  });

  describe('Scenario 3: Quiet Hours', () => {
    test('marketing notifications are blocked during quiet hours', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      const globalPolicies: GlobalPolicy[] = [];
      
      // Enable marketing email
      userPreferences.updatePreference('marketing_email', 'email', true);
      
      // Test during quiet hours
      const requestDuring = {
        userId,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.DURING_QUIET_HOURS
      };
      
      let result = evaluator.evaluate(requestDuring, userPreferences, globalPolicies);
      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('quiet_hours_active');
      
      // Test outside quiet hours
      const requestOutside = {
        userId,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };
      
      result = evaluator.evaluate(requestOutside, userPreferences, globalPolicies);
      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('notification_allowed');
    });

    test('transactional notifications are allowed during quiet hours', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      const globalPolicies: GlobalPolicy[] = [];
      
      // Test during quiet hours
      const request = {
        userId,
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.DURING_QUIET_HOURS
      };
      
      const result = evaluator.evaluate(request, userPreferences, globalPolicies);
      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('notification_allowed');
    });

    test('security alerts are allowed during quiet hours', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      const globalPolicies: GlobalPolicy[] = [];
      
      // Add security alert preference
      userPreferences.updatePreference('security_alert', 'email', true);
      
      // Test during quiet hours
      const request = {
        userId,
        notificationType: 'security_alert' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.DURING_QUIET_HOURS
      };
      
      const result = evaluator.evaluate(request, userPreferences, globalPolicies);
      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('notification_allowed');
    });
  });

  describe('Scenario 4: Global Policies', () => {
    test('global policy blocks notification in specific region', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      
      // Create blocking global policy for EU
      const blockingPolicy = new GlobalPolicy(
        'eu-marketing-sms-block',
        'marketing_sms',
        'sms',
        'EU',
        false,
        'Marketing SMS blocked in EU'
      );
      
      const globalPolicies = [blockingPolicy];
      
      // Enable marketing SMS for user
      userPreferences.updatePreference('marketing_sms', 'sms', true);
      
      // Test in EU region (should be blocked)
      const requestEU = {
        userId,
        notificationType: 'marketing_sms' as const,
        channel: 'sms' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };
      
      let result = evaluator.evaluate(requestEU, userPreferences, globalPolicies);
      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('global_policy_blocked');
      
      // Test in US region (should be allowed)
      const requestUS = {
        userId,
        notificationType: 'marketing_sms' as const,
        channel: 'sms' as const,
        region: 'US' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };
      
      result = evaluator.evaluate(requestUS, userPreferences, globalPolicies);
      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('notification_allowed');
    });

    test('GLOBAL policy blocks notification in all regions', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      
      // Create GLOBAL blocking policy
      const globalBlockingPolicy = new GlobalPolicy(
        'global-marketing-push-block',
        'marketing_push',
        'push',
        'GLOBAL',
        false,
        'Marketing push blocked globally'
      );
      
      const globalPolicies = [globalBlockingPolicy];
      
      // Enable marketing push for user
      userPreferences.updatePreference('marketing_push', 'push', true);
      
      // Test in different regions (all should be blocked)
      const regions = ['US', 'EU', 'APAC', 'LATAM', 'MEA'];
      
      regions.forEach(region => {
        const request = {
          userId,
          notificationType: 'marketing_push' as const,
          channel: 'push' as const,
          region: region as any,
          datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
        };
        
        const result = evaluator.evaluate(request, userPreferences, globalPolicies);
        expect(result.decision).toBe('deny');
        expect(result.reason).toBe('global_policy_blocked');
      });
    });

    test('global policy overrides user preference', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      
      // Create blocking policy
      const blockingPolicy = new GlobalPolicy(
        'blocking-policy',
        'marketing_email',
        'email',
        'EU',
        false,
        'Override test'
      );
      
      const globalPolicies = [blockingPolicy];
      
      // User has enabled marketing email
      userPreferences.updatePreference('marketing_email', 'email', true);
      
      const request = {
        userId,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };
      
      // Even though user enabled it, global policy should block
      const result = evaluator.evaluate(request, userPreferences, globalPolicies);
      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('global_policy_blocked');
    });
  });

  describe('Scenario 5: Idempotent Operations', () => {
    test('repeated preference updates are idempotent', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      
      const initialUpdatedAt = userPreferences.updatedAt.getTime();
      
      // First update
      const changed1 = userPreferences.updatePreference('transactional_email', 'email', false);
      expect(changed1).toBe(true);
      const updatedAt1 = userPreferences.updatedAt.getTime();
      expect(updatedAt1).toBeGreaterThan(initialUpdatedAt);
      
      // Second identical update
      const changed2 = userPreferences.updatePreference('transactional_email', 'email', false);
      expect(changed2).toBe(false);
      const updatedAt2 = userPreferences.updatedAt.getTime();
      expect(updatedAt2).toBe(updatedAt1); // No change
      
      // Third different update
      const changed3 = userPreferences.updatePreference('transactional_email', 'email', true);
      expect(changed3).toBe(true);
      const updatedAt3 = userPreferences.updatedAt.getTime();
      expect(updatedAt3).toBeGreaterThan(updatedAt2);
    });

    test('mergePreferences is idempotent', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      
      const samePreferences = [
        {
          notificationType: 'transactional_email' as const,
          channel: 'email' as const,
          enabled: true, // Same as current
          updatedAt: new Date()
        }
      ];
      
      // First merge
      const changes1 = userPreferences.mergePreferences(samePreferences);
      expect(changes1).toBe(0); // No changes
      
      // Second merge
      const changes2 = userPreferences.mergePreferences(samePreferences);
      expect(changes2).toBe(0); // Still no changes
    });
  });

  describe('Complex Scenarios', () => {
    test('combination of all rules', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      
      // Setup complex scenario:
      // 1. User has enabled marketing email
      userPreferences.updatePreference('marketing_email', 'email', true);
      
      // 2. Global policy blocks marketing email in EU
      const euBlockingPolicy = new GlobalPolicy(
        'eu-email-block',
        'marketing_email',
        'email',
        'EU',
        false,
        'GDPR compliance'
      );
      
      // 3. Different quiet hours
      userPreferences.updateQuietHours({
        start: { hour: 20, minute: 0 },
        end: { hour: 6, minute: 0 },
        timezone: 'UTC',
        days: ['all'] as any[]
      });
      
      const globalPolicies = [euBlockingPolicy];
      
      // Test 1: EU region during quiet hours
      const request1 = {
        userId,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: new Date('2026-05-26T21:30:00Z') // During quiet hours
      };
      
      let result = evaluator.evaluate(request1, userPreferences, globalPolicies);
      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('global_policy_blocked'); // Global policy takes precedence
      
      // Test 2: US region during quiet hours
      const request2 = {
        userId,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'US' as const,
        datetime: new Date('2026-05-26T21:30:00Z') // During quiet hours
      };
      
      result = evaluator.evaluate(request2, userPreferences, globalPolicies);
      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('quiet_hours_active'); // Quiet hours block it
      
      // Test 3: US region outside quiet hours
      const request3 = {
        userId,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'US' as const,
        datetime: new Date('2026-05-26T14:30:00Z') // Outside quiet hours
      };
      
      result = evaluator.evaluate(request3, userPreferences, globalPolicies);
      expect(result.decision).toBe('allow'); // All conditions met
      expect(result.reason).toBe('notification_allowed');
      
      // Test 4: Transactional email in EU during quiet hours
      const request4 = {
        userId,
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: new Date('2026-05-26T21:30:00Z') // During quiet hours
      };
      
      result = evaluator.evaluate(request4, userPreferences, globalPolicies);
      expect(result.decision).toBe('allow'); // Transactional allowed during quiet hours
      expect(result.reason).toBe('notification_allowed');
    });
  });

  describe('Edge Cases', () => {
    test('user without preferences uses defaults', () => {
      const userId = 'user-without-prefs';
      const defaultPreferences = defaultPreferencesService.toNotificationPreferences();
      const userPreferences = UserPreferences.createWithDefaults(userId, defaultPreferences);
      
      // Should have default preferences
      expect(userPreferences.preferences.length).toBeGreaterThan(0);
      expect(userPreferences.isEnabled('transactional_email', 'email')).toBe(true);
      expect(userPreferences.isEnabled('marketing_email', 'email')).toBe(false);
    });

    test('empty global policies list', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      const emptyGlobalPolicies: GlobalPolicy[] = [];
      
      const request = {
        userId,
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };
      
      const result = evaluator.evaluate(request, userPreferences, emptyGlobalPolicies);
      expect(result.decision).toBe('allow');
    });

    test('multiple conflicting global policies', () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const userPreferences = TestUtils.createTestUserPreferences(userId);
      
      // Create conflicting policies
      const blockingPolicy = new GlobalPolicy(
        'blocking',
        'marketing_email',
        'email',
        'EU',
        false,
        'Block in EU'
      );
      
      const allowingPolicy = new GlobalPolicy(
        'allowing',
        'marketing_email',
        'email',
        'EU',
        true,
        'Allow in EU'
      );
      
      // Both policies exist (conflict in real system, but evaluator will find the blocking one first)
      const globalPolicies = [blockingPolicy, allowingPolicy];
      
      // Enable preference
      userPreferences.updatePreference('marketing_email', 'email', true);
      
      const request = {
        userId,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };
      
      // Should be blocked (first blocking policy found)
      const result = evaluator.evaluate(request, userPreferences, globalPolicies);
      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('global_policy_blocked');
    });
  });
});