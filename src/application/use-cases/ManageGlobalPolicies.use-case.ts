/**
 * ManageGlobalPolicies use case
 * Manages system-wide global policies for notification restrictions
 */

import { 
  GlobalPolicy,
  NotificationType,
  Channel,
  Region
} from '../../domain/index.js';
import { 
  GlobalPolicyDTO,
  GlobalPolicyRequestDTO
} from '../dtos/index.js';
import { 
  PolicyConflictException,
  InvalidNotificationTypeException,
  InvalidChannelException,
  InvalidRegionException
} from '../../domain/exceptions/index.js';

/**
 * Dependencies required by this use case
 */
export interface ManageGlobalPoliciesDependencies {
  getGlobalPolicy: (id: string) => Promise<GlobalPolicy | null>;
  getGlobalPolicies: () => Promise<GlobalPolicy[]>;
  getGlobalPoliciesByFilter: (filter: {
    notificationType?: NotificationType;
    channel?: Channel;
    region?: Region;
  }) => Promise<GlobalPolicy[]>;
  saveGlobalPolicy: (policy: GlobalPolicy) => Promise<void>;
  deleteGlobalPolicy: (id: string) => Promise<boolean>;
}

/**
 * Input for creating/updating a policy
 */
export interface CreateUpdatePolicyInput {
  policy: GlobalPolicyRequestDTO;
  id?: string; // For updates
}

/**
 * Output for policy operations
 */
export interface PolicyOperationOutput {
  policy: GlobalPolicyDTO;
}

/**
 * Input for getting policies
 */
export interface GetPoliciesInput {
  filter?: {
    notificationType?: NotificationType;
    channel?: Channel;
    region?: Region;
  };
  page?: number;
  pageSize?: number;
}

/**
 * Output for getting policies
 */
export interface GetPoliciesOutput {
  policies: GlobalPolicyDTO[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * ManageGlobalPolicies use case implementation
 */
export class ManageGlobalPoliciesUseCase {
  constructor(private readonly dependencies: ManageGlobalPoliciesDependencies) {}

  /**
   * Create a new global policy
   */
  async createPolicy(input: CreateUpdatePolicyInput): Promise<PolicyOperationOutput> {
    const { policy } = input;
    
    // 1. Validate input
    this.validatePolicyRequest(policy);
    
    // 2. Check for conflicts
    await this.checkForConflicts(policy);
    
    // 3. Create new policy
    const newPolicy = GlobalPolicy.create(
      policy.notificationType,
      policy.channel,
      policy.region,
      policy.enabled,
      policy.description
    );
    
    // 4. Save policy
    await this.dependencies.saveGlobalPolicy(newPolicy);
    
    // 5. Convert to DTO
    const policyDTO = this.toPolicyDTO(newPolicy);
    
    return { policy: policyDTO };
  }

  /**
   * Update an existing global policy
   */
  async updatePolicy(input: CreateUpdatePolicyInput): Promise<PolicyOperationOutput> {
    const { id, policy } = input;
    
    if (!id) {
      throw new Error('Policy ID is required for updates');
    }
    
    // 1. Get existing policy
    const existingPolicy = await this.dependencies.getGlobalPolicy(id);
    if (!existingPolicy) {
      throw new Error(`Policy with ID ${id} not found`);
    }
    
    // 2. Validate input
    this.validatePolicyRequest(policy);
    
    // 3. Check for conflicts (excluding the current policy)
    await this.checkForConflicts(policy, id);
    
    // 4. Update policy
    existingPolicy.updateStatus(policy.enabled, policy.description);
    
    // 5. Save updated policy
    await this.dependencies.saveGlobalPolicy(existingPolicy);
    
    // 6. Convert to DTO
    const policyDTO = this.toPolicyDTO(existingPolicy);
    
    return { policy: policyDTO };
  }

  /**
   * Get policies with optional filtering and pagination
   */
  async getPolicies(input: GetPoliciesInput = {}): Promise<GetPoliciesOutput> {
    const { filter = {}, page = 1, pageSize = 50 } = input;
    
    // 1. Get all policies (or filtered)
    let policies = await this.dependencies.getGlobalPoliciesByFilter(filter);
    const total = policies.length;
    
    // 2. Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    policies = policies.slice(startIndex, endIndex);
    
    // 3. Convert to DTOs
    const policyDTOs = policies.map(policy => this.toPolicyDTO(policy));
    
    return {
      policies: policyDTOs,
      total,
      page,
      pageSize
    };
  }

  /**
   * Get a specific policy by ID
   */
  async getPolicy(id: string): Promise<PolicyOperationOutput> {
    const policy = await this.dependencies.getGlobalPolicy(id);
    
    if (!policy) {
      throw new Error(`Policy with ID ${id} not found`);
    }
    
    const policyDTO = this.toPolicyDTO(policy);
    
    return { policy: policyDTO };
  }

  /**
   * Delete a policy
   */
  async deletePolicy(id: string): Promise<{ success: boolean }> {
    const deleted = await this.dependencies.deleteGlobalPolicy(id);
    
    return { success: deleted };
  }

  /**
   * Validate policy request
   */
  private validatePolicyRequest(policy: GlobalPolicyRequestDTO): void {
    if (!policy.notificationType) {
      throw new InvalidNotificationTypeException('');
    }
    
    if (!policy.channel) {
      throw new InvalidChannelException('');
    }
    
    if (!policy.region) {
      throw new InvalidRegionException('');
    }
    
    if (!policy.description || policy.description.trim() === '') {
      throw new Error('Policy description is required');
    }
    
    if (policy.description.length > 500) {
      throw new Error('Policy description cannot exceed 500 characters');
    }
  }

  /**
   * Check for policy conflicts
   */
  private async checkForConflicts(
    policy: GlobalPolicyRequestDTO,
    excludePolicyId?: string
  ): Promise<void> {
    const existingPolicies = await this.dependencies.getGlobalPoliciesByFilter({
      notificationType: policy.notificationType,
      channel: policy.channel,
      region: policy.region
    });
    
    // Filter out the policy being updated (if any)
    const conflictingPolicies = existingPolicies.filter(
      p => !excludePolicyId || p.id !== excludePolicyId
    );
    
    if (conflictingPolicies.length > 0) {
      const conflictDetails = conflictingPolicies.map(p => ({
        id: p.id,
        enabled: p.enabled,
        description: p.description
      }));
      
      throw new PolicyConflictException(
        `A policy already exists for ${policy.notificationType} via ${policy.channel} in region ${policy.region}`,
        { conflicts: conflictDetails }
      );
    }
  }

  /**
   * Convert GlobalPolicy entity to DTO
   */
  private toPolicyDTO(policy: GlobalPolicy): GlobalPolicyDTO {
    return {
      id: policy.id,
      notificationType: policy.notificationType,
      channel: policy.channel,
      region: policy.region,
      enabled: policy.enabled,
      description: policy.description,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString()
    };
  }

  /**
   * Create a blocking policy (convenience method)
   */
  async createBlockingPolicy(
    notificationType: NotificationType,
    channel: Channel,
    region: Region,
    reason: string
  ): Promise<PolicyOperationOutput> {
    return this.createPolicy({
      policy: {
        notificationType,
        channel,
        region,
        enabled: false,
        description: `Blocked: ${reason}`
      }
    });
  }

  /**
   * Create an allowing policy (convenience method)
   */
  async createAllowingPolicy(
    notificationType: NotificationType,
    channel: Channel,
    region: Region,
    reason: string
  ): Promise<PolicyOperationOutput> {
    return this.createPolicy({
      policy: {
        notificationType,
        channel,
        region,
        enabled: true,
        description: `Allowed: ${reason}`
      }
    });
  }

  /**
   * Check if a notification would be blocked by any global policy
   */
  async wouldBeBlockedByGlobalPolicy(
    notificationType: NotificationType,
    channel: Channel,
    region: Region
  ): Promise<{ blocked: boolean; blockingPolicy?: GlobalPolicyDTO }> {
    const policies = await this.dependencies.getGlobalPoliciesByFilter({
      notificationType,
      channel,
      region
    });
    
    // Also check for GLOBAL policies
    const globalPolicies = await this.dependencies.getGlobalPoliciesByFilter({
      notificationType,
      channel,
      region: 'GLOBAL'
    });
    
    const allRelevantPolicies = [...policies, ...globalPolicies];
    
    for (const policy of allRelevantPolicies) {
      if (policy.blocksNotification(notificationType, channel, region)) {
        return {
          blocked: true,
          blockingPolicy: this.toPolicyDTO(policy)
        };
      }
    }
    
    return { blocked: false };
  }
}