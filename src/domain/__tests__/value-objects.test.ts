import { 
  NotificationTypeVO, 
  ChannelVO, 
  RegionVO, 
  TimeRangeVO, 
  TimezoneVO,
  QuietHoursVO 
} from '../value-objects';
import { 
  InvalidNotificationTypeError,
  InvalidChannelError,
  InvalidRegionError,
  InvalidTimeRangeError,
  InvalidTimezoneError
} from '../errors';

describe('Value Objects', () => {
  describe('NotificationTypeVO', () => {
    test('should create valid notification type', () => {
      const type = new NotificationTypeVO('marketing_email');
      expect(type.value).toBe('marketing_email');
      expect(type.toString()).toBe('marketing_email');
    });

    test('should throw error for invalid notification type', () => {
      expect(() => new NotificationTypeVO('invalid_type' as any)).toThrow(InvalidNotificationTypeError);
    });

    test('should correctly compare equality', () => {
      const type1 = new NotificationTypeVO('marketing_email');
      const type2 = new NotificationTypeVO('marketing_email');
      const type3 = new NotificationTypeVO('transactional_email');
      
      expect(type1.equals(type2)).toBe(true);
      expect(type1.equals(type3)).toBe(false);
    });
  });

  describe('ChannelVO', () => {
    test('should create valid channel', () => {
      const channel = new ChannelVO('email');
      expect(channel.value).toBe('email');
      expect(channel.toString()).toBe('email');
    });

    test('should throw error for invalid channel', () => {
      expect(() => new ChannelVO('invalid_channel' as any)).toThrow(InvalidChannelError);
    });

    test('should correctly compare equality', () => {
      const channel1 = new ChannelVO('email');
      const channel2 = new ChannelVO('email');
      const channel3 = new ChannelVO('sms');
      
      expect(channel1.equals(channel2)).toBe(true);
      expect(channel1.equals(channel3)).toBe(false);
    });
  });

  describe('RegionVO', () => {
    test('should create valid region', () => {
      const region = new RegionVO('EU');
      expect(region.value).toBe('EU');
      expect(region.toString()).toBe('EU');
    });

    test('should throw error for invalid region', () => {
      expect(() => new RegionVO('invalid_region' as any)).toThrow(InvalidRegionError);
    });

    test('should correctly compare equality', () => {
      const region1 = new RegionVO('EU');
      const region2 = new RegionVO('EU');
      const region3 = new RegionVO('US');
      
      expect(region1.equals(region2)).toBe(true);
      expect(region1.equals(region3)).toBe(false);
    });
  });

  describe('TimeRangeVO', () => {
    test('should create valid time range', () => {
      const timeRange = new TimeRangeVO('09:00', '17:00');
      expect(timeRange.start).toBe('09:00');
      expect(timeRange.end).toBe('17:00');
      expect(timeRange.toString()).toBe('09:00-17:00');
    });

    test('should throw error for invalid time format', () => {
      expect(() => new TimeRangeVO('25:00', '17:00')).toThrow(InvalidTimeRangeError);
      expect(() => new TimeRangeVO('09:00', '25:00')).toThrow(InvalidTimeRangeError);
      expect(() => new TimeRangeVO('09:60', '17:00')).toThrow(InvalidTimeRangeError);
    });

    test('should throw error for equal start and end times', () => {
      expect(() => new TimeRangeVO('09:00', '09:00')).toThrow(InvalidTimeRangeError);
    });

    test('should correctly check if time is within range', () => {
      const timeRange = new TimeRangeVO('09:00', '17:00');
      
      expect(timeRange.contains('08:59')).toBe(false);
      expect(timeRange.contains('09:00')).toBe(true);
      expect(timeRange.contains('12:30')).toBe(true);
      expect(timeRange.contains('16:59')).toBe(true);
      expect(timeRange.contains('17:00')).toBe(false);
      expect(timeRange.contains('18:00')).toBe(false);
    });

    test('should handle ranges crossing midnight', () => {
      const timeRange = new TimeRangeVO('22:00', '08:00');
      
      expect(timeRange.contains('21:59')).toBe(false);
      expect(timeRange.contains('22:00')).toBe(true);
      expect(timeRange.contains('23:30')).toBe(true);
      expect(timeRange.contains('00:00')).toBe(true);
      expect(timeRange.contains('07:59')).toBe(true);
      expect(timeRange.contains('08:00')).toBe(false);
      expect(timeRange.contains('09:00')).toBe(false);
    });

    test('should correctly compare equality', () => {
      const timeRange1 = new TimeRangeVO('09:00', '17:00');
      const timeRange2 = new TimeRangeVO('09:00', '17:00');
      const timeRange3 = new TimeRangeVO('10:00', '18:00');
      
      expect(timeRange1.equals(timeRange2)).toBe(true);
      expect(timeRange1.equals(timeRange3)).toBe(false);
    });
  });

  describe('TimezoneVO', () => {
    test('should create valid timezone', () => {
      const timezone = new TimezoneVO('Europe/London');
      expect(timezone.value).toBe('Europe/London');
      expect(timezone.toString()).toBe('Europe/London');
    });

    test('should throw error for invalid timezone format', () => {
      expect(() => new TimezoneVO('invalid-timezone')).toThrow(InvalidTimezoneError);
      expect(() => new TimezoneVO('Europe London')).toThrow(InvalidTimezoneError);
    });

    test('should correctly compare equality', () => {
      const timezone1 = new TimezoneVO('Europe/London');
      const timezone2 = new TimezoneVO('Europe/London');
      const timezone3 = new TimezoneVO('America/New_York');
      
      expect(timezone1.equals(timezone2)).toBe(true);
      expect(timezone1.equals(timezone3)).toBe(false);
    });
  });

  describe('QuietHoursVO', () => {
    test('should create quiet hours', () => {
      const timeRange = new TimeRangeVO('22:00', '08:00');
      const timezone = new TimezoneVO('Europe/London');
      const quietHours = new QuietHoursVO(timeRange, timezone, true);
      
      expect(quietHours.timeRange).toBe(timeRange);
      expect(quietHours.timezone).toBe(timezone);
      expect(quietHours.enabled).toBe(true);
      expect(quietHours.toString()).toContain('QuietHours');
    });

    test('should check if quiet hours are active', () => {
      const timeRange = new TimeRangeVO('22:00', '08:00');
      const timezone = new TimezoneVO('Europe/London');
      const quietHours = new QuietHoursVO(timeRange, timezone, true);
      
      // During quiet hours
      const duringQuietHours = new Date('2026-05-21T23:30:00Z');
      expect(quietHours.isActiveAt(duringQuietHours)).toBe(true);
      
      // Outside quiet hours
      const outsideQuietHours = new Date('2026-05-21T15:30:00Z');
      expect(quietHours.isActiveAt(outsideQuietHours)).toBe(false);
      
      // When disabled
      const disabledQuietHours = new QuietHoursVO(timeRange, timezone, false);
      expect(disabledQuietHours.isActiveAt(duringQuietHours)).toBe(false);
    });

    test('should correctly compare equality', () => {
      const timeRange = new TimeRangeVO('22:00', '08:00');
      const timezone = new TimezoneVO('Europe/London');
      
      const quietHours1 = new QuietHoursVO(timeRange, timezone, true);
      const quietHours2 = new QuietHoursVO(timeRange, timezone, true);
      const quietHours3 = new QuietHoursVO(timeRange, timezone, false);
      
      expect(quietHours1.equals(quietHours2)).toBe(true);
      expect(quietHours1.equals(quietHours3)).toBe(false);
    });
  });
});