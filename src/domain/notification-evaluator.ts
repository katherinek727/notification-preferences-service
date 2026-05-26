/**
 * Core business logic for evaluating notification permissions
 */

import { 
  EvaluationRequest,
  EvaluationResult
} from './types';
import { 
  NotificationTypeVO, 
  ChannelVO, 
  RegionVO 
} from './value-objects';
import { 
  UserPreferences, 
  GlobalPolicy 
} from './entities';
import { 
  InvalidNotificationTypeError,
  InvalidChannelError,
  InvalidRegionError
} from './errors';

export class NotificationEvaluator {
  evaluate(
    request: EvaluationRequest,
    userPreferences: UserPreferences | null,
    globalPolicies: GlobalPolicy[]
  ): EvaluationResult {
    try {
      // Validate input
      const notificationType = new NotificationTypeVO(request.notificationType);
      const channel = new ChannelVO(request.channel);
      const region = new RegionVO(request.region);

      // Check if user exists
      if (!userPreferences) {
        return {
          decision: 'deny',
          reason: 'user_not_found',
          details: `User ${request.userId} not found`
        };
      }

      // Check global policies first (highest priority)
      const applicableGlobalPolicy = globalPolicies.find(policy => 
        policy.matches(notificationType, channel, region)
      );

      if (applicableGlobalPolicy && !applicableGlobalPolicy.enabled) {
        return {
          decision: 'deny',
          reason: 'global_policy_blocked',
          details: `Blocked by global policy: ${applicableGlobalPolicy.description}`
        };
      }

      // Check user preferences
      const userPreference = userPreferences.getPreference(notificationType, channel);
      
      if (!userPreference || !userPreference.enabled) {
        return {
          decision: 'deny',
          reason: 'user_preference_disabled',
          details: `User has disabled ${notificationType.value} via ${channel.value}`
        };
      }

      // Check quiet hours
      if (userPreferences.quietHours.isActiveAt(request.datetime)) {
        // Check if this is a transactional notification (allowed during quiet hours)
        const isTransactional = notificationType.value.startsWith('transactional_');
        const isSecurityOrSystem = 
          notificationType.value === 'security_alert' || 
          notificationType.value === 'system_notification';

        if (!isTransactional && !isSecurityOrSystem) {
          return {
            decision: 'deny',
            reason: 'quiet_hours_active',
            details: `Quiet hours active: ${userPreferences.quietHours.toString()}`
          };
        }
      }

      // All checks passed
      return {
        decision: 'allow',
        reason: 'notification_allowed',
        details: `Notification allowed for user ${request.userId}`
      };

    } catch (error) {
      if (error instanceof InvalidNotificationTypeError) {
        return {
          decision: 'deny',
          reason: 'invalid_notification_type',
          details: error.message
        };
      } else if (error instanceof InvalidChannelError) {
        return {
          decision: 'deny',
          reason: 'invalid_channel',
          details: error.message
        };
      } else if (error instanceof InvalidRegionError) {
        return {
          decision: 'deny',
          reason: 'global_policy_blocked',
          details: error.message
        };
      }

      // Unexpected error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        decision: 'deny',
        reason: 'global_policy_blocked',
        details: `Unexpected error: ${errorMessage}`
      };
    }
  }

  /**
   * Batch evaluation for multiple notifications
   */
  evaluateBatch(
    requests: EvaluationRequest[],
    userPreferences: UserPreferences | null,
    globalPolicies: GlobalPolicy[]
  ): EvaluationResult[] {
    return requests.map(request => 
      this.evaluate(request, userPreferences, globalPolicies)
    );
  }
}