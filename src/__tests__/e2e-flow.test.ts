/**
 * End-to-end flow test
 * Tests the complete flow from API to database
 */

import request from 'supertest';
import { ExpressApp } from '../infrastructure/api/app.js';
import { TestUtils, TEST_CONSTANTS } from './test-utils.js';
import { getTestDatabaseManager, setupTestDatabase } from './db-test-utils.js';

describe('End-to-End Flow', () => {
  let app: any;
  let expressApp: ExpressApp;
  const testUserId = 'e2e-test-user-' + Date.now();

  // Setup test database
  setupTestDatabase();

  beforeAll(() => {
    expressApp = new ExpressApp();
    app = expressApp.getApp();
  });

  describe('Complete User Journey', () => {
    test('complete flow: create user, set preferences, evaluate notifications', async () => {
      // Step 1: Get preferences for new user (should return 404)
      const getResponse1 = await request(app)
        .get(`/api/v1/users/${testUserId}/preferences`)
        .expect(404);
      
      expect(getResponse1.body.success).toBe(false);
      expect(getResponse1.body.error.code).toBe('USER_NOT_FOUND');

      // Step 2: Set initial preferences
      const initialPreferences = {
        preferences: [
          {
            notificationType: 'transactional_email',
            channel: 'email',
            enabled: true
          },
          {
            notificationType: 'marketing_email',
            channel: 'email',
            enabled: false // User opts out of marketing emails
          },
          {
            notificationType: 'security_alert',
            channel: 'email',
            enabled: true
          }
        ],
        quietHours: {
          start: { hour: 22, minute: 0 },
          end: { hour: 8, minute: 0 },
          timezone: 'UTC',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }
      };

      const setResponse = await request(app)
        .post(`/api/v1/users/${testUserId}/preferences`)
        .send(initialPreferences)
        .expect(200);
      
      expect(setResponse.body.success).toBe(true);
      expect(setResponse.body.data.userId).toBe(testUserId);
      expect(setResponse.body.data.preferences).toHaveLength(3);
      expect(setResponse.body.data.quietHours).toBeDefined();
      expect(setResponse.body.meta.changesMade).toBeGreaterThan(0);

      // Step 3: Get preferences to verify
      const getResponse2 = await request(app)
        .get(`/api/v1/users/${testUserId}/preferences`)
        .expect(200);
      
      expect(getResponse2.body.success).toBe(true);
      expect(getResponse2.body.data.userId).toBe(testUserId);
      expect(getResponse2.body.data.preferences).toHaveLength(3);

      // Step 4: Evaluate transactional email (should be allowed)
      const evalRequest1 = {
        userId: testUserId,
        notificationType: 'transactional_email',
        channel: 'email',
        region: 'US',
        datetime: new Date('2026-05-26T14:30:00Z').toISOString() // Outside quiet hours
      };

      const evalResponse1 = await request(app)
        .post('/api/v1/evaluate')
        .send(evalRequest1)
        .expect(200);
      
      expect(evalResponse1.body.success).toBe(true);
      expect(evalResponse1.body.data.decision).toBe('allow');
      expect(evalResponse1.body.data.reason).toBe('notification_allowed');

      // Step 5: Evaluate marketing email (should be denied - user preference)
      const evalRequest2 = {
        userId: testUserId,
        notificationType: 'marketing_email',
        channel: 'email',
        region: 'US',
        datetime: new Date('2026-05-26T14:30:00Z').toISOString() // Outside quiet hours
      };

      const evalResponse2 = await request(app)
        .post('/api/v1/evaluate')
        .send(evalRequest2)
        .expect(200);
      
      expect(evalResponse2.body.success).toBe(true);
      expect(evalResponse2.body.data.decision).toBe('deny');
      expect(evalResponse2.body.data.reason).toBe('user_preference_disabled');

      // Step 6: User changes mind and enables marketing emails
      const updateResponse = await request(app)
        .patch(`/api/v1/users/${testUserId}/preferences/single`)
        .send({
          notificationType: 'marketing_email',
          channel: 'email',
          enabled: true
        })
        .expect(200);
      
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.meta.changesMade).toBe(1);

      // Step 7: Now marketing email should be allowed (outside quiet hours)
      const evalResponse3 = await request(app)
        .post('/api/v1/evaluate')
        .send(evalRequest2)
        .expect(200);
      
      expect(evalResponse3.body.success).toBe(true);
      expect(evalResponse3.body.data.decision).toBe('allow');

      // Step 8: Test during quiet hours (marketing should be blocked)
      const evalRequest3 = {
        userId: testUserId,
        notificationType: 'marketing_email',
        channel: 'email',
        region: 'US',
        datetime: new Date('2026-05-26T23:30:00Z').toISOString() // During quiet hours
      };

      const evalResponse4 = await request(app)
        .post('/api/v1/evaluate')
        .send(evalRequest3)
        .expect(200);
      
      expect(evalResponse4.body.success).toBe(true);
      expect(evalResponse4.body.data.decision).toBe('deny');
      expect(evalResponse4.body.data.reason).toBe('quiet_hours_active');

      // Step 9: Test security alert during quiet hours (should be allowed)
      const evalRequest4 = {
        userId: testUserId,
        notificationType: 'security_alert',
        channel: 'email',
        region: 'US',
        datetime: new Date('2026-05-26T23:30:00Z').toISOString() // During quiet hours
      };

      const evalResponse5 = await request(app)
        .post('/api/v1/evaluate')
        .send(evalRequest4)
        .expect(200);
      
      expect(evalResponse5.body.success).toBe(true);
      expect(evalResponse5.body.data.decision).toBe('allow');

      // Step 10: Create a global policy
      const policyResponse = await request(app)
        .post('/api/v1/policies/blocking')
        .send({
          notificationType: 'marketing_email',
          channel: 'email',
          region: 'EU',
          reason: 'GDPR compliance'
        })
        .expect(201);
      
      expect(policyResponse.body.success).toBe(true);
      expect(policyResponse.body.data.enabled).toBe(false);

      // Step 11: Test in EU region (should be blocked by global policy)
      const evalRequest5 = {
        userId: testUserId,
        notificationType: 'marketing_email',
        channel: 'email',
        region: 'EU',
        datetime: new Date('2026-05-26T14:30:00Z').toISOString() // Outside quiet hours
      };

      const evalResponse6 = await request(app)
        .post('/api/v1/evaluate')
        .send(evalRequest5)
        .expect(200);
      
      expect(evalResponse6.body.success).toBe(true);
      expect(evalResponse6.body.data.decision).toBe('deny');
      expect(evalResponse6.body.data.reason).toBe('global_policy_blocked');

      // Step 12: Test idempotency - update preference with same value
      const idempotentUpdate = await request(app)
        .patch(`/api/v1/users/${testUserId}/preferences/single`)
        .send({
          notificationType: 'marketing_email',
          channel: 'email',
          enabled: true // Same as current value
        })
        .expect(200);
      
      expect(idempotentUpdate.body.success).toBe(true);
      expect(idempotentUpdate.body.meta.changesMade).toBe(0);
      expect(idempotentUpdate.body.meta.message).toContain('No changes made');

      // Step 13: Batch evaluation
      const batchRequest = {
        requests: [
          {
            userId: testUserId,
            notificationType: 'transactional_email',
            channel: 'email',
            region: 'US',
            datetime: new Date('2026-05-26T14:30:00Z').toISOString()
          },
          {
            userId: testUserId,
            notificationType: 'marketing_email',
            channel: 'email',
            region: 'US',
            datetime: new Date('2026-05-26T14:30:00Z').toISOString()
          },
          {
            userId: testUserId,
            notificationType: 'marketing_email',
            channel: 'email',
            region: 'EU',
            datetime: new Date('2026-05-26T14:30:00Z').toISOString()
          }
        ]
      };

      const batchResponse = await request(app)
        .post('/api/v1/evaluate/batch')
        .send(batchRequest)
        .expect(200);
      
      expect(batchResponse.body.success).toBe(true);
      expect(batchResponse.body.data).toHaveLength(3);
      expect(batchResponse.body.meta.total).toBe(3);
      expect(batchResponse.body.meta.allowed).toBe(1); // Only transactional email in US
      expect(batchResponse.body.meta.denied).toBe(2); // Marketing in US (quiet hours?) and EU (global policy)

      // Step 14: Check would-allow pre-flight
      const wouldAllowResponse = await request(app)
        .get('/api/v1/evaluate/would-allow')
        .query({
          userId: testUserId,
          notificationType: 'transactional_email',
          channel: 'email',
          region: 'US'
        })
        .expect(200);
      
      expect(wouldAllowResponse.body.success).toBe(true);
      expect(wouldAllowResponse.body.data.wouldAllow).toBe(true);

      // Step 15: Check would-block by global policy
      const wouldBlockResponse = await request(app)
        .get('/api/v1/policies/would-block')
        .query({
          notificationType: 'marketing_email',
          channel: 'email',
          region: 'EU'
        })
        .expect(200);
      
      expect(wouldBlockResponse.body.success).toBe(true);
      expect(wouldBlockResponse.body.data.blocked).toBe(true);
      expect(wouldBlockResponse.body.data.blockingPolicy).toBeDefined();
    });
  });

  describe('Error Handling Flow', () => {
    test('handles validation errors gracefully', async () => {
      // Invalid notification type
      const invalidRequest = {
        userId: testUserId,
        notificationType: 'invalid_type',
        channel: 'email',
        region: 'US',
        datetime: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/v1/evaluate')
        .send(invalidRequest)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('handles missing parameters', async () => {
      const response = await request(app)
        .get('/api/v1/evaluate/would-allow')
        .query({
          userId: testUserId
          // Missing other parameters
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    test('handles malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/evaluate')
        .set('Content-Type', 'application/json')
        .send('{ malformed json }')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance and Concurrency', () => {
    test('handles multiple concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => {
        return request(app)
          .post('/api/v1/evaluate')
          .send({
            userId: testUserId,
            notificationType: i % 2 === 0 ? 'transactional_email' : 'marketing_email',
            channel: 'email',
            region: 'US',
            datetime: new Date().toISOString()
          });
      });

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('decision');
      });
    });

    test('handles rapid idempotent updates', async () => {
      const rapidUpdates = Array.from({ length: 5 }, () => {
        return request(app)
          .patch(`/api/v1/users/${testUserId}/preferences/single`)
          .send({
            notificationType: 'transactional_email',
            channel: 'email',
            enabled: true // Same value each time
          });
      });

      const responses = await Promise.all(rapidUpdates);
      
      // First one might have changes, rest should be idempotent
      const changesMade = responses.map(r => r.body.meta.changesMade);
      const totalChanges = changesMade.reduce((sum, changes) => sum + changes, 0);
      
      expect(totalChanges).toBeLessThanOrEqual(1); // At most one actual change
    });
  });
});