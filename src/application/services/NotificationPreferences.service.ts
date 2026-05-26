/**
 * NotificationPreferences application service
 * Coordinates use cases for managing notification preferences
 */

import { 
  GetUserPreferencesUseCase,
  UpdateUserPreferencesUseCase,
  EvaluateNotificationUseCase,
  ManageGlobalPoliciesUseCase
} from '../use-cases/index.js';
import { 
  UserPreferencesResponseDTO,
  UpdateUserPreferencesRequestDTO,
  NotificationEvaluationRequestDTO,
  NotificationEvaluationResponseDTO,
  GlobalPolicyDTO,
  GlobalPolicyRequestDTO
} from '../dtos/index.js';
import { 
  UserNotFoundException,
  InvalidQuietHoursException,
  PreferenceValidationException,
  NotificationBlockedException,
  PolicyConflictException
} from '../../domain/exceptions/index.js';

/**
 * Dependencies for the application service
 */
export interface NotificationPreferencesServiceDependencies {
  getUserPreferencesUseCase: GetUserPreferencesUseCase;
  updateUserPreferencesUseCase: UpdateUserPreferencesUseCase;
  evaluateNotificationUseCase: EvaluateNotificationUseCase;
  manageGlobalPoliciesUseCase: ManageGlobalPoliciesUseCase;
}

/**
 * NotificationPreferences application service
 */
export class NotificationPreferencesService {
  constructor(private readonly dependencies: NotificationPreferencesServiceDependencies) {}

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferencesResponseDTO> {
    try {
      const result = await this.dependencies.getUserPreferencesUseCase.execute({ userId });
      return result.preferences;
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }
      throw new Error(`Failed to get user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string, 
    updates: UpdateUserPreferencesRequestDTO
  ): Promise<{ preferences: UserPreferencesResponseDTO; changesMade: number }> {
    try {
      const result = await this.dependencies.updateUserPreferencesUseCase.execute({
        userId,
        updates
      });
      return result;
    } catch (error) {
      if (error instanceof UserNotFoundException || 
          error instanceof InvalidQuietHoursException || 
          error instanceof PreferenceValidationException) {
        throw error;
      }
      throw new Error(`Failed to update user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Evaluate a notification
   */
  async evaluateNotification(
    request: NotificationEvaluationRequestDTO
  ): Promise<NotificationEvaluationResponseDTO> {
    try {
      const result = await this.dependencies.evaluateNotificationUseCase.execute({ request });
      return result.evaluation;
    } catch (error) {
      if (error instanceof NotificationBlockedException) {
        // For evaluation, blocked notifications are a normal outcome
        // Return the evaluation result instead of throwing
        return {
          decision: error.decision,
          reason: error.message,
          details: JSON.stringify(error.details),
          evaluatedAt: new Date().toISOString()
        };
      }
      throw new Error(`Failed to evaluate notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a global policy
   */
  async createGlobalPolicy(policy: GlobalPolicyRequestDTO): Promise<GlobalPolicyDTO> {
    try {
      const result = await this.dependencies.manageGlobalPoliciesUseCase.createPolicy({ policy });
      return result.policy;
    } catch (error) {
      if (error instanceof PolicyConflictException) {
        throw error;
      }
      throw new Error(`Failed to create global policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a global policy
   */
  async updateGlobalPolicy(id: string, policy: GlobalPolicyRequestDTO): Promise<GlobalPolicyDTO> {
    try {
      const result = await this.dependencies.manageGlobalPoliciesUseCase.updatePolicy({ id, policy });
      return result.policy;
    } catch (error) {
      if (error instanceof PolicyConflictException) {
        throw error;
      }
      throw new Error(`Failed to update global policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get global policies
   */
  async getGlobalPilters(filter?: {
    notificationType?: string;
    channel?: string;
    region?: string;
  }): Promise<GlobalPolicyDTO[]> {
    try {
      const result = await this.dependencies.manageGlobalPoliciesUseCase.getPolicies({ filter });
      return result.policies;
    } catch (error) {
      throw new Error(`Failed to get global policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific global policy
   */
  async getGlobalPolicy(id: string): Promise<GlobalPolicyDTO> {
    try {
      const result = await this.dependencies.manageGlobalPoliciesUseCase.getPolicy(id);
      return result.policy;
    } catch (error) {
      throw new Error(`Failed to get global policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a global policy
   */
  async deleteGlobalPolicy(id: string): Promise<{ success: boolean }> {
    try {
      return await this.dependencies.manageGlobalPoliciesUseCase.deletePolicy(id);
    } catch (error) {
      throw new Error(`Failed to delete global policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch evaluate multiple notifications
   */
  async evaluateNotificationsBatch(
    requests: NotificationEvaluationRequestDTO[]
  ): Promise<NotificationEvaluationResponseDTO[]> {
    try {
      const results = await this.dependencies.evaluateNotificationUseCase.evaluateBatch(requests);
      return results.map(result => result.evaluation);
    } catch (error) {
      throw new Error(`Failed to evaluate notifications batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a single preference (convenience method)
   */
  async updateSinglePreference(
    userId: string,
    notificationType: string,
    channel: string,
    enabled: boolean
  ): Promise<{ preferences: UserPreferencesResponseDTO; changesMade: number }> {
    const updates = this.dependencies.updateUserPreferencesUseCase.createSinglePreferenceUpdate(
      notificationType as any,
      channel as any,
      enabled
    );
    
    return this.updateUserPreferences(userId, updates);
  }

  /**
   * Update quiet hours (convenience method)
   */
  async updateQuietHours(
    userId: string,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    timezone: string,
    days: string[]
  ): Promise<{ preferences: UserPreferencesResponseDTO; changesMade: number }> {
    const updates = this.dependencies.updateUserPreferencesUseCase.createQuietHoursUpdate(
      startHour,
      startMinute,
      endHour,
      endMinute,
      timezone,
      days as any[]
    );
    
    return this.updateUserPreferences(userId, updates);
  }

  /**
   * Check if a notification would be allowed (pre-flight check)
   */
  async wouldAllowNotification(
    userId: string,
    notificationType: string,
    channel: string,
    region: string
  ): Promise<boolean> {
    try {
      return await this.dependencies.evaluateNotificationUseCase.wouldAllow(
        userId,
        notificationType as any,
        channel as any,
        region as any
      );
    } catch (error) {
      throw new Error(`Failed to check if notification would be allowed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user evaluation statistics
   */
  async getUserEvaluationStats(userId: string): Promise<{
    totalEvaluations: number;
    allowed: number;
    denied: number;
    lastEvaluated?: Date;
  }> {
    try {
      return await this.dependencies.evaluateNotificationUseCase.getUserEvaluationStats(userId);
    } catch (error) {
      throw new Error(`Failed to get user evaluation stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a notification would be blocked by global policy
   */
  async wouldBeBlockedByGlobalPolicy(
    notificationType: string,
    channel: string,
    region: string
  ): Promise<{ blocked: boolean; blockingPolicy?: GlobalPolicyDTO }> {
    try {
      return await this.dependencies.manageGlobalPoliciesUseCase.wouldBeBlockedByGlobalPolicy(
        notificationType as any,
        channel as any,
        region as any
      );
    } catch (error) {
      throw new Error(`Failed to check global policy blocking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}