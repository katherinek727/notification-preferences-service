import { NotificationEvaluator } from '../notification-evaluator';
import { UserPreferences, NotificationPreference, GlobalPolicy } from '../entities';
import { QuietHoursVO, TimeRangeVO, TimezoneVO } from '../value-objects';

describe('NotificationEvaluator', () => {
  let evaluator: NotificationEvaluator;
  let userPreferences: UserPreferences;
  let globalPolicies: GlobalPolicy[];

  beforeEach(() => {
    evaluator = new NotificationEvaluator();
    
    // Create user preferences
    const preferences = [
      NotificationPreference.create('marketing_email', 'email', true),
      NotificationPreference.create('transactional_email', 'email', true),
      NotificationPreference.create('marketing_push', 'push', false),
    ];

    const quietHours = new QuietHoursVO(
      new TimeRangeVO('22:00', '08:00'),
      new TimezoneVO('Europe/London'),
      true
    );

    userPreferences = UserPreferences.create('user-123', preferences, quietHours);

    // Create global policies
    globalPolicies = [
      GlobalPolicy.create('marketing_sms', 'sms', 'EU', false, 'GDPR compliance'),
      GlobalPolicy.create('marketing_email', 'email', 'GLOBAL', true, 'Global email policy'),
    ];
  });

  test('should allow notification when all conditions are met', () => {
    const request = {
      userId: 'user-123',
      notificationType: 'marketing_email' as const,
      channel: 'email' as const,
      region: 'US' as const,
      datetime: new Date('2026-05-21T15:30:00Z')
    };

    const result = evaluator.evaluate(request, userPreferences, globalPolicies);

    expect(result.decision).toBe('allow');
    expect(result.reason).toBe('notification_allowed');
  });

  test('should deny notification when user preference is disabled', () => {
    const request = {
      userId: 'user-123',
      notificationType: 'marketing_push' as const,
      channel: 'push' as const,
      region: 'US' as const,
      datetime: new Date('2026-05-21T15:30:00Z')
    };

    const result = evaluator.evaluate(request, userPreferences, globalPolicies);

    expect(result.decision).toBe('deny');
    expect(result.reason).toBe('user_preference_disabled');
  });

  test('should deny notification during quiet hours for non-transactional notifications', () => {
    const request = {
      userId: 'user-123',
      notificationType: 'marketing_email' as const,
      channel: 'email' as const,
      region: 'US' as const,
      datetime: new Date('2026-05-21T23:30:00Z') // During quiet hours
    };

    const result = evaluator.evaluate(request, userPreferences, globalPolicies);

    expect(result.decision).toBe('deny');
    expect(result.reason).toBe('quiet_hours_active');
  });

  test('should allow transactional notifications during quiet hours', () => {
    const request = {
      userId: 'user-123',
      notificationType: 'transactional_email' as const,
      channel: 'email' as const,
      region: 'US' as const,
      datetime: new Date('2026-05-21T23:30:00Z') // During quiet hours
    };

    const result = evaluator.evaluate(request, userPreferences, globalPolicies);

    expect(result.decision).toBe('allow');
    expect(result.reason).toBe('notification_allowed');
  });

  test('should deny notification when blocked by global policy', () => {
    const request = {
      userId: 'user-123',
      notificationType: 'marketing_sms' as const,
      channel: 'sms' as const,
      region: 'EU' as const,
      datetime: new Date('2026-05-21T15:30:00Z')
    };

    const result = evaluator.evaluate(request, userPreferences, globalPolicies);

    expect(result.decision).toBe('deny');
    expect(result.reason).toBe('global_policy_blocked');
  });

  test('should deny notification when user not found', () => {
    const request = {
      userId: 'user-999',
      notificationType: 'marketing_email' as const,
      channel: 'email' as const,
      region: 'US' as const,
      datetime: new Date('2026-05-21T15:30:00Z')
    };

    const result = evaluator.evaluate(request, null, globalPolicies);

    expect(result.decision).toBe('deny');
    expect(result.reason).toBe('user_not_found');
  });

  test('should handle invalid notification type', () => {
    const request = {
      userId: 'user-123',
      notificationType: 'invalid_type' as any,
      channel: 'email' as const,
      region: 'US' as const,
      datetime: new Date('2026-05-21T15:30:00Z')
    };

    const result = evaluator.evaluate(request, userPreferences, globalPolicies);

    expect(result.decision).toBe('deny');
    expect(result.reason).toBe('invalid_notification_type');
  });

  test('should handle batch evaluation', () => {
    const requests = [
      {
        userId: 'user-123',
        notificationType: 'marketing_email' as const,
        channel: 'email' as const,
        region: 'US' as const,
        datetime: new Date('2026-05-21T15:30:00Z')
      },
      {
        userId: 'user-123',
        notificationType: 'marketing_push' as const,
        channel: 'push' as const,
        region: 'US' as const,
        datetime: new Date('2026-05-21T15:30:00Z')
      }
    ];

    const results = evaluator.evaluateBatch(requests, userPreferences, globalPolicies);

    expect(results).toHaveLength(2);
    expect(results[0].decision).toBe('allow');
    expect(results[1].decision).toBe('deny');
  });
});