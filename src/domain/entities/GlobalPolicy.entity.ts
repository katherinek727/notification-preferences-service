import { 
  NotificationType, 
  Channel, 
  Region, 
  GlobalPolicy as GlobalPolicyInterface 
} from '../types.js';

/**
 * GlobalPolicy entity representing system-wide notification restrictions
 * These policies override user preferences for specific regions
 */
export class GlobalPolicy implements GlobalPolicyInterface {
  constructor(
    public readonly id: string,
    public readonly notificationType: NotificationType,
    public readonly channel: Channel,
    public readonly region: Region,
    public enabled: boolean,
    public description: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  /**
   * Check if this policy applies to a given notification type, channel, and region
   */
  appliesTo(notificationType: NotificationType, channel: Channel, region: Region): boolean {
    return this.notificationType === notificationType &&
           this.channel === channel &&
           (this.region === region || this.region === 'GLOBAL');
  }

  /**
   * Check if this policy blocks a notification
   * Returns true if the policy applies and is disabled
   */
  blocksNotification(notificationType: NotificationType, channel: Channel, region: Region): boolean {
    return this.appliesTo(notificationType, channel, region) && !this.enabled;
  }

  /**
   * Update the policy status
   * Returns true if the status was changed
   */
  updateStatus(enabled: boolean, description?: string): boolean {
    if (this.enabled === enabled) {
      return false;
    }
    
    this.enabled = enabled;
    this.updatedAt = new Date();
    
    if (description) {
      this.description = description;
    }
    
    return true;
  }

  /**
   * Check if this policy is currently active
   */
  isActive(): boolean {
    return this.enabled;
  }

  /**
   * Create a new GlobalPolicy instance
   */
  static create(
    notificationType: NotificationType,
    channel: Channel,
    region: Region,
    enabled: boolean,
    description: string
  ): GlobalPolicy {
    const id = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new GlobalPolicy(
      id,
      notificationType,
      channel,
      region,
      enabled,
      description
    );
  }

  /**
   * Create a blocking policy (disabled by default)
   */
  static createBlockingPolicy(
    notificationType: NotificationType,
    channel: Channel,
    region: Region,
    reason: string
  ): GlobalPolicy {
    return GlobalPolicy.create(
      notificationType,
      channel,
      region,
      false,
      `Blocked: ${reason}`
    );
  }

  /**
   * Create an allowing policy (enabled by default)
   */
  static createAllowingPolicy(
    notificationType: NotificationType,
    channel: Channel,
    region: Region,
    reason: string
  ): GlobalPolicy {
    return GlobalPolicy.create(
      notificationType,
      channel,
      region,
      true,
      `Allowed: ${reason}`
    );
  }
}