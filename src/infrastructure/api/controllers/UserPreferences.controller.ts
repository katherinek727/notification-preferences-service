/**
 * User Preferences API Controller
 */

import { Request, Response } from 'express';
import { 
  NotificationPreferencesService,
  UserPreferencesResponseDTO,
  UpdateUserPreferencesRequestDTO,
  NotificationEvaluationRequestDTO,
  NotificationEvaluationResponseDTO,
  ErrorResponseDTO,
  validateDTO,
  UpdateUserPreferencesRequestSchema,
  NotificationEvaluationRequestSchema
} from '../../../application/index.js';
import { 
  UserNotFoundException,
  InvalidQuietHoursException,
  PreferenceValidationException,
  NotificationBlockedException,
  domainExceptionToObject
} from '../../../domain/exceptions/index.js';

/**
 * User Preferences Controller
 */
export class UserPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  /**
   * Get user preferences
   */
  async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        this.sendError(res, 400, 'USER_ID_REQUIRED', 'User ID is required');
        return;
      }
      
      const preferences = await this.service.getUserPreferences(userId);
      
      res.status(200).json({
        success: true,
        data: preferences
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      if (!userId) {
        this.sendError(res, 400, 'USER_ID_REQUIRED', 'User ID is required');
        return;
      }
      
      // Validate request body
      const validation = validateDTO(UpdateUserPreferencesRequestSchema, updates);
      if (!validation.success) {
        this.sendValidationError(res, validation.errors!);
        return;
      }
      
      const result = await this.service.updateUserPreferences(userId, updates);
      
      res.status(200).json({
        success: true,
        data: result.preferences,
        meta: {
          changesMade: result.changesMade,
          message: result.changesMade > 0 ? 'Preferences updated successfully' : 'No changes made (idempotent operation)'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Evaluate notification
   */
  async evaluateNotification(req: Request, res: Response): Promise<void> {
    try {
      const evaluationRequest = req.body;
      
      // Validate request body
      const validation = validateDTO(NotificationEvaluationRequestSchema, evaluationRequest);
      if (!validation.success) {
        this.sendValidationError(res, validation.errors!);
        return;
      }
      
      const evaluation = await this.service.evaluateNotification(evaluationRequest);
      
      res.status(200).json({
        success: true,
        data: evaluation,
        meta: {
          message: evaluation.decision === 'allow' 
            ? 'Notification is allowed' 
            : 'Notification is blocked'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Batch evaluate notifications
   */
  async evaluateNotificationsBatch(req: Request, res: Response): Promise<void> {
    try {
      const { requests } = req.body;
      
      if (!Array.isArray(requests)) {
        this.sendError(res, 400, 'INVALID_REQUEST', 'Requests must be an array');
        return;
      }
      
      // Validate each request
      const validRequests: NotificationEvaluationRequestDTO[] = [];
      const errors: Array<{ index: number; error: string }> = [];
      
      for (let i = 0; i < requests.length; i++) {
        const validation = validateDTO(NotificationEvaluationRequestSchema, requests[i]);
        if (validation.success) {
          validRequests.push(validation.data!);
        } else {
          errors.push({
            index: i,
            error: validation.errors!.errors[0].message
          });
        }
      }
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Some requests failed validation',
          details: { errors }
        });
        return;
      }
      
      const evaluations = await this.service.evaluateNotificationsBatch(validRequests);
      
      res.status(200).json({
        success: true,
        data: evaluations,
        meta: {
          total: evaluations.length,
          allowed: evaluations.filter(e => e.decision === 'allow').length,
          denied: evaluations.filter(e => e.decision === 'deny').length
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update single preference
   */
  async updateSinglePreference(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { notificationType, channel, enabled } = req.body;
      
      if (!userId) {
        this.sendError(res, 400, 'USER_ID_REQUIRED', 'User ID is required');
        return;
      }
      
      if (!notificationType || !channel || enabled === undefined) {
        this.sendError(res, 400, 'INVALID_REQUEST', 'notificationType, channel, and enabled are required');
        return;
      }
      
      const result = await this.service.updateSinglePreference(
        userId,
        notificationType,
        channel,
        enabled
      );
      
      res.status(200).json({
        success: true,
        data: result.preferences,
        meta: {
          changesMade: result.changesMade,
          message: result.changesMade > 0 ? 'Preference updated successfully' : 'No changes made (idempotent operation)'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update quiet hours
   */
  async updateQuietHours(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { startHour, startMinute, endHour, endMinute, timezone, days } = req.body;
      
      if (!userId) {
        this.sendError(res, 400, 'USER_ID_REQUIRED', 'User ID is required');
        return;
      }
      
      if (
        startHour === undefined || startMinute === undefined ||
        endHour === undefined || endMinute === undefined ||
        !timezone || !days || !Array.isArray(days)
      ) {
        this.sendError(res, 400, 'INVALID_REQUEST', 'All quiet hours parameters are required');
        return;
      }
      
      const result = await this.service.updateQuietHours(
        userId,
        startHour,
        startMinute,
        endHour,
        endMinute,
        timezone,
        days
      );
      
      res.status(200).json({
        success: true,
        data: result.preferences,
        meta: {
          changesMade: result.changesMade,
          message: 'Quiet hours updated successfully'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Check if notification would be allowed
   */
  async wouldAllowNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, notificationType, channel, region } = req.query;
      
      if (!userId || !notificationType || !channel || !region) {
        this.sendError(res, 400, 'INVALID_REQUEST', 'userId, notificationType, channel, and region are required');
        return;
      }
      
      const wouldAllow = await this.service.wouldAllowNotification(
        userId as string,
        notificationType as string,
        channel as string,
        region as string
      );
      
      res.status(200).json({
        success: true,
        data: { wouldAllow },
        meta: {
          message: wouldAllow 
            ? 'Notification would be allowed' 
            : 'Notification would be blocked'
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get user evaluation statistics
   */
  async getUserEvaluationStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        this.sendError(res, 400, 'USER_ID_REQUIRED', 'User ID is required');
        return;
      }
      
      const stats = await this.service.getUserEvaluationStats(userId);
      
      res.status(200).json({
        success: true,
        data: stats
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
    
    if (error instanceof UserNotFoundException) {
      this.sendError(res, 404, error.code, error.message, error.details);
    } else if (error instanceof InvalidQuietHoursException || 
               error instanceof PreferenceValidationException) {
      this.sendError(res, 400, error.code, error.message, error.details);
    } else if (error instanceof NotificationBlockedException) {
      // Notification blocked is a normal business outcome, not an error
      const evaluation: NotificationEvaluationResponseDTO = {
        decision: error.decision,
        reason: error.message,
        details: JSON.stringify(error.details),
        evaluatedAt: new Date().toISOString()
      };
      
      res.status(200).json({
        success: true,
        data: evaluation,
        meta: {
          message: 'Notification evaluation completed'
        }
      });
    } else if (error instanceof Error) {
      this.sendError(res, 500, 'INTERNAL_ERROR', error.message);
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