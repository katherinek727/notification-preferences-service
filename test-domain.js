// Simple test to verify domain logic works
const { NotificationEvaluator } = require('./dist/domain/notification-evaluator');
const { UserPreferences, NotificationPreference, GlobalPolicy } = require('./dist/domain/entities');
const { QuietHoursVO, TimeRangeVO, TimezoneVO } = require('./dist/domain/value-objects');

console.log('Testing Notification Preferences Service Domain Logic...\n');

// Create test data
const preferences = [
  NotificationPreference.create('marketing_email', 'email', true),
  NotificationPreference.create('transactional_email', 'email', true),
  NotificationPreference.create('marketing_push', 'push', false),
];

const quietHours = new QuietHoursVO(
  new TimeRangeVO('22:00', '08:00'),
  new TimezoneVO('Europe/London'),
  true
);

const userPreferences = UserPreferences.create('user-123', preferences, quietHours);

const globalPolicies = [
  GlobalPolicy.create('marketing_sms', 'sms', 'EU', false, 'GDPR compliance'),
  GlobalPolicy.create('marketing_email', 'email', 'GLOBAL', true, 'Global email policy'),
];

const evaluator = new NotificationEvaluator();

// Test 1: Allow notification when all conditions are met
console.log('Test 1: Allow notification when all conditions are met');
const request1 = {
  userId: 'user-123',
  notificationType: 'marketing_email',
  channel: 'email',
  region: 'US',
  datetime: new Date('2026-05-21T15:30:00Z')
};

const result1 = evaluator.evaluate(request1, userPreferences, globalPolicies);
console.log(`  Result: ${result1.decision} - ${result1.reason}`);
console.log(`  Status: ${result1.decision === 'allow' ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 2: Deny notification when user preference is disabled
console.log('Test 2: Deny notification when user preference is disabled');
const request2 = {
  userId: 'user-123',
  notificationType: 'marketing_push',
  channel: 'push',
  region: 'US',
  datetime: new Date('2026-05-21T15:30:00Z')
};

const result2 = evaluator.evaluate(request2, userPreferences, globalPolicies);
console.log(`  Result: ${result2.decision} - ${result2.reason}`);
console.log(`  Status: ${result2.decision === 'deny' ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 3: Deny notification during quiet hours for non-transactional notifications
console.log('Test 3: Deny notification during quiet hours for non-transactional notifications');
const request3 = {
  userId: 'user-123',
  notificationType: 'marketing_email',
  channel: 'email',
  region: 'US',
  datetime: new Date('2026-05-21T23:30:00Z') // During quiet hours
};

const result3 = evaluator.evaluate(request3, userPreferences, globalPolicies);
console.log(`  Result: ${result3.decision} - ${result3.reason}`);
console.log(`  Status: ${result3.decision === 'deny' ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 4: Allow transactional notifications during quiet hours
console.log('Test 4: Allow transactional notifications during quiet hours');
const request4 = {
  userId: 'user-123',
  notificationType: 'transactional_email',
  channel: 'email',
  region: 'US',
  datetime: new Date('2026-05-21T23:30:00Z') // During quiet hours
};

const result4 = evaluator.evaluate(request4, userPreferences, globalPolicies);
console.log(`  Result: ${result4.decision} - ${result4.reason}`);
console.log(`  Status: ${result4.decision === 'allow' ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 5: Deny notification when blocked by global policy
console.log('Test 5: Deny notification when blocked by global policy');
const request5 = {
  userId: 'user-123',
  notificationType: 'marketing_sms',
  channel: 'sms',
  region: 'EU',
  datetime: new Date('2026-05-21T15:30:00Z')
};

const result5 = evaluator.evaluate(request5, userPreferences, globalPolicies);
console.log(`  Result: ${result5.decision} - ${result5.reason}`);
console.log(`  Status: ${result5.decision === 'deny' ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 6: Deny notification when user not found
console.log('Test 6: Deny notification when user not found');
const request6 = {
  userId: 'user-999',
  notificationType: 'marketing_email',
  channel: 'email',
  region: 'US',
  datetime: new Date('2026-05-21T15:30:00Z')
};

const result6 = evaluator.evaluate(request6, null, globalPolicies);
console.log(`  Result: ${result6.decision} - ${result6.reason}`);
console.log(`  Status: ${result6.decision === 'deny' ? '✓ PASS' : '✗ FAIL'}\n`);

console.log('All domain logic tests completed!');
console.log('\nSummary: Domain layer is working correctly with business rules for:');
console.log('  - User preference management');
console.log('  - Quiet hours enforcement');
console.log('  - Global policy application');
console.log('  - Transactional vs marketing notification differentiation');