/**
 * Value objects for the Notification Preferences Service
 */

import { 
  NotificationType, 
  Channel, 
  Region, 
  Timezone,
  VALID_NOTIFICATION_TYPES, 
  VALID_CHANNELS, 
  VALID_REGIONS 
} from './types';
import { 
  InvalidNotificationTypeError, 
  InvalidChannelError, 
  InvalidRegionError,
  InvalidTimeRangeError,
  InvalidTimezoneError 
} from './errors';

export class NotificationTypeVO {
  constructor(public readonly value: NotificationType) {
    if (!VALID_NOTIFICATION_TYPES.includes(value)) {
      throw new InvalidNotificationTypeError(value);
    }
  }

  equals(other: NotificationTypeVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class ChannelVO {
  constructor(public readonly value: Channel) {
    if (!VALID_CHANNELS.includes(value)) {
      throw new InvalidChannelError(value);
    }
  }

  equals(other: ChannelVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class RegionVO {
  constructor(public readonly value: Region) {
    if (!VALID_REGIONS.includes(value)) {
      throw new InvalidRegionError(value);
    }
  }

  equals(other: RegionVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class TimeRangeVO {
  constructor(
    public readonly start: string,
    public readonly end: string
  ) {
    this.validate();
  }

  private validate(): void {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(this.start) || !timeRegex.test(this.end)) {
      throw new InvalidTimeRangeError(this.start, this.end);
    }

    const startMinutes = this.timeToMinutes(this.start);
    const endMinutes = this.timeToMinutes(this.end);

    if (startMinutes === endMinutes) {
      throw new InvalidTimeRangeError(this.start, this.end);
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  contains(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return false;
    }

    const targetMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(this.start);
    const endMinutes = this.timeToMinutes(this.end);

    if (startMinutes < endMinutes) {
      // Normal range within same day
      return targetMinutes >= startMinutes && targetMinutes < endMinutes;
    } else {
      // Range crosses midnight (e.g., 22:00 to 08:00)
      return targetMinutes >= startMinutes || targetMinutes < endMinutes;
    }
  }

  equals(other: TimeRangeVO): boolean {
    return this.start === other.start && this.end === other.end;
  }

  toString(): string {
    return `${this.start}-${this.end}`;
  }
}

export class TimezoneVO {
  constructor(public readonly value: Timezone) {
    this.validate();
  }

  private validate(): void {
    // Basic validation - in a real app, we'd use a proper timezone library
    const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/;
    
    if (!timezoneRegex.test(this.value)) {
      throw new InvalidTimezoneError(this.value);
    }
  }

  equals(other: TimezoneVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class QuietHoursVO {
  constructor(
    public readonly timeRange: TimeRangeVO,
    public readonly timezone: TimezoneVO,
    public readonly enabled: boolean
  ) {}

  isActiveAt(datetime: Date): boolean {
    if (!this.enabled) {
      return false;
    }

    // Convert datetime to the quiet hours timezone
    // For simplicity, we'll assume the datetime is already in the target timezone
    // In a real implementation, we'd use a library like date-fns-tz
    
    const hours = datetime.getHours().toString().padStart(2, '0');
    const minutes = datetime.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;

    return this.timeRange.contains(time);
  }

  equals(other: QuietHoursVO): boolean {
    return (
      this.timeRange.equals(other.timeRange) &&
      this.timezone.equals(other.timezone) &&
      this.enabled === other.enabled
    );
  }

  toString(): string {
    return `QuietHours[${this.timeRange.toString()} ${this.timezone.toString()} ${this.enabled ? 'enabled' : 'disabled'}]`;
  }
}