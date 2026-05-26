/**
 * Global Policies API Controller
 */

import { Request, Response } from 'express';
import { 
  NotificationPreferencesService,
  GlobalPolicyDTO,
  GlobalPolicyRequestDTO,
  ErrorResponseDTO,
  validateDTO,
  GlobalPolicyRequestSchema
} from '../../../application/index.js';
import { 
  PolicyConflictException,
  domainExceptionToObject
} from '../../../domain/exceptions/index.js';

/**
 * Global Policies Controller
 */
export class GlobalPoliciesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  /**
   * Create global policy
   */
  async createGlobalPolicy(req: Request, res: Response): Promise<void> {
    try {
      const policyRequest = req.body;
      
      // Validate request body
      const validation = validateDTO(GlobalPolicyRequestSchema, policyRequest);
      if (!validation.success) {
        this.sendValidationError(res, validation.errors!);
        return;
      }
      
      const policy = await this.service.createGlobalPolicy(policyRequest);
      
      res.status(201).json({
        success: true,
        data: policy,
        meta: {
          message: 'Global policy created successfully'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update global policy
   */
  async updateGlobalPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const policyRequest = req.body;
      
      if (!id) {
        this.sendError(res, 400, 'POLICY_ID_REQUIRED', 'Policy ID is required');
        return;
      }
      
      // Validate request body
      const validation = validateDTO(GlobalPolicyRequestSchema, policyRequest);
      if (!validation.success) {
        this.sendValidationError(res, validation.errors!);
        return;
      }
      
      const policy = await this.service.updateGlobalPolicy(id, policyRequest);
      
      res.status(200).json({
        success: true,
        data: policy,
        meta: {
          message: 'Global policy updated successfully'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get global policies
   */
  async getGlobalPolicies(req: Request, res: Response): Promise<void> {
    try {
      const { notificationType, channel, region } = req.query;
      
      const filter: any = {};
      if (notificationType) filter.notificationType = notificationType;
      if (channel) filter.channel = channel;
      if (region) filter.region = region;
      
      const policies = await this.service.getGlobalPilters(filter);
      
      res.status(200).json({
        success: true,
        data: policies,
        meta: {
          total: policies.length,
          message: 'Global policies retrieved successfully'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get global policy by ID
   */
  async getGlobalPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        this.sendError(res, 400, 'POLICY_ID_REQUIRED', 'Policy ID is required');
        return;
      }
      
      const policy = await this.service.getGlobalPolicy(id);
      
      res.status(200).json({
        success: true,
        data: policy,
        meta: {
          message: 'Global policy retrieved successfully'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Delete global policy
   */
  async deleteGlobalPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        this.sendError(res, 400, 'POLICY_ID_REQUIRED', 'Policy ID is required');
        return;
      }
      
      const result = await this.service.deleteGlobalPolicy(id);
      
      res.status(200).json({
        success: true,
        data: result,
        meta: {
          message: result.success 
            ? 'Global policy deleted successfully' 
            : 'Global policy not found'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Check if notification would be blocked by global policy
   */
  async wouldBeBlockedByGlobalPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { notificationType, channel, region } = req.query;
      
      if (!notificationType || !channel || !region) {
        this.sendError(res, 400, 'INVALID_REQUEST', 'notificationType, channel, and region are required');
        return;
      }
      
      const result = await this.service.wouldBeBlockedByGlobalPolicy(
        notificationType as string,
        channel as string,
        region as string
      );
      
      res.status(200).json({
        success: true,
        data: result,
        meta: {
          message: result.blocked 
            ? 'Notification would be blocked by global policy' 
            : 'Notification would not be blocked by global policy'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Create blocking policy (convenience endpoint)
   */
  async createBlockingPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { notificationType, channel, region, reason } = req.body;
      
      if (!notificationType || !channel || !region || !reason) {
        this.sendError(res, 400, 'INVALID_REQUEST', 'notificationType, channel, region, and reason are required');
        return;
      }
      
      const policy = await this.service.createGlobalPolicy({
        notificationType,
        channel,
        region,
        enabled: false,
        description: `Blocked: ${reason}`
      });
      
      res.status(201).json({
        success: true,
        data: policy,
        meta: {
          message: 'Blocking policy created successfully'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Create allowing policy (convenience endpoint)
   */
  async createAllowingPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { notificationType, channel, region, reason } = req.body;
      
      if (!notificationType || !channel || !region || !reason) {
        this.sendError(res, 400, 'INVALID_REQUEST', 'notificationType, channel, region, and reason are required');
        return;
      }
      
      const policy = await this.service.createGlobalPolicy({
        notificationType,
        channel,
        region,
        enabled: true,
        description: `Allowed: ${reason}`
      });
      
      res.status(201).json({
        success: true,
        data: policy,
        meta: {
          message: 'Allowing policy created successfully'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown, res: Response): void {
    console.error('Controller error:', error);
    
    if (error instanceof PolicyConflictException) {
      this.sendError(res, 409, error.code, error.message, error.details);
    } else if (error instanceof Error) {
      if (error.message.includes('not found')) {
        this.sendError(res, 404, 'POLICY_NOT_FOUND', error.message);
      } else {
        this.sendError(res, 500, 'INTERNAL_ERROR', error.message);
      }
    } else {
      this.sendError(res, 500, 'UNKNOWN_ERROR', 'An unknown error occurred');
    }
  }

  /**
   * Send validation error
   */
  private sendValidationError(res: Response, errors: any): void {
    const formattedErrors = errors.errors.map((error: any) => ({
      field: error.path.join('.'),
      message: error.message
    }));

    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: { errors: formattedErrors },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error response
   */
  private sendError(
    res: Response, 
    status: number, 
    code: string, 
    message: string, 
    details?: Record<string, unknown>
  ): void {
    const errorResponse: ErrorResponseDTO = {
      error: code,
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    res.status(status).json({
      success: false,
      error: errorResponse
    });
  }
}