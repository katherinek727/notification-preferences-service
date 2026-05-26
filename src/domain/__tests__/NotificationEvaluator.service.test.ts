/**
 * NotificationEvaluator service tests
 */

import { NotificationEvaluator } from '../services/NotificationEvaluator.service.js';
import { UserPreferences } from '../entities/UserPreferences.entity.js';
import { GlobalPolicy } from '../entities/GlobalPolicy.entity.js';
import { TestUtils, TEST_CONSTANTS } from '../../__tests__/test-utils.js';

describe('NotificationEvaluator Service', () => {
  let evaluator: NotificationEvaluator;
  let userPreferences: UserPreferences;
  let globalPolicies: GlobalPolicy[];

  beforeEach(() => {
    evaluator = new NotificationEvaluator();
    userPreferences = TestUtils.createTestUserPreferences(TEST_CONSTANTS.TEST_USER_ID);
    globalPolicies = [];
  });

  describe('evaluate', () => {
    test('should allow notification when all conditions are met', () => {
      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };

      const result = evaluator.evaluate(request, userPreferences, globalPolicies);

      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('notification_allowed');
    });

    test('should deny notification when user not found', () => {
      const request = {
        userId: 'non-existent-user',
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: new Date()
      };

      const result = evaluator.evaluate(request, null, globalPolicies);

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('user_not_found');
    });

    test('should deny notification when blocked by global policy', () => {
      // Add a blocking global policy
      const blockingPolicy = new GlobalPolicy(
        'test-policy-1',
        'marketing_email',
        'email',
        'EU',
        false,
        'Blocked in EU region'
      );
      globalPolicies.push(blockingPolicy);

      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };

      const result = evaluator.evaluate(request, userPreferences, globalPolicies);

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('global_policy_blocked');
      expect(result.details).toContain('Blocked by global policy');
    });

    test('should deny notification when user preference is disabled', () => {
      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };

      const result = evaluator.evaluate(request, userPreferences, globalPolicies);

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('user_preference_disabled');
      expect(result.details).toContain('User has disabled');
    });

    test('should deny marketing notification during quiet hours', () => {
      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.DURING_QUIET_HOURS
      };

      // Enable the preference first
      userPreferences.updatePreference('marketing_email', 'email', true);

      const result = evaluator.evaluate(request, userPreferences, globalPolicies);

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('quiet_hours_active');
    });

    test('should allow transactional notification during quiet hours', () => {
      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.DURING_QUIET_HOURS
      };

      const result = evaluator.evaluate(request, userPreferences, globalPolicies);

      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('notification_allowed');
    });

    test('should allow security alert during quiet hours', () => {
      // Add security alert preference
      userPreferences.updatePreference('security_alert', 'email', true);

      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'security_alert' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: TEST_CONSTANTS.TEST_DATES.DURING_QUIET_HOURS
      };

      const result = evaluator.evaluate(request, userPreferences, globalPolicies);

      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('notification_allowed');
    });

    test('should respect GLOBAL region policies', () => {
      // Add a GLOBAL blocking policy
      const globalBlockingPolicy = new GlobalPolicy(
        'test-policy-2',
        'marketing_sms',
        'sms',
        'GLOBAL',
        false,
        'Blocked globally'
      );
      globalPolicies.push(globalBlockingPolicy);

      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'marketing_sms' as const,
        channel: 'sms' as const,
        region: 'US' as const, // Different region, but GLOBAL policy applies
        datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
      };

      // Enable the preference
      userPreferences.updatePreference('marketing_sms', 'sms', true);

      const result = evaluator.evaluate(request, userPreferences, globalPolicies);

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('global_policy_blocked');
    });
  });

  describe('evaluateBatch', () => {
    test('should evaluate multiple notifications', () => {
      const requests = [
        {
          userId: TEST_CONSTANTS.TEST_USER_ID,
          notificationType: 'transactional_email' as const,
          channel: 'email' as const,
          region: 'EU' as const,
          datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
        },
        {
          userId: TEST_CONSTANTS.TEST_USER_ID,
          notificationType: 'marketing_email' as const,
          channel: 'email' as const,
          region: 'EU' as const,
          datetime: TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS
        }
      ];

      const results = evaluator.evaluateBatch(requests, userPreferences, globalPolicies);

      expect(results).toHaveLength(2);
      expect(results[0].decision).toBe('allow');
      expect(results[1].decision).toBe('deny');
    });
  });

  describe('getEvaluationSummary', () => {
    test('should generate correct summary statistics', () => {
      const results = [
        { decision: 'allow' as const, reason: 'notification_allowed' as const, evaluatedAt: new Date() },
        { decision: 'deny' as const, reason: 'user_preference_disabled' as const, evaluatedAt: new Date() },
        { decision: 'allow' as const, reason: 'notification_allowed' as const, evaluatedAt: new Date() },
        { decision: 'deny' as const, reason: 'global_policy_blocked' as const, evaluatedAt: new Date() },
        { decision: 'deny' as const, reason: 'user_preference_disabled' as const, evaluatedAt: new Date() }
      ];

      const summary = evaluator.getEvaluationSummary(results);

      expect(summary.total).toBe(5);
      expect(summary.allowed).toBe(2);
      expect(summary.denied).toBe(3);
      expect(summary.reasons.notification_allowed).toBe(2);
      expect(summary.reasons.user_preference_disabled).toBe(2);
      expect(summary.reasons.global_policy_blocked).toBe(1);
    });
  });

  describe('validateRequest', () => {
    test('should return null for valid request', () => {
      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: new Date()
      };

      const error = evaluator.validateRequest(request);

      expect(error).toBeNull();
    });

    test('should return error for missing userId', () => {
      const request = {
        userId: '',
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: new Date()
      };

      const error = evaluator.validateRequest(request);

      expect(error).toBe('User ID is required');
    });

    test('should return error for missing notificationType', () => {
      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: '' as any,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: new Date()
      };

      const error = evaluator.validateRequest(request);

      expect(error).toBe('Notification type is required');
    });

    test('should return error for missing channel', () => {
      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'transactional_email' as const,
        channel: '' as any,
        region: 'EU' as const,
        datetime: new Date()
      };

      const error = evaluator.validateRequest(request);

      expect(error).toBe('Channel is required');
    });

    test('should return error for missing region', () => {
      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: '' as any,
        datetime: new Date()
      };

      const error = evaluator.validateRequest(request);

      expect(error).toBe('Region is required');
    });

    test('should return error for invalid datetime', () => {
      const request = {
        userId: TEST_CONSTANTS.TEST_USER_ID,
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        region: 'EU' as const,
        datetime: new Date('invalid-date')
      };

      const error = evaluator.validateRequest(request);

      expect(error).toBe('Valid datetime is required');
    });
  });

  describe('isMarketingNotification', () => {
    test('should identify marketing notifications', () => {
      // @ts-ignore - accessing private method for testing
      const isMarketing = evaluator.isMarketingNotification;

      expect(isMarketing('marketing_email')).toBe(true);
      expect(isMarketing('marketing_sms')).toBe(true);
      expect(isMarketing('marketing_push')).toBe(true);
      expect(isMarketing('transactional_email')).toBe(false);
      expect(isMarketing('security_alert')).toBe(false);
      expect(isMarketing('system_notification')).toBe(false);
    });
  });
});