import { 
  NotificationType, 
  Channel, 
  Region, 
  Decision, 
  DecisionReason,
  NotificationEvaluationRequest,
  NotificationEvaluationResult
} from '../types.js';
import { UserPreferences } from '../entities/UserPreferences.entity.js';
import { GlobalPolicy } from '../entities/GlobalPolicy.entity.js';

/**
 * NotificationEvaluator service responsible for evaluating whether a notification can be sent
 * This is the core business logic of the system
 */
export class NotificationEvaluator {
  /**
   * Evaluate whether a notification can be sent based on all rules
   */
  evaluate(
    request: NotificationEvaluationRequest,
    userPreferences: UserPreferences | null,
    globalPolicies: GlobalPolicy[]
  ): NotificationEvaluationResult {
    const evaluatedAt = new Date();
    
    // 1. Check if user exists
    if (!userPreferences) {
      return {
        decision: 'deny',
        reason: 'user_not_found',
        details: `User ${request.userId} not found`,
        evaluatedAt
      };
    }

    // 2. Check global policies first (they override user preferences)
    const blockingPolicy = globalPolicies.find(policy => 
      policy.blocksNotification(request.notificationType, request.channel, request.region)
    );

    if (blockingPolicy) {
      return {
        decision: 'deny',
        reason: 'global_policy_blocked',
        details: `Blocked by global policy: ${blockingPolicy.description}`,
        evaluatedAt
      };
    }

    // 3. Check user preferences
    const isEnabled = userPreferences.isEnabled(request.notificationType, request.channel);
    
    if (!isEnabled) {
      return {
        decision: 'deny',
        reason: 'user_preference_disabled',
        details: `User has disabled ${request.notificationType} via ${request.channel}`,
        evaluatedAt
      };
    }

    // 4. Check quiet hours (only for marketing notifications)
    if (this.isMarketingNotification(request.notificationType)) {
      const isQuietHoursActive = userPreferences.isQuietHoursActive(request.datetime, request.region);
      
      if (isQuietHoursActive) {
        return {
          decision: 'deny',
          reason: 'quiet_hours_active',
          details: `Quiet hours are active for user's timezone`,
          evaluatedAt
        };
      }
    }

    // 5. All checks passed - notification is allowed
    return {
      decision: 'allow',
      reason: 'notification_allowed',
      details: `Notification meets all requirements`,
      evaluatedAt
    };
  }

  /**
   * Check if a notification type is marketing-related
   * Marketing notifications are subject to quiet hours restrictions
   */
  private isMarketingNotification(notificationType: NotificationType): boolean {
    return notificationType.startsWith('marketing_');
  }

  /**
   * Batch evaluate multiple notifications
   * Useful for bulk operations
   */
  evaluateBatch(
    requests: NotificationEvaluationRequest[],
    userPreferences: UserPreferences | null,
    globalPolicies: GlobalPolicy[]
  ): NotificationEvaluationResult[] {
    return requests.map(request => 
      this.evaluate(request, userPreferences, globalPolicies)
    );
  }

  /**
   * Get summary statistics from evaluation results
   */
  getEvaluationSummary(results: NotificationEvaluationResult[]): {
    total: number;
    allowed: number;
    denied: number;
    reasons: Record<DecisionReason, number>;
  } {
    const summary = {
      total: results.length,
      allowed: 0,
      denied: 0,
      reasons: {} as Record<DecisionReason, number>
    };

    for (const result of results) {
      if (result.decision === 'allow') {
        summary.allowed++;
      } else {
        summary.denied++;
      }

      summary.reasons[result.reason] = (summary.reasons[result.reason] || 0) + 1;
    }

    return summary;
  }

  /**
   * Validate notification evaluation request
   * Returns error message if invalid, null if valid
   */
  validateRequest(request: NotificationEvaluationRequest): string | null {
    if (!request.userId || request.userId.trim() === '') {
      return 'User ID is required';
    }

    if (!request.notificationType) {
      return 'Notification type is required';
    }

    if (!request.channel) {
      return 'Channel is required';
    }

    if (!request.region) {
      return 'Region is required';
    }

    if (!request.datetime || isNaN(request.datetime.getTime())) {
      return 'Valid datetime is required';
    }

    return null;
  }
}