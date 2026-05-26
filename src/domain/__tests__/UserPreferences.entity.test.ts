/**
 * UserPreferences entity tests
 */

import { UserPreferences } from '../entities/UserPreferences.entity.js';
import { TestUtils, TEST_CONSTANTS } from '../../__tests__/test-utils.js';

describe('UserPreferences Entity', () => {
  let userPreferences: UserPreferences;
  const userId = TEST_CONSTANTS.TEST_USER_ID;

  beforeEach(() => {
    userPreferences = TestUtils.createTestUserPreferences(userId);
  });

  describe('Constructor', () => {
    test('should create UserPreferences with correct properties', () => {
      expect(userPreferences.userId).toBe(userId);
      expect(userPreferences.preferences).toHaveLength(4);
      expect(userPreferences.quietHours).toBeDefined();
      expect(userPreferences.createdAt).toBeInstanceOf(Date);
      expect(userPreferences.updatedAt).toBeInstanceOf(Date);
    });

    test('should create UserPreferences without quiet hours', () => {
      const prefs = new UserPreferences(userId, [], undefined);
      expect(prefs.quietHours).toBeUndefined();
    });
  });

  describe('getPreference', () => {
    test('should return preference for existing notification type and channel', () => {
      const preference = userPreferences.getPreference('transactional_email', 'email');
      expect(preference).toBeDefined();
      expect(preference?.notificationType).toBe('transactional_email');
      expect(preference?.channel).toBe('email');
      expect(preference?.enabled).toBe(true);
    });

    test('should return undefined for non-existent preference', () => {
      const preference = userPreferences.getPreference('non_existent', 'email');
      expect(preference).toBeUndefined();
    });
  });

  describe('isEnabled', () => {
    test('should return true for enabled preference', () => {
      const isEnabled = userPreferences.isEnabled('transactional_email', 'email');
      expect(isEnabled).toBe(true);
    });

    test('should return false for disabled preference', () => {
      const isEnabled = userPreferences.isEnabled('marketing_email', 'email');
      expect(isEnabled).toBe(false);
    });

    test('should return false for non-existent preference', () => {
      const isEnabled = userPreferences.isEnabled('non_existent', 'email');
      expect(isEnabled).toBe(false);
    });
  });

  describe('updatePreference', () => {
    test('should update existing preference', () => {
      const initialUpdatedAt = userPreferences.updatedAt;
      
      // Wait a bit to ensure different timestamps
      TestUtils.sleep(1);
      
      const changed = userPreferences.updatePreference('transactional_email', 'email', false);
      
      expect(changed).toBe(true);
      expect(userPreferences.isEnabled('transactional_email', 'email')).toBe(false);
      expect(userPreferences.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    test('should add new preference', () => {
      const initialCount = userPreferences.preferences.length;
      const changed = userPreferences.updatePreference('security_alert', 'email', true);
      
      expect(changed).toBe(true);
      expect(userPreferences.preferences).toHaveLength(initialCount + 1);
      expect(userPreferences.isEnabled('security_alert', 'email')).toBe(true);
    });

    test('should be idempotent - no change for same value', () => {
      const initialUpdatedAt = userPreferences.updatedAt;
      
      // First update
      userPreferences.updatePreference('transactional_email', 'email', false);
      const updatedAtAfterFirst = userPreferences.updatedAt;
      
      // Second update with same value
      const changed = userPreferences.updatePreference('transactional_email', 'email', false);
      
      expect(changed).toBe(false);
      expect(userPreferences.updatedAt.getTime()).toBe(updatedAtAfterFirst.getTime());
      expect(userPreferences.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });

  describe('updateQuietHours', () => {
    test('should update quiet hours', () => {
      const initialUpdatedAt = userPreferences.updatedAt;
      
      TestUtils.sleep(1);
      
      const newQuietHours = {
        start: { hour: 21, minute: 30 },
        end: { hour: 7, minute: 30 },
        timezone: 'America/New_York',
        days: ['monday', 'tuesday', 'wednesday'] as any[]
      };
      
      userPreferences.updateQuietHours(newQuietHours);
      
      expect(userPreferences.quietHours).toEqual(newQuietHours);
      expect(userPreferences.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    test('should set quiet hours if undefined', () => {
      const prefs = new UserPreferences(userId, [], undefined);
      const quietHours = TestUtils.createTestQuietHours();
      
      prefs.updateQuietHours(quietHours);
      
      expect(prefs.quietHours).toEqual(quietHours);
    });
  });

  describe('isQuietHoursActive', () => {
    test('should return false when quiet hours are undefined', () => {
      const prefs = new UserPreferences(userId, [], undefined);
      const isActive = prefs.isQuietHoursActive(new Date(), 'UTC');
      
      expect(isActive).toBe(false);
    });

    test('should return true during quiet hours', () => {
      const checkTime = TEST_CONSTANTS.TEST_DATES.DURING_QUIET_HOURS;
      const isActive = userPreferences.isQuietHoursActive(checkTime, 'UTC');
      
      expect(isActive).toBe(true);
    });

    test('should return false outside quiet hours', () => {
      const checkTime = TEST_CONSTANTS.TEST_DATES.OUTSIDE_QUIET_HOURS;
      const isActive = userPreferences.isQuietHoursActive(checkTime, 'UTC');
      
      expect(isActive).toBe(false);
    });

    test('should handle overnight quiet hours', () => {
      // Set quiet hours from 22:00 to 08:00
      userPreferences.updateQuietHours({
        start: { hour: 22, minute: 0 },
        end: { hour: 8, minute: 0 },
        timezone: 'UTC',
        days: ['all'] as any[]
      });
      
      // Test at 23:00 (during quiet hours)
      const during = new Date('2026-05-26T23:00:00Z');
      expect(userPreferences.isQuietHoursActive(during, 'UTC')).toBe(true);
      
      // Test at 02:00 (during quiet hours, next day)
      const overnight = new Date('2026-05-27T02:00:00Z');
      expect(userPreferences.isQuietHoursActive(overnight, 'UTC')).toBe(true);
      
      // Test at 14:00 (outside quiet hours)
      const outside = new Date('2026-05-26T14:00:00Z');
      expect(userPreferences.isQuietHoursActive(outside, 'UTC')).toBe(false);
    });
  });

  describe('getEnabledPreferences', () => {
    test('should return only enabled preferences', () => {
      const enabled = userPreferences.getEnabledPreferences();
      
      expect(enabled).toHaveLength(2); // transactional_email and transactional_sms
      enabled.forEach(pref => {
        expect(pref.enabled).toBe(true);
      });
    });
  });

  describe('getDisabledPreferences', () => {
    test('should return only disabled preferences', () => {
      const disabled = userPreferences.getDisabledPreferences();
      
      expect(disabled).toHaveLength(2); // marketing_email and marketing_sms
      disabled.forEach(pref => {
        expect(pref.enabled).toBe(false);
      });
    });
  });

  describe('createWithDefaults', () => {
    test('should create UserPreferences with default preferences', () => {
      const defaultPreferences = TestUtils.createTestPreferences();
      const prefs = UserPreferences.createWithDefaults(userId, defaultPreferences);
      
      expect(prefs.userId).toBe(userId);
      expect(prefs.preferences).toHaveLength(defaultPreferences.length);
      expect(prefs.preferences[0].updatedAt).toBeInstanceOf(Date);
      expect(prefs.quietHours).toBeUndefined();
    });
  });

  describe('mergePreferences', () => {
    test('should merge preferences and return number of changes', () => {
      const initialCount = userPreferences.preferences.length;
      const newPreferences = [
        {
          notificationType: 'transactional_email' as const,
          channel: 'email' as const,
          enabled: false, // Change from true to false
          updatedAt: new Date()
        },
        {
          notificationType: 'security_alert' as const,
          channel: 'email' as const,
          enabled: true, // New preference
          updatedAt: new Date()
        }
      ];
      
      const changes = userPreferences.mergePreferences(newPreferences);
      
      expect(changes).toBe(2); // One update, one addition
      expect(userPreferences.preferences).toHaveLength(initialCount + 1); // Added one new
      expect(userPreferences.isEnabled('transactional_email', 'email')).toBe(false);
      expect(userPreferences.isEnabled('security_alert', 'email')).toBe(true);
    });

    test('should return 0 for idempotent merge', () => {
      const existingPreference = {
        notificationType: 'transactional_email' as const,
        channel: 'email' as const,
        enabled: true, // Same as current value
        updatedAt: new Date()
      };
      
      const changes = userPreferences.mergePreferences([existingPreference]);
      
      expect(changes).toBe(0);
    });
  });
});