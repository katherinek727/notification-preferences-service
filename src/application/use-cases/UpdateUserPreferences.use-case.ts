/**
 * UpdateUserPreferences use case
 * Updates a user's notification preferences with idempotent operations
 */

import { 
  UserPreferences, 
  NotificationType, 
  Channel,
  Timezone,
  DayOfWeek
} from '../../domain/index.js';
import { 
  UpdateUserPreferencesRequestDTO, 
  UserPreferencesResponseDTO 
} from '../dtos/index.js';
import { 
  UserNotFoundException, 
  InvalidQuietHoursException,
  PreferenceValidationException
} from '../../domain/exceptions/index.js';

/**
 * Dependencies required by this use case
 */
export interface UpdateUserPreferencesDependencies {
  getUserPreferences: (userId: string) => Promise<UserPreferences | null>;
  saveUserPreferences: (preferences: UserPreferences) => Promise<void>;
  getDefaultPreferences: () => Promise<Array<{ notificationType: NotificationType; channel: Channel; enabled: boolean }>>;
}

/**
 * Input for the use case
 */
export interface UpdateUserPreferencesInput {
  userId: string;
  updates: UpdateUserPreferencesRequestDTO;
}

/**
 * Output from the use case
 */
export interface UpdateUserPreferencesOutput {
  preferences: UserPreferencesResponseDTO;
  changesMade: number;
}

/**
 * UpdateUserPreferences use case implementation
 */
export class UpdateUserPreferencesUseCase {
  constructor(private readonly dependencies: UpdateUserPreferencesDependencies) {}

  /**
   * Execute the use case
   */
  async execute(input: UpdateUserPreferencesInput): Promise<UpdateUserPreferencesOutput> {
    const { userId, updates } = input;
    
    // 1. Validate input
    const validationError = this.validateInput(input);
    if (validationError) {
      throw new PreferenceValidationException(validationError);
    }
    
    // 2. Get existing preferences or create new ones with defaults
    let userPreferences = await this.dependencies.getUserPreferences(userId);
    
    if (!userPreferences) {
      // New user - create with default preferences
      const defaultPreferences = await this.dependencies.getDefaultPreferences();
      userPreferences = UserPreferences.createWithDefaults(userId, defaultPreferences);
    }
    
    // 3. Track changes for idempotency reporting
    let changesMade = 0;
    
    // 4. Update preferences if provided
    if (updates.preferences && updates.preferences.length > 0) {
      changesMade += userPreferences.mergePreferences(
        updates.preferences.map(pref => ({
          notificationType: pref.notificationType,
          channel: pref.channel,
          enabled: pref.enabled,
          updatedAt: new Date()
        }))
      );
    }
    
    // 5. Update quiet hours if provided
    if (updates.quietHours) {
      this.validateQuietHours(updates.quietHours);
      userPreferences.updateQuietHours({
        start: updates.quietHours.start,
        end: updates.quietHours.end,
        timezone: updates.quietHours.timezone,
        days: updates.quietHours.days
      });
      changesMade++;
    }
    
    // 6. Save updated preferences
    await this.dependencies.saveUserPreferences(userPreferences);
    
    // 7. Convert to response DTO
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
    
    return { 
      preferences: responseDTO,
      changesMade 
    };
  }

  /**
   * Validate input parameters
   */
  validateInput(input: UpdateUserPreferencesInput): string | null {
    const { userId, updates } = input;
    
    if (!userId || userId.trim() === '') {
      return 'User ID is required';
    }
    
    if (!updates) {
      return 'Update data is required';
    }
    
    // Validate that at least one update is provided
    if ((!updates.preferences || updates.preferences.length === 0) && !updates.quietHours) {
      return 'At least one preference update or quiet hours configuration is required';
    }
    
    // Validate preferences if provided
    if (updates.preferences) {
      for (const pref of updates.preferences) {
        if (!pref.notificationType || !pref.channel) {
          return 'Each preference must have notificationType and channel';
        }
      }
    }
    
    return null;
  }

  /**
   * Validate quiet hours configuration
   */
  private validateQuietHours(quietHours: {
    start: { hour: number; minute: number };
    end: { hour: number; minute: number };
    timezone: Timezone;
    days: DayOfWeek[];
  }): void {
    const { start, end, timezone, days } = quietHours;
    
    // Validate time ranges
    if (start.hour < 0 || start.hour > 23 || start.minute < 0 || start.minute > 59) {
      throw new InvalidQuietHoursException('Invalid start time', { start });
    }
    
    if (end.hour < 0 || end.hour > 23 || end.minute < 0 || end.minute > 59) {
      throw new InvalidQuietHoursException('Invalid end time', { end });
    }
    
    // Validate that start and end are different
    if (start.hour === end.hour && start.minute === end.minute) {
      throw new InvalidQuietHoursException('Start and end times cannot be the same', { start, end });
    }
    
    // Validate timezone (basic check)
    if (!timezone || timezone.trim() === '') {
      throw new InvalidQuietHoursException('Timezone is required');
    }
    
    // Validate days
    if (!days || days.length === 0) {
      throw new InvalidQuietHoursException('At least one day must be specified');
    }
    
    // Check for duplicate days
    const uniqueDays = new Set(days);
    if (uniqueDays.size !== days.length) {
      throw new InvalidQuietHoursException('Duplicate days specified', { days });
    }
  }

  /**
   * Create a partial update for a single preference
   * Useful for API endpoints that update one preference at a time
   */
  createSinglePreferenceUpdate(
    notificationType: NotificationType,
    channel: Channel,
    enabled: boolean
  ): UpdateUserPreferencesRequestDTO {
    return {
      preferences: [{
        notificationType,
        channel,
        enabled
      }]
    };
  }

  /**
   * Create a quiet hours update
   */
  createQuietHoursUpdate(
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    timezone: Timezone,
    days: DayOfWeek[]
  ): UpdateUserPreferencesRequestDTO {
    return {
      quietHours: {
        start: { hour: startHour, minute: startMinute },
        end: { hour: endHour, minute: endMinute },
        timezone,
        days
      }
    };
  }
}