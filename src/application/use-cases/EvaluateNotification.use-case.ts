/**
 * EvaluateNotification use case
 * Evaluates whether a notification can be sent based on all rules
 */

import { 
  NotificationEvaluator,
  UserPreferences,
  GlobalPolicy,
  NotificationType,
  Channel,
  Region
} from '../../domain/index.js';
import { 
  NotificationEvaluationRequestDTO,
  NotificationEvaluationResponseDTO
} from '../dtos/index.js';
import { 
  UserNotFoundException,
  InvalidNotificationTypeException,
  InvalidChannelException,
  InvalidRegionException,
  NotificationBlockedException
} from '../../domain/exceptions/index.js';

/**
 * Dependencies required by this use case
 */
export interface EvaluateNotificationDependencies {
  getUserPreferences: (userId: string) => Promise<UserPreferences | null>;
  getGlobalPolicies: () => Promise<GlobalPolicy[]>;
  getGlobalPoliciesByRegion?: (region: Region) => Promise<GlobalPolicy[]>;
}

/**
 * Input for the use case
 */
export interface EvaluateNotificationInput {
  request: NotificationEvaluationRequestDTO;
}

/**
 * Output from the use case
 */
export interface EvaluateNotificationOutput {
  evaluation: NotificationEvaluationResponseDTO;
}

/**
 * EvaluateNotification use case implementation
 */
export class EvaluateNotificationUseCase {
  private readonly evaluator: NotificationEvaluator;

  constructor(private readonly dependencies: EvaluateNotificationDependencies) {
    this.evaluator = new NotificationEvaluator();
  }

  /**
   * Execute the use case
   */
  async execute(input: EvaluateNotificationInput): Promise<EvaluateNotificationOutput> {
    const { request } = input;
    
    // 1. Validate input
    this.validateInput(request);
    
    // 2. Parse datetime
    const datetime = new Date(request.datetime);
    if (isNaN(datetime.getTime())) {
      throw new Error('Invalid datetime format');
    }
    
    // 3. Get user preferences
    const userPreferences = await this.dependencies.getUserPreferences(request.userId);
    
    // 4. Get global policies (filter by region if supported)
    let globalPolicies: GlobalPolicy[];
    if (this.dependencies.getGlobalPoliciesByRegion) {
      globalPolicies = await this.dependencies.getGlobalPoliciesByRegion(request.region);
    } else {
      globalPolicies = await this.dependencies.getGlobalPolicies();
    }
    
    // 5. Evaluate notification
    const evaluationResult = this.evaluator.evaluate(
      {
        userId: request.userId,
        notificationType: request.notificationType,
        channel: request.channel,
        region: request.region,
        datetime
      },
      userPreferences,
      globalPolicies
    );
    
    // 6. Convert to response DTO
    const responseDTO: NotificationEvaluationResponseDTO = {
      decision: evaluationResult.decision,
      reason: evaluationResult.reason,
      details: evaluationResult.details,
      evaluatedAt: evaluationResult.evaluatedAt.toISOString()
    };
    
    // 7. Throw exception if notification is blocked (for error handling middleware)
    if (evaluationResult.decision === 'deny') {
      throw new NotificationBlockedException(
        evaluationResult.reason,
        evaluationResult.decision,
        { details: evaluationResult.details }
      );
    }
    
    return { evaluation: responseDTO };
  }

  /**
   * Validate input parameters
   */
  private validateInput(request: NotificationEvaluationRequestDTO): void {
    if (!request.userId || request.userId.trim() === '') {
      throw new Error('User ID is required');
    }
    
    if (!request.notificationType) {
      throw new InvalidNotificationTypeException('');
    }
    
    if (!request.channel) {
      throw new InvalidChannelException('');
    }
    
    if (!request.region) {
      throw new InvalidRegionException('');
    }
    
    if (!request.datetime) {
      throw new Error('Datetime is required');
    }
  }

  /**
   * Batch evaluate multiple notifications
   */
  async evaluateBatch(
    requests: NotificationEvaluationRequestDTO[]
  ): Promise<EvaluateNotificationOutput[]> {
    const results: EvaluateNotificationOutput[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.execute({ request });
        results.push(result);
      } catch (error) {
        // For batch operations, we might want to continue on error
        // and include error information in the response
        if (error instanceof NotificationBlockedException) {
          results.push({
            evaluation: {
              decision: error.decision,
              reason: error.message,
              details: JSON.stringify(error.details),
              evaluatedAt: new Date().toISOString()
            }
          });
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }
    
    return results;
  }

  /**
   * Get evaluation statistics for a user
   */
  async getUserEvaluationStats(userId: string): Promise<{
    totalEvaluations: number;
    allowed: number;
    denied: number;
    lastEvaluated?: Date;
  }> {
    // This would typically query a metrics/analytics database
    // For now, return placeholder data
    return {
      totalEvaluations: 0,
      allowed: 0,
      denied: 0
    };
  }

  /**
   * Check if a notification would be allowed without actually evaluating
   * Useful for pre-flight checks
   */
  async wouldAllow(
    userId: string,
    notificationType: NotificationType,
    channel: Channel,
    region: Region
  ): Promise<boolean> {
    const testRequest: NotificationEvaluationRequestDTO = {
      userId,
      notificationType,
      channel,
      region,
      datetime: new Date().toISOString()
    };
    
    try {
      const result = await this.execute({ request: testRequest });
      return result.evaluation.decision === 'allow';
    } catch (error) {
      if (error instanceof NotificationBlockedException) {
        return false;
      }
      throw error;
    }
  }
}