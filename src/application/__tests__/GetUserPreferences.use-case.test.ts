/**
 * GetUserPreferences use case tests
 */

import { GetUserPreferencesUseCase } from '../use-cases/GetUserPreferences.use-case.js';
import { UserPreferences } from '../../domain/entities/UserPreferences.entity.js';
import { UserNotFoundException } from '../../domain/exceptions/index.js';
import { TestUtils, TEST_CONSTANTS } from '../../__tests__/test-utils.js';

describe('GetUserPreferencesUseCase', () => {
  let useCase: GetUserPreferencesUseCase;
  let mockDependencies: any;

  beforeEach(() => {
    mockDependencies = {
      getUserPreferences: jest.fn()
    };
    
    useCase = new GetUserPreferencesUseCase(mockDependencies);
  });

  describe('execute', () => {
    test('should return user preferences when user exists', async () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const mockUserPreferences = TestUtils.createTestUserPreferences(userId);
      
      mockDependencies.getUserPreferences.mockResolvedValue(mockUserPreferences);

      const result = await useCase.execute({ userId });

      expect(mockDependencies.getUserPreferences).toHaveBeenCalledWith(userId);
      expect(result.preferences.userId).toBe(userId);
      expect(result.preferences.preferences).toHaveLength(4);
      expect(result.preferences.quietHours).toBeDefined();
      expect(result.preferences.createdAt).toBeInstanceOf(Date);
      expect(result.preferences.updatedAt).toBeInstanceOf(Date);
    });

    test('should throw UserNotFoundException when user does not exist', async () => {
      const userId = 'non-existent-user';
      
      mockDependencies.getUserPreferences.mockResolvedValue(null);

      await expect(useCase.execute({ userId }))
        .rejects
        .toThrow(UserNotFoundException);
      
      expect(mockDependencies.getUserPreferences).toHaveBeenCalledWith(userId);
    });

    test('should handle user without quiet hours', async () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const mockUserPreferences = new UserPreferences(userId, [], undefined);
      
      mockDependencies.getUserPreferences.mockResolvedValue(mockUserPreferences);

      const result = await useCase.execute({ userId });

      expect(result.preferences.userId).toBe(userId);
      expect(result.preferences.preferences).toHaveLength(0);
      expect(result.preferences.quietHours).toBeUndefined();
    });

    test('should convert preferences to DTO format', async () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const mockUserPreferences = TestUtils.createTestUserPreferences(userId);
      
      mockDependencies.getUserPreferences.mockResolvedValue(mockUserPreferences);

      const result = await useCase.execute({ userId });

      // Check DTO structure
      expect(result.preferences).toHaveProperty('userId');
      expect(result.preferences).toHaveProperty('preferences');
      expect(result.preferences).toHaveProperty('quietHours');
      expect(result.preferences).toHaveProperty('createdAt');
      expect(result.preferences).toHaveProperty('updatedAt');
      
      // Check preferences array structure
      result.preferences.preferences.forEach((pref: any) => {
        expect(pref).toHaveProperty('notificationType');
        expect(pref).toHaveProperty('channel');
        expect(pref).toHaveProperty('enabled');
        expect(pref).not.toHaveProperty('updatedAt'); // Should not include domain properties
      });
      
      // Check quiet hours structure
      if (result.preferences.quietHours) {
        expect(result.preferences.quietHours).toHaveProperty('start');
        expect(result.preferences.quietHours).toHaveProperty('end');
        expect(result.preferences.quietHours).toHaveProperty('timezone');
        expect(result.preferences.quietHours).toHaveProperty('days');
      }
    });
  });

  describe('validateInput', () => {
    test('should return null for valid input', () => {
      const input = { userId: TEST_CONSTANTS.TEST_USER_ID };
      const error = useCase.validateInput(input);
      
      expect(error).toBeNull();
    });

    test('should return error for empty userId', () => {
      const input = { userId: '' };
      const error = useCase.validateInput(input);
      
      expect(error).toBe('User ID is required');
    });

    test('should return error for whitespace-only userId', () => {
      const input = { userId: '   ' };
      const error = useCase.validateInput(input);
      
      expect(error).toBe('User ID is required');
    });

    test('should return error for missing userId', () => {
      const input = {} as any;
      const error = useCase.validateInput(input);
      
      expect(error).toBe('User ID is required');
    });
  });

  describe('error handling', () => {
    test('should propagate repository errors', async () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const repositoryError = new Error('Database connection failed');
      
      mockDependencies.getUserPreferences.mockRejectedValue(repositoryError);

      await expect(useCase.execute({ userId }))
        .rejects
        .toThrow('Database connection failed');
    });

    test('should handle unexpected errors', async () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const unexpectedError = new TypeError('Unexpected type error');
      
      mockDependencies.getUserPreferences.mockRejectedValue(unexpectedError);

      await expect(useCase.execute({ userId }))
        .rejects
        .toThrow(TypeError);
    });
  });

  describe('edge cases', () => {
    test('should handle user with many preferences', async () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const manyPreferences = Array.from({ length: 50 }, (_, i) => ({
        notificationType: `notification_type_${i}` as any,
        channel: i % 2 === 0 ? 'email' as const : 'sms' as const,
        enabled: i % 3 === 0,
        updatedAt: new Date()
      }));
      
      const mockUserPreferences = new UserPreferences(userId, manyPreferences, undefined);
      mockDependencies.getUserPreferences.mockResolvedValue(mockUserPreferences);

      const result = await useCase.execute({ userId });

      expect(result.preferences.preferences).toHaveLength(50);
    });

    test('should handle user with complex quiet hours', async () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const complexQuietHours = {
        start: { hour: 23, minute: 30 },
        end: { hour: 6, minute: 45 },
        timezone: 'America/New_York',
        days: ['monday', 'wednesday', 'friday'] as any[]
      };
      
      const mockUserPreferences = new UserPreferences(
        userId,
        [],
        complexQuietHours
      );
      
      mockDependencies.getUserPreferences.mockResolvedValue(mockUserPreferences);

      const result = await useCase.execute({ userId });

      expect(result.preferences.quietHours).toEqual(complexQuietHours);
    });

    test('should handle concurrent requests', async () => {
      const userId = TEST_CONSTANTS.TEST_USER_ID;
      const mockUserPreferences = TestUtils.createTestUserPreferences(userId);
      
      mockDependencies.getUserPreferences.mockResolvedValue(mockUserPreferences);

      // Execute multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        useCase.execute({ userId })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.preferences.userId).toBe(userId);
      });
      
      expect(mockDependencies.getUserPreferences).toHaveBeenCalledTimes(5);
    });
  });
});