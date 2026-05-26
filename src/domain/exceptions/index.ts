/**
 * Domain exceptions for the Notification Preferences Service
 * These represent business logic errors that can occur
 */

/**
 * Base domain exception
 */
export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainException';
  }
}

/**
 * Thrown when a user is not found
 */
export class UserNotFoundException extends DomainException {
  constructor(userId: string) {
    super(`User ${userId} not found`, 'USER_NOT_FOUND', { userId });
    this.name = 'UserNotFoundException';
  }
}

/**
 * Thrown when a notification type is invalid
 */
export class InvalidNotificationTypeException extends DomainException {
  constructor(notificationType: string) {
    super(`Invalid notification type: ${notificationType}`, 'INVALID_NOTIFICATION_TYPE', { notificationType });
    this.name = 'InvalidNotificationTypeException';
  }
}

/**
 * Thrown when a channel is invalid
 */
export class InvalidChannelException extends DomainException {
  constructor(channel: string) {
    super(`Invalid channel: ${channel}`, 'INVALID_CHANNEL', { channel });
    this.name = 'InvalidChannelException';
  }
}

/**
 * Thrown when a region is invalid
 */
export class InvalidRegionException extends DomainException {
  constructor(region: string) {
    super(`Invalid region: ${region}`, 'INVALID_REGION', { region });
    this.name = 'InvalidRegionException';
  }
}

/**
 * Thrown when quiet hours configuration is invalid
 */
export class InvalidQuietHoursException extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(`Invalid quiet hours: ${message}`, 'INVALID_QUIET_HOURS', details);
    this.name = 'InvalidQuietHoursException';
  }
}

/**
 * Thrown when a preference update would violate business rules
 */
export class PreferenceValidationException extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(`Preference validation failed: ${message}`, 'PREFERENCE_VALIDATION_FAILED', details);
    this.name = 'PreferenceValidationException';
  }
}

/**
 * Thrown when a global policy conflicts with existing policies
 */
export class PolicyConflictException extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(`Policy conflict: ${message}`, 'POLICY_CONFLICT', details);
    this.name = 'PolicyConflictException';
  }
}

/**
 * Thrown when notification evaluation fails due to business rules
 */
export class NotificationBlockedException extends DomainException {
  constructor(
    reason: string,
    public readonly decision: 'allow' | 'deny' = 'deny',
    details?: Record<string, unknown>
  ) {
    super(`Notification blocked: ${reason}`, 'NOTIFICATION_BLOCKED', { ...details, decision });
    this.name = 'NotificationBlockedException';
  }
}

/**
 * Thrown when an operation is not idempotent and could cause data corruption
 */
export class NonIdempotentOperationException extends DomainException {
  constructor(operation: string, details?: Record<string, unknown>) {
    super(`Operation is not idempotent: ${operation}`, 'NON_IDEMPOTENT_OPERATION', { operation, ...details });
    this.name = 'NonIdempotentOperationException';
  }
}

/**
 * Helper function to check if an error is a DomainException
 */
export function isDomainException(error: unknown): error is DomainException {
  return error instanceof DomainException;
}

/**
 * Helper function to convert a DomainException to a plain object
 */
export function domainExceptionToObject(error: DomainException): {
  name: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
} {
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    details: error.details
  };
}