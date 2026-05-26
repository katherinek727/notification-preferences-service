/**
 * Domain errors for the Notification Preferences Service
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidNotificationTypeError extends DomainError {
  constructor(type: string) {
    super(`Invalid notification type: ${type}`);
    this.name = 'InvalidNotificationTypeError';
  }
}

export class InvalidChannelError extends DomainError {
  constructor(channel: string) {
    super(`Invalid channel: ${channel}`);
    this.name = 'InvalidChannelError';
  }
}

export class InvalidRegionError extends DomainError {
  constructor(region: string) {
    super(`Invalid region: ${region}`);
    this.name = 'InvalidRegionError';
  }
}

export class InvalidTimeRangeError extends DomainError {
  constructor(start: string, end: string) {
    super(`Invalid time range: ${start} - ${end}`);
    this.name = 'InvalidTimeRangeError';
  }
}

export class InvalidTimezoneError extends DomainError {
  constructor(timezone: string) {
    super(`Invalid timezone: ${timezone}`);
    this.name = 'InvalidTimezoneError';
  }
}

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = 'UserNotFoundError';
  }
}

export class PreferenceNotFoundError extends DomainError {
  constructor(userId: string, notificationType: string, channel: string) {
    super(`Preference not found for user ${userId}: ${notificationType} via ${channel}`);
    this.name = 'PreferenceNotFoundError';
  }
}

export class GlobalPolicyNotFoundError extends DomainError {
  constructor(notificationType: string, channel: string, region: string) {
    super(`Global policy not found: ${notificationType} via ${channel} in ${region}`);
    this.name = 'GlobalPolicyNotFoundError';
  }
}