/**
 * Data Transfer Objects (DTOs) for the application layer
 * These objects define the shape of data moving in and out of the application
 */

import { z } from 'zod';
import { 
  NotificationType, 
  Channel, 
  Region, 
  Timezone,
  DayOfWeek,
  isNotificationType,
  isChannel,
  isRegion,
  isDayOfWeek
} from '../../domain/index.js';

/**
 * Base DTO with common fields
 */
export interface BaseDTO {
  requestId?: string;
  timestamp?: Date;
}

/**
 * Time range DTO
 */
export interface TimeRangeDTO {
  hour: number;    // 0-23
  minute: number; // 0-59
}

/**
 * Quiet hours DTO
 */
export interface QuietHoursDTO {
  start: TimeRangeDTO;
  end: TimeRangeDTO;
  timezone: Timezone;
  days: DayOfWeek[];
}

/**
 * Notification preference DTO
 */
export interface NotificationPreferenceDTO {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

/**
 * User preferences DTO (for API responses)
 */
export interface UserPreferencesResponseDTO {
  userId: string;
  preferences: NotificationPreferenceDTO[];
  quietHours?: QuietHoursDTO;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Update user preferences request DTO
 */
export interface UpdateUserPreferencesRequestDTO {
  preferences?: NotificationPreferenceDTO[];
  quietHours?: QuietHoursDTO;
}

/**
 * Notification evaluation request DTO
 */
export interface NotificationEvaluationRequestDTO {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  region: Region;
  datetime: string; // ISO string
}

/**
 * Notification evaluation response DTO
 */
export interface NotificationEvaluationResponseDTO {
  decision: 'allow' | 'deny';
  reason: string;
  details?: string;
  evaluatedAt: string; // ISO string
}

/**
 * Global policy DTO
 */
export interface GlobalPolicyDTO {
  id: string;
  notificationType: NotificationType;
  channel: Channel;
  region: Region;
  enabled: boolean;
  description: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Create/update global policy request DTO
 */
export interface GlobalPolicyRequestDTO {
  notificationType: NotificationType;
  channel: Channel;
  region: Region;
  enabled: boolean;
  description: string;
}

/**
 * Default preference DTO
 */
export interface DefaultPreferenceDTO {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
  priority: number;
}

/**
 * Error response DTO
 */
export interface ErrorResponseDTO {
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string; // ISO string
}

/**
 * Pagination metadata DTO
 */
export interface PaginationMetadataDTO {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated response DTO
 */
export interface PaginatedResponseDTO<T> {
  data: T[];
  pagination: PaginationMetadataDTO;
}

/**
 * Validation schemas using Zod
 */

// Time range validation
export const TimeRangeSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59)
});

// Quiet hours validation
export const QuietHoursSchema = z.object({
  start: TimeRangeSchema,
  end: TimeRangeSchema,
  timezone: z.string().min(1),
  days: z.array(z.string().refine(isDayOfWeek, 'Invalid day of week'))
});

// Notification preference validation
export const NotificationPreferenceSchema = z.object({
  notificationType: z.string().refine(isNotificationType, 'Invalid notification type'),
  channel: z.string().refine(isChannel, 'Invalid channel'),
  enabled: z.boolean()
});

// Update user preferences request validation
export const UpdateUserPreferencesRequestSchema = z.object({
  preferences: z.array(NotificationPreferenceSchema).optional(),
  quietHours: QuietHoursSchema.optional()
});

// Notification evaluation request validation
export const NotificationEvaluationRequestSchema = z.object({
  userId: z.string().min(1),
  notificationType: z.string().refine(isNotificationType, 'Invalid notification type'),
  channel: z.string().refine(isChannel, 'Invalid channel'),
  region: z.string().refine(isRegion, 'Invalid region'),
  datetime: z.string().datetime()
});

// Global policy request validation
export const GlobalPolicyRequestSchema = z.object({
  notificationType: z.string().refine(isNotificationType, 'Invalid notification type'),
  channel: z.string().refine(isChannel, 'Invalid channel'),
  region: z.string().refine(isRegion, 'Invalid region'),
  enabled: z.boolean(),
  description: z.string().min(1).max(500)
});

// Default preference validation
export const DefaultPreferenceSchema = z.object({
  notificationType: z.string().refine(isNotificationType, 'Invalid notification type'),
  channel: z.string().refine(isChannel, 'Invalid channel'),
  enabled: z.boolean(),
  priority: z.number().int().min(0).max(1000)
});

/**
 * Helper functions for DTO conversion
 */

export function toTimeRangeDTO(hour: number, minute: number): TimeRangeDTO {
  return { hour, minute };
}

export function fromTimeRangeDTO(dto: TimeRangeDTO): { hour: number; minute: number } {
  return { hour: dto.hour, minute: dto.minute };
}

export function toNotificationPreferenceDTO(
  notificationType: NotificationType,
  channel: Channel,
  enabled: boolean
): NotificationPreferenceDTO {
  return { notificationType, channel, enabled };
}

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}

/**
 * Validate DTO against schema
 */
export function validateDTO<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Convert validation errors to user-friendly format
 */
export function validationErrorsToDTO(errors: z.ZodError): ErrorResponseDTO {
  const formattedErrors = errors.errors.map(error => ({
    field: error.path.join('.'),
    message: error.message
  }));

  return {
    error: 'VALIDATION_ERROR',
    code: 'VALIDATION_FAILED',
    message: 'Request validation failed',
    details: { errors: formattedErrors },
    timestamp: new Date().toISOString()
  };
}