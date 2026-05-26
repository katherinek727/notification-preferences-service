/**
 * GetUserPreferences use case
 * Retrieves a user's notification preferences
 */

import { UserPreferences } from '../../domain/index.js';
import { UserPreferencesResponseDTO } from '../dtos/index.js';
import { UserNotFoundException } from '../../domain/exceptions/index.js';

/**
 * Dependencies required by this use case
 */
export interface GetUserPreferencesDependencies {
  getUserPreferences: (userId: string) => Promise<UserPreferences | null>;
}

/**
 * Input for the use case
 */
export interface GetUserPreferencesInput {
  userId: string;
}

/**
 * Output from the use case
 */
export interface GetUserPreferencesOutput {
  preferences: UserPreferencesResponseDTO;
}

/**
 * GetUserPreferences use case implementation
 */
export class GetUserPreferencesUseCase {
  constructor(private readonly dependencies: GetUserPreferencesDependencies) {}

  /**
   * Execute the use case
   */
  async execute(input: GetUserPreferencesInput): Promise<GetUserPreferencesOutput> {
    const { userId } = input;
    
    // 1. Get user preferences from repository
    const userPreferences = await this.dependencies.getUserPreferences(userId);
    
    // 2. Check if user exists
    if (!userPreferences) {
      throw new UserNotFoundException(userId);
    }
    
    // 3. Convert to response DTO
    const responseDTO: UserPreferencesResponseDTO = {
      userId: userPreferences.userId,
      preferences: userPreferences.preferences.map(pref => ({
        notificationType: pref.notificationType,
        channel: pref.channel,
        enabled: pref.enabled
      })),
      quietHours: userPreferences.quietHours ? {
        start: userPreferences.quietHours.start,
        end: userPreferences.quietHours.end,
        timezone: userPreferences.quietHours.timezone,
        days: userPreferences.quietHours.days
      } : undefined,
      createdAt: userPreferences.createdAt,
      updatedAt: userPreferences.updatedAt
    };
    
    return { preferences: responseDTO };
  }

  /**
   * Validate input parameters
   */
  validateInput(input: GetUserPreferencesInput): string | null {
    if (!input.userId || input.userId.trim() === '') {
      return 'User ID is required';
    }
    
    return null;
  }
}