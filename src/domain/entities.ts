/**
 * Domain entities for the Notification Preferences Service
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  NotificationType, 
  Channel, 
  Region,
  NotificationPreference as NotificationPreferenceType,
  GlobalPolicy as GlobalPolicyType,
  UserPreferences as UserPreferencesType,
  DefaultPreferences as DefaultPreferencesType
} from './types';
import { 
  NotificationTypeVO, 
  ChannelVO, 
  RegionVO, 
  QuietHoursVO,
  TimeRangeVO,
  TimezoneVO 
} from './value-objects';

export class NotificationPreference {
  constructor(
    public readonly notificationType: NotificationTypeVO,
    public readonly channel: ChannelVO,
    public enabled: boolean,
    public updatedAt: Date = new Date()
  ) {}

  static create(
    notificationType: NotificationType,
    channel: Channel,
    enabled: boolean
  ): NotificationPreference {
    return new NotificationPreference(
      new NotificationTypeVO(notificationType),
      new ChannelVO(channel),
      enabled
    );
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.updatedAt = new Date();
  }

  enable(): void {
    this.enabled = true;
    this.updatedAt = new Date();
  }

  disable(): void {
    this.enabled = false;
    this.updatedAt = new Date();
  }

  equals(other: NotificationPreference): boolean {
    return (
      this.notificationType.equals(other.notificationType) &&
      this.channel.equals(other.channel)
    );
  }

  toJSON(): NotificationPreferenceType {
    return {
      notificationType: this.notificationType.value,
      channel: this.channel.value,
      enabled: this.enabled,
      updatedAt: this.updatedAt
    };
  }
}

export class GlobalPolicy {
  constructor(
    public readonly id: string,
    public readonly notificationType: NotificationTypeVO,
    public readonly channel: ChannelVO,
    public readonly region: RegionVO,
    public enabled: boolean,
    public readonly description: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static create(
    notificationType: NotificationType,
    channel: Channel,
    region: Region,
    enabled: boolean,
    description: string
  ): GlobalPolicy {
    return new GlobalPolicy(
      uuidv4(),
      new NotificationTypeVO(notificationType),
      new ChannelVO(channel),
      new RegionVO(region),
      enabled,
      description
    );
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.updatedAt = new Date();
  }

  enable(): void {
    this.enabled = true;
    this.updatedAt = new Date();
  }

  disable(): void {
    this.enabled = false;
    this.updatedAt = new Date();
  }

  matches(notificationType: NotificationTypeVO, channel: ChannelVO, region: RegionVO): boolean {
    return (
      this.notificationType.equals(notificationType) &&
      this.channel.equals(channel) &&
      (this.region.value === 'GLOBAL' || this.region.equals(region))
    );
  }

  toJSON(): GlobalPolicyType {
    return {
      id: this.id,
      notificationType: this.notificationType.value,
      channel: this.channel.value,
      region: this.region.value,
      enabled: this.enabled,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class UserPreferences {
  constructor(
    public readonly userId: string,
    public preferences: NotificationPreference[],
    public quietHours: QuietHoursVO,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static create(
    userId: string,
    preferences: NotificationPreference[],
    quietHours: QuietHoursVO
  ): UserPreferences {
    return new UserPreferences(userId, preferences, quietHours);
  }

  getPreference(notificationType: NotificationTypeVO, channel: ChannelVO): NotificationPreference | undefined {
    return this.preferences.find(pref => 
      pref.notificationType.equals(notificationType) && 
      pref.channel.equals(channel)
    );
  }

  updatePreference(notificationType: NotificationType, channel: Channel, enabled: boolean): void {
    const notificationTypeVO = new NotificationTypeVO(notificationType);
    const channelVO = new ChannelVO(channel);
    
    const existingPreference = this.getPreference(notificationTypeVO, channelVO);
    
    if (existingPreference) {
      if (enabled) {
        existingPreference.enable();
      } else {
        existingPreference.disable();
      }
    } else {
      const newPreference = NotificationPreference.create(notificationType, channel, enabled);
      this.preferences.push(newPreference);
    }
    
    this.updatedAt = new Date();
  }

  updateQuietHours(timeRange: TimeRangeVO, timezone: TimezoneVO, enabled: boolean): void {
    this.quietHours = new QuietHoursVO(timeRange, timezone, enabled);
    this.updatedAt = new Date();
  }

  toJSON(): UserPreferencesType {
    return {
      userId: this.userId,
      preferences: this.preferences.map(pref => pref.toJSON()),
      quietHours: {
        timeRange: {
          start: this.quietHours.timeRange.start,
          end: this.quietHours.timeRange.end
        },
        timezone: this.quietHours.timezone.value,
        enabled: this.quietHours.enabled
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class DefaultPreferences {
  constructor(
    public preferences: NotificationPreference[],
    public quietHours: QuietHoursVO
  ) {}

  static create(
    preferences: NotificationPreference[],
    quietHours: QuietHoursVO
  ): DefaultPreferences {
    return new DefaultPreferences(preferences, quietHours);
  }

  toJSON(): DefaultPreferencesType {
    return {
      preferences: this.preferences.map(pref => pref.toJSON()),
      quietHours: {
        timeRange: {
          start: this.quietHours.timeRange.start,
          end: this.quietHours.timeRange.end
        },
        timezone: this.quietHours.timezone.value,
        enabled: this.quietHours.enabled
      }
    };
  }
}